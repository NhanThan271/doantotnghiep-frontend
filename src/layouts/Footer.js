import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Đảm bảo bạn đã cài axios: npm install axios
import './Footer.css';

const Footer = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                // Gọi API lấy danh sách chi nhánh
                const response = await axios.get('/api/branches');
                setBranches(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu chi nhánh:", error);
                setLoading(false);
            }
        };

        fetchBranches();
    }, []);

    return (
        <footer className="footer-noir">
            {/* Top Section */}
            <div className="footer-top">
                <div className="footer-logo">
                    <h2 className="logo-text">La Costa</h2>
                    <span className="logo-sub">PREMIER DINING EXPERIENCE</span>
                </div>
            </div>

            <div className="footer-divider"></div>

            {/* Middle Section */}
            <div className="footer-content">
                <div className="footer-grid">

                    {/* Render danh sách chi nhánh từ API */}
                    {loading ? (
                        <p className="branch-col">Đang tải dữ liệu...</p>
                    ) : (
                        branches.map((branch) => (
                            <div className="branch-col" key={branch.id}>
                                <h4 className="branch-name">{branch.name}</h4>
                                <p className="branch-info">
                                    <i className="location-icon"></i> {branch.address}
                                </p>
                                <p className="branch-contact">
                                    <a href={`tel:${branch.phoneNumber}`}>{branch.phoneNumber}</a>
                                    <a href={`mailto:${branch.email || 'support@noir.vn'}`}>
                                        {branch.email || 'support@noir.vn'}
                                    </a>
                                </p>
                            </div>
                        ))
                    )}

                    {/* Cột Hỗ trợ (Cố định) */}
                    <div className="branch-col">
                        <h4 className="branch-name">Hỗ trợ khách hàng</h4>
                        <ul className="footer-links">
                            <li><a href="#terms">Điều khoản sử dụng</a></li>
                            <li><a href="#membership">Chính sách thành viên</a></li>
                            <li><a href="#privacy">Chính sách bảo mật</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="footer-divider"></div>

            {/* Bottom Section */}
            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} GOLDEN La Costa GROUP. All rights reserved.</p>
                <div className="legal-info">
                    <span>GPĐK: 0102721191 cấp ngày 09/04/2008</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;