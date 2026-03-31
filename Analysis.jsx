import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import useWorkflow from "../hooks/useWorkflow";
import { analyzeProfile } from "../api/resumeApi";
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ChevronRight, Target, TrendingUp, Sparkles, AlertCircle, FileText } from "lucide-react";

const MetricCard = ({ metric, className = "" }) => (
    <div className={`card p-5 lg:p-6 transition-all hover:shadow-md ${className}`}>
        <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm text-[var(--text-primary)]">{metric.metric}</h4>
            <span className="text-2xl font-extrabold text-[var(--emerald-500)] bg-[var(--emerald-50)] dark:bg-[var(--emerald-500)]/10 px-3 py-1 rounded-full shadow-sm">{metric.userScore}</span>
        </div>
        <div className="relative h-2.5 bg-[var(--bg-highlight)] rounded-full mb-4 overflow-hidden shadow-inner">
            <div 
                className="absolute inset-y-0 left-0 bg-[var(--emerald-500)] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(metric.userScore / 100) * 100}%` }}
            />
            <div 
                className="absolute inset-y-0 w-1.5 bg-[var(--text-primary)] rounded-full shadow-sm z-10"
                style={{ left: `${(metric.averageScore / 100) * 100}%` }}
            />
        </div>
        <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)] mb-3 bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]">
            <span className="flex items-center gap-1"><Target size={12} /> Avg: {metric.averageScore}</span>
            <span className="flex items-center gap-1 text-[var(--brand-500)]"><TrendingUp size={12} /> Top {100 - metric.percentile}%</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">{metric.description}</p>
    </div>
);

const CircularProgress = ({ percentage, label, color = "var(--emerald-500)" }) => (
    <div className="flex flex-col items-center">
        <div className="relative w-28 h-28 transform transition-transform hover:scale-105 duration-300">
            {/* Inner background shadow */}
            <div className="absolute inset-2 bg-[var(--bg-surface)] rounded-full shadow-inner" />
            <svg className="w-28 h-28 transform -rotate-90 relative z-10 drop-shadow-md" viewBox="0 0 100 100">
                <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="var(--border-subtle)"
                    strokeWidth="8"
                    fill="none"
                    className="opacity-50"
                />
                <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${(percentage / 100) * 251.2} 251.2`}
                    className="transition-all duration-1500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <span className="text-2xl font-extrabold text-[var(--text-primary)]">{percentage}<span className="text-sm font-semibold text-[var(--text-muted)] tracking-tighter">%</span></span>
            </div>
        </div>
        <span className="text-sm font-bold text-[var(--text-secondary)] mt-4 text-center uppercase tracking-widest">{label}</span>
    </div>
);

export default function Analysis() {
    const [method, setMethod] = useState("auto");
    const [industry, setIndustry] = useState("tech");
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [selectedHighlights, setSelectedHighlights] = useState([]);
    
    const navigate = useNavigate();
    const location = useLocation();
    const { advanceStep, interviewId, interviewLevel } = useWorkflow();

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const methodParam = urlParams.get('method');
        const industryParam = urlParams.get('industry');
        
        if (methodParam) setMethod(methodParam);
        if (industryParam) setIndustry(industryParam);
        
        if (methodParam && interviewId) {
            runAnalysis(methodParam, industryParam || "tech");
        }
    }, [location.search, interviewId]);

    const runAnalysis = async (selectedMethod = method, selectedIndustry = industry) => {
        setLoading(true);
        try {
            const res = await analyzeProfile(interviewId, interviewLevel || 'standard');
            if(res.resumeRecommendations?.keyHighlights) {
                // Pre-select all highlights by default for better UX
                setSelectedHighlights([...res.resumeRecommendations.keyHighlights]);
            }
            setAnalysis(res);
        } catch (e) {
            alert("Analysis failed: " + (e.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const proceedToResume = async () => {
        advanceStep("resume");
        navigate("/resume", { state: { pending: true, selectedHighlights, method, industry } });
    };

    return (
        <div className="max-w-[1200px] mx-auto py-8 lg:py-12 px-4 animate-fade-in relative">
            {loading && !analysis ? (
                <div className="min-h-[70vh] flex items-center justify-center">
                    <div className="glass-panel p-12 rounded-[var(--radius-xl)] max-w-lg w-full text-center border-[var(--emerald-500)]/20 shadow-[0_8px_32px_rgba(16,185,129,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--emerald-500)]/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--brand-500)]/20 rounded-full blur-[80px] -ml-20 -mb-20"></div>
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-[var(--bg-surface)] rounded-full mx-auto flex items-center justify-center shadow-lg mb-6 shadow-[var(--emerald-500)]/10">
                                <div className="w-10 h-10 border-4 border-[var(--border-subtle)] border-t-[var(--emerald-500)] border-l-[var(--brand-500)] rounded-full animate-spin"></div>
                            </div>
                            <h3 className="text-2xl font-extrabold mb-3 text-[var(--text-primary)]">Analyzing Profile</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed font-medium">
                                AI is determining industry positioning, scoring metrics, and generating ATS strategies...
                            </p>
                        </div>
                    </div>
                </div>
            ) : analysis ? (
                <div className="space-y-10 relative z-10">
                    {/* Header Summary */}
                    <div className="glass-panel p-8 lg:p-12 text-center rounded-[var(--radius-2xl)] border-[var(--emerald-500)]/20 shadow-[0_8px_32px_rgba(16,185,129,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--emerald-500)]/15 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none transition-all duration-1000"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--brand-500)]/15 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none transition-all duration-1000 hover:scale-110"></div>
                        
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--emerald-500)]/30 bg-[var(--emerald-500)]/10 text-[var(--emerald-600)] dark:text-[var(--emerald-400)] text-sm font-bold mb-6 shadow-sm relative z-10 backdrop-blur-md">
                            <Sparkles size={16} className="animate-pulse" /> Analysis Complete
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight text-[var(--text-primary)] relative z-10">Strategic Profile Insights</h1>
                        <p className="text-lg text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed font-medium relative z-10">
                            {analysis.profileSummary}
                        </p>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                        <div className="card p-8 text-center hover:border-[var(--brand-400)]/50 hover:shadow-lg transition-all group">
                            <CircularProgress 
                                percentage={analysis.experienceLevel?.confidence || 85} 
                                label="Profile Confidence"
                                color="var(--emerald-500)"
                            />
                            <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] relative overflow-hidden rounded-xl">
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--emerald-500)]/5 to-transparent -z-10 group-hover:opacity-100 opacity-50 transition-opacity"></div>
                                <div className="text-xl font-extrabold text-[var(--text-primary)] mb-2 capitalize">{analysis.experienceLevel?.category}</div>
                                <div className="text-sm font-bold text-[var(--emerald-600)] dark:text-[var(--emerald-400)] tracking-wide">
                                    ~{analysis.experienceLevel?.yearsEstimate} YEARS EST.
                                </div>
                            </div>
                        </div>

                        <div className="card p-8 text-center hover:border-[var(--emerald-400)]/50 hover:shadow-lg transition-all group">
                            <CircularProgress 
                                percentage={analysis.industryFit?.score || 80} 
                                label="Industry Fit"
                                color="var(--emerald-500)"
                            />
                            <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] relative overflow-hidden rounded-xl h-[92px] flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--emerald-500)]/5 to-transparent -z-10 group-hover:opacity-100 opacity-50 transition-opacity"></div>
                                <div className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed px-2 line-clamp-3">
                                    {analysis.industryFit?.reasoning}
                                </div>
                            </div>
                        </div>

                        <div className="card p-8 text-center hover:border-[#f59e0b]/50 hover:shadow-lg transition-all group">
                            <CircularProgress 
                                percentage={analysis.marketInsights?.demandLevel === 'high' ? 85 : analysis.marketInsights?.demandLevel === 'medium' ? 65 : 45} 
                                label="Market Demand"
                                color="#f59e0b"
                            />
                            <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] relative overflow-hidden rounded-xl">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#f59e0b]/5 to-transparent -z-10 group-hover:opacity-100 opacity-50 transition-opacity"></div>
                                <div className="text-xl font-extrabold text-[var(--text-primary)] mb-2 capitalize">
                                    {analysis.marketInsights?.demandLevel || 'High'} Demand
                                </div>
                                <div className="text-sm font-bold text-[#d97706] dark:text-[#fbbf24] tracking-wide">
                                    {analysis.marketInsights?.salaryRange || '$60k - $120k'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Benchmark Comparisons */}
                    <div>
                        <div className="flex items-center gap-3 mb-6 px-1">
                            <div className="w-10 h-10 rounded-xl bg-[var(--emerald-50)] text-[var(--emerald-600)] dark:bg-[var(--emerald-500)]/10 dark:text-[var(--emerald-400)] flex items-center justify-center shadow-sm border border-[var(--emerald-500)]/20">
                                <BarChart3 size={20} />
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Competitive Standing</h2>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {analysis.benchmarkComparisons?.map((metric, i) => (
                                <MetricCard key={i} metric={metric} />
                            ))}
                        </div>
                    </div>

                    {/* Skills Analysis */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="card p-6 flex flex-col group hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-subtle)]">
                                <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--emerald-50)] text-[var(--emerald-600)] dark:bg-[var(--emerald-500)]/10 dark:text-[var(--emerald-400)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4-4-4 4M6 16l-4-4 4-4"></path></svg>
                                </div>
                                <h3 className="font-bold text-[var(--text-primary)] text-lg">Technical Core</h3>
                            </div>
                            <div className="flex flex-wrap gap-2.5 flex-1">
                                {analysis.skillsAnalysis?.technical?.map((skill, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-lg bg-[var(--bg-highlight)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-semibold shadow-sm hover:border-[var(--emerald-400)] transition-colors">
                                        {skill}
                                    </span>
                                ))}
                                {(!analysis.skillsAnalysis?.technical || analysis.skillsAnalysis.technical.length === 0) && 
                                    <span className="text-[var(--text-disabled)] text-sm font-medium flex items-center gap-2"><AlertCircle size={14}/> No technical skills detected</span>
                                }
                            </div>
                        </div>

                        <div className="card p-6 flex flex-col group hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-subtle)]">
                                <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--emerald-50)] text-[var(--emerald-600)] dark:bg-[var(--emerald-500)]/10 dark:text-[var(--emerald-400)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
                                </div>
                                <h3 className="font-bold text-[var(--text-primary)] text-lg">Soft Skills</h3>
                            </div>
                            <div className="flex flex-wrap gap-2.5 flex-1">
                                {analysis.skillsAnalysis?.soft?.map((skill, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-lg bg-[var(--bg-highlight)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-semibold shadow-sm hover:border-[var(--emerald-400)] transition-colors">
                                        {skill}
                                    </span>
                                ))}
                                {(!analysis.skillsAnalysis?.soft || analysis.skillsAnalysis.soft.length === 0) && 
                                    <span className="text-[var(--text-disabled)] text-sm font-medium flex items-center gap-2"><AlertCircle size={14}/> No soft skills detected</span>
                                }
                            </div>
                        </div>

                        <div className="card p-6 flex flex-col group hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-subtle)]">
                                <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--emerald-50)] text-[var(--emerald-600)] dark:bg-[var(--emerald-500)]/10 dark:text-[var(--emerald-400)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                </div>
                                <h3 className="font-bold text-[var(--text-primary)] text-lg">Leadership</h3>
                            </div>
                            <div className="flex flex-wrap gap-2.5 flex-1">
                                {analysis.skillsAnalysis?.leadership?.map((skill, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-lg bg-[var(--bg-highlight)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-semibold shadow-sm hover:border-[var(--emerald-400)] transition-colors">
                                        {skill}
                                    </span>
                                ))}
                                {(!analysis.skillsAnalysis?.leadership || analysis.skillsAnalysis.leadership.length === 0) && 
                                    <span className="text-[var(--text-disabled)] text-sm font-medium flex items-center gap-2"><AlertCircle size={14}/> No leadership skills detected</span>
                                }
                            </div>
                        </div>
                    </div>

                    {/* Resume Recommendations */}
                    <div className="pt-4">
                        <div className="glass-panel p-8 lg:p-10 rounded-[var(--radius-xl)] shadow-lg relative overflow-hidden border-[var(--border-strong)]">
                            <div className="absolute top-0 right-0 w-4 h-full bg-[var(--emerald-500)]"></div>
                            
                            <h3 className="text-2xl font-extrabold mb-8 text-[var(--text-primary)] flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[var(--emerald-50)] text-[var(--emerald-600)] dark:bg-[var(--emerald-500)]/10 dark:text-[var(--emerald-400)] flex items-center justify-center shadow-sm border border-[var(--emerald-500)]/20">
                                    <FileText size={20} />
                                </div>
                                ATS Strategy & Build Plan
                            </h3>

                            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
                                <div>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-5 flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                                        Select Achievements to Feature
                                        <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-1 rounded shadow-inner border border-[var(--border-subtle)]">Required</span>
                                    </h4>
                                    <div className="space-y-3 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-inner">
                                        {analysis.resumeRecommendations?.keyHighlights?.map((highlight, i) => (
                                            <label key={i} className="flex items-start gap-3 cursor-pointer group p-2 hover:bg-[var(--bg-highlight)] rounded-lg transition-colors">
                                                <div className="relative flex items-start pt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedHighlights.includes(highlight)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedHighlights([...selectedHighlights, highlight]);
                                                            } else {
                                                                setSelectedHighlights(selectedHighlights.filter(h => h !== highlight));
                                                            }
                                                        }}
                                                        className="w-5 h-5 rounded-[4px] border border-[var(--border-strong)] text-[var(--emerald-500)] focus:ring-[var(--emerald-500)] focus:ring-offset-0 bg-[var(--bg-elevated)] cursor-pointer transition-colors shadow-sm"
                                                    />
                                                </div>
                                                <span className={`text-sm leading-relaxed transition-colors font-medium ${selectedHighlights.includes(highlight) ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                                                    {highlight}
                                                </span>
                                            </label>
                                        ))}
                                        {(!analysis.resumeRecommendations?.keyHighlights || analysis.resumeRecommendations.keyHighlights.length === 0) && (
                                            <div className="text-[var(--text-muted)] text-sm italic py-4 text-center">No distinct highlights extracted.</div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-5 flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                                        AI Structural Priorities
                                        <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-1 rounded shadow-inner border border-[var(--border-subtle)]">Auto-Applied</span>
                                    </h4>
                                    <div className="flex flex-wrap gap-3 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-inner h-full content-start">
                                        {analysis.resumeRecommendations?.sectionsToFocus?.map((section, i) => (
                                            <span key={i} className="px-4 py-2 rounded-xl bg-[var(--emerald-50)] border border-[var(--emerald-200)] text-sm font-bold text-[var(--emerald-600)] dark:bg-[var(--emerald-500)]/10 dark:border-[var(--emerald-500)]/30 dark:text-[var(--emerald-400)] shadow-sm flex items-center gap-2">
                                                {i === 0 && <Target size={14} className="opacity-70" />}
                                                {section}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-5 pt-10">
                        <button
                            onClick={() => navigate("/method")}
                            className="btn btn-ghost px-8 py-3.5 order-2 sm:order-1 font-semibold text-[var(--text-secondary)]"
                        >
                            <ArrowLeft size={18} className="mr-2 inline" /> Back
                        </button>
                        <button
                            onClick={proceedToResume}
                            disabled={loading || selectedHighlights.length === 0}
                            className="btn bg-[var(--emerald-500)] hover:bg-[var(--emerald-600)] text-white px-10 py-4 shadow-[0_8px_32px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.4)] transition-all flex items-center gap-3 order-1 sm:order-2 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed group w-full sm:w-auto overflow-hidden relative"
                        >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <span className="relative z-10 flex items-center gap-2">
                                Generate Blueprint
                                <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                            </span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-24 min-h-[60vh] flex flex-col items-center justify-center card bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-elevated)] border-dashed border-2 relative overflow-hidden">
                    <div className="w-20 h-20 bg-[var(--bg-highlight)] text-[var(--text-muted)] rounded-2xl flex items-center justify-center mb-6 shadow-inner transform -rotate-6">
                        <CheckCircle2 size={36} />
                    </div>
                    <h2 className="text-3xl font-extrabold mb-3 text-[var(--text-primary)]">Ready for Analysis</h2>
                    <p className="text-[var(--text-secondary)] mb-8 max-w-md text-lg font-medium leading-relaxed">Please complete the interview and method selection first to unlock your profile analysis.</p>
                    <Link to="/method" className="btn btn-primary px-8 py-3.5 shadow-lg group font-bold">
                        Go to Configuration <ArrowRight size={18} className="ml-2 inline group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            )}
        </div>
    );
}
