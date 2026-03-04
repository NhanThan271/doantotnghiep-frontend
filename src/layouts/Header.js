import React from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import logo from '../assets/images/logo.png';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Helper function để check active link
    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav className="navbar navbar-expand-lg gogi-navbar">
            <div className="container">
                {/* Logo */}
                <a
                    className="navbar-brand"
                    href="/"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate('/');
                    }}
                >
                    <img
                        src={logo}
                        alt="NOIR – Ẩm Thực Đương Đại"
                    />
                </a>

                {/* Toggle button for mobile */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-toggle="collapse"
                    data-target="#gogiNavbar"
                    aria-controls="gogiNavbar"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Navigation */}
                <div className="collapse navbar-collapse" id="gogiNavbar">
                    {/* Center Menu */}
                    <ul className="navbar-nav mx-auto">
                        <li className="nav-item">
                            <a
                                className={`nav-link ${isActive('/uu-dai') ? 'active' : ''}`}
                                href="/uu-dai"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate('/uu-dai');
                                }}
                            >
                                Ưu Đãi
                            </a>
                        </li>
                        <li className="nav-item">
                            <a
                                className={`nav-link ${isActive('/thuc-don') ? 'active' : ''}`}
                                href="/thuc-don"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate('/thuc-don');
                                }}
                            >
                                Thực Đơn
                            </a>
                        </li>
                        <li className="nav-item">
                            <a
                                className={`nav-link ${isActive('/dat-ban') ? 'active' : ''}`}
                                href="/dat-ban"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate('/dat-ban');
                                }}
                            >
                                Đặt Bàn
                            </a>
                        </li>
                    </ul>

                    {/* Right side - Login & Cart */}
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-login mr-3"
                            onClick={() => navigate("/login")}
                        >
                            Đăng Nhập
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Header;