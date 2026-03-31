import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { resumeAtom } from "../recoil/resumeAtom";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { generateLinkedIn, loadResume } from "../api/resumeApi";
import { ArrowLeft, Linkedin, FileText, Loader2, ChevronRight, Sparkles, User, History as HistoryIcon, X } from "lucide-react";
import toast from "react-hot-toast";

export default function LinkedInOptimizer() {
    const navigate = useNavigate();
    const resumeState = useRecoilValue(resumeAtom);
    const setResumeState = useSetRecoilState(resumeAtom);
    const setHistory = useSetRecoilState(resumeHistoryAtom);
    const { resumes } = useRecoilValue(resumeHistoryAtom);
    const resumeData = resumeState.resumeData;

    const [loading, setLoading] = useState(false);
    const [showResumePicker, setShowResumePicker] = useState(false);
    const [selectingResumeId, setSelectingResumeId] = useState(null);

    // Only show actual resumes (not generated results) in the picker
    const resumeList = resumes.filter(r => r.type === 'resume-html' || r.type === 'resume-pdf' || !r.type);

    const handleSelectResume = async (resumeId) => {
        setSelectingResumeId(resumeId);
        try {
            const historyData = await loadResume(resumeId);
            if (historyData) {
                const rData = historyData.sourceData || {};
                let htmlContent = '';
                if (historyData.fileContent) {
                    try { htmlContent = atob(historyData.fileContent); }
                    catch { htmlContent = historyData.fileContent; }
                }
                setResumeState(prev => ({
                    ...prev,
                    resumeData: rData,
                    htmlContent,
                    historyId: resumeId
                }));
                toast.success("Resume selected!");
                setShowResumePicker(false);
            }
        } catch (err) {
            toast.error("Failed to load resume");
        } finally {
            setSelectingResumeId(null);
        }
    };

    const handleGenerate = async () => {
        if (!resumeData) return toast.error("No resume found. Please build your resume first.");

        setLoading(true);
        try {
            const res = await generateLinkedIn(resumeData);
            if (res?.linkedInData) {
                if (res.historyId) {
                    setHistory(prev => ({
                        ...prev,
                        resumes: [
                            {
                                id: res.historyId,
                                title: `LinkedIn Profile — ${resumeData.personalInfo?.name || 'My Profile'}`,
                                createdAt: new Date(),
                                type: 'linkedin-profile'
                            },
                            ...prev.resumes
                        ]
                    }));
                }
                toast.success("LinkedIn profile generated!");
                navigate("/career/linkedin/result", { state: { result: res.linkedInData, resumeData } });
            } else {
                toast.error("Generation failed. Try again.");
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
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-500)]/15 flex items-center justify-center">
                                <Linkedin size={16} className="text-[var(--brand-400)]" />
                            </div>
                            <span className="font-semibold">LinkedIn Optimizer</span>
                        </div>
                    </div>
                    <span className="badge badge-brand hidden sm:flex">Profile Builder</span>
                </div>
            </header>

            <main className="page-wrapper py-8">
                {/* Hero */}
                <div className="mb-8 animate-fade-in-up">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                        Optimize Your <span className="gradient-text">LinkedIn Profile</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] max-w-xl">
                        Transform your resume data into a compelling LinkedIn presence — get a perfect headline, about section, and optimized experience bullets.
                    </p>
                </div>

                {!resumeData ? (
                    /* ── No resume loaded ── */
                    <div className="card p-10 text-center max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
                            <FileText size={28} className="text-[var(--text-muted)]" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">No Resume Found</h2>
                        <p className="text-[var(--text-muted)] mb-6 text-sm">
                            Build your resume first — your LinkedIn content will be generated from it.
                        </p>

                        {!showResumePicker ? (
                            <div className="flex flex-col gap-3">
                                <button onClick={() => navigate("/interview-level")} className="btn btn-primary w-full">
                                    Build My Resume <ChevronRight size={16} />
                                </button>
                                {resumeList.length > 0 && (
                                    <button onClick={() => setShowResumePicker(true)} className="btn btn-ghost w-full gap-2">
                                        <HistoryIcon size={16} /> Select Previous Resume
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-left animate-fade-in">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Select a Resume</p>
                                    <button onClick={() => setShowResumePicker(false)} className="text-xs text-[var(--brand-500)] hover:underline">Cancel</button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {resumeList.map(resume => (
                                        <button
                                            key={resume.id}
                                            onClick={() => handleSelectResume(resume.id)}
                                            disabled={selectingResumeId === resume.id}
                                            className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-all flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--bg-highlight)] flex items-center justify-center shrink-0">
                                                    {selectingResumeId === resume.id
                                                        ? <Loader2 size={14} className="animate-spin text-[var(--brand-500)]" />
                                                        : <FileText size={14} className="text-[var(--text-muted)]" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate group-hover:text-[var(--brand-500)] transition-colors">{resume.title || "Untitled Resume"}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)]">{new Date(resume.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── Resume loaded ── */
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="card-glass p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-[var(--brand-500)]/15 flex items-center justify-center shrink-0">
                                    <User size={22} className="text-[var(--brand-400)]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold truncate">{resumeData.personalInfo?.name || "Your Resume"}</p>
                                        {resumeList.length > 0 && (
                                            <button
                                                onClick={() => setShowResumePicker(true)}
                                                className="text-[10px] text-[var(--brand-500)] hover:underline flex items-center gap-1 shrink-0"
                                            >
                                                <HistoryIcon size={10} /> Change
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] truncate">
                                        {resumeData.experience?.length || 0} role{resumeData.experience?.length !== 1 ? "s" : ""} · {(resumeData.skills?.technical || []).slice(0, 3).join(", ")}
                                        {(resumeData.skills?.technical || []).length > 3 ? "..." : ""}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="btn bg-gradient-to-r from-[var(--brand-400)] to-[var(--brand-600)] hover:from-[var(--brand-500)] hover:to-[var(--brand-700)] text-white disabled:opacity-50 gap-2 shadow-[var(--shadow-brand)] shrink-0"
                            >
                                {loading
                                    ? <><Loader2 size={16} className="animate-spin" /> Generating...</>
                                    : <><Sparkles size={16} /> Generate LinkedIn Profile</>
                                }
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Resume selection dialog (when a resume is already loaded) */}
            {showResumePicker && resumeData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResumePicker(false)} />
                    <div className="relative w-full max-w-md bg-[var(--bg-elevated)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden animate-zoom-in">
                        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <HistoryIcon size={18} className="text-[var(--brand-400)]" />
                                Select Previous Resume
                            </h3>
                            <button onClick={() => setShowResumePicker(false)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {resumeList.length === 0 ? (
                                <p className="text-sm text-center text-[var(--text-muted)] py-8">No previous resumes found.</p>
                            ) : resumeList.map(resume => (
                                <button
                                    key={resume.id}
                                    onClick={() => handleSelectResume(resume.id)}
                                    disabled={selectingResumeId === resume.id}
                                    className="w-full text-left p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-highlight)] flex items-center justify-center shrink-0">
                                            {selectingResumeId === resume.id
                                                ? <Loader2 size={14} className="animate-spin text-[var(--brand-500)]" />
                                                : <FileText size={14} className="text-[var(--text-muted)]" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate group-hover:text-[var(--brand-500)] transition-colors">{resume.title || "Untitled Resume"}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">{new Date(resume.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
