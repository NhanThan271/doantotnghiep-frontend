import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const ForgotPasswordPage = () => {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);


    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setMessage("");

        if (!isValidEmail(email)) {
            setError("Email không hợp lệ");
            return;
        }

        setIsLoading(true);

        try {

            await axios.post(
                "http://localhost:8080/api/auth/forgot-password",
                {
                    email
                }
            );

            setMessage(
                "Đã gửi link đặt lại mật khẩu tới email"
            );

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Không tìm thấy email"
            );

        } finally {

            setIsLoading(false);

        }
    };


    return (

        <div className="login-page">

            <div className="login-container">

                <div className="login-header">

                    <h2>Quên mật khẩu</h2>

                    <p>Nhập email để đặt lại mật khẩu</p>

                </div>


                <form
                    onSubmit={handleSubmit}
                    className="login-form"
                >

                    {error && (
                        <div style={{ color: "red" }}>
                            {error}
                        </div>
                    )}

                    {message && (
                        <div style={{ color: "lime" }}>
                            {message}
                        </div>
                    )}


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


                    <button
                        className="login-button"
                        disabled={isLoading}
                    >

                        {isLoading
                            ? "Đang gửi..."
                            : "Gửi yêu cầu"}

                    </button>

                </form>


                <div className="login-footer">

                    <p>

                        <a href="/login">
                            Quay lại đăng nhập
                        </a>

                    </p>

                </div>

            </div>

        </div>

    );

};

export default ForgotPasswordPage;