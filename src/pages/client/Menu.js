import React, { useEffect, useState, useCallback } from 'react';
import {
    ChevronDown, Grid, List, Search, X,
    Filter, ChevronUp, Star, TrendingUp,
    DollarSign, Tag, ArrowUpDown,
    Heart, ShoppingBag, Clock
} from 'lucide-react';
import PhoneFloatButton from './booking/PhoneFloatButton';
import './Menu.css';

const Menu = () => {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isCategoryOpen, setIsCategoryOpen] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter states
    const [filters, setFilters] = useState({
        priceRange: { min: '', max: '' },
        sortBy: 'name_asc',
        showPromotion: false,
        minRating: 0,
        isAvailable: true
    });

    const [priceStats, setPriceStats] = useState({ min: 0, max: 0 });

    const API_BASE_URL = 'http://localhost:8080';

    const allCategory = {
        id: 'all',
        name: 'Tất cả món ăn',
        description: 'Khám phá toàn bộ thực đơn',
        icon: '🍽️'
    };

    // Fetch categories
    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setCategories(data);
            if (!selectedCategory) setSelectedCategory(allCategory);
        } catch (err) {
            console.error('Lỗi khi lấy danh mục:', err);
            setError(`Không thể tải danh mục: ${err.message}`);
        }
    };

    // Fetch products
    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/foods`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setProducts(data);

            // Calculate price range
            const prices = data.map(p => p.price).filter(p => p);
            if (prices.length > 0) {
                setPriceStats({
                    min: Math.min(...prices),
                    max: Math.max(...prices)
                });
            }
        } catch (err) {
            console.error('Lỗi khi lấy sản phẩm:', err);
            setError(`Không thể tải sản phẩm: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters and search
    const applyFilters = useCallback(() => {
        let result = [...products];

        // Search filter
        if (searchTerm) {
            result = result.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Category filter
        if (selectedCategory && selectedCategory.id !== 'all') {
            result = result.filter(product => product.category?.id === selectedCategory.id);
        }

        // Price range filter
        if (filters.priceRange.min) {
            result = result.filter(product => product.price >= parseFloat(filters.priceRange.min));
        }
        if (filters.priceRange.max) {
            result = result.filter(product => product.price <= parseFloat(filters.priceRange.max));
        }

        // Availability filter
        if (filters.isAvailable) {
            result = result.filter(product => product.isAvailable !== false);
        }

        // Sorting
        switch (filters.sortBy) {
            case 'price_asc':
                result.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                result.sort((a, b) => b.price - a.price);
                break;
            case 'name_asc':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name_desc':
                result.sort((a, b) => b.name.localeCompare(a.name));
                break;
            default:
                break;
        }

        setFilteredProducts(result);
    }, [products, searchTerm, selectedCategory, filters]);

    useEffect(() => {
        fetchCategories();
        fetchProducts();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http')) return imageUrl;
        if (imageUrl.startsWith('/uploads/')) return `${API_BASE_URL}${imageUrl}`;
        return `${API_BASE_URL}/uploads/${imageUrl}`;
    };

    const clearAllFilters = () => {
        setFilters({
            priceRange: { min: '', max: '' },
            sortBy: 'name_asc',
            showPromotion: false,
            minRating: 0,
            isAvailable: true
        });
        setSearchTerm('');
        setSelectedCategory(allCategory);
    };

    const handlePriceChange = (type, value) => {
        setFilters(prev => ({
            ...prev,
            priceRange: { ...prev.priceRange, [type]: value }
        }));
    };

    if (loading) {
        return (
            <div className="menu-page">
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Đang tải thực đơn...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="menu-page">
                <div className="error-container">
                    <div className="error-content">
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()}>Thử lại</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="menu-page">
            {/* Hero Section */}
            <div className="menu-hero">
                <div className="container">
                    <h1 className="hero-title">Thực Đơn Tinh Hoa</h1>
                    <p className="hero-subtitle">
                        Những món ăn được chế biến từ nguyên liệu tươi ngon nhất,
                        mang đến trải nghiệm ẩm thực khó quên
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="menu-content">
                <div className="container">
                    {/* Search Bar */}
                    <div className="search-section">
                        <div className="search-wrapper">
                            <div className="search-box">
                                <Search className="search-icon" />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Tìm kiếm món ăn yêu thích của bạn..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button className="search-clear" onClick={() => setSearchTerm('')}>
                                        <X />
                                    </button>
                                )}
                            </div>
                            <button
                                className={`filter-toggle ${isFilterOpen ? 'active' : ''}`}
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                            >
                                <Filter size={20} />
                                <span>Bộ lọc</span>
                                {isFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>

                        {searchTerm && (
                            <div className="search-result-info">
                                <strong>{filteredProducts.length}</strong> kết quả tìm thấy cho "<strong>{searchTerm}</strong>"
                            </div>
                        )}
                    </div>

                    {/* Filter Panel */}
                    {isFilterOpen && (
                        <div className="filter-panel">
                            <div className="filter-header">
                                <h3>Lọc & Sắp xếp</h3>
                                <button className="clear-filters" onClick={clearAllFilters}>
                                    Xóa tất cả
                                </button>
                            </div>

                            <div className="filter-grid">
                                {/* Price Range */}
                                <div className="filter-group">
                                    <label><DollarSign size={16} /> Khoảng giá</label>
                                    <div className="price-inputs">
                                        <input
                                            type="number"
                                            placeholder={`Từ ${priceStats.min.toLocaleString()}đ`}
                                            value={filters.priceRange.min}
                                            onChange={(e) => handlePriceChange('min', e.target.value)}
                                            className="price-input"
                                        />
                                        <span>-</span>
                                        <input
                                            type="number"
                                            placeholder={`Đến ${priceStats.max.toLocaleString()}đ`}
                                            value={filters.priceRange.max}
                                            onChange={(e) => handlePriceChange('max', e.target.value)}
                                            className="price-input"
                                        />
                                    </div>
                                </div>

                                {/* Sort By */}
                                <div className="filter-group">
                                    <label><ArrowUpDown size={16} /> Sắp xếp theo</label>
                                    <select
                                        value={filters.sortBy}
                                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                        className="filter-select"
                                    >
                                        <option value="name_asc">Tên A-Z</option>
                                        <option value="name_desc">Tên Z-A</option>
                                        <option value="price_asc">Giá tăng dần</option>
                                        <option value="price_desc">Giá giảm dần</option>
                                    </select>
                                </div>

                                {/* Availability */}
                                <div className="filter-group">
                                    <label><ShoppingBag size={16} /> Trạng thái</label>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={filters.isAvailable}
                                            onChange={(e) => setFilters({ ...filters, isAvailable: e.target.checked })}
                                        />
                                        <span>Chỉ hiển thị món còn bán</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="menu-layout">
                        {/* Sidebar - Categories */}
                        <aside className="menu-sidebar">
                            <div className="category-header" onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
                                <h3 className="category-title">Danh mục</h3>
                                <ChevronDown className={`category-icon ${isCategoryOpen ? 'open' : ''}`} />
                            </div>

                            {isCategoryOpen && (
                                <ul className="category-list">
                                    <li
                                        className={`category-item ${selectedCategory?.id === 'all' ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(allCategory)}
                                    >
                                        <span className="category-icon-emoji">{allCategory.icon}</span>
                                        <div className="category-info">
                                            <span className="category-name">{allCategory.name}</span>
                                            <span className="category-count">{products.length} món</span>
                                        </div>
                                    </li>

                                    <li className="category-divider" />

                                    {categories.map(category => {
                                        const productCount = products.filter(p => p.category?.id === category.id).length;
                                        return (
                                            <li
                                                key={category.id}
                                                className={`category-item ${selectedCategory?.id === category.id ? 'active' : ''}`}
                                                onClick={() => setSelectedCategory(category)}
                                            >
                                                <span className="category-icon-emoji">🍲</span>
                                                <div className="category-info">
                                                    <span className="category-name">{category.name}</span>
                                                    <span className="category-count">{productCount} món</span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </aside>

                        {/* Products Section */}
                        <main className="menu-products">
                            <div className="products-toolbar">
                                <div className="products-count">
                                    <ShoppingBag size={18} />
                                    <span><strong>{filteredProducts.length}</strong> món được tìm thấy</span>
                                </div>

                                <div className="view-toggle">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                    >
                                        <Grid size={18} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                    >
                                        <List size={18} />
                                    </button>
                                </div>
                            </div>

                            {filteredProducts.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">🔍</div>
                                    <h3>Không tìm thấy món ăn nào</h3>
                                    <p>Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm khác nhé!</p>
                                    <button onClick={clearAllFilters} className="empty-action-btn">
                                        Xóa bộ lọc
                                    </button>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div className="products-grid">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="product-card">
                                            <div className="product-badge">
                                                {product.isPopular && <span className="badge popular">🔥 Phổ biến</span>}
                                                {product.isNew && <span className="badge new">✨ Mới</span>}
                                            </div>
                                            <div className="product-image-wrapper">
                                                {getImageUrl(product.imageUrl) ? (
                                                    <img
                                                        src={getImageUrl(product.imageUrl)}
                                                        alt={product.name}
                                                        className="product-image"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="product-image-placeholder">
                                                        <span>🍽️</span>
                                                    </div>
                                                )}
                                                <button className="product-wishlist">
                                                    <Heart size={20} />
                                                </button>
                                            </div>
                                            <div className="product-details">
                                                <h4 className="product-title">{product.name}</h4>
                                                {product.description && (
                                                    <p className="product-description">{product.description}</p>
                                                )}
                                                <div className="product-footer">
                                                    <div className="product-price-wrapper">
                                                        <span className="product-price">
                                                            {product.price.toLocaleString('vi-VN')}đ
                                                        </span>
                                                        {product.oldPrice && (
                                                            <span className="product-old-price">
                                                                {product.oldPrice.toLocaleString('vi-VN')}đ
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="products-list">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="product-list-card">
                                            <div className="product-list-image">
                                                {getImageUrl(product.imageUrl) ? (
                                                    <img src={getImageUrl(product.imageUrl)} alt={product.name} />
                                                ) : (
                                                    <div className="list-placeholder">🍽️</div>
                                                )}
                                            </div>
                                            <div className="product-list-details">
                                                <div className="product-list-header">
                                                    <h4>{product.name}</h4>
                                                    <button className="list-wishlist">
                                                        <Heart size={18} />
                                                    </button>
                                                </div>
                                                {product.description && (
                                                    <p className="product-list-description">{product.description}</p>
                                                )}
                                                <div className="product-list-footer">
                                                    <div className="product-list-price">
                                                        <span className="current-price">{product.price.toLocaleString('vi-VN')}đ</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            <PhoneFloatButton phoneNumber="0283456789" />
        </div>
    );
};

export default Menu;