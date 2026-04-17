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

    useEffect(() => {
        const saved = localStorage.getItem("savedCredentials");
        if (saved) {
            const data = JSON.parse(saved);
            if (data.remember) {
                setUsername(data.username);
                setPassword(data.password);
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

            // LƯU THÔNG TIN ĐĂNG NHẬP NẾU CHỌN GHI NHỚ
            if (rememberMe) {
                localStorage.setItem("savedCredentials", JSON.stringify({
                    username,
                    password,
                    remember: true
                }));
            } else {
                localStorage.removeItem("savedCredentials");
            }

            navigate("/");
        } catch (err) {
            alert("Sai tài khoản hoặc mật khẩu!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Back Home Button */}
            <button className="back-home-btn" onClick={() => navigate("/")}>
                ← Trang chủ
            </button>

            <div className="login-container">
                {/* HEADER */}
                <div className="login-header">
                    <h2>Chào mừng trở lại</h2>
                    <p>Đăng nhập để tiếp tục</p>
                </div>

                {/* FORM */}
                <form onSubmit={handleLogin} className="login-form">
                    {/* USERNAME */}
                    <div className="form-group">
                        <label>Tên đăng nhập</label>
                        <div className="input-wrapper">
                            <span className="input-icon">👤</span>
                            <input
                                type="text"
                                placeholder="Nhập tên đăng nhập"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* PASSWORD */}
                    <div className="form-group">
                        <label>Mật khẩu</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "🙈" : "👁"}
                            </button>
                        </div>
                    </div>

                    {/* OPTIONS */}
                    <div className="form-options">
                        <label>
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            Ghi nhớ đăng nhập
                        </label>
                        <span className="forgot" onClick={() => navigate("/forgot-password")}>
                            Quên mật khẩu?
                        </span>
                    </div>

                    {/* BUTTON */}
                    <button className="login-button" disabled={isLoading}>
                        {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>

                {/* FOOTER */}
                <div className="login-footer">
                    Chưa có tài khoản?{" "}
                    <span onClick={() => navigate("/register")}>
                        Đăng ký ngay
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;