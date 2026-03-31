const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { callDeepSeek } = require('../ai/deepseek');

// ─── Training Data Directory ───────────────────────────────────────────────
const TRAIN_DIR = path.join(__dirname, '..', 'training_data');
const VALID_TYPES = ['resume', 'ppt', 'letter', 'interview'];

async function ensureDir(type) {
  const dir = path.join(TRAIN_DIR, type);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function getPromptPath(type) {
  const dir = await ensureDir(type);
  return path.join(dir, 'additional_prompt.txt');
}

async function getReviewPath(type) {
  const dir = await ensureDir(type);
  return path.join(dir, 'review.json');
}

// Load the additional prompt for a given type (or empty string)
async function loadAdditionalPrompt(type) {
  try {
    if (!VALID_TYPES.includes(type)) return '';
    const p = await getPromptPath(type);
    return await fs.readFile(p, 'utf8');
  } catch {
    return '';
  }
}

// ─── GET /api/review/status/:type ────────────────────────────────────────
// Returns { hasReview, review, additionalPromptPreview }
router.get('/status/:type', async (req, res) => {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  try {
    const reviewPath = await getReviewPath(type);
    let reviewData = null;
    try {
      const raw = await fs.readFile(reviewPath, 'utf8');
      reviewData = JSON.parse(raw);
    } catch { /* no review yet */ }

    const prompt = await loadAdditionalPrompt(type);
    res.json({
      hasReview: !!reviewData,
      review: reviewData?.review || null,
      additionalPromptPreview: prompt ? prompt.slice(0, 200) + (prompt.length > 200 ? '…' : '') : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/review/submit ──────────────────────────────────────────────
// Body: { type, review }
// Returns: { status: 'rejected'|'unclear'|'success', reason?, clarifyHint?, additionalPrompt? }
router.post('/submit', async (req, res) => {
  const { type, review } = req.body;
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!review || review.trim().length < 5) return res.status(400).json({ error: 'Review too short' });

  try {
    // ── Step 1: Validate the review ───────────────────────────────────────
    const existingPrompt = await loadAdditionalPrompt(type);

    const validationPrompt = `You are an AI training system that validates user feedback about an AI-generated ${type}.

User review: "${review}"

Classify this review into exactly one category and return JSON:
{
  "status": "rejected" | "unclear" | "valid",
  "reason": "short reason if rejected (max 80 chars)",
  "clarifyHint": "what to clarify if unclear (max 100 chars)",
  "distilledInstruction": "concise AI instruction extracted from the review if valid (max 200 chars)"
}

Rules:
- "rejected": off-topic (not about the ${type}), toxic/abusive language, spam, random text, or completely unusable
- "unclear": user made a valid point but it's too vague to act on (e.g. "make it better", "fix it")
- "valid": specific, actionable feedback about the ${type} quality, content, tone, format, or style

Current additional prompt for ${type} (may be empty): "${existingPrompt}"

If valid, "distilledInstruction" must be a specific AI instruction that improves future ${type} generations, compatible with the existing additional prompt.`;

    const validation = await callDeepSeek(validationPrompt, { temperature: 0.2, max_tokens: 400 });

    if (validation.status === 'rejected') {
      return res.json({ status: 'rejected', reason: validation.reason || 'This review could not be used.' });
    }

    if (validation.status === 'unclear') {
      return res.json({ status: 'unclear', clarifyHint: validation.clarifyHint || 'Please be more specific.' });
    }

    // ── Step 2: Merge distilled instruction into additional prompt ─────────
    const newInstruction = validation.distilledInstruction || review.slice(0, 200);

    let mergedPrompt;
    if (existingPrompt) {
      // Ask AI to merge the new instruction into the existing prompt, keeping it concise
      const mergePrompt = `You maintain a short additional instruction set for an AI that generates ${type}s.

Existing instructions:
${existingPrompt}

New instruction to incorporate: "${newInstruction}"

Return ONLY the updated instruction set as plain text (no JSON). 
Rules:
- Merge and deduplicate similar points — do NOT just append
- Keep total length under 600 characters
- Keep it in clear, imperative style ("Always...", "Ensure...", "Avoid...")
- Remove redundant or contradictory instructions`;

      mergedPrompt = await callDeepSeek(mergePrompt, { temperature: 0.2, max_tokens: 300, raw: true });
    } else {
      mergedPrompt = newInstruction;
    }

    // ── Step 3: Persist ────────────────────────────────────────────────────
    await fs.writeFile(await getPromptPath(type), mergedPrompt, 'utf8');
    await fs.writeFile(await getReviewPath(type), JSON.stringify({ review, type, savedAt: new Date().toISOString() }, null, 2), 'utf8');

    res.json({ status: 'success', additionalPrompt: mergedPrompt });
  } catch (err) {
    console.error('review/submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/review/clarify ─────────────────────────────────────────────
// Body: { type, originalReview, clarification }
router.post('/clarify', async (req, res) => {
  const { type, originalReview, clarification } = req.body;
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!clarification || clarification.trim().length < 3) return res.status(400).json({ error: 'Clarification too short' });

  // Combine and run through full validation + distillation
  const combinedReview = `${originalReview}. Clarification: ${clarification}`;

  try {
    const existingPrompt = await loadAdditionalPrompt(type);

    const validationPrompt = `You are an AI training system that validates user feedback about an AI-generated ${type}.

User review: "${combinedReview}"

Classify this review into exactly one category and return JSON:
{
  "status": "rejected" | "unclear" | "valid",
  "reason": "short reason if rejected (max 80 chars)",
  "clarifyHint": "what to clarify if unclear (max 100 chars)",
  "distilledInstruction": "concise AI instruction extracted from the review if valid (max 200 chars)"
}

Rules:
- "rejected": off-topic, toxic/abusive, spam, or completely unusable
- "unclear": valid point but too vague to act on
- "valid": specific, actionable feedback about ${type} quality, content, tone, format, or style

Current additional prompt: "${existingPrompt}"`;

    const validation = await callDeepSeek(validationPrompt, { temperature: 0.2, max_tokens: 400 });

    if (validation.status === 'rejected') {
      return res.json({ status: 'rejected', reason: validation.reason || 'Still could not process this review.' });
    }
    if (validation.status === 'unclear') {
      return res.json({ status: 'unclear', clarifyHint: validation.clarifyHint || 'Still unclear. Be more specific.' });
    }

    const newInstruction = validation.distilledInstruction || combinedReview.slice(0, 200);
    let mergedPrompt;
    if (existingPrompt) {
      const mergePrompt = `Merge this new instruction into the existing ${type} generation instructions. Existing: ${existingPrompt}. New: "${newInstruction}". Return ONLY updated instructions, max 600 chars, imperative style, no duplicates.`;
      mergedPrompt = await callDeepSeek(mergePrompt, { temperature: 0.2, max_tokens: 300, raw: true });
    } else {
      mergedPrompt = newInstruction;
    }

    await fs.writeFile(await getPromptPath(type), mergedPrompt, 'utf8');
    await fs.writeFile(await getReviewPath(type), JSON.stringify({ review: combinedReview, type, savedAt: new Date().toISOString() }, null, 2), 'utf8');

    res.json({ status: 'success', additionalPrompt: mergedPrompt });
  } catch (err) {
    console.error('review/clarify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/review/prompt/:type ────────────────────────────────────────
// Returns the current additional prompt for a type (used by generation endpoints)
router.get('/prompt/:type', async (req, res) => {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  const prompt = await loadAdditionalPrompt(type);
  res.json({ prompt });
});

module.exports = router;
module.exports.loadAdditionalPrompt = loadAdditionalPrompt;
