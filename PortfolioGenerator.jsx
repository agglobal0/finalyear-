import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { resumeAtom } from "../recoil/resumeAtom";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { ArrowLeft, LayoutTemplate, Download, Eye, Sparkles, Loader2, Code2, AlertCircle, History as HistoryIcon, FileText, X, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../api/apiClient";
import { loadResume } from "../api/resumeApi";

const THEMES = [
    {
        id: "glassmorphism",
        name: "Glassmorphism",
        desc: "Dark background with frosted glass cards and glowing accents",
        preview: "linear-gradient(135deg, #0f0f1a 0%, #1a1040 100%)",
        accent: "#818cf8",
        badge: "🌌 Dark & Sleek",
    },
    {
        id: "minimalist",
        name: "Minimalist",
        desc: "Clean white layout with subtle typography and plenty of whitespace",
        preview: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        accent: "#334155",
        badge: "☀️ Clean & Modern",
        dark: true,
    },
];

export default function PortfolioGenerator() {
    const navigate = useNavigate();
    const resumeState = useRecoilValue(resumeAtom);
    const setResumeState = useSetRecoilState(resumeAtom);
    const setHistoryAtom = useSetRecoilState(resumeHistoryAtom);
    const { resumes } = useRecoilValue(resumeHistoryAtom);
    
    const [selectedTheme, setSelectedTheme] = useState("glassmorphism");
    const [generating, setGenerating] = useState(false);
    const [portfolioHtml, setPortfolioHtml] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    
    const [showResumePicker, setShowResumePicker] = useState(false);
    const [selectingResumeId, setSelectingResumeId] = useState(null);

    const location = useLocation();

    const resumeList = resumes.filter(r => r.type === 'resume-html' || r.type === 'resume-pdf' || !r.type);

    useEffect(() => {
        if (location.state?.html) {
            setPortfolioHtml(location.state.html);
            setPreviewOpen(true);
        }
    }, [location.state]);

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

    const hasResume = !!(resumeState?.resumeData?.personalInfo?.name);

    const generate = async () => {
        if (!hasResume) return toast.error("Please generate a resume first.");
        setGenerating(true);
        try {
            const res = await apiClient("/generatePortfolio", {
                method: "POST",
                body: JSON.stringify({ resumeData: resumeState.resumeData, theme: selectedTheme }),
            });
            if (res?.success && res?.html) {
                setPortfolioHtml(res.html);
                setPreviewOpen(true);
                toast.success("Portfolio generated!");

                // Update history sidebar
                if (res.historyId) {
                    setHistoryAtom(prev => {
                        const newHistoryItem = {
                            id: res.historyId,
                            title: `Portfolio — ${resumeState.resumeData.personalInfo?.name || 'My Site'}`,
                            createdAt: new Date().toISOString(),
                            type: 'portfolio-site'
                        };
                        return {
                            ...prev,
                            resumes: [newHistoryItem, ...prev.resumes]
                        };
                    });
                }
            } else {
                toast.error(res?.error || "Generation failed.");
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const download = () => {
        const blob = new Blob([portfolioHtml], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const name = (resumeState?.resumeData?.personalInfo?.name || "Portfolio").replace(/\s+/g, "_");
        a.download = `${name}_Portfolio.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Downloaded!");
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
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-500)]/15 flex items-center justify-center">
                                <LayoutTemplate size={16} className="text-[var(--brand-400)]" />
                            </div>
                            <span className="font-semibold">Portfolio Generator</span>
                        </div>
                    </div>
                    {portfolioHtml && (
                        <button onClick={() => setPreviewOpen(true)} className="btn btn-secondary btn-sm gap-1.5">
                            <Eye size={14} /> Preview
                        </button>
                    )}
                </div>
            </header>

            <main className="page-wrapper py-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    <div>
                        <h1 className="text-3xl font-extrabold mb-2">Personal Portfolio <span className="gradient-text">Generator</span></h1>
                        <p className="text-[var(--text-secondary)]">Convert your resume data into a stunning 1-page portfolio website. Download and host it anywhere.</p>
                    </div>

                    {!hasResume && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--gold-500)]/10 border border-[var(--gold-500)]/30 text-[var(--gold-400)]">
                            <AlertCircle size={18} className="shrink-0" />
                            <div>
                                <p className="font-semibold text-sm">No resume found</p>
                                <p className="text-xs opacity-80">Generate a resume first to create your portfolio.</p>
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

                    {/* Theme picker */}
                    <div className="card p-6">
                        <h3 className="font-bold mb-4">Choose a Theme</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {THEMES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTheme(t.id)}
                                    className={`rounded-2xl overflow-hidden border-2 transition-all text-left ${selectedTheme === t.id ? "border-[var(--brand-500)] shadow-[var(--shadow-brand)]" : "border-[var(--border-subtle)] hover:border-[var(--border-base)]"}`}
                                >
                                    <div className="h-28 relative flex items-center justify-center" style={{ background: t.preview }}>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className={`w-24 h-14 rounded-xl border ${t.dark ? "border-slate-200/30 bg-white/70 backdrop-blur" : "border-white/10 bg-white/5 backdrop-blur"}`}>
                                                <div className="h-2 w-10 rounded-full m-2 mx-auto" style={{ background: t.accent, opacity: 0.7 }} />
                                                <div className="h-1.5 w-14 rounded-full mx-auto mt-1" style={{ background: t.accent, opacity: 0.3 }} />
                                                <div className="h-1.5 w-12 rounded-full mx-auto mt-1" style={{ background: t.accent, opacity: 0.2 }} />
                                            </div>
                                        </div>
                                        {selectedTheme === t.id && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-500)] flex items-center justify-center">
                                                <span className="text-white text-[10px]">✓</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-[var(--bg-elevated)]">
                                        <div className="font-semibold text-sm text-[var(--text-primary)]">{t.name}</div>
                                        <div className="text-xs text-[var(--text-muted)] mt-0.5">{t.desc}</div>
                                        <span className="inline-block mt-2 text-[10px] font-semibold bg-[var(--bg-highlight)] px-2 py-0.5 rounded-full">{t.badge}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={generate}
                        disabled={generating || !hasResume}
                        className="btn btn-primary w-full btn-lg gap-2 disabled:opacity-50"
                    >
                        {generating ? <><Loader2 size={18} className="animate-spin" /> Generating Portfolio…</> : <><LayoutTemplate size={18} /> Generate Portfolio</>}
                    </button>


                </div>
            </main>

            {/* Full-screen preview */}
            {previewOpen && portfolioHtml && createPortal(
                <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--bg-base)]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-lg">
                        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-500)]/10 flex items-center justify-center">
                                <Eye size={16} className="text-[var(--brand-500)]" />
                            </div>
                            Portfolio Preview
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={download} 
                                className="btn btn-sm gap-2 h-10 px-4 text-white hover:scale-105 transition-all shadow-[var(--shadow-brand)]" 
                                style={{ background: "linear-gradient(135deg, var(--brand-400), var(--brand-600))" }}
                            >
                                <Download size={15} /> 
                                <span className="hidden sm:inline">Download HTML</span>
                                <span className="sm:hidden">Download</span>
                            </button>
                            <button 
                                onClick={() => setPreviewOpen(false)} 
                                className="btn btn-secondary btn-sm h-10 px-4 gap-2 hover:bg-[var(--bg-hover)]"
                            >
                                <X size={18} />
                                <span className="hidden sm:inline">Close</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 bg-[var(--bg-surface)] relative">
                        <iframe srcDoc={portfolioHtml} className="w-full h-full border-0" title="Portfolio Preview" />
                    </div>
                </div>,
                document.body
            )}

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
