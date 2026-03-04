import React from 'react';
import CouponCard from './CouponCard';
import PhoneFloatButton from './booking/PhoneFloatButton';
import './Promotions.css';

const Promotions = () => {
    const coupons = [
        {
            id: 1,
            value: '50.000VND',
            displayValue: '50k',
            validFrom: '01/10/2025',
            validTo: '31/12/2100',
            daysRemaining: 27396,
            backgroundColor: '#f59e0b'
        },
        {
            id: 2,
            value: '200.000VND',
            displayValue: '200k',
            validFrom: '01/10/2025',
            validTo: '31/12/2100',
            daysRemaining: 27396,
            backgroundColor: '#f59e0b'
        },
        {
            id: 3,
            value: '100.000VND',
            displayValue: '100k',
            validFrom: '01/01/2025',
            validTo: '31/12/2025',
            daysRemaining: 368,
            backgroundColor: '#f59e0b'
        },
        {
            id: 4,
            value: '150.000VND',
            displayValue: '150k',
            validFrom: '15/12/2024',
            validTo: '15/03/2025',
            daysRemaining: 77,
            backgroundColor: '#f59e0b'
        }
    ];

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