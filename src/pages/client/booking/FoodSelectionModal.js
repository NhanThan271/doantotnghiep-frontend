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
        if (show) {
            fetchCategories();
            fetchFoods();
        }
    }, [show]);

    // 🔥 Lấy danh sách danh mục
    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API}/api/categories`);
            if (!response.ok) throw new Error();
            const data = await response.json();
            console.log("📂 Categories loaded:", data);
            setCategories(data || []);
        } catch (err) {
            console.error("❌ Lỗi tải danh mục:", err);
            // Mock categories nếu API lỗi
            setCategories([
                { id: 1, name: "Món khai vị" },
                { id: 2, name: "Món chính" },
                { id: 3, name: "Đồ uống" },
                { id: 4, name: "Tráng miệng" }
            ]);
        }
    };

    const fetchFoods = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API}/api/foods`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("🍽️ Foods loaded:", data);

            // Format dữ liệu
            const formattedFoods = data.map(food => ({
                id: food.id,
                name: food.name,
                price: food.price || 0,
                imageUrl: food.imageUrl || "/default-food.jpg",
                description: food.description || "",
                categoryId: food.category?.id,
                categoryName: food.category?.name
            }));

            setFoods(formattedFoods);
        } catch (err) {
            console.error("❌ Lỗi tải món:", err);
            setError("Không thể tải danh sách món ăn. Vui lòng thử lại!");
            setFoods(getMockFoods());
        } finally {
            setLoading(false);
        }
    };

    // Mock data fallback
    const getMockFoods = () => [
        { id: 1, name: "Bò nướng muối ớt", price: 189000, imageUrl: "/default-food.jpg", categoryId: 2, categoryName: "Món chính" },
        { id: 2, name: "Sườn non nướng mật ong", price: 159000, imageUrl: "/default-food.jpg", categoryId: 2, categoryName: "Món chính" },
        { id: 3, name: "Gà nướng nguyên con", price: 199000, imageUrl: "/default-food.jpg", categoryId: 2, categoryName: "Món chính" },
        { id: 4, name: "Cơm trộn Hàn Quốc", price: 89000, imageUrl: "/default-food.jpg", categoryId: 2, categoryName: "Món chính" },
        { id: 5, name: "Mỳ lạnh Naengmyeon", price: 99000, imageUrl: "/default-food.jpg", categoryId: 2, categoryName: "Món chính" },
        { id: 6, name: "Kim chi Hàn Quốc", price: 29000, imageUrl: "/default-food.jpg", categoryId: 1, categoryName: "Món khai vị" },
        { id: 7, name: "Canh kim chi", price: 59000, imageUrl: "/default-food.jpg", categoryId: 1, categoryName: "Món khai vị" },
        { id: 8, name: "Lẩu Hàn Quốc", price: 299000, imageUrl: "/default-food.jpg", categoryId: 2, categoryName: "Món chính" },
        { id: 9, name: "Nước ép cam", price: 39000, imageUrl: "/default-food.jpg", categoryId: 3, categoryName: "Đồ uống" },
        { id: 10, name: "Trà xanh", price: 25000, imageUrl: "/default-food.jpg", categoryId: 3, categoryName: "Đồ uống" }
    ];

    // 🔥 Lọc món theo danh mục và tìm kiếm
    const filteredFoods = foods.filter(f => {
        // Lọc theo danh mục
        if (selectedCategory !== "Tất cả") {
            if (f.categoryName !== selectedCategory && f.categoryId?.toString() !== selectedCategory) {
                return false;
            }
        }
        // Lọc theo tìm kiếm
        return f.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });

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

                {/* 🔥 THANH TÌM KIẾM */}
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Tìm món..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* 🔥 DANH MỤC (TABS) */}
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

                {/* CONTENT */}
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Đang tải món ăn...</p>
                    </div>
                ) : error ? (
                    <div className="error-container">
                        <p>⚠️ {error}</p>
                        <button onClick={fetchFoods} className="retry-btn">Thử lại</button>
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
                                    className="food-card"
                                    onClick={() => {
                                        onSelectFood(food);
                                        onClose();
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
                                        <p className="food-price">{food.price.toLocaleString()}đ</p>
                                        <button className="add-btn">+ Thêm</button>
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