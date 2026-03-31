import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Image as ImageIcon, ImageOff, Images, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../api/apiClient";

const PPTImages = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [preference, setPreference] = useState("none");
    const [topic, setTopic] = useState("Loading...");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchPPT = async () => {
            try {
                const data = await apiClient(`/ppt/${id}`);
                if (data && data.success && data.ppt) {
                    setTopic(data.ppt.topic);
                    setPreference(data.ppt.imagePreference || "none");
                }
            } catch (err) {
                toast.error("Error loading PPT details");
            }
        };
        fetchPPT();
    }, [id]);

    const handleNext = async () => {
        setIsSaving(true);
        try {
            await apiClient(`/ppt/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ imagePreference: preference, status: "theme" })
            });
            navigate(`/ppt/theme/${id}`);
        } catch (err) {
            toast.error(err.message || "Error saving preference");
        } finally {
            setIsSaving(false);
        }
    };

    const options = [
        {
            id: "none",
            title: "Minimalist",
            subtitle: "No images. Focus on clean typography and content.",
            icon: ImageOff,
            features: ["Fastest generation", "Professional tone", "Text-heavy layouts"]
        },
        {
            id: "some",
            title: "Balanced",
            subtitle: "Images on alternate slides. A balanced visual approach.",
            icon: ImageIcon,
            features: ["3-5 high-quality images", "Curated by AI", "Engaging but clean"]
        },
        {
            id: "more",
            title: "Visual Heavy",
            subtitle: "An image on every slide. High impact presentation.",
            icon: Images,
            features: ["Image on every slide", "Maximum visual impact", "Requires more research time"]
        }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-fade-in-up font-dm pb-12">
            <style>{` .font-playfair { font-family: 'Playfair Display', serif; } `}</style>

            <div className="text-center space-y-4 pt-12">
                <p className="text-[#c9a84c] text-sm uppercase tracking-widest font-semibold">Step 2: Visuals</p>
                <h1 className="text-4xl lg:text-5xl font-bold font-playfair text-[#f0ede6]">Image Preference</h1>
                <p className="text-[#888888] font-light text-lg max-w-2xl mx-auto">
                    How many AI-curated images should we search for and include in your presentation about "{topic}"?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                {options.map((opt) => {
                    const isSelected = preference === opt.id;
                    const Icon = opt.icon;
                    return (
                        <div
                            key={opt.id}
                            onClick={() => setPreference(opt.id)}
                            className={`group relative flex flex-col items-center text-center p-8 rounded-[2px] border-2 cursor-pointer transition-all duration-300 ${
                                isSelected ? "bg-[#1a1a1a] border-[#c9a84c] shadow-[0_0_30px_rgba(201,168,76,0.1)] -translate-y-2" : "bg-[#111111] border-[#222222] hover:border-[#c9a84c]/50 hover:bg-[#151515] hover:-translate-y-1"
                            }`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${
                                isSelected ? "bg-[#c9a84c]/20 text-[#c9a84c]" : "bg-[#1a1a1a] text-[#888888] group-hover:text-[#c9a84c]"
                            }`}>
                                <Icon size={32} />
                            </div>
                            
                            <h3 className={`text-2xl font-semibold font-playfair mb-3 transition-colors ${isSelected ? "text-[#f0ede6]" : "text-[#aaaaaa] group-hover:text-[#f0ede6]"}`}>
                                {opt.title}
                            </h3>
                            
                            <p className="text-[#888888] font-light text-sm mb-8 leading-relaxed">
                                {opt.subtitle}
                            </p>

                            <ul className="w-full space-y-3 mt-auto border-t border-[#222222] pt-6">
                                {opt.features.map((feature, i) => (
                                    <li key={i} className="text-xs text-[#666666] font-medium flex items-center justify-center gap-2">
                                        <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-[#c9a84c]" : "bg-[#444]"}`}></div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={handleNext}
                    disabled={isSaving}
                    className="bg-[#c9a84c] hover:bg-[#d6b75c] text-[#0a0a0a] px-12 py-4 rounded-[2px] font-semibold text-lg transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : <>Continue to Theme <ArrowRight /></>}
                </button>
            </div>
        </div>
    );
};

export default PPTImages;
