import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, FileText, ChevronRight, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { resumeAtom } from "../recoil/resumeAtom";
import { workflowAtom } from "../recoil/workflowAtom";
import { getUserResumes, loadResume, deleteResume } from "../api/resumeApi";
import toast from "react-hot-toast";

const HistorySidebar = ({ isOpen, onClose }) => {
    const { resumes, loading, refreshTrigger } = useRecoilValue(resumeHistoryAtom);
    const setHistory = useSetRecoilState(resumeHistoryAtom);
    const setResumeState = useSetRecoilState(resumeAtom);
    const setWorkflow = useSetRecoilState(workflowAtom);
    const navigate = useNavigate();
    const location = useLocation();
    const [loadingResumeId, setLoadingResumeId] = useState(null);

    // Hide sidebar content completely if we are on PPT routes
    const isPptRoute = location.pathname.startsWith('/ppt');
    const isJDTailorPage = location.pathname.startsWith('/career/jd-tailor');
    const isCoverLetterPage = location.pathname.startsWith('/career/cover-letter');
    const isLinkedInPage = location.pathname.startsWith('/career/linkedin');
    const isVoiceInterviewPage = location.pathname.startsWith('/voice-interview');
    const isPortfolioPage = location.pathname.startsWith('/portfolio');
    const isHeadshotPage = location.pathname.startsWith('/headshot');
    const isATSPage = location.pathname.startsWith('/career/ats');
    const isLetterPage = location.pathname.startsWith('/letter');


    const handleResumeClick = async (resumeId, resumeTitle) => {
        setLoadingResumeId(resumeId);
        try {
            const historyData = await loadResume(resumeId);
            if (!historyData) { toast.error("Failed to load resume"); return; }

            const resumeData = historyData.sourceData || {};
            let htmlContent = '';
            if (historyData.fileContent) {
                try { htmlContent = atob(historyData.fileContent); }
                catch { htmlContent = historyData.fileContent; }
            }

            const targetPage = historyData.type === 'jd-tailored' ? 'career/jd-tailor/result' : (historyData.lastPage || 'resume');

            if (historyData.type === 'jd-tailored') {
                const { original, tailored, jobDescription } = historyData.sourceData || {};
                setResumeState(prev => ({ 
                    ...prev, 
                    resumeData: original, 
                    historyId: resumeId 
                }));
                navigate(`/${targetPage}`, { state: { tailoredResult: tailored, jobDescription, resumeData: original } });
            } else if (historyData.type === 'cover-letter') {
                const { resumeData: rData, companyName, jobTitle, coverLetter } = historyData.sourceData || {};
                setResumeState(prev => ({ ...prev, resumeData: rData, historyId: resumeId }));
                navigate('/career/cover-letter/result', { state: { letter: coverLetter, companyName, jobTitle } });
            } else if (historyData.type === 'linkedin-profile') {
                const { resumeData: rData, linkedInData } = historyData.sourceData || {};
                setResumeState(prev => ({ ...prev, resumeData: rData, historyId: resumeId }));
                navigate('/career/linkedin/result', { state: { result: linkedInData, resumeData: rData } });
            } else if (historyData.type === 'headshot') {
                const headshotData = historyData.sourceData || {};
                let image = '';
                if (historyData.fileContent) {
                    image = `data:image/png;base64,${historyData.fileContent}`;
                }
                navigate('/headshot', { state: { image, filter: headshotData.filterName?.toLowerCase(), bg: headshotData.bgColor } });
            } else if (historyData.type === 'portfolio-site') {
                let html = '';
                if (historyData.fileContent) {
                    try {
                        const binaryContent = window.atob(historyData.fileContent);
                        const bytes = new Uint8Array(binaryContent.length);
                        for (let i = 0; i < binaryContent.length; i++) {
                            bytes[i] = binaryContent.charCodeAt(i);
                        }
                        html = new TextDecoder().decode(bytes);
                    } catch (e) {
                        html = window.atob(historyData.fileContent);
                    }
                }
                navigate('/portfolio', { state: { html } });
            } else if (historyData.type === 'voice-interview') {
                const { history: vHistory, finalScores, endReason } = historyData.sourceData || {};
                navigate('/voice-interview', { state: { history: vHistory, scores: finalScores, endReason } });
            } else if (historyData.type === 'ats-heatmap') {
                const { result: atsResult, jobDescription, resumeData: rData } = historyData.sourceData || {};
                setResumeState(prev => ({ ...prev, resumeData: rData || prev.resumeData, historyId: resumeId }));
                navigate('/career/ats', { state: { result: atsResult, jobDescription, resumeData: rData } });
            } else if (historyData.type === 'letter') {
                navigate(`/letter/${resumeId}`);
            } else {
                setResumeState(prev => ({ 
                    ...prev, 
                    resumeData, 
                    htmlContent, 
                    historyId: resumeId, 
                    parentHistoryId: resumeId, 
                    theme: prev.theme || { primary: '#6366f1' } 
                }));
                setWorkflow(prev => ({ ...prev, resumeGenerated: true, currentStep: targetPage }));
                navigate(`/${targetPage}`);
            }
            
            localStorage.setItem('currentResumeHistoryId', resumeId);
            if (window.innerWidth < 1024 && onClose) onClose();
            toast.success(`Resumed: ${resumeTitle}`);
        } catch (error) {
            toast.error("Failed to load resume");
        } finally {
            setLoadingResumeId(null);
        }
    };

    const handleDeleteResume = async (e, resumeId) => {
        e.stopPropagation(); // Prevent clicking on the resume card
        if (!window.confirm("Are you sure you want to delete this resume history?")) return;
        
        try {
            await deleteResume(resumeId);
            setHistory(prev => ({
                ...prev,
                resumes: prev.resumes.filter(r => r.id !== resumeId)
            }));
            toast.success("Resume history deleted");
            
            // If the deleted resume is the currently active one, you might want to handle that (e.g., clear state)
            const activeId = localStorage.getItem('currentResumeHistoryId');
            if (activeId === resumeId) {
                // Optional: reset current state, though skipping to avoid interrupting user flow is fine too
            }
        } catch (error) {
            toast.error("Failed to delete resume history");
            console.error("Delete error:", error);
        }
    };

    // Determine active resume ID
    const activeResumeId = localStorage.getItem('currentResumeHistoryId');

    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                // Background loading: don't clear existing resumes to prevent UI flicker
                setHistory(prev => ({ ...prev, loading: prev.resumes.length === 0 }));
                const data = await getUserResumes();
                if (!mounted) return;
                const mapped = (Array.isArray(data) ? data : []).map(item => ({
                    id: item._id || item.id,
                    title: item.title || "Untitled Resume",
                    createdAt: item.createdAt,
                    type: item.type
                }));
                setHistory(prev => ({
                    ...prev,
                    resumes: mapped,
                    loading: false,
                    currentResumeId: mapped[0]?.id || prev.currentResumeId
                }));
            } catch (err) {
                setHistory(prev => ({ ...prev, loading: false }));
            }
        }
        if (!isPptRoute) {
            load();
        }
        return () => { mounted = false; };
    }, [setHistory, isPptRoute, location.pathname, refreshTrigger]);



    // Don't render the sidebar AT ALL on PPT routes
    if (isPptRoute) return null;

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-40 bg-[var(--bg-overlay)] backdrop-blur-sm lg:hidden opacity-80" onClick={onClose} />
            )}

            <aside className={`fixed top-16 left-0 bottom-0 z-40 w-72 bg-[var(--bg-elevated)] border-r border-[var(--border-subtle)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
                <div className="p-5 h-full flex flex-col">

                    <div className="flex items-center gap-2 mb-6 px-1">
                        <Sparkles size={16} className="text-[var(--brand-500)]" />
                        <h2 className="font-bold text-[var(--text-primary)] text-sm tracking-wide uppercase">
                            {isLinkedInPage ? "LINKEDIN HISTORY" : (isCoverLetterPage ? "LETTER GENERATOR HISTORY" : (isJDTailorPage ? "JD TAILOR HISTORY" : (isATSPage ? "ATS HEATMAP HISTORY" : (isVoiceInterviewPage ? "VOICE INTERVIEW HISTORY" : (isPortfolioPage ? "PORTFOLIO HISTORY" : (isHeadshotPage ? "HEADSHOT HISTORY" : (isLetterPage ? "LETTER HISTORY" : "YOUR RESUMES")))))))}
                        </h2>
                    </div>

                    {/* Resume list */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2.5">
                        <div className="section-label px-1 mb-2">Recent</div>

                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="w-6 h-6 border-2 border-[var(--brand-500)]/30 border-t-[var(--brand-500)] rounded-full animate-spin" />
                            </div>
                        ) : (() => {
                            let filteredResumes = [];
                            if (isCoverLetterPage) {
                                filteredResumes = resumes.filter(r => r.type === 'cover-letter');
                            } else if (isLinkedInPage) {
                                filteredResumes = resumes.filter(r => r.type === 'linkedin-profile');
                            } else if (isJDTailorPage) {
                                filteredResumes = resumes.filter(r => r.type === 'jd-tailored');
                            } else if (isATSPage) {
                                filteredResumes = resumes.filter(r => r.type === 'ats-heatmap');
                            } else if (isVoiceInterviewPage) {
                                filteredResumes = resumes.filter(r => r.type === 'voice-interview');
                            } else if (isPortfolioPage) {
                                filteredResumes = resumes.filter(r => r.type === 'portfolio-site');
                            } else if (isHeadshotPage) {
                                filteredResumes = resumes.filter(r => r.type === 'headshot');
                            } else if (isLetterPage) {
                                filteredResumes = resumes.filter(r => r.type === 'letter');
                            } else {
                                filteredResumes = resumes.filter(r => r.type === 'resume-html' || r.type === 'resume-pdf' || !r.type);
                            }

                            if (filteredResumes.length === 0) {
                                return (
                                    <div key="empty-state" className="text-center py-12 px-4 border border-dashed border-[var(--border-base)] mx-1 rounded-2xl bg-[var(--bg-surface)]">
                                        <div className="w-12 h-12 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--text-disabled)] shadow-inner">
                                            <FileText size={20} />
                                        </div>
                                        <p className="text-sm text-[var(--text-muted)] font-medium">No {isLinkedInPage ? 'profiles' : (isCoverLetterPage ? 'letters' : (isJDTailorPage ? 'history' : (isATSPage ? 'analysis' : (isVoiceInterviewPage ? 'sessions' : (isPortfolioPage ? 'portfolios' : (isHeadshotPage ? 'headshots' : (isLetterPage ? 'letters' : 'resumes')))))))} yet</p>
                                        <p className="text-xs text-[var(--text-disabled)] mt-1">{isLinkedInPage ? 'Optimize your first profile!' : (isCoverLetterPage ? 'Generate your first letter!' : (isJDTailorPage ? 'Tailor your first resume!' : (isATSPage ? 'Analyze your first JD match!' : (isVoiceInterviewPage ? 'Start your first voice practice!' : (isPortfolioPage ? 'Create your first portfolio!' : (isHeadshotPage ? 'Studio your first headshot!' : (isLetterPage ? 'Write your first letter!' : 'Start by creating one!')))))))}</p>
                                    </div>
                                );
                            }


                            return filteredResumes.map((resume) => {
                                const isActive = activeResumeId === resume.id;
                                return (
                                <button
                                    key={resume.id || `history-${resume.createdAt}`}
                                    onClick={() => handleResumeClick(resume.id, resume.title)}
                                    disabled={loadingResumeId === resume.id}
                                    className={`w-full text-left p-3 rounded-xl border group flex items-center justify-between transition-all disabled:opacity-50 ${isActive ? 'border-[var(--brand-500)] bg-[var(--bg-hover)] shadow-sm' : 'border-transparent hover:border-[var(--brand-200)] dark:hover:border-[var(--border-base)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] hover:shadow-sm'}`}
                                >
                                    <div className="flex items-center gap-3 w-[calc(100%-48px)]">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-[var(--brand-50)] text-[var(--brand-500)] dark:bg-[var(--brand-500)]/20' : 'bg-[var(--bg-highlight)] text-[var(--text-muted)] group-hover:bg-[var(--brand-50)] group-hover:text-[var(--brand-500)] dark:group-hover:bg-[var(--brand-500)]/20'}`}>
                                            {loadingResumeId === resume.id ? (
                                                <Loader2 size={16} className="animate-spin text-[var(--brand-500)]" />
                                            ) : (
                                                <FileText size={16} />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-[var(--brand-600)] dark:text-[var(--brand-400)]' : 'text-[var(--text-primary)] group-hover:text-[var(--brand-600)] dark:group-hover:text-[var(--brand-400)]'}`}>
                                                {resume.title || "Untitled Resume"}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                                {new Date(resume.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span onClick={(e) => handleDeleteResume(e, resume.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mr-1" title="Delete">
                                            <Trash2 size={14} />
                                        </span>
                                        <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                    </div>
                                    </button>
                                );
                            });
                        })()}
                    </div>

                    <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
                        <div className="px-2 py-2 text-xs font-medium text-[var(--text-muted)] flex items-center gap-2 bg-[var(--bg-surface)] rounded-lg">
                            <Clock size={14} className="text-[var(--brand-400)]" />
                            <span>Auto-saved continuously</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default HistorySidebar;
