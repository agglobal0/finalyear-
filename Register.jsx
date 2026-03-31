import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { verifyOtp } from "../api/authApi";
import appConfig from "../config/appConfig";
import { Loader2, CheckCircle, FileText } from "lucide-react";
import toast from "react-hot-toast";
import PasswordStrength from "../components/PasswordStrength";
import { isValidEmail, getPasswordScore, isStrongPassword } from "../utils/validation";

const inputClass = "w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all";

export default function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await register(username, email, password);
        setLoading(false);
        if (success) {
            setStep(2);
            toast.success("OTP sent to your email!");
        }
    };

    const emailValid = isValidEmail(email);
    const passScore = getPasswordScore(password);
    const canRegister = username.trim().length > 0 && emailValid && isStrongPassword(password, 3);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await verifyOtp(email, otp);
            toast.success("Email verified! Redirecting to login...");
            setTimeout(() => navigate("/login"), 1500);
        } catch (error) {
            toast.error(error.message || "Invalid OTP");
        } finally {
            setLoading(false);
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
                        {appConfig.appName || "ResumeAI"}
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm">
                        {step === 1 ? "Create your professional account" : "Verify your email address"}
                    </p>
                </div>

                <div className="glass-panel p-8 md:p-10 relative overflow-hidden text-left">
                    {/* Decorative glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-500)]/10 blur-[50px] pointer-events-none rounded-full" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--emerald-500)]/10 blur-[50px] pointer-events-none rounded-full" />

                    {step === 1 ? (
                        <form onSubmit={handleRegister} className="space-y-5 relative z-10 w-full">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Username</label>
                                <input type="text" required className="input" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Email Address</label>
                                <input type="email" required className={`input ${email && !emailValid ? 'border-[var(--rose-500)] focus:border-[var(--rose-500)] focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]' : ''}`} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                                {email && !emailValid && <p className="text-xs text-[var(--rose-400)] mt-1.5">Please enter a valid email address.</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Password</label>
                                <input type="password" required className={`input ${password && passScore < 2 ? 'border-[var(--rose-500)] focus:border-[var(--rose-500)] focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]' : ''}`} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                                <div className="mt-2"><PasswordStrength password={password} /></div>
                                {password && !isStrongPassword(password, 3) && (
                                    <p className="text-xs text-[var(--rose-400)] mt-1.5">Use 8+ chars with uppercase, numbers &amp; symbols.</p>
                                )}
                            </div>
                            <button
                                type="submit" disabled={loading || !canRegister}
                                className="btn btn-primary w-full py-3.5 text-[15px] mt-6 flex justify-center items-center"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className="space-y-5 animate-fade-in relative z-10 w-full">
                            <div className="bg-[var(--emerald-500)]/10 border border-[var(--emerald-500)]/30 rounded-xl p-4 flex items-center gap-3">
                                <CheckCircle className="text-[var(--emerald-400)] shrink-0" size={20} />
                                <div className="text-sm">
                                    <p className="font-semibold text-[var(--emerald-400)] mb-0.5">OTP Sent!</p>
                                    <p className="text-[var(--emerald-400)]/70">Check {email} for your code.</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 text-center">Enter OTP</label>
                                <input
                                    type="text" required maxLength={6}
                                    className="input text-center text-2xl tracking-[0.5em] font-mono py-4"
                                    placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                            </div>
                            <button
                                type="submit" disabled={loading}
                                className="btn btn-primary w-full py-3.5 text-[15px] flex items-center justify-center mt-2"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : "Verify & Login"}
                            </button>
                            <button type="button" onClick={() => setStep(1)} className="btn btn-ghost w-full py-2 text-sm mt-2 flex items-center justify-center">
                                Back to Registration
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center text-sm text-[var(--text-secondary)] relative z-10">
                        Already have an account?{" "}
                        <Link to="/login" className="text-[var(--brand-500)] hover:text-[var(--brand-400)] font-semibold transition-colors">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
