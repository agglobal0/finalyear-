import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useWorkflow from "../hooks/useWorkflow";
import { startInterview } from "../api/resumeApi";
import { Zap, BarChart3, Layers, ArrowRight, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const levels = [
    {
        id: "basic",
        label: "Basic",
        badge: "~3 Questions",
        icon: Zap,
        iconColor: "text-[var(--gold-400)]",
        desc: "~3 combined questions. High efficiency - AI combines multiple fields into a single question. Ideal for quick resume generation.",
        efficiency: "High efficiency - AI combines questions",
        selectedBorder: "border-[var(--emerald-500)]",
        selectedBg: "bg-[var(--emerald-500)]/10",
    },
    {
        id: "standard",
        label: "Standard",
        badge: "~8 Questions",
        icon: BarChart3,
        iconColor: "text-[var(--emerald-400)]",
        desc: "~8 questions. Balanced depth and efficiency. The AI collects enough context for a strong, personalized resume.",
        efficiency: "Balanced approach",
        recommended: true,
        selectedBorder: "border-[var(--emerald-500)]",
        selectedBg: "bg-[var(--emerald-500)]/10",
    },
    {
        id: "advanced",
        label: "Advanced",
        badge: "~15 Questions",
        icon: Layers,
        iconColor: "text-[var(--brand-400)]",
        desc: "~15 questions. Comprehensive coverage of all experience sections. The AI crafts a highly detailed, targeted resume.",
        efficiency: "Comprehensive coverage",
        selectedBorder: "border-[var(--emerald-500)]",
        selectedBg: "bg-[var(--emerald-500)]/10",
    },
];

const InterviewLevel = () => {
    const navigate = useNavigate();
    const { updateStep } = useWorkflow();
    const [selected, setSelected] = useState("standard");
    const [loading, setLoading] = useState(false);

    const handleStart = async () => {
        setLoading(true);
        try {
            const data = await startInterview(selected);
            updateStep("interview", { interviewId: data.interviewId, interviewLevel: selected });
            navigate("/interview", {
                state: {
                    firstQuestion: data.question,
                    questionType: data.type,
                    questionOptions: data.options,
                    interviewId: data.interviewId,
                    level: selected,
                    totalQuestions: data.totalQuestions,
                },
            });
        } catch (error) {
            console.error("Failed to start interview:", error);
            toast.error("Failed to start. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-fade-in-up font-dm">
            <style>{` .font-playfair { font-family: 'Playfair Display', serif; } `}</style>

            {/* Header Section */}
            <div className="text-center space-y-4 mb-8">
                <p className="text-[var(--gold-500)] text-sm uppercase tracking-widest font-semibold">Step 1: AI Interview</p>
                <h1 className="text-4xl lg:text-5xl font-extrabold font-playfair text-[var(--text-primary)]">
                    Start Interview
                </h1>
                <p className="text-[var(--text-secondary)] font-light text-lg max-w-2xl mx-auto">
                    Choose the depth of the AI interview. The more questions you answer, the more personalized and targeted your resume will be.
                </p>
            </div>

            {/* Options Selection */}
            <div className="glass-panel p-8 rounded-[var(--radius-xl)] shadow-lg relative overflow-hidden border-[var(--border-subtle)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--emerald-500)]/5 blur-[80px] rounded-full pointer-events-none -z-10"></div>
                <div className="grid grid-cols-1 gap-4 mb-8 relative z-10">
                    {levels.map((l) => {
                        const Icon = l.icon;
                        const isSelected = selected === l.id;
                        return (
                            <button
                                key={l.id}
                                onClick={() => setSelected(l.id)}
                                className={`p-5 rounded-[var(--radius-lg)] border-2 text-left transition-all duration-300 relative overflow-hidden ${isSelected
                                        ? `${l.selectedBorder} ${l.selectedBg} shadow-[0_0_15px_rgba(var(--emerald-500-rgb),0.1)] -translate-y-1`
                                        : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:-translate-y-0.5"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isSelected ? "bg-[var(--bg-surface)] shadow-sm" : "bg-[var(--bg-elevated)]"}`}>
                                            <Icon size={20} className={l.iconColor} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                                                {l.label}
                                                {l.recommended && (
                                                    <span className="text-[10px] bg-[var(--emerald-600)] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                        Recommended
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-[var(--text-secondary)]">{l.efficiency}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-1 rounded-full border border-[var(--border-subtle)]">{l.badge}</div>
                                </div>
                                <div className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed">{l.desc}</div>
                            </button>
                        );
                    })}
                </div>
                
                <button
                    onClick={handleStart}
                    disabled={loading}
                    className="w-full btn btn-primary py-4 text-lg shadow-lg relative z-10 flex items-center justify-center gap-3"
                    style={{
                        background: 'linear-gradient(135deg, var(--emerald-400), var(--emerald-600))'
                    }}
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Starting Interview...
                        </>
                    ) : (
                        <>
                            Start Interview
                            <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </div>

            {/* Flow Preview */}
            <div className="card p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Layers size={16} /> Your path
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-end">
                    {["Interview", "Method", "Analysis", "Resume"].map((step, i) => (
                        <div key={step} className="flex items-center gap-2 sm:gap-4">
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-colors ${i === 0
                                        ? "border-[var(--emerald-500)]/30 bg-[var(--emerald-500)]/10 text-[var(--emerald-600)] dark:text-[var(--emerald-400)] shadow-sm"
                                        : "border-[var(--border-subtle)] text-[var(--text-muted)] bg-[var(--bg-elevated)]"
                                    }`}
                            >
                                <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? "bg-[var(--emerald-600)] text-white" : "bg-[var(--bg-surface)] text-[var(--text-disabled)]"
                                        }`}
                                >
                                    {i + 1}
                                </span>
                                {step}
                            </div>
                            {i < 3 && <ArrowRight size={14} className="text-[var(--border-strong)]" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InterviewLevel;
