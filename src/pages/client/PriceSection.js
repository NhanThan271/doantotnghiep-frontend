import React from 'react';
import './PriceSection.css';

const PriceSection = () => {
    const priceItems = [
        {
            id: 1,
            title: 'MENU CHÍNH',
            price: '89',
            unit: 'K+'
        },
        {
            id: 2,
            title: 'COMBO ĐẶC BIỆT',
            price: '459',
            unit: 'K+'
        },
        {
            id: 3,
            title: 'BUFFET KHÔNG GIỚI HẠN',
            price: '399',
            unit: 'K+'
        },
        {
            id: 4,
            title: 'KHUYẾN MÃI TRẺ EM',
            special: true
        }
    ];

    return (
        <div className="price-section">
            <div className="container">
                <div className="row">
                    {priceItems.map((item) => (
                        <div key={item.id} className="col-12 col-md-3 price-item">
                            <h3 className="price-title">{item.title}</h3>

                            {item.special ? (
                                <>
                                    <p className="price-value">MIỄN PHÍ</p>
                                    <p className="price-sub-text">Dưới 1m</p>
                                    <p className="price-value price-value-small">50%</p>
                                    <p className="price-sub-text">Từ 1m - 1m3</p>
                                </>
                            ) : (
                                <p className="price-value">
                                    {item.price}<sup>{item.unit}</sup>
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PriceSection;