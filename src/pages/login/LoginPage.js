import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

// Toast component
const Toast = ({ toasts, removeToast }) => (
    <div className="toast-container">
        {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
                <span className="toast-icon">
                    {t.type === "success" ? "✓" : "✕"}
                </span>
                <span className="toast-message">{t.message}</span>
                <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
            </div>
        ))}
    </div>
);

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [toasts, setToasts] = useState([]);
    const navigate = useNavigate();

const showToast = useCallback((message, type = "error", duration = 3500) => {
    const id = Date.now();
    setToasts((prev) => {
        // Xoá toast cùng type cũ, thay bằng toast mới
        const filtered = prev.filter((t) => t.type !== type);
        // Giới hạn tối đa 3 toast
        const limited = filtered.slice(-2);
        return [...limited, { id, message, type }];
    });
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
}, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

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

        if (!username.trim()) {
            showToast("Vui lòng nhập tên đăng nhập", "error");
            setIsLoading(false);
            return;
        }
        if (!password) {
            showToast("Vui lòng nhập mật khẩu", "error");
            setIsLoading(false);
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showToast("Sai tên đăng nhập hoặc mật khẩu", "error");
            setIsLoading(false);
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/auth/login", {
                username,
                password,
            });

            const token = res.data.token || res.data.accessToken;
            localStorage.setItem("token", token);

            // Gọi API /me để lấy thông tin đầy đủ
            const meResponse = await axios.get("http://localhost:8080/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const fullUserData = meResponse.data;
            console.log("Full user data from /me:", fullUserData);

            // Lấy thông tin từ response login
            const { position, branchId, branchName, roles, id, username: userName, email } = res.data;

            // Tạo object user với dữ liệu đầy đủ
            const user = {
                id: fullUserData.id || id,
                username: fullUserData.username || userName,
                email: fullUserData.email || email,
                fullName: fullUserData.fullName || fullUserData.username || userName,
                phone: fullUserData.phone || "",
                roles: fullUserData.roles || roles || [fullUserData.role],
                branchId: branchId || fullUserData.branch?.id,
                branchName: branchName || fullUserData.branch?.name,
                position: position || fullUserData.position,
                branch: (branchId || fullUserData.branch?.id) ? {
                    id: branchId || fullUserData.branch?.id,
                    name: branchName || fullUserData.branch?.name
                } : null
            };

            localStorage.setItem("user", JSON.stringify(user));

            // Lưu thông tin đăng nhập nếu chọn ghi nhớ
            if (rememberMe) {
                localStorage.setItem("savedCredentials", JSON.stringify({
                    username,
                    password,
                    remember: true
                }));
            } else {
                localStorage.removeItem("savedCredentials");
            }

            // Lấy role
            const rolesArray = user.roles || [];
            const role = rolesArray[0]?.replace("ROLE_", "").toUpperCase() || "";

            // Điều hướng theo role
            if (role === "EMPLOYEE") {
                if (!user.branchId) {
                    showToast("Tài khoản của bạn chưa được gán chi nhánh.", "error");
                    localStorage.clear();
                    setIsLoading(false);
                    return;
                }

                showToast("Đăng nhập thành công!", "success", 2000);

                // Điều hướng theo position
                setTimeout(() => {
                    switch (user.position) {
                        case "CASHIER":
                            navigate("/cashier/dashboard", { replace: true });
                            break;
                        case "WAITER":
                            navigate("/waiter/orders", { replace: true });
                            break;
                        case "CHEF":
                            navigate("/chef/", { replace: true });
                            break;
                        case "STOCK":
                            navigate("/stock", { replace: true });
                            break;
                        default:
                            navigate("/", { replace: true });
                    }
                }, 1000);

                setIsLoading(false);
                return;
            }

            showToast("Đăng nhập thành công!", "success", 2000);

            // Xử lý các role khác
            setTimeout(() => {
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
            }, 1000);

        } catch (err) {
            console.error("Login error:", err);
            showToast("Sai tên đăng nhập hoặc mật khẩu!", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Back Home Button */}
            <button className="back-home-btn" onClick={() => navigate("/")}>
                ← Trang chủ
            </button>

            <div className="login-container">
                {/* HEADER */}
                <div className="login-header">
                    <div className="brand-icon">
                        🍽
                    </div>
                    <h1 className="brand-name">La Costa</h1>
                    <p className="brand-tagline">Restaurant &amp; Dining</p>
                    <p className="brand-sub">Đăng nhập để tiếp tục làm việc</p>
                </div>

                <div className="header-divider">
                    <span className="divider-line" />
                    <span className="divider-dot" />
                    <span className="divider-line" />
                </div>

                {/* FORM */}
                <form onSubmit={handleLogin} className="login-form">
                    {/* USERNAME */}
                    <div className="form-group">
                        <label>Tên đăng nhập</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                                <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM3 18a7 7 0 0114 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Nhập tên đăng nhập"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* PASSWORD */}
                    <div className="form-group">
                        <label>Mật khẩu</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                                <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                        <path d="M3 3l14 14M10.5 13.5A3 3 0 016.5 9.5M17 10a10 10 0 01-3 4.5M3 10a10 10 0 013-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                        <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
                                        <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* OPTIONS */}
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

                    {/* BUTTON */}
                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <svg className="spinner" width="18" height="18" viewBox="0 0 20 20">
                                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="50" strokeLinecap="round" />
                                </svg>
                                Đang đăng nhập...
                            </>
                        ) : (
                            "Đăng nhập"
                        )}
                    </button>
                </form>

                {/* FOOTER */}
                <div className="login-footer">
                    <p>Chưa có tài khoản? <a href="/register">Đăng ký ngay</a></p>
                </div>

                <div className="status-bar">
                    <span className="status-dot" />
                    Hệ thống đang hoạt động
                </div>
            </div>
        </div>
    );
};

export default LoginPage;