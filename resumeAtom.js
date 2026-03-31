import { atom } from "recoil";

export const resumeAtom = atom({
    key: "resumeAtom",
    default: {
        resumeData: null,
        htmlContent: null,
        analysisData: null,
        theme: { primary: "#4F46E5" }, // Default Indigo
        historyId: null, // Parent history entry ID for tracking updates
        parentHistoryId: null // Reference to parent for child updates
    }
});
