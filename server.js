// server.js - Improved with HTML/Tailwind resume generation
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- Encryption Logic for Headshots ---
const ENCRYPTION_KEY = Buffer.from('8e6e5e8e7e6e5e4e3e2e1e0e9e8e7e6e5e4e3e2e1e0e9e8e7e6e5e4e3e2e1e0e', 'hex').slice(0, 32); 
const IV_LENGTH = 16;

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(buffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

function decryptBuffer(buffer) {
  const iv = buffer.slice(0, IV_LENGTH);
  const encryptedText = buffer.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}

// Ensure uploads directory exists
const HEADSHOTS_DIR = path.join(__dirname, 'uploads', 'headshots');
if (!fs.existsSync(HEADSHOTS_DIR)) {
  fs.mkdirSync(HEADSHOTS_DIR, { recursive: true });
}

// --- End of Encryption Logic ---



const {
  buildInterviewPrompt,
  buildResumeLayoutPrompt,
  buildResumeModificationPrompt,
  buildAnalysisPrompt,
  buildPresentationPrompt
} = require("./util/prompts");
const { generatePDFBuffer, generateResumeLayout } = require('./util/pdfGenerator');
// Added import for PPTX generation utility
const { generatePresentation } = require('./util/pptxGenerator');
const { connectDB } = require('./util/db');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const externalRoutes = require('./routes/external');
const historyRoutes = require('./routes/history');
const reviewRoutes = require('./routes/review');
const interviewRoutes = require('./routes/interview');
const pptRoutes = require('./routes/ppt');
const authMiddleware = require('./middleware/auth');
// Load History model used by API routes
const History = require('./models/History');

// Import AI service
const { callDeepSeek } = require("./ai/deepseek");
// Import Image service
const { enrichWithImages } = require('./services/imageService');


// --- MongoDB Connection ---
connectDB();
// --- End of MongoDB Connection ---

// Import missing constants
const RESUME_METHODS = {
  star: { name: 'STAR Method', description: 'Situation–Task–Action–Result' },
  car: { name: 'CAR Method', description: 'Challenge–Action–Result' },
  par: { name: 'PAR Method', description: 'Problem–Action–Result' },
  soar: { name: 'SOAR Method', description: 'Situation–Obstacle–Action–Result' },
  fab: { name: 'FAB Method', description: 'Features–Advantages–Benefits' }
};

const INDUSTRY_STANDARDS = {
  tech: { colors: ['#2563eb', '#1f2937'], sections: ['contact', 'summary', 'skills', 'experience', 'projects', 'education'] },
  medical: { colors: ['#dc2626', '#1f2937'], sections: ['contact', 'summary', 'education', 'certifications', 'experience', 'skills'] },
  ai: { colors: ['#7c3aed', '#1f2937'], sections: ['contact', 'summary', 'skills', 'research', 'projects', 'experience'] }
};

const app = express();
const PORT = process.env.PORT || 5000;




// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Optional: disable CSP for easier development if needed, but CORP is the main issue
}));
app.use(morgan('combined'));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.post('/api/saveHeadshot', authMiddleware, async (req, res) => {
  try {
    const { image, filterName } = req.body;
    if (!image) return res.status(400).json({ success: false, error: 'No image provided' });

    // Extract base64 content
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // Encrypt
    const encrypted = encryptBuffer(buffer);

    // Save to disk
    const filename = `headshot_${req.user._id}_${Date.now()}.enc`;
    const filepath = path.join(HEADSHOTS_DIR, filename);
    fs.writeFileSync(filepath, encrypted);

    // Save history entry with type 'headshot'
    const historyItem = new History({
      user: req.user._id,
      title: `Headshot — ${filterName || 'Professional'}`,
      type: 'headshot',
      sourceData: { filename, filterName, bgColor: req.body.bgColor },
      fileContent: base64Data, // Still store preview in DB for efficiency, or just the filename? Let's do both for now.
      lastPage: 'headshot'
    });
    const saved = await historyItem.save();

    res.json({ success: true, historyId: saved.insertedId });
  } catch (err) {
    console.error('saveHeadshot error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/external', externalRoutes);
app.use('/api/history', authMiddleware, historyRoutes);
app.use('/api/review', authMiddleware, reviewRoutes);
app.use('/api/ppt', authMiddleware, pptRoutes);
app.use('/api', interviewRoutes);

// Global state
let resumeAnalysis = null;
let resumeLayout = null;
let interviewState = {
  qa: [],
  finished: false,
  maxQuestions: 5,
  level: "basic"
};
// Debug: store last raw AI responses for inspection
let lastAIResumeResponse = null;

// Redundant template removed, using centralized generator from utils/pdfGenerator.js


// API Routes
app.post("/api/generatePPTX", authMiddleware, async (req, res) => {
  try {
    const { topic, slideCount, tone } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: "The 'topic' field is required in the request body.",
      });
    }

    // 1. Generate a prompt for the AI
    const prompt = buildPresentationPrompt(topic, slideCount, tone);

    // 2. Call the AI to get structured presentation data
    const aiData = await callDeepSeek(prompt, { max_tokens: 1000 });

    // 2.5 Enrich slides with images
    if (aiData.slides && Array.isArray(aiData.slides)) {
      aiData.slides = await enrichWithImages(aiData.slides, topic);
    }

    // 3. Generate the .pptx file from the AI data
    const pptx_data = await generatePresentation(aiData);

    // 4. Save to history
    const historyItem = new History({
      user: req.user._id,
      title: aiData.title || topic,
      type: 'pptx',
      sourceData: aiData,
      fileContent: pptx_data,
      prompt: topic
    });
    const savedItem = await historyItem.save();

    // 5. Send the base64 PPTX and history ID back to the client
    res.json({ success: true, pptx: pptx_data, aiData: aiData, historyId: savedItem._id });
  } catch (error) {
    console.error("PPTX generation error:", error);
    res.status(500).json({
      success: false,
      error: `PPTX generation failed: ${error.message}`,
      details: error.cause,
    });
  }
});

// History and feedback endpoints are handled in routes/history.js (mounted with auth middleware)

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});



app.post("/api/modifyResumeGeneral", async (req, res) => {
  try {
    if (!resumeLayout) {
      return res.status(400).json({
        success: false,
        error: "No resume exists to modify. Please generate a resume first."
      });
    }

    const { request, section, parentHistoryId, userId } = req.body;

    if (!request || !request.trim()) {
      return res.status(400).json({
        success: false,
        error: "Modification request is required"
      });
    }

    const modificationPrompt = `
You are an AI resume editor. Modify the existing resume based on the user's request.

Current Resume Data:
${JSON.stringify(resumeLayout.data, null, 2)}

User Request: "${request}"
${section ? `Focused Section: "${section}"` : ''}

Rules:
1. Return ONLY the complete updated JSON resume structure
2. Make targeted changes based on the request
3. Preserve all existing information unless specifically requested to change/remove
4. Maintain professional language and ATS optimization
5. Keep the same JSON structure as the original
6. If adding new information, ensure it's relevant and professional

Return the complete updated resume JSON:`;

    const modified = await callDeepSeek(modificationPrompt, {
      temperature: 0.4,
      max_tokens: 1500
    });

    // Use centralized generator with preserved theme
    const currentTheme = req.body.theme || resumeLayout.theme || { primary: "#2563eb" };
    const layout = await generateResumeLayout(modified, currentTheme);

    // Update global state for older endpoints
    resumeLayout = layout;

    // Save update to history if parentHistoryId is provided
    if (parentHistoryId) {
      try {
        const userId = req.user ? req.user._id : req.body.userId; // Fallback to body for now if req.user missing, but prefer auth
        const fileContentBase64 = Buffer.from(layout.htmlContent).toString('base64');

        // Create update entry as child of parent resume
        const updateEntry = new History({
          user: userId,
          title: `Resume Update - ${new Date().toLocaleString()}`,
          type: 'resume-html',
          sourceData: modified,
          fileContent: fileContentBase64,
          prompt: request,
          parentHistoryId: parentHistoryId // Set parent history ID
        });

        const savedUpdate = await updateEntry.save();

        // Also add to parent's updates array for quick access
        const updateRecord = {
          updateId: savedUpdate.insertedId,
          request: request,
          section: section || 'general',
          timestamp: new Date(),
          modifiedData: modified
        };

        await History.addUpdate(parentHistoryId, updateRecord);

        console.log('Resume update saved to history:', savedUpdate.insertedId);
      } catch (historyErr) {
        console.error('Error saving update to history:', historyErr);
        // Continue even if history save fails
      }
    }

    res.json({ success: true, layout: layout });

  } catch (err) {
    console.error("Resume modification error:", err);
    res.status(500).json({
      success: false,
      error: `Modification failed: ${err.message}`
    });
  }
});






app.post("/api/modifySelectedText", async (req, res) => {
  try {
    const { resumeData, htmlContent, selectedText, context, modification } = req.body;

    if (!resumeData || !selectedText || !modification) {
      return res.status(400).json({
        success: false,
        error: "Resume data, selected text, and modification instructions are required"
      });
    }

    const modificationPrompt = `
You are an AI resume editor specializing in precise text modifications. You need to modify ONLY the selected text while preserving everything else.

Current Resume Data:
${JSON.stringify(resumeData, null, 2)}

Selected Text to Modify: "${selectedText}"
Context Around Selected Text: "${context}"
User's Modification Request: "${modification}"

CRITICAL RULES:
1. Find the exact location of the selected text in the resume data
2. Apply ONLY the requested modification to that specific text
3. Preserve ALL other resume content exactly as is
4. Maintain the same JSON structure
5. Be surgical and precise - no broad changes

Task: Identify where "${selectedText}" appears in the resume and modify it according to the user's request.

Return the complete updated resume JSON with ONLY the selected text modified:
`;

    const modifiedResume = await callDeepSeek(modificationPrompt, {
      temperature: 0.3,
      max_tokens: 1500
    });

    // Validate the response
    if (!modifiedResume || typeof modifiedResume !== 'object') {
      throw new Error("Invalid modification response from AI");
    }

    // Generate updated HTML with preserved theme
    const currentTheme = resumeLayout?.theme || { primary: "#2563eb" };
    const updatedLayout = await generateResumeLayout(modifiedResume, currentTheme);

    // Update global state
    resumeLayout = updatedLayout;

    console.log(`Modified selected text: "${selectedText.substring(0, 50)}..."`);

    // Save update to history if parentHistoryId and userId are provided
    if (req.body.parentHistoryId && req.body.userId) {
      try {
        const fileContentBase64 = Buffer.from(updatedLayout.htmlContent).toString('base64');

        // Create update entry as child of parent resume
        const updateEntry = new History(
          req.body.userId,
          `Resume Update - Selected Text - ${new Date().toLocaleString()}`,
          'resume-html',
          modifiedResume,
          fileContentBase64,
          `Modified: "${selectedText.substring(0, 100)}..." to "${modification.substring(0, 100)}..."`,
          req.body.parentHistoryId // Set parent history ID
        );

        const savedUpdate = await updateEntry.save();

        // Also add to parent's updates array for quick access
        const updateRecord = {
          updateId: savedUpdate.insertedId,
          request: `Modified selected text: "${selectedText.substring(0, 50)}..."`,
          modification: modification,
          section: 'text-selection',
          timestamp: new Date(),
          modifiedData: modifiedResume
        };

        await History.addUpdate(req.body.parentHistoryId, updateRecord);

        console.log('Selected text modification saved to history:', savedUpdate.insertedId);
      } catch (historyErr) {
        console.error('Error saving modification to history:', historyErr);
        // Continue even if history save fails
      }
    }

    res.json({
      success: true,
      layout: updatedLayout,
      message: "Selected text modified successfully"
    });

  } catch (error) {
    console.error("Selected text modification error:", error);
    res.status(500).json({
      success: false,
      error: `Selected text modification failed: ${error.message}`
    });
  }
});



app.post("/api/startInterview", (req, res) => {
  const { level } = req.body;

  const levels = {
    basic: 1,      // More realistic for combining questions
    standard: 8,
    advanced: 15
  };

  const chosenLevel = level && levels[level] ? level : "basic";

  interviewState = {
    qa: [],
    finished: false,
    maxQuestions: levels[chosenLevel],
    level: chosenLevel
  };

  res.json({
    success: true,
    message: `Interview started with ${chosenLevel} mode`,
    maxQuestions: interviewState.maxQuestions
  });
});

app.post("/api/getInterview", async (req, res) => {
  try {
    const { answer } = req.body;

    // Save answer if there was a previous question
    if (answer !== undefined && interviewState.qa.length > 0) {
      const lastQ = interviewState.qa[interviewState.qa.length - 1];
      lastQ.answer = answer;
      lastQ.category = lastQ.category || 'general'; // Ensure category exists
    }

    // Check if we reached max questions
    if (interviewState.qa.length >= interviewState.maxQuestions) {
      interviewState.finished = true;
      return res.json({
        success: true,
        done: true,
        message: "Interview complete."
      });
    }

    // Build prompt with improved logic
    const lastQuestion = interviewState.qa.length > 0 ? interviewState.qa[interviewState.qa.length - 1] : null;
    const prompt = buildInterviewPrompt(
      interviewState.qa,
      lastQuestion,
      answer,
      interviewState.maxQuestions
    );

    const parsed = await callDeepSeek(prompt, { temperature: 0.3 }); // Lower temp for consistency

    if (parsed.done) {
      interviewState.finished = true;
      return res.json({
        success: true,
        done: true,
        message: "Interview complete."
      });
    }

    if (!parsed.question) {
      return res.status(500).json({
        success: false,
        error: "AI did not return a valid question"
      });
    }

    // Save new question with metadata
    interviewState.qa.push({
      question: parsed.question,
      answer: null,
      category: parsed.category || 'general',
      type: parsed.type || 'text',
      requiresMultipleFields: parsed.requiresMultipleFields || false
    });

    res.json({
      success: true,
      question: parsed.question,
      type: parsed.type || "text",
      options: parsed.options || [],
      category: parsed.category,
      currentCount: interviewState.qa.length,
      maxQuestions: interviewState.maxQuestions
    });

  } catch (error) {
    console.error("Interview error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/chooseMethod", async (req, res) => {
  try {
    let { method, industry } = req.body;

    industry = industry || "tech";
    method = method || "star";

    const selectedMethod = RESUME_METHODS[method] || RESUME_METHODS.star;
    const selectedIndustry = INDUSTRY_STANDARDS[industry] || INDUSTRY_STANDARDS.tech;

    // Use improved analysis prompt
    const analysisPrompt = buildAnalysisPrompt(interviewState.qa, method, industry);
    const analysis = await callDeepSeek(analysisPrompt, { temperature: 0.4 });

    resumeAnalysis = analysis;

    res.json({
      success: true,
      method: selectedMethod,
      industry: selectedIndustry,
      analysis: {
        summaryText: `Professional ${industry} specialist with proven experience`,
        structuredData: analysis,
        visualIdeas: ["Skills distribution chart", "Experience timeline"]
      }
    });

  } catch (error) {
    console.error("Choose method error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/generateResume", authMiddleware, async (req, res) => {
  try {
    const { preference, selectedHighlights, additionalInfo, skipMissingCheck } = req.body;

    // Add additional info to interview state if provided
    if (additionalInfo && additionalInfo.trim()) {
      interviewState.qa.push({
        question: "Supplementary information for resume completion",
        answer: additionalInfo,
        category: 'supplementary',
        type: 'text'
      });
    }

    const Interview = require('./models/Interview');
    const { interviewId } = req.body;

    // Fetch user-specific interview data from DB
    let qaData = interviewState.qa;
    try {
      let interview;
      if (interviewId) {
        interview = await Interview.findById(interviewId);
        console.log(`Fetching specific interview from DB: ${interviewId}`);
      } else {
        const interviews = await Interview.findByUserId(req.user._id);
        if (interviews && interviews.length > 0) {
          interview = interviews[0];
          console.log(`Using latest interview from DB for user: ${req.user._id}`);
        }
      }

      if (interview && interview.answers && interview.answers.length > 0) {
        qaData = interview.answers.map(a => ({
          question: a.question,
          answer: a.answer,
          category: a.category || 'general'
        }));
      }
    } catch (dbErr) {
      console.error("Error fetching interview from DB:", dbErr);
    }

    // CRITICAL: Check if we actually have any data to build a resume with
    const hasActualData = qaData && qaData.length > 0 && qaData.some(q => q.answer && q.answer.toString().trim() !== '');
    if (!hasActualData) {
        console.warn('Attempted to generate resume with NO interview data');
        return res.status(400).json({
            success: false,
            error: "No interview data found. Please complete the interview first.",
            type: "missing_info_error",
            canRetry: true
        });
    }




    // Enhanced resume generation prompt with better structure and fallback handling
    const resumePrompt = `
You are a professional resume builder. Create a comprehensive, ATS-optimized resume using the available interview responses.

CRITICAL: Return ONLY valid JSON. No explanations, no additional text.
If the provided data is limited, use your expertise to expand on it professionally.

Interview Responses:
${JSON.stringify(qaData, null, 2)}

User Preferences:
- Template: ${preference || "ats_friendly"}
- Highlights: ${JSON.stringify(selectedHighlights || [])}

IMPORTANT INSTRUCTIONS:
1. If specific information is missing, make reasonable professional assumptions based on the context.
2. Use placeholder text that looks professional (e.g., "Professional Candidate" for name if missing).
3. Extract all available information accurately.
5. Ensure the resume looks complete and professional.
6. DO NOT EXPLAIN OR REFUSE. If data is sparse, do your best with placeholders.
7. ⚠️ SYMBOL SECURITY: Use only plain ASCII characters. NEVER use symbols like '•', '–', or 'â¢'. Use simple '-' for lists.

Required JSON Structure:
{
  "personalInfo": {
    "name": "Full Name",
    "email": "email@example.com", 
    "phone": "+1 (555) 000-0000",
    "location": "City, State",
    "linkedin": "optional",
    "portfolio": "optional"
  },
  "summary": "3-4 liners professional summary",
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "tools": ["tool1", "tool2"]
  },
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "Dates",
      "location": "Location",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name",
      "year": "Graduation Year"
    }
  ]
}

Return ONLY the JSON structure:`;

    let resumeData = await callDeepSeek(resumePrompt, {
      temperature: 0.4,
      max_tokens: 2000
    });

    // Log raw AI response for debugging parsing issues
    try {
      console.debug('Raw AI resume response (type:', typeof resumeData + '):', resumeData);
      // Save raw response for debug endpoint
      lastAIResumeResponse = resumeData;
    } catch (logErr) {
      console.error('Failed to log raw AI response:', logErr);
    }

    // AI sometimes returns JSON as a string; try to parse if needed
    if (typeof resumeData === 'string') {
      try {
        resumeData = JSON.parse(resumeData);
      } catch (parseErr) {
        // Attempt to extract a JSON block from the response
        const jsonMatch = resumeData.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            resumeData = JSON.parse(jsonMatch[0]);
          } catch (innerErr) {
            console.error('Failed to parse extracted JSON from AI response', innerErr);
          }
        }
      }
    }

    // Validate and clean the resume data
    if (!resumeData || typeof resumeData !== 'object') {
      console.warn('Initial AI resume parse failed, attempting a strict JSON-only retry');

      try {
        const strictPrompt = `Return ONLY the JSON object for the resume, matching the structure provided earlier. Do not include any explanatory text or markdown. Respond with valid JSON only.`;
        const retryResponse = await callDeepSeek(strictPrompt + "\n\nOriginal Prompt:\n" + resumePrompt, { temperature: 0.0, max_tokens: 2000 });

        // Try to use retryResponse if it's an object
        if (retryResponse && typeof retryResponse === 'object') {
          resumeData = retryResponse;
          lastAIResumeResponse = retryResponse;
        } else if (typeof retryResponse === 'string') {
          try {
            resumeData = JSON.parse(retryResponse);
            lastAIResumeResponse = retryResponse;
          } catch (retryParseErr) {
            const jsonMatch2 = retryResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch2) {
              try {
                resumeData = JSON.parse(jsonMatch2[0]);
                lastAIResumeResponse = jsonMatch2[0];
              } catch (innerRetryErr) {
                console.error('Retry parse also failed:', innerRetryErr);
              }
            }
          }
        }
      } catch (retryErr) {
        console.error('AI retry for strict JSON failed:', retryErr);
      }

      if (!resumeData || typeof resumeData !== 'object') {
        console.warn('AI parsing completely failed, creating fallback resume from interview data');

        // Build resume from interview answers directly
        resumeData = {
          personalInfo: {
            name: "Professional Candidate",
            email: "candidate@email.com",
            phone: "+1 (555) 123-4567",
            location: "City, State"
          },
          summary: "Motivated professional seeking new opportunities",
          skills: {
            technical: ["Communication", "Problem Solving", "Teamwork"],
            soft: ["Leadership", "Time Management"],
            tools: []
          },
          experience: [{
            company: "Previous Company",
            role: "Professional Role",
            duration: "Recent",
            achievements: ["Contributed to team projects", "Delivered results on time"]
          }],
          education: [{
            degree: "Bachelor's Degree",
            institution: "University",
            year: "Recent Graduate"
          }]
        };

        // Try to extract info from qaData
        if (qaData && qaData.length > 0) {
          qaData.forEach(qa => {
            const answer = (qa.answer || '').toString().trim();
            const category = (qa.category || 'general').toLowerCase();
            const question = (qa.question || '').toLowerCase();

            if (!answer || answer.length < 2) return;

            // Extract name - check category OR question text
            if ((category === 'personal' || category === 'contact' || question.includes('name')) && 
                answer.length < 80) {
              const currentName = resumeData.personalInfo.name || "";
              // Overwrite if current is placeholder or looks like a default
              if (currentName.includes("Candidate") || currentName === "Full Name" || (answer.split(' ').length > 1 && currentName.split(' ').length === 1)) {
                 resumeData.personalInfo.name = answer;
              }
            }

            // Extract email
            if (!resumeData.personalInfo.email || resumeData.personalInfo.email === "professional.candidate@email.com") {
              const emailMatch = answer.match(/[\w.-]+@[\w.-]+\.\w+/);
              if (emailMatch) {
                resumeData.personalInfo.email = emailMatch[0];
              }
            }

            // Extract phone
            if (!resumeData.personalInfo.phone || resumeData.personalInfo.phone === "+1 (555) 123-4567") {
              const phoneMatch = answer.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
              if (phoneMatch) {
                resumeData.personalInfo.phone = phoneMatch[0];
              }
            }

            // Build summary from answers
            if (category === 'summary' || category === 'career' || category === 'goals' || 
                question.includes('summary') || question.includes('objective') || question.includes('tell us about')) {
              if (answer.length > 30) {
                // Prepend or use longest
                if (resumeData.summary === "Motivated professional seeking new opportunities" || answer.length > resumeData.summary.length) {
                   resumeData.summary = answer.substring(0, 400);
                }
              }
            }

            // Extract skills
            if (category === 'skills' || question.includes('skills') || question.includes('technical')) {
              const skills = answer.split(/[,;.\n]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 40);
              if (skills.length > 0) {
                 // Clear defaults if we have real skills
                 if (resumeData.skills.technical[0] === "Communication") resumeData.skills.technical = [];
                 resumeData.skills.technical.push(...skills.slice(0, 8));
              }
            }

            // Extract experience
            if (category === 'experience' || question.includes('experience') || question.includes('work')) {
              if (answer.length > 40) {
                if (resumeData.experience[0].company === "Previous Company") {
                   resumeData.experience[0].achievements = [answer.substring(0, 300)];
                } else {
                   // Add as new entry or just add achievements
                   resumeData.experience[0].achievements.push(answer.substring(0, 200));
                }
              }
            }
          });
        }
      }
    }

    // Ensure ALL minimum required fields exist with fallback values
    if (!resumeData.personalInfo) {
      resumeData.personalInfo = {
        name: "Professional Candidate",
        email: "professional.candidate@email.com",
        phone: "+1 (555) 123-4567",
        location: "City, State"
      };
    }

    // Fill in missing personal info fields
    if (!resumeData.personalInfo.name || resumeData.personalInfo.name.trim() === '') {
      resumeData.personalInfo.name = "Professional Candidate";
    }
    if (!resumeData.personalInfo.email) {
      resumeData.personalInfo.email = "professional.candidate@email.com";
    }
    if (!resumeData.personalInfo.phone) {
      resumeData.personalInfo.phone = "+1 (555) 123-4567";
    }
    if (!resumeData.personalInfo.location) {
      resumeData.personalInfo.location = "City, State";
    }

    if (!resumeData.summary || resumeData.summary.trim() === '') {
      resumeData.summary = "Dedicated professional with strong analytical and communication skills seeking to contribute to a dynamic organization.";
    }

    // Ensure skills object exists with content
    if (!resumeData.skills || Object.keys(resumeData.skills).length === 0) {
      resumeData.skills = {
        technical: ["Problem Solving", "Communication", "Teamwork"],
        soft: ["Leadership", "Adaptability", "Time Management"],
        tools: []
      };
    } else {
      // Ensure sub-arrays exist
      if (!resumeData.skills.technical || resumeData.skills.technical.length === 0) {
        resumeData.skills.technical = ["Problem Solving", "Communication"];
      }
      if (!resumeData.skills.soft || resumeData.skills.soft.length === 0) {
        resumeData.skills.soft = ["Leadership", "Teamwork"];
      }
      if (!resumeData.skills.tools) {
        resumeData.skills.tools = [];
      }
    }

    // Ensure experience exists
    if (!resumeData.experience || resumeData.experience.length === 0) {
      resumeData.experience = [{
        company: "Recent Experience",
        role: "Professional Role",
        duration: "Recent",
        achievements: [
          "Contributed to key projects and initiatives",
          "Collaborated with cross-functional teams",
          "Delivered quality results on schedule"
        ]
      }];
    }

    // Ensure education exists
    if (!resumeData.education || resumeData.education.length === 0) {
      resumeData.education = [{
        degree: "Bachelor's Degree",
        institution: "Academic Institution",
        year: "Recent Graduate"
      }];
    }

    // Generate HTML using the enhanced generator
    const layout = await generateResumeLayout(resumeData);

    if (!layout || !layout.htmlContent) {
      throw new Error("Failed to generate resume layout");
    }

    // Store globally for modifications
    resumeLayout = layout;

    console.log("Resume generated successfully:", {
      hasPersonalInfo: !!resumeData.personalInfo,
      hasSummary: !!resumeData.summary,
      experienceCount: resumeData.experience?.length || 0,
      skillsCount: Object.keys(resumeData.skills || {}).length,
      htmlLength: layout.htmlContent.length
    });

    if (req.body.skipSave) {
      console.log('Skipping history save as requested by client');
      return res.json({
        success: true,
        layout: layout
      });
    }

    // Save to history as a parent (new resume generation) - with deduplication
    try {
      const fileContentBase64 = Buffer.from(layout.htmlContent).toString('base64');
      const resumeTitle = `Resume - ${resumeData.personalInfo?.name || 'Resume'} (${new Date().toLocaleDateString()})`;

      // Add timestamp deduplication check - prevent duplicate saves within 2 seconds
      const lastSaveTime = global.lastResumeHistorySaveTime || 0;
      const now = Date.now();

      if (now - lastSaveTime < 2000) {
        console.log('Duplicate resume save attempt within 2 seconds, skipping...');
        res.json({
          success: true,
          layout: layout,
          historyId: global.lastResumeHistoryId
        });
        return;
      }

      const historyEntry = new History(
        req.user._id,
        resumeTitle,
        'resume-html',
        resumeData, // Store the resume structure as sourceData
        fileContentBase64,
        `Generated resume with ${preference || 'ats_friendly'} preference`,
        null, // parentHistoryId = null for new resume
        'resume' // lastPage = 'resume'  
      );

      const savedHistory = await historyEntry.save();
      console.log('Resume history entry created:', savedHistory.insertedId);

      // Save deduplication info
      global.lastResumeHistorySaveTime = now;
      global.lastResumeHistoryId = savedHistory.insertedId;

      res.json({
        success: true,
        layout: layout,
        historyId: savedHistory.insertedId // Return history ID so future updates can reference it as parent
      });
    } catch (historyErr) {
      console.error('Error saving resume to history:', historyErr);
      // Still send resume even if history save fails
      res.json({ success: true, layout: layout });
    }

  } catch (err) {
    console.error("Resume generation error:", err);

    // Enhanced error handling with more specific messages
    let errorMessage = "Resume generation failed";
    let errorType = "resume_generation_error";

    if (err.message.includes('parse')) {
      errorMessage = "AI response formatting error - please try again";
      errorType = "ai_parse_error";
    } else if (err.message.includes('missing')) {
      errorMessage = "Critical information missing for resume generation";
      errorType = "missing_info_error";
    } else if (err.message.includes('layout')) {
      errorMessage = "Resume layout generation failed";
      errorType = "layout_error";
    }

    res.status(500).json({
      success: false,
      error: `${errorMessage}: ${err.message}`,
      type: errorType,
      canRetry: true
    });
  }
});

// Debug endpoint to fetch last AI resume response
app.get('/api/debug/lastResumeAI', (req, res) => {
  try {
    // Require explicit enable and a secret to access this debug endpoint
    const enabled = process.env.ENABLE_DEBUG_ENDPOINT === 'true';
    const secret = process.env.DEBUG_ENDPOINT_SECRET || '';

    if (!enabled) {
      return res.status(403).json({ success: false, error: 'Debug endpoint disabled' });
    }

    if (!secret) {
      return res.status(403).json({ success: false, error: 'Debug endpoint not configured' });
    }

    const provided = (req.headers['x-debug-secret'] || req.query.secret || '').toString();
    if (!provided || provided !== secret) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    res.json({ success: true, raw: lastAIResumeResponse });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post("/api/checkMissingInfo", async (req, res) => {
  try {
    const { additionalInfo } = req.body;

    // If additional info provided, add it to interview state
    if (additionalInfo && additionalInfo.trim()) {
      interviewState.qa.push({
        question: "Additional information provided for resume completion",
        answer: additionalInfo,
        category: 'supplementary',
        type: 'text'
      });
    }

    // Use AI to analyze what's actually missing and needed
    const missingInfoPrompt = `
You are an AI resume analyzer. Analyze the interview responses to determine if there are any CRITICAL gaps that would prevent creating a professional resume.

Interview Responses:
${JSON.stringify(interviewState.qa, null, 2)}

Rules for Analysis:
1. Only flag as missing if it's CRITICAL for a professional resume
2. Don't ask for information that can be reasonably inferred or is optional
3. Don't ask for information that's already provided in some form
4. Focus on absolutely essential resume components only

Essential Components to Check:
- Contact Information: Full name, professional email, phone number
- Professional Experience: At least one job/internship/project with specific details
- Skills: Technical or professional capabilities relevant to job seeking
- Education: Basic educational background (degree level, field, institution)

Analyze and respond with JSON:

{
  "hasIssues": boolean,
  "needsUserInput": boolean,
  "question": "specific question if user input needed",
  "missingItems": ["array of what's actually missing"],
  "canProceed": boolean,
  "reasoning": "why we need/don't need additional info"
}

Guidelines:
- hasIssues: true if any critical gaps exist
- needsUserInput: true only if we absolutely need user to provide missing info
- canProceed: true if we can build a reasonable resume with current data
- If needsUserInput is false, we should proceed with what we have

If missing info is needed, create ONE comprehensive question that asks for all missing items together.

Respond with JSON only:`;

    const analysis = await callDeepSeek(missingInfoPrompt, { temperature: 0.3 });

    // Validate the AI response
    const hasRealIssues = analysis.hasIssues && analysis.needsUserInput;
    const shouldProceed = analysis.canProceed !== false; // Default to true if not specified

    // Log for debugging
    console.log('Missing info analysis:', {
      hasIssues: analysis.hasIssues,
      needsUserInput: analysis.needsUserInput,
      canProceed: analysis.canProceed,
      questionLength: analysis.question?.length || 0,
      totalResponses: interviewState.qa.length,
      missingItems: analysis.missingItems
    });

    res.json({
      success: true,
      missingInfo: {
        hasIssues: hasRealIssues,
        needsUserInput: analysis.needsUserInput || false,
        question: hasRealIssues ? analysis.question : null,
        fields: analysis.missingItems || [],
        canProceed: shouldProceed,
        reasoning: analysis.reasoning
      }
    });

  } catch (error) {
    console.error("Missing info check error:", error);

    // Fallback to simple logic if AI analysis fails
    const responses = interviewState.qa.map(qa => qa.answer || '').join(' ').toLowerCase();

    // Basic fallback checks
    const hasContact = responses.includes('@') || responses.includes('phone');
    const hasExperience = responses.includes('work') || responses.includes('job') || responses.includes('experience');
    const hasSkills = responses.includes('skill') || responses.includes('python') || responses.includes('javascript');

    const needsBasicInfo = !hasContact || !hasExperience || !hasSkills;

    res.json({
      success: true,
      missingInfo: {
        hasIssues: needsBasicInfo,
        needsUserInput: needsBasicInfo,
        question: needsBasicInfo ? "To create a comprehensive resume, please provide your contact information (email, phone), work experience, and key skills in a structured format." : null,
        fields: needsBasicInfo ? ['contact', 'experience', 'skills'] : [],
        canProceed: !needsBasicInfo,
        reasoning: "Fallback analysis used due to AI processing error"
      }
    });
  }
});


app.post("/api/generatePDF", async (req, res) => {
  try {
    const { resumeData, theme, format } = req.body;

    if (!resumeData) {
      return res.status(400).json({
        success: false,
        error: "Resume data is required"
      });
    }

    console.log("Generating PDF with React-PDF...");

    // Generate PDF buffer using React-PDF
    const pdfBuffer = await generatePDFBuffer(resumeData, theme);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(resumeData.personalInfo?.name || 'Resume').replace(/"/g, '')}.pdf"`);

    // Only set Content-Length when we have a numeric size
    const contentLength = pdfBuffer && (pdfBuffer.length || pdfBuffer.byteLength);
    if (typeof contentLength === 'number') {
      res.setHeader('Content-Length', String(contentLength));
    } else {
      console.warn('PDF buffer has no known length — sending without Content-Length');
    }

    // Send the buffer directly
    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({
      success: false,
      error: `PDF generation failed: ${error.message}`
    });
  }
});


app.post("/api/modifyResume", async (req, res) => {
  try {
    if (!resumeLayout) {
      return res.status(400).json({
        success: false,
        error: "No resume exists to modify. Please generate a resume first."
      });
    }

    const { request, section, parentHistoryId, userId } = req.body;

    if (!request || !request.trim()) {
      return res.status(400).json({
        success: false,
        error: "Modification request is required"
      });
    }

    const modificationPrompt = `
You are an AI resume editor. Modify the existing resume based on the user's request.

Current Resume Data:
${JSON.stringify(resumeLayout.data, null, 2)}

User Request: "${request}"
${section ? `Focused Section: "${section}"` : ''}

Rules:
1. Return ONLY the complete updated JSON resume structure
2. Make targeted changes based on the request
3. Preserve all existing information unless specifically requested to change/remove
4. Maintain professional language and ATS optimization
5. Keep the same JSON structure as the original
6. If adding new information, ensure it's relevant and professional
7. ⚠️ SYMBOL SECURITY: Use only plain ASCII characters. NEVER use symbols like '•', '–', or 'â¢'. Use simple '-' for lists.

Return the complete updated resume JSON:`;

    const modified = await callDeepSeek(modificationPrompt, {
      temperature: 0.4,
      max_tokens: 1500
    });

    // Use centralized generator with preserved theme
    const currentTheme = req.body.theme || resumeLayout?.theme || { primary: "#2563eb" };
    const layout = await generateResumeLayout(modified, currentTheme);

    // Update global state
    resumeLayout = layout;

    // Save update to history if parentHistoryId and userId are provided
    if (parentHistoryId && userId) {
      try {
        const fileContentBase64 = Buffer.from(layout.htmlContent).toString('base64');

        // Create update entry as child of parent resume
        const updateEntry = new History(
          userId,
          `Resume Update - ${new Date().toLocaleString()}`,
          'resume-html',
          modified,
          fileContentBase64,
          request,
          parentHistoryId // Set parent history ID
        );

        const savedUpdate = await updateEntry.save();

        // Also add to parent's updates array for quick access
        const updateRecord = {
          updateId: savedUpdate.insertedId,
          request: request,
          section: section || 'general',
          timestamp: new Date(),
          modifiedData: modified
        };

        await History.addUpdate(parentHistoryId, updateRecord);

        console.log('Resume update saved to history:', savedUpdate.insertedId);
      } catch (historyErr) {
        console.error('Error saving update to history:', historyErr);
        // Continue even if history save fails
      }
    }

    res.json({ success: true, layout: layout });

  } catch (err) {
    console.error("Resume modification error:", err);
    res.status(500).json({
      success: false,
      error: `Modification failed: ${err.message}`
    });
  }
});



app.post("/api/modifySelectedText", async (req, res) => {
  try {
    const { resumeData, selectedText, modification, theme, parentHistoryId, userId } = req.body;

    if (!resumeData || !selectedText || !modification) {
      return res.status(400).json({
        success: false,
        error: "Resume data, selected text, and modification instruction are required"
      });
    }

    const currentTheme = theme || resumeLayout?.theme || { primary: "#2563eb" };

    const prompt = `
You are an AI resume editor. Modify a specific part of the resume.

Current Resume Data:
\${JSON.stringify(resumeData, null, 2)}

Text to Modify: "\${selectedText}"
User Instruction: "\${modification}"

Rules:
1. Return ONLY the complete updated JSON resume
2. Make targeted changes to the requested text
3. Ensure the context of the change fits the surrounding content
4. ⚠️ SYMBOL SECURITY: Use only plain ASCII characters. NEVER use symbols like '•', '–', or 'â¢'. Use simple '-' for lists.
5. Keep the JSON structure identical.

Return updated JSON:`;

    let modified = await callDeepSeek(prompt, { temperature: 0.3, max_tokens: 1500 });
    
    // Safety check for parsing
    if (typeof modified === 'string') {
        try {
            const match = modified.match(/\{[\s\S]*\}/);
            modified = JSON.parse(match ? match[0] : modified);
        } catch (e) {
            console.error('Failed to parse AI response for modification', e);
        }
    }

    // Generate layout and PDF
    const layout = await generateResumeLayout(modified, currentTheme);

    // Update global state
    resumeLayout = layout;

    res.json({
      success: true,
      layout: layout
    });

  } catch (err) {
    console.error("Modify selected text error:", err);
    res.status(500).json({
      success: false,
      error: `Modification failed: \${err.message}`
    });
  }
});


app.post("/api/resetInterview", (req, res) => {
  interviewState = {
    qa: [],
    finished: false,
    maxQuestions: 5,
    level: "basic"
  };

  resumeAnalysis = null;
  resumeLayout = null;

  res.json({
    success: true,
    message: "Interview state reset successfully"
  });
});



// Get current resume data endpoint
app.get("/api/getCurrentResume", (req, res) => {
  if (!resumeLayout) {
    return res.status(404).json({
      success: false,
      error: "No resume data available"
    });
  }

  res.json({
    success: true,
    layout: resumeLayout
  });
});


app.get("/api/getInterviewProgress", (req, res) => {
  res.json({
    success: true,
    progress: {
      current: interviewState.qa.length,
      max: interviewState.maxQuestions,
      finished: interviewState.finished,
      level: interviewState.level
    },
    qa: interviewState.qa.map(item => ({
      question: item.question,
      category: item.category,
      hasAnswer: !!item.answer
    }))
  });
});

app.post("/api/analyzeProfile", async (req, res) => {
  try {
    let { method, industry } = req.body;

    industry = industry || "ai";
    method = method || "star";

    const selectedMethod = RESUME_METHODS[method] || RESUME_METHODS.star;
    const selectedIndustry = INDUSTRY_STANDARDS[industry] || INDUSTRY_STANDARDS.ai;

    // Enhanced analysis prompt with statistical insights
    const analysisPrompt = `
You are a professional career analyst. Analyze the interview responses and provide detailed insights with statistical comparisons.

Interview Data:
${JSON.stringify(interviewState.qa, null, 2)}

Method: ${method}
Industry: ${industry}

Create a comprehensive analysis with the following structure:

{
  "profileSummary": "2-3 sentence professional summary of the candidate",
  "strengths": ["strength1", "strength2", "strength3"],
  "skillsAnalysis": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "leadership": ["skill1", "skill2"]
  },
  "experienceLevel": {
    "category": "entry|mid|senior|expert",
    "yearsEstimate": "1-2|3-5|6-10|10+",
    "confidence": 85
  },
  "industryFit": {
    "score": 85,
    "reasoning": "Why this score based on responses"
  },
  "benchmarkComparisons": [
    {
      "metric": "Technical Skills Breadth",
      "userScore": 85,
      "averageScore": 60,
      "percentile": 75,
      "description": "You demonstrate stronger technical skills than 75% of professionals"
    },
    {
      "metric": "Communication Skills",
      "userScore": 90,
      "averageScore": 70,
      "percentile": 80,
      "description": "Your communication abilities exceed 80% of candidates"
    },
    {
      "metric": "Problem Solving",
      "userScore": 80,
      "averageScore": 65,
      "percentile": 70,
      "description": "You rank in the top 30% for analytical thinking"
    }
  ],
  "improvementAreas": [
    "Area for development based on responses",
    "Another potential improvement area"
  ],
  "resumeRecommendations": {
    "suggestedTemplate": "ats_friendly|modern|creative",
    "keyHighlights": ["What to emphasize in resume"],
    "sectionsToFocus": ["skills", "experience", "projects"]
  },
  "marketInsights": {
    "demandLevel": "high|medium|low",
    "salaryRange": "$X - $Y based on level and location",
    "trendingSkills": ["skill1", "skill2"]
  }
}

Provide realistic but encouraging benchmarks. Base percentiles on actual industry standards where possible.
`;

    const analysis = await callDeepSeek(analysisPrompt, { temperature: 0.4 });

    // Store the detailed analysis
    resumeAnalysis = analysis;

    res.json({
      success: true,
      analysis: analysis,
      method: selectedMethod,
      industry: selectedIndustry
    });

  } catch (error) {
    console.error("Profile analysis error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoint to get HTML resume for PDF conversion
app.post("/api/getResumeHTML", (req, res) => {
  if (!resumeLayout) {
    return res.status(400).json({
      success: false,
      error: "No resume available"
    });
  }

  res.json({
    success: true,
    html: resumeLayout.htmlContent,
    data: resumeLayout.data
  });
});

const { sendError } = require('./util/apiResponse');

// Error handling
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  const message = process.env.NODE_ENV === 'development' ? error.message : 'Internal server error';
  sendError(res, message, { status: error.status || 500, code: error.code || 'internal_error', details: process.env.NODE_ENV === 'development' ? error.stack : undefined });
});

// ─── CAREER ENHANCEMENT ENDPOINTS ────────────────────────────────────────────

// POST /api/generatePortfolio — Generate a standalone HTML portfolio page
app.post('/api/generatePortfolio', authMiddleware, async (req, res) => {
  try {
    const { resumeData, theme = 'glassmorphism' } = req.body;
    if (!resumeData) return res.status(400).json({ success: false, error: 'resumeData is required' });

    const p = resumeData.personalInfo || {};
    const skills = resumeData.skills || {};
    const experience = resumeData.experience || [];
    const education = resumeData.education || [];
    const projects = resumeData.projects || [];

    const expHtml = experience.map(e => `
      <div class="exp-card">
        <div class="exp-header">
          <div>
            <h4>${e.role || ''}</h4>
            <span class="company">${e.company || ''}</span>
          </div>
          <span class="period">${e.startDate || ''}${e.endDate ? ' – ' + e.endDate : ''}</span>
        </div>
        <ul>${(e.achievements || []).slice(0, 3).map(a => `<li>${a}</li>`).join('')}</ul>
      </div>`).join('');

    const skillTags = (arr, color) => (arr || []).map(s => `<span class="tag" style="--tc:${color}">${s}</span>`).join('');

    const projHtml = projects.map(pr => `
      <div class="proj-card">
        <h4>${pr.name || ''}</h4>
        <p>${pr.description || ''}</p>
      </div>`).join('');

    const glass = theme === 'glassmorphism';
    const css = glass ? `
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',system-ui,sans-serif;background:#06060f;color:#f0f0f8;min-height:100vh}
      .hero{background:linear-gradient(135deg,#1a0533,#0d1b4b);padding:5rem 2rem 4rem;text-align:center;position:relative;overflow:hidden}
      .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0,rgba(139,92,246,.3),transparent 70%)}
      .hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;background:linear-gradient(135deg,#a78bfa,#60a5fa,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      .hero .sub{font-size:1.1rem;color:#94a3b8;margin-top:.5rem}
      .hero .links{display:flex;gap:1rem;justify-content:center;margin-top:1.5rem;flex-wrap:wrap}
      .hero .links a{padding:.5rem 1.2rem;border-radius:99px;border:1px solid rgba(255,255,255,.15);color:#c4b5fd;text-decoration:none;font-size:.9rem;backdrop-filter:blur(8px);background:rgba(255,255,255,.05);transition:.2s}
      .hero .links a:hover{background:rgba(255,255,255,.12)}
      .section{max-width:1000px;margin:0 auto;padding:3rem 1.5rem}
      h2{font-size:1.5rem;margin-bottom:1.5rem;color:#e2e8f0;border-left:3px solid #8b5cf6;padding-left:.8rem}
      .glass{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:1.5rem;backdrop-filter:blur(12px)}
      .exp-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:1.2rem;margin-bottom:1rem}
      .exp-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;margin-bottom:.8rem}
      .exp-header h4{font-weight:700;color:#f0f0f8}
      .company{color:#a78bfa;font-size:.9rem}
      .period{font-size:.8rem;color:#64748b;font-weight:600}
      ul{padding-left:1.2rem;color:#94a3b8;font-size:.9rem;line-height:1.7}
      .tags{display:flex;flex-wrap:wrap;gap:.5rem}
      .tag{padding:.3rem .8rem;border-radius:999px;border:1px solid rgba(var(--tc),0.5);color:rgba(var(--tc),1);font-size:.8rem;font-weight:600}
      .proj-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:1.2rem}
      .proj-card h4{font-weight:700;margin-bottom:.4rem;color:#f0f0f8}
      .proj-card p{font-size:.9rem;color:#94a3b8}
      .edu-card{display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;padding:.8rem 0;border-bottom:1px solid rgba(255,255,255,.06)}
      footer{text-align:center;padding:2rem;color:#475569;font-size:.85rem}
    ` : `
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc;color:#0f172a;min-height:100vh}
      .hero{background:#fff;padding:5rem 2rem 4rem;text-align:center;border-bottom:1px solid #e2e8f0}
      .hero h1{font-size:clamp(2rem,5vw,3rem);font-weight:800;color:#0f172a}
      .hero .sub{font-size:1.1rem;color:#64748b;margin-top:.4rem}
      .hero .links{display:flex;gap:1rem;justify-content:center;margin-top:1.5rem;flex-wrap:wrap}
      .hero .links a{padding:.5rem 1.2rem;border-radius:8px;border:1px solid #e2e8f0;color:#334155;text-decoration:none;font-size:.9rem;background:#f8fafc;transition:.2s}
      .hero .links a:hover{background:#e2e8f0}
      .section{max-width:900px;margin:0 auto;padding:3rem 1.5rem}
      h2{font-size:1.3rem;font-weight:800;margin-bottom:1.5rem;color:#0f172a;text-transform:uppercase;letter-spacing:.08em}
      .glass{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem}
      .exp-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.2rem;margin-bottom:1rem}
      .exp-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;margin-bottom:.8rem}
      .exp-header h4{font-weight:700;color:#0f172a}
      .company{color:#6366f1;font-size:.9rem}
      .period{font-size:.8rem;color:#94a3b8;font-weight:600}
      ul{padding-left:1.2rem;color:#475569;font-size:.9rem;line-height:1.7}
      .tags{display:flex;flex-wrap:wrap;gap:.5rem}
      .tag{padding:.3rem .8rem;border-radius:999px;border:1px solid #e2e8f0;color:#334155;background:#f1f5f9;font-size:.8rem;font-weight:600}
      .proj-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.2rem}
      .proj-card h4{font-weight:700;margin-bottom:.4rem}
      .proj-card p{font-size:.9rem;color:#64748b}
      .edu-card{display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;padding:.8rem 0;border-bottom:1px solid #f1f5f9}
      footer{text-align:center;padding:2rem;color:#94a3b8;font-size:.85rem}
    `;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.name || 'Portfolio'} — Portfolio</title>
<style>${css}</style>
</head>
<body>
<div class="hero">
  <h1>${p.name || 'My Portfolio'}</h1>
  <p class="sub">${p.title || p.jobTitle || 'Professional'}</p>
  <div class="links">
    ${p.email ? `<a href="mailto:${p.email}">&#9993; ${p.email}</a>` : ''}
    ${p.phone ? `<a href="tel:${p.phone}">&#128222; ${p.phone}</a>` : ''}
    ${p.linkedin ? `<a href="${p.linkedin.startsWith('http') ? p.linkedin : 'https://'+p.linkedin}" target="_blank">LinkedIn</a>` : ''}
    ${p.github ? `<a href="${p.github.startsWith('http') ? p.github : 'https://'+p.github}" target="_blank">GitHub</a>` : ''}
    ${p.website ? `<a href="${p.website}" target="_blank">&#127760; Website</a>` : ''}
  </div>
</div>

${resumeData.summary ? `<div class="section"><h2>About Me</h2><div class="glass"><p style="line-height:1.8;font-size:.95rem;color:${glass?'#94a3b8':'#475569'}">${resumeData.summary}</p></div></div>` : ''}

${experience.length ? `<div class="section"><h2>Experience</h2>${expHtml}</div>` : ''}

${(skills.technical?.length || skills.tools?.length || skills.soft?.length) ? `
<div class="section"><h2>Skills</h2>
<div class="glass" style="display:flex;flex-direction:column;gap:1rem">
${skills.technical?.length ? `<div><p style="font-size:.8rem;font-weight:700;color:${glass?'#64748b':'#94a3b8'};text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">Technical</p><div class="tags">${skillTags(skills.technical,'139,92,246')}</div></div>` : ''}
${skills.tools?.length ? `<div><p style="font-size:.8rem;font-weight:700;color:${glass?'#64748b':'#94a3b8'};text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">Tools</p><div class="tags">${skillTags(skills.tools,'99,102,241')}</div></div>` : ''}
${skills.soft?.length ? `<div><p style="font-size:.8rem;font-weight:700;color:${glass?'#64748b':'#94a3b8'};text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">Soft Skills</p><div class="tags">${skillTags(skills.soft,'16,185,129')}</div></div>` : ''}
</div></div>` : ''}

${projects.length ? `<div class="section"><h2>Projects</h2><div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${projHtml}</div></div>` : ''}

${education.length ? `<div class="section"><h2>Education</h2><div class="glass">${education.map(e=>`<div class="edu-card"><div><strong>${e.degree||''}</strong><br><span style="font-size:.9rem;color:${glass?'#94a3b8':'#64748b'}">${e.institution||''}</span></div><span style="font-size:.8rem;color:${glass?'#64748b':'#94a3b8'}">${e.year||''}</span></div>`).join('')}</div></div>` : ''}

<footer>Made with &#10084; &#183; ${p.name || 'Portfolio'} &#183; ${new Date().getFullYear()}</footer>
</body>
</html>`;

    try {
      const historyItem = new History({
        user: req.user._id,
        title: `Portfolio — ${p.name || 'My Site'}`,
        type: 'portfolio-site',
        sourceData: { resumeData, theme },
        fileContent: Buffer.from(html).toString('base64'),
        lastPage: 'portfolio'
      });
      const saved = await historyItem.save();
      return res.json({ success: true, html, historyId: saved.insertedId || historyItem._id });
    } catch (historyErr) {
      console.error('generatePortfolio history save error:', historyErr);
    }

    res.json({ success: true, html });
  } catch (err) {
    console.error('generatePortfolio error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/atsAnalyze — Compare resume against a job description and return matched/missing keywords
app.post('/api/atsAnalyze', authMiddleware, async (req, res) => {
  try {
    const { resumeData, jobDescription } = req.body;
    if (!resumeData || !jobDescription) {
      return res.status(400).json({ success: false, error: 'resumeData and jobDescription are required' });
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) analyst.

Job Description:
${jobDescription}

Candidate Resume (JSON):
${JSON.stringify(resumeData, null, 2)}

TASK: Extract important keywords and skills from the Job Description, then compare them against the resume.

Return ONLY valid JSON with this structure:
{
  "score": 0-100,
  "matched": ["keyword1", "keyword2"],
  "missing": ["missingKeyword1", "missingKeyword2"]
}

Rules:
- "score" = percentage of JD keywords found in the resume (0-100).
- "matched" = keywords/skills from JD that appear in resume (technical skills, soft skills, tools, experience phrases).
- "missing" = important keywords from JD that are NOT present in any part of the resume.
- Focus on skills, technologies, qualifications, and domain-specific terms.
- Return 5-20 matched items and 5-15 missing items for best UX.
- Do NOT include common words like "team", "work", "role" — only specific professional keywords.`;

    const result = await callDeepSeek(prompt, { temperature: 0.2, max_tokens: 800 });

    // Save to history
    try {
      const historyItem = new History({
        user: req.user._id,
        title: `ATS Match: ${result.score}% — ${new Date().toLocaleDateString()}`,
        type: 'ats-heatmap',
        sourceData: { result, jobDescription, resumeData },
        prompt: jobDescription.substring(0, 200),
        lastPage: 'career/ats'
      });
      const saved = await historyItem.save();
      res.json({ success: true, score: result.score, matched: result.matched, missing: result.missing, historyId: saved.insertedId || historyItem._id });
    } catch (historyErr) {
      console.error('atsAnalyze history save error:', historyErr);
      res.json({ success: true, score: result.score, matched: result.matched, missing: result.missing });
    }
  } catch (err) {
    console.error('atsAnalyze error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/atsInsertSkill — Add a missing skill into the resume's technical skills
app.post('/api/atsInsertSkill', authMiddleware, async (req, res) => {
  try {
    const { resumeData, skill } = req.body;
    if (!resumeData || !skill) {
      return res.status(400).json({ success: false, error: 'resumeData and skill are required' });
    }
    const updated = {
      ...resumeData,
      skills: {
        ...resumeData.skills,
        technical: [...(resumeData.skills?.technical || []), skill],
      }
    };
    res.json({ success: true, resumeData: updated });
  } catch (err) {
    console.error('atsInsertSkill error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/voiceInterviewAnalyze — Score a spoken answer and generate the next dynamic question
app.post('/api/voiceInterviewAnalyze', authMiddleware, async (req, res) => {
  try {
    const { transcript, question, history = [] } = req.body;
    if (!transcript || !question) {
      return res.status(400).json({ success: false, error: 'transcript and question are required' });
    }

    // Build conversation context from history
    const historyContext = history.length > 0
      ? history.map((h, i) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.answer}\nScores: Tone=${h.scores?.tone}, Clarity=${h.scores?.clarity}, Relevance=${h.scores?.relevance}`).join('\n\n')
      : 'No previous answers.';

    // Compute score trend from history
    const recentScores = history.slice(-3).map(h => Math.round((h.scores?.tone + h.scores?.clarity + h.scores?.relevance) / 3));
    const avgRecent = recentScores.length > 0 ? Math.round(recentScores.reduce((a,b)=>a+b,0)/recentScores.length) : null;

    const prompt = `You are an expert AI interview coach conducting a live mock interview.

Current Question Asked: "${question}"
Candidate's Spoken Answer: "${transcript}"

Previous Interview History (for context):
${historyContext}

Average score of last ${recentScores.length} answers: ${avgRecent !== null ? avgRecent + '/100' : 'N/A'}
Total questions asked so far: ${history.length + 1}

TASK 1 – Score THIS answer on a 0-100 scale for:
- tone: How confident, professional, and engaging the delivery sounds
- clarity: How clear, structured, and easy to follow the answer is  
- relevance: How relevant and substantive the content is to the question

TASK 2 – Write brief (2-3 sentences) personalized feedback pointing out ONE strength and ONE area to improve.

TASK 3 – Decide what to do next:
- If this is the first 2 questions: always continue.
- If answered 3+ questions AND avg score of recent answers >= 80: the candidate is performing well, consider wrapping up (endInterview: true).
- If answered 3+ questions AND avg score of recent answers < 40: the candidate is struggling significantly, consider ending with kind encouragement (endInterview: true).
- If answered 8+ questions total: always end (endInterview: true).
- Otherwise: generate a smart follow-up question that digs deeper based on THIS answer, OR pivots to a new important topic not yet covered. Question should feel natural and conversational, like a real interviewer would ask.

Important follow-up question rules:
- If the answer was vague or short, ask for a specific example or elaboration.
- If the answer was strong, pivot to a challenging scenario question.
- If tone/confidence scored low, ask a confidence-building behavioral question.
- Mix question types: behavioral (STAR), situational, motivational, skills-based.

Return ONLY valid JSON:
{
  "scores": { "tone": 0-100, "clarity": 0-100, "relevance": 0-100 },
  "feedback": "2-3 sentence personalized feedback...",
  "endInterview": true or false,
  "endReason": "optional short reason if ending (e.g. 'Great performance!' or 'Let us wrap up here.')",
  "nextQuestion": "The next question to ask (omit if endInterview is true)"
}`;

    const result = await callDeepSeek(prompt, { temperature: 0.5, max_tokens: 600 });

    // Save history if the interview is ending
    if (result.endInterview) {
        try {
            const finalHistory = [...history, {
                question,
                answer: transcript,
                scores: result.scores,
                feedback: result.feedback
            }];

            const historyItem = new History({
                user: req.user._id,
                title: `Voice Interview — ${new Date().toLocaleDateString()}`,
                type: 'voice-interview',
                sourceData: { 
                    history: finalHistory,
                    finalScores: result.scores,
                    endReason: result.endReason
                },
                prompt: `Voice Session: ${finalHistory.length} questions`,
                lastPage: 'voice-interview'
            });
            const saved = await historyItem.save();
            return res.json({ success: true, ...result, historyId: saved.insertedId || historyItem._id });
        } catch (historyErr) {
            console.error('voiceInterview history save error:', historyErr);
        }
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('voiceInterviewAnalyze error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// POST /api/applyTailoredResume — Merge tailored changes into original resume and regenerate
app.post('/api/applyTailoredResume', authMiddleware, async (req, res) => {
  try {
    const { resumeData, tailoredResult, jobDescription, theme } = req.body;
    if (!resumeData || !tailoredResult) {
      return res.status(400).json({ success: false, error: 'resumeData and tailoredResult are required' });
    }

    // Deep merge: apply tailored fields into the original resume
    const mergedResume = {
      ...resumeData,
      summary: tailoredResult.summary || resumeData.summary,
      skills: {
        technical: tailoredResult.skills?.technical || resumeData.skills?.technical || [],
        soft: tailoredResult.skills?.soft || resumeData.skills?.soft || [],
        tools: tailoredResult.skills?.tools || resumeData.skills?.tools || [],
      },
      experience: (resumeData.experience || []).map((exp, i) => {
        const tailoredExp = tailoredResult.experience?.[i];
        if (!tailoredExp) return exp;
        return { ...exp, achievements: tailoredExp.achievements || exp.achievements };
      }),
    };

    // Re-generate resume HTML layout
    const currentTheme = theme || { primary: '#2563eb' };
    const layout = await generateResumeLayout(mergedResume, currentTheme);

    // Save to history as updated resume
    const historyItem = new History({
      user: req.user._id,
      title: `Applied JD Tailoring — ${new Date().toLocaleDateString()}`,
      type: 'resume-html',
      sourceData: mergedResume,
      fileContent: Buffer.from(layout.htmlContent).toString('base64'),
      prompt: jobDescription ? jobDescription.substring(0, 200) : 'JD Tailored',
      lastPage: 'resume',
    });
    const saved = await historyItem.save();

    res.json({ success: true, resumeData: mergedResume, layout, historyId: saved.insertedId || historyItem._id });
  } catch (err) {
    console.error('applyTailoredResume error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tailorResume — Tailor resume to a specific job description
app.post('/api/tailorResume', authMiddleware, async (req, res) => {
  try {
    const { resumeData, jobDescription } = req.body;
    if (!resumeData || !jobDescription) {
      return res.status(400).json({ success: false, error: 'resumeData and jobDescription are required' });
    }

    const prompt = `You are an expert ATS resume optimizer. Your task is to tailor the given resume to closely match the requirements of the job description provided.

Job Description:
${jobDescription}

Current Resume Data:
${JSON.stringify(resumeData, null, 2)}

INSTRUCTIONS:
1. Rewrite the "summary" to directly mirror language from the job description.
2. Reorder and add relevant keywords to "skills.technical", "skills.soft", and "skills.tools" to match JD requirements.
3. Rewrite "experience[].achievements" to emphasize accomplishments relevant to the JD.
4. Keep the same JSON structure. Only modify summary, skills, and experience achievements.
5. Do NOT invent false information. Enhance and rephrase what is already there.
6. Return ONLY valid JSON — no explanation, no markdown.`;

    const tailored = await callDeepSeek(prompt, { temperature: 0.4, max_tokens: 2000 });

    // Save to history
    const historyItem = new History({
      user: req.user._id,
      title: `JD-Tailored Resume — ${new Date().toLocaleDateString()}`,
      type: 'jd-tailored',
      sourceData: { original: resumeData, tailored, jobDescription },
      prompt: jobDescription.substring(0, 200),
      lastPage: 'career/jd-tailor/result'
    });
    const saved = await historyItem.save();

    res.json({ success: true, tailored, historyId: saved._id });
  } catch (err) {
    console.error('tailorResume error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/generateCoverLetter — Generate a professional cover letter
app.post('/api/generateCoverLetter', authMiddleware, async (req, res) => {
  try {
    const { resumeData, companyName, jobTitle, jobDescription } = req.body;
    if (!resumeData || !companyName || !jobTitle) {
      return res.status(400).json({ success: false, error: 'resumeData, companyName and jobTitle are required' });
    }

    const prompt = `You are a professional career coach and expert cover letter writer.

Write a compelling, personalized cover letter for the following candidate applying to the specified role.

Candidate Resume:
${JSON.stringify(resumeData, null, 2)}

Company: ${companyName}
Job Title: ${jobTitle}
${jobDescription ? `Job Description:\n${jobDescription}` : ''}

INSTRUCTIONS:
1. Write a 3-4 paragraph professional cover letter.
2. Opening: Express genuine interest, mention the company name and job title.
3. Body (1-2 paragraphs): Highlight 2-3 most relevant achievements from the resume that match the role.
4. Closing: Enthusiastic call to action, professional sign-off.
5. Match the tone to the company (if tech company, be direct and achievement-focused).
6. Use the candidate's actual name from the resume.
7. Return ONLY the cover letter text, properly formatted with paragraph breaks. No JSON, no headers.`;

    const coverLetter = await callDeepSeek(prompt, { temperature: 0.6, max_tokens: 1000, raw: true });


    // Save to history
    const historyItem = new History({
      user: req.user._id,
      title: `Cover Letter — ${jobTitle} at ${companyName}`,
      type: 'cover-letter',
      sourceData: { resumeData, companyName, jobTitle, jobDescription, coverLetter },
      prompt: `${jobTitle} at ${companyName}`,
      lastPage: 'career/cover-letter/result'
    });
    const saved = await historyItem.save();

    res.json({ success: true, coverLetter, historyId: saved._id });
  } catch (err) {
    console.error('generateCoverLetter error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/generateLinkedIn — Generate LinkedIn About section and experience rewrites
app.post('/api/generateLinkedIn', authMiddleware, async (req, res) => {
  try {
    const { resumeData } = req.body;
    if (!resumeData) {
      return res.status(400).json({ success: false, error: 'resumeData is required' });
    }

    const prompt = `You are a LinkedIn profile optimization expert.

Based on the following resume data, generate LinkedIn-optimized content.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Return a JSON object with this exact structure:
{
  "about": "A compelling 3-5 sentence LinkedIn About section. First-person tone. Should highlight expertise, unique value, and a call to connect.",
  "headline": "A professional LinkedIn headline (max 220 chars) with | separators e.g. 'Software Engineer | React & Node.js | Building Scalable Products'",
  "experienceRewrites": [
    {
      "company": "company name from resume",
      "role": "role from resume",
      "optimizedBullets": ["LinkedIn-formatted achievement 1", "achievement 2"]
    }
  ]
}

INSTRUCTIONS:
- Use first-person voice for About section only.
- Make achievements in experienceRewrites start with strong action verbs.
- Quantify achievements where data is available.
- Keep LinkedIn's professional-but-engaging tone.
- Return ONLY valid JSON.`;

    const linkedInData = await callDeepSeek(prompt, { temperature: 0.5, max_tokens: 1500 });

    // Save to history
    const historyItem = new History({
      user: req.user._id,
      title: `LinkedIn Profile — ${resumeData.personalInfo?.name || 'My Profile'}`,
      type: 'linkedin-profile',
      sourceData: { resumeData, linkedInData },
      prompt: 'LinkedIn profile optimization',
      lastPage: 'career/linkedin/result'
    });
    const saved = await historyItem.save();

    res.json({ success: true, linkedInData, historyId: saved._id });
  } catch (err) {
    console.error('generateLinkedIn error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/checkLetterMissingInfo — Check if user provided enough context
app.post('/api/checkLetterMissingInfo', authMiddleware, async (req, res) => {
  try {
    const { letterType, tone, subject, context, yourName, recipientName } = req.body;

    const prompt = `You are an AI assistant helping a user write a professional letter.
The user wants to write a "${letterType}" letter in a "${tone}" tone.
Subject: ${subject || 'None provided'}
Sender Name: ${yourName || 'None provided'}
Recipient Name: ${recipientName || 'None provided'}
User's Context/Notes: ${context || 'None provided'}

Task: Analyze the provided information. If there is CRITICAL information missing that is absolutely necessary to write a coherent and complete letter of this type, list them. If nothing critical is missing, or the user's context is sufficient, return an empty array.

Respond ONLY with a valid JSON array of strings representing the missing fields. Do not include markdown formatting like \`\`\`json.
Example: ["Date of resignation", "Reason for leaving"]
Example: []`;

    const responseText = await callDeepSeek(prompt, { temperature: 0.1, max_tokens: 200, raw: true });
    
    let missingFields = [];
    try {
      const match = responseText.match(/\[.*\]/s);
      if (match) {
        missingFields = JSON.parse(match[0]);
      }
    } catch (err) {
      console.error("Failed to parse missing fields:", err);
    }

    res.json({ success: true, missingFields });
  } catch (error) {
    console.error("Error in checkLetterMissingInfo:", error);
    res.status(500).json({ success: false, error: "Failed to check info" });
  }
});

// POST /api/generateLetter — Generate any type of letter using AI
app.post('/api/generateLetter', authMiddleware, async (req, res) => {
  try {
    const { 
      letterType, tone, yourName, recipientName, recipientTitle, 
      subject, context, date, senderAddress, senderPhone, senderEmail, recipientAddress 
    } = req.body;
    
    if (!letterType || !yourName || !subject) {
      return res.status(400).json({ success: false, error: 'letterType, yourName, and subject are required.' });
    }

    const toneMap = {
      professional: 'formal, polished, and business-appropriate',
      friendly: 'warm, conversational, and personable',
      assertive: 'confident, direct, and persuasive'
    };
    const toneDesc = toneMap[tone] || toneMap.professional;

    const typeDescMap = {
      formal: 'a formal letter suitable for official communication',
      informal: 'an informal, casual letter between acquaintances',
      resignation: 'a professional resignation letter giving notice of leaving a position',
      recommendation: 'a strong letter of recommendation highlighting qualifications and character',
      complaint: 'a polite but firm complaint letter requesting resolution',
      'thank-you': 'a heartfelt thank-you letter expressing gratitude',
      apology: 'a sincere apology letter acknowledging a mistake and offering remedy',
      business: 'a business proposal or correspondence letter'
    };
    const typeDesc = typeDescMap[letterType] || typeDescMap.formal;

    const prompt = `You are a professional letter writer. Write ${typeDesc} with a ${toneDesc} tone.

Letter Details:
- From: ${yourName}
${senderAddress ? `- Sender Address: ${senderAddress}\n` : ''}${senderPhone ? `- Sender Phone: ${senderPhone}\n` : ''}${senderEmail ? `- Sender Email: ${senderEmail}\n` : ''}
- Date: ${date || new Date().toLocaleDateString()}
- To: ${recipientName || 'The Recipient'}${recipientTitle ? ` (${recipientTitle})` : ''}
${recipientAddress ? `- Recipient Address: ${recipientAddress}\n` : ''}
- Subject: ${subject}
- Context / Key Points: ${context || 'No additional context provided.'}

Instructions:
1. Write a complete, ready-to-send letter with proper blocks (sender info block, date, recipient info block, salutation, body paragraphs, and sign-off).
2. CRITICAL FORMATTING COMMAND: You MUST use EXACTLY two newlines (hit enter twice) between every structural block and between every paragraph. Do not use single spacing for new paragraphs.
3. Include the Date at the top under the sender block.
4. Use plain text only — no markdown, no asterisks, no bullet symbols.
5. Do NOT include any commentary outside the letter itself.

Write the full letter now:`;

    const letterText = await callDeepSeek(prompt, { temperature: 0.6, max_tokens: 1200, raw: true });

    // Extract string if AI returns object
    const finalLetter = typeof letterText === 'string' ? letterText : JSON.stringify(letterText);

    // Save to history
    const historyItem = new History({
      user: req.user._id,
      title: `${letterType.charAt(0).toUpperCase() + letterType.slice(1)} Letter — ${subject}`,
      type: 'letter',
      sourceData: {
        letterType, tone, yourName, recipientName, recipientTitle, 
        subject, context, date, senderAddress, senderPhone, senderEmail, recipientAddress, 
        letterText: finalLetter 
      },
      prompt: subject,
      lastPage: 'letter' // Placeholder
    });
    
    // Save to get the ID
    const savedResult = await historyItem.save();
    const historyId = savedResult.insertedId || historyItem._id;
    
    // Update the lastPage with the real ID for future resumes
    await History.findOneAndUpdate({ _id: historyId }, { $set: { lastPage: `letter/${historyId}` } });

    res.json({ success: true, letterText: finalLetter, historyId: historyId });
  } catch (err) {
    console.error('generateLetter error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/modifyLetter — AI-refine/modify an existing letter
app.post('/api/modifyLetter', authMiddleware, async (req, res) => {
  try {
    const { letterText, instruction } = req.body;
    if (!letterText || !instruction) {
      return res.status(400).json({ success: false, error: 'letterText and instruction are required.' });
    }

    const prompt = `You are a professional letter editor. Modify the following letter based on the user's instruction.

Current Letter:
${letterText}

Modification Instruction: "${instruction}"

Rules:
1. Apply only the requested changes.
2. Preserve the structure (salutation, body, closing) unless instructed otherwise.
3. Keep the same overall tone unless specifically asked to change it.
4. Return ONLY the updated letter — no commentary, no markdown.

Updated letter:`;

    const modified = await callDeepSeek(prompt, { temperature: 0.4, max_tokens: 1200, raw: true });
    const finalModified = typeof modified === 'string' ? modified : JSON.stringify(modified);

    res.json({ success: true, letterText: finalModified });
  } catch (err) {
    console.error('modifyLetter error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// POST /api/voiceInterviewAnalyze — Score a spoken interview answer and generate next question
app.post('/api/voiceInterviewAnalyze', authMiddleware, async (req, res) => {
  try {
    const { transcript, question, history = [], resumeContext } = req.body;
    if (!transcript || !question) {
      return res.status(400).json({ success: false, error: 'transcript and question are required.' });
    }

    // Build resume context block if provided
    const resumeBlock = resumeContext ? `
CANDIDATE RESUME CONTEXT:
- Name: ${resumeContext.name || 'Candidate'}
- Summary: ${resumeContext.summary || 'Not provided'}
- Skills: ${Array.isArray(resumeContext.skills) ? (resumeContext.skills.slice ? resumeContext.skills.slice(0, 10) : []).join(', ') : JSON.stringify(resumeContext.skills).slice(0, 200)}
- Recent Experience: ${(resumeContext.experience || []).map(e => `${e.role} at ${e.company} (${e.duration})`).join(' | ')}

Use this context to ask contextually relevant follow-up questions based on their actual background.
` : '';

    // Build conversation history summary
    const historyBlock = history.length > 0 ? `
PREVIOUS Q&A HISTORY (${history.length} questions):
${history.slice(-3).map((h, i) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.answer}\nScores: Tone=${h.scores?.tone||'?'}, Clarity=${h.scores?.clarity||'?'}, Relevance=${h.scores?.relevance||'?'}`).join('\n\n')}
` : '';

    const sessionAvg = history.length > 0
      ? Math.round(history.reduce((sum, h) => sum + ((h.scores?.tone||0) + (h.scores?.clarity||0) + (h.scores?.relevance||0))/3, 0) / history.length)
      : null;

    // Decide if we should end the interview
    const shouldConsiderEnding = history.length >= 5;
    const lastThreeAvg = history.length >= 3
      ? Math.round(history.slice(-3).reduce((sum, h) => sum + ((h.scores?.tone||0)+(h.scores?.clarity||0)+(h.scores?.relevance||0))/3, 0) / 3)
      : null;

    const prompt = `You are an expert interview coach conducting a live mock interview. Analyze the candidate's answer and generate the next interview question.
${resumeBlock}
${historyBlock}
CURRENT QUESTION: "${question}"
CANDIDATE'S ANSWER: "${transcript}"

TASK: Return a JSON object with:
{
  "scores": {
    "tone": <0-100, confidence and professional delivery>,
    "clarity": <0-100, articulation and structure>,
    "relevance": <0-100, how well it addresses the question>
  },
  "feedback": "<2-3 sentence coaching feedback — be specific about what was good and what could improve>",
  "nextQuestion": "<a targeted follow-up question based on this answer and the candidate's background>",
  "endInterview": <true if session should end, false otherwise>,
  "endReason": "<brief reason if ending, e.g. 'Great performance across all areas!' or 'You've answered all core competency areas.'>"
}

Scoring rules:
- Score generously but honestly. 70+ is good, 85+ is excellent.
- Tone measures confidence, pacing, and professionalism in delivery.
- Clarity measures whether the answer was structured, specific, and easy to follow.
- Relevance measures whether the answer actually addressed what was asked.

End interview (endInterview: true) if ANY of these are true:
- ${shouldConsiderEnding && lastThreeAvg !== null && lastThreeAvg >= 80 ? '✓ APPLICABLE:' : '○'} Last 3 answers averaged ${lastThreeAvg || 'N/A'}/100 — end if >= 80 (great performance)
- ${history.length >= 8 ? '✓ APPLICABLE:' : '○'} Total questions answered: ${history.length} — end if >= 8
- ${history.length >= 5 && lastThreeAvg !== null && lastThreeAvg < 40 ? '✓ APPLICABLE:' : '○'} Last 3 averaged ${lastThreeAvg || 'N/A'}/100 — end if < 40 after 5+ Qs (struggling)

Return ONLY valid JSON, no markdown.`;

    const aiResult = await callDeepSeek(prompt, { temperature: 0.5, max_tokens: 600 });

    res.json({
      success: true,
      scores: aiResult.scores || { tone: 70, clarity: 70, relevance: 70 },
      feedback: aiResult.feedback || 'Good attempt. Keep practicing.',
      nextQuestion: aiResult.nextQuestion || 'Tell me about a challenge you faced and how you overcame it.',
      endInterview: !!aiResult.endInterview,
      endReason: aiResult.endReason || '',
    });
  } catch (err) {
    console.error('voiceInterviewAnalyze error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── END CAREER ENHANCEMENT ENDPOINTS ────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Resume Builder Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;