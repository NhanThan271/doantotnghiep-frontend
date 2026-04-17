import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Search, MapPin, Calendar } from 'lucide-react';
import PhoneFloatButton from './PhoneFloatButton';
import './RestaurantLocation.css';

const RestaurantLocation = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Chỉ filter khi restaurants là array
    const filteredRestaurants = Array.isArray(restaurants)
        ? restaurants.filter(r =>
            r?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r?.address?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    const handleRestaurantClick = (restaurant) => {
        setSelectedRestaurant(restaurant);
    };

    const handleViewMap = (restaurant, e) => {
        e.stopPropagation();
        setSelectedRestaurant(restaurant);
        const mapElement = document.querySelector('.booking-map');
        if (mapElement && window.innerWidth <= 768) {
            mapElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleBooking = (restaurant, e) => {
        e.stopPropagation();
        navigate('/dat-ban-chi-tiet', {
            state: {
                branch: restaurant   // ✅ truyền đúng object
            }
        });
    };

    const getMapUrl = () => {
        if (selectedRestaurant && selectedRestaurant.lat && selectedRestaurant.lng) {
            return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selectedRestaurant.lat},${selectedRestaurant.lng}&zoom=15`;
        }
        return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=10.7769,106.7009&zoom=12`;
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await fetch("http://localhost:8080/api/branches", { headers });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("📦 API Response:", data);

            // ✅ Kiểm tra data có phải array không
            let branchesArray = [];
            if (Array.isArray(data)) {
                branchesArray = data;
            } else if (data && typeof data === 'object' && data.content) {
                branchesArray = data.content;
            } else {
                branchesArray = [];
            }

            // ✅ Format dữ liệu từ entity Branch
            const formattedBranches = branchesArray
                .filter(branch => branch.isActive !== false)
                .map(branch => ({
                    id: branch.id,
                    name: branch.name || 'Chưa có tên',
                    address: branch.address || 'Đang cập nhật địa chỉ',
                    phone: branch.phone || '02873000000',
                    isActive: branch.isActive,
                    // ✅ Tạo giờ mở cửa mặc định
                    hours: '09:00 - 22:00',
                    // ✅ Gán tọa độ mặc định (có thể cập nhật sau)
                    lat: getLatitudeByBranchId(branch.id),
                    lng: getLongitudeByBranchId(branch.id)
                }));

            console.log("✅ Formatted branches:", formattedBranches);
            setRestaurants(formattedBranches);

            if (formattedBranches.length === 0) {
                setError("Không có chi nhánh nào đang hoạt động");
            }
        } catch (err) {
            console.error("❌ Lỗi khi tải chi nhánh:", err);
            setError("Không thể tải danh sách nhà hàng. Vui lòng thử lại sau!");
            // ✅ Fallback dùng mock data nếu có lỗi
            setRestaurants(getMockBranches());
        } finally {
            setLoading(false);
        }
    };

    // ✅ Hàm gán tọa độ theo branch ID (tạm thời, nên thêm vào database sau)
    const getLatitudeByBranchId = (id) => {
        const coords = {
            1: 10.7404,
            2: 10.7769,
            3: 10.7738
        };
        return coords[id] || 10.7769;
    };

    const getLongitudeByBranchId = (id) => {
        const coords = {
            1: 106.7194,
            2: 106.7009,
            3: 106.7007
        };
        return coords[id] || 106.7009;
    };

    // ✅ Mock data fallback
    const getMockBranches = () => [
        {
            id: 1,
            name: 'Gogi House Estella',
            address: 'Gian hàng L3-10A, Estella Place, 88 Song Hành, Phường An Khánh, Quận 2, TP.HCM',
            hours: '09:00 - 22:00',
            phone: '02873002633',
            lat: 10.7404,
            lng: 106.7194,
            isActive: true
        },
        {
            id: 2,
            name: 'Gogi House Vincom Lê Thánh Tôn',
            address: 'B3-23-24 Tòa nhà Vincom Center, 70-72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP.HCM',
            hours: '09:00 - 22:00',
            phone: '02873000917',
            lat: 10.7769,
            lng: 106.7009,
            isActive: true
        },
        {
            id: 3,
            name: 'Gogi House Saigon Centre Lê Lợi',
            address: 'Gian hàng L5-08C, Saigon Centre, 67 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
            hours: '09:00 - 22:00',
            phone: '02873001234',
            lat: 10.7738,
            lng: 106.7007,
            isActive: true
        }
    ];

    if (loading) {
        return (
            <div className="booking-page">
                <div className="booking-breadcrumb">
                    <div className="container">
                        <p className="breadcrumb-text">Trang chủ &gt; Địa chỉ nhà hàng</p>
                    </div>
                </div>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Đang tải danh sách nhà hàng...</p>
                </div>
                <style>{`
                    .loading-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 400px;
                        color: #9ca3af;
                    }
                    .loading-spinner {
                        width: 48px;
                        height: 48px;
                        border: 4px solid rgba(212, 175, 55, 0.2);
                        border-top-color: #D4AF37;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                        margin-bottom: 16px;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error && restaurants.length === 0) {
        return (
            <div className="booking-page">
                <div className="booking-breadcrumb">
                    <div className="container">
                        <p className="breadcrumb-text">Trang chủ &gt; Địa chỉ nhà hàng</p>
                    </div>
                </div>
                <div className="error-container">
                    <p>⚠️ {error}</p>
                    <button onClick={fetchBranches} className="retry-btn">Thử lại</button>
                </div>
                <style>{`
                    .error-container {
                        text-align: center;
                        padding: 60px 20px;
                        color: #ef4444;
                    }
                    .retry-btn {
                        margin-top: 16px;
                        padding: 10px 24px;
                        background: #D4AF37;
                        border: none;
                        border-radius: 8px;
                        color: #121212;
                        cursor: pointer;
                        font-weight: bold;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="booking-page">
            {/* Breadcrumb */}
            <div className="booking-breadcrumb">
                <div className="container">
                    <p className="breadcrumb-text">
                        Trang chủ &gt; Địa chỉ nhà hàng
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="booking-content">
                <div className="booking-layout">
                    {/* Left Sidebar */}
                    <aside className="booking-sidebar">
                        {/* Search Box */}
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Nhập tên nhà hàng..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            <Search className="search-icon" size={20} />
                        </div>

                        {/* Restaurant List */}
                        <div className="restaurant-list">
                            {filteredRestaurants.length === 0 && !error && (
                                <div className="empty-state">
                                    <MapPin size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                    <p>🔍 Không tìm thấy nhà hàng nào</p>
                                </div>
                            )}

                            {filteredRestaurants.map((restaurant) => (
                                <div
                                    key={restaurant.id}
                                    className={`restaurant-item ${selectedRestaurant?.id === restaurant.id ? 'active' : ''}`}
                                    onClick={() => handleRestaurantClick(restaurant)}
                                >
                                    <h3 className="restaurant-name">
                                        <MapPin size={18} className="map-pin-icon" />
                                        {restaurant.name}
                                    </h3>
                                    <p className="restaurant-address">{restaurant.address}</p>
                                    <p className="restaurant-hours">
                                        🕐 {restaurant.hours}
                                    </p>

                                    <div className="restaurant-actions">
                                        {/* Nút Gọi điện */}
                                        <a
                                            href={`tel:${restaurant.phone}`}
                                            className="phone-button"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Phone size={18} />
                                            <span>{restaurant.phone}</span>
                                        </a>

                                        {/* Nút Xem bản đồ */}
                                        <button
                                            onClick={(e) => handleViewMap(restaurant, e)}
                                            className="map-button"
                                        >
                                            <MapPin size={18} />
                                            <span>Xem bản đồ</span>
                                        </button>

                                        {/* Nút Đặt bàn */}
                                        <button
                                            onClick={(e) => handleBooking(restaurant, e)}
                                            className="booking-button"
                                        >
                                            <Calendar size={18} />
                                            <span>Đặt bàn</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Right Map */}
                    <main className="booking-map">
                        <iframe
                            src={getMapUrl()}
                            className="map-iframe"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Restaurant Location Map"
                        />
                        {selectedRestaurant && (
                            <div className="map-label">
                                <p>📍 {selectedRestaurant.name}</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Floating Phone Button */}
            <PhoneFloatButton phoneNumber="0283456789" />
        </div>
    );
};

export default RestaurantLocation;