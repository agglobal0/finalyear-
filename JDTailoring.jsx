import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRecoilState, useSetRecoilState } from "recoil";
import { resumeAtom } from "../recoil/resumeAtom";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { tailorResume } from "../api/resumeApi";
import { ArrowLeft, Sparkles, FileText, Copy, Check, ChevronRight, Loader2, Target, History, X } from "lucide-react";

import { getUserResumes, loadResume } from "../api/resumeApi";
import toast from "react-hot-toast";

// Main JDTailoring component

export default function JDTailoring() {
    const navigate = useNavigate();
    const location = useLocation();
    const [resumeState, setResumeState] = useRecoilState(resumeAtom);
    const setHistory = useSetRecoilState(resumeHistoryAtom);
    const resumeData = resumeState.resumeData;


    const [jd, setJd] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Resume selection modal state
    const [showResumePicker, setShowResumePicker] = useState(false);
    const [availableResumes, setAvailableResumes] = useState([]);
    const [fetchingHistory, setFetchingHistory] = useState(false);

    // Clear results on mount
    useEffect(() => {
        if (location.state?.jobDescription) {
            setJd(location.state.jobDescription);
        }
    }, [location.state]);

    const handleOpenResumePicker = async () => {
        setShowResumePicker(true);
        setFetchingHistory(true);
        try {
            const data = await getUserResumes();
            const filtered = (Array.isArray(data) ? data : []).filter(r => r.type === 'resume-html' || !r.type);
            setAvailableResumes(filtered);
        } catch (err) {
            toast.error("Failed to load your resumes");
        } finally {
            setFetchingHistory(false);
        }
    };

    const handleSelectResume = async (resumeId) => {
        setFetchingHistory(true);
        try {
            const historyData = await loadResume(resumeId);
            if (!historyData) throw new Error("Could not load resume");
            
            const resumeData = historyData.sourceData || {};
            setResumeState(prev => ({
                ...prev,
                resumeData,
                historyId: resumeId
            }));
            toast.success("Resume loaded successfully!");
            setShowResumePicker(false);
        } catch (err) {
            toast.error("Failed to load resume");
        } finally {
            setFetchingHistory(false);
        }
    };

    const handleTailor = async () => {
        if (!jd.trim()) return toast.error("Please paste a job description first.");
        if (!resumeData) return toast.error("No resume found. Please build your resume first.");

        setLoading(true);
        try {
            const res = await tailorResume(resumeData, jd);
            if (res?.tailored && res?.historyId) {
                // Update history state instantly
                setHistory(prev => ({
                    ...prev,
                    resumes: [
                        {
                            id: res.historyId,
                            title: `JD-Tailored Resume — ${new Date().toLocaleDateString()}`,
                            createdAt: new Date(),
                            type: 'jd-tailored'
                        },
                        ...prev.resumes
                    ]
                }));

                toast.success("Resume tailored successfully!");
                navigate("/career/jd-tailor/result", { 
                    state: { 
                        tailoredResult: res.tailored, 
                        jobDescription: jd,
                        resumeData: resumeData
                    } 
                });
            } else {
                toast.error("Tailoring failed. Please try again.");
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            {/* Header */}
            <header className="sticky top-0 z-10 backdrop-blur bg-[var(--bg-base)]/80 border-b border-[var(--border-subtle)]">
                <div className="page-wrapper py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/")} className="btn btn-ghost btn-sm gap-2">
                            <ArrowLeft size={16} /> Back to Dashboard
                        </button>
                        <div className="h-5 w-px bg-[var(--border-subtle)]" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--emerald-500)]/15 flex items-center justify-center">
                                <Target size={16} className="text-[var(--emerald-400)]" />
                            </div>
                            <span className="font-semibold">JD Tailor</span>
                        </div>
                    </div>
                    <span className="badge badge-emerald hidden sm:flex">ATS Optimizer</span>
                </div>
            </header>

            <main className="page-wrapper py-8">
                {/* Hero */}
                <div className="mb-8 animate-fade-in-up">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                        Tailor Resume to <span className="gradient-text-emerald">Job Description</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] max-w-xl">
                        Paste any job description and our AI will rewrite your summary, skills, and achievements to match exactly what the employer is looking for.
                    </p>
                </div>

                {!resumeData ? (
                    <div className="card p-10 text-center max-w-lg mx-auto border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <FileText size={28} className="text-[var(--text-muted)]" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No Resume Found</h2>
                        <p className="text-[var(--text-muted)] mb-8 text-sm max-w-xs mx-auto">You need to build a resume first before tailoring it. You can create a new one or select one from your history.</p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={() => navigate("/interview-level")} className="btn btn-primary gap-2">
                                <Sparkles size={16} /> Build New Resume <ChevronRight size={16} />
                            </button>
                            <button onClick={handleOpenResumePicker} className="btn btn-secondary gap-2">
                                <History size={16} /> Select Previous Resume
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in-up">
                        <div className="card p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-lg bg-[var(--brand-500)]/15 flex items-center justify-center">
                                    <FileText size={14} className="text-[var(--brand-400)]" />
                                </div>
                                <h2 className="font-semibold">Your Resume</h2>
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="badge badge-emerald">Loaded</span>
                                    <button 
                                        onClick={handleOpenResumePicker}
                                        className="btn btn-ghost btn-xs h-7 px-2 border border-[var(--border-subtle)] text-[10px] uppercase font-bold tracking-wider hover:bg-[var(--bg-elevated)]"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                Resume for: <span className="text-[var(--text-primary)] font-medium">{resumeData.personalInfo?.name || "Unknown"}</span>
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {[...(resumeData.skills?.technical || []).slice(0, 4)].map(s => (
                                    <span key={s} className="badge badge-muted">{s}</span>
                                ))}
                            </div>
                        </div>

                        <div className="card p-5">
                            <label className="block font-semibold mb-2">
                                Paste Job Description <span className="text-[var(--rose-400)]">*</span>
                            </label>
                            <textarea
                                value={jd}
                                onChange={e => setJd(e.target.value)}
                                rows={12}
                                className="input resize-y text-sm font-mono"
                                placeholder="Paste the full job description here...&#10;&#10;e.g. We are looking for a Senior React Developer with 5+ years experience in TypeScript, Next.js, and building scalable web applications..."
                            />
                            <div className="mt-3 flex items-center justify-between">
                                <p className="text-xs text-[var(--text-muted)]">{jd.length} characters</p>
                                <button
                                    onClick={handleTailor}
                                    disabled={loading || !jd.trim()}
                                    className="btn bg-gradient-to-r from-[var(--emerald-400)] to-[var(--emerald-600)] hover:from-[var(--emerald-500)] hover:to-[var(--emerald-700)] text-white disabled:opacity-50 gap-2 shadow-lg"
                                >
                                    {loading ? <><Loader2 size={16} className="animate-spin" /> Tailoring...</> : <><Sparkles size={16} /> Tailor Resume</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Resume Selection Modal */}
            {showResumePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResumePicker(false)} />
                    <div className="relative w-full max-w-md bg-[var(--bg-elevated)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden animate-zoom-in">
                        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <History size={18} className="text-[var(--brand-400)]" />
                                Select Previous Resume
                            </h3>
                            <button onClick={() => setShowResumePicker(false)} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {fetchingHistory ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 size={32} className="animate-spin text-[var(--brand-500)] mb-2" />
                                    <p className="text-sm text-[var(--text-muted)]">Loading your history...</p>
                                </div>
                            ) : availableResumes.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-[var(--text-muted)]">No previous resumes found.</p>
                                    <button 
                                        onClick={() => navigate("/interview-level")}
                                        className="btn btn-link text-[var(--brand-400)] mt-2"
                                    >
                                        Build your first one now
                                    </button>
                                </div>
                            ) : (
                                availableResumes.map(resume => (
                                    <button
                                        key={resume._id || resume.id}
                                        onClick={() => handleSelectResume(resume._id || resume.id)}
                                        className="w-full text-left p-4 rounded-xl border border-transparent hover:border-[var(--brand-500)]/30 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--brand-400)] group-hover:bg-[var(--brand-500)]/10 transition-colors">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm group-hover:text-[var(--brand-400)] transition-colors">
                                                    {resume.title || "Untitled Resume"}
                                                </div>
                                                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                                    {new Date(resume.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="ml-auto text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        
                        <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                            Choose a resume to use as the base for tailoring.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
