const express = require('express');
const router = express.Router();
const { searchImages } = require('../services/imageService');
const { webSearch } = require('../services/searchService');
const { callDeepSeek } = require('../ai/deepseek');

// GET /api/external/images?query=...
router.get('/images', async (req, res) => {
  try {
    const q = req.query.query || req.query.q;
    if (!q) return res.status(400).json({ message: 'Query required' });
    const result = await searchImages(q, 10);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/external/search?query=...
router.get('/search', async (req, res) => {
  try {
    const q = req.query.query || req.query.q;
    if (!q) return res.status(400).json({ message: 'Query required' });
    const results = await webSearch(q, 8);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/external/deepseek-search { query }
// Runs a web search, then sends the aggregated snippets to DeepSeek for structured output
router.post('/deepseek-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: 'query required in body' });
    const searchResults = await webSearch(query, 6);
    const combined = searchResults.map(r => `${r.title}: ${r.snippet} (${r.link})`).join('\n\n');
    const prompt = `Use the following web search snippets to produce a concise structured summary for: ${query}\n\n${combined}\n\nReturn JSON with keys: summary, bullets, sources`;
    const aiResponse = await callDeepSeek(prompt, { temperature: 0.3, max_tokens: 800 });
    res.json({ success: true, data: aiResponse });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;