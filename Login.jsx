import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import appConfig from "../config/appConfig";
import { Loader2, FileText } from "lucide-react";

export default function Login() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await login(identifier, password);
        setLoading(false);
        if (success) {
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
            <div className="w-full max-w-md animate-fade-in-up">
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--brand-500)]/10 text-[var(--brand-500)] mb-4 shadow-sm border border-[var(--brand-500)]/20">
                        <FileText size={28} />
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 tracking-tight font-playfair">
                        Welcome Back
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm">Sign in to your account to continue</p>
                </div>

                {/* Login Card */}
                <div className="glass-panel p-8 md:p-10 relative overflow-hidden">
                    {/* Decorative glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-500)]/10 blur-[50px] pointer-events-none rounded-full" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--emerald-500)]/10 blur-[50px] pointer-events-none rounded-full" />

                    <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Email or Username</label>
                            <input
                                type="text"
                                required
                                className="input"
                                placeholder="name@example.com"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Password</label>
                                <Link to="/forgot-password" className="text-xs font-medium text-[var(--brand-500)] hover:text-[var(--brand-400)] transition-colors">Forgot password?</Link>
                            </div>
                            <input
                                type="password"
                                required
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !identifier.trim() || !password.trim()}
                            className="btn btn-primary w-full py-3.5 text-[15px] mt-6"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-[var(--text-secondary)] relative z-10">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-[var(--brand-500)] hover:text-[var(--brand-400)] font-semibold transition-colors">
                            Sign up here
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
