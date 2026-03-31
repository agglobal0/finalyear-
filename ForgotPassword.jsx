import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/authApi";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import toast from "react-hot-toast";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await forgotPassword(email);
            toast.success("Reset code sent! Check your email.");
            navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        } catch (error) {
            toast.error(error.message || "Failed to send reset code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
            <div className="w-full max-w-md animate-fade-in-up">
                
                <div className="mb-6">
                    <Link to="/login" className="inline-flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium gap-1.5">
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                </div>

                <div className="glass-panel p-8 md:p-10 relative overflow-hidden">
                    {/* Decorative glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-500)]/10 blur-[50px] pointer-events-none rounded-full" />
                    
                    <div className="text-center mb-8 relative z-10">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--brand-500)]/10 text-[var(--brand-500)] mb-5 shadow-sm border border-[var(--brand-500)]/20">
                            <Mail size={28} />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] font-playfair tracking-tight">Reset Password</h1>
                        <p className="text-[var(--text-muted)] mt-2 text-sm leading-relaxed">Enter your email address and we'll send you a verification code to reset your password.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                className="input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email.trim()}
                            className="btn btn-primary w-full py-3.5 text-[15px]"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : "Send Reset Code"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
