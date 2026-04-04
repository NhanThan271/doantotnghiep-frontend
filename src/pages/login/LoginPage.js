import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await axios.post("http://localhost:8080/api/auth/login", {
                username,
                password,
            });

            //  Lấy token
            const token = res.data.token || res.data.accessToken;
            if (!token) {
                alert("Không nhận được token từ server!");
                setIsLoading(false);
                return;
            }

            //  Lưu token vào localStorage
            localStorage.setItem("token", token);

            // Destructure response data để lấy branchId và branchName
            const { branchId, branchName, roles, id, username: userName, email } = res.data;

            // Tạo object user với đầy đủ thông tin
            const user = {
                id,
                username: userName,
                email,
                roles,
                branchId,
                branch: branchId ? { id: branchId, name: branchName } : null
            };

            // Lưu thông tin user vào localStorage
            localStorage.setItem("user", JSON.stringify(user));

            //  Lấy role chuẩn từ mảng roles
            const rolesArray = user.roles || [];
            const role = rolesArray[0]?.replace("ROLE_", "").toUpperCase() || "";

            //  Điều hướng theo role
            switch (role) {
                case "ADMIN":
                    navigate("/admin", { replace: true });
                    break;
                case "EMPLOYEE":
                    if (!branchId) {
                        alert("Tài khoản của bạn chưa được gán chi nhánh. Vui lòng liên hệ quản trị viên.");
                        localStorage.clear();
                        setIsLoading(false);
                        return;
                    }
                    navigate("/employee", { replace: true });
                    break;
                case "MANAGER":
                    // Kiểm tra xem manager có branch không
                    if (!branchId) {
                        alert("Tài khoản của bạn chưa được gán chi nhánh. Vui lòng liên hệ quản trị viên.");
                        localStorage.clear();
                        setIsLoading(false);
                        return;
                    }
                    navigate("/manager", { replace: true });
                    break;
                case "KITCHEN":
                    if (!branchId) {
                        alert("Tài khoản của bạn chưa được gán chi nhánh. Vui lòng liên hệ quản trị viên.");
                        localStorage.clear();
                        setIsLoading(false);
                        return;
                    }
                    navigate("/kitchen", { replace: true });
                    break;
                default:
                    navigate("/", { replace: true });
                    break;
            }

            alert("Đăng nhập thành công!");

        } catch (err) {
            console.error("Lỗi đăng nhập:", err.response?.data || err.message);
            alert("Sai tên đăng nhập hoặc mật khẩu!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
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
                            <input type="checkbox" />
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