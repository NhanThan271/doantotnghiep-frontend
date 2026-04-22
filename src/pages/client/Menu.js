import React, { useEffect, useState, useCallback } from 'react';
import {
    ChevronDown, Grid, List, Search, X,
    Filter, ChevronUp, DollarSign, ArrowUpDown,
    ShoppingBag, MapPin, Building2
} from 'lucide-react';
import PhoneFloatButton from './booking/PhoneFloatButton';
import './Menu.css';

const API_BASE_URL = 'http://localhost:8080';

const Menu = () => {
    const [categories, setCategories] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [branches, setBranches] = useState([]);
    const [isCategoryOpen, setIsCategoryOpen] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isBranchOpen, setIsBranchOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter states - Bỏ isAvailable
    const [filters, setFilters] = useState({
        priceRange: { min: '', max: '' },
        sortBy: 'name_asc'
    });

    const [priceStats, setPriceStats] = useState({ min: 0, max: 0 });

    const allCategory = {
        id: 'all',
        name: 'Tất cả món ăn',
        icon: '🍽️'
    };

    const getAuthToken = () => localStorage.getItem('token');

    // Fetch branches
    const fetchBranches = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/branches`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setBranches(data);

            const savedBranchId = localStorage.getItem('selectedBranchId');
            if (savedBranchId && data.find(b => b.id === parseInt(savedBranchId))) {
                setSelectedBranch(data.find(b => b.id === parseInt(savedBranchId)));
            } else if (data.length > 0) {
                setSelectedBranch(data[0]);
                localStorage.setItem('selectedBranchId', data[0].id);
            }
        } catch (err) {
            console.error('Lỗi khi lấy chi nhánh:', err);
        }
    };

    // Fetch categories
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

            if (data && data.length > 0) {
                setCategories(data);
            } else {
                const mockCategories = [
                    { id: 1, name: "Món khai vị" },
                    { id: 2, name: "Món chính" },
                    { id: 3, name: "Đồ uống" },
                    { id: 4, name: "Tráng miệng" }
                ];
                setCategories(mockCategories);
            }

            if (!selectedCategory || selectedCategory.id === 'all') {
                setSelectedCategory(allCategory);
            }
        } catch (err) {
            console.error('❌ Lỗi khi lấy danh mục:', err);
            const mockCategories = [
                { id: 1, name: "Món khai vị" },
                { id: 2, name: "Món chính" },
                { id: 3, name: "Đồ uống" },
                { id: 4, name: "Tráng miệng" }
            ];
            setCategories(mockCategories);
            setSelectedCategory(allCategory);
        }
    };

    // Fetch all products by branch - CHỈ LẤY MÓN CÒN BÁN
    const fetchAllProductsByBranch = async (branchId) => {
        try {
            setLoading(true);
            setError(null);
            const token = getAuthToken();
            const url = `${API_BASE_URL}/api/branch-foods/branch/${branchId}`;

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            // ✅ Chỉ lấy món còn bán (isActive === true)
            const transformedProducts = data
                .filter(item => item.isActive === true)
                .map(item => ({
                    id: item.id,
                    name: item.food?.name || item.name,
                    description: item.food?.description || '',
                    price: item.customPrice || item.food?.price || 0,
                    imageUrl: item.food?.imageUrl,
                    categoryId: item.food?.category?.id,
                    categoryName: item.food?.category?.name,
                    stockQuantity: item.stockQuantity,
                    isAvailable: item.isActive
                }));

            setAllProducts(transformedProducts);
            setProducts(transformedProducts);

            // Calculate price range
            const prices = transformedProducts.map(p => p.price).filter(p => p && p > 0);
            if (prices.length > 0) {
                setPriceStats({
                    min: Math.min(...prices),
                    max: Math.max(...prices)
                });
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

    // Handle branch change
    const handleBranchChange = async (branch) => {
        setSelectedBranch(branch);
        localStorage.setItem('selectedBranchId', branch.id);
        setSelectedCategory(allCategory);
        setSearchTerm('');
        setFilters({
            priceRange: { min: '', max: '' },
            sortBy: 'name_asc'
        });

        await fetchAllProductsByBranch(branch.id);
    };

    // Handle category selection
    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setSearchTerm('');
        setFilters({
            priceRange: { min: '', max: '' },
            sortBy: 'name_asc'
        });

        if (category.id === 'all') {
            setProducts(allProducts);
        } else {
            const filtered = allProducts.filter(p => p.categoryId === category.id);
            setProducts(filtered);
        }
    };

    // Apply filters and search - Bỏ isAvailable
    const applyFilters = useCallback(() => {
        let result = [...products];

        // Search filter
        if (searchTerm) {
            result = result.filter(product =>
                product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Price range filter
        if (filters.priceRange.min) {
            result = result.filter(product => product.price >= parseFloat(filters.priceRange.min));
        }
        if (filters.priceRange.max) {
            result = result.filter(product => product.price <= parseFloat(filters.priceRange.max));
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
                result.sort((a, b) => a.name?.localeCompare(b.name));
                break;
            case 'name_desc':
                result.sort((a, b) => b.name?.localeCompare(a.name));
                break;
            default:
                break;
        }

        setFilteredProducts(result);
    }, [products, searchTerm, filters]);

    // Initial load
    useEffect(() => {
        fetchBranches();
        fetchCategories();
    }, []);

    // Load products when branch changes
    useEffect(() => {
        if (selectedBranch?.id) {
            fetchAllProductsByBranch(selectedBranch.id);
        }
    }, [selectedBranch?.id]);

    // Apply client-side filters
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
            sortBy: 'name_asc'
        });
        setSearchTerm('');
    };

    const handlePriceChange = (type, value) => {
        setFilters(prev => ({
            ...prev,
            priceRange: { ...prev.priceRange, [type]: value }
        }));
    };

    const formatPrice = (price) => {
        if (!price) return '0đ';
        return price.toLocaleString('vi-VN') + 'đ';
    };

    const getProductCountByCategory = (categoryId) => {
        if (categoryId === 'all') {
            return allProducts.length;
        }
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
                        Những món ăn được chế biến từ nguyên liệu tươi ngon nhất,
                        mang đến trải nghiệm ẩm thực khó quên
                    </p>
                </div>
            </div>

            {/* Branch Selector */}
            <div className="branch-selector-section">
                <div className="container">
                    <div className="branch-selector-wrapper">
                        <div className="branch-selector-label">
                            <Building2 size={20} />
                            <span>Chọn chi nhánh:</span>
                        </div>
                        <div className="branch-dropdown">
                            <button
                                className="branch-selector-btn"
                                onClick={() => setIsBranchOpen(!isBranchOpen)}
                            >
                                <MapPin size={18} />
                                <span>{selectedBranch?.name || 'Chọn chi nhánh'}</span>
                                <ChevronDown className={`dropdown-icon ${isBranchOpen ? 'open' : ''}`} />
                            </button>
                            {isBranchOpen && (
                                <div className="branch-dropdown-menu">
                                    {branches.map(branch => (
                                        <div
                                            key={branch.id}
                                            className={`branch-option ${selectedBranch?.id === branch.id ? 'active' : ''}`}
                                            onClick={() => {
                                                handleBranchChange(branch);
                                                setIsBranchOpen(false);
                                            }}
                                        >
                                            <MapPin size={16} />
                                            <div className="branch-info">
                                                <span className="branch-name">{branch.name}</span>
                                                <span className="branch-address">{branch.address}</span>
                                            </div>
                                            {selectedBranch?.id === branch.id && (
                                                <span className="branch-check">✓</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
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

                    {/* Filter Panel - Bỏ phần Trạng thái */}
                    {isFilterOpen && (
                        <div className="filter-panel">
                            <div className="filter-header">
                                <h3>Lọc & Sắp xếp</h3>
                                <button className="clear-filters" onClick={clearAllFilters}>
                                    Xóa tất cả
                                </button>
                            </div>

                            <div className="filter-grid">
                                <div className="filter-group">
                                    <label><DollarSign size={16} /> Khoảng giá</label>
                                    <div className="price-inputs">
                                        <input
                                            type="number"
                                            placeholder={`Từ ${priceStats.min?.toLocaleString()}đ`}
                                            value={filters.priceRange.min}
                                            onChange={(e) => handlePriceChange('min', e.target.value)}
                                            className="price-input"
                                        />
                                        <span>-</span>
                                        <input
                                            type="number"
                                            placeholder={`Đến ${priceStats.max?.toLocaleString()}đ`}
                                            value={filters.priceRange.max}
                                            onChange={(e) => handlePriceChange('max', e.target.value)}
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
                                        onClick={() => handleCategorySelect(allCategory)}
                                    >
                                        <span className="category-icon-emoji">{allCategory.icon}</span>
                                        <div className="category-info">
                                            <span className="category-name">{allCategory.name}</span>
                                            <span className="category-count">{getProductCountByCategory('all')} món</span>
                                        </div>
                                    </li>

                                    <li className="category-divider" />

                                    {categories.map((category) => (
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
                                                    <div className="product-image-placeholder">
                                                        <span>🍽️</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="product-details">
                                                <h4 className="product-title">{product.name}</h4>
                                                {product.description && (
                                                    <p className="product-description">{product.description}</p>
                                                )}
                                                <div className="product-footer">
                                                    <div className="product-price-wrapper">
                                                        <span className="product-price">
                                                            {formatPrice(product.price)}
                                                        </span>
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
                                                </div>
                                                {product.description && (
                                                    <p className="product-list-description">{product.description}</p>
                                                )}
                                                <div className="product-list-footer">
                                                    <div className="product-list-price">
                                                        <span className="current-price">{formatPrice(product.price)}</span>
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