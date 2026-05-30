import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedBranch = (() => {
        const b = location.state?.branch;
        if (b) {
            if (typeof b === 'string') return b;
            if (typeof b === 'object') return b.name || '';
        }
        return localStorage.getItem('selectedBranch') || 'Hồ Chí Minh';
    })();

    useEffect(() => {
        if (location.state?.branch) {
            localStorage.setItem('selectedBranch', location.state.branch);
        }
    }, [location.state?.branch]);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) setUser(userData);
    }, [location.pathname]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isActive = (path) => location.pathname === path;
    const isCustomer = user?.roles?.some(r => r === 'ROLE_CUSTOMER' || r === 'CUSTOMER');

    // ✅ Navigate thông minh: nếu đã có branch → vào thẳng form, chưa có → vào trang chọn chi nhánh
    const handleDatBan = () => {
        const branch = sessionStorage.getItem('currentBranch');
        if (branch) {
            navigate('/dat-ban-chi-tiet');
        } else {
            navigate('/dat-ban-dia-chi');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    const navLinks = [
        { label: 'Trang chủ', path: '/home' },
        { label: 'Thực Đơn', path: '/thuc-don' },
        { label: 'Chương Trình', path: '/uu-dai' },
        { label: 'Tuyển dụng', path: '/tuyen-dung' },
        { label: 'Đặt bàn', path: '/dat-ban-dia-chi' },
    ];

    return (
        <header className={`noir-header${scrolled ? ' noir-header--scrolled' : ''}`}>

            {/* ===== TOP ROW ===== */}
            <div className="noir-header__top">
                <div className="noir-header__top-inner">

                    {/* Chọn miền — quay lại hero */}
                    <button
                        className="noir-chon-mien"
                        onClick={() => navigate('/')}
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Chọn miền
                    </button>

                    {/* Logo chữ cách điệu + tên chi nhánh */}
                    <a
                        className="noir-logo"
                        href="/home"
                        onClick={e => { e.preventDefault(); navigate('/home', { state: { branch: selectedBranch } }); }}
                    >
                        <svg className="noir-logo__svg" viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg">
                            <text
                                x="150" y="56"
                                textAnchor="middle"
                                fontFamily="'Georgia', 'Times New Roman', serif"
                                fontStyle="italic"
                                fontWeight="bold"
                                fontSize="56"
                                fill="none"
                                stroke="#1a2a5e"
                                strokeWidth="1.2"
                                letterSpacing="3"
                            >La Costa</text>
                            <text
                                x="150" y="56"
                                textAnchor="middle"
                                fontFamily="'Georgia', 'Times New Roman', serif"
                                fontStyle="italic"
                                fontWeight="bold"
                                fontSize="56"
                                fill="#1a2a5e"
                                fillOpacity="0.08"
                                letterSpacing="3"
                            >La Costa</text>
                        </svg>
                        <span className="noir-logo__branch">{selectedBranch}</span>
                    </a>

                    {/* Phải: đặt bàn + đăng nhập */}
                    <div className="noir-header__top-right">

                        {user && isCustomer ? (
                            <div className="noir-user" ref={dropdownRef}>
                                <button
                                    className="noir-user__btn"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                >
                                    <span className="noir-user__avatar">
                                        {(user.fullName || user.username || 'U')[0].toUpperCase()}
                                    </span>
                                    <span className="noir-user__name">{user.fullName || user.username}</span>
                                </button>
                                {isDropdownOpen && (
                                    <div className="noir-dropdown">
                                        <button className="noir-dropdown__item" onClick={() => { navigate('/customer/profile'); setIsDropdownOpen(false); }}>
                                            Thông tin tài khoản
                                        </button>
                                        <button className="noir-dropdown__item" onClick={() => { navigate('/customer/orders'); setIsDropdownOpen(false); }}>
                                            Lịch sử đặt bàn
                                        </button>
                                        <div className="noir-dropdown__divider" />
                                        <button className="noir-dropdown__item noir-dropdown__item--danger" onClick={handleLogout}>
                                            Đăng xuất
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <a className="noir-login-link" href="/login" onClick={e => { e.preventDefault(); navigate('/login'); }}>
                                Đăng nhập
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== BOTTOM ROW — Nav links ===== */}
            <div className="noir-header__nav">
                <div className="noir-header__nav-inner">
                    {navLinks.map(link => (
                        <a
                            key={link.path}
                            className={`noir-nav__link${isActive(link.path) ? ' active' : ''}`}
                            href={link.path}
                            onClick={e => {
                                e.preventDefault();
                                // ✅ Nav link "Đặt bàn" cũng dùng handleDatBan
                                if (link.path === '/dat-ban-dia-chi') {
                                    handleDatBan();
                                } else {
                                    navigate(link.path, { state: { branch: selectedBranch } });
                                }
                            }}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
            </div>

            {/* ===== Mobile hamburger ===== */}
            <button
                className={`noir-hamburger${menuOpen ? ' open' : ''}`}
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <span /><span /><span />
            </button>

            {menuOpen && (
                <div className="noir-mobile-menu">
                    <button className="noir-mobile-menu__back" onClick={() => navigate('/')}>
                        ← Chọn miền
                    </button>
                    {navLinks.map(link => (
                        <a
                            key={link.path}
                            className="noir-mobile-menu__link"
                            href={link.path}
                            onClick={e => {
                                e.preventDefault();
                                // ✅ Mobile nav link "Đặt bàn" cũng dùng handleDatBan
                                if (link.path === '/dat-ban-dia-chi') {
                                    handleDatBan();
                                } else {
                                    navigate(link.path, { state: { branch: selectedBranch } });
                                }
                                setMenuOpen(false);
                            }}
                        >
                            {link.label}
                        </a>
                    ))}
                    {/* ✅ Nút ĐẶT BÀN mobile — dùng handleDatBan */}
                    <button
                        className="noir-mobile-menu__datban"
                        onClick={() => { handleDatBan(); setMenuOpen(false); }}
                    >
                        ĐẶT BÀN
                    </button>
                </div>
            )}
        </header>
    );
};

export default Header;