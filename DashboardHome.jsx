import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useWorkflow from "../hooks/useWorkflow";
import { useRecoilState } from "recoil";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { getUserResumes } from "../api/resumeApi";
import {
    FileText, MonitorPlay, ArrowRight, Clock, Sparkles, Layout,
    History, Target, Mail, Linkedin, ChevronRight, PenLine,
    Mic, LayoutTemplate, Camera, BarChart3, TrendingUp, Zap
} from "lucide-react";
import Navbar from "../components/Navbar";

const MAIN_TOOLS = [
    {
        icon: FileText, color: "emerald", label: "Resume Builder",
        desc: "AI-interview driven, ATS-optimized resume with smart formatting and perfect structure.",
        to: "/interview-level", action: "Create Resume", isWorkflow: true,
    },
    {
        icon: MonitorPlay, color: "brand", label: "Presentation Builder",
        desc: "Generate comprehensive slide decks with outlines, speaker notes, and AI visuals in seconds.",
        to: "/ppt", action: "Build Presentation",
    },
    {
        icon: PenLine, color: "purple", label: "Letter Builder",
        desc: "Craft formal, informal, resignation, recommendation and more letters — perfectly worded by AI.",
        to: "/letter", action: "Write Letter",
    },
];

const CAREER_TOOLS = [
    { icon: Target, color: "emerald", label: "JD Tailor", desc: "Match your resume to any job and fix keyword gaps with one click.", to: "/career/jd-tailor", badge: "ATS Boost" },
    { icon: Mail, color: "brand", label: "Cover Letter AI", desc: "Personalized cover letters for any company and role in under 30 seconds.", to: "/career/cover-letter", badge: "AI Writer" },
    { icon: Linkedin, color: "gold", label: "LinkedIn Optimizer", desc: "Compelling headline, About section, and optimized experience bullets.", to: "/career/linkedin", badge: "Profile" },
];

const AI_TOOLS = [
    { icon: BarChart3, color: "emerald", label: "ATS Keyword Heatmap", desc: "See exactly which keywords you're missing and add them with one click.", to: "/career/ats", badge: "New ✦" },
    { icon: Mic, color: "rose", label: "Voice Mock Interview", desc: "Speak to AI — scored on tone, clarity & relevance with adaptive questions.", to: "/voice-interview", badge: "New ✦" },
    { icon: LayoutTemplate, color: "brand", label: "Portfolio Generator", desc: "Turn your resume into a stunning 1-page portfolio website in seconds.", to: "/portfolio", badge: "New ✦" },
    { icon: Camera, color: "rose", label: "Headshot Studio", desc: "Professional filter presets for your photo — 100% in-browser & private.", to: "/headshot", badge: "New ✦" },
];

const ACCENT = {
    emerald: { icon: "bg-[var(--emerald-500)]/15 text-[var(--emerald-400)]", badge: "badge-emerald", btn: "bg-gradient-to-r from-[var(--emerald-400)] to-[var(--emerald-600)] text-white shadow-[0_4px_20px_rgba(16,185,129,0.25)]", hover: "from-[var(--emerald-500)]/5", border: "group-hover:border-[var(--emerald-500)]/40" },
    brand: { icon: "bg-[var(--brand-500)]/15 text-[var(--brand-400)]", badge: "badge-brand", btn: "btn-primary", hover: "from-[var(--brand-500)]/5", border: "group-hover:border-[var(--brand-500)]/40" },
    gold: { icon: "bg-[var(--gold-500)]/15 text-[var(--gold-400)]", badge: "badge-gold", btn: "bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-500)] text-[#1a1100] font-bold shadow-[0_4px_20px_rgba(245,158,11,0.2)]", hover: "from-[var(--gold-500)]/5", border: "group-hover:border-[var(--gold-500)]/40" },
    purple: { icon: "bg-purple-500/15 text-purple-400", badge: "bg-purple-500/15 text-purple-400 rounded-full px-2 py-0.5 text-[10px] font-bold", btn: "text-white font-bold shadow-[0_4px_20px_rgba(168,85,247,0.25)]", hover: "from-purple-500/5", border: "group-hover:border-purple-500/40", btnStyle: { background: "linear-gradient(135deg, rgb(168,85,247), rgb(139,92,246))" } },
    rose: { icon: "bg-rose-500/15 text-rose-400", badge: "bg-rose-500/15 text-rose-400 rounded-full px-2 py-0.5 text-[10px] font-bold border border-rose-500/30", btn: "text-white font-bold", hover: "from-rose-500/5", border: "group-hover:border-rose-500/40", btnStyle: { background: "linear-gradient(135deg, #f857a6, #ff5858)" } },
};

function SectionHeader({ icon: Icon, title, subtitle, accent = "brand" }) {
    const ic = ACCENT[accent];
    return (
        <div className="flex items-center gap-3 mb-7 px-1">
            <div className={`w-10 h-10 rounded-xl ${ic.icon} flex items-center justify-center shrink-0`}>
                <Icon size={18} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{title}</h2>
                {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
            </div>
        </div>
    );
}

function SmallToolCard({ icon: Icon, color, label, desc, to, badge }) {
    const ac = ACCENT[color];
    return (
        <Link to={to} className={`group card p-5 flex flex-col relative overflow-hidden hover:-translate-y-1 transition-all duration-300 border ${ac.border}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${ac.hover} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="relative z-10 flex flex-col h-full gap-3">
                <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl ${ac.icon} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={18} />
                    </div>
                    <span className={badge.startsWith("badge") ? `badge ${badge} text-[10px]` : badge}>{badge.replace("badge-","").replace("badge_","")}</span>
                </div>
                <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">{label}</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold mt-auto pt-1 opacity-0 group-hover:opacity-100 transition-opacity ${ac.icon.split(" ")[1]}`}>
                    Open <ChevronRight size={12} />
                </div>
            </div>
        </Link>
    );
}

const DashboardHome = () => {
    const { user } = useAuth();
    const { resetWorkflow } = useWorkflow();
    const navigate = useNavigate();
    const [history, setHistory] = useRecoilState(resumeHistoryAtom);
    const { resumes } = history;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const loadResumes = async () => {
            try {
                // Fetch resumes if we don't have them yet or to ensure they are up to date on home page
                const data = await getUserResumes();
                const mapped = (Array.isArray(data) ? data : []).map(item => ({
                    id: item._id || item.id,
                    title: item.title || "Untitled Resume",
                    createdAt: item.createdAt,
                    type: item.type
                }));
                setHistory(prev => ({
                    ...prev,
                    resumes: mapped,
                    loading: false
                }));
            } catch (err) {
                console.error("Failed to load resumes", err);
            }
        };

        loadResumes();
        const t = setTimeout(() => setMounted(true), 150);
        return () => clearTimeout(t);
    }, [setHistory]);

    if (!mounted) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[var(--brand-500)] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
            <Navbar />

            <main className="pt-24 pb-16 px-4 lg:px-8 flex-1 relative">
                {/* Background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-80 bg-[var(--brand-500)]/8 blur-[120px] rounded-full pointer-events-none -z-10" />

                {/* ── Welcome Header ──────────────────────────────────── */}
                <div className="text-center mb-14 animate-fade-in-up max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-[var(--brand-500)]/20 text-[var(--brand-400)] text-sm font-semibold mb-5">
                        <Sparkles size={14} className="animate-pulse" />
                        Welcome back, {user?.username || "Creator"} 👋
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-[var(--text-primary)]">
                        Your Career <span className="gradient-text">Command Center</span>
                    </h1>
                    <p className="text-lg text-[var(--text-secondary)] font-light leading-relaxed max-w-2xl mx-auto">
                        9 AI-powered tools to build, optimize, and showcase your professional story.
                    </p>
                </div>

                {/* ── Stats Strip ─────────────────────────────────────── */}
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-14 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                    {[
                        { icon: FileText, label: "Resumes", value: resumes?.length || 0, color: "emerald" },
                        { icon: Zap, label: "Tools Available", value: 9, color: "brand" },
                        { icon: TrendingUp, label: "New Features", value: 4, color: "gold" },
                        { icon: Mic, label: "Voice Interview", value: "AI", color: "rose" },
                    ].map(({ icon: Icon, label, value, color }) => {
                        const ic = ACCENT[color];
                        return (
                            <div key={label} className={`card p-5 text-center group hover:-translate-y-0.5 transition-transform border ${ic.border}`}>
                                <div className={`w-10 h-10 rounded-xl ${ic.icon} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}><Icon size={18} /></div>
                                <div className="text-2xl font-extrabold text-[var(--text-primary)]">{value}</div>
                                <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{label}</div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Core Tools ──────────────────────────────────────── */}
                <div className="max-w-6xl mx-auto mb-14 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
                    <SectionHeader icon={Layout} title="Core Builders" subtitle="Start here to create your career documents" accent="brand" />
                    <div className="grid md:grid-cols-3 gap-6 stagger">
                        {MAIN_TOOLS.map(({ icon: Icon, color, label, desc, to, action, isWorkflow, btnStyle }) => {
                            const ac = ACCENT[color];
                            return (
                                <div key={label} className={`card-glass group p-8 flex flex-col relative overflow-hidden hover:-translate-y-1.5 transition-all duration-300 border border-transparent ${ac.border}`}>
                                    <div className={`absolute inset-0 bg-gradient-to-br ${ac.hover} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className={`w-16 h-16 ${ac.icon} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-md`}>
                                            <Icon size={30} />
                                        </div>
                                        <h2 className="text-xl font-bold mb-3 text-[var(--text-primary)]">{label}</h2>
                                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-7 flex-1">{desc}</p>
                                        <Link
                                            to={to}
                                            onClick={isWorkflow ? resetWorkflow : undefined}
                                            className={`btn ${ac.btn} w-full justify-center font-bold`}
                                            style={ac.btnStyle || undefined}
                                        >
                                            {action} <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Career Enhancement Tools ─────────────────────────── */}
                <div className="max-w-6xl mx-auto mb-14 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
                    <SectionHeader icon={Target} title="Career Enhancement" subtitle="Fine-tune and amplify your job applications" accent="emerald" />
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
                        {CAREER_TOOLS.map(t => <SmallToolCard key={t.to} {...t} />)}
                    </div>
                </div>

                {/* ── New AI Tools ─────────────────────────────────────── */}
                <div className="max-w-6xl mx-auto mb-14 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
                    <div className="flex items-center gap-3 mb-7 px-1">
                        <div className="w-10 h-10 rounded-xl bg-[var(--brand-500)]/15 text-[var(--brand-400)] flex items-center justify-center shrink-0">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">New AI Tools</h2>
                                <span className="badge badge-brand text-[10px]">Just Added ✦</span>
                            </div>
                            <p className="text-sm text-[var(--text-muted)]">Voice interview, ATS heatmap, portfolio generator & headshot studio</p>
                        </div>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
                        {AI_TOOLS.map(t => <SmallToolCard key={t.to} {...t} />)}
                    </div>
                </div>

                {/* ── Recent Resumes ───────────────────────────────────── */}
                {resumes && resumes.length > 0 && (
                    <div className="max-w-6xl mx-auto animate-fade-in" style={{ animationDelay: "200ms" }}>
                        <SectionHeader icon={History} title="Recent Resumes" subtitle="Pick up where you left off" accent="brand" />
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {resumes.map((resume) => (
                                <div key={resume.id} className="card group p-6 flex flex-col hover:-translate-y-1 transition-transform relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-[var(--emerald-500)]">
                                        <Layout size={60} />
                                    </div>
                                    <div className="flex items-start gap-4 mb-5 relative z-10">
                                        <div className="w-11 h-11 rounded-xl bg-[var(--emerald-500)]/15 text-[var(--emerald-400)] flex items-center justify-center shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-[var(--text-primary)] truncate" title={resume.title || "Untitled Resume"}>
                                                {resume.title || "Untitled Resume"}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-1">
                                                <Clock size={11} />
                                                {new Date(resume.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] relative z-10 flex justify-between items-center">
                                        <span className="badge badge-emerald text-[10px]">ATS Ready</span>
                                        <button onClick={() => navigate("/resume")} className="btn btn-ghost btn-sm group-hover:text-[var(--emerald-400)] transition-colors">
                                            Open <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-8 px-4">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[var(--brand-500)] flex items-center justify-center">
                            <FileText size={14} className="text-white" />
                        </div>
                        <span className="font-bold text-sm text-[var(--text-primary)]">Ollama Resume AI</span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-muted)] justify-center">
                        {[["Resume", "/interview-level"], ["Presentation", "/ppt"], ["Letter", "/letter"], ["ATS Optimizer", "/career/ats"], ["Voice Interview", "/voice-interview"], ["Portfolio", "/portfolio"]].map(([l, to]) => (
                            <Link key={l} to={to} className="hover:text-[var(--text-secondary)] transition-colors">{l}</Link>
                        ))}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">© {new Date().getFullYear()} · Built with ❤️ for job seekers</p>
                </div>
            </footer>
        </div>
    );
};

export default DashboardHome;
