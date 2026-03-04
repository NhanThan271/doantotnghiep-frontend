import axiosClient from "./axiosClient";

const authApi = {
    login: async (username, password) => {
        const res = await axiosClient.post("/auth/login", { username, password });

        const token =
            res.data.token ||
            res.data.accessToken ||
            res.data.user?.accessToken ||
            null;

        if (token) {
            localStorage.setItem("token", token);
        }

        localStorage.setItem("user", JSON.stringify(res.data.user || {}));
        return res.data;
    },
};

export default authApi;
