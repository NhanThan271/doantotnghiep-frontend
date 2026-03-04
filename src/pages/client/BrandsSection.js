import React from 'react';
import './BrandsSection.css';

const BrandsSection = () => {
    const brandCategories = [
        {
            id: 1,
            title: 'LẨU & HOTPOT',
            brands: [
                { id: 1, name: 'FIRE POT', image: 'https://images.unsplash.com/photo-1580013759032-c96505e24c1f?w=100&h=80&fit=crop' },
                { id: 2, name: 'HOTPOT STORY', image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=100&h=80&fit=crop' },
                { id: 3, name: 'PARADISE HOTPOT', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=100&h=80&fit=crop' }
            ]
        },
        {
            id: 2,
            title: 'BBQ & NƯỚNG',
            brands: [
                { id: 1, name: 'KING BBQ', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=100&h=80&fit=crop' },
                { id: 2, name: 'SEOUL BBQ', image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=100&h=80&fit=crop' },
                { id: 3, name: 'GRILL MASTER', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=100&h=80&fit=crop' }
            ]
        },
        {
            id: 3,
            title: 'ẨM THỰC NHẬT BẢN',
            brands: [
                { id: 1, name: 'SUSHI TOKYO', image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=100&h=80&fit=crop' },
                { id: 2, name: 'RAMEN HOUSE', image: 'https://images.unsplash.com/photo-1563612116625-3012372fccce?w=100&h=80&fit=crop' }
            ]
        },
        {
            id: 4,
            title: 'THƯƠNG HIỆU KHÁC',
            brands: [
                { id: 1, name: 'PHỞ VIỆT', image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=100&h=80&fit=crop' },
                { id: 2, name: 'DIMSUM PALACE', image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=100&h=80&fit=crop' },
                { id: 3, name: 'CAFE SAIGON', image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=100&h=80&fit=crop' }
            ]
        }
    ];

    return (
        <div className="brands-section">
            <div className="container">
                <div className="row">
                    <div className="col-12">
                        {brandCategories.map((category) => (
                            <div key={category.id} className="brand-category">
                                <h4 className="brand-category-title">{category.title}</h4>
                                <div className="brand-logos">
                                    {category.brands.map((brand) => (
                                        <div key={brand.id} className="brand-logo">
                                            <img src={brand.image} alt={brand.name} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrandsSection;