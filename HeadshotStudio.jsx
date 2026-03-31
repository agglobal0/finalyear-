import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Download, Sliders, Upload, RefreshCcw, Sparkles, User } from "lucide-react";
import { useSetRecoilState } from "recoil";
import { resumeHistoryAtom } from "../recoil/resumeHistoryAtom";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../api/apiClient";

const FILTERS = [
    { id: "studio",    name: "Studio",       css: "brightness(1.05) contrast(1.1) saturate(1.1)", desc: "Warm, professional studio look" },
    { id: "crisp",     name: "Crisp B&W",    css: "grayscale(1) contrast(1.2) brightness(1.1)", desc: "Clean black & white" },
    { id: "soft",      name: "Soft Light",   css: "brightness(1.15) contrast(0.95) saturate(0.9)", desc: "Soft, approachable tone" },
    { id: "vivid",     name: "Vivid",        css: "saturate(1.4) contrast(1.1) brightness(1.02)", desc: "Bold, vibrant colors" },
    { id: "matte",     name: "Matte",        css: "contrast(0.9) brightness(1.05) saturate(0.85)", desc: "Social-media matte style" },
    { id: "original",  name: "Original",     css: "none", desc: "No filter" },
];

export default function HeadshotStudio() {
    const navigate = useNavigate();
    const fileRef = useRef(null);
    const canvasRef = useRef(null);
    const imgRef = useRef(null);

    const [imageSrc, setImageSrc] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState("studio");
    const [bgColor, setBgColor] = useState("#1a1a2e");
    const [downloading, setDownloading] = useState(false);
    const setHistoryAtom = useSetRecoilState(resumeHistoryAtom);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.image) {
            setImageSrc(location.state.image);
            if (location.state.filter) setSelectedFilter(location.state.filter);
            if (location.state.bg) setBgColor(location.state.bg);
        }
    }, [location.state]);

    const activeFilter = FILTERS.find(f => f.id === selectedFilter) || FILTERS[0];

    const handleFile = (file) => {
        if (!file || !file.type.startsWith("image/")) return toast.error("Please upload an image file.");
        const reader = new FileReader();
        reader.onload = (e) => setImageSrc(e.target.result);
        reader.readAsDataURL(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
    };

    const downloadImage = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        setDownloading(true);
        const ctx = canvas.getContext("2d");
        const size = 600;
        canvas.width = size;
        canvas.height = size;

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);

        // Draw image centered/cropped to square
        const ratio = Math.min(size / img.naturalWidth, size / img.naturalHeight);
        const w = img.naturalWidth * ratio;
        const h = img.naturalHeight * ratio;
        const x = (size - w) / 2;
        const y = (size - h) / 2;

        // Apply CSS-like filter via canvas filter API
        const filterMap = {
            studio: "brightness(1.05) contrast(1.1) saturate(1.1)",
            crisp: "grayscale(1) contrast(1.2) brightness(1.1)",
            soft: "brightness(1.15) contrast(0.95) saturate(0.9)",
            vivid: "saturate(1.4) contrast(1.1) brightness(1.02)",
            matte: "contrast(0.9) brightness(1.05) saturate(0.85)",
            original: "",
        };
        ctx.filter = filterMap[selectedFilter] || "";
        ctx.drawImage(img, x, y, w, h);

        canvas.toBlob(async (blob) => {
            if (!blob) return setDownloading(false);
            
            // 1. Process local download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `headshot_${selectedFilter}.png`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Headshot downloaded!");

            // 2. Prepare for backend save
            const saveToHistory = new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    try {
                        const base64data = reader.result;
                        const res = await apiClient("/saveHeadshot", {
                            method: "POST",
                            body: JSON.stringify({
                                image: base64data,
                                filterName: activeFilter.name,
                                bgColor: bgColor
                            }),
                        });
                        
                        if (res?.success && res.historyId) {
                            setHistoryAtom(prev => ({
                                ...prev,
                                resumes: [{
                                    id: res.historyId,
                                    title: `Headshot — ${activeFilter.name}`,
                                    createdAt: new Date().toISOString(),
                                    type: 'headshot'
                                }, ...prev.resumes]
                            }));
                            resolve(res);
                        } else {
                            reject(new Error(res?.error || "Failed to save"));
                        }
                    } catch (err) {
                        reject(err);
                    }
                };
            });

            toast.promise(saveToHistory, {
                loading: 'Saving to history...',
                success: 'Added to your history!',
                error: 'Could not save to history.',
            });

            setDownloading(false);
        }, "image/png");
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <header className="sticky top-0 z-10 backdrop-blur bg-[var(--bg-base)]/80 border-b border-[var(--border-subtle)]">
                <div className="page-wrapper py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/")} className="btn btn-ghost btn-sm gap-2">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className="h-5 w-px bg-[var(--border-subtle)]" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center">
                                <Camera size={16} className="text-rose-400" />
                            </div>
                            <span className="font-semibold">Headshot Studio</span>
                        </div>
                    </div>
                    {imageSrc && (
                        <button onClick={downloadImage} disabled={downloading} className="btn btn-sm gap-1.5 text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #f857a6, #ff5858)" }}>
                            <Download size={14} /> {downloading ? "Saving…" : "Download PNG"}
                        </button>
                    )}
                </div>
            </header>

            {/* Hidden canvas for export */}
            <canvas ref={canvasRef} className="hidden" />

            <main className="page-wrapper py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold mb-2">AI Headshot <span style={{ background: "linear-gradient(135deg, #f857a6, #ff5858)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Studio</span></h1>
                        <p className="text-[var(--text-secondary)]">Upload a photo and apply professional filter presets to create a polished headshot — all in-browser, no upload required.</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Left: Upload + Preview */}
                        <div className="space-y-4">
                            {!imageSrc ? (
                                <div
                                    className="card border-dashed border-2 border-[var(--border-base)] p-12 text-center cursor-pointer hover:border-[var(--brand-500)] hover:bg-[var(--brand-500)]/5 transition-all"
                                    onDrop={onDrop}
                                    onDragOver={e => e.preventDefault()}
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <Upload size={36} className="mx-auto mb-4 text-[var(--text-muted)]" />
                                    <p className="font-semibold text-[var(--text-secondary)]">Drag & drop your photo here</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">or click to browse — JPG, PNG, WEBP</p>
                                    <button className="btn btn-primary mt-6 gap-2"><Upload size={14} /> Choose Photo</button>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Preview box */}
                                    <div
                                        className="relative rounded-2xl overflow-hidden aspect-square border border-[var(--border-subtle)] flex items-center justify-center"
                                        style={{ background: bgColor }}
                                    >
                                        <img
                                            ref={imgRef}
                                            src={imageSrc}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                            style={{ filter: activeFilter.css === "none" ? "" : activeFilter.css }}
                                        />
                                        {/* Filter badge */}
                                        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/50 text-white backdrop-blur">
                                            {activeFilter.name}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setImageSrc(null); fileRef.current?.click(); }}
                                        className="btn btn-secondary w-full gap-2 text-sm"
                                    >
                                        <RefreshCcw size={14} /> Change Photo
                                    </button>

                                    {/* Background color */}
                                    <div className="card p-4">
                                        <p className="section-label mb-3">Background Color</p>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={bgColor}
                                                onChange={e => setBgColor(e.target.value)}
                                                className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border-subtle)] bg-transparent"
                                            />
                                            <div className="flex gap-2 flex-wrap">
                                                {["#1a1a2e", "#0f172a", "#1e293b", "#ffffff", "#f1f5f9", "#0a0a0a"].map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setBgColor(c)}
                                                        className={`w-7 h-7 rounded-full border-2 transition-all ${bgColor === c ? "border-[var(--brand-500)] scale-110" : "border-[var(--border-base)]"}`}
                                                        style={{ background: c }}
                                                        title={c}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Filter picker */}
                        <div className="space-y-4">
                            <div className="card p-5">
                                <h3 className="font-bold mb-4 flex items-center gap-2"><Sliders size={16} /> Filter Presets</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {FILTERS.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setSelectedFilter(f.id)}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${selectedFilter === f.id ? "border-[var(--brand-500)] bg-[var(--brand-500)]/5" : "border-[var(--border-subtle)] hover:border-[var(--border-base)]"}`}
                                        >
                                            <p className="font-semibold text-sm text-[var(--text-primary)]">{f.name}</p>
                                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{f.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!imageSrc && (
                                <div className="card p-5 border-[var(--brand-500)]/20 bg-[var(--brand-500)]/5">
                                    <div className="flex items-start gap-3">
                                        <Sparkles size={18} className="text-[var(--brand-400)] mt-0.5 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm mb-1">100% Private</p>
                                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                                All processing happens in your browser. Your photo is never uploaded to any server.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {imageSrc && (
                                <button onClick={downloadImage} disabled={downloading} className="btn w-full btn-lg gap-2 text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #f857a6, #ff5858)" }}>
                                    <Download size={18} /> {downloading ? "Preparing Download…" : "Download Headshot PNG"}
                                </button>
                            )}

                            <div className="card p-4 text-center">
                                <User size={28} className="mx-auto mb-2 text-[var(--text-muted)]" />
                                <p className="text-xs text-[var(--text-muted)]">
                                    Upload a well-lit photo against any background. The Studio or Soft Light filters work best for LinkedIn and resumes.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
