import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { resumeAtom } from "../recoil/resumeAtom";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { ArrowLeft, Target, Sparkles, Loader2, Plus, CheckCircle, AlertCircle, Zap, BarChart3, History as HistoryIcon, FileText, X, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../api/apiClient";
import { loadResume } from "../api/resumeApi";

export default function ATSOptimizer() {
    const navigate = useNavigate();
    const resumeState = useRecoilValue(resumeAtom);
    const setResumeState = useSetRecoilState(resumeAtom);
    const setHistory = useSetRecoilState(resumeHistoryAtom);

    const location = useLocation();
    const [jobDescription, setJobDescription] = useState(location.state?.jobDescription || "");
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(location.state?.result || null);   // { score, matched, missing }
    const { resumes } = useRecoilValue(resumeHistoryAtom);
    const [showResumePicker, setShowResumePicker] = useState(false);
    const [selectingResumeId, setSelectingResumeId] = useState(null);

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
    const [adding, setAdding] = useState({});     // { [skill]: true }
    const [addedSkills, setAddedSkills] = useState(new Set());

    useEffect(() => {
        if (location.state?.result) {
            setResult(location.state.result);
            setJobDescription(location.state.jobDescription || "");
        }
    }, [location.state]);

    const hasResume = !!(resumeState?.resumeData?.personalInfo?.name);

    const analyze = async () => {
        if (!jobDescription.trim()) return toast.error("Paste a job description first.");
        if (!hasResume) return toast.error("Please generate a resume first before using ATS Optimizer.");
        setAnalyzing(true);
        setResult(null);
        try {
            const res = await apiClient("/atsAnalyze", {
                method: "POST",
                body: JSON.stringify({ resumeData: resumeState.resumeData, jobDescription }),
            });
            if (res?.success) {
                setResult(res);
                setAddedSkills(new Set());
                
                // Update history sidebar immediately
                if (res.historyId) {
                    setHistory(prev => {
                        const newHistoryItem = {
                            id: res.historyId,
                            title: `ATS Match: ${res.score}% — ${new Date().toLocaleDateString()}`,
                            createdAt: new Date().toISOString(),
                            type: 'ats-heatmap'
                        };
                        return {
                            ...prev,
                            resumes: [newHistoryItem, ...prev.resumes]
                        };
                    });
                }
            } else {
                toast.error(res?.error || "Analysis failed.");
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setAnalyzing(false);
        }
    };

    const addSkill = async (skill) => {
        setAdding(prev => ({ ...prev, [skill]: true }));
        try {
            const res = await apiClient("/atsInsertSkill", {
                method: "POST",
                body: JSON.stringify({ resumeData: resumeState.resumeData, skill }),
            });
            if (res?.success) {
                setResumeState(prev => ({ ...prev, resumeData: res.resumeData }));
                setAddedSkills(prev => new Set([...prev, skill]));
                toast.success(`"${skill}" added to your resume!`);
            } else {
                toast.error(res?.error || "Failed to add skill.");
            }
        } catch {
            toast.error("Failed to add skill.");
        } finally {
            setAdding(prev => ({ ...prev, [skill]: false }));
        }
    };

    const scoreColor = (s) => {
        if (s >= 75) return { bar: "var(--emerald-500)", text: "text-[var(--emerald-400)]", label: "Strong Match" };
        if (s >= 50) return { bar: "var(--brand-500)", text: "text-[var(--brand-400)]", label: "Good Match" };
        if (s >= 30) return { bar: "var(--gold-500)", text: "text-[var(--gold-400)]", label: "Moderate Match" };
        return { bar: "var(--rose-500)", text: "text-rose-400", label: "Weak Match" };
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <header className="sticky top-0 z-10 backdrop-blur bg-[var(--bg-base)]/80 border-b border-[var(--border-subtle)]">
                <div className="page-wrapper py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/")} className="btn btn-ghost btn-sm gap-2">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className="h-5 w-px bg-[var(--border-subtle)]" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--emerald-500)]/15 flex items-center justify-center">
                                <Target size={16} className="text-[var(--emerald-400)]" />
                            </div>
                            <span className="font-semibold">ATS Keyword Optimizer</span>
                        </div>
                    </div>
                    <span className="badge badge-emerald"><Sparkles size={11} className="mr-1" />AI Powered</span>
                </div>
            </header>

            <main className="page-wrapper py-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Title */}
                    <div>
                        <h1 className="text-3xl font-extrabold mb-2">ATS Keyword <span className="gradient-text-emerald">Heatmap</span></h1>
                        <p className="text-[var(--text-secondary)]">Paste a job description to see how well your resume matches, then add missing keywords with one click.</p>
                    </div>

                    {/* No resume warning */}
                    {!hasResume && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--gold-500)]/10 border border-[var(--gold-500)]/30 text-[var(--gold-400)]">
                            <AlertCircle size={18} className="shrink-0" />
                            <div>
                                <p className="font-semibold text-sm">No resume found</p>
                                <p className="text-xs opacity-80">Complete the interview and generate a resume first.</p>
                            </div>
                            <button onClick={() => navigate("/interview-level")} className="btn btn-sm ml-auto shrink-0" style={{ background: "var(--gold-500)", color: "#000" }}>
                                Build Resume
                            </button>
                            {resumeList.length > 0 && (
                                <button onClick={() => setShowResumePicker(true)} className="btn btn-sm btn-ghost gap-2 ml-2">
                                    <HistoryIcon size={14} /> Select Previous
                                </button>
                            )}
                        </div>
                    )}

                    {hasResume && (
                        <div className="card p-4 border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <FileText size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-0.5">Active Resume</p>
                                    <p className="font-bold text-[var(--text-primary)] truncate">{resumeState.resumeData.personalInfo?.name || "Untitled Resume"}</p>
                                </div>
                            </div>
                            {resumeList.length > 0 && (
                                <button onClick={() => setShowResumePicker(true)} className="btn btn-ghost btn-sm gap-2 text-[var(--brand-400)]">
                                    <HistoryIcon size={14} /> Change Resume
                                </button>
                            )}
                        </div>
                    )}

                    {/* Input */}
                    <div className="card p-6">
                        <label className="section-label block mb-3">Job Description</label>
                        <textarea
                            className="input w-full h-52 resize-y text-sm"
                            placeholder="Paste the full job description here…"
                            value={jobDescription}
                            onChange={e => setJobDescription(e.target.value)}
                        />
                        <button
                            onClick={analyze}
                            disabled={analyzing || !jobDescription.trim() || !hasResume}
                            className="btn btn-primary mt-4 w-full gap-2 disabled:opacity-50"
                        >
                            {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</> : <><BarChart3 size={16} /> Analyze Match</>}
                        </button>
                    </div>

                    {/* Results */}
                    {result && (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* Score gauge */}
                            {(() => {
                                const { bar, text, label } = scoreColor(result.score);
                                return (
                                    <div className="card p-7 text-center">
                                        <p className="section-label mb-4">ATS Match Score</p>
                                        <div className={`text-6xl font-extrabold mb-2 ${text}`}>{result.score}%</div>
                                        <p className={`font-semibold mb-5 ${text}`}>{label}</p>
                                        <div className="w-full h-4 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${result.score}%`, background: bar }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
                                            <span>0% — No match</span>
                                            <span>100% — Perfect match</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Matched keywords */}
                            {result.matched?.length > 0 && (
                                <div className="card p-6">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <CheckCircle size={16} className="text-[var(--emerald-400)]" />
                                        Matched Keywords <span className="badge badge-emerald ml-2">{result.matched.length}</span>
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {result.matched.map(k => (
                                            <span key={k} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--emerald-500)]/10 border border-[var(--emerald-500)]/30 text-[var(--emerald-400)]">
                                                ✓ {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Missing keywords */}
                            {result.missing?.length > 0 && (
                                <div className="card p-6">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <AlertCircle size={16} className="text-rose-400" />
                                        Missing Keywords <span className="badge badge-rose ml-2">{result.missing.filter(k => !addedSkills.has(k)).length}</span>
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {result.missing.map(k => (
                                            addedSkills.has(k) ? (
                                                <span key={k} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--emerald-500)]/10 border border-[var(--emerald-500)]/30 text-[var(--emerald-400)]">
                                                    ✓ {k} Added
                                                </span>
                                            ) : (
                                                <button
                                                    key={k}
                                                    onClick={() => addSkill(k)}
                                                    disabled={!!adding[k]}
                                                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-[var(--emerald-500)]/15 hover:border-[var(--emerald-500)]/40 hover:text-[var(--emerald-400)] transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {adding[k] ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                                                    {k}
                                                </button>
                                            )
                                        ))}
                                    </div>
                                    {result.missing.some(k => !addedSkills.has(k)) && (
                                        <p className="text-xs text-[var(--text-muted)] mt-4 flex items-center gap-1.5">
                                            <Zap size={11} /> Click a keyword to add it to your resume's skills section instantly.
                                        </p>
                                    )}
                                </div>
                            )}

                            {addedSkills.size > 0 && (
                                <button onClick={() => navigate("/resume")} className="btn btn-primary w-full gap-2">
                                    <CheckCircle size={16} /> View Updated Resume
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Resume selection modal */}
            {showResumePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResumePicker(false)} />
                    <div className="relative w-full max-w-md bg-[var(--bg-elevated)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden animate-zoom-in">
                        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2 text-[var(--text-primary)]">
                                <HistoryIcon size={18} className="text-[var(--brand-400)]" />
                                Select a Resume
                            </h3>
                            <button onClick={() => setShowResumePicker(false)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-[var(--text-primary)]">
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
                                                : <FileText size={14} className="text-[var(--text-muted)] group-hover:text-[var(--brand-400)]" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate group-hover:text-[var(--brand-400)] transition-colors text-[var(--text-primary)]">{resume.title || "Untitled Resume"}</p>
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
