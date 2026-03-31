import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Download, Loader2, Sparkles, Image as ImageIcon, Palette, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../api/apiClient";
import ReviewDialog from "../components/ReviewDialog";
import useReviewStatus from "../hooks/useReviewStatus";

const PPTPreview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ppt, setPpt] = useState(null);
    const [theme, setTheme] = useState(null);
    const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
    const [editInstruction, setEditInstruction] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { reviewOpen, setReviewOpen, openReviewIfNew } = useReviewStatus();

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const pptData = await apiClient(`/ppt/${id}`);
                
                if (pptData && pptData.success) {
                    setPpt(pptData.ppt);
                    
                    if (pptData.ppt.themeSlug) {
                        const themesData = await apiClient("/ppt/themes");
                        if (themesData && themesData.success) {
                            const found = themesData.themes.find(t => t.slug === pptData.ppt.themeSlug);
                            if (found) {
                                setTheme(found);
                            } else {
                                // Default fallback theme if not found
                                setTheme({
                                    name: "Default Dark",
                                    slug: "default-dark",
                                    bgColor: "#111827",
                                    textColor: "#f3f4f6",
                                    accentColor: "#10b981",
                                    primaryColor: "#10b981",
                                    fontHeading: "Inter",
                                    fontBody: "Inter"
                                });
                            }
                        }
                    } else {
                        // Default fallback theme if no themeSlug
                        setTheme({
                            name: "Initial Draft",
                            slug: "draft",
                            bgColor: "#111827",
                            textColor: "#f3f4f6",
                            accentColor: "#10b981",
                            primaryColor: "#10b981",
                            fontHeading: "Inter",
                            fontBody: "Inter"
                        });
                    }
                } else {
                    toast.error("Failed to load presentation");
                }
            } catch (err) {
                toast.error("Error loading presentation");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, [id]);

    const handleDownload = () => {
        window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/ppt/download/${id}?token=${localStorage.getItem('token') || ''}`;
        setTimeout(() => openReviewIfNew("ppt"), 800);
    };

    const handleEditSlide = async (e) => {
        e.preventDefault();
        if (!editInstruction.trim()) return;

        setIsEditing(true);
        try {
            const data = await apiClient("/ppt/edit-slide", {
                method: "POST",
                body: JSON.stringify({ pptId: id, slideIndex: selectedSlideIdx, instruction: editInstruction })
            });
            
            if (data && data.success && data.slide) {
                // Update local state instantly
                const updatedSlides = [...ppt.slides];
                updatedSlides[selectedSlideIdx] = data.slide;
                setPpt({ ...ppt, slides: updatedSlides });
                setEditInstruction("");
                toast.success("Slide updated!");
            } else {
                toast.error(data?.error || "Failed to edit slide");
            }
        } catch (err) {
            toast.error(err.message || "An error occurred while editing");
        } finally {
            setIsEditing(false);
        }
    };

    // Helper to render a slide (used for both thumbnails and main view)
    const SlideCanvas = ({ slide, theme: propTheme, isCover, scale = 1 }) => {
        // Fallback theme if not provided
        const theme = propTheme || {
            bgColor: "#111827",
            textColor: "#f3f4f6",
            accentColor: "#10b981",
            primaryColor: "#10b981",
            fontHeading: "Inter",
            fontBody: "Inter"
        };
        if (!slide) return <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400">Loading slide...</div>;

        const hasImage = !!slide.imageUrl;
        const width = 960 * scale;
        const height = 540 * scale;
        
        // Use saved layoutType if available, fallback to basic logic
        const layoutType = slide.layoutType || (isCover ? 'TITLE' : (hasImage ? (slide.order % 2 === 0 ? 'IMAGE_LEFT' : 'IMAGE_RIGHT') : 'TEXT_ONLY'));

        const titleStyle = { 
            color: theme.textColor, 
            fontFamily: theme.fontHeading, 
            fontWeight: 'bold', 
            lineHeight: 1.2,
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
        };

        const bulletContainerStyle = {
            fontFamily: theme.fontBody,
            color: theme.textColor,
            overflowY: 'auto',
            maxHeight: '100%',
        };

        return (
            <div 
                className="relative overflow-hidden shadow-md flex bg-center bg-cover bg-no-repeat transition-all duration-300 select-none"
                style={{ 
                    width: `${width}px`, 
                    height: `${height}px`, 
                    backgroundColor: theme.bgColor,
                    fontSize: `${16 * scale}px`
                }}
            >
                {/* Accent bar left */}
                <div className="absolute top-0 left-0 h-full w-[4%]" style={{ backgroundColor: theme.accentColor }}></div>

                {layoutType === 'TITLE' && (
                    <div className="flex flex-col justify-center w-full h-full pl-[10%] pr-[5%] relative z-10 text-center items-center">
                        <div className="absolute right-0 top-0 w-1/2 h-full rounded-l-full opacity-10 blur-3xl" style={{ backgroundColor: theme.primaryColor }}></div>
                        <h2 style={{ ...titleStyle, fontSize: `${42 * scale}px`, marginBottom: `${16 * scale}px` }}>
                            {slide.title}
                        </h2>
                        <div style={{ backgroundColor: theme.accentColor, width: `${60 * scale}px`, height: `${4 * scale}px`, marginBottom: `${16 * scale}px` }}></div>
                        {slide.bullets?.length > 0 && (
                            <p style={{ color: theme.textColor, fontFamily: theme.fontBody, fontSize: `${20 * scale}px`, opacity: 0.8 }}>
                                {slide.bullets[0]}
                            </p>
                        )}
                    </div>
                )}

                {layoutType === 'TEXT_ONLY' && (
                    <div className="flex flex-col w-full h-full pt-[6%] px-[8%] relative z-10">
                        <h2 style={{ ...titleStyle, fontSize: `${32 * scale}px`, borderBottom: `2px solid ${theme.accentColor}`, paddingBottom: `${8 * scale}px`, marginBottom: `${24 * scale}px`, flexShrink: 0 }}>
                            {slide.title}
                        </h2>
                        <div className="flex-1 overflow-hidden pb-8">
                            <ul className="space-y-4 w-full pr-4 scrollbar-thin scrollbar-thumb-white/10" style={{ ...bulletContainerStyle, fontSize: `${20 * scale}px` }}>
                                {slide.bullets?.map((b, i) => (
                                    <li key={i} className="flex gap-3 leading-relaxed">
                                        <span style={{ color: theme.accentColor, fontWeight: 'bold' }}>•</span>
                                        <span dangerouslySetInnerHTML={{__html: b}} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {layoutType === 'IMAGE_LEFT' && (
                    <div className="flex flex-row w-full h-full pt-[6%] px-[6%] relative z-10 gap-8">
                        <div className="w-[42%] h-[80%] mt-[2%] flex items-center justify-center bg-black/40 rounded border border-white/5 relative overflow-hidden group shadow-xl">
                            <img 
                                src={slide.imageUrl} 
                                alt={slide.title} 
                                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=800&auto=format&fit=crop";
                                    e.target.className = "w-full h-full object-cover opacity-50";
                                }}
                            />
                        </div>
                        <div className="flex flex-col h-full w-[58%] pt-2 overflow-hidden">
                            <h2 style={{ ...titleStyle, fontSize: `${28 * scale}px`, borderBottom: `2px solid ${theme.accentColor}`, paddingBottom: `${8 * scale}px`, marginBottom: `${20 * scale}px`, flexShrink: 0 }}>
                                {slide.title}
                            </h2>
                            <div className="flex-1 overflow-hidden pb-12">
                                <ul className="space-y-3 pr-4 scrollbar-thin scrollbar-thumb-white/10" style={{ ...bulletContainerStyle, fontSize: `${18 * scale}px` }}>
                                    {slide.bullets?.map((b, i) => (
                                        <li key={i} className="flex gap-2 leading-relaxed">
                                            <span style={{ color: theme.accentColor, fontWeight: 'bold' }}>•</span>
                                            <span dangerouslySetInnerHTML={{__html: b}} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {layoutType === 'IMAGE_RIGHT' && (
                    <div className="flex flex-row w-full h-full pt-[6%] px-[6%] relative z-10 gap-8">
                        <div className="flex flex-col h-full w-[58%] pt-2 overflow-hidden">
                            <h2 style={{ ...titleStyle, fontSize: `${28 * scale}px`, borderBottom: `2px solid ${theme.accentColor}`, paddingBottom: `${8 * scale}px`, marginBottom: `${20 * scale}px`, flexShrink: 0 }}>
                                {slide.title}
                            </h2>
                            <div className="flex-1 overflow-hidden pb-12">
                                <ul className="space-y-3 pr-4 scrollbar-thin scrollbar-thumb-white/10" style={{ ...bulletContainerStyle, fontSize: `${18 * scale}px` }}>
                                    {slide.bullets?.map((b, i) => (
                                        <li key={i} className="flex gap-2 leading-relaxed">
                                            <span style={{ color: theme.accentColor, fontWeight: 'bold' }}>•</span>
                                            <span dangerouslySetInnerHTML={{__html: b}} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="w-[42%] h-[80%] mt-[2%] flex items-center justify-center bg-black/40 rounded border border-white/5 relative overflow-hidden group shadow-xl">
                            <img 
                                src={slide.imageUrl} 
                                alt={slide.title} 
                                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=800&auto=format&fit=crop";
                                    e.target.className = "w-full h-full object-cover opacity-50";
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) return <div className="min-h-[50vh] flex items-center justify-center text-[var(--emerald-500)]"><Loader2 className="animate-spin mr-2" /> Loading presentation...</div>;
    if (!ppt) return <div className="text-center py-20 text-[var(--text-secondary)]">Presentation not found.</div>;

    const currentSlide = ppt.slides[selectedSlideIdx];

    return (
        <div className="max-w-[1400px] mx-auto pt-6 pb-12">
            <ReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} type="ppt" />
            <style>{` .font-playfair { font-family: 'Playfair Display', serif; } `}</style>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 card p-6 mb-6 shadow-sm border-[var(--border-subtle)]">
                <div>
                    <h1 className="text-3xl font-bold font-playfair text-[var(--text-primary)] mb-2">{ppt.topic}</h1>
                    <div className="flex gap-3 font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">
                        <span className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2.5 py-1 rounded shadow-sm">{ppt.slides.length} Slides</span>
                        <span className="bg-[var(--emerald-500)]/10 border border-[var(--emerald-500)]/20 px-2.5 py-1 rounded text-[var(--emerald-500)] font-semibold">{theme?.name || 'Default Theme'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-4 py-2 rounded-xl shadow-sm">
                        <Palette size={18} className="text-[var(--emerald-500)]" />
                        <span className="text-sm font-semibold whitespace-nowrap">Theme Color</span>
                        <input
                            type="color"
                            value={theme?.accentColor || "#10b981"}
                            onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value, primaryColor: e.target.value }))}
                            className="w-10 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                        />
                    </div>
                    <button
                        onClick={() => navigate("/builder")}
                        className="btn border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 px-5 py-2 rounded-xl whitespace-nowrap bg-transparent"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <button
                        onClick={handleDownload}
                        className="btn shadow-lg flex items-center gap-2 whitespace-nowrap text-white font-bold"
                        style={{ background: 'linear-gradient(135deg, var(--emerald-400), var(--emerald-600))' }}
                    >
                        <Download size={18} /> Download PPTX
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Thumbnails */}
                <div className="lg:w-1/4 xl:w-1/5 flex flex-col h-[70vh] card border-[var(--border-subtle)] overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex justify-between items-center">
                        <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-widest">Outline</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                        {ppt.slides.map((s, i) => (
                            <div 
                                key={i}
                                onClick={() => setSelectedSlideIdx(i)}
                                className={`cursor-pointer rounded-[var(--radius-lg)] overflow-hidden border-2 transition-all duration-200 relative ${
                                    selectedSlideIdx === i ? "border-[var(--emerald-500)] shadow-[0_0_15px_rgba(var(--emerald-500-rgb),0.2)] ring-2 ring-[var(--emerald-500)]/20 ring-offset-2 ring-offset-[var(--bg-base)] scale-[1.02]" : "border-[var(--border-subtle)] hover:border-[var(--emerald-500)]/50 opacity-80 hover:opacity-100"
                                }`}
                            >
                                {/* Thumbnail container - strictly 16:9 aspect ratio */}
                                <div className="w-full relative bg-[var(--bg-elevated)] aspect-video overflow-hidden">
                                    <div className="absolute inset-0 bg-transparent z-20 hover:bg-white/5 transition-colors"></div> 
                                    <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold z-30 shadow-sm transition-colors ${selectedSlideIdx === i ? "bg-[var(--emerald-500)] text-white" : "bg-black/60 text-white backdrop-blur-sm border border-white/10"}`}>
                                        {i + 1}
                                    </div>
                                    
                                    {/* Scaled sliding canvas content */}
                                    <div className="absolute top-0 left-0 origin-top-left" style={{ 
                                        transform: `scale(0.25)`, // 1/4 the size of 960x540
                                        width: '960px', 
                                        height: '540px'
                                    }}>
                                        <SlideCanvas slide={s} theme={theme} isCover={i === 0} scale={1} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Main Preview & Edit */}
                <div className="lg:w-3/4 xl:w-4/5 flex flex-col gap-6">
                    {/* Main Slide Canvas */}
                    <div className="glass-panel border-[var(--border-subtle)] p-6 lg:p-10 rounded-[var(--radius-xl)] flex items-center justify-center min-h-[50vh] relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--emerald-500)]/5 blur-3xl pointer-events-none rounded-full"></div>
                        <div className="w-full max-w-[960px] aspect-video mx-auto shadow-2xl relative z-10 mx-auto rounded overflow-hidden" style={{
                            // Responsive scaling trick
                            transform: 'scale(min(1, calc(100vw / 1200)))',
                            transformOrigin: 'top center'
                        }}>
                            <SlideCanvas slide={currentSlide} theme={theme} isCover={selectedSlideIdx === 0} scale={1} />
                        </div>
                    </div>

                    {/* AI Edit Tools */}
                    <div className="card p-6 shadow-sm border-[var(--border-subtle)]">
                        <h3 className="flex items-center gap-2 text-[var(--text-primary)] font-bold mb-4 text-sm uppercase tracking-wider">
                            <Sparkles className="text-[var(--emerald-500)]" size={18} /> Refine with AI
                        </h3>
                        <form onSubmit={handleEditSlide} className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="text"
                                value={editInstruction}
                                onChange={(e) => setEditInstruction(e.target.value)}
                                placeholder="e.g. 'Make bullets punchier', 'Add a point about market size'"
                                className="input flex-1 bg-[var(--bg-surface)] text-[var(--text-primary)]"
                            />
                            <button
                                type="submit"
                                disabled={isEditing || !editInstruction.trim()}
                                className="btn border border-[var(--emerald-500)] text-[var(--emerald-600)] dark:text-[var(--emerald-400)] hover:bg-[var(--emerald-500)] hover:text-white px-8 py-3 rounded-[var(--radius-lg)] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap bg-transparent"
                            >
                                {isEditing ? <Loader2 className="animate-spin" size={18} /> : "Apply Changes"}
                            </button>
                        </form>

                        {/* Speaker Notes accordion */}
                        {currentSlide?.speakerNotes && (
                            <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
                                <h4 className="text-[var(--text-muted)] font-bold text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--emerald-500)]"></div>
                                    Speaker Notes
                                </h4>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed font-medium bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)]">{currentSlide.speakerNotes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PPTPreview;
