// layouts/Header.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import logo from '../assets/images/logo.png';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Lấy thông tin user từ localStorage
    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) {
            setUser(userData);
        }
    }, [location.pathname]); // Cập nhật khi chuyển trang

    const isActive = (path) => {
        return location.pathname === path;
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Không xóa savedCredentials để giữ ghi nhớ đăng nhập
        setUser(null);
        navigate('/login');
    };

    // Kiểm tra xem có phải customer không
    const isCustomer = user?.roles?.some(role =>
        role === 'ROLE_CUSTOMER' || role === 'CUSTOMER'
    );

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
                    <img src={logo} alt="NOIR – Ẩm Thực Đương Đại" />
                </a>

                <button
                    className="navbar-toggler"
                    type="button"
                    data-toggle="collapse"
                    data-target="#gogiNavbar"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="gogiNavbar">
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
                                className={`nav-link ${isActive('/dat-ban-dia-chi') ? 'active' : ''}`}
                                href="/dat-ban-dia-chi"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate('/dat-ban-dia-chi');
                                }}
                            >
                                Đặt Bàn
                            </a>
                        </li>
                    </ul>

                    <div className="d-flex align-items-center">
                        {user && isCustomer ? (
                            // 🆕 Hiển thị khi customer đã đăng nhập
                            <div className="dropdown" style={{ position: 'relative' }}>
                                <button
                                    className="btn btn-user dropdown-toggle"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: '#f8f9fa',
                                        border: '1px solid #ddd',
                                        borderRadius: '25px',
                                        padding: '8px 16px'
                                    }}
                                >
                                    <span>👤</span>
                                    <span>Xin chào, {user.username}</span>
                                    <span>▼</span>
                                </button>

                                {isDropdownOpen && (
                                    <div
                                        className="dropdown-menu show"
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            marginTop: '8px',
                                            minWidth: '200px',
                                            background: 'white',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                            zIndex: 1000
                                        }}
                                    >
                                        <button
                                            className="dropdown-item"
                                            onClick={() => {
                                                navigate('/customer/profile');
                                                setIsDropdownOpen(false);
                                            }}
                                            style={{ width: '100%', padding: '10px 16px', textAlign: 'left' }}
                                        >
                                            👤 Thông tin tài khoản
                                        </button>
                                        <button
                                            className="dropdown-item"
                                            onClick={() => {
                                                navigate('/customer/orders');
                                                setIsDropdownOpen(false);
                                            }}
                                            style={{ width: '100%', padding: '10px 16px', textAlign: 'left' }}
                                        >
                                            📋 Lịch sử đặt bàn
                                        </button>
                                        <div className="dropdown-divider" style={{ margin: '8px 0', borderTop: '1px solid #eee' }}></div>
                                        <button
                                            className="dropdown-item text-danger"
                                            onClick={handleLogout}
                                            style={{ width: '100%', padding: '10px 16px', textAlign: 'left' }}
                                        >
                                            🚪 Đăng xuất
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Hiển thị khi chưa đăng nhập hoặc không phải customer
                            <button
                                className="btn btn-login mr-3"
                                onClick={() => navigate("/login")}
                            >
                                Đăng Nhập
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Header;