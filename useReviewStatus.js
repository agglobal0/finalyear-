import { useState, useCallback } from "react";
import apiClient from "../api/apiClient";

/**
 * Call openReviewIfNew(type) instead of setReviewOpen(true).
 * It pre-checks the backend — only opens the dialog if no review exists yet.
 */
export default function useReviewStatus() {
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewType, setReviewType] = useState("resume");

    const openReviewIfNew = useCallback(async (type) => {
        try {
            const res = await apiClient(`/review/status/${type}`);
            if (res?.hasReview) return; // already reviewed — stay silent
        } catch {
            // network error: fail silently, don't block the user
            return;
        }
        setReviewType(type);
        setReviewOpen(true);
    }, []);

    return { reviewOpen, reviewType, setReviewOpen, openReviewIfNew };
}
