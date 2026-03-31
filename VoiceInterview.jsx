import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import {
    Mic, MicOff, Volume2, ArrowLeft, RotateCcw, ChevronRight,
    Loader2, CheckCircle, Sparkles, Brain, Target, AlertTriangle,
    TrendingUp, TrendingDown, Minus, FileText
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../api/apiClient";
import ReviewDialog from "../components/ReviewDialog";
import useReviewStatus from "../hooks/useReviewStatus";

// ── Opening questions – AI picks one then adapts from user replies ──────────
const STARTER_QUESTIONS = [
    "Tell me about yourself and your professional background.",
    "Walk me through your experience and what brings you here today.",
    "Start by telling me about your most recent role and what you achieved there.",
];

// ── Circular score ring ─────────────────────────────────────────────────────
const ScoreRing = ({ score, label, color }) => {
    const r = 28;
    const circ = 2 * Math.PI * r;
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20">
                <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
                    <circle cx="36" cy="36" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
                    <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
                        strokeDasharray={circ}
                        strokeDashoffset={circ - (score / 100) * circ}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 1s ease" }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-[var(--text-primary)]">{score}</span>
                </div>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
        </div>
    );
};

// ── Trend icon for session summary ─────────────────────────────────────────
const TrendIcon = ({ scores }) => {
    if (scores.length < 2) return <Minus size={16} className="text-[var(--text-muted)]" />;
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const first = avg(scores.slice(0, Math.ceil(scores.length / 2)));
    const last = avg(scores.slice(Math.floor(scores.length / 2)));
    if (last > first + 3) return <TrendingUp size={16} className="text-[var(--emerald-400)]" />;
    if (last < first - 3) return <TrendingDown size={16} className="text-rose-400" />;
    return <Minus size={16} className="text-[var(--text-muted)]" />;
};

export default function VoiceInterview() {
    const navigate = useNavigate();
    const { resumes } = useRecoilValue(resumeHistoryAtom);
    const { reviewOpen, setReviewOpen, openReviewIfNew } = useReviewStatus();
    const setHistoryAtom = useSetRecoilState(resumeHistoryAtom);

    // ── State ───────────────────────────────────────────────────────────────
    const [step, setStep] = useState("intro");
    const [currentQuestion, setCurrentQuestion] = useState("");
    const [transcript, setTranscript] = useState("");
    const [listening, setListening] = useState(false);
    const [scores, setScores] = useState(null);
    const [feedback, setFeedback] = useState("");
    const [endReason, setEndReason] = useState("");
    const [speakingQ, setSpeakingQ] = useState(false);
    const [selectedResumeId, setSelectedResumeId] = useState("");
    const [resumeContext, setResumeContext] = useState(null);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.history) {
            setHistory(location.state.history);
            setStep("done");
        }
    }, [location.state]);

    // conversation history: [{ question, answer, scores }]
    const [history, setHistory] = useState([]);

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    const hasWebSpeech = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    const hasTTS = "speechSynthesis" in window;

    // ── Derived ─────────────────────────────────────────────────────────────
    const totalAnswered = history.length;
    const overallScores = history.map(h => Math.round((h.scores.tone + h.scores.clarity + h.scores.relevance) / 3));
    const sessionAvg = overallScores.length > 0
        ? Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length) : 0;
    const avgTone = history.length ? Math.round(history.reduce((a,b)=>a+b.scores.tone,0)/history.length) : 0;
    const avgClarity = history.length ? Math.round(history.reduce((a,b)=>a+b.scores.clarity,0)/history.length) : 0;
    const avgRelevance = history.length ? Math.round(history.reduce((a,b)=>a+b.scores.relevance,0)/history.length) : 0;

    // ── TTS ─────────────────────────────────────────────────────────────────
    const speak = useCallback((text) => {
        if (!hasTTS) return;
        synthRef.current.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.88;
        utter.pitch = 1.05;
        utter.onstart = () => setSpeakingQ(true);
        utter.onend = () => setSpeakingQ(false);
        utter.onerror = () => setSpeakingQ(false);
        synthRef.current.speak(utter);
    }, [hasTTS]);

    // ── Mic ─────────────────────────────────────────────────────────────────
    const startListening = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = (e) =>
            setTranscript(Array.from(e.results).map(r => r[0].transcript).join(" "));
        rec.onerror = () => { setListening(false); toast.error("Microphone error."); };
        rec.onend = () => setListening(false);
        rec.start();
        recognitionRef.current = rec;
        setListening(true);
        setTranscript("");
    };

    const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

    // ── Submit answer to AI ─────────────────────────────────────────────────
    const analyzeAnswer = async () => {
        if (!transcript.trim()) return toast.error("Please speak your answer first.");
        stopListening();
        setStep("thinking");
        try {
            const res = await apiClient("/voiceInterviewAnalyze", {
                method: "POST",
                body: JSON.stringify({
                    transcript,
                    question: currentQuestion,
                    resumeContext,
                    history: history.map(h => ({
                        question: h.question,
                        answer: h.answer,
                        scores: h.scores,
                    })),
                }),
            });

            if (!res?.success) { toast.error("Analysis failed."); setStep("speaking"); return; }

            // Persist this Q+A into history
            setHistory(prev => [...prev, {
                question: currentQuestion,
                answer: transcript,
                scores: res.scores,
                feedback: res.feedback,
            }]);

            setScores(res.scores);
            setFeedback(res.feedback || "");

            if (res.endInterview) {
                setEndReason(res.endReason || "");
                setStep("done_result"); // show last scores then finish
                
                // Update history sidebar immediately
                if (res.historyId) {
                    setHistoryAtom(prev => {
                        const newHistoryItem = {
                            id: res.historyId,
                            title: `Voice Interview — ${new Date().toLocaleDateString()}`,
                            createdAt: new Date().toISOString(),
                            type: 'voice-interview'
                        };
                        return {
                            ...prev,
                            resumes: [newHistoryItem, ...prev.resumes]
                        };
                    });
                }
            } else {
                setStep("result");
                // Pre-load next question
                if (res.nextQuestion) {
                    // store for after user clicks Next
                    setCurrentQuestion(res.nextQuestion);
                }
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
            setStep("speaking");
        }
    };

    // ── Advance to next question ────────────────────────────────────────────
    const goToNextQuestion = () => {
        setTranscript("");
        setScores(null);
        setFeedback("");
        setStep("speaking");
        setTimeout(() => speak(currentQuestion), 400);
    };

    // ── Finish session (after last result) ─────────────────────────────────
    const finishSession = () => { setStep("done"); openReviewIfNew("interview"); };


    // ── Start interview ─────────────────────────────────────────────────────
    const startInterview = () => {
        if (!hasWebSpeech) return toast.error("Please use Chrome or Edge for Speech Recognition.");
        const q = STARTER_QUESTIONS[Math.floor(Math.random() * STARTER_QUESTIONS.length)];
        setCurrentQuestion(q);
        setHistory([]);
        setStep("speaking");
        setTimeout(() => speak(q), 400);
    };

    // ── Restart ─────────────────────────────────────────────────────────────
    const restart = () => {
        synthRef.current?.cancel();
        recognitionRef.current?.stop();
        setStep("intro");
        setHistory([]);
        setCurrentQuestion("");
        setTranscript("");
        setScores(null);
        setFeedback("");
        setEndReason("");
        setSelectedResumeId("");
        setResumeContext(null);
    };

    // ── Cleanup ─────────────────────────────────────────────────────────────
    useEffect(() => () => { synthRef.current?.cancel(); recognitionRef.current?.stop(); }, []);

    // ── Score quality badge ──────────────────────────────────────────────────
    const qualityBadge = (avg) => {
        if (avg >= 75) return { label: "Strong", cls: "text-[var(--emerald-400)] bg-[var(--emerald-500)]/10 border-[var(--emerald-500)]/30" };
        if (avg >= 50) return { label: "Good", cls: "text-[var(--brand-400)] bg-[var(--brand-500)]/10 border-[var(--brand-500)]/30" };
        return { label: "Needs Work", cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <ReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} type="interview" />
            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-10 backdrop-blur bg-[var(--bg-base)]/80 border-b border-[var(--border-subtle)]">
                <div className="page-wrapper py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { synthRef.current?.cancel(); navigate("/"); }} className="btn btn-ghost btn-sm gap-2">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className="h-5 w-px bg-[var(--border-subtle)]" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-500)]/15 flex items-center justify-center">
                                <Mic size={16} className="text-[var(--brand-400)]" />
                            </div>
                            <span className="font-semibold">Voice Mock Interview</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {totalAnswered > 0 && step !== "done" && (
                            <span className="text-xs text-[var(--text-muted)] font-medium">
                                {totalAnswered} answered · avg <strong className="text-[var(--text-primary)]">{sessionAvg}</strong>
                            </span>
                        )}
                        <span className="badge badge-brand"><Sparkles size={11} className="mr-1" />AI Adaptive</span>
                    </div>
                </div>
            </header>

            <main className="page-wrapper py-10">
                <div className="max-w-2xl mx-auto">

                    {/* ── INTRO ──────────────────────────────────────────── */}
                    {step === "intro" && (
                        <div className="text-center animate-fade-in-up">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--brand-500)]/20 to-[var(--emerald-500)]/20 flex items-center justify-center mx-auto mb-6 border border-[var(--brand-500)]/20">
                                <Mic size={40} className="text-[var(--brand-400)]" />
                            </div>
                            <h1 className="text-3xl font-extrabold mb-3">Voice Mock Interview</h1>
                            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto leading-relaxed">
                                Answer questions out loud. The AI listens, scores your <strong>Tone</strong>, <strong>Clarity</strong>, and <strong>Relevance</strong>, then asks a smarter follow-up based on your answer — just like a real interviewer.
                            </p>

                            <div className="grid grid-cols-3 gap-4 mb-10">
                                {[
                                    ["🎙️", "Speak Naturally", "Hold the mic button and talk"],
                                    ["🤖", "AI Adapts", "Each new question is based on your previous answer"],
                                    ["🏁", "Smart Ending", "Interview ends when you peak or when it's complete"],
                                ].map(([icon, title, desc]) => (
                                    <div key={title} className="card p-4 text-center">
                                        <div className="text-2xl mb-2">{icon}</div>
                                        <p className="font-semibold text-sm text-[var(--text-primary)]">{title}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">{desc}</p>
                                    </div>
                                ))}
                            </div>

                            {!hasWebSpeech && (
                                <div className="flex items-center gap-2 p-3 mb-6 rounded-xl bg-[var(--gold-500)]/10 border border-[var(--gold-500)]/30 text-[var(--gold-400)] text-sm">
                                    <AlertTriangle size={16} /> Speech recognition requires Chrome or Edge.
                                </div>
                            )}

                            {/* ── Resume selector ─────────────────────────── */}
                            {resumes && resumes.length > 0 && (
                                <div className="card p-5 mb-6 text-left">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText size={15} className="text-[var(--brand-400)]" />
                                        <p className="font-semibold text-sm text-[var(--text-primary)]">Attach your resume <span className="text-[var(--text-muted)] font-normal">(optional, but recommended)</span></p>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                                        Selecting a resume lets the AI tailor interview questions to your actual experience, skills, and role — making the session much more relevant.
                                    </p>
                                    <select
                                        value={selectedResumeId}
                                        onChange={e => {
                                            const id = e.target.value;
                                            setSelectedResumeId(id);
                                            if (!id) { setResumeContext(null); return; }
                                            const r = resumes.find(r => String(r.id) === id);
                                            if (r) {
                                                const sd = r.sourceData || {};
                                                setResumeContext({
                                                    name: sd.personalInfo?.name || r.title || "Candidate",
                                                    summary: sd.summary || "",
                                                    skills: sd.skills || [],
                                                    experience: (sd.experience || []).slice(0, 3).map(ex => ({
                                                        role: ex.role || ex.title || "",
                                                        company: ex.company || "",
                                                        duration: ex.duration || ex.dates || "",
                                                    })),
                                                });
                                            }
                                        }}
                                        className="input w-full text-sm"
                                    >
                                        <option value="">— No resume (generic questions) —</option>
                                        {resumes.map(r => (
                                            <option key={r.id} value={String(r.id)}>{r.title || "Untitled Resume"}</option>
                                        ))}
                                    </select>
                                    {resumeContext && (
                                        <div className="mt-3 p-3 rounded-lg bg-[var(--brand-500)]/5 border border-[var(--brand-500)]/20 flex items-center gap-2 text-xs text-[var(--brand-400)]">
                                            <CheckCircle size={13} /> AI will tailor questions for <strong className="ml-1">{resumeContext.name}</strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button onClick={() => {
                                if (!hasWebSpeech) return toast.error("Please use Chrome or Edge for Speech Recognition.");
                                const q = STARTER_QUESTIONS[Math.floor(Math.random() * STARTER_QUESTIONS.length)];
                                setCurrentQuestion(q);
                                setHistory([]);
                                setStep("speaking");
                                setTimeout(() => speak(q), 400);
                            }} className="btn btn-primary btn-lg gap-2 mx-auto">
                                {resumeContext ? "Start Tailored Interview" : "Start Interview"} <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* ── SPEAKING ───────────────────────────────────────── */}
                    {step === "speaking" && (
                        <div className="animate-fade-in-up space-y-6">
                            {/* Progress strip */}
                            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                <span className="font-semibold uppercase tracking-wide">Question {totalAnswered + 1}</span>
                                {totalAnswered > 0 && (
                                    <span>Session avg: <strong className="text-[var(--text-primary)]">{sessionAvg}/100</strong></span>
                                )}
                            </div>

                            {/* Question card */}
                            <div className="card p-7">
                                <div className="flex items-start gap-3 mb-5">
                                    {speakingQ && (
                                        <Volume2 size={18} className="text-[var(--brand-400)] mt-1 shrink-0 animate-pulse" />
                                    )}
                                    <h2 className="text-xl font-bold text-[var(--text-primary)] leading-snug">{currentQuestion}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => speak(currentQuestion)} className="btn btn-secondary btn-sm gap-1.5 text-xs">
                                        <Volume2 size={12} /> Repeat Question
                                    </button>
                                    {totalAnswered > 0 && (
                                        <span className="text-[10px] text-[var(--emerald-400)] bg-[var(--emerald-500)]/10 border border-[var(--emerald-500)]/20 rounded-full px-2 py-0.5 font-semibold">
                                            AI-generated follow-up
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Microphone */}
                            <div className="card p-7 text-center">
                                <button
                                    onMouseDown={startListening}
                                    onMouseUp={stopListening}
                                    onTouchStart={startListening}
                                    onTouchEnd={stopListening}
                                    className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center transition-all duration-200 mb-4 select-none ${
                                        listening
                                            ? "bg-rose-500/20 border-2 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)] scale-110"
                                            : "bg-[var(--bg-elevated)] border-2 border-[var(--border-base)] hover:border-[var(--brand-500)] hover:bg-[var(--brand-500)]/10 hover:scale-105"
                                    }`}
                                >
                                    {listening
                                        ? <MicOff size={36} className="text-rose-400" />
                                        : <Mic size={36} className="text-[var(--brand-400)]" />
                                    }
                                </button>
                                <p className="text-sm font-medium text-[var(--text-muted)]">
                                    {listening ? "🔴 Listening… Release to stop" : "Hold to speak your answer"}
                                </p>
                            </div>

                            {/* Live transcript */}
                            {transcript && (
                                <div className="card p-5 border-[var(--brand-500)]/30 animate-fade-in">
                                    <p className="section-label mb-2 text-[var(--brand-400)]">Your Answer (Live Transcript)</p>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">"{transcript}"</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => setTranscript("")} className="btn btn-ghost gap-2 flex-1">
                                    <RotateCcw size={14} /> Clear
                                </button>
                                <button
                                    onClick={analyzeAnswer}
                                    disabled={!transcript.trim()}
                                    className="btn btn-primary flex-1 gap-2 disabled:opacity-50"
                                >
                                    <Brain size={16} /> Analyze Answer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── THINKING ───────────────────────────────────────── */}
                    {step === "thinking" && (
                        <div className="text-center py-24 animate-fade-in">
                            <div className="relative w-20 h-20 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full bg-[var(--brand-500)]/10 animate-ping" />
                                <div className="relative w-full h-full rounded-full bg-[var(--brand-500)]/20 flex items-center justify-center">
                                    <Loader2 size={32} className="animate-spin text-[var(--brand-400)]" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-2">AI is reading your answer…</h3>
                            <p className="text-[var(--text-muted)] text-sm">Scoring tone, clarity & relevance · generating next question</p>
                        </div>
                    )}

                    {/* ── RESULT (mid-interview) ─────────────────────────── */}
                    {(step === "result" || step === "done_result") && scores && (
                        <div className="animate-fade-in-up space-y-5">
                            <div className="card p-7">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-bold text-lg">Answer Score</h3>
                                    {(() => {
                                        const avg = Math.round((scores.tone + scores.clarity + scores.relevance) / 3);
                                        const b = qualityBadge(avg);
                                        return <span className={`badge border ${b.cls}`}>{b.label} · {avg}/100</span>;
                                    })()}
                                </div>
                                <div className="flex justify-around mb-6">
                                    <ScoreRing score={scores.tone} label="Tone" color="var(--brand-400)" />
                                    <ScoreRing score={scores.clarity} label="Clarity" color="var(--emerald-400)" />
                                    <ScoreRing score={scores.relevance} label="Relevance" color="var(--gold-400)" />
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                                    <p className="section-label mb-2 text-[var(--brand-400)]">AI Feedback</p>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feedback}</p>
                                </div>
                            </div>

                            <div className="card p-4">
                                <p className="section-label mb-2">Your Answer</p>
                                <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">"{history[history.length - 1]?.answer}"</p>
                            </div>

                            {step === "done_result" ? (
                                <div className="p-4 rounded-xl bg-[var(--emerald-500)]/5 border border-[var(--emerald-500)]/20 flex items-center gap-3">
                                    <CheckCircle size={18} className="text-[var(--emerald-400)] shrink-0" />
                                    <p className="text-sm text-[var(--text-secondary)]">{endReason || "Interview complete!"}</p>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-[var(--brand-500)]/5 border border-[var(--brand-500)]/20 flex items-center gap-3">
                                    <Sparkles size={18} className="text-[var(--brand-400)] shrink-0" />
                                    <p className="text-sm text-[var(--text-secondary)]">Next question already prepared based on your answer.</p>
                                </div>
                            )}

                            <button
                                onClick={step === "done_result" ? finishSession : goToNextQuestion}
                                className="btn btn-primary w-full gap-2"
                            >
                                {step === "done_result"
                                    ? <><CheckCircle size={16} /> View Session Report</>
                                    : <>Next Question <ChevronRight size={16} /></>
                                }
                            </button>
                        </div>
                    )}

                    {/* ── DONE (session summary) ─────────────────────────── */}
                    {step === "done" && (
                        <div className="text-center animate-fade-in-up space-y-8">
                            <div>
                                <div className="w-20 h-20 rounded-3xl bg-[var(--emerald-500)]/20 flex items-center justify-center mx-auto mb-5">
                                    <CheckCircle size={40} className="text-[var(--emerald-400)]" />
                                </div>
                                <h2 className="text-3xl font-extrabold mb-2">Session Complete!</h2>
                                <p className="text-[var(--text-secondary)]">
                                    You answered <strong>{totalAnswered}</strong> question{totalAnswered !== 1 ? "s" : ""}.
                                    {endReason && ` "${endReason}"`}
                                </p>
                            </div>

                            {/* Overall avg scores */}
                            <div className="card p-7">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-bold">Session Performance</h3>
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)]">
                                        <TrendIcon scores={overallScores} />
                                        <span>{sessionAvg}/100 avg</span>
                                    </div>
                                </div>
                                <div className="flex justify-around">
                                    <ScoreRing score={avgTone} label="Avg Tone" color="var(--brand-400)" />
                                    <ScoreRing score={avgClarity} label="Avg Clarity" color="var(--emerald-400)" />
                                    <ScoreRing score={avgRelevance} label="Avg Relevance" color="var(--gold-400)" />
                                </div>
                            </div>

                            {/* Per-question timeline */}
                            {history.length > 0 && (
                                <div className="card p-5 text-left">
                                    <p className="section-label mb-4">Question Timeline</p>
                                    <div className="space-y-3">
                                        {history.map((h, i) => {
                                            const avg = Math.round((h.scores.tone + h.scores.clarity + h.scores.relevance) / 3);
                                            const b = qualityBadge(avg);
                                            return (
                                                <div key={i} className="flex items-start gap-3 text-sm">
                                                    <span className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] shrink-0 mt-0.5">{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[var(--text-secondary)] truncate">{h.question}</p>
                                                    </div>
                                                    <span className={`badge border text-[10px] shrink-0 ${b.cls}`}>{avg}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 justify-center">
                                <button onClick={restart} className="btn btn-secondary gap-2">
                                    <RotateCcw size={16} /> Practice Again
                                </button>
                                <button onClick={() => navigate("/")} className="btn btn-primary gap-2">
                                    <Target size={16} /> Dashboard
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
