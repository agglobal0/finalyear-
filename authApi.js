import apiClient from "./apiClient";

export const login = (email, password) => apiClient("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
});

export const register = (username, email, password) => apiClient("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password })
});

export const verifyOtp = (email, otp) => apiClient("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp })
});

export const getMe = () => apiClient("/auth/me");


export const logout = () => apiClient("/auth/logout", { method: "POST" });

export const forgotPassword = (email) => apiClient("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
});

export const resetPassword = (email, otp, newPassword) => apiClient("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword })
});
