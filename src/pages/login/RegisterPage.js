import React, { useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const Toast = ({ toasts, removeToast }) => (
    <div className="toast-container">
        {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
                <span className="toast-icon">{t.type === "success" ? "✓" : "✕"}</span>
                <span className="toast-message">{t.message}</span>
                <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
            </div>
        ))}
    </div>
);

const RegisterPage = () => {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = "error", duration = 3500) => {
        const id = Date.now();
        setToasts((prev) => {
            const filtered = prev.filter((t) => t.type !== type);
            const limited = filtered.slice(-2);
            return [...limited, { id, message, type }];
        });
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!username.trim()) {
            showToast("Vui lòng nhập tên đăng nhập", "error");
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showToast("Tên đăng nhập không được chứa dấu hoặc ký tự đặc biệt!", "error");
            return;
        }
        if (username.length < 3) {
            showToast("Username phải >= 3 ký tự", "error");
            return;
        }
        if (!email.trim()) {
            showToast("Vui lòng nhập email", "error");
            return;
        }
        if (!isValidEmail(email)) {
            showToast("Email không hợp lệ", "error");
            return;
        }
        if (!password) {
            showToast("Vui lòng nhập mật khẩu", "error");
            return;
        }
        if (password.length < 6) {
            showToast("Mật khẩu phải >= 6 ký tự", "error");
            return;
        }
        if (!confirmPassword) {
            showToast("Vui lòng nhập lại mật khẩu", "error");
            return;
        }
        if (password !== confirmPassword) {
            showToast("Mật khẩu nhập lại không khớp", "error");
            return;
        }

        setIsLoading(true);

        try {
            await axios.post("/api/auth/register", {
                username,
                email,
                password,
                role: "CUSTOMER"
            });

            showToast("Đăng ký thành công!", "success", 2000);
            setTimeout(() => navigate("/login"), 1200);

        } catch (err) {
            showToast(err.response?.data?.message || "Đăng ký thất bại", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const EyeOpen = () => (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
            <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="2" />
        </svg>
    );

    const EyeOff = () => (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M3 3l14 14M10.5 13.5A3 3 0 016.5 9.5M17 10a10 10 0 01-3 4.5M3 10a10 10 0 013-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );

    return (
        <div className="login-page">
            <Toast toasts={toasts} removeToast={removeToast} />

            <button className="back-home-btn" onClick={() => navigate("/")}>
                ← Trang chủ
            </button>

            <div className="login-container">
                <div className="login-header">
                    <div className="brand-icon">🍽</div>
                    <h1 className="brand-name">La Costa</h1>
                    <p className="brand-tagline">Restaurant &amp; Dining</p>
                    <p className="brand-sub">Tạo tài khoản mới</p>
                </div>

                <div className="header-divider">
                    <span className="divider-line" />
                    <span className="divider-dot" />
                    <span className="divider-line" />
                </div>

                <form onSubmit={handleRegister} className="login-form" noValidate>

                    {/* USERNAME */}
                    <div className="form-group">
                        <label>Tên đăng nhập</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                                <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM3 18a7 7 0 0114 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Nhập username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* EMAIL */}
                    <div className="form-group">
                        <label>Email</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                                <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M2 7l8 5 8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Nhập email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                autoComplete="email"
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
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                            >
                                {showPassword ? <EyeOff /> : <EyeOpen />}
                            </button>
                        </div>
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div className="form-group">
                        <label>Nhập lại mật khẩu</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                                <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isLoading}
                            >
                                {showConfirmPassword ? <EyeOff /> : <EyeOpen />}
                            </button>
                        </div>
                    </div>

                    {/* SUBMIT */}
                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <svg className="spinner" width="18" height="18" viewBox="0 0 20 20">
                                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="50" strokeLinecap="round" />
                                </svg>
                                Đang đăng ký...
                            </>
                        ) : (
                            "Đăng ký"
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Đã có tài khoản? <a href="/login">Đăng nhập</a></p>
                </div>

                <div className="status-bar">
                    <span className="status-dot" />
                    Hệ thống đang hoạt động
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;