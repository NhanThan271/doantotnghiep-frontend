import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Phone, Search, MapPin, ArrowLeft, Calendar } from 'lucide-react';
import './BookingDetail.css';

const Booking = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    const restaurants = [
        {
            id: 1,
            name: 'Gogi House Estella',
            address: 'Gian hàng L3-10A, Estella Place, 88 Song Hành, Phường An Khánh, Thành phố Hồ Chí Minh, Việt Nam',
            hours: 'Open - Close: 09:00 - 22:00',
            phone: '02873002633',
            lat: 10.7404,
            lng: 106.7194
        },
        {
            id: 2,
            name: 'Gogi House Vincom Lê Thánh Tôn',
            address: 'B3-23-24 Tòa nhà Vincom Center, 70-72 Lê Thánh Tôn, Phường Sài Gòn, Thành phố Hồ Chí Minh, Việt Nam',
            hours: 'Open - Close: 09:00 - 22:00',
            phone: '02873000917',
            lat: 10.7769,
            lng: 106.7009
        },
        {
            id: 3,
            name: 'Gogi House Saigon Centre Lê Lợi',
            address: 'Gian hàng L5-08C, Trung tâm mua sắm Saigon Centre, 67 Lê Lợi, Phường Sài Gòn, Thành phố Hồ Chí Minh, Việt Nam',
            hours: 'Open - Close: 09:00 - 22:00',
            phone: '02873001234',
            lat: 10.7738,
            lng: 106.7007
        }
    ];

    useEffect(() => {
        if (location.state?.restaurantId) {
            const restaurant = restaurants.find(r => r.id === location.state.restaurantId);
            if (restaurant) {
                setSelectedRestaurant(restaurant);
            }
        }
    }, [location.state]);

    const filteredRestaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRestaurantClick = (restaurant) => {
        setSelectedRestaurant(restaurant);
    };

    // Hàm xử lý khi nhấn nút "Xem bản đồ" - chỉ hiển thị map
    const handleViewMap = (restaurant, e) => {
        e.stopPropagation();
        setSelectedRestaurant(restaurant);
        // Scroll xuống xem map nếu trên mobile
        const mapElement = document.querySelector('.booking-map');
        if (mapElement && window.innerWidth <= 768) {
            mapElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleBooking = (restaurant, e) => {
        e.stopPropagation();
        navigate('/dat-ban-chi-tiet', {
            state: {
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                restaurantAddress: restaurant.address,
                restaurantPhone: restaurant.phone
            }
        });
    };

    const getMapUrl = () => {
        if (selectedRestaurant) {
            return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selectedRestaurant.lat},${selectedRestaurant.lng}&zoom=15`;
        }
        return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=10.7769,106.7009&zoom=12`;
    };

    return (
        <div className="booking-detail-page">
            {/* Breadcrumb */}
            <div className="booking-breadcrumb">
                <div className="container">
                    <button
                        className="back-button"
                        onClick={() => navigate('/dat-ban-chi-tiet')}
                    >
                        <ArrowLeft size={16} />
                        <span>Quay lại</span>
                    </button>
                    <p className="breadcrumb-text">
                        Trang chủ &gt; Đặt bàn &gt; Chi tiết địa chỉ
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
                                    <p className="restaurant-hours">{restaurant.hours}</p>

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
                                <p>{selectedRestaurant.name}</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Booking;