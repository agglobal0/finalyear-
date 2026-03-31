import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    FileText, MonitorPlay, PenLine, ArrowRight, Sparkles,
    Mic, Target, LayoutTemplate, Camera, Linkedin, Mail,
    CheckCircle, Zap, ShieldCheck, Brain, Star
} from "lucide-react";
import Navbar from "../components/Navbar";

const FEATURES = [
    { icon: FileText, color: "emerald", label: "Resume Builder", desc: "AI-interviewed resume tailored for ATS with smart formatting.", badge: "Core" },
    { icon: MonitorPlay, color: "brand", label: "Presentation Builder", desc: "Generate full slide decks with outlines and speaker notes instantly.", badge: "Core" },
    { icon: PenLine, color: "purple", label: "Letter Builder", desc: "Professional letters — resignation, recommendation, complaint & more.", badge: "Core" },
    { icon: Target, color: "emerald", label: "JD Tailor + ATS", desc: "Match your resume to any job description and fix gaps with one click.", badge: "New" },
    { icon: Mail, color: "brand", label: "Cover Letter AI", desc: "Personalized cover letters for any role in under 30 seconds.", badge: "New" },
    { icon: Linkedin, color: "gold", label: "LinkedIn Optimizer", desc: "Get a killer headline, About section and experience rewrites.", badge: "New" },
    { icon: Mic, color: "rose", label: "Voice Mock Interview", desc: "Speak to the AI interviewer — get scored on tone, clarity & relevance.", badge: "New ✦" },
    { icon: LayoutTemplate, color: "brand", label: "Portfolio Generator", desc: "Turn your resume into a stunning 1-page portfolio website instantly.", badge: "New ✦" },
    { icon: Camera, color: "rose", label: "Headshot Studio", desc: "Professional filter presets for your LinkedIn/resume photo — all in-browser.", badge: "New ✦" },
];

const COLOR_MAP = {
    emerald: { bg: "bg-[var(--emerald-500)]/15", text: "text-[var(--emerald-400)]", border: "hover:border-[var(--emerald-500)]/50", glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]", badge: "bg-[var(--emerald-500)]/15 text-[var(--emerald-400)]" },
    brand: { bg: "bg-[var(--brand-500)]/15", text: "text-[var(--brand-400)]", border: "hover:border-[var(--brand-500)]/50", glow: "hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]", badge: "bg-[var(--brand-500)]/15 text-[var(--brand-400)]" },
    purple: { bg: "bg-purple-500/15", text: "text-purple-400", border: "hover:border-purple-500/50", glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]", badge: "bg-purple-500/15 text-purple-400" },
    gold: { bg: "bg-[var(--gold-500)]/15", text: "text-[var(--gold-400)]", border: "hover:border-[var(--gold-500)]/50", glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]", badge: "bg-[var(--gold-500)]/15 text-[var(--gold-400)]" },
    rose: { bg: "bg-rose-500/15", text: "text-rose-400", border: "hover:border-rose-500/50", glow: "hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]", badge: "bg-rose-500/15 text-rose-400" },
};

const WHY = [
    { icon: ShieldCheck, title: "100% Private", desc: "All AI runs locally via Ollama — your data never leaves your machine." },
    { icon: Zap, title: "Instant Results", desc: "Generate a complete resume, letter, or portfolio in under 2 minutes." },
    { icon: Brain, title: "Truly Intelligent", desc: "AI asks smart follow-ups, adapts to your answers, and tailors every word." },
    { icon: Star, title: "9 Powerful Tools", desc: "Everything from resumes to voice interview practice in one platform." },
];

export default function PublicHome() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

    if (!mounted) return (
        <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[var(--brand-500)] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden">
            <Navbar />

            {/* ── HERO ──────────────────────────────────────────────────── */}
            <section className="relative pt-36 pb-28 px-4 text-center overflow-hidden">
                {/* Ambient glows */}
                <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[var(--brand-500)] opacity-[0.08] blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-48 left-1/4 w-[300px] h-[300px] bg-[var(--emerald-500)] opacity-[0.06] blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute top-48 right-1/4 w-[300px] h-[300px] bg-purple-500 opacity-[0.06] blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-4xl mx-auto animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-500)]/10 border border-[var(--brand-500)]/20 text-[var(--brand-400)] text-sm font-semibold mb-8">
                        <Sparkles size={14} className="animate-pulse" />
                        9 AI-powered career tools in one place
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight font-playfair mb-6 leading-none">
                        Build Your{" "}
                        <span className="gradient-text">Career Story</span>
                    </h1>

                    <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                        Resume · Presentations · Letters · Portfolio · Voice Interview — all powered by local AI. Private, fast, and incredibly smart.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/login" className="btn btn-primary btn-lg gap-2 shadow-[var(--shadow-brand)]">
                            Get Started Free <ArrowRight size={18} />
                        </Link>
                        <Link to="/login" className="btn btn-secondary btn-lg gap-2">
                            <Sparkles size={16} /> See All Features
                        </Link>
                    </div>

                    {/* Floating stat pills */}
                    <div className="flex flex-wrap justify-center gap-3 mt-10">
                        {[["✓ No API key required", "emerald"], ["✓ Runs 100% locally", "brand"], ["✓ 9 career tools", "purple"]].map(([t, c]) => (
                            <span key={t} className={`px-4 py-1.5 rounded-full text-sm font-medium border ${
                                c === "emerald" ? "border-[var(--emerald-500)]/30 text-[var(--emerald-400)] bg-[var(--emerald-500)]/5"
                                : c === "brand" ? "border-[var(--brand-500)]/30 text-[var(--brand-400)] bg-[var(--brand-500)]/5"
                                : "border-purple-500/30 text-purple-400 bg-purple-500/5"
                            }`}>{t}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── STATS STRIP ───────────────────────────────────────────── */}
            <section className="border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] py-8">
                <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[["9", "Career Tools"], ["100%", "Local & Private"], ["< 2 min", "Resume Generated"], ["AI Voice", "Mock Interview"]].map(([n, l]) => (
                        <div key={l}>
                            <div className="text-3xl font-extrabold gradient-text">{n}</div>
                            <div className="text-sm text-[var(--text-muted)] mt-1 font-medium">{l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── ALL TOOLS GRID ────────────────────────────────────────── */}
            <section className="py-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                            Everything You Need to <span className="gradient-text-emerald">Land the Job</span>
                        </h2>
                        <p className="text-[var(--text-secondary)] max-w-xl mx-auto">Nine specialized AI tools working together so you walk into every interview fully prepared.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
                        {FEATURES.map(({ icon: Icon, color, label, desc, badge }) => {
                            const c = COLOR_MAP[color];
                            const isNew = badge.startsWith("New");
                            return (
                                <Link
                                    to="/login"
                                    key={label}
                                    className={`group card p-7 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1.5 ${c.border} ${c.glow} relative overflow-hidden`}
                                >
                                    {/* Hover glow */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                    <div className="relative z-10 flex items-start justify-between">
                                        <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.text} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon size={22} />
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c.badge} ${isNew ? "border border-current/30" : ""}`}>
                                            {badge}
                                        </span>
                                    </div>

                                    <div className="relative z-10">
                                        <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">{label}</h3>
                                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                                    </div>

                                    <div className={`relative z-10 flex items-center gap-1 text-xs font-semibold ${c.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                        Get started <ArrowRight size={12} />
                                    </div>

                                    {/* Bottom accent line */}
                                    <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-current to-transparent ${c.text} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── WHY SECTION ───────────────────────────────────────────── */}
            <section className="py-20 px-4 bg-[var(--bg-surface)] border-y border-[var(--border-subtle)]">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                            Why Choose <span className="gradient-text">Ollama Resume AI</span>?
                        </h2>
                        <p className="text-[var(--text-secondary)] max-w-xl mx-auto">Built for privacy-first job seekers. Your data stays on your machine — always.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
                        {WHY.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="card p-6 text-center group hover:-translate-y-1 transition-transform">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--brand-500)]/10 text-[var(--brand-400)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Icon size={26} />
                                </div>
                                <h3 className="font-bold text-[var(--text-primary)] mb-2">{title}</h3>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
            <section className="py-24 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-14 tracking-tight">
                        From Zero to <span className="gradient-text-emerald">Interview-Ready</span> in Minutes
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connector lines */}
                        <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gradient-to-r from-[var(--brand-500)]/30 via-[var(--emerald-500)]/50 to-[var(--brand-500)]/30" />

                        {[
                            { n: "01", t: "Answer Interview Questions", d: "Our AI conducts a smart interview to extract your experience, skills, and achievements.", c: "brand" },
                            { n: "02", t: "AI Builds Your Resume", d: "Get a beautifully formatted, ATS-optimized resume generated in seconds from your answers.", c: "emerald" },
                            { n: "03", t: "Optimize & Export", d: "Tailor to any job description, generate a cover letter, portfolio site, and more.", c: "purple" },
                        ].map(({ n, t, d, c }) => {
                            const tc = c === "brand" ? "text-[var(--brand-400)]" : c === "emerald" ? "text-[var(--emerald-400)]" : "text-purple-400";
                            const bc = c === "brand" ? "bg-[var(--brand-500)]/15" : c === "emerald" ? "bg-[var(--emerald-500)]/15" : "bg-purple-500/15";
                            return (
                                <div key={n} className="flex flex-col items-center text-center gap-4">
                                    <div className={`w-16 h-16 rounded-2xl ${bc} ${tc} flex items-center justify-center text-2xl font-extrabold`}>{n}</div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)]">{t}</h3>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{d}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── CTA BANNER ────────────────────────────────────────────── */}
            <section className="py-20 px-4">
                <div className="max-w-3xl mx-auto text-center glass-panel p-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-500)]/5 via-transparent to-[var(--emerald-500)]/5 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="text-4xl mb-4">🚀</div>
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
                            Ready to Land Your <span className="gradient-text">Dream Job</span>?
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                            Join thousands of job seekers who built their career documents with local AI — no subscription, no data leaks.
                        </p>
                        <Link to="/login" className="btn btn-primary btn-lg gap-2 shadow-[var(--shadow-brand)]">
                            Start Building for Free <ArrowRight size={18} />
                        </Link>
                        <p className="mt-4 text-xs text-[var(--text-muted)]">No signup required to explore · Runs entirely on your machine</p>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────────────────── */}
            <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-10 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-500)] flex items-center justify-center">
                                <FileText size={16} className="text-white" />
                            </div>
                            <span className="font-bold text-[var(--text-primary)]">Ollama Resume AI</span>
                        </div>

                        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-[var(--text-muted)] justify-center">
                            {[["Resume Builder", "/login"], ["Cover Letter", "/login"], ["Portfolio", "/login"], ["Voice Interview", "/login"], ["ATS Optimizer", "/login"]].map(([l, to]) => (
                                <Link key={l} to={to} className="hover:text-[var(--text-primary)] transition-colors">{l}</Link>
                            ))}
                        </div>

                        <p className="text-xs text-[var(--text-muted)]">
                            © {new Date().getFullYear()} Ollama Resume AI · Built with ❤️ for job seekers
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
