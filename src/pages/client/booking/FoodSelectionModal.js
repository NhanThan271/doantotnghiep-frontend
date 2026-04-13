import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import "./FoodSelectionModal.css";

const API = "http://localhost:8080";

const FoodSelectionModal = ({ show, onClose, onSelectFood, branchId }) => {
    const [foods, setFoods] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("Tất cả");
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);

    useEffect(() => {
        if (show && branchId) {
            fetchCategories();
            fetchFoodsWithBranchPrice();
        }
    }, [show, branchId]);

    // Lấy danh sách danh mục
    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API}/api/categories`);
            if (!response.ok) throw new Error();
            const data = await response.json();
            console.log("📂 Categories loaded:", data);
            setCategories(data || []);
        } catch (err) {
            console.error("❌ Lỗi tải danh mục:", err);
        }
    };

    // 🔥 Lấy món ăn với giá theo chi nhánh và khuyến mãi
    const fetchFoodsWithBranchPrice = async () => {
        setLoading(true);
        setError(null);
        try {
            // Gọi API lấy giá theo chi nhánh kèm khuyến mãi
            const response = await fetch(`${API}/api/branch-foods/branch/${branchId}/with-promotions`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("🍽️ Foods with branch price and promotions:", data);

            // Format dữ liệu từ FoodWithPromotionDTO
            const formattedFoods = data.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description,
                originalPrice: item.originalPrice,
                branchPrice: item.branchPrice,
                price: item.finalPrice, // Giá sau khuyến mãi
                finalPrice: item.finalPrice,
                imageUrl: item.imageUrl || "/default-food.jpg",
                stockQuantity: item.stockQuantity,
                isActive: item.isActive,
                hasPromotion: item.hasPromotion,
                promotionId: item.promotionId,
                promotionName: item.promotionName,
                discountPercentage: item.discountPercentage,
                discountAmount: item.discountAmount,
                branchFoodId: item.branchFoodId,
                branchId: item.branchId,
                branchName: item.branchName,
                categoryName: item.categoryName
            }));

            setFoods(formattedFoods);

            // Tạo danh sách categories từ foods
            const uniqueCategories = [...new Set(formattedFoods.map(f => f.categoryName).filter(Boolean))];
            if (uniqueCategories.length > 0) {
                setCategories(uniqueCategories.map(name => ({ id: name, name: name })));
            }

        } catch (err) {
            console.error("❌ Lỗi tải món theo chi nhánh:", err);
            setError("Không thể tải danh sách món ăn. Vui lòng thử lại!");
            // Fallback: Lấy món ăn thông thường
            fetchFoodsFallback();
        } finally {
            setLoading(false);
        }
    };

    // Fallback: Lấy món ăn thông thường nếu API branch-foods lỗi
    const fetchFoodsFallback = async () => {
        try {
            const response = await fetch(`${API}/api/foods`);
            if (!response.ok) throw new Error();
            const data = await response.json();
            const formattedFoods = data.map(food => ({
                id: food.id,
                name: food.name,
                price: food.price || 0,
                originalPrice: food.price,
                branchPrice: food.price,
                finalPrice: food.price,
                imageUrl: food.imageUrl || "/default-food.jpg",
                description: food.description || "",
                hasPromotion: false,
                isActive: true,
                stockQuantity: 999,
                categoryName: food.category?.name
            }));
            setFoods(formattedFoods);

            // Tạo categories từ fallback data
            const uniqueCategories = [...new Set(formattedFoods.map(f => f.categoryName).filter(Boolean))];
            if (uniqueCategories.length > 0) {
                setCategories(uniqueCategories.map(name => ({ id: name, name: name })));
            }
        } catch (err) {
            console.error("Fallback error:", err);
            setFoods(getMockFoods());
        }
    };

    // Mock data fallback
    const getMockFoods = () => [
        { id: 1, name: "Bò nướng muối ớt", price: 189000, originalPrice: 189000, finalPrice: 189000, imageUrl: "/default-food.jpg", categoryName: "Món chính", hasPromotion: false, isActive: true, stockQuantity: 50 },
        { id: 2, name: "Sườn non nướng mật ong", price: 159000, originalPrice: 159000, finalPrice: 159000, imageUrl: "/default-food.jpg", categoryName: "Món chính", hasPromotion: false, isActive: true, stockQuantity: 45 },
        { id: 3, name: "Gà nướng nguyên con", price: 199000, originalPrice: 199000, finalPrice: 199000, imageUrl: "/default-food.jpg", categoryName: "Món chính", hasPromotion: false, isActive: true, stockQuantity: 30 },
        { id: 4, name: "Cơm trộn Hàn Quốc", price: 89000, originalPrice: 89000, finalPrice: 89000, imageUrl: "/default-food.jpg", categoryName: "Món chính", hasPromotion: false, isActive: true, stockQuantity: 100 },
        { id: 5, name: "Kim chi Hàn Quốc", price: 29000, originalPrice: 29000, finalPrice: 29000, imageUrl: "/default-food.jpg", categoryName: "Món khai vị", hasPromotion: false, isActive: true, stockQuantity: 200 },
        { id: 6, name: "Nước ép cam", price: 39000, originalPrice: 39000, finalPrice: 39000, imageUrl: "/default-food.jpg", categoryName: "Đồ uống", hasPromotion: false, isActive: true, stockQuantity: 150 },
        { id: 7, name: "Trà xanh", price: 25000, originalPrice: 25000, finalPrice: 25000, imageUrl: "/default-food.jpg", categoryName: "Đồ uống", hasPromotion: false, isActive: true, stockQuantity: 180 },
    ];

    // Lọc món theo danh mục và tìm kiếm
    const filteredFoods = foods.filter(f => {
        if (selectedCategory !== "Tất cả") {
            if (f.categoryName !== selectedCategory) {
                return false;
            }
        }
        return f.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Hiển thị giá với khuyến mãi
    const renderPrice = (food) => {
        if (food.hasPromotion) {
            return (
                <div className="price-container">
                    <span className="original-price">{food.originalPrice?.toLocaleString()}đ</span>
                    <span className="final-price">{food.finalPrice?.toLocaleString()}đ</span>
                    {food.discountPercentage && (
                        <span className="discount-badge">-{food.discountPercentage}%</span>
                    )}
                </div>
            );
        }
        return (
            <div className="price-container">
                <span className="final-price">{food.price?.toLocaleString()}đ</span>
            </div>
        );
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
                        placeholder="Tìm món..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Danh mục tabs */}
                {categories.length > 0 && (
                    <div className="category-tabs">
                        <button
                            className={`category-tab ${selectedCategory === "Tất cả" ? "active" : ""}`}
                            onClick={() => setSelectedCategory("Tất cả")}
                        >
                            Tất cả
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`category-tab ${selectedCategory === cat.name ? "active" : ""}`}
                                onClick={() => setSelectedCategory(cat.name)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Đang tải món ăn...</p>
                    </div>
                ) : error ? (
                    <div className="error-container">
                        <p>⚠️ {error}</p>
                        <button onClick={fetchFoodsWithBranchPrice} className="retry-btn">Thử lại</button>
                    </div>
                ) : (
                    <div className="food-grid">
                        {filteredFoods.length === 0 ? (
                            <div className="empty-state">
                                <p>🔍 Không tìm thấy món "{searchTerm}"</p>
                            </div>
                        ) : (
                            filteredFoods.map(food => (
                                <div
                                    key={food.id}
                                    className={`food-card ${!food.isActive ? "inactive" : ""}`}
                                    onClick={() => {
                                        if (food.isActive !== false && food.stockQuantity > 0) {
                                            onSelectFood({
                                                id: food.id,
                                                name: food.name,
                                                price: food.finalPrice || food.price,
                                                originalPrice: food.originalPrice,
                                                imageUrl: food.imageUrl,
                                                hasPromotion: food.hasPromotion,
                                                branchFoodId: food.branchFoodId
                                            });
                                            onClose();
                                        } else if (food.stockQuantity === 0) {
                                            alert("❌ Món này đã hết hàng!");
                                        } else if (!food.isActive) {
                                            alert("❌ Món này đang tạm ngưng phục vụ!");
                                        }
                                    }}
                                >
                                    <img
                                        src={food.imageUrl?.startsWith("http") ? food.imageUrl : `${API}${food.imageUrl}`}
                                        alt={food.name}
                                        className="food-image"
                                        onError={(e) => {
                                            e.target.src = "/default-food.jpg";
                                        }}
                                    />
                                    <div className="food-info">
                                        <h4>{food.name}</h4>
                                        {renderPrice(food)}
                                        {food.hasPromotion && food.promotionName && (
                                            <span className="promotion-name">🎉 {food.promotionName}</span>
                                        )}
                                        {food.stockQuantity !== undefined && food.stockQuantity <= 10 && food.stockQuantity > 0 && (
                                            <span className="stock-warning">⚠️ Còn {food.stockQuantity}</span>
                                        )}
                                        {food.stockQuantity === 0 && (
                                            <span className="stock-out">🔥 Hết hàng</span>
                                        )}
                                        <button
                                            className="add-btn"
                                            disabled={!food.isActive || food.stockQuantity === 0}
                                        >
                                            {!food.isActive ? "Tạm ngưng" : food.stockQuantity === 0 ? "Hết hàng" : "+ Thêm"}
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