import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URI || "http://localhost:3000/api";

const getCookieValue = (name) => {
	const escapedName = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
};

export const api = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true,
	headers: {
		"Content-Type": "application/json",
	},
});

api.interceptors.request.use(
	(config) => {
		const cookieToken =
			getCookieValue("token") ||
			getCookieValue("authToken") ||
			getCookieValue("accessToken");

		if (cookieToken) {
			config.headers.Authorization = `Bearer ${cookieToken}`;
		}

		return config;
	},
	(error) => Promise.reject(error)
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Keep this hook for future logout/refresh-token flow.
			console.error("Unauthorized request. Please login again.");
		}

		return Promise.reject(error);
	}
);

export default api;
