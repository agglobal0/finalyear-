import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useWorkflow from "../hooks/useWorkflow";
import { chooseMethod } from "../api/resumeApi";
import { CheckCircle2, ChevronRight, Sparkles } from "lucide-react";

const METHOD_OPTIONS = [
  { id: "star", name: "STAR", desc: "Situation-Task-Action-Result" },
  { id: "car", name: "CAR", desc: "Challenge-Action-Result" },
  { id: "par", name: "PAR", desc: "Problem-Action-Result" },
  { id: "soar", name: "SOAR", desc: "Situation-Obstacle-Action-Result" },
  { id: "fab", name: "FAB", desc: "Features-Advantages-Benefits" },
  { id: "auto", name: "Auto", desc: "AI selects best method" },
];

export default function MethodSelection() {
  const [method, setMethod] = useState("auto");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { advanceStep, interviewId } = useWorkflow();

  const proceedToAnalysis = async () => {
    if (!interviewId) return alert("Interview session not found.");
    setLoading(true);
    try {
      await chooseMethod(interviewId, method);
      advanceStep("analysis"); // Move workflow state forward
      navigate(`/analysis?method=${method}`);
    } catch (e) {
      alert(e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in text-[var(--text-primary)] relative">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--emerald-500)]/10 blur-[100px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[var(--brand-500)]/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--emerald-500)]/30 bg-[var(--emerald-500)]/10 text-[var(--emerald-600)] dark:text-[var(--emerald-400)] text-sm font-semibold mb-6">
              <Sparkles size={16} /> Step 2: Configuration
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Select Method</h1>
          <p className="text-lg text-[var(--text-secondary)]">Configure how your resume will be structured and optimized for your experience.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 relative z-10 lg:pl-0">
        <div className="space-y-6">
          <div className="card p-6 lg:p-8">
            <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Resume Method</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Choose how your experiences will be structured and presented.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {METHOD_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`p-4 rounded-[var(--radius-lg)] border text-left transition-all duration-200 relative overflow-hidden group ${
                    method === m.id 
                      ? "border-[var(--emerald-500)] bg-[var(--emerald-50)] dark:bg-[var(--emerald-500)]/10 shadow-[0_4px_20px_rgba(16,185,129,0.15)] ring-1 ring-[var(--emerald-500)]/50" 
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--emerald-500)]/30 hover:shadow-sm"
                  }`}
                >
                  {method === m.id && (
                      <CheckCircle2 size={18} className="absolute top-3 right-3 text-[var(--emerald-500)] animate-fade-in" />
                  )}
                  <div className={`font-bold mb-1 ${method === m.id ? 'text-[var(--emerald-600)] dark:text-[var(--emerald-400)] pr-6' : 'text-[var(--text-primary)] group-hover:text-[var(--emerald-500)] transition-colors'}`}>{m.name}</div>
                  <div className={`text-xs leading-relaxed ${method === m.id ? 'text-[var(--text-primary)] opacity-90' : 'text-[var(--text-muted)]'}`}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>


        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 lg:p-8 rounded-[var(--radius-xl)] border-[var(--border-subtle)] shadow-sm">
            <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">What Happens Next</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border-strong)] before:to-transparent">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--bg-base)] bg-[var(--emerald-500)] text-white shadow font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 -ml-5 md:ml-0">
                  1
                </div>
                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm ml-10 md:ml-0">
                    <div className="font-bold text-[var(--text-primary)] text-sm mb-1">AI Profile Analysis</div>
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Deep analysis of your responses with benchmark comparisons.
                    </div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--bg-base)] bg-[var(--emerald-500)] text-white shadow font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 -ml-5 md:ml-0">
                  2
                </div>
                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm ml-10 md:ml-0">
                    <div className="font-bold text-[var(--text-primary)] text-sm mb-1">Statistical Insights</div>
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        See how you compare to other professionals in your field.
                    </div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--bg-base)] bg-[var(--emerald-400)] text-white shadow font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 -ml-5 md:ml-0">
                  3
                </div>
                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm ml-10 md:ml-0">
                    <div className="font-bold text-[var(--text-primary)] text-sm mb-1">ATS-Optimized Resume</div>
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Generate a professional resume based on your analysis.
                    </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 lg:p-8 bg-gradient-to-br from-[var(--emerald-500)]/5 to-[var(--brand-500)]/5 border-[var(--emerald-500)]/20 shadow-[0_8px_32px_rgba(16,185,129,0.05)]">
            <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)] flex items-center gap-2">
                Selected Configuration
            </h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center bg-[var(--bg-surface)] p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-sm">
                <span className="text-[var(--text-secondary)] font-medium text-sm">Selected Method:</span>
                <span className="font-bold text-[var(--emerald-600)] dark:text-[var(--emerald-400)] capitalize tracking-wide">
                  {METHOD_OPTIONS.find(m => m.id === method)?.name}
                </span>
              </div>
            </div>
            
            <button 
              onClick={proceedToAnalysis} 
              disabled={loading} 
              className="btn w-full py-4 text-white shadow-lg bg-[var(--emerald-500)] hover:bg-[var(--emerald-600)] text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing Requirements...
                </>
              ) : (
                <>
                  Start AI Analysis
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          <div className="p-5 bg-[var(--emerald-50)] dark:bg-[var(--emerald-500)]/10 border border-[var(--emerald-200)] dark:border-[var(--emerald-500)]/30 rounded-[var(--radius-lg)] relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--emerald-500)]/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="text-xs font-bold text-[var(--emerald-600)] dark:text-[var(--emerald-400)] mb-2 relative z-10 flex items-center gap-1.5 uppercase tracking-widest">
                <Sparkles size={14} /> Pro Tip
            </div>
            <div className="text-sm text-[var(--text-secondary)] font-medium relative z-10 leading-relaxed">
              The AI analysis will provide detailed insights including how you compare to other professionals,
              market demand for your skills, and personalized resume recommendations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
