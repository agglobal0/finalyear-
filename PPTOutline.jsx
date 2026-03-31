import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Edit2, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../api/apiClient";

const SortableSlideItem = ({ id, slide, index, onEdit }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-4 bg-[var(--bg-surface)] border p-4 rounded-[var(--radius-lg)] mb-3 group ${isDragging ? "shadow-2xl border-[var(--brand-400)] z-50 brightness-110" : "border-[var(--border-subtle)] hover:border-[var(--brand-300)] dark:hover:border-[var(--brand-500)]"} transition-all`}
        >
            <button {...attributes} {...listeners} className="text-[var(--text-disabled)] hover:text-[var(--brand-500)] cursor-grab active:cursor-grabbing p-1 transition-colors">
                <GripVertical size={20} />
            </button>
            <div className="text-[var(--text-muted)] font-mono text-sm w-6 text-center font-bold bg-[var(--bg-elevated)] rounded-md py-1">{index + 1}</div>

            <input
                type="text"
                value={slide.title}
                onChange={(e) => onEdit(slide.id, e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] font-medium text-base focus:ring-2 focus:ring-[var(--brand-500)]/20 rounded px-2 py-1 transition-shadow"
            />

            <Edit2 size={16} className="text-[var(--text-disabled)] group-hover:text-[var(--text-muted)] transition-colors" />
        </div>
    );
};

const PPTOutline = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [topic, setTopic] = useState("Loading...");
    const [slides, setSlides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingMsg, setIsAddingMsg] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const fetchPPT = async () => {
            try {
                const data = await apiClient(`/ppt/${id}`);
                if (data && data.success && data.ppt) {
                    setTopic(data.ppt.topic);
                    setSlides(data.ppt.slides.map(s => ({ ...s, id: `slide-${s.order}` })));
                } else {
                    toast.error("Failed to load outline");
                    navigate("/ppt");
                }
            } catch (err) {
                toast.error("Error loading outline");
                navigate("/ppt");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPPT();
    }, [id, navigate]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setSlides((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = [...items];
                const [removed] = newItems.splice(oldIndex, 1);
                newItems.splice(newIndex, 0, removed);
                // Update internal order safely
                return newItems.map((item, idx) => ({ ...item, order: idx }));
            });
        }
    };

    const handleTitleEdit = (id, newTitle) => {
        setSlides(slides.map(s => s.id === id ? { ...s, title: newTitle } : s));
    };

    const handleAddSlide = async () => {
        setIsAddingMsg(true);
        try {
            const data = await apiClient("/ppt/generate-slide-title", {
                method: "POST",
                body: JSON.stringify({ topic, existingTitles: slides.map(s => s.title) })
            });
            if (data && data.success) {
                const newSlide = { id: `slide-${slides.length}`, order: slides.length, title: data.title, bullets: [], speakerNotes: '', imageUrl: '', imageQuery: '' };
                setSlides([...slides, newSlide]);
            } else {
                toast.error(data?.error || "Failed to suggest title");
            }
        } catch (err) {
            toast.error(err.message || "Error generating title");
        } finally {
            setIsAddingMsg(false);
        }
    };

    const handleContinue = async () => {
        setIsSaving(true);
        try {
            await apiClient(`/ppt/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ slides: slides.map(({ id, ...rest }) => rest), topic, status: "images" })
            });
            navigate(`/ppt/images/${id}`);
        } catch (err) {
            toast.error(err.message || "Error saving outline");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="min-h-[50vh] flex items-center justify-center text-[var(--brand-500)]"><Loader2 className="animate-spin mr-2" /> Loading outline...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div className="flex-1">
                    <p className="badge badge-emerald mb-4">Step 1: Outline</p>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="text-4xl lg:text-5xl font-extrabold font-playfair text-[var(--text-primary)] bg-transparent border-b-2 border-transparent hover:border-[var(--border-base)] focus:border-[var(--brand-500)] w-full outline-none transition-colors pb-2"
                    />
                </div>
                <button
                    onClick={handleContinue}
                    disabled={isSaving}
                    className="btn btn-primary btn-lg shadow-lg"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <>Continue <ArrowRight size={18} /></>}
                </button>
            </div>

            <div className="card p-6 lg:p-8">
                <div className="flex items-center text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-4 px-4 bg-[var(--bg-elevated)] py-2 rounded-lg">
                    <div className="w-8">Move</div>
                    <div className="w-8 text-center">#</div>
                    <div className="flex-1 pl-4">Slide Title</div>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {slides.map((slide, index) => (
                            <SortableSlideItem key={slide.id} id={slide.id} slide={slide} index={index} onEdit={handleTitleEdit} />
                        ))}
                    </SortableContext>
                </DndContext>

                <button
                    onClick={handleAddSlide}
                    disabled={isAddingMsg}
                    className="w-full mt-4 flex items-center justify-center gap-2 border-2 border-dashed border-[var(--border-base)] hover:border-[var(--brand-500)] hover:bg-[var(--brand-500)]/5 text-[var(--text-secondary)] hover:text-[var(--brand-600)] dark:hover:text-[var(--brand-400)] py-4 rounded-[var(--radius-lg)] transition-all font-medium disabled:opacity-50 group shadow-sm bg-[var(--bg-surface)]"
                >
                    {isAddingMsg ? <Loader2 className="animate-spin text-[var(--brand-500)]" size={18} /> : <Plus size={18} className="group-hover:scale-110 transition-transform text-[var(--brand-500)]" />}
                    {isAddingMsg ? "AI is suggesting..." : "Add AI Suggested Slide"}
                </button>
            </div>
        </div>
    );
};

export default PPTOutline;
