import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/authApi";
import { Loader2, ArrowLeft, Key } from "lucide-react";
import toast from "react-hot-toast";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) {
            setEmail(emailParam);
        } else {
            toast.error("Invalid link. Please try again.");
            navigate("/forgot-password");
        }
    }, [searchParams, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await resetPassword(email, otp, newPassword);
            toast.success("Password reset successful! Please login.");
            navigate("/login");
        } catch (error) {
            toast.error(error.message || "Failed to reset password");
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
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--emerald-500)]/10 blur-[50px] pointer-events-none rounded-full" />
                    
                    <div className="text-center mb-8 relative z-10">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--emerald-500)]/10 text-[var(--emerald-500)] mb-5 shadow-sm border border-[var(--emerald-500)]/20">
                            <Key size={28} />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] font-playfair tracking-tight">Set New Password</h1>
                        <p className="text-[var(--text-muted)] mt-2 text-sm leading-relaxed">
                            Enter the code sent to <span className="text-[var(--text-primary)] font-semibold">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 text-center">Verification Code</label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                className="input text-center text-xl tracking-[0.5em] font-mono py-3"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 mt-4">New Password</label>
                            <input
                                type="password"
                                required
                                className="input"
                                placeholder="New secure password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                className="input"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !otp || !newPassword || !confirmPassword}
                            className="btn w-full py-3.5 text-[15px] mt-2 text-white"
                            style={{ background: "linear-gradient(135deg, var(--emerald-400), var(--emerald-600))", boxShadow: "0 8px 32px rgba(16,185,129,0.25)" }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : "Reset Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
