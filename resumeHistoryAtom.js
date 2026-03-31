import { atom } from "recoil";

export const resumeHistoryAtom = atom({
    key: "resumeHistoryAtom",
    default: {
        resumes: [],
        loading: false,
        currentResumeId: null,
        refreshTrigger: 0
    }
});
