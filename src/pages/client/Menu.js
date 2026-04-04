import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PhoneFloatButton from './booking/PhoneFloatButton';
import './Menu.css';

const Menu = () => {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isCategoryOpen, setIsCategoryOpen] = useState(true);
    const API_BASE_URL = 'restaurant-management-backend.up.railway.app';

    // Fetch categories
    const fetchCategories = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/employee/categories`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Error'))
            .then(data => {
                console.log('Categories:', data);
                setCategories(data);
                // Mặc định chọn category đầu tiên
                if (data.length > 0 && !selectedCategory) {
                    setSelectedCategory(data[0]);
                }
            })
            .catch(err => console.error('Lỗi khi lấy danh mục:', err));
    };

    // Fetch all products
    const fetchProducts = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/foods`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Error'))
            .then(data => {
                console.log('Products:', data);
                setProducts(data);
            })
            .catch(err => console.error('Lỗi khi lấy sản phẩm:', err));
    };

    useEffect(() => {
        fetchCategories();
        fetchProducts();
    }, []);

    // Get image URL
    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        if (imageUrl.startsWith('/')) {
            return `${API_BASE_URL}${imageUrl}`;
        }
        return `${API_BASE_URL}/${imageUrl}`;
    };

    // Filter products by selected category
    const filteredProducts = selectedCategory
        ? products.filter(p => p.category?.id === selectedCategory.id)
        : products;

    return (
        <div className="menu-page">
            {/* Breadcrumb */}
            <div className="menu-breadcrumb">
                <div className="container">
                    <p className="breadcrumb-text">
                        Trang chủ &gt; Thực đơn {selectedCategory && `> ${selectedCategory.name}`}
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="menu-content">
                <div className="container">
                    <div className="menu-layout">
                        {/* Sidebar - Categories */}
                        <aside className="menu-sidebar">
                            <div className="category-header" onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
                                <h3 className="category-title">Món lẻ</h3>
                                <ChevronDown
                                    size={20}
                                    className={`category-icon ${isCategoryOpen ? 'open' : ''}`}
                                />
                            </div>

                            {isCategoryOpen && (
                                <ul className="category-list">
                                    {categories.map(category => (
                                        <li
                                            key={category.id}
                                            className={`category-item ${selectedCategory?.id === category.id ? 'active' : ''}`}
                                            onClick={() => setSelectedCategory(category)}
                                        >
                                            {category.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </aside>

                        {/* Products Grid */}
                        <main className="menu-products">
                            {filteredProducts.length === 0 ? (
                                <div className="empty-state">
                                    <p>Không có sản phẩm nào trong danh mục này</p>
                                </div>
                            ) : (
                                <div className="products-grid">
                                    {filteredProducts.map(product => {
                                        const imageUrl = getImageUrl(product.imageUrl);
                                        return (
                                            <div key={product.id} className="product-card">
                                                <div className="product-image">
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt={product.name}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div
                                                        className="product-image-placeholder"
                                                        style={{ display: imageUrl ? 'none' : 'flex' }}
                                                    >
                                                        <span>No Image</span>
                                                    </div>
                                                </div>
                                                <div className="product-info">
                                                    <h4 className="product-name">{product.name}</h4>
                                                    <p className="product-price">
                                                        {product.price ? parseFloat(product.price).toLocaleString('vi-VN') : '0'} ₫
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            {/* Floating Phone Button */}
            <PhoneFloatButton phoneNumber="0283456789" />
        </div>
    );
};

export default Menu;