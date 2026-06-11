import React, { useEffect, useState, useCallback } from 'react';
import {
    ChevronDown, Grid, List, Search, X,
    Filter, ChevronUp, DollarSign, ArrowUpDown,
    ShoppingBag
} from 'lucide-react';
import PhoneFloatButton from './booking/PhoneFloatButton';
import './Menu.css';

const API_BASE_URL = '';

const Menu = () => {
    const [categories, setCategories] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [branchName, setBranchName] = useState('');
    const [isCategoryOpen, setIsCategoryOpen] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');

    const [filters, setFilters] = useState({
        priceRange: { min: '', max: '' },
        sortBy: 'name_asc'
    });

    const [priceStats, setPriceStats] = useState({ min: 0, max: 0 });

    const allCategory = { id: 'all', name: 'Tất cả món ăn', icon: '🍽️' };

    const getAuthToken = () => localStorage.getItem('token');

    // Lấy branchId từ localStorage (do HeroLanding/Home lưu vào)
    const getBranchId = () => {
        return localStorage.getItem('selectedBranchId');
    };

    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setCategories(data?.length > 0 ? data : getMockCategories());
        } catch (err) {
            console.error('Lỗi khi lấy danh mục:', err);
            setCategories(getMockCategories());
        } finally {
            setSelectedCategory(allCategory);
        }
    };

    const getMockCategories = () => [
        { id: 1, name: "Món khai vị" },
        { id: 2, name: "Món chính" },
        { id: 3, name: "Đồ uống" },
        { id: 4, name: "Tráng miệng" }
    ];

    const fetchProductsByBranch = async (branchId) => {
        if (!branchId) {
            setError('Vui lòng chọn chi nhánh từ trang chủ.');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/branch-foods/branch/${branchId}/with-promotions`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            const transformed = data
                .filter(item => item.isActive === true)
                .map(item => ({
                    id: item.branchFoodId,
                    name: item.name,
                    description: item.description,
                    price: item.finalPrice,
                    originalPrice: item.branchPrice,
                    hasPromotion: item.hasPromotion,
                    promotionName: item.promotionName,
                    discountPercentage: item.discountPercentage,
                    imageUrl: item.imageUrl,
                    categoryId: item.categoryId,
                    stockQuantity: item.stockQuantity,
                    isAvailable: item.isActive
                }));

            setAllProducts(transformed);
            setProducts(transformed);

            const prices = transformed.map(p => p.price).filter(p => p > 0);
            if (prices.length > 0) {
                setPriceStats({ min: Math.min(...prices), max: Math.max(...prices) });
            }
        } catch (err) {
            console.error('Lỗi khi lấy sản phẩm:', err);
            setError(`Không thể tải sản phẩm: ${err.message}`);
            setAllProducts([]);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setSearchTerm('');
        setFilters({ priceRange: { min: '', max: '' }, sortBy: 'name_asc' });
        if (category.id === 'all') {
            setProducts(allProducts);
        } else {
            setProducts(allProducts.filter(p => p.categoryId === category.id));
        }
    };

    const applyFilters = useCallback(() => {
        let result = [...products];
        if (searchTerm) {
            result = result.filter(p =>
                p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (filters.priceRange.min) result = result.filter(p => p.price >= parseFloat(filters.priceRange.min));
        if (filters.priceRange.max) result = result.filter(p => p.price <= parseFloat(filters.priceRange.max));
        switch (filters.sortBy) {
            case 'price_asc': result.sort((a, b) => a.price - b.price); break;
            case 'price_desc': result.sort((a, b) => b.price - a.price); break;
            case 'name_asc': result.sort((a, b) => a.name?.localeCompare(b.name)); break;
            case 'name_desc': result.sort((a, b) => b.name?.localeCompare(a.name)); break;
            default: break;
        }
        setFilteredProducts(result);
    }, [products, searchTerm, filters]);

    useEffect(() => {
        const branchId = getBranchId();
        const name = localStorage.getItem('selectedBranch') || '';
        setBranchName(name);
        fetchCategories();
        fetchProductsByBranch(branchId);
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
        setFilters({ priceRange: { min: '', max: '' }, sortBy: 'name_asc' });
        setSearchTerm('');
    };

    const formatPrice = (price) => {
        if (!price) return '0đ';
        return price.toLocaleString('vi-VN') + 'đ';
    };

    const getProductCountByCategory = (categoryId) => {
        if (categoryId === 'all') return allProducts.length;
        return allProducts.filter(p => p.categoryId === categoryId).length;
    };

    if (loading && allProducts.length === 0) {
        return (
            <div className="menu-page">
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Đang tải thực đơn...</p>
                </div>
            </div>
        );
    }

    if (error && allProducts.length === 0) {
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
                        {branchName
                            ? `Chi nhánh ${branchName} — Những món ăn được chế biến từ nguyên liệu tươi ngon nhất`
                            : 'Những món ăn được chế biến từ nguyên liệu tươi ngon nhất, mang đến trải nghiệm ẩm thực khó quên'}
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
                                <button className="clear-filters" onClick={clearAllFilters}>Xóa tất cả</button>
                            </div>
                            <div className="filter-grid">
                                <div className="filter-group">
                                    <label><DollarSign size={16} /> Khoảng giá</label>
                                    <div className="price-inputs">
                                        <input
                                            type="number"
                                            placeholder={`Từ ${priceStats.min?.toLocaleString()}đ`}
                                            value={filters.priceRange.min}
                                            onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, min: e.target.value } }))}
                                            className="price-input"
                                        />
                                        <span>-</span>
                                        <input
                                            type="number"
                                            placeholder={`Đến ${priceStats.max?.toLocaleString()}đ`}
                                            value={filters.priceRange.max}
                                            onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: e.target.value } }))}
                                            className="price-input"
                                        />
                                    </div>
                                </div>
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
                            </div>
                        </div>
                    )}

                    <div className="menu-layout">
                        {/* Sidebar */}
                        <aside className="menu-sidebar">
                            <div className="category-header" onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
                                <h3 className="category-title">Danh mục</h3>
                                <ChevronDown className={`category-icon ${isCategoryOpen ? 'open' : ''}`} />
                            </div>
                            {isCategoryOpen && (
                                <ul className="category-list">
                                    <li
                                        className={`category-item ${selectedCategory?.id === 'all' ? 'active' : ''}`}
                                        onClick={() => handleCategorySelect(allCategory)}
                                    >
                                        <span className="category-icon-emoji">{allCategory.icon}</span>
                                        <div className="category-info">
                                            <span className="category-name">{allCategory.name}</span>
                                            <span className="category-count">{getProductCountByCategory('all')} món</span>
                                        </div>
                                    </li>
                                    <li className="category-divider" />
                                    {categories.map(category => (
                                        <li
                                            key={category.id}
                                            className={`category-item ${selectedCategory?.id === category.id ? 'active' : ''}`}
                                            onClick={() => handleCategorySelect({ id: category.id, name: category.name })}
                                        >
                                            <span className="category-icon-emoji">🍲</span>
                                            <div className="category-info">
                                                <span className="category-name">{category.name}</span>
                                                <span className="category-count">{getProductCountByCategory(category.id)} món</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </aside>

                        {/* Products */}
                        <main className="menu-products">
                            <div className="products-toolbar">
                                <div className="products-count">
                                    <ShoppingBag size={18} />
                                    <span><strong>{filteredProducts.length}</strong> món được tìm thấy</span>
                                </div>
                                <div className="view-toggle">
                                    <button onClick={() => setViewMode('grid')} className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}>
                                        <Grid size={18} />
                                    </button>
                                    <button onClick={() => setViewMode('list')} className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}>
                                        <List size={18} />
                                    </button>
                                </div>
                            </div>

                            {filteredProducts.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">🔍</div>
                                    <h3>Không tìm thấy món ăn nào</h3>
                                    <p>Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm khác nhé!</p>
                                    <button onClick={clearAllFilters} className="empty-action-btn">Xóa bộ lọc</button>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div className="products-grid">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="product-card">
                                            <div className="product-image-wrapper">
                                                {getImageUrl(product.imageUrl) ? (
                                                    <img
                                                        src={getImageUrl(product.imageUrl)}
                                                        alt={product.name}
                                                        className="product-image"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.parentElement.innerHTML = '<div class="product-image-placeholder"><span>🍽️</span></div>';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="product-image-placeholder"><span>🍽️</span></div>
                                                )}
                                            </div>
                                            <div className="product-details">
                                                <h4 className="product-title">{product.name}</h4>
                                                {product.description && (
                                                    <p className="product-description">{product.description}</p>
                                                )}
                                                <div className="prmotion-badge">
                                                    {product.hasPromotion && (
                                                        <span className="product-discount-badge">
                                                            -{product.discountPercentage}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="product-footer">
                                                    {product.hasPromotion && (
                                                        <span className="product-price-original"
                                                            style={{ textDecoration: 'line-through', color: 'gray', fontSize: '0.85em' }}>
                                                            {formatPrice(product.originalPrice)}
                                                        </span>
                                                    )}
                                                    <span className="product-price">{formatPrice(product.price)}</span>
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
                                                <h4>{product.name}</h4>
                                                {product.description && (
                                                    <p className="product-list-description">{product.description}</p>
                                                )}
                                                <div className="product-list-footer">
                                                    <span className="current-price">{formatPrice(product.price)}</span>
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