import { Component, Loader2, Cpu } from "lucide-react";

// Simple Spinner
export const Spinner = ({ size = 24, className = "" }) => (
    <Loader2 size={size} className={`animate-spin ${className}`} />
);

// Full Page detailed loader
const Loader = ({ text = "Thinking..." }) => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-thinking"></div>
                <div className="relative bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-700/50">
                    <Cpu size={48} className="text-emerald-400 animate-pulse" />
                </div>
            </div>

            <div className="mt-6 text-center">
                <h3 className="text-xl font-semibold text-white mb-2">{text}</h3>
                <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce delay-300"></div>
                </div>
            </div>
        </div>
    );
};

export default Loader;
