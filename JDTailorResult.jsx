import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRecoilState, useSetRecoilState } from "recoil";
import { resumeAtom } from "../recoil/resumeAtom";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { ArrowLeft, Target, Copy, Check, Sparkles, Wand2, Loader2, CheckCircle, X, ChevronRight, LayoutTemplate } from "lucide-react";
import { applyTailoredResume } from "../api/resumeApi";
import toast from "react-hot-toast";

const Section = ({ label, original, tailored }) => {
    const [copied, setCopied] = useState(false);

    const getText = (val) => {
        if (!val) return "";
        if (typeof val === "string") return val;
        if (Array.isArray(val)) return val.join(", ");
        return JSON.stringify(val);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getText(tailored));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)] capitalize">{label}</h3>
                <button onClick={handleCopy} className="btn btn-secondary btn-sm gap-1.5">
                    {copied ? <><Check size={13} className="text-[var(--emerald-500)]" /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                    <p className="section-label mb-2 text-rose-400">Original</p>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{getText(original)}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--emerald-500)]/5 border border-[var(--emerald-500)]/20">
                    <p className="section-label mb-2 text-[var(--emerald-500)]">Tailored ✦</p>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">{getText(tailored)}</p>
                </div>
            </div>
        </div>
    );
};

// Change summary item inside the dialog
const ChangeLine = ({ label, changed }) => (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${changed ? 'border-[var(--emerald-500)]/30 bg-[var(--emerald-500)]/5' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] opacity-50'}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${changed ? 'bg-[var(--emerald-500)]/20 text-[var(--emerald-400)]' : 'bg-[var(--bg-elevated)] text-[var(--text-disabled)]'}`}>
            {changed ? <CheckCircle size={14} /> : <X size={14} />}
        </div>
        <div>
            <p className={`text-sm font-medium ${changed ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{label}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{changed ? 'Will be updated with AI improvements' : 'No changes detected'}</p>
        </div>
    </div>
);

export default function JDTailorResult() {
    const navigate = useNavigate();
    const location = useLocation();
    const [resumeState, setResumeState] = useRecoilState(resumeAtom);
    const setHistory = useSetRecoilState(resumeHistoryAtom);
    const { tailoredResult, jobDescription, resumeData } = location.state || {};

    const [showApplyDialog, setShowApplyDialog] = useState(false);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);

    useEffect(() => {
        if (!tailoredResult || !resumeData) {
            navigate("/career/jd-tailor");
        }
    }, [tailoredResult, resumeData, navigate]);

    if (!tailoredResult || !resumeData) return null;

    // Compute what will change
    const changes = {
        summary: !!(tailoredResult.summary && tailoredResult.summary !== resumeData.summary),
        technicalSkills: !!(tailoredResult.skills?.technical?.length),
        softSkills: !!(tailoredResult.skills?.soft?.length),
        tools: !!(tailoredResult.skills?.tools?.length),
        experience: !!(tailoredResult.experience?.some((e, i) => e.achievements?.join() !== resumeData.experience?.[i]?.achievements?.join())),
    };
    const totalChanges = Object.values(changes).filter(Boolean).length;

    const handleApply = async () => {
        setApplying(true);
        try {
            const currentTheme = resumeState.theme || { primary: '#2563eb' };
            const result = await applyTailoredResume(resumeData, tailoredResult, jobDescription, currentTheme);

            if (result?.success) {
                // Update Recoil state so the resume builder instantly has the new data
                setResumeState(prev => ({
                    ...prev,
                    resumeData: result.resumeData,
                    htmlContent: result.layout?.htmlContent || prev.htmlContent,
                    historyId: result.historyId,
                    parentHistoryId: result.historyId,
                }));
                // Trigger history sidebar reload
                setHistory(prev => ({ ...prev, refreshTrigger: prev.refreshTrigger + 1 }));
                setApplied(true);
                toast.success("Tailored resume applied successfully!");
            } else {
                toast.error(result?.error || "Failed to apply changes.");
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            {/* Header */}
            <header className="sticky top-0 z-10 backdrop-blur bg-[var(--bg-base)]/80 border-b border-[var(--border-subtle)]">
                <div className="page-wrapper py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/career/jd-tailor", { state: { jobDescription } })} className="btn btn-ghost btn-sm gap-2">
                            <ArrowLeft size={16} /> Edit JD
                        </button>
                        <div className="h-5 w-px bg-[var(--border-subtle)]" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--emerald-500)]/15 flex items-center justify-center">
                                <Target size={16} className="text-[var(--emerald-400)]" />
                            </div>
                            <span className="font-semibold">Tailored Result</span>
                        </div>
                    </div>
                    <span className="badge badge-emerald">Optimized</span>
                </div>
            </header>

            <main className="page-wrapper py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                                Your <span className="gradient-text-emerald">Tailored Resume</span>
                            </h1>
                            <p className="text-[var(--text-secondary)]">
                                Review the AI-optimized changes below, then apply them to your resume in one click.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
                                Based on Job Description
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {tailoredResult.summary && (
                            <Section label="Professional Summary" original={resumeData.summary} tailored={tailoredResult.summary} />
                        )}
                        
                        {(tailoredResult.skills?.technical || tailoredResult.skills?.soft || tailoredResult.skills?.tools) && (
                            <div className="grid grid-cols-1 gap-6">
                                {tailoredResult.skills?.technical && (
                                    <Section label="Technical Skills" original={resumeData.skills?.technical} tailored={tailoredResult.skills.technical} />
                                )}
                                {tailoredResult.skills?.soft && (
                                    <Section label="Soft Skills" original={resumeData.skills?.soft} tailored={tailoredResult.skills.soft} />
                                )}
                                {tailoredResult.skills?.tools && (
                                    <Section label="Tools & Technologies" original={resumeData.skills?.tools} tailored={tailoredResult.skills.tools} />
                                )}
                            </div>
                        )}

                        {tailoredResult.experience?.map((exp, i) => (
                            <Section
                                key={i}
                                label={`Experience: ${exp.role || exp.company || `Role ${i + 1}`}`}
                                original={resumeData.experience?.[i]?.achievements}
                                tailored={exp.achievements}
                            />
                        ))}
                    </div>

                    {/* Apply CTA */}
                    <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-[var(--brand-500)]/5 to-[var(--emerald-500)]/5 border border-[var(--border-subtle)] text-center">
                        <div className="w-12 h-12 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Sparkles size={20} className="text-[var(--brand-400)]" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Ready to apply these improvements?</h3>
                        <p className="text-[var(--text-muted)] mb-6 text-sm max-w-sm mx-auto">
                            Let the AI automatically merge all {totalChanges} improvement{totalChanges !== 1 ? 's' : ''} into your resume — no copy-pasting required.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            {applied ? (
                                <button onClick={() => navigate("/resume")} className="btn px-8 gap-2 text-white font-semibold" style={{ background: "linear-gradient(135deg, var(--emerald-400), var(--emerald-600))" }}>
                                    <LayoutTemplate size={16} /> View Updated Resume <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button onClick={() => setShowApplyDialog(true)} className="btn px-8 gap-2 text-white font-semibold" style={{ background: "linear-gradient(135deg, var(--brand-400), var(--brand-600))" }}>
                                    <Wand2 size={16} /> Apply {totalChanges} Change{totalChanges !== 1 ? 's' : ''} to Resume
                                </button>
                            )}
                            <button onClick={() => navigate("/resume")} className="btn btn-ghost px-6 text-sm">
                                Go to Resume Builder
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Apply Dialog Modal ─────────────────────────────────────────── */}
            {showApplyDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !applying && setShowApplyDialog(false)} />
                    <div className="relative bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
                        {/* Dialog Header */}
                        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--brand-500)]/15 flex items-center justify-center">
                                    <Wand2 size={20} className="text-[var(--brand-400)]" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-[var(--text-primary)]">Apply AI Improvements</h2>
                                    <p className="text-xs text-[var(--text-muted)]">{totalChanges} change{totalChanges !== 1 ? 's' : ''} will be applied</p>
                                </div>
                            </div>
                            {!applying && (
                                <button onClick={() => setShowApplyDialog(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Change List */}
                        <div className="p-6 space-y-3">
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                The following sections of your resume will be updated with the AI-tailored content:
                            </p>
                            <ChangeLine label="Professional Summary" changed={changes.summary} />
                            <ChangeLine label="Technical Skills" changed={changes.technicalSkills} />
                            <ChangeLine label="Soft Skills" changed={changes.softSkills} />
                            <ChangeLine label="Tools & Technologies" changed={changes.tools} />
                            <ChangeLine label="Work Experience Bullets" changed={changes.experience} />
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setShowApplyDialog(false)}
                                disabled={applying}
                                className="btn btn-secondary flex-1 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applied ? () => { setShowApplyDialog(false); navigate("/resume"); } : handleApply}
                                disabled={applying}
                                className="btn flex-1 gap-2 text-white font-semibold disabled:opacity-60"
                                style={{ background: "linear-gradient(135deg, var(--brand-400), var(--brand-600))" }}
                            >
                                {applying ? (
                                    <><Loader2 size={16} className="animate-spin" /> Applying...</>
                                ) : applied ? (
                                    <><CheckCircle size={16} /> View Resume</>
                                ) : (
                                    <><Wand2 size={16} /> Apply Now</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
