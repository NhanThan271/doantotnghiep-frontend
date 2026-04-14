import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import "./FoodSelectionModal.css";

const API = "http://localhost:8080";

const FoodSelectionModal = ({ show, onClose, onSelectFood, branchId }) => {
    const [foods, setFoods] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);

    const allCategory = {
        id: 'all',
        name: 'Tất cả món ăn',
        icon: '🍽️'
    };

    const getAuthToken = () => localStorage.getItem('token');

    useEffect(() => {
        if (show && branchId) {
            fetchCategories();
            fetchFoodsByBranch();
        }
    }, [show, branchId]);

    // Lấy danh mục từ API (giống Menu)
    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
            console.log("🔍 Fetching categories from /api/categories");

            const response = await fetch(`${API}/api/categories`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            console.log("📂 Categories loaded:", data);

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

            setSelectedCategory(allCategory);
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

    // Lấy món ăn theo chi nhánh (GIỐNG Menu, bỏ khuyến mãi)
    const fetchFoodsByBranch = async (categoryId = null) => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();

            // Dùng API giống Menu (không có /with-promotions)
            let url = `${API}/api/branch-foods/branch/${branchId}`;
            if (categoryId && categoryId !== 'all') {
                url += `?categoryId=${categoryId}`;
            }

            console.log(`🔍 Fetching foods from: ${url}`);

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("🍽️ Foods loaded:", data);

            // Format dữ liệu - BỎ KHUYẾN MÃI, giống Menu
            const formattedFoods = data.map(item => ({
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

            console.log("✅ Transformed foods (no promotions):", formattedFoods);
            setFoods(formattedFoods);

        } catch (err) {
            console.error("❌ Lỗi tải món ăn:", err);
            setError("Không thể tải danh sách món ăn. Vui lòng thử lại!");
            setFoods([]);
        } finally {
            setLoading(false);
        }
    };

    // Xử lý chọn category - GỌI API GIỐNG Menu
    const handleCategorySelect = async (category) => {
        console.log(`📂 Selected category:`, category);
        setSelectedCategory(category);

        if (!branchId) return;

        setLoading(true);
        if (category.id === 'all') {
            await fetchFoodsByBranch();
        } else {
            await fetchFoodsByBranch(category.id);
        }
        setSearchTerm('');
    };

    // Lọc món theo tìm kiếm (client-side)
    const filteredFoods = foods.filter(food => {
        if (searchTerm) {
            return food.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (food.description && food.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return true;
    });

    // Format giá - ĐƠN GIẢN, không khuyến mãi
    const formatPrice = (price) => {
        if (!price) return '0đ';
        return price.toLocaleString('vi-VN') + 'đ';
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http')) return imageUrl;
        if (imageUrl.startsWith('/uploads/')) return `${API}${imageUrl}`;
        return `${API}/uploads/${imageUrl}`;
    };

    if (!show) return null;

    return (
        <div className="food-modal-overlay" onClick={onClose}>
            <div className="food-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="food-modal-header">
                    <h2>🍽️ Chọn món ăn</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Thanh tìm kiếm */}
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm món ăn..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="search-clear" onClick={() => setSearchTerm('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Danh mục tabs - GIỐNG Menu */}
                {categories.length > 0 && (
                    <div className="category-tabs">
                        <button
                            className={`category-tab ${selectedCategory?.id === 'all' ? 'active' : ''}`}
                            onClick={() => handleCategorySelect(allCategory)}
                        >
                            {allCategory.icon} {allCategory.name}
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`category-tab ${selectedCategory?.id === cat.id ? 'active' : ''}`}
                                onClick={() => handleCategorySelect({ id: cat.id, name: cat.name })}
                            >
                                🍲 {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Hiển thị số lượng món */}
                <div className="food-count">
                    <strong>{filteredFoods.length}</strong> món được tìm thấy
                </div>

                {/* Content */}
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Đang tải món ăn...</p>
                    </div>
                ) : error ? (
                    <div className="error-container">
                        <p>⚠️ {error}</p>
                        <button onClick={() => fetchFoodsByBranch()} className="retry-btn">Thử lại</button>
                    </div>
                ) : (
                    <div className="food-grid">
                        {filteredFoods.length === 0 ? (
                            <div className="empty-state">
                                <p>🔍 Không tìm thấy món "{searchTerm}"</p>
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        handleCategorySelect(allCategory);
                                    }}
                                    className="clear-filter-btn"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            filteredFoods.map(food => (
                                <div
                                    key={food.id}
                                    className={`food-card ${!food.isAvailable ? "inactive" : ""}`}
                                    onClick={() => {
                                        if (food.isAvailable !== false && food.stockQuantity > 0) {
                                            onSelectFood({
                                                id: food.id,
                                                name: food.name,
                                                price: food.price,
                                                imageUrl: food.imageUrl,
                                                branchFoodId: food.id
                                            });
                                            onClose();
                                        } else if (food.stockQuantity === 0) {
                                            alert("❌ Món này đã hết hàng!");
                                        } else if (!food.isAvailable) {
                                            alert("❌ Món này đang tạm ngưng phục vụ!");
                                        }
                                    }}
                                >
                                    <div className="food-image-wrapper">
                                        {getImageUrl(food.imageUrl) ? (
                                            <img
                                                src={getImageUrl(food.imageUrl)}
                                                alt={food.name}
                                                className="food-image"
                                                onError={(e) => {
                                                    e.target.src = "/default-food.jpg";
                                                }}
                                            />
                                        ) : (
                                            <div className="food-image-placeholder">🍽️</div>
                                        )}
                                    </div>
                                    <div className="food-info">
                                        <h4>{food.name}</h4>
                                        {food.description && (
                                            <p className="food-description">{food.description.substring(0, 60)}</p>
                                        )}
                                        <div className="food-price">
                                            {formatPrice(food.price)}
                                        </div>
                                        <div className="food-status">
                                            {food.stockQuantity !== undefined && food.stockQuantity <= 10 && food.stockQuantity > 0 && (
                                                <span className="stock-warning">⚠️ Còn {food.stockQuantity}</span>
                                            )}
                                            {food.stockQuantity === 0 && (
                                                <span className="stock-out">🔥 Hết hàng</span>
                                            )}
                                        </div>
                                        <button
                                            className="add-btn"
                                            disabled={!food.isAvailable || food.stockQuantity === 0}
                                        >
                                            {!food.isAvailable ? "Tạm ngưng" : food.stockQuantity === 0 ? "Hết hàng" : "+ Thêm vào đơn"}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FoodSelectionModal;