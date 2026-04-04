import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const RegisterPage = () => {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [error, setError] = useState("");



    // validate email
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };


    const handleRegister = async (e) => {

        e.preventDefault();

        setError("");

        // check username
        if (username.length < 3) {
            setError("Username phải >= 3 ký tự");
            return;
        }

        // check email
        if (!isValidEmail(email)) {
            setError("Email không hợp lệ");
            return;
        }

        // check password
        if (password.length < 6) {
            setError("Mật khẩu phải >= 6 ký tự");
            return;
        }

        // check confirm password
        if (password !== confirmPassword) {
            setError("Mật khẩu nhập lại không khớp");
            return;
        }

        setIsLoading(true);

        try {

            await axios.post(
                "http://localhost:8080/api/auth/register",
                {
                    username,
                    email,
                    password,
                    role: "CUSTOMER"
                }
            );

            alert("Đăng ký thành công!");

            navigate("/login");

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Đăng ký thất bại"
            );

        } finally {

            setIsLoading(false);

        }
    };


    return (

        <div className="login-page">

            <div className="login-container">

                <div className="login-header">

                    <h2>Tạo tài khoản</h2>
                    <p>Đăng ký để sử dụng hệ thống</p>

                </div>


                <form
                    onSubmit={handleRegister}
                    className="login-form"
                >

                    {/* error */}
                    {error && (
                        <div style={{
                            color: "red",
                            fontSize: 14
                        }}>
                            {error}
                        </div>
                    )}

                    {/* username */}

                    <div className="form-group">

                        <label>Tên đăng nhập</label>

                        <div className="input-wrapper">

                            <input
                                type="text"
                                placeholder="Nhập username"
                                value={username}
                                onChange={(e) =>
                                    setUsername(e.target.value)
                                }
                                required
                            />

                        </div>

                    </div>


                    {/* email */}

                    <div className="form-group">

                        <label>Email</label>

                        <div className="input-wrapper">

                            <input
                                type="text"
                                placeholder="Nhập email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                required
                            />

                        </div>

                    </div>


                    {/* password */}

                    <div className="form-group">

                        <label>Mật khẩu</label>

                        <div className="input-wrapper">

                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                required
                            />

                        </div>

                    </div>


                    {/* confirm password */}

                    <div className="form-group">

                        <label>Nhập lại mật khẩu</label>

                        <div className="input-wrapper">

                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                required
                            />

                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                            >
                                👁
                            </button>

                        </div>

                    </div>


                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >

                        {isLoading
                            ? "Đang đăng ký..."
                            : "Đăng ký"}

                    </button>

                </form>


                <div className="login-footer">

                    <p>

                        Đã có tài khoản ?

                        <a href="/login">

                            Đăng nhập

                        </a>

                    </p>

                </div>

            </div>

        </div>

    );

};

export default RegisterPage;