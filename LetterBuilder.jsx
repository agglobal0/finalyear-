import { useState, useEffect } from "react";
import { useRecoilState } from "recoil";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { generateLetter, checkLetterMissingInfo, getUserResumes, deleteResume } from "../api/resumeApi";
import { Link, useNavigate } from "react-router-dom";
import {
    PenLine, Sparkles, Loader2, Trash2, Clock, ChevronRight, FileText, Mail, User, Building, MapPin, Phone, Calendar, ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const LETTER_TYPES = [
    { id: "formal", label: "Formal", emoji: "📋" },
    { id: "informal", label: "Informal", emoji: "💬" },
    { id: "resignation", label: "Resignation", emoji: "🚪" },
    { id: "recommendation", label: "Recommendation", emoji: "⭐" },
    { id: "complaint", label: "Complaint", emoji: "⚠️" },
    { id: "thank-you", label: "Thank-You", emoji: "🙏" },
    { id: "apology", label: "Apology", emoji: "🤝" },
    { id: "business", label: "Business", emoji: "💼" },
];

const TONES = [
    { id: "professional", label: "Professional" },
    { id: "friendly", label: "Friendly" },
    { id: "assertive", label: "Assertive" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function LetterBuilder() {
    const navigate = useNavigate();

    // Form state
    const [letterType, setLetterType] = useState("formal");
    const [tone, setTone] = useState("professional");
    const [yourName, setYourName] = useState("");
    const [subject, setSubject] = useState("");
    const [context, setContext] = useState("");

    // Contact form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [senderAddress, setSenderAddress] = useState("");
    const [senderPhone, setSenderPhone] = useState("");
    const [senderEmail, setSenderEmail] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [recipientTitle, setRecipientTitle] = useState("");
    const [recipientAddress, setRecipientAddress] = useState("");

    // Output state
    const [generating, setGenerating] = useState(false);
    const [checkingInfo, setCheckingInfo] = useState(false);

    // Modal state
    const [showMissingModal, setShowMissingModal] = useState(false);
    const [missingFields, setMissingFields] = useState([]);
    const [additionalContext, setAdditionalContext] = useState("");

    // History state
    const [history, setHistory] = useRecoilState(resumeHistoryAtom);
    const [deletingId, setDeletingId] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(true);

    // Dynamic visibility
    const isFormal = letterType !== "informal" && letterType !== "thank-you" && tone !== "friendly";

    // Load letter history
    useEffect(() => {
        let mounted = true;
        async function load() {
            setHistoryLoading(true);
            try {
                const data = await getUserResumes();
                if (!mounted) return;
                const mapped = (Array.isArray(data) ? data : []).map(item => ({
                    id: item._id || item.id,
                    title: item.title || "Untitled Letter",
                    createdAt: item.createdAt,
                    type: item.type,
                    sourceData: item.sourceData
                }));
                setHistory(prev => ({ ...prev, resumes: mapped }));
            } catch (err) {
                // silent
            } finally {
                if (mounted) setHistoryLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [setHistory]);

    const letterHistory = history.resumes.filter(r => r.type === "letter");

    // ── Generate Logic ────────────────────────────────────────────────────────
    const handleCheckMissingInfo = async () => {
        if (!yourName.trim()) return toast.error("Your name is required.");
        if (!subject.trim()) return toast.error("Subject is required.");

        setCheckingInfo(true);
        try {
            const res = await checkLetterMissingInfo({ letterType, tone, subject, context, yourName, recipientName });
            if (res?.success && res.missingFields?.length > 0) {
                setMissingFields(res.missingFields);
                setShowMissingModal(true);
            } else {
                handleGenerateLetter(); // everything good
            }
        } catch (err) {
            handleGenerateLetter(); // Skip modal if failure
        } finally {
            setCheckingInfo(false);
        }
    };

    const handleGenerateLetter = async () => {
        setGenerating(true);
        setShowMissingModal(false);
        try {
            const finalContext = context + (additionalContext ? "\n\n" + additionalContext : "");

            const res = await generateLetter({
                letterType, tone, yourName, recipientName, recipientTitle,
                subject, context: finalContext, date, senderAddress, senderPhone, senderEmail, recipientAddress
            });

            if (res?.success && res?.letterText) {
                setHistory(prev => ({
                    ...prev,
                    resumes: [
                        {
                            id: res.historyId,
                            title: `${letterType.charAt(0).toUpperCase() + letterType.slice(1)} Letter — ${subject}`,
                            createdAt: new Date(),
                            type: "letter",
                            sourceData: { letterType, tone, yourName, recipientName, recipientTitle, subject, context: finalContext, date, senderAddress, senderPhone, senderEmail, recipientAddress, letterText: res.letterText }
                        },
                        ...prev.resumes
                    ]
                }));
                toast.success("Letter generated!");
                navigate(`/letter/${res.historyId}`);
            } else {
                toast.error(res?.error || "Generation failed. Try again.");
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setGenerating(false);
            setAdditionalContext("");
        }
    };

    // ── Delete history item ────────────────────────────────────────────────────
    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete this letter from history?")) return;
        setDeletingId(id);
        try {
            await deleteResume(id);
            setHistory(prev => ({ ...prev, resumes: prev.resumes.filter(r => r.id !== id) }));
            toast.success("Letter deleted.");
        } catch (err) {
            toast.error("Failed to delete.");
        } finally {
            setDeletingId(null);
        }
    };

    // ── Restore from history ───────────────────────────────────────────────────
    const handleHistoryClick = (item) => {
        navigate(`/letter/${item.id}`);
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-10 animate-fade-in-up pb-10">

            {/* ── Header Panel ─────────────────────────────────────────────── */}
            <div className="glass-panel relative overflow-hidden p-8 md:p-12 shadow-lg w-full max-w-5xl mx-auto">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--brand-500)]/10 blur-[100px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-[var(--emerald-500)]/8 blur-[80px] rounded-full pointer-events-none -z-10" />

                <div className="flex items-center justify-between mb-4">
                    <button 
                        onClick={() => navigate("/")} 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-xs font-bold uppercase tracking-wider group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>
                    <span className="badge badge-brand"><Sparkles size={14} /> AI Powered</span>
                </div>

                <h1 className="text-3xl lg:text-5xl font-extrabold mb-3 text-[var(--text-primary)] tracking-tight font-playfair">
                    Letter Builder
                </h1>
                <p className="text-[var(--text-secondary)] font-light text-lg mb-8 max-w-2xl leading-relaxed">
                    Generate any type of letter in seconds. Choose your style, fill in the details, and let AI craft the perfect, perfectly-formatted message.
                </p>

                {/* ── Letter Type Selector ──────────────────────────────── */}
                <div className="mb-6">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Letter Type</p>
                    <div className="flex flex-wrap gap-2">
                        {LETTER_TYPES.map(lt => (
                            <button
                                key={lt.id}
                                onClick={() => setLetterType(lt.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all flex items-center gap-1.5 ${letterType === lt.id
                                        ? "bg-[var(--brand-500)] text-white border-[var(--brand-500)] shadow-md"
                                        : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--brand-300)] hover:text-[var(--brand-500)]"
                                    }`}
                            >
                                <span>{lt.emoji}</span> {lt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Tone Selector ─────────────────────────────────────── */}
                <div className="mb-8">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Tone</p>
                    <div className="flex gap-2">
                        {TONES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTone(t.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${tone === t.id
                                        ? "bg-[var(--emerald-500)] text-white border-[var(--emerald-500)] shadow-md"
                                        : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--emerald-400)] hover:text-[var(--emerald-500)]"
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Core Input Fields ──────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                            Your Name <span className="text-[var(--rose-400)]">*</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text"
                                value={yourName}
                                onChange={e => setYourName(e.target.value)}
                                placeholder="e.g. John Smith"
                                className="input pl-9 bg-[var(--bg-surface)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                            Date <span className="text-[var(--brand-500)]">(auto)</span>
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="input pl-9 bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                            Subject <span className="text-[var(--rose-400)]">*</span>
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="e.g. Application for Software Engineer role"
                                className="input pl-9 bg-[var(--bg-surface)]"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Dynamic Contact Info Fields ──────────────────────────────────────── */}
                <div className="mt-8 border-t border-[var(--border-subtle)] pt-6">
                    <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">Sender Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {isFormal && (
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Your Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                    <input type="text" value={senderAddress} onChange={e => setSenderAddress(e.target.value)} placeholder="123 Main St, NY" className="input pl-9 bg-[var(--bg-surface)]" />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Your Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                <input type="text" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="(555) 123-4567" className="input pl-9 bg-[var(--bg-surface)]" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Your Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="you@email.com" className="input pl-9 bg-[var(--bg-surface)]" />
                            </div>
                        </div>
                    </div>

                    <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">Recipient Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Recipient Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. Sarah Johnson" className="input pl-9 bg-[var(--bg-surface)]" />
                            </div>
                        </div>
                        {isFormal && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Recipient Title / Company</label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                        <input type="text" value={recipientTitle} onChange={e => setRecipientTitle(e.target.value)} placeholder="e.g. HR Manager, Google" className="input pl-9 bg-[var(--bg-surface)]" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Recipient Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                        <input type="text" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} placeholder="1600 Amphitheatre Pkwy" className="input pl-9 bg-[var(--bg-surface)]" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="mb-6 mt-6">
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                        Context / Key Points
                        <span className="ml-2 text-[var(--text-disabled)] normal-case font-normal">(optional — more detail = better letter)</span>
                    </label>
                    <textarea
                        value={context}
                        onChange={e => setContext(e.target.value)}
                        rows={5}
                        className="input resize-y text-sm bg-[var(--bg-surface)]"
                        placeholder="Describe what you want to communicate. E.g. reasons for resignation, specific achievements to highlight, details of the complaint..."
                    />
                </div>

                <button
                    onClick={handleCheckMissingInfo}
                    disabled={checkingInfo || generating || !yourName.trim() || !subject.trim()}
                    className="btn py-4 px-10 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg w-full md:w-auto"
                    style={{ background: "linear-gradient(135deg, var(--brand-400), var(--brand-600))" }}
                >
                    {checkingInfo ? <><Loader2 size={18} className="animate-spin" /> Verifying Details...</>
                        : generating ? <><Loader2 size={18} className="animate-spin" /> Writing Letter...</>
                            : <><PenLine size={18} /> Generate Perfect Letter</>
                    }
                </button>
            </div>

            {/* ── History Section ──────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-2 mb-6">
                    <Clock size={20} className="text-[var(--text-muted)]" />
                    <h2 className="text-xl font-bold font-playfair tracking-tight text-[var(--text-primary)]">
                        Letter History
                    </h2>
                </div>

                {historyLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="shimmer rounded-[var(--radius-lg)] h-36 border border-[var(--border-subtle)]" />
                        ))}
                    </div>
                ) : letterHistory.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-[var(--radius-xl)] bg-[var(--bg-surface)] max-w-xl mx-auto">
                        <div className="w-14 h-14 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--text-disabled)] border border-[var(--border-subtle)]">
                            <PenLine size={24} />
                        </div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No letters yet</h3>
                        <p className="text-sm text-[var(--text-muted)]">Generate your first letter above and it will appear here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {letterHistory.map(item => (
                            <div
                                key={item.id}
                                onClick={() => handleHistoryClick(item)}
                                className="card group cursor-pointer flex flex-col h-44 hover:-translate-y-1 transition-all relative overflow-hidden"
                            >
                                <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, var(--brand-400), var(--emerald-400))" }} />
                                <div className="h-14 w-full bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-highlight)] relative flex items-center px-4 border-b border-[var(--border-subtle)]">
                                    <PenLine size={18} className="text-[var(--brand-400)]" />
                                    <div className="absolute -bottom-2 -right-2 text-[var(--border-strong)] opacity-10">
                                        <PenLine size={48} />
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                                        <button
                                            onClick={e => handleDelete(e, item.id)}
                                            disabled={deletingId === item.id}
                                            className="p-1.5 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-red-500 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete"
                                        >
                                            {deletingId === item.id
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <Trash2 size={12} />
                                            }
                                        </button>
                                        <div className="p-1.5 bg-[var(--bg-surface)] rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight size={12} className="text-[var(--brand-500)]" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 leading-tight mb-auto group-hover:text-[var(--brand-500)] transition-colors">
                                        {item.title}
                                    </h3>
                                    <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                        <Clock size={11} />
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Missing Info Modal ─────────────────────────────────────── */}
            {showMissingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl border border-[var(--border-subtle)] relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-500)]/10 blur-[40px] pointer-events-none rounded-full" />

                        <div className="flex items-center gap-3 mb-4 text-[var(--brand-400)]">
                            <Sparkles size={24} />
                            <h3 className="text-xl font-bold text-[var(--text-primary)] font-playfair">AI Review</h3>
                        </div>

                        <p className="text-[var(--text-secondary)] text-sm mb-4">
                            The AI can generate a more complete letter if you provide the following missing details:
                        </p>

                        <ul className="mb-4 pl-5 list-disc text-sm text-[var(--brand-300)] space-y-1">
                            {missingFields.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>

                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                Add Missing Details
                            </label>
                            <textarea
                                value={additionalContext}
                                onChange={e => setAdditionalContext(e.target.value)}
                                rows={3}
                                className="input text-sm bg-[var(--bg-elevated)]"
                                placeholder="E.g. The issue occurred on Tuesday, or I am resigning due to a new opportunity..."
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 translate-y-2">
                            <button
                                onClick={handleGenerateLetter}
                                className="btn btn-secondary border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                Skip & Generate
                            </button>
                            <button
                                onClick={handleGenerateLetter}
                                disabled={generating}
                                className="btn btn-primary shadow-lg"
                            >
                                {generating ? <Loader2 size={16} className="animate-spin" /> : "Include & Generate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
