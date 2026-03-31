const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const authMiddleware = require('../middleware/auth');
const PPT = require('../models/PPT');
const { webSearch } = require('../services/searchService');
const { fetchImageForContext } = require('../services/imageService');

const THEMES_DIR = path.join(__dirname, '..', 'ppt-themes');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'ppts');

// Static serving for theme assets (SVGs, etc.) should be public
// Move this BEFORE auth middleware so images can load in <img> tags
router.use('/themes', express.static(THEMES_DIR));

// All subsequent routes require auth
router.use(authMiddleware);

const OLLAMA_URL = process.env.DEEPSEEK_API_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:120b-cloud';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function callOllama(prompt, systemPrompt) {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const body = {
    model: OLLAMA_MODEL,
    prompt: fullPrompt,
    stream: false,
    options: {
      temperature: 0.6,
      max_tokens: 1500
    }
  };
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.response || '';
}

// ─── POST /api/ppt/generate-outline ─────────────────────────────────────────
router.post('/generate-outline', async (req, res) => {
  try {
    const { topic, slideCount = 8 } = req.body;
    if (!topic) return res.status(400).json({ success: false, error: 'topic is required' });

    const numSlides = parseInt(slideCount, 10) || 8;

    // Web search for context
    let webContext = '';
    try {
      const results = await webSearch(topic, 5);
      webContext = results.map((r) => `${r.title}: ${r.snippet}`).join('\n');
    } catch (e) {
      console.warn('Web search failed, continuing without context:', e.message);
    }

    const systemPrompt = `You are an expert presentation designer. Given a topic and web research context, generate exactly ${numSlides} slide titles for a professional presentation. Return ONLY a valid JSON array of strings, no explanation, no markdown, no backticks. Example: ["Introduction", "History", "Key Concepts", "Applications", "Case Studies", "Challenges", "Future Outlook", "Conclusion"]`;

    const userPrompt = `Topic: ${topic}\n\nWeb Research Context:\n${webContext || 'No context available.'}\n\nGenerate exactly ${numSlides} slide titles.`;

    const raw = await callOllama(userPrompt, systemPrompt);

    // Parse JSON array from response
    let slideTitles;
    try {
      // Strip any potential markdown fences
      const cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim();
      slideTitles = JSON.parse(cleaned);
      if (!Array.isArray(slideTitles)) throw new Error('Not an array');
    } catch (e) {
      // Fallback: extract array from string
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        slideTitles = JSON.parse(match[0]);
      } else {
        slideTitles = Array.from({ length: numSlides }, (_, i) => `Slide ${i + 1}`);
      }
    }

    // Ensure exactly numSlides slides
    while (slideTitles.length < numSlides) slideTitles.push(`Slide ${slideTitles.length + 1}`);
    slideTitles = slideTitles.slice(0, numSlides);

    const slides = slideTitles.map((title, i) => ({ order: i, title, bullets: [], speakerNotes: '', imageUrl: '', imageQuery: '' }));

    const ppt = new PPT({
      userId: req.user._id,
      topic,
      slides,
      status: 'outline',
    });
    const savedPpt = await ppt.save();

    res.json({ success: true, pptId: savedPpt._id || ppt._id, slides });
  } catch (err) {
    console.error('generate-outline error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/ppt/generate-slide-title ─────────────────────────────────────
router.post('/generate-slide-title', async (req, res) => {
  try {
    const { topic, existingTitles = [] } = req.body;
    if (!topic) return res.status(400).json({ success: false, error: 'topic is required' });

    const prompt = `Given a presentation about '${topic}' that already has these slides: ${existingTitles.join(', ')}, suggest ONE new slide title that adds value. Return ONLY the title string, nothing else.`;

    const raw = await callOllama(prompt);
    const title = raw.trim().replace(/^["']|["']$/g, '');

    res.json({ success: true, title });
  } catch (err) {
    console.error('generate-slide-title error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/ppt/themes ─────────────────────────────────────────────────────
router.get('/themes', async (req, res) => {
  try {
    if (!fs.existsSync(THEMES_DIR)) {
      return res.json({ success: true, themes: [] });
    }
    const slugs = fs.readdirSync(THEMES_DIR).filter((d) => {
      return fs.statSync(path.join(THEMES_DIR, d)).isDirectory();
    });
    const themes = slugs.map((slug) => {
      const themeFile = path.join(THEMES_DIR, slug, 'theme.json');
      if (!fs.existsSync(themeFile)) return null;
      const theme = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
      return { slug, ...theme };
    }).filter(Boolean);
    res.json({ success: true, themes });
  } catch (err) {
    console.error('themes error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/ppt/generate ──────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const { pptId, themeSlug, imagePreference: reqImagePref } = req.body;
    if (!pptId) return res.status(400).json({ success: false, error: 'pptId is required' });

    const ppt = await PPT.findOne({ _id: pptId, userId: req.user._id });
    if (!ppt) return res.status(404).json({ success: false, error: 'PPT not found' });

    // Use preference from request if provided, otherwise fallback to stored preference
    const finalImagePreference = reqImagePref || ppt.imagePreference || 'none';

    await PPT.updateOne(
      { _id: ppt._id },
      { status: 'generating', themeSlug: themeSlug, imagePreference: finalImagePreference }
    );

    // Load theme
    let theme = { primaryColor: '#1a1f3c', accentColor: '#c9a84c', fontHeading: 'Arial', fontBody: 'Arial', bgColor: '#0d1020', textColor: '#f0ede6' };
    if (themeSlug) {
      const themeFile = path.join(THEMES_DIR, themeSlug, 'theme.json');
      if (fs.existsSync(themeFile)) {
        theme = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
      }
    }

    // Determine which slides get images
    const slidesNeedingImages = new Set();
    if (finalImagePreference === 'some') {
      [1, 3, 5].forEach((i) => { if (i < ppt.slides.length) slidesNeedingImages.add(i); });
    } else if (finalImagePreference === 'more') {
      ppt.slides.forEach((_, i) => slidesNeedingImages.add(i));
    }

    // Generate content for each slide
    const enrichedSlides = [];
    for (let i = 0; i < ppt.slides.length; i++) {
      const slide = ppt.slides[i];
      const slideTitle = slide.title;

      // Web search for slide content
      let webSnippets = '';
      try {
        const results = await webSearch(`${ppt.topic} ${slideTitle}`, 3);
        webSnippets = results.map((r) => `${r.title}: ${r.snippet}`).join('\n');
      } catch (e) {
        console.warn(`Web search for slide ${i} failed:`, e.message);
      }

      const slideSystemPrompt = `You are a professional presentation writer. Using the following web research, write the content for a single presentation slide. Return ONLY valid JSON with this exact shape:
{
  "title": "slide title here",
  "bullets": ["point 1", "point 2", "point 3", "point 4"],
  "speakerNotes": "2-3 sentences of speaker notes"
}
No markdown, no backticks, no explanation. Only the JSON object.
Research context: ${webSnippets}
Slide title: ${slideTitle}
Presentation topic: ${ppt.topic}`;

      let bullets = [];
      let speakerNotes = '';
      try {
        const raw = await callOllama(`Generate slide content for: ${slideTitle}`, slideSystemPrompt);
        const cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned);
        bullets = parsed.bullets || [];
        speakerNotes = parsed.speakerNotes || '';
      } catch (e) {
        console.warn(`Slide ${i} content parse failed:`, e.message);
        bullets = [`Key point about ${slideTitle}`, 'Supporting detail', 'Additional context', 'Summary'];
        speakerNotes = `This slide covers ${slideTitle} in the context of ${ppt.topic}.`;
      }

      // Image search if needed
      let imageUrl = '';
      let imageQuery = '';
      if (slidesNeedingImages.has(i)) {
        try {
          imageUrl = await fetchImageForContext(slideTitle, ppt.topic);
          imageQuery = slideTitle;
        } catch (e) {
          console.warn(`Image search for slide ${i} failed:`, e.message);
        }
      }

      // Determine Layout Type
      let layoutType = 'TEXT_ONLY';
      if (i === 0) {
        layoutType = 'TITLE';
      } else if (imageUrl) {
        // Randomly choose between left and right image layouts for variety
        layoutType = Math.random() > 0.5 ? 'IMAGE_LEFT' : 'IMAGE_RIGHT';
      } else {
        layoutType = 'TEXT_ONLY';
      }

      enrichedSlides.push({
        order: i,
        title: slideTitle,
        bullets,
        speakerNotes,
        imageUrl,
        imageQuery,
        layoutType,
      });
    }

    // Build PPTX file
    const PptxGenJs = require('pptxgenjs');
    const pptx = new PptxGenJs();

    pptx.layout = 'LAYOUT_WIDE';

    // Convert hex to pptxgenjs rgb format (e.g. "#1a1f3c" → "1a1f3c")
    const toRgb = (hex) => hex.replace('#', '');

    for (const slide of enrichedSlides) {
      const s = pptx.addSlide();

      // Background
      s.background = { color: toRgb(theme.bgColor) };

      // Accent bar (left strip)
      s.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.12, h: 5.63,
        fill: { color: toRgb(theme.accentColor) },
        line: { color: toRgb(theme.accentColor) },
      });

      // Determine Layout Type (fallback to old logic if not saved)
      const layoutType = slide.layoutType || (slide.order === 0 ? 'TITLE' : (slide.imageUrl ? (slide.order % 2 === 0 ? 'IMAGE_LEFT' : 'IMAGE_RIGHT') : 'TEXT_ONLY'));

      // Base Title
      const titleProps = {
        fontSize: layoutType === 'TITLE' ? 44 : 28,
        bold: true,
        color: toRgb(theme.textColor || 'f0ede6'),
        fontFace: theme.fontHeading || 'Arial',
        valign: 'middle',
        wrap: true,
      };

      // Base Bullets
      const bulletProps = {
        options: {
          bullet: { type: 'number' },
          fontSize: 16,
          color: toRgb(theme.textColor || 'f0ede6'),
          fontFace: theme.fontBody || 'Arial',
          paraSpaceAfter: 8
        }
      };
      const bulletItems = slide.bullets.map(b => ({ text: b, ...bulletProps }));

      if (layoutType === 'TITLE') {
        // --- Title Slide Layout ---
        s.addText(slide.title, {
          ...titleProps,
          x: 1.0, y: 2.0, w: 11.3, h: 1.5,
          align: 'center',
          valign: 'bottom'
        });
        s.addShape(pptx.ShapeType.rect, {
          x: 5.8, y: 3.7, w: 1.7, h: 0.05,
          fill: { color: toRgb(theme.accentColor) },
        });
        if (bulletItems.length > 0) {
          s.addText(bulletItems.slice(0, 2), {
            x: 1.0, y: 4.0, w: 11.3, h: 1.0,
            align: 'center',
            valign: 'top',
            color: toRgb(theme.textColor || 'f0ede6'),
            fontFace: theme.fontBody || 'Arial',
            fontSize: 18,
            options: { bullet: false } // No bullets on title slide
          });
        }
      } else if (layoutType === 'TEXT_ONLY') {
        // --- Text Only Layout ---
        s.addText(slide.title, { ...titleProps, x: 0.5, y: 0.4, w: 12.3, h: 1.0 });
        s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.35, w: 2.5, h: 0.04, fill: { color: toRgb(theme.accentColor) } });
        s.addText(bulletItems, { x: 0.5, y: 1.7, w: 11.8, h: 3.3, valign: 'top', wrap: true });
      } else if (layoutType === 'IMAGE_LEFT') {
        // --- Image Left Layout ---
        try {
          s.addImage({ path: slide.imageUrl, x: 0.5, y: 1.2, w: 5.0, h: 3.2, sizing: { type: 'contain', w: 5.0, h: 3.2 } });
        } catch (e) { console.warn('PptxGenJs Image Add Failed', e); }
        s.addText(slide.title, { ...titleProps, x: 5.8, y: 0.6, w: 7.0, h: 1.0 });
        s.addShape(pptx.ShapeType.rect, { x: 5.8, y: 1.6, w: 2.0, h: 0.04, fill: { color: toRgb(theme.accentColor) } });
        s.addText(bulletItems, { x: 5.8, y: 1.9, w: 7.0, h: 3.0, valign: 'top', wrap: true });
      } else if (layoutType === 'IMAGE_RIGHT') {
        // --- Image Right Layout ---
        s.addText(slide.title, { ...titleProps, x: 0.5, y: 0.6, w: 7.2, h: 1.0 });
        s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.6, w: 2.0, h: 0.04, fill: { color: toRgb(theme.accentColor) } });
        s.addText(bulletItems, { x: 0.5, y: 1.9, w: 7.2, h: 3.0, valign: 'top', wrap: true });
        try {
          s.addImage({ path: slide.imageUrl, x: 8.0, y: 1.2, w: 5.0, h: 3.2, sizing: { type: 'contain', w: 5.0, h: 3.2 } });
        } catch (e) { console.warn('PptxGenJs Image Add Failed', e); }
      }

      // Speaker notes
      if (slide.speakerNotes) {
        s.addNotes({ text: slide.speakerNotes });
      }
    }

    // Save file
    const fileName = `${pptId}.pptx`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    await pptx.writeFile({ fileName: filePath });

    // Update MongoDB
    await PPT.updateOne(
      { _id: ppt._id },
      { slides: enrichedSlides, status: 'done', filePath: filePath }
    );

    res.json({
      success: true,
      pptId: ppt._id,
      downloadUrl: `/api/ppt/download/${ppt._id}`,
    });
  } catch (err) {
    console.error('generate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/ppt/download/:id ───────────────────────────────────────────────
router.get('/download/:id', async (req, res) => {
  try {
    const ppt = await PPT.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ppt) return res.status(404).json({ success: false, error: 'PPT not found' });
    if (!ppt.filePath || !fs.existsSync(ppt.filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    const fileName = `${ppt.topic.replace(/[^a-z0-9]/gi, '_')}.pptx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    fs.createReadStream(ppt.filePath).pipe(res);
  } catch (err) {
    console.error('download error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/ppt/edit-slide ────────────────────────────────────────────────
router.post('/edit-slide', async (req, res) => {
  try {
    const { pptId, slideIndex, instruction } = req.body;
    if (!pptId || slideIndex === undefined || !instruction) {
      return res.status(400).json({ success: false, error: 'pptId, slideIndex, instruction required' });
    }
    const ppt = await PPT.findOne({ _id: pptId, userId: req.user._id });
    if (!ppt) return res.status(404).json({ success: false, error: 'PPT not found' });

    const slide = ppt.slides[slideIndex];
    if (!slide) return res.status(404).json({ success: false, error: 'Slide not found' });

    const slideJSON = JSON.stringify({ title: slide.title, bullets: slide.bullets, speakerNotes: slide.speakerNotes });
    const prompt = `You are editing a presentation slide. Current slide JSON: ${slideJSON}. User instruction: ${instruction}. Return ONLY updated JSON in the exact same shape: { title, bullets, speakerNotes }. No explanation.`;

    const raw = await callOllama(prompt);
    const cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim();
    const updated = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned);

    ppt.slides[slideIndex].title = updated.title || slide.title;
    ppt.slides[slideIndex].bullets = updated.bullets || slide.bullets;
    ppt.slides[slideIndex].speakerNotes = updated.speakerNotes || slide.speakerNotes;

    await PPT.updateOne(
      { _id: ppt._id },
      { slides: ppt.slides }
    );

    res.json({ success: true, slide: ppt.slides[slideIndex] });
  } catch (err) {
    console.error('edit-slide error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/ppt/list ───────────────────────────────────────────────────────
router.get('/list', async (req, res) => {
  try {
    const pptsCursor = await PPT.find({ userId: req.user._id });
    const pptsArray = await pptsCursor.sort({ createdAt: -1 }).toArray();

    // Select specific fields to return
    const ppts = pptsArray.map(p => ({
      _id: p._id,
      topic: p.topic,
      status: p.status,
      themeSlug: p.themeSlug,
      imagePreference: p.imagePreference,
      createdAt: p.createdAt,
      slides: p.slides
    }));

    res.json({ success: true, ppts });
  } catch (err) {
    console.error('list error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/ppt/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const ppt = await PPT.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ppt) return res.status(404).json({ success: false, error: 'PPT not found' });
    res.json({ success: true, ppt });
  } catch (err) {
    console.error('get ppt error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/ppt/:id ──────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['topic', 'slides', 'status', 'imagePreference', 'themeSlug'];
    const update = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const ppt = await PPT.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { new: true }
    );
    if (!ppt) return res.status(404).json({ success: false, error: 'PPT not found' });
    res.json({ success: true, ppt });
  } catch (err) {
    console.error('patch ppt error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/ppt/:id ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const ppt = await PPT.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ppt) return res.status(404).json({ success: false, error: 'PPT not found' });

    // Delete the file if it exists
    if (ppt.filePath && fs.existsSync(ppt.filePath)) {
      try {
        fs.unlinkSync(ppt.filePath);
      } catch (err) {
        console.error('Error deleting PPT file:', err);
      }
    }

    await PPT.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'PPT deleted successfully' });
  } catch (err) {
    console.error('delete ppt error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

