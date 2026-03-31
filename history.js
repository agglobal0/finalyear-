const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const Presentation = require('../models/Presentation');
const PromptFeedback = require('../models/PromptFeedback');
const History = require('../models/History');

// Get all presentations for current user
router.get('/presentations', async (req, res) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const presentations = await Presentation.find({ user: userId });
    res.json(presentations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save a new presentation (already exists in auth routes but expose here for consistency)
router.post('/presentations', async (req, res) => {
  const { title, content, summaryPrompt } = req.body;
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    const presentation = new Presentation({ title, content, summaryPrompt, user: userId });
    const saved = await presentation.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// History endpoints: save and retrieve generated artifacts (pptx/resume)
// POST /api/history
router.post('/', async (req, res) => {
  const { title, type, sourceData, fileContent, prompt } = req.body;
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const entry = new History({ user: userId, title, type, sourceData, fileContent, prompt });
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/history
router.get('/', async (req, res) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const items = await History.find({ user: userId });
    // Sort by createdAt descending (newest first)
    if (Array.isArray(items)) {
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/history/:id
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    // Convert string ID to ObjectId for MongoDB query
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid resume ID format' });
    }
    const query = { _id: objectId };
    if (userId) query.user = userId;
    const item = await History.findOne(query);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/history/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid resume ID format' });
    }
    
    // Require user match if authenticated system is strictly enforcing it
    const query = { _id: objectId };
    if (userId) query.user = userId;

    const result = await History.deleteOne(query);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Not found or unauthorized to delete' });
    }
    
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/history/:id/with-updates - Get parent resume with all updates
router.get('/:id/with-updates', async (req, res) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    // Convert string ID to ObjectId for MongoDB query
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid resume ID format' });
    }
    const query = { _id: objectId };
    if (userId) query.user = userId;

    const parentItem = await History.findOne(query);
    if (!parentItem) return res.status(404).json({ message: 'Parent resume not found' });

    // Fetch all child updates
    const updates = await History.getUpdateHistory(req.params.id);

    // Return parent with updates array
    res.json({
      parent: parentItem,
      updates: updates || [],
      totalUpdates: (updates || []).length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Prompt feedback endpoints
router.post('/feedback', async (req, res) => {
  const { prompt, feedback, rating } = req.body;
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    const entry = new PromptFeedback({ user: userId, prompt, feedback, rating });
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/feedback', async (req, res) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const feedbacks = await PromptFeedback.find({ user: userId });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
