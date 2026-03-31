import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Linkedin, FileText, Copy, Check, Sparkles, User, Briefcase } from "lucide-react";

const CopyCard = ({ title, icon: Icon, content, accent = "brand" }) => {
    const [copied, setCopied] = useState(false);

    const getText = (val) => {
        if (!val) return "";
        if (typeof val === "string") return val;
        if (Array.isArray(val)) return val.map((b, i) => `• ${b}`).join("\n");
        return String(val);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getText(content));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const accentMap = {
        brand: "text-[var(--brand-400)] bg-[var(--brand-500)]/10 border-[var(--brand-500)]/20",
        emerald: "text-[var(--emerald-400)] bg-[var(--emerald-500)]/10 border-[var(--emerald-500)]/20",
        gold: "text-[var(--gold-400)] bg-[var(--gold-500)]/10 border-[var(--gold-500)]/20",
    };

    return (
        <div className="card p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${accentMap[accent]}`}>
                        <Icon size={15} />
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
                </div>
                <button onClick={handleCopy} className="btn btn-secondary btn-sm gap-1.5">
                    {copied ? <><Check size={13} className="text-[var(--emerald-500)]" /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
            </div>
            <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border-subtle)]">
                {typeof content === "string" ? (
                    <p className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">{content}</p>
                ) : Array.isArray(content) ? (
                    <ul className="space-y-2">
                        {content.map((bullet, i) => (
                            <li key={i} className="flex gap-2 text-sm text-[var(--text-primary)]">
                                <span className="text-[var(--emerald-500)] mt-0.5 shrink-0">•</span>
                                <span className="leading-relaxed">{bullet}</span>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        </div>
    );
};

export default function LinkedInResult() {
    const navigate = useNavigate();
    const location = useLocation();
    const { result, resumeData } = location.state || {};

    useEffect(() => {
        if (!result) navigate("/career/linkedin");
    }, [result, navigate]);

    if (!result) return null;

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <header className="sticky top-0 z-10 backdrop-blur bg-[var(--bg-base)]/80 border-b border-[var(--border-subtle)]">
                <div className="page-wrapper py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/career/linkedin")} className="btn btn-ghost btn-sm gap-2">
                            <ArrowLeft size={16} /> Edit Profile
                        </button>
                        <div className="h-5 w-px bg-[var(--border-subtle)]" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#0a66c2]/15 flex items-center justify-center">
                                <Linkedin size={16} className="text-[#0a66c2]" />
                            </div>
                            <span className="font-semibold">LinkedIn Optimization</span>
                        </div>
                    </div>
                    <span className="badge badge-brand">Optimized</span>
                </div>
            </header>

            <main className="page-wrapper py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                            Your Optimized <span className="text-[#0a66c2]">LinkedIn Presence</span>
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Copy these sections directly into your LinkedIn profile to increase visibility and professional appeal.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {result.headline && (
                            <CopyCard title="LinkedIn Headline" icon={Linkedin} content={result.headline} accent="brand" />
                        )}

                        {result.about && (
                            <CopyCard title="About Section" icon={User} content={result.about} accent="emerald" />
                        )}

                        {result.experienceRewrites?.map((exp, i) => (
                            <CopyCard
                                key={i}
                                title={`${exp.role || "Role"} @ ${exp.company || "Company"}`}
                                icon={Briefcase}
                                content={exp.optimizedBullets}
                                accent="gold"
                            />
                        ))}
                    </div>

                    <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-[#0a66c2]/5 to-[var(--brand-500)]/5 border border-[var(--border-subtle)] text-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Sparkles size={20} className="text-[#0a66c2]" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Profile Looking Great!</h3>
                        <p className="text-[var(--text-muted)] mb-6 text-sm max-w-sm mx-auto">
                            Don't forget to update your skills section and profile picture for maximum impact.
                        </p>
                        <button onClick={() => navigate("/dashboard")} className="btn btn-primary px-8 text-white bg-[#0a66c2] hover:bg-[#004182]">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
