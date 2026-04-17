// pages/login/LoginPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();

    // Load thông tin đã lưu khi component mount
    useEffect(() => {
        const savedCredentials = localStorage.getItem("savedCredentials");
        if (savedCredentials) {
            const { username: savedUsername, password: savedPassword, remember } = JSON.parse(savedCredentials);
            if (remember) {
                setUsername(savedUsername);
                setPassword(savedPassword);
                setRememberMe(true);
            }
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await axios.post("http://localhost:8080/api/auth/login", {
                username,
                password,
            });

            const token = res.data.token || res.data.accessToken;
            localStorage.setItem("token", token);

            // 🔥 LƯU THÔNG TIN ĐĂNG NHẬP NẾU CHỌN GHI NHỚ
            if (rememberMe) {
                localStorage.setItem("savedCredentials", JSON.stringify({
                    username: username,
                    password: password,
                    remember: true
                }));
            } else {
                // Nếu không chọn ghi nhớ, xóa thông tin đã lưu
                localStorage.removeItem("savedCredentials");
            }

            // Gọi API /me để lấy thông tin đầy đủ
            const meResponse = await axios.get("http://localhost:8080/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const fullUserData = meResponse.data;
            console.log("Full user data from /me:", fullUserData);

            const { position, branchId, branchName } = res.data;

            const user = {
                id: fullUserData.id,
                username: fullUserData.username,
                email: fullUserData.email,
                roles: fullUserData.roles || [fullUserData.role],
                branchId: branchId || fullUserData.branch?.id,
                branchName: branchName || fullUserData.branch?.name,
                position: position || fullUserData.position,
                fullName: fullUserData.fullName || fullUserData.username,
                phone: fullUserData.phone || "",
                branch: (branchId || fullUserData.branch?.id) ? {
                    id: branchId || fullUserData.branch?.id,
                    name: branchName || fullUserData.branch?.name
                } : null
            };

            localStorage.setItem("user", JSON.stringify(user));

            const rolesArray = user.roles || [];
            const role = rolesArray[0]?.replace("ROLE_", "").toUpperCase() || "";

            // Xử lý điều hướng cho EMPLOYEE dựa trên position
            if (role === "EMPLOYEE") {
                if (!user.branchId) {
                    alert("Tài khoản của bạn chưa được gán chi nhánh.");
                    localStorage.clear();
                    setIsLoading(false);
                    return;
                }

                switch (user.position) {
                    case "CASHIER":
                        navigate("/employee/cashier", { replace: true });
                        break;
                    case "WAITER":
                        navigate("/employee/waiter", { replace: true });
                        break;
                    case "CHEF":
                        navigate("/employee/chef", { replace: true });
                        break;
                    case "STOCK":
                        navigate("/employee/stock", { replace: true });
                        break;
                    default:
                        navigate("/", { replace: true });
                }

                alert("Đăng nhập thành công!");
                setIsLoading(false);
                return;
            }

            // Xử lý các role khác
            switch (role) {
                case "ADMIN":
                    navigate("/admin", { replace: true });
                    break;
                case "MANAGER":
                    navigate("/manager", { replace: true });
                    break;
                case "KITCHEN":
                    navigate("/kitchen", { replace: true });
                    break;
                case "CUSTOMER":
                    navigate("/", { replace: true });
                    break;
                default:
                    navigate("/", { replace: true });
            }

            alert("Đăng nhập thành công!");

        } catch (err) {
            console.error("Login error:", err);
            alert("Sai tên đăng nhập hoặc mật khẩu!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">

            <button
                className="back-home-btn"
                onClick={() => navigate("/")}
            >
                ← Trang chủ
            </button>
            <div className="login-container">
                <div className="login-header">
                    <h2>Chào mừng trở lại</h2>
                    <p>Đăng nhập để tiếp tục</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Tên đăng nhập</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM3 18a7 7 0 0114 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                id="username"
                                type="text"
                                placeholder="Nhập tên đăng nhập"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M3 3l14 14M10.5 13.5A3 3 0 016.5 9.5M17 10a10 10 0 01-3 4.5M3 10a10 10 0 013-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
                                        <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="form-options">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span>Ghi nhớ đăng nhập</span>
                        </label>
                        <a href="/forgot-password" className="forgot-link">Quên mật khẩu?</a>
                    </div>

                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <svg className="spinner" width="20" height="20" viewBox="0 0 20 20">
                                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="50" strokeLinecap="round" />
                                </svg>
                                Đang đăng nhập...
                            </>
                        ) : (
                            "Đăng nhập"
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Chưa có tài khoản? <a href="/register">Đăng ký ngay</a></p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;