// server.js - Improved with HTML/Tailwind resume generation
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { callDeepSeek } = require("./ai/deepseek");
const { 
  buildInterviewPrompt, 
  buildResumeLayoutPrompt, 
  buildResumeModificationPrompt,
  buildAnalysisPrompt 
} = require("./util/prompts");

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
app.use(helmet());
app.use(morgan('combined'));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global state
let resumeAnalysis = null;
let resumeLayout = null;
let interviewState = {
  qa: [],
  finished: false,
  maxQuestions: 5,
  level: "basic"
};

// Helper function to generate HTML resume
function generateHTMLResume(data, theme = { primary: '#2563eb' }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.personalInfo?.name || 'Resume'}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print { 
            body { -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
        }
        .primary-color { color: ${theme.primary}; }
        .primary-border { border-color: ${theme.primary}; }
        .primary-bg { background-color: ${theme.primary}; }
    </style>
</head>
<body class="bg-white text-gray-800 font-sans leading-relaxed">
    <div class="max-w-4xl mx-auto p-8">
        <!-- Header -->
        <header class="text-center mb-8 pb-6 border-b-2 primary-border">
            <h1 class="text-3xl font-bold primary-color mb-2">${data.personalInfo?.name || 'Your Name'}</h1>
            <div class="text-sm text-gray-600">
                ${data.personalInfo?.email || ''} • 
                ${data.personalInfo?.phone || ''} • 
                ${data.personalInfo?.location || ''}
            </div>
        </header>

        <!-- Summary -->
        ${data.summary ? `
        <section class="mb-8">
            <h2 class="text-lg font-semibold primary-color mb-3 uppercase tracking-wide">Professional Summary</h2>
            <p class="text-gray-700 leading-relaxed">${data.summary}</p>
        </section>
        ` : ''}

        <!-- Skills -->
        ${data.skills?.length ? `
        <section class="mb-8">
            <h2 class="text-lg font-semibold primary-color mb-3 uppercase tracking-wide">Skills</h2>
            <div class="grid grid-cols-2 gap-2">
                ${data.skills.map(skill => `<div class="text-gray-700">• ${skill}</div>`).join('')}
            </div>
        </section>
        ` : ''}

        <!-- Experience -->
        ${data.experience?.length ? `
        <section class="mb-8">
            <h2 class="text-lg font-semibold primary-color mb-3 uppercase tracking-wide">Experience</h2>
            ${data.experience.map(exp => `
                <div class="mb-6">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-semibold text-gray-800">${exp.role}</h3>
                        <span class="text-gray-600 text-sm">${exp.duration}</span>
                    </div>
                    <div class="text-gray-600 mb-2">${exp.company}</div>
                    ${exp.achievements ? `
                        <ul class="ml-4">
                            ${exp.achievements.map(achievement => `<li class="text-gray-700 mb-1">• ${achievement}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </section>
        ` : ''}

        <!-- Education -->
        ${data.education?.length ? `
        <section class="mb-8">
            <h2 class="text-lg font-semibold primary-color mb-3 uppercase tracking-wide">Education</h2>
            ${data.education.map(edu => `
                <div class="mb-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-semibold text-gray-800">${edu.degree}</div>
                            <div class="text-gray-600">${edu.institution}</div>
                        </div>
                        <span class="text-gray-600 text-sm">${edu.year}</span>
                    </div>
                </div>
            `).join('')}
        </section>
        ` : ''}

        <!-- Projects -->
        ${data.projects?.length ? `
        <section class="mb-8">
            <h2 class="text-lg font-semibold primary-color mb-3 uppercase tracking-wide">Projects</h2>
            ${data.projects.map(project => `
                <div class="mb-4">
                    <h3 class="font-semibold text-gray-800 mb-1">${project.title}</h3>
                    <p class="text-gray-700">${project.description}</p>
                </div>
            `).join('')}
        </section>
        ` : ''}

        <!-- Certifications -->
        ${data.certifications?.length ? `
        <section class="mb-8">
            <h2 class="text-lg font-semibold primary-color mb-3 uppercase tracking-wide">Certifications</h2>
            <div class="grid grid-cols-1 gap-2">
                ${data.certifications.map(cert => `<div class="text-gray-700">• ${cert}</div>`).join('')}
            </div>
        </section>
        ` : ''}
    </div>
</body>
</html>`;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
    const prompt = buildInterviewPrompt(
      interviewState.qa, 
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

    industry = industry || "ai";
    method = method || "star";

    const selectedMethod = RESUME_METHODS[method] || RESUME_METHODS.star;
    const selectedIndustry = INDUSTRY_STANDARDS[industry] || INDUSTRY_STANDARDS.ai;

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

app.post("/api/generateResume", async (req, res) => {
  try {
    const { preference, selectedHighlights } = req.body;
    
    if (!resumeAnalysis) {
      return res.status(400).json({ 
        success: false, 
        error: "No analysis available. Run profile analysis first." 
      });
    }

    // Enhanced resume generation prompt with strict JSON formatting
    const resumePrompt = `
You are a professional resume builder. Create a structured resume using the analysis data.

CRITICAL: You MUST return ONLY valid JSON. No explanations, no additional text, no comments.

Analysis Data:
${JSON.stringify(resumeAnalysis, null, 2)}

User Preferences:
- Template: ${preference || "ats_friendly"}
- Selected Highlights: ${JSON.stringify(selectedHighlights || [])}

Return this exact JSON structure (fill with actual data from analysis):

{
  "personalInfo": {
    "name": "Extract name from analysis or use 'John Doe'",
    "email": "Extract email or use 'john.doe@email.com'", 
    "phone": "Extract phone or use '+1 (555) 123-4567'",
    "location": "Extract location or use 'City, State'"
  },
  "summary": "Write 3-4 line professional summary based on analysis, ATS-optimized with industry keywords",
  "skills": {
    "technical": ["skill1", "skill2", "skill3"],
    "soft": ["skill1", "skill2"], 
    "tools": ["tool1", "tool2"]
  },
  "experience": [
    {
      "company": "Company name from interview responses",
      "role": "Job title from responses",
      "duration": "Start - End dates",
      "achievements": [
        "Achievement 1 using quantified results",
        "Achievement 2 with impact metrics"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree name from responses",
      "institution": "School name",
      "year": "Graduation year",
      "gpa": "If mentioned, otherwise omit this field"
    }
  ],
  "projects": [
    {
      "title": "Project name from responses",
      "description": "Brief description with technologies used",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "certifications": ["cert1", "cert2"],
  "achievements": ["achievement1", "achievement2"]
}

IMPORTANT: Return ONLY the JSON object above. No other text.`;

    console.log("Calling DeepSeek for resume generation...");
    const resumeData = await callDeepSeek(resumePrompt, { 
      temperature: 0.2, // Lower temperature for more consistent JSON
      max_tokens: 1200
    });

    console.log("DeepSeek response received, generating HTML...");

    // Generate HTML using the structured data
    resumeLayout = {
      template: preference || "ats_friendly",
      data: resumeData,
      analysis: resumeAnalysis, // Include analysis for reference
      htmlContent: generateHTMLResume(resumeData)
    };

    console.log("Resume generation completed successfully");
    res.json({ success: true, layout: resumeLayout });
    
  } catch (err) {
    console.error("Resume generation error:", err);
    
    // Provide more detailed error information
    let errorMessage = err.message;
    if (err.cause) {
      console.error("Raw AI response:", err.cause);
      errorMessage += ` (Raw response: ${err.cause.substring(0, 100)}...)`;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      type: "resume_generation_error"
    });
  }
});

app.post("/api/modifyResume", async (req, res) => {
  try {
    if (!resumeLayout) {
      return res.status(400).json({ 
        success: false, 
        error: "No resume exists to modify." 
      });
    }

    const { request } = req.body;
    const prompt = buildResumeModificationPrompt(resumeLayout.data, request);
    const modified = await callDeepSeek(prompt, { temperature: 0.3 });

    // Update both data and HTML
    resumeLayout.data = modified;
    resumeLayout.htmlContent = generateHTMLResume(modified);

    res.json({ success: true, layout: resumeLayout });
  } catch (err) {
    console.error("Resume modification error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
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

// Error handling
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

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