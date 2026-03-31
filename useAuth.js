import { useEffect } from "react";
import { useRecoilState } from "recoil";
import { authAtom } from "../recoil/authAtom";
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout } from "../api/authApi";
import toast from "react-hot-toast";

const useAuth = () => {
    const [auth, setAuth] = useRecoilState(authAtom);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const { user } = await getMe();
            if (user) {
                setAuth({ user, isAuthenticated: true, loading: false });
            } else {
                setAuth({ user: null, isAuthenticated: false, loading: false });
            }
        } catch (error) {
            setAuth({ user: null, isAuthenticated: false, loading: false });
        }
    };

    const login = async (email, password) => {
        try {
            setAuth((prev) => ({ ...prev, loading: true }));
            const { user } = await apiLogin(email, password);
            setAuth({ user, isAuthenticated: true, loading: false });
            toast.success("Welcome back!");
            return true;
        } catch (error) {
            setAuth((prev) => ({ ...prev, loading: false }));
            toast.error(error.message || "Login failed");
            return false;
        }
    };

    const register = async (username, email, password) => {
        try {
            setAuth((prev) => ({ ...prev, loading: true }));
            await apiRegister(username, email, password);
            toast.success("Welcome! Please check your email for OTP.");
            setAuth((prev) => ({ ...prev, loading: false }));
            return true;
        } catch (error) {
            setAuth((prev) => ({ ...prev, loading: false }));
            toast.error(error.message || "Registration failed");
            return false;
        }
    };

    const logout = async () => {
        try {
            await apiLogout();
            setAuth({ user: null, isAuthenticated: false, loading: false });
            toast.success("Logged out successfully");
            // Optional: Clear other atoms here
        } catch (error) {
            console.error(error);
        }
    };

    return {
        ...auth,
        login,
        register,
        logout,
        checkAuth
    };
};

export default useAuth;
