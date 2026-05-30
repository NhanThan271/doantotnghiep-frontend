import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroSlider.css';

const HeroLanding = () => {
    const [branches, setBranches] = useState([]);
    const [hoveredId, setHoveredId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/branches');
                if (!response.ok) {
                    throw new Error('Không thể tải dữ liệu chi nhánh');
                }
                const data = await response.json();

                const getLocalImage = (id) => {
                    const imageMap = {
                        1: '/images/binh-thanh.jpeg',
                        2: '/images/quan-1.webp',
                        3: '/images/quan-2.jpg',
                        4: '/images/quan-5.jpg',
                        5: '/images/thu-duc.jpg',
                    };
                    return imageMap[id] || '/images/qr-bank.jpg';
                };

                const formattedData = data.map((b, index) => ({
                    id: b.id,
                    label: 'Chi Nhánh',
                    num: (index + 1).toString().padStart(2, '0'),
                    name: b.name,
                    image: getLocalImage(b.id),
                    alt: b.name,
                    menuImage: b.menuImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=220&fit=crop',
                }));

                setBranches(formattedData);
            } catch (err) {
                console.error("Lỗi kết nối API:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBranches();
    }, []);

    const handleClick = (branch) => {
        localStorage.setItem('selectedBranch', branch.name);
        localStorage.setItem('selectedBranchId', String(branch.id));
        // Thêm dòng này để BookingDetail dùng
        sessionStorage.setItem('currentBranch', JSON.stringify({ id: branch.id, name: branch.name }));
        navigate('/home', {
            state: {
                branchId: branch.id,
                branch: branch.name
            }
        });
    };
    if (loading) {
        return (
            <div className="hero-loading-screen">
                <div className="loader"></div>
                <p>Đang trải thảm đỏ đón tiếp...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="hero-error-screen">
                <p>Xin lỗi, đã có lỗi xảy ra: {error}</p>
                <button onClick={() => window.location.reload()}>Thử lại</button>
            </div>
        );
    }

    return (
        <>
            <div className="hero-slider" style={{ height: '100vh' }}>
                <div className="hero-title-wrap">
                    <svg className="hero-noir-text" viewBox="0 0 500 120" xmlns="http://www.w3.org/2000/svg">
                        <text
                            x="50%" y="95"
                            textAnchor="middle"
                            fontFamily="'Georgia', serif"
                            fontStyle="italic"
                            fontWeight="bold"
                            fontSize="90"
                            fill="none"
                            stroke="#C9A84C"
                            strokeWidth="1.5"
                            letterSpacing="8"
                        >
                            La Costa
                        </text>
                        <text
                            x="50%" y="85"
                            textAnchor="middle"
                            fontFamily="'Georgia', serif"
                            fontStyle="italic"
                            fontWeight="bold"
                            fontSize="110"
                            fill="#C9A84C"
                            fillOpacity="0.12"
                            letterSpacing="8"
                        >
                            La Costa
                        </text>
                    </svg>

                    <div className="hero-rings">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`h-ring h-ring-${i}`} />
                        ))}
                    </div>
                </div>

                {branches.map((branch, index) => {
                    const isHovered = hoveredId === branch.id;
                    const isDimmed = hoveredId !== null && !isHovered;
                    const isLast = index === branches.length - 1;

                    return (
                        <div
                            key={branch.id}
                            className={`branch${isDimmed ? ' branch-dimmed' : ''}`}
                            onMouseEnter={() => setHoveredId(branch.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => handleClick(branch)}
                            style={{ flex: isHovered ? 3.5 : 1 }}
                        >
                            <img src={branch.image} alt={branch.alt} />
                            <div className="branch-overlay" />
                            {!isLast && <div className="branch-divider" />}

                            <div className={`branch-menu-popup${isHovered ? ' visible' : ''}`}>
                                <img src={branch.menuImage} alt="Menu" className="bmp-img" />
                                <div className="bmp-body">
                                    <div className="bmp-top">
                                        <span className="bmp-tag">MENU</span>
                                        <span className="bmp-count">250</span>
                                        <span className="bmp-unit">MÓN ĂN</span>
                                    </div>
                                    <div className="bmp-tagline">Đa Dạng – Đặc Sắc</div>
                                </div>
                            </div>

                            <div className="branch-content">
                                <div className="branch-num">{branch.num}</div>
                                <div className="branch-label">{branch.label}</div>
                                <div className="branch-name">{branch.name}</div>
                                <div className={`branch-cta${isHovered ? ' visible' : ''}`}>
                                    <span>Khám phá ngay</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="hero-footer">
                <span>© La Costa – Ẩm Thực Đương Đại. All rights reserved.</span>
                <span>Nhà hàng cao cấp với trải nghiệm ẩm thực đỉnh cao, giá cả hợp lý</span>
            </div>
        </>
    );
};

export default HeroLanding;