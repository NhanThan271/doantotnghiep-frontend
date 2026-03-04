import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Search, MapPin, Calendar } from 'lucide-react';
import PhoneFloatButton from './PhoneFloatButton';
import './RestaurantLocation.css';

const RestaurantLocation = () => {
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

    const filteredRestaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRestaurantClick = (restaurant) => {
        setSelectedRestaurant(restaurant);
    };

    // Hàm xử lý khi nhấn nút "Xem bản đồ"
    const handleViewMap = (restaurant, e) => {
        e.stopPropagation();
        setSelectedRestaurant(restaurant);
        // Scroll xuống xem map nếu trên mobile
        const mapElement = document.querySelector('.booking-map');
        if (mapElement && window.innerWidth <= 768) {
            mapElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Hàm xử lý khi nhấn nút "Đặt bàn" - chuyển đến trang /dat-ban (Booking)
    const handleBooking = (restaurant, e) => {
        e.stopPropagation();
        navigate('/dat-ban', {
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

            {/* Floating Phone Button */}
            <PhoneFloatButton phoneNumber="0283456789" />
        </div>
    );
};

export default RestaurantLocation;