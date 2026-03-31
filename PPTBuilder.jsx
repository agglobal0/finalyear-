import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilState } from "recoil";
import { pptListAtom, pptSearchQueryAtom } from "../recoil/pptAtoms";
import { Search, Plus, MonitorPlay, Clock, ChevronRight, Hash, Sparkles, Trash2 } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import apiClient from "../api/apiClient";

const PPTBuilder = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ppts, setPpts] = useRecoilState(pptListAtom);
    const [searchQuery, setSearchQuery] = useRecoilState(pptSearchQueryAtom);
    const [topic, setTopic] = useState("");
    const [slideCount, setSlideCount] = useState(8);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch PPTs
    useEffect(() => {
        const fetchPpts = async () => {
            try {
                const data = await apiClient("/ppt/list");
                if (data && data.success) {
                    setPpts(data.ppts);
                }
            } catch (error) {
                console.error("Failed to fetch PPTs:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPpts();
    }, [setPpts]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsGenerating(true);
        try {
            const data = await apiClient("/ppt/generate-outline", {
                method: "POST",
                body: JSON.stringify({ topic: topic.trim(), slideCount })
            });

            if (data && data.success && data.pptId) {
                navigate(`/ppt/outline/${data.pptId}`);
            } else {
                toast.error(data?.error || "Failed to generate outline");
                setIsGenerating(false);
            }
        } catch (error) {
            toast.error(error.message || "An error occurred during generation.");
            setIsGenerating(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Avoid navigating to preview
        if (!window.confirm("Are you sure you want to delete this presentation?")) return;

        try {
            const data = await apiClient(`/ppt/${id}`, { method: "DELETE" });
            if (data && data.success) {
                toast.success("Presentation deleted");
                setPpts(ppts.filter(p => p._id !== id));
            } else {
                toast.error(data?.error || "Failed to delete presentation");
            }
        } catch (error) {
            toast.error(error.message || "Failed to delete presentation");
        }
    };

    const filteredPpts = ppts.filter(p => p.topic.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-12 animate-fade-in-up">
            <LoadingScreen active={isGenerating} stages={["Researching topic with AI...", `Drafting ${slideCount} slide outline...`]} />

            {/* Header Section */}
            <div className="glass-panel relative overflow-hidden p-8 md:p-12 mb-12 shadow-lg w-full max-w-5xl mx-auto border-[var(--gold-500)]/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--emerald-500)]/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--gold-500)]/10 blur-[80px] rounded-full pointer-events-none -z-10"></div>

                <div className="flex items-center gap-2 mb-4">
                    <span className="badge badge-emerald">
                        <Sparkles size={14} /> AI Powered
                    </span>
                </div>

                <h1 className="text-3xl lg:text-5xl font-extrabold mb-4 text-[var(--text-primary)] tracking-tight font-playfair">
                    Presentation Builder
                </h1>
                <p className="text-[var(--text-secondary)] font-light text-lg mb-8 max-w-2xl leading-relaxed">
                    Enter a topic to leverage local AI. We'll generate an outline, curate content, and build a beautiful slide deck for you in seconds.
                </p>

                <form onSubmit={handleGenerate} className="flex flex-col gap-6 max-w-3xl relative z-10">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <MonitorPlay className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. The Future of Quantum Computing"
                                className="input py-4 pl-12 shadow-sm text-base bg-[var(--bg-surface)] focus:border-[var(--emerald-500)] focus:ring-1 focus:ring-[var(--emerald-500)]"
                                required
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                <select
                                    value={slideCount}
                                    onChange={(e) => setSlideCount(Number(e.target.value))}
                                    className="input py-4 pl-9 pr-8 shadow-sm text-base appearance-none bg-[var(--bg-surface)] font-medium text-[var(--text-primary)] focus:border-[var(--emerald-500)] cursor-pointer"
                                >
                                    <option value={8}>8 Slides</option>
                                    <option value={10}>10 Slides</option>
                                    <option value={15}>15 Slides</option>
                                    <option value={20}>20 Slides</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isGenerating || !topic.trim()}
                                className="btn shadow-[var(--shadow-brand)] hover:shadow-lg transition-all py-4 px-8 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, var(--emerald-400), var(--emerald-600))'
                                }}
                            >
                                <Plus size={20} />
                                Generate
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* History Section */}
            <div className="max-w-7xl mx-auto mt-12 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold font-playfair tracking-tight flex items-center gap-2 text-[var(--text-primary)]">
                        <MonitorPlay size={24} className="text-[var(--text-muted)]" />
                        Your Presentations
                    </h2>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by topic..."
                            className="input pl-10 bg-[var(--bg-surface)]"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="shimmer rounded-[var(--radius-lg)] h-48 border border-[var(--border-subtle)]"></div>
                        ))}
                    </div>
                ) : filteredPpts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredPpts.map((ppt) => (
                            <div
                                key={ppt._id}
                                onClick={() => {
                                    if (ppt.status === "outline") navigate(`/ppt/outline/${ppt._id}`);
                                    else if (ppt.status === "images") navigate(`/ppt/images/${ppt._id}`);
                                    else if (ppt.status === "theme") navigate(`/ppt/theme/${ppt._id}`);
                                    else navigate(`/ppt/preview/${ppt._id}`);
                                }}
                                className="card group cursor-pointer flex flex-col h-56 transition-all hover:-translate-y-1 overflow-hidden relative"
                            >
                                {/* PPT Card Header abstract pattern */}
                                <div className="h-16 w-full bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-highlight)] relative overflow-hidden border-b border-[var(--border-subtle)]">
                                    <div className="absolute top-2 right-2 flex gap-1 items-center z-10">
                                        <button
                                            onClick={(e) => handleDelete(e, ppt._id)}
                                            className="p-1.5 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-red-500 rounded-md shadow-sm xl:opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Presentation"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <div className="p-1.5 bg-[var(--bg-surface)] rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight size={14} className="text-[var(--emerald-500)]" />
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 text-[var(--border-strong)] opacity-10 blur-[1px]">
                                        <MonitorPlay size={64} />
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col pt-4">
                                    <h3 className="font-bold text-[var(--text-primary)] text-lg mb-2 line-clamp-2 leading-tight group-hover:text-[var(--emerald-600)] dark:group-hover:text-[var(--emerald-400)] transition-colors">
                                        {ppt.topic}
                                    </h3>

                                    <div className="mt-auto flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium border-t border-[var(--border-subtle)] pt-4">
                                        <span className="flex items-center gap-1.5 bg-[var(--bg-elevated)] px-2.5 py-1.5 rounded-md border border-[var(--border-subtle)]">
                                            <Hash size={12} className="text-[var(--emerald-500)]" />
                                            {ppt.slides?.length || ppt.slideCount || 8} slides
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={12} /> {new Date(ppt.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-[var(--radius-xl)] bg-[var(--bg-surface)] max-w-3xl mx-auto shadow-sm">
                        <div className="w-16 h-16 bg-[var(--bg-elevated)] text-[var(--text-disabled)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-subtle)]">
                            <MonitorPlay size={28} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No presentations found</h3>
                        <p className="text-[var(--text-muted)] font-light max-w-sm mx-auto">
                            {searchQuery ? `We couldn't find any presentations matching "${searchQuery}".` : "You haven't generated any presentations yet. Start by entering a topic above!"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PPTBuilder;
