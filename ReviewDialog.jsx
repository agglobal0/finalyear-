import { useState, useEffect, useRef } from "react";
import { X, Star, Loader2, CheckCircle, XCircle, HelpCircle, Brain, Sparkles } from "lucide-react";
import apiClient from "../api/apiClient";

const TYPE_LABELS = {
    resume: "Resume",
    ppt: "Presentation",
    letter: "Letter",
    interview: "Interview",
};

const PLACEHOLDERS = {
    resume: "e.g. \"The summary was too generic. I'd prefer more focus on my leadership experience.\"",
    ppt: "e.g. \"The slides had too many bullet points. Keep them to 3 per slide max.\"",
    letter: "e.g. \"The tone felt too formal. Make it friendlier and more conversational.\"",
    interview: "e.g. \"Questions were too basic. I'd like more situational leadership questions.\"",
};

// ── Star Rating ─────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange(n)}
                    className="transition-transform hover:scale-110"
                >
                    <Star
                        size={22}
                        className={n <= (hovered || value) ? "fill-[var(--gold-400)] text-[var(--gold-400)]" : "text-[var(--border-base)]"}
                    />
                </button>
            ))}
        </div>
    );
}

// ── Main ReviewDialog ────────────────────────────────────────────────────────
export default function ReviewDialog({ open, onClose, type }) {
    const [phase, setPhase] = useState("idle"); // idle|thinking|rejected|unclear|success|already
    const [review, setReview] = useState("");
    const [rating, setRating] = useState(0);
    const [clarification, setClarification] = useState("");
    const [clarifyHint, setClarifyHint] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [savedReview, setSavedReview] = useState(null);
    const textareaRef = useRef(null);

    const label = TYPE_LABELS[type] || type;

    // ── On open: check if already reviewed ──────────────────────────────────
    useEffect(() => {
        if (!open || !type) return;
        setPhase("checking");
        apiClient(`/review/status/${type}`).then(res => {
            if (res?.hasReview) {
                setSavedReview(res.review);
                setPhase("already");
            } else {
                setPhase("idle");
                setTimeout(() => textareaRef.current?.focus(), 100);
            }
        }).catch(() => setPhase("idle"));
    }, [open, type]);

    const reset = () => {
        setPhase("idle");
        setReview("");
        setRating(0);
        setClarification("");
        setClarifyHint("");
        setRejectReason("");
    };

    // ── Submit review ────────────────────────────────────────────────────────
    const submit = async () => {
        if (!review.trim()) return;
        setPhase("thinking");
        try {
            const res = await apiClient("/review/submit", {
                method: "POST",
                body: JSON.stringify({ type, review: review.trim() }),
            });
            if (res.status === "rejected") {
                setRejectReason(res.reason || "This review could not be used.");
                setPhase("rejected");
            } else if (res.status === "unclear") {
                setClarifyHint(res.clarifyHint || "Please be more specific.");
                setPhase("unclear");
            } else {
                setPhase("success");
            }
        } catch (err) {
            setRejectReason(err.message || "Something went wrong.");
            setPhase("rejected");
        }
    };

    // ── Submit clarification ─────────────────────────────────────────────────
    const submitClarify = async () => {
        if (!clarification.trim()) return;
        setPhase("thinking");
        try {
            const res = await apiClient("/review/submit", {
                method: "POST",
                body: JSON.stringify({ type, review: `${review}. Clarification: ${clarification}` }),
            });
            if (res.status === "rejected") {
                setRejectReason(res.reason || "Still could not process this review.");
                setPhase("rejected");
            } else if (res.status === "unclear") {
                setClarifyHint(res.clarifyHint || "Still unclear. Try being more specific.");
                setClarification("");
                setPhase("unclear");
            } else {
                setPhase("success");
            }
        } catch {
            setPhase("rejected");
            setRejectReason("Something went wrong.");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg card p-8 relative animate-fade-in-up shadow-2xl">
                {/* Close */}
                <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    <X size={18} />
                </button>

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-500)]/15 flex items-center justify-center">
                        <Brain size={20} className="text-[var(--brand-400)]" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-[var(--text-primary)]">Train the AI</h2>
                        <p className="text-xs text-[var(--text-muted)]">Help improve future {label} generation</p>
                    </div>
                    <span className="badge badge-brand ml-auto text-[10px] flex items-center gap-1">
                        <Sparkles size={10} /> Auto-Learn
                    </span>
                </div>

                {/* ── CHECKING ────────────────────────────────────────────── */}
                {phase === "checking" && (
                    <div className="text-center py-8">
                        <Loader2 size={32} className="animate-spin text-[var(--brand-400)] mx-auto mb-3" />
                        <p className="text-sm text-[var(--text-muted)]">Checking review status…</p>
                    </div>
                )}

                {/* ── ALREADY REVIEWED ────────────────────────────────────── */}
                {phase === "already" && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--emerald-500)]/5 border border-[var(--emerald-500)]/20">
                            <CheckCircle size={20} className="text-[var(--emerald-400)] shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-sm text-[var(--text-primary)]">AI already trained for this {label}</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">Your previous feedback is actively improving future AI {label} generation.</p>
                            </div>
                        </div>
                        {savedReview && (
                            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                                <p className="section-label mb-1 text-[10px]">Your Review</p>
                                <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">"{savedReview}"</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={reset} className="btn btn-secondary flex-1 text-sm">Submit New Review</button>
                            <button onClick={onClose} className="btn btn-primary flex-1 text-sm">Done</button>
                        </div>
                    </div>
                )}

                {/* ── IDLE (input form) ────────────────────────────────────── */}
                {phase === "idle" && (
                    <div className="space-y-5">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                                How was the generated {label}? Your feedback is analyzed by AI and used to improve all future generations — not just yours.
                            </p>
                            <div className="mb-4">
                                <p className="section-label mb-2">Rating</p>
                                <StarRating value={rating} onChange={setRating} />
                            </div>
                            <p className="section-label mb-2">What could be better?</p>
                            <textarea
                                ref={textareaRef}
                                className="input w-full h-32 resize-none text-sm"
                                placeholder={PLACEHOLDERS[type] || "Share your feedback about the generated content…"}
                                value={review}
                                onChange={e => setReview(e.target.value)}
                            />
                            <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                                Off-topic, toxic, or vague reviews are automatically rejected. Be specific for best results.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="btn btn-secondary flex-1 text-sm">Skip</button>
                            <button
                                onClick={submit}
                                disabled={!review.trim()}
                                className="btn btn-primary flex-1 text-sm disabled:opacity-50 gap-2"
                            >
                                <Brain size={14} /> Submit & Train AI
                            </button>
                        </div>
                    </div>
                )}

                {/* ── THINKING ────────────────────────────────────────────── */}
                {phase === "thinking" && (
                    <div className="text-center py-12">
                        <div className="relative w-16 h-16 mx-auto mb-5">
                            <div className="absolute inset-0 rounded-full bg-[var(--brand-500)]/10 animate-ping" />
                            <div className="relative w-full h-full rounded-full bg-[var(--brand-500)]/15 flex items-center justify-center">
                                <Loader2 size={28} className="animate-spin text-[var(--brand-400)]" />
                            </div>
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)] mb-1">AI is analyzing your review…</h3>
                        <p className="text-sm text-[var(--text-muted)]">Validating quality and distilling training prompt</p>
                    </div>
                )}

                {/* ── REJECTED ────────────────────────────────────────────── */}
                {phase === "rejected" && (
                    <div className="space-y-5">
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                                <XCircle size={32} className="text-rose-400" />
                            </div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)] mb-2">Review Rejected</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-1">AI could not use this feedback:</p>
                            <p className="text-sm text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 inline-block">
                                {rejectReason}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={reset} className="btn btn-secondary flex-1 text-sm">Try Again</button>
                            <button onClick={onClose} className="btn btn-ghost flex-1 text-sm">Close</button>
                        </div>
                    </div>
                )}

                {/* ── UNCLEAR ─────────────────────────────────────────────── */}
                {phase === "unclear" && (
                    <div className="space-y-5">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--gold-500)]/5 border border-[var(--gold-500)]/25">
                            <HelpCircle size={20} className="text-[var(--gold-400)] shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-sm text-[var(--text-primary)] mb-1">AI needs clarification</p>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{clarifyHint}</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)] italic">
                            Your original review: "{review}"
                        </div>
                        <div>
                            <p className="section-label mb-2">Please clarify</p>
                            <textarea
                                autoFocus
                                className="input w-full h-24 resize-none text-sm"
                                placeholder="Add more specific detail about what you meant…"
                                value={clarification}
                                onChange={e => setClarification(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={reset} className="btn btn-secondary flex-1 text-sm">Start Over</button>
                            <button
                                onClick={submitClarify}
                                disabled={!clarification.trim()}
                                className="btn btn-primary flex-1 text-sm disabled:opacity-50 gap-2"
                            >
                                <Brain size={14} /> Re-analyze
                            </button>
                        </div>
                    </div>
                )}

                {/* ── SUCCESS ─────────────────────────────────────────────── */}
                {phase === "success" && (
                    <div className="space-y-5">
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-[var(--emerald-500)]/15 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-[var(--emerald-400)]" />
                            </div>
                            <h3 className="font-bold text-xl text-[var(--text-primary)] mb-2">AI Trained! 🎉</h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                                Your feedback has been analyzed and merged into the AI's training data. All future {label}s will be improved.
                            </p>
                        </div>
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--brand-500)]/5 border border-[var(--brand-500)]/20">
                            <Sparkles size={16} className="text-[var(--brand-400)] shrink-0 mt-0.5" />
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                Your review was distilled into a precise instruction and merged with existing training data.
                                Similar future feedback will continue to refine it — keeping prompts concise and effective.
                            </p>
                        </div>
                        <button onClick={onClose} className="btn btn-primary w-full gap-2">
                            <CheckCircle size={16} /> Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
