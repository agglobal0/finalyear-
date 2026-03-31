import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Mail, FileText, Copy, Check, Download, Briefcase } from "lucide-react";
import toast from "react-hot-toast";

export default function CoverLetterResult() {
    const navigate = useNavigate();
    const location = useLocation();
    const { letter, companyName, jobTitle } = location.state || {};
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!letter) navigate("/career/cover-letter");
    }, [letter, navigate]);

    if (!letter) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(letter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard!");
    };

    const handleDownload = () => {
        const blob = new Blob([letter], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Cover_Letter_${companyName.replace(/\s+/g, "_")}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Downloaded!");
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <header className="sticky top-0 z-10 backdrop-blur bg-[var(--bg-base)]/80 border-b border-[var(--border-subtle)]">
                <div className="page-wrapper py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/career/cover-letter", { state: { companyName, jobTitle, jobDescription: location.state?.jobDescription } })} className="btn btn-ghost btn-sm gap-2">
                            <ArrowLeft size={16} /> Edit Details
                        </button>
                        <div className="h-5 w-px bg-[var(--border-subtle)]" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-500)]/15 flex items-center justify-center">
                                <Mail size={16} className="text-[var(--brand-400)]" />
                            </div>
                            <span className="font-semibold">Cover Letter</span>
                        </div>
                    </div>
                    <span className="badge badge-brand">AI Written</span>
                </div>
            </header>

            <main className="page-wrapper py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                                Your <span className="gradient-text">Cover Letter</span>
                            </h1>
                            <p className="text-[var(--text-secondary)]">
                                Generated for <strong>{jobTitle}</strong> at <strong>{companyName}</strong>.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleCopy} className="btn btn-secondary gap-2">
                                {copied ? <><Check size={16} className="text-[var(--emerald-500)]" /> Copied</> : <><Copy size={16} /> Copy Text</>}
                            </button>
                            <button onClick={handleDownload} className="btn btn-primary gap-2">
                                <Download size={16} /> Download .txt
                            </button>
                        </div>
                    </div>

                    <div className="card-glass p-8 md:p-12 shadow-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Mail size={120} />
                        </div>
                        <div className="relative z-10 whitespace-pre-wrap text-base leading-relaxed text-[var(--text-primary)] font-[inherit]">
                            {letter}
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-4">
                        <button onClick={() => navigate("/resume")} className="btn btn-secondary btn-sm gap-2">
                            <FileText size={14} /> Back to Resume
                        </button>
                        <button onClick={() => navigate("/career/linkedin")} className="btn btn-secondary btn-sm gap-2">
                            <Briefcase size={14} /> Optimize LinkedIn
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
