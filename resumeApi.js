import apiClient from "./apiClient";

export const startInterview = (level = "standard") => apiClient("/interview/start", {
    method: "POST",
    body: JSON.stringify({ level })
});

export const nextQuestion = (interviewId, answer, level) => apiClient("/interview/next", {
    method: "POST",
    body: JSON.stringify({ interviewId, answer, level })
});

export const chooseMethod = (interviewId, method, industry) => apiClient("/interview/save-method", {
    method: "POST",
    body: JSON.stringify({ interviewId, method }) // Backend currently only takes method, but typically would include industry too
});

export const analyzeProfile = async (interviewId, level) => {
    const data = await apiClient("/interview/analyze", {
        method: "POST",
        body: JSON.stringify({ interviewId, level })
    });

    // Backend responds with { success: true, analysis: { ... } }
    if (data && data.analysis) return data.analysis;
    return data;
};

export const analyzeMissingItems = (resumeData, htmlContent) => apiClient("/analyzeMissingItems", {
    method: "POST",
    body: JSON.stringify({ resumeData, htmlContent })
});

export const correctMissingItem = (resumeData, item, value) => apiClient("/correctMissingItem", {
    method: "POST",
    body: JSON.stringify({ resumeData, item, value })
});

export const generateResume = (resumeData) => apiClient("/generateResume", {
    method: "POST",
    body: JSON.stringify(resumeData)
});

export const modifyResume = (request, section, resumeData, theme, parentHistoryId, userId) => apiClient("/modifyResume", {
    method: "POST",
    body: JSON.stringify({ request, section, resumeData, theme, parentHistoryId, userId })
});

export const modifyResumeGeneral = (request, section, theme, parentHistoryId, userId) => apiClient("/modifyResumeGeneral", {
    method: "POST",
    body: JSON.stringify({ request, section, theme, parentHistoryId, userId })
});

export const modifySelectedText = (resumeData, selectedText, modification, theme, parentHistoryId, userId) => apiClient("/modifySelectedText", {
    method: "POST",
    body: JSON.stringify({ resumeData, selectedText, modification, theme, parentHistoryId, userId })
});

export const generatePDF = (resumeData, theme) => apiClient("/generatePDF", {
    method: "POST",
    body: JSON.stringify({ resumeData, theme }),
    responseType: "arraybuffer"
});

// History Adapter Functions (Mocking the requested API structure using existing endpoints)
export const getUserResumes = () => apiClient("/history");

export const loadResume = (id) => apiClient(`/history/${id}`);

export const getResumeWithUpdates = (id) => apiClient(`/history/${id}/with-updates`);

export const deleteResume = (id) => apiClient(`/history/${id}`, {
    method: "DELETE"
});

export const saveResumeSession = (data) => apiClient("/history", {
    method: "POST",
    body: JSON.stringify(data)
});

// Career Enhancement API functions
export const tailorResume = (resumeData, jobDescription) => apiClient("/tailorResume", {
    method: "POST",
    body: JSON.stringify({ resumeData, jobDescription })
});

export const generateCoverLetter = (resumeData, companyName, jobTitle, jobDescription) => apiClient("/generateCoverLetter", {
    method: "POST",
    body: JSON.stringify({ resumeData, companyName, jobTitle, jobDescription })
});

export const generateLinkedIn = (resumeData) => apiClient("/generateLinkedIn", {
    method: "POST",
    body: JSON.stringify({ resumeData })
});

export const checkLetterMissingInfo = (params) => apiClient("/checkLetterMissingInfo", {
    method: "POST",
    body: JSON.stringify(params)
});

export const generateLetter = (params) => apiClient("/generateLetter", {
    method: "POST",
    body: JSON.stringify(params)
});

export const applyTailoredResume = (resumeData, tailoredResult, jobDescription, theme) => apiClient("/applyTailoredResume", {
    method: "POST",
    body: JSON.stringify({ resumeData, tailoredResult, jobDescription, theme })
});

export const modifyLetter = (letterText, instruction) => apiClient("/modifyLetter", {
    method: "POST",
    body: JSON.stringify({ letterText, instruction })
});

