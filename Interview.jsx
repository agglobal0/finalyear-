import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useWorkflow from "../hooks/useWorkflow";
import { nextQuestion } from "../api/resumeApi";
import toast from "react-hot-toast";
import { Layers, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

function Badge({ children, type = "default" }) {
    const colors = {
        default: "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
        emerald: "bg-[var(--emerald-500)]/20 text-[var(--emerald-400)] border-[var(--emerald-500)]/30",
        brand: "bg-[var(--brand-500)]/20 text-[var(--brand-400)] border-[var(--brand-500)]/30",
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colors[type]}`}>
            {children}
        </span>
    );
}

function Question({ q, onAnswer }) {
    const [value, setValue] = useState("");

    useEffect(() => setValue(""), [q?.question]);

    if (!q) return null;

    const submit = (v) => {
        onAnswer(v ?? value);
    };

    const isMultipleFields =
        q.requiresMultipleFields ||
        q.question?.toLowerCase().includes("provide") ||
        q.question?.toLowerCase().includes("describe your");

    return (
        <div className="card p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-500)]/5 blur-3xl pointer-events-none rounded-full"></div>
            
            <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-4">
                <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">Category: {q.category || "General"}</span>
                <span>•</span>
                <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">Type: {q.type || "Text"}</span>
                {isMultipleFields && (
                    <>
                        <span>•</span>
                        <Badge type="emerald">Combined Question</Badge>
                    </>
                )}
            </div>
            
            <h3 className="text-2xl font-semibold mb-6 text-[var(--text-primary)] leading-tight">{q.question}</h3>

            {isMultipleFields && (
                <div className="mb-6 p-4 bg-[var(--brand-500)]/10 border border-[var(--brand-500)]/20 rounded-[var(--radius-lg)]">
                    <div className="text-sm text-[var(--brand-200)] flex items-start gap-2">
                        <span className="font-bold">✨ Tip:</span>
                        <span>This question combines multiple resume sections for efficiency. Please provide all requested information in your answer.</span>
                    </div>
                </div>
            )}

            {q.type === "mcq" && Array.isArray(q.options) && q.options.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                    {q.options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => submit(opt)}
                            className="p-4 rounded-[var(--radius-lg)] border-[2px] border-[var(--border-subtle)] hover:border-[var(--brand-500)] bg-[var(--bg-surface)] text-left hover:bg-[var(--brand-500)]/5 transition-all font-medium text-[var(--text-primary)]"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            ) : q.type === "boolean" ? (
                <div className="flex gap-4">
                    <button onClick={() => submit(true)} className="flex-1 btn py-3 text-lg font-medium shadow-md text-white bg-[var(--emerald-600)] hover:bg-[var(--emerald-500)]">Yes / True</button>
                    <button onClick={() => submit(false)} className="flex-1 btn py-3 text-lg font-medium shadow-md text-white bg-rose-600 hover:bg-rose-500">No / False</button>
                </div>
            ) : q.type === "scale" ? (
                <div className="space-y-6">
                    <input 
                        type="range" 
                        min={1} 
                        max={5} 
                        value={value || 3} 
                        onChange={(e) => setValue(e.target.value)} 
                        className="w-full accent-[var(--brand-500)] h-2 bg-[var(--bg-elevated)] rounded-lg appearance-none cursor-pointer" 
                    />
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-[var(--text-muted)]">Low (1)</span>
                        <div className="text-[var(--text-primary)] text-lg">Selected: <span className="text-[var(--brand-400)] font-bold">{value || 3}</span></div>
                        <span className="text-[var(--text-muted)]">High (5)</span>
                    </div>
                    <button onClick={() => submit(value || 3)} className="w-full btn btn-primary py-3">Submit Rating</button>
                </div>
            ) : (
                <div className="space-y-4">
                    <textarea
                        className={`input w-full p-4 text-base ${isMultipleFields ? "h-48" : "h-32"} resize-y font-medium text-[var(--text-primary)]`}
                        placeholder={isMultipleFields ? "Provide all requested information in detail..." : "Type your answer here..."}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={() => submit()}
                            disabled={!value.trim()}
                            className="btn btn-primary px-8 py-3 flex items-center gap-2"
                        >
                            Submit Answer <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const Interview = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { updateStep, advanceStep, interviewId: workflowInterviewId } = useWorkflow();

    const firstQuestion = location.state?.firstQuestion;
    const firstInterviewId = location.state?.interviewId;
    const locationLevel = location.state?.level || "standard";
    const maxMap = { basic: 3, standard: 8, advanced: 15 };

    const [question, setQuestion] = useState(
        firstQuestion
            ? {
                  question: firstQuestion,
                  type: location.state?.questionType || "text",
                  options: location.state?.questionOptions || [],
                  category: "general",
                  requiresMultipleFields: false,
              }
            : null
    );
    const [progress, setProgress] = useState({
        current: firstQuestion ? 1 : 0,
        max: firstQuestion ? maxMap[locationLevel] : 0,
    });
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [interviewId] = useState(firstInterviewId || workflowInterviewId);

    const fetchNext = async (answer) => {
        setLoading(true);
        setError(null);
        try {
            const level = progress.max === 3 ? "basic" : progress.max === 15 ? "advanced" : "standard";
            const data = await nextQuestion(interviewId, answer, level);

            if (data.isComplete || data.done) {
                setDone(true);
                updateStep("interview", {
                    interviewCompleted: true,
                    totalQuestionsAnswered: data.totalAnswered || progress.max,
                });
            } else {
                if (data.isInvalid && data.warningMessage) {
                    toast.error(data.warningMessage, { duration: 5000 });
                }
                setQuestion({
                    question: data.question,
                    type: data.type,
                    options: data.options,
                    category: data.category,
                    requiresMultipleFields: data.requiresMultipleFields,
                });
                setProgress((prev) => ({
                    current: data.currentQuestionIndex !== undefined ? data.currentQuestionIndex + 1 : prev.current + 1,
                    max: data.totalQuestions ?? prev.max,
                }));
            }
        } catch (e) {
            setError(e.message || "Failed to fetch next question");
            toast.error("Failed to process answer.");
        } finally {
            setLoading(false);
        }
    };

    const handleProceedToMethod = () => {
        advanceStep("method");
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 w-full animate-fade-in-up font-dm">
            
            {/* Flow Preview top-right or just visual breadcrumbs */}
            <div className="mb-8 flex items-center gap-2 justify-center pb-6 border-b border-[var(--border-subtle)]">
                {["Interview", "Method", "Analysis", "Resume"].map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${i === 0 ? "text-[var(--emerald-400)] bg-[var(--emerald-500)]/10 border border-[var(--emerald-500)]/30" : "text-[var(--text-disabled)]"}`}>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${i === 0 ? "bg-[var(--emerald-500)] text-white" : "bg-[var(--bg-elevated)]"}`}>
                                {i + 1}
                            </span>
                            {step}
                        </div>
                        {i < 3 && <ArrowRight size={12} className="text-[var(--text-disabled)]" />}
                    </div>
                ))}
            </div>

            {done ? (
                <div className="glass-panel p-10 rounded-[var(--radius-xl)] text-center border-[var(--emerald-500)]/30 max-w-2xl mx-auto mt-12">
                    <div className="w-20 h-20 bg-[var(--emerald-500)]/20 rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--emerald-400)]">
                        <CheckCircle size={40} />
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-[var(--text-primary)] font-playfair">Interview Complete</h3>
                    <p className="text-[var(--text-secondary)] mb-10 text-lg font-light">
                        Excellent work. All necessary information has been collected. We're ready to proceed to the next step.
                    </p>
                    <button
                        onClick={handleProceedToMethod}
                        className="btn py-4 px-8 shadow-lg text-white font-semibold flex items-center justify-center gap-2 mx-auto"
                        style={{ background: 'linear-gradient(135deg, var(--emerald-400), var(--emerald-600))' }}
                    >
                        Go to Method Selection <ArrowRight size={20} />
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Progress Bar */}
                    <div className="card p-5 mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Interview Progress</div>
                            <div className="text-sm flex items-center gap-2 font-medium">
                                <span className="text-[var(--brand-400)]">{progress.current}</span>
                                <span className="text-[var(--text-muted)]">of</span>
                                <span className="text-[var(--text-primary)]">{progress.max}</span>
                                <span className="text-xs text-[var(--emerald-500)] bg-[var(--emerald-500)]/10 px-2 py-0.5 rounded-full ml-2 font-bold">
                                    {progress.max ? Math.round((progress.current / progress.max) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                        <div className="w-full h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden shadow-inner border border-[var(--border-subtle)]">
                            <div
                                className="h-full transition-all duration-700 ease-out"
                                style={{ 
                                    width: `${progress.max ? Math.min(100, Math.round((progress.current / progress.max) * 100)) : 0}%`,
                                    background: 'linear-gradient(90deg, var(--brand-500), var(--emerald-500))'
                                }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="glass-panel p-16 rounded-[var(--radius-xl)] text-center flex flex-col items-center justify-center min-h-[400px]">
                            <Loader2 className="animate-spin w-12 h-12 text-[var(--brand-500)] mb-6" />
                            <h3 className="text-xl font-medium text-[var(--text-primary)]">AI is thinking...</h3>
                            <p className="text-[var(--text-muted)] mt-2">Preparing your customized next question.</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 rounded-[var(--radius-lg)] bg-rose-500/10 border border-rose-500/30 text-center text-rose-200">
                            <p className="mb-4">{error}</p>
                            <button onClick={() => fetchNext()} className="btn bg-rose-600 hover:bg-rose-500 text-white shadow-md">
                                Retry Request
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <Question q={question} onAnswer={(ans) => fetchNext(ans)} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Interview;
