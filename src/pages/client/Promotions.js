import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CouponCard from './CouponCard';
import PhoneFloatButton from './booking/PhoneFloatButton';
import './Promotions.css';

const API = "http://localhost:8080/api/promotions";

const Promotions = () => {
    const [coupons, setCoupons] = useState([]);

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            const res = await axios.get(API);

            const formattedData = res.data.map((item) => {
                const today = new Date();
                const endDate = new Date(item.endDate);

                const daysRemaining = Math.ceil(
                    (endDate - today) / (1000 * 60 * 60 * 24)
                );

                return {
                    id: item.id,
                    value: item.discountValue + " VND",
                    displayValue: Math.round(item.discountValue / 1000) + "k",
                    validFrom: item.startDate,
                    validTo: item.endDate,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    backgroundColor: '#f59e0b'
                };
            });

            setCoupons(formattedData);
        } catch (error) {
            console.error("❌ Lỗi lấy promotions:", error);
        }
    };

    return (
        <>
            {/* Breadcrumb */}
            <div className="promotions-breadcrumb">
                <div className="container">
                    <p className="breadcrumb-text">Trang Chủ &gt; Ưu đãi</p>
                </div>
            </div>

            {/* Promotions Content */}
            <div className="promotions-page">
                <div className="container">
                    <div className="promotions-grid">
                        {coupons.map((coupon) => (
                            <CouponCard key={coupon.id} coupon={coupon} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Phone Button */}
            <PhoneFloatButton phoneNumber="0283456789" />
        </>
    );
};

export default Promotions;