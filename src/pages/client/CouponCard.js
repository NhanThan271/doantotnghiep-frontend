import React from 'react';
import './CouponCard.css';
import logo from '../../assets/images/logo.png';

const CouponCard = ({ coupon }) => {
    const handleViewDetails = () => {
        alert(`Chi tiết coupon ${coupon.value}\n\nThời gian: ${coupon.validFrom} - ${coupon.validTo}\nCòn lại: ${coupon.daysRemaining} ngày`);
    };

    return (
        <div className="coupon-wrapper">
            {/* Left side - Coupon Image */}
            <div
                className="coupon-image"
                style={{ backgroundColor: coupon.backgroundColor }}
            >
                <div className="coupon-logo">
                    <img src={logo} alt="NOIR Logo" />
                    <span className="logo-text">GOLDEN NOIR</span>
                </div>
                <div className="coupon-value-display">
                    <div className="coupon-label">Coupon</div>
                    <div className="coupon-amount">{coupon.displayValue}</div>
                </div>
            </div>

            {/* Right side - Coupon Info */}
            <div className="coupon-info">
                <h3 className="coupon-title">Coupon {coupon.value}</h3>

                <div className="coupon-details">
                    <div className="detail-row">
                        <span className="detail-label">Thời gian áp dụng</span>
                        <span className="detail-value">{coupon.validFrom} - {coupon.validTo}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Hết hạn sau</span>
                        <span className="detail-value">{coupon.daysRemaining} ngày</span>
                    </div>
                </div>

                <button className="btn-view-details" onClick={handleViewDetails}>
                    Xem chi tiết
                </button>
            </div>
        </div>
    );
};

export default CouponCard;