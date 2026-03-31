import { atom } from "recoil";

export const workflowAtom = atom({
    key: "workflowAtom",
    default: {
        resumeId: null,
        interviewId: null,
        interviewCompleted: false,
        methodSelected: false,
        missingInfoCompleted: false,
        analysisCompleted: false,
        resumeGenerated: false,
        currentStep: "login" // login, interview, method, missing-info, analysis, resume
    },
});
