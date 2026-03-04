import axios from "axios";

const axiosClient = axios.create({
    baseURL: "http://localhost:8080/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// Thêm token vào header
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Xử lý 401 → xoá token + redirect login
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn("⚠️ Token hết hạn hoặc không hợp lệ");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
