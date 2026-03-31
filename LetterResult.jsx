import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRecoilState } from "recoil";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { modifyLetter, getUserResumes } from "../api/resumeApi";
import { ArrowLeft, FileText, Copy, Check, Download, Wand2, Loader2, PenLine, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import ReviewDialog from "../components/ReviewDialog";
import useReviewStatus from "../hooks/useReviewStatus";

export default function LetterResult() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [history, setHistory] = useRecoilState(resumeHistoryAtom);
    const [loading, setLoading] = useState(true);

    const [letterText, setLetterText] = useState("");
    const [sourceData, setSourceData] = useState(null);

    const [copied, setCopied] = useState(false);
    const [modifyInstruction, setModifyInstruction] = useState("");
    const [modifying, setModifying] = useState(false);
    const { reviewOpen, setReviewOpen, openReviewIfNew } = useReviewStatus();

    // Fetch history if empty (e.g., hard refresh on this page)
    useEffect(() => {
        let mounted = true;
        async function fetchHistory() {
            setLoading(true); // Always start with loading true when id changes or item not found
            try {
                const data = await getUserResumes();
                if (!mounted) return;
                const mapped = (Array.isArray(data) ? data : []).map(item => ({
                    id: String(item._id || item.id), // Stringify for comparison
                    title: item.title || "Untitled Letter",
                    createdAt: item.createdAt,
                    type: item.type,
                    sourceData: item.sourceData
                }));
                setHistory(prev => ({ ...prev, resumes: mapped }));
            } catch (err) {
                console.error("Failed to load history", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        
        // If we don't have the current item in memory, fetch it
        const hasItem = history.resumes.some(r => String(r.id) === String(id));
        if (!hasItem) {
            fetchHistory();
        } else {
            setLoading(false);
        }
        
        return () => { mounted = false; };
    }, [id, setHistory]); // Depend on ID specifically
    // Load active letter
    useEffect(() => {
        if (loading) return;
        
        console.log("Looking for letter with ID:", id, "in history of size:", history.resumes.length);
        const letterItem = history.resumes.find(r => String(r.id) === String(id) && r.type === "letter");
        
        if (!letterItem) {
            // Only error out if we are definitely done loading and still don't have it
            if (!loading) {
                toast.error("Letter not found.");
                navigate("/letter");
            }
            return;
        }

        // Check for letterText in different possible nesting levels
        const extractedText = letterItem.sourceData?.letterText || letterItem.letterText || "";
        
        if (!extractedText && !loading) {
            // If we have an item but NO text at all, then it's actually missing
            toast.error("Letter text is missing.");
            // navigate("/letter"); // Don't navigate away yet, maybe user wants to see what's there
            return;
        }

        setLetterText(extractedText);
        setSourceData(letterItem.sourceData || {});
    }, [id, history.resumes, loading, navigate]);


    // ── AI Modify ─────────────────────────────────────────────────────────────
    const handleModify = async () => {
        if (!modifyInstruction.trim()) return toast.error("Enter a modification instruction.");

        setModifying(true);
        try {
            const res = await modifyLetter(letterText, modifyInstruction);
            if (res?.success && res?.letterText) {
                const newText = res.letterText;
                setLetterText(newText);
                setModifyInstruction("");
                
                // Optimistically update Recoil history so it persists
                setHistory(prev => ({
                    ...prev,
                    resumes: prev.resumes.map(r => 
                        r.id === id 
                        ? { ...r, sourceData: { ...r.sourceData, letterText: newText } } 
                        : r
                    )
                }));
                toast.success("Letter updated!");
            } else {
                toast.error(res?.error || "Modification failed.");
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setModifying(false);
        }
    };

    // ── Copy ──────────────────────────────────────────────────────────────────
    const handleCopy = () => {
        navigator.clipboard.writeText(letterText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard!");
        openReviewIfNew("letter");
    };

    // ── Download ──────────────────────────────────────────────────────────────
    const handleDownload = () => {
        const blob = new Blob([letterText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeSubject = (sourceData?.subject || "Letter").replace(/\s+/g, "_").slice(0, 30);
        a.download = `Letter_${safeSubject}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Downloaded!");
    };

    if (loading || !letterText) {
        return (
            <div className="flex h-[calc(100vh-80px)] items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[var(--brand-500)]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <ReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} type="letter" />
            <header className="sticky top-0 z-10 backdrop-blur bg-[var(--bg-base)]/80 border-b border-[var(--border-subtle)]">
                <div className="page-wrapper py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/letter")} className="btn btn-ghost btn-sm gap-2">
                            <ArrowLeft size={16} /> New Letter
                        </button>
                        <div className="h-5 w-px bg-[var(--border-subtle)]" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-500)]/15 flex items-center justify-center">
                                <FileText size={16} className="text-[var(--brand-400)]" />
                            </div>
                            <span className="font-semibold">{sourceData?.letterType ? sourceData.letterType.charAt(0).toUpperCase() + sourceData.letterType.slice(1) : ""} Letter</span>
                        </div>
                    </div>
                    <span className="badge badge-brand"><Sparkles size={12} className="mr-1" /> AI Generated</span>
                </div>
            </header>

            <main className="page-wrapper py-8 pb-16">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight mb-2 font-playfair">
                                Your <span className="gradient-text">Generated Letter</span>
                            </h1>
                            <p className="text-[var(--text-secondary)]">
                                Subject: <strong>{sourceData?.subject}</strong>
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleCopy} className="btn btn-secondary gap-2">
                                {copied ? <><Check size={16} className="text-[var(--emerald-500)]" /> Copied</> : <><Copy size={16} /> Copy Text</>}
                            </button>
                            <button onClick={handleDownload} className="btn gap-2" style={{ background: "linear-gradient(135deg, var(--emerald-400), var(--emerald-600))", color: "white" }}>
                                <Download size={16} /> Download .txt
                            </button>
                        </div>
                    </div>

                    {/* ── Modify with AI Module ─────────────────────────────────── */}
                    <div className="glass-panel p-6 rounded-2xl border border-[var(--border-subtle)] mb-8">
                        <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 mb-3">
                            <Wand2 size={18} className="text-[var(--brand-400)]" />
                            Iterate & Refine
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            Describe what you'd like to change to instantly rewrite the letter.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={modifyInstruction}
                                onChange={e => setModifyInstruction(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && !modifying && handleModify()}
                                placeholder='e.g. "Make it shorter", "Be more polite", "Add a sentence about my portfolio"'
                                className="input flex-1 bg-[var(--bg-elevated)]"
                            />
                            <button
                                onClick={handleModify}
                                disabled={modifying || !modifyInstruction.trim()}
                                className="btn px-6 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 sm:w-auto w-full"
                                style={{ background: "linear-gradient(135deg, var(--brand-400), var(--brand-600))" }}
                            >
                                {modifying ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                {modifying ? "Updating..." : "Apply Revisions"}
                            </button>
                        </div>
                    </div>

                    {/* ── Visual Document Paper ─────────────────────────────────── */}
                    <div className="relative bg-[var(--bg-surface)] rounded-2xl shadow-xl overflow-hidden border border-[var(--border-subtle)] pt-1">
                        <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: "linear-gradient(90deg, var(--brand-400), var(--emerald-400))" }} />
                        <div className="p-8 md:p-14 relative selection:bg-[var(--brand-500)]/30">
                            
                            {/* Watermark icon */}
                            <div className="absolute top-8 right-10 opacity-[0.03] pointer-events-none">
                                <PenLine size={120} />
                            </div>

                            <article className="relative z-10 whitespace-pre-wrap text-[var(--text-primary)] text-[15px] md:text-base font-medium leading-relaxed font-[inherit]">
                                {letterText}
                            </article>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
