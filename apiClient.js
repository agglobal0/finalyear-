// src/api/apiClient.js

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const apiClient = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
        credentials: "include", // Essential for HttpOnly cookies
    };

    try {
        const response = await fetch(url, config);

        // Handle 204 No Content
        if (response.status === 204) return null;

        // Handle Download Responses (PDF)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/pdf")) {
            return await response.blob();
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw {
                status: response.status,
                message: data.message || data.error || "Something went wrong",
                details: data
            };
        }

        return data;
    } catch (error) {
        if (error.message === "Failed to fetch") {
            throw { message: "Network error. Please check your connection." };
        }
        throw error;
    }
};

export default apiClient;
