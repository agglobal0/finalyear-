import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import LoadingScreen from "../components/LoadingScreen";
import apiClient from "../api/apiClient";

const PPTTheme = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [themes, setThemes] = useState([]);
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [topic, setTopic] = useState("");
    const [imagePreference, setImagePreference] = useState("none");
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const [pptData, themesData] = await Promise.all([
                    apiClient(`/ppt/${id}`),
                    apiClient("/ppt/themes")
                ]);

                if (pptData && pptData.success) {
                    setTopic(pptData.ppt.topic);
                    setImagePreference(pptData.ppt.imagePreference || "none");
                    const savedTheme = pptData.ppt.themeSlug;

                    if (themesData && themesData.success && themesData.themes.length > 0) {
                        setThemes(themesData.themes);
                        if (savedTheme) {
                            setSelectedTheme(themesData.themes.find(t => t.slug === savedTheme) || themesData.themes[0]);
                        } else {
                            setSelectedTheme(themesData.themes[0]);
                        }
                    }
                }
            } catch (err) {
                toast.error("Failed to load themes data");
            } finally {
                setLoadingInfo(false);
            }
        };
        init();
    }, [id]);

    const handleGenerate = async () => {
        if (!selectedTheme) return;
        setIsGenerating(true);
        try {
            const data = await apiClient("/ppt/generate", {
                method: "POST",
                body: JSON.stringify({
                    pptId: id,
                    themeSlug: selectedTheme.slug,
                    imagePreference: imagePreference
                })
            });
            if (data && data.success) {
                navigate(`/ppt/preview/${id}`);
            } else {
                toast.error(data?.error || "Generation failed");
                setIsGenerating(false);
            }
        } catch (err) {
            toast.error(err.message || "Critical error during generation");
            setIsGenerating(false);
        }
    };

    if (loadingInfo) return <div className="min-h-[50vh] flex items-center justify-center text-[#c9a84c]"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up font-dm pb-12">
            <style>{` .font-playfair { font-family: 'Playfair Display', serif; } `}</style>

            <LoadingScreen
                active={isGenerating}
                stages={[
                    "Reading web research data...",
                    "Analyzing slide outlines...",
                    "Writing speaker notes...",
                    "Finding perfect images...",
                    "Applying theme styles...",
                    "Building final PPTX file..."
                ]}
            />

            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 mt-6">
                <div>
                    <p className="text-[#c9a84c] text-sm uppercase tracking-widest font-semibold mb-2">Step 3: Design</p>
                    <h1 className="text-4xl lg:text-5xl font-bold font-playfair text-[#f0ede6]">Theme Selection</h1>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedTheme}
                    className="bg-[#c9a84c] hover:bg-[#d6b75c] text-[#0a0a0a] px-8 py-4 rounded-[2px] font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap min-w-[240px] shadow-lg shadow-[#c9a84c]/20"
                >
                    <Wand2 size={20} /> Generate Presentation
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Side: Theme Grid */}
                <div className="lg:col-span-5 border-r border-[#222222] pr-0 lg:pr-10">
                    <h2 className="text-[#888888] font-medium mb-6 flex items-center justify-between">
                        Available Themes
                        <span className="text-xs bg-[#1a1a1a] px-2 py-1 rounded text-[#c9a84c]">{themes.length} Options</span>
                    </h2>

                    <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#333333]">
                        {themes.map(t => {
                            const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
                            const imgUrl = t.previewImage.startsWith('http')
                                ? t.previewImage
                                : API_BASE.replace(/\/api$/, '') + t.previewImage;
                            return (
                                <div
                                    key={t.slug}
                                    onClick={() => setSelectedTheme(t)}
                                    className={`cursor-pointer rounded-[2px] overflow-hidden border-2 transition-all duration-300 ${selectedTheme?.slug === t.slug ? "border-[#c9a84c] shadow-[0_0_15px_rgba(201,168,76,0.2)]" : "border-[#222222] hover:border-[#c9a84c]/40"
                                        }`}
                                >
                                    <img src={imgUrl} alt={t.name} className="w-full object-cover aspect-video bg-[#0a0a0a]" />
                                    <div className="p-3 bg-[#111111]">
                                        <h3 className={`text-sm font-medium truncate ${selectedTheme?.slug === t.slug ? "text-[#c9a84c]" : "text-[#f0ede6]"}`}>
                                            {t.name}
                                        </h3>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Live Preview */}
                <div className="lg:col-span-7">
                    <h2 className="text-[#888888] font-medium mb-6">Live Cover Slide Preview</h2>

                    {selectedTheme && (
                        <div
                            className="w-full aspect-video rounded-[2px] shadow-2xl relative overflow-hidden transition-colors duration-700 flex flex-col justify-center border border-[#222222]"
                            style={{ backgroundColor: selectedTheme.bgColor }}
                        >
                            {/* Decorative elements based on theme */}
                            <div className="absolute top-0 left-0 w-4 h-full" style={{ backgroundColor: selectedTheme.accentColor }}></div>
                            <div className="absolute right-12 top-12 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ backgroundColor: selectedTheme.primaryColor }}></div>

                            <div className="pl-24 pr-16 relative z-10 w-full">
                                <h2
                                    className="text-4xl md:text-5xl xl:text-6xl font-bold mb-6 drop-shadow-md tracking-tight leading-tight"
                                    style={{ color: selectedTheme.textColor, fontFamily: selectedTheme.fontHeading }}
                                >
                                    {topic}
                                </h2>

                                <div className="w-24 h-1 mb-8" style={{ backgroundColor: selectedTheme.accentColor }}></div>

                                <p
                                    className="text-xl opacity-90 tracking-wide font-light"
                                    style={{ color: selectedTheme.textColor, fontFamily: selectedTheme.fontBody }}
                                >
                                    Generated automatically by AI
                                    <br />
                                    <span className="text-sm opacity-50 mt-2 block">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 bg-[#151515] p-6 rounded-[2px] border border-[#222222]">
                        <h4 className="text-sm uppercase tracking-wider text-[#888888] font-bold mb-4 font-mono">Theme Specifications</h4>
                        {selectedTheme && (
                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: selectedTheme.bgColor }}></div>
                                    <span className="text-[#888888]">Background</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: selectedTheme.textColor }}></div>
                                    <span className="text-[#888888]">Text</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: selectedTheme.accentColor }}></div>
                                    <span className="text-[#888888]">Accent</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: selectedTheme.primaryColor }}></div>
                                    <span className="text-[#888888]">Primary</span>
                                </div>
                                <div className="col-span-2 text-[#666666] flex justify-between mt-2 pt-4 border-t border-[#333333]">
                                    <span>Heading: {selectedTheme.fontHeading}</span>
                                    <span>Body: {selectedTheme.fontBody}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PPTTheme;
