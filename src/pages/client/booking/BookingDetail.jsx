import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, ChevronRight, Calendar, Clock } from 'lucide-react';
import PhoneFloatButton from './PhoneFloatButton';
import './Booking.css';

const BookingDetail = () => {
    const navigate = useNavigate();
    const [city, setCity] = useState('Thành phố Hà Nội');
    const [brand, setBrand] = useState('');
    const [date, setDate] = useState('28/12/2025');
    const [time, setTime] = useState('');
    const [visibleCount, setVisibleCount] = useState(4);

    const restaurants = [
        {
            id: 1,
            name: 'Vuvuzela Sunrise Trần Thái Tông',
            address: 'Tầng 1, tòa nhà SUNRISE BUILDING, 90 Trần Thái Tông, Phường Cầu Giấy, Thành Phố Hà Nội, Việt Nam',
            phone: '02473001239',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
            times: ['20:30', '20:45', '21:00', '21:15', '21:30']
        },
        {
            id: 2,
            name: 'Vuvuzela Trung Hòa Nhân Chính',
            address: 'Tầng 2, Văn phòng 4 dự án khu đô thị mới Trung Hòa Nhân chính, Đường Hoàng Đạo Thúy, Phường Yên Hòa, Thành phố Hà Nội, Việt Nam',
            phone: '02473008029',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
            times: ['20:30', '20:45', '21:00', '21:15', '21:30']
        },
        {
            id: 3,
            name: 'Vuvuzela Nguyễn Trãi',
            address: 'Gian hàng 104, Tầng 1, Tòa B, Tháp N01 Dự án Golden land, Số 275 Đường Nguyễn Trãi, Phường Thanh Xuân, Thành phố Hà Nội, Việt Nam',
            phone: '02473050099',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
            times: ['20:30', '20:45', '21:00', '21:15', '21:30']
        },
        {
            id: 4,
            name: 'Gogi House BigC Thăng Long',
            address: '1S9, Trung tâm thương mại GO! Thăng Long, số 222 Trần Duy Hưng, Phường Yên Hòa, Thành phố Hà Nội, Việt Nam',
            phone: '02473007339',
            image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
            times: ['20:30', '20:45', '21:00', '21:15', '21:30']
        },
        {
            id: 5,
            name: 'Manwah Lê Thái Tổ',
            address: 'Tầng 02, Số 03B Phố Lê Thái Tổ, Phường Hoàn Kiếm, Thành Phố Hà Nội, Việt Nam',
            phone: '02473038979',
            image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
            times: ['20:30', '20:45', '21:00', '21:15', '21:30']
        },
        {
            id: 6,
            name: 'Phở Inn Thái Phiên',
            address: 'Số 2C Phố Thái Phiên, Phường Hai Bà Trưng, Thành phố Hà Nội',
            phone: '02488884668',
            image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop',
            times: ['20:30', '20:45', '21:00', '21:15', '21:30']
        }
    ];

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 4);
    };

    const handleBooking = (restaurantId, selectedTime = null) => {
        navigate('/dat-ban-chi-tiet', {
            state: {
                restaurantId,
                selectedTime,
                date,
                city
            }
        });
    };

    return (
        <div className="booking-page">
            {/* Hero Section */}
            <div className="booking-hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        <span className="highlight">Đặt Bàn</span> dễ dàng tại chuỗi nhà hàng Golden NOIR
                    </h1>
                    <p className="hero-subtitle">
                        Đặt bàn trực tuyến tại 500+ nhà hàng toàn quốc. Đảm bảo chất lượng dịch vụ, món ngon và địa điểm ưng ý cho mọi thực khách.
                    </p>

                    {/* Search Filters */}
                    <div className="search-filters">
                        <div className="filter-group">
                            <MapPin className="filter-icon" size={20} />
                            <select
                                className="filter-select"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                            >
                                <option value="Thành phố Hà Nội">Thành phố Hà Nội</option>
                                <option value="Thành phố Hồ Chí Minh">Thành phố Hồ Chí Minh</option>
                                <option value="Đà Nẵng">Đà Nẵng</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <MapPin className="filter-icon" size={20} />
                            <select
                                className="filter-select"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                            >
                                <option value="">Chọn thương hiệu</option>
                                <option value="Vuvuzela">Vuvuzela</option>
                                <option value="Gogi House">Gogi House</option>
                                <option value="Manwah">Manwah</option>
                                <option value="Phở Inn">Phở Inn</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <Calendar className="filter-icon" size={20} />
                            <input
                                type="text"
                                className="filter-input"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                placeholder="DD/MM/YYYY"
                            />
                        </div>

                        <div className="filter-group">
                            <Clock className="filter-icon" size={20} />
                            <select
                                className="filter-select"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            >
                                <option value="">Chọn giờ</option>
                                <option value="11:00">11:00</option>
                                <option value="12:00">12:00</option>
                                <option value="18:00">18:00</option>
                                <option value="19:00">19:00</option>
                                <option value="20:00">20:00</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Restaurant List Section */}
            <div className="restaurant-section">
                <div className="container">
                    <h2 className="section-title">Gợi ý cho hôm nay</h2>

                    <div className="restaurant-grid">
                        {restaurants.slice(0, visibleCount).map((restaurant) => (
                            <div key={restaurant.id} className="restaurant-card">
                                <div className="card-image">
                                    <img src={restaurant.image} alt={restaurant.name} />
                                    <span className="promo-badge">-30%</span>
                                </div>

                                <div className="card-content">
                                    <h3 className="restaurant-title">{restaurant.name}</h3>

                                    <div className="restaurant-info">
                                        <MapPin size={16} className="info-icon" />
                                        <p className="restaurant-address">{restaurant.address}</p>
                                    </div>

                                    <div className="restaurant-phone">
                                        <Phone size={16} className="info-icon" />
                                        <a href={`tel:${restaurant.phone}`} className="phone-link">
                                            {restaurant.phone}
                                        </a>
                                    </div>

                                    <div className="time-slots">
                                        {restaurant.times.map((time, index) => (
                                            <button
                                                key={index}
                                                className="time-slot"
                                                onClick={() => handleBooking(restaurant.id, time)}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                        <button
                                            className="time-slot time-more"
                                            onClick={() => handleBooking(restaurant.id)}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {visibleCount < restaurants.length && (
                        <div className="load-more-container">
                            <button className="load-more-btn" onClick={handleLoadMore}>
                                Xem thêm
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Phone Button */}
            <PhoneFloatButton phoneNumber="0283456789" />
        </div>
    );
};

export default BookingDetail;