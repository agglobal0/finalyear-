const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const optionalAuthMiddleware = require('../middleware/optionalAuth');
const { ObjectId } = require('mongodb');
const { connectDB } = require('../util/db');

// Question sets for different levels
const INTERVIEW_QUESTIONS = {
  basic: [
    { question: "What is your full name?", category: "personal" }
  ],
  standard: [
    { question: "What is your full name?", category: "personal" },
    { question: "What is your email address?", category: "contact" },
    { question: "What is your current job title or desired position?", category: "career" },
    { question: "What is your highest level of education and your degree/field of study?", category: "education" },
    { question: "Tell us briefly about your professional experience. What are your key roles and responsibilities?", category: "experience" }
  ],
  advanced: [
    { question: "What is your full name and preferred contact information?", category: "personal" },
    { question: "What is your professional summary or career objective? What are you looking to achieve?", category: "summary" },
    { question: "Describe your educational background including degrees, certifications, and any relevant coursework.", category: "education" },
    { question: "Tell us about your professional experience. What are your major roles, companies, and accomplishments?", category: "experience" },
    { question: "What are your core technical and professional skills? List your key competencies.", category: "skills" },
    { question: "Describe a significant project or achievement you are proud of. What was the impact?", category: "achievements" },
    { question: "What are your career goals and aspirations? Where do you see yourself in 5 years?", category: "goals" },
    { question: "Do you have any additional certifications, languages, or specializations we should know about?", category: "special_skills" }
  ]
};

const { callDeepSeek } = require('../ai/deepseek');
const { buildInterviewPrompt } = require('../util/prompts');

// Start a new interview
router.post('/interview/start', optionalAuthMiddleware, async (req, res) => {
  try {
    const { level } = req.body;
    const userId = req.user ? req.user._id : null;

    if (!['basic', 'standard', 'advanced'].includes(level)) {
      return res.status(400).json({ error: 'Invalid interview level' });
    }

    const maxQuestionsMap = {
      basic: 3,
      standard: 8,
      advanced: 15
    };

    const interview = new Interview(userId, level, [], {
      startTime: new Date(),
      status: 'in-progress',
      maxQuestions: maxQuestionsMap[level]
    });

    const result = await interview.save();
    const interviewId = result.insertedId;

    const prompt = buildInterviewPrompt([], null, null, maxQuestionsMap[level]);
    const aiResponse = await callDeepSeek(prompt, { temperature: 0.3 });

    if (!aiResponse || !aiResponse.question) {
      throw new Error("AI failed to generate first question");
    }

    // Save the first question to initial state
    const firstQA = {
      question: aiResponse.question,
      category: aiResponse.category || 'general',
      type: aiResponse.type || 'text',
      requiresMultipleFields: aiResponse.requiresMultipleFields || false,
      options: aiResponse.options || []
    };

    await Interview.findOneAndUpdate(
      { _id: new ObjectId(interviewId) },
      { answers: [firstQA], updatedAt: new Date() }
    );

    res.json({
      success: true,
      interviewId: interviewId,
      level: level,
      totalQuestions: maxQuestionsMap[level],
      currentQuestionIndex: 0,
      question: firstQA.question,
      category: firstQA.category,
      type: firstQA.type,
      requiresMultipleFields: firstQA.requiresMultipleFields,
      options: firstQA.options
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get next question or submit answer
router.post('/interview/next', optionalAuthMiddleware, async (req, res) => {
  try {
    const { interviewId, answer, level } = req.body;

    if (!interviewId || !level) {
      return res.status(400).json({ error: 'Missing interviewId or level' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    let answersArray = interview.answers || [];
    const maxQuestions = interview.metadata?.maxQuestions || 8;

    // Get last question to validate answer against
    const lastQuestion = answersArray.length > 0 ? answersArray[answersArray.length - 1] : null;

    // Generate next question OR validate current answer using AI
    const prompt = buildInterviewPrompt(answersArray, lastQuestion, answer, maxQuestions);
    const aiResponse = await callDeepSeek(prompt, { temperature: 0.3 });

    // Handle invalid answer
    if (aiResponse.isValid === false && aiResponse.warningMessage) {
      return res.json({
        success: true,
        isComplete: false,
        isInvalid: true,
        warningMessage: aiResponse.warningMessage,
        currentQuestionIndex: answersArray.length - 1,
        totalQuestions: maxQuestions,
        question: aiResponse.question || lastQuestion.question,
        category: aiResponse.category || lastQuestion.category,
        type: aiResponse.type || lastQuestion.type,
        requiresMultipleFields: aiResponse.requiresMultipleFields || lastQuestion.requiresMultipleFields,
        options: aiResponse.options || lastQuestion.options || []
      });
    }

    // Since answer is valid, save it to the current (last) question if provided
    if (answer && answersArray.length > 0) {
      const lastIdx = answersArray.length - 1;
      answersArray[lastIdx].answer = answer;
      answersArray[lastIdx].timestamp = new Date();

      await Interview.findOneAndUpdate(
        { _id: new ObjectId(interviewId) },
        { answers: answersArray, updatedAt: new Date() }
      );
    }

    // Check if interview is complete by AI or by slot count
    if (aiResponse.done || answersArray.length >= maxQuestions) {
      await Interview.findOneAndUpdate(
        { _id: new ObjectId(interviewId) },
        { status: 'completed', updatedAt: new Date() }
      );

      return res.json({
        success: true,
        isComplete: true,
        totalAnswered: answersArray.length,
        totalQuestions: maxQuestions
      });
    }

    // Get next question from AI
    const nextQA = {
      question: aiResponse.question,
      category: aiResponse.category || 'general',
      type: aiResponse.type || 'text',
      requiresMultipleFields: aiResponse.requiresMultipleFields || false,
      options: aiResponse.options || []
    };

    // Push new question to answers array
    answersArray.push(nextQA);

    await Interview.findOneAndUpdate(
      { _id: new ObjectId(interviewId) },
      { answers: answersArray, updatedAt: new Date() }
    );

    res.json({
      success: true,
      isComplete: false,
      currentQuestionIndex: answersArray.length - 1,
      totalQuestions: maxQuestions,
      question: nextQA.question,
      category: nextQA.category,
      type: nextQA.type,
      requiresMultipleFields: nextQA.requiresMultipleFields,
      options: nextQA.options
    });
  } catch (error) {
    console.error("Error in next question:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get interview history for user
router.get('/interview/history', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const interviews = await Interview.findByUserId(userId);
    res.json({ success: true, interviews });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific interview details
router.get('/interview/:interviewId', optionalAuthMiddleware, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Verify interview belongs to user
    if (interview.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ success: true, interview });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save completed interview with answers
router.post('/interview/save', optionalAuthMiddleware, async (req, res) => {
  try {
    const { interviewId, level, answers, totalQuestions } = req.body;

    if (!interviewId) {
      return res.status(400).json({ error: 'Interview ID required' });
    }

    // Update interview with completion data
    const db = await connectDB();
    const result = await db.collection('interviews').updateOne(
      { _id: new ObjectId(interviewId) },
      {
        $set: {
          answers: answers,
          status: 'completed',
          completedAt: new Date(),
          totalQuestions: totalQuestions
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({ success: true, message: 'Interview saved successfully' });
  } catch (error) {
    console.error('Error saving interview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save method selection for interview
router.post('/interview/save-method', optionalAuthMiddleware, async (req, res) => {
  try {
    const { interviewId, method } = req.body;

    if (!interviewId) {
      return res.status(400).json({ error: 'Interview ID required' });
    }

    if (!method) {
      return res.status(400).json({ error: 'Resume method selection required' });
    }

    // Update interview with method selection
    const db = await connectDB();
    const result = await db.collection('interviews').updateOne(
      { _id: new ObjectId(interviewId) },
      {
        $set: {
          methodSelection: {
            method: method,
            selectedAt: new Date()
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({ success: true, message: 'Method selection saved successfully' });
  } catch (error) {
    console.error('Error saving method selection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get interview data
router.get('/interview/get/:interviewId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { interviewId } = req.params;

    if (!interviewId) {
      return res.status(400).json({ error: 'Interview ID required' });
    }

    const db = await connectDB();
    const interview = await db.collection('interviews').findOne({
      _id: new ObjectId(interviewId)
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({ success: true, interview });
  } catch (error) {
    console.error('Error getting interview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze interview answers with AI
router.post('/interview/analyze', optionalAuthMiddleware, async (req, res) => {
  try {
    const { interviewId, level, answers } = req.body;

    if (!interviewId || !level) {
      return res.status(400).json({ error: 'Missing required fields: interviewId and level' });
    }

    // Fetch interview from database to get complete answer data with questions
    const db = await connectDB();
    const interview = await db.collection('interviews').findOne({
      _id: new ObjectId(interviewId)
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Ensure answers is an array
    let answersArray = interview.answers || [];
    if (!answersArray || !Array.isArray(answersArray)) {
      answersArray = [];
    }

    // Build analysis prompt with proper question-answer mapping
    let answersText = '';
    if (answersArray.length > 0) {
      answersText = answersArray
        .map((a, idx) => `Q${idx + 1}: ${a.question || 'Question ' + (idx + 1)}\nA${idx + 1}: ${a.answer || '[No answer provided]'}`)
        .join('\n\n');
    } else {
      answersText = '[No answers provided]';
    }

    // Use callDeepSeek function for analysis
    let { callDeepSeek } = require('../ai/deepseek');
    if (!callDeepSeek || typeof callDeepSeek !== 'function') {
      // Fallback if import fails
      callDeepSeek = null;
    }

    const { buildAnalysisPrompt } = require('../util/prompts');
    const analysisPrompt = buildAnalysisPrompt(answersArray, interview.methodSelection?.method || 'star', interview.methodSelection?.industry || 'tech');

    let analysis;
    try {
      if (callDeepSeek && typeof callDeepSeek === 'function') {
        const response = await callDeepSeek(analysisPrompt);
        analysis = response;
      } else {
        throw new Error('AI service unavailable');
      }
    } catch (aiError) {
      console.log('AI analysis failed, using fallback:', aiError.message);
      // Fallback: create structured response without AI
      analysis = {
        overallAssessment: `Your ${level} level interview complete with ${answersArray.length} responses. Your answers provide a strong foundation for building a professional resume. Review the feedback below to enhance each answer with specific examples and metrics.`,
        strengths: ["Complete interview responses provided", "Clear structure in answers", "Foundation for strong resume content"],
        areasForImprovement: ["Add more specific measurable results and metrics", "Include concrete examples from projects or roles", "Quantify achievements and impact", "Highlight technical skills and tools used"],
        resumeBuilderTips: ["Use strong action verbs (Led, Developed, Implemented, Designed, Managed, Achieved, etc.)", "Include metrics and quantifiable results (e.g., 'increased by 40%', 'reduced costs by $50K')", "Show impact and business value of your work", "Highlight technical skills and relevant tools", "Keep bullet points concise (1-2 lines)", "Focus on achievements, not just responsibilities"],
        answerFeedback: answersArray.map((a, idx) => ({
          questionIndex: idx,
          question: a.question || 'Question ' + (idx + 1),
          answer: a.answer || '[No answer provided]',
          resumePoints: [
            "Extract key achievements and metrics",
            "Convert to action-focused bullet points",
            "Highlight relevant skills and tools"
          ],
          feedback: "This response contains valuable resume material. Consider: adding specific metrics or outcomes, including action verbs, and highlighting any measurable impact or results achieved."
        }))
      };
    }

    // Save analysis to database
    await db.collection('interviews').updateOne(
      { _id: new ObjectId(interviewId) },
      {
        $set: {
          analysis: analysis,
          analyzedAt: new Date()
        }
      }
    );

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Error analyzing interview:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
