import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import useWorkflow from "../hooks/useWorkflow";
import { generateResume, generatePDF, modifyResume } from "../api/resumeApi";
import { Download, Edit3, Palette, X, Send, ArrowLeft, Loader2, FileText, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useRecoilState, useSetRecoilState } from "recoil";
import { resumeAtom } from "../recoil/resumeAtom";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import ReviewDialog from "../components/ReviewDialog";
import useReviewStatus from "../hooks/useReviewStatus";

export default function ResumeBuilder() {
    const location = useLocation();
    const navigate = useNavigate();
    const { advanceStep, interviewId } = useWorkflow();
    const [resumeState, setResumeState] = useRecoilState(resumeAtom);
    const setHistory = useSetRecoilState(resumeHistoryAtom);
    const { reviewOpen, setReviewOpen, openReviewIfNew } = useReviewStatus();



    const { selectedHighlights = [], method = "auto", industry = "tech", pending = false } = location.state || {};

    const [loading, setLoading] = useState(false);

    const [theme, setTheme] = useState({
        primary: "#10b981",
        text: "#111827",
        muted: "#6b7280",
    });

    const resumeData = resumeState.resumeData;
    const htmlContent = resumeState.htmlContent;

    const [editorContent, setEditorContent] = useState("");
    const [isModifying, setIsModifying] = useState(false);

    const [pdfUrl, setPdfUrl] = useState(null);
    const hasFetched = useRef(false);

    // Clean up PDF URLs only on component unmount
    useEffect(() => {
        return () => {
            if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
        };
    }, []); // Only on unmount

    // Create Blob URL whenever pdfBase64 changes in state
    useEffect(() => {
        if (resumeState.pdfBase64) {
            try {
                const byteCharacters = atob(resumeState.pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                setPdfUrl(url);
            } catch (err) {
                console.error("Error creating PDF Blob:", err);
            }
        }
    }, [resumeState.pdfBase64]);

    useEffect(() => {
        if (!interviewId && !resumeState.pdfBase64 && !resumeState.resumeData) {
            return;
        }

        // Trigger initial AI generation if we have an interview but no resume yet
        if ((pending || (!resumeState.resumeData)) && !hasFetched.current && interviewId) {
            hasFetched.current = true;
            handleGenerateResume();
        }
        // OR: If we have data (e.g. from history) but no PDF viewer URL, generate it locally
        else if (resumeState.resumeData && !resumeState.pdfBase64 && !pdfUrl && !loading) {
            updatePdfWithTheme();
        }
    }, [interviewId, resumeState.pdfBase64, resumeState.resumeData, pdfUrl]);

    // Sync theme when loading from history or state changes
    useEffect(() => {
        if (resumeState.theme) {
            setTheme(resumeState.theme);
        }
    }, [resumeState.theme]);

    // Manual theme color apply via button now

    const updatePdfWithTheme = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
            // We need an endpoint that just regenerates PDF without AI
            const response = await fetch(`${API_BASE_URL}/generatePDF`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ resumeData, theme: theme, format: "pdf" }),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                setPdfUrl(url);
                // PERSIST theme to global state
                setResumeState(prev => ({
                    ...prev,
                    theme: theme,
                    pdfBase64: null
                }));
            }
        } catch (err) {
            console.error("Theme update PDF failed:", err);
            toast.error("Color sync failed. Check server.");
        }
    };

    const handleGenerateResume = async () => {
        setLoading(true);
        try {
            const res = await generateResume({
                interviewId,
                preference: "ats_friendly",
                selectedHighlights,
            });

            if (res && res.layout) {
                if (res.historyId) {
                    setHistory(prev => ({
                        ...prev,
                        resumes: [
                            {
                                id: res.historyId,
                                title: res.layout.data.personalInfo?.name || "New Resume",
                                createdAt: new Date(),
                                type: 'resume-html'
                            },
                            ...prev.resumes.filter(r => r.id !== res.historyId)
                        ],
                        refreshTrigger: prev.refreshTrigger + 1
                    }));
                }
                setResumeState(prev => ({
                    ...prev,
                    resumeData: res.layout.data,
                    htmlContent: res.layout.htmlContent,
                    pdfBase64: res.layout.pdfBase64,
                    historyId: res.historyId || prev.historyId
                }));
            } else {
                toast.error("Resume generation failed.");
                navigate("/analysis");
            }
        } catch (err) {
            console.error("Resume generation error:", err);
            toast.error("Resume generation failed: " + (err.message || "Unknown error"));
            navigate("/analysis");
        } finally {
            setLoading(false);
        }
    };

    const applyGeneralModification = async () => {
        if (!editorContent.trim() || !resumeData) return;

        setIsModifying(true);
        try {
            const result = await modifyResume(editorContent, "all", resumeData, theme, null, null);

            if (result && result.layout) {
                if (result.historyId) {
                    setHistory(prev => {
                        const existingIdx = prev.resumes.findIndex(r => r.id === result.historyId);
                        const newEntry = {
                            id: result.historyId,
                            title: (result.layout.data.personalInfo?.name || "Resume") + " (Modified)",
                            createdAt: new Date(),
                            type: 'resume-html'
                        };
                        
                        let newList = [...prev.resumes];
                        if (existingIdx !== -1) {
                            newList[existingIdx] = newEntry; // Update existing
                        } else {
                            newList = [newEntry, ...newList]; // Prepend new
                        }
                        
                        return { ...prev, resumes: newList, refreshTrigger: prev.refreshTrigger + 1 };
                    });
                }
                setResumeState(prev => ({
                    ...prev,
                    resumeData: result.layout.data,
                    htmlContent: result.layout.htmlContent,
                    pdfBase64: result.layout.pdfBase64
                }));
                setEditorContent("");
                toast.success("Resume modified successfully!");
            }
        } catch (error) {
            console.error("General text modification failed:", error);
            toast.error("Modification failed: " + (error.message || "Unknown error"));
        } finally {
            setIsModifying(false);
        }
    };


    const handleDownloadPDF = async () => {
        if (!resumeData) {
            toast.error("Resume data not ready. Please try again.");
            return;
        }

        setLoading(true);
        try {
            // Use fetch directly so we can handle binary blob response
            const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
            const response = await fetch(`${API_BASE_URL}/generatePDF`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ resumeData, theme, format: "pdf" }),
            });

            if (!response.ok) throw new Error("PDF generation failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${resumeData.personalInfo?.name || "Resume"}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success("PDF downloaded!");
            openReviewIfNew("resume");
        } catch (error) {
            console.error("PDF download error:", error);
            toast.error("PDF generation failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !htmlContent) {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">Building Your Resume</h3>
                    <p className="text-[var(--text-muted)]">Please wait while we create your professional resume...</p>
                </div>
            </div>
        );
    }

    if (!htmlContent && !resumeData && !loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center shadow-xl">
                    <div className="w-16 h-16 bg-[var(--brand-50)] dark:bg-[var(--brand-500)]/10 text-[var(--brand-500)] rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Ready to Build?</h2>
                    <p className="text-[var(--text-muted)] mb-8">
                        You don't have an active resume session. Start a new one or continue where you left off.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => navigate("/interview-level")}
                            className="w-full px-6 py-3.5 rounded-xl bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white font-medium flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                        >
                            <Sparkles size={18} /> Create New Resume
                        </button>
                        <button 
                            onClick={() => navigate("/dashboard")}
                            className="w-full px-6 py-3.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-highlight)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium transition-all"
                        >
                            <FileText size={18} className="inline-block mr-2 text-[var(--text-muted)] -mt-0.5" />
                            Select Previous Resume
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <ReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} type="resume" />

            {/* Header */}
            <header className="sticky top-0 z-10 backdrop-blur bg-[var(--bg-base)]/70 border-b border-[var(--border-subtle)]">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="font-semibold text-lg">Resume Builder</div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/analysis")}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-base)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 transition-colors"
                        >
                            <Download size={16} />
                            {loading ? "Generating..." : "Download PDF"}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-140px)]">
                    {/* Left - Resume Preview */}
                    <div className="lg:col-span-2 h-[600px] lg:h-full">
                        <div className="h-full flex flex-col border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-surface)] relative">
                            <div className="bg-[var(--bg-elevated)] p-3 text-sm text-[var(--text-secondary)] flex justify-between items-center shrink-0 border-b border-[var(--border-subtle)]">
                                <span>Professional PDF Preview</span>
                                <span className={`text-xs px-2 py-1 rounded bg-emerald-600/20 text-emerald-400`}>
                                    Ready for Download
                                </span>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                {pdfUrl ? (
                                    <iframe
                                        key={pdfUrl}
                                        src={pdfUrl ? `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0` : "about:blank"}
                                        className="w-full h-full border-0 bg-white"
                                        title="Professional Resume PDF"
                                        onError={() => toast.error("PDF Preview failed to load.")}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                        <div className="text-center">
                                            <Loader2 className="animate-spin mx-auto mb-2 text-emerald-500" />
                                            <p>Preparing PDF View...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-4 lg:h-full overflow-y-auto pb-6">
                        {/* Theme Color */}
                        <div className="p-5 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Palette size={16} />
                                    <h3 className="font-semibold text-[var(--text-primary)]">Theme Color</h3>
                                </div>
                                <button
                                    onClick={updatePdfWithTheme}
                                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow shadow-emerald-900"
                                >
                                    Apply Color
                                </button>
                            </div>
                            <div className="flex items-center gap-3 bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--border-subtle)] focus-within:border-[var(--brand-500)] transition-colors">
                                <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0 border border-[var(--border-base)] shadow-inner">
                                    <input
                                        type="color"
                                        value={theme.primary}
                                        onChange={(e) => setTheme((prev) => ({ ...prev, primary: e.target.value }))}
                                        className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 m-0 border-0 outline-none"
                                        title="Choose color"
                                    />
                                </div>
                                <div className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-widest">{theme.primary}</div>
                            </div>
                        </div>

                        {/* Global AI Edit Panel */}
                        <div className="p-5 border border-[var(--emerald-500)]/30 rounded-xl bg-[var(--emerald-500)]/10 flex flex-col">
                            <div className="flex items-center justify-between mb-3 shrink-0">
                                <h3 className="font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-2">
                                    <Sparkles size={16} /> Refine Resume with AI
                                </h3>
                            </div>
                            <textarea
                                value={editorContent}
                                onChange={(e) => setEditorContent(e.target.value)}
                                className="w-full min-h-[80px] p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg text-sm mb-3 text-[var(--text-primary)] placeholder-[var(--text-disabled)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                                placeholder={`How should we modify your resume? e.g. "Make it sound more professional" or "Rewrite the summary to emphasize leadership"`}
                            />
                            <button
                                onClick={applyGeneralModification}
                                disabled={isModifying || !editorContent.trim()}
                                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shrink-0 shadow-lg shadow-emerald-900/20"
                            >
                                {isModifying ? (
                                    <><Loader2 className="animate-spin" size={16} /> Applying Changes...</>
                                ) : (
                                    <><Send size={16} /> Apply Changes</>
                                )}
                            </button>
                        </div>

                        {/* ATS Compliance */}
                        <div className="p-5 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)]">
                            <h3 className="font-semibold mb-3 text-emerald-600 dark:text-emerald-400">✓ ATS Compatible</h3>
                            <ul className="text-xs text-[var(--text-muted)] space-y-1.5">
                                <li>• Single column layout</li>
                                <li>• Standard ATS fonts</li>
                                <li>• Selectable text format</li>
                                <li>• No complex tables/graphics</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
