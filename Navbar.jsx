import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import appConfig from "../config/appConfig";
import { LogOut, User, Menu, FileText, ChevronDown, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeProvider";

const Navbar = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { theme, toggleTheme } = useTheme();

    const handleLogout = () => {
        logout();
        navigate("/login");
        setDropdownOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <nav className="fixed w-full z-50 transition-colors duration-300" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--glass-border)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Brand Section */}
                    <div className="flex items-center gap-4">
                        {user && (
                            <button
                                onClick={onMenuClick}
                                className="lg:hidden p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                <Menu size={20} />
                            </button>
                        )}
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-[var(--brand-50)] text-[var(--brand-500)] group-hover:bg-[var(--brand-500)] group-hover:text-white dark:bg-[var(--brand-500)]/20 dark:text-[var(--brand-400)]">
                                <FileText size={18} />
                            </div>
                            <span className="font-bold text-xl tracking-tight transition-colors text-[var(--text-primary)] group-hover:text-[var(--brand-500)]">
                                {appConfig.appName || "ResumeAI"}
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {user && (
                            <div className="flex items-center gap-6">
                                <Link to="/" className="text-sm font-medium transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Dashboard</Link>
                                <Link to="/interview-level" className="text-sm font-medium transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Builder</Link>
                                <Link to="/ppt" className="text-sm font-medium transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]">PPT</Link>
                            </div>
                        )}
                    </div>

                    {/* Auth / User Section */}
                    <div className="flex items-center gap-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--brand-500)]"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun size={18} className="theme-toggle-icon" /> : <Moon size={18} className="theme-toggle-icon" />}
                        </button>

                        {user ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors hover:bg-[var(--bg-elevated)]"
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[var(--bg-highlight)] text-[var(--brand-500)] border border-[var(--border-subtle)]">
                                        {user.username?.[0]?.toUpperCase() || "U"}
                                    </div>
                                    <span className="text-sm font-medium hidden sm:block text-[var(--text-primary)]">
                                        {user.username || "User"}
                                    </span>
                                    <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-1 origin-top-right animate-in fade-in slide-in-from-top-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                                        <div className="px-4 py-2 mb-1 lg:hidden border-b border-[var(--border-subtle)]">
                                            <p className="text-sm font-medium truncate text-[var(--text-primary)]">{user.username}</p>
                                            <p className="text-xs truncate text-[var(--text-muted)]">{user.email}</p>
                                        </div>
                                        <Link to="/interview-level" className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                                            <FileText size={14} /> Resume Builder
                                        </Link>
                                        <div className="divider my-1"></div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors text-[var(--rose-500)] hover:bg-[rgba(244,63,94,0.1)]"
                                        >
                                            <LogOut size={14} /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="hidden md:flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all btn-primary"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
