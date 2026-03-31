import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { resumeAtom } from "../recoil/resumeAtom";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { generateCoverLetter, loadResume } from "../api/resumeApi";
import { ArrowLeft, Mail, FileText, Copy, Check, Download, Loader2, ChevronRight, Building2, Briefcase, History as HistoryIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function CoverLetter() {
    const navigate = useNavigate();
    const resumeState = useRecoilValue(resumeAtom);
    const setResumeState = useSetRecoilState(resumeAtom);
    const setHistory = useSetRecoilState(resumeHistoryAtom);
    const { resumes } = useRecoilValue(resumeHistoryAtom);

    const resumeData = resumeState.resumeData;

    const [companyName, setCompanyName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [showResumePicker, setShowResumePicker] = useState(false);
    const [selectingResumeId, setSelectingResumeId] = useState(null);
    const location = useLocation();

    useEffect(() => {
        if (location.state) {
            if (location.state.companyName) setCompanyName(location.state.companyName);
            if (location.state.jobTitle) setJobTitle(location.state.jobTitle);
            if (location.state.jobDescription) setJobDescription(location.state.jobDescription);
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
                    htmlContent: htmlContent,
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
        if (!companyName.trim() || !jobTitle.trim()) {
            return toast.error("Company name and job title are required.");
        }
        if (!resumeData) return toast.error("No resume found. Please build your resume first.");

        setLoading(true);
        try {
            const res = await generateCoverLetter(resumeData, companyName, jobTitle, jobDescription);
            if (res?.coverLetter && res?.historyId) {
                // Update history state instantly
                setHistory(prev => ({
                    ...prev,
                    resumes: [
                        {
                            id: res.historyId,
                            title: `Cover Letter — ${jobTitle} at ${companyName}`,
                            createdAt: new Date(),
                            type: 'cover-letter'
                        },
                        ...prev.resumes
                    ]
                }));

                toast.success("Cover letter generated!");
                navigate("/career/cover-letter/result", { 
                    state: { 
                        letter: res.coverLetter,
                        companyName,
                        jobTitle
                    } 
                });
            } else {
                toast.error("Generation failed. Try again.");
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };


    const resumeList = resumes.filter(r => r.type === 'resume-html' || r.type === 'resume-pdf' || !r.type);

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
                                <Mail size={16} className="text-[var(--brand-400)]" />
                            </div>
                            <span className="font-semibold">Cover Letter</span>
                        </div>
                    </div>
                    <span className="badge badge-brand hidden sm:flex">AI Writer</span>
                </div>
            </header>

            <main className="page-wrapper py-8">
                {/* Hero */}
                <div className="mb-8 animate-fade-in-up">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                        AI Cover Letter <span className="gradient-text">Generator</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] max-w-xl">
                        Generate a personalized, high-impact cover letter tailored to your target company and role in seconds.
                    </p>
                </div>

                {!resumeData ? (
                    <div className="card p-10 text-center max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
                            <FileText size={28} className="text-[var(--text-muted)]" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">No Resume Found</h2>
                        <p className="text-[var(--text-muted)] mb-6 text-sm">Build your resume first — the AI uses your data to personalize the letter.</p>
                        
                        {!showResumePicker ? (
                            <div className="flex flex-col gap-3">
                                <button onClick={() => navigate("/interview-level")} className="btn btn-primary w-full">
                                    Start Build My Resume <ChevronRight size={16} />
                                </button>
                                {resumeList.length > 0 && (
                                    <button onClick={() => setShowResumePicker(true)} className="btn btn-ghost w-full gap-2">
                                        <HistoryIcon size={16} /> Select from Previous Resume
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-left animate-fade-in">
                                <div className="flex items-center justify-between mb-4">
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
                                                    {selectingResumeId === resume.id ? <Loader2 size={14} className="animate-spin text-[var(--brand-500)]" /> : <FileText size={14} className="text-[var(--text-muted)]" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate group-hover:text-[var(--brand-500)] transition-colors">{resume.title || "Untitled Resume"}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)]">{new Date(resume.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all translate-x-1" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (

                    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in-up">
                        <div className="card p-5">
                            <h2 className="font-semibold mb-4 flex items-center gap-2">
                                <Building2 size={16} className="text-[var(--brand-400)]" /> Application Details
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                                        Company Name <span className="text-[var(--rose-400)]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={e => setCompanyName(e.target.value)}
                                        className="input"
                                        placeholder="e.g. Google, Microsoft, Stripe..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                                        Job Title <span className="text-[var(--rose-400)]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={jobTitle}
                                        onChange={e => setJobTitle(e.target.value)}
                                        className="input"
                                        placeholder="e.g. Senior Frontend Engineer..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                                        Job Description <span className="text-[var(--text-muted)] text-xs">(optional but recommended)</span>
                                    </label>
                                    <textarea
                                        value={jobDescription}
                                        onChange={e => setJobDescription(e.target.value)}
                                        rows={6}
                                        className="input resize-y text-sm"
                                        placeholder="Paste the job description to make the letter more specific..."
                                    />
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !companyName.trim() || !jobTitle.trim()}
                                    className="btn btn-primary w-full disabled:opacity-50 gap-2"
                                >
                                    {loading
                                        ? <><Loader2 size={16} className="animate-spin" /> Writing Letter...</>
                                        : <><Mail size={16} /> Generate Cover Letter</>
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Resume Preview */}
                        <div className="card p-4">
                            <p className="section-label mb-2">Using Resume</p>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-[var(--emerald-500)]/15 flex items-center justify-center shrink-0">
                                    <FileText size={16} className="text-[var(--emerald-400)]" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{resumeData.personalInfo?.name || "Your Resume"}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{resumeData.experience?.length || 0} experience{resumeData.experience?.length !== 1 ? "s" : ""} · {resumeData.skills?.technical?.length || 0} skills</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
