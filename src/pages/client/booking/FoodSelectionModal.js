import React, { useState, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import styles from "./FoodSelectionModal.module.css";

const API = "http://localhost:8080";

const FoodSelectionModal = ({ show, onClose, onSelectFood, branchId, selectedFoods = [] }) => {
    const [foods, setFoods] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);
    const [tempSelectedFoods, setTempSelectedFoods] = useState([]);

    const allCategory = {
        id: 'all',
        name: 'Tất cả món ăn',
        icon: '🍽️'
    };

    const getAuthToken = () => localStorage.getItem('token');

    // Reset temp selected foods khi mở modal
    useEffect(() => {
        if (show) {
            setTempSelectedFoods([...selectedFoods]);
        }
    }, [show, selectedFoods]);

    useEffect(() => {
        if (show && branchId) {
            fetchCategories();
            fetchFoodsByBranch();
        }
    }, [show, branchId]);

    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API}/api/categories`, {
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
                setCategories([
                    { id: 1, name: "Món khai vị" },
                    { id: 2, name: "Món chính" },
                    { id: 3, name: "Đồ uống" },
                    { id: 4, name: "Tráng miệng" }
                ]);
            }
            setSelectedCategory(allCategory);
        } catch (err) {
            console.error('❌ Lỗi khi lấy danh mục:', err);
            setCategories([
                { id: 1, name: "Món khai vị" },
                { id: 2, name: "Món chính" },
                { id: 3, name: "Đồ uống" },
                { id: 4, name: "Tráng miệng" }
            ]);
            setSelectedCategory(allCategory);
        }
    };

    const fetchFoodsByBranch = async (categoryId = null) => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            let url = `${API}/api/branch-foods/branch/${branchId}`;
            if (categoryId && categoryId !== 'all') {
                url += `?categoryId=${categoryId}`;
            }

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
            console.log("🍽️ BranchFood data:", data);

            // 🔥 LẤY ĐÚNG foodId từ food.id
            const formattedFoods = data.map(item => ({
                id: item.id,  // branch_food.id (dùng để quản lý, không gửi lên backend)
                foodId: item.food?.id,  // 🔥 foods.id - CÁI BACKEND CẦN
                name: item.food?.name,
                description: item.food?.description || '',
                originalPrice: item.food?.price,  // giá gốc từ foods
                price: item.customPrice || item.food?.price,  // giá bán thực tế
                imageUrl: item.food?.imageUrl,
                categoryId: item.food?.category?.id,
                categoryName: item.food?.category?.name,
                stockQuantity: item.stockQuantity,
                isAvailable: item.isActive
            }));

            console.log("✅ Transformed foods with foodId:", formattedFoods);
            setFoods(formattedFoods);
        } catch (err) {
            console.error("❌ Lỗi tải món ăn:", err);
            setError("Không thể tải danh sách món ăn. Vui lòng thử lại!");
            setFoods([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCategorySelect = async (category) => {
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

    // Kiểm tra món đã được chọn chưa
    const isFoodSelected = (foodId) => {
        return tempSelectedFoods.some(f => f.foodId === foodId);
    };

    // Lấy số lượng của món đã chọn
    const getSelectedQuantity = (foodId) => {
        const selected = tempSelectedFoods.find(f => f.foodId === foodId);
        return selected ? selected.quantity : 0;
    };

    // Thêm món vào danh sách tạm
    const handleAddFood = (food) => {
        if (food.isAvailable === false || food.stockQuantity === 0) {
            alert("❌ Món này không khả dụng!");
            return;
        }

        // Kiểm tra xem món đã có trong giỏ chưa (dùng foodId)
        const existing = tempSelectedFoods.find(f => f.foodId === food.foodId);

        if (existing) {
            setTempSelectedFoods(tempSelectedFoods.map(f =>
                f.foodId === food.foodId ? { ...f, quantity: f.quantity + 1 } : f
            ));
        } else {
            setTempSelectedFoods([...tempSelectedFoods, {
                id: food.foodId,  // Thêm id cho object
                branchFoodId: food.id,
                foodId: food.foodId,
                name: food.name,
                price: food.price,
                quantity: 1,
                imageUrl: food.imageUrl
            }]);
        }
    };

    // Giảm số lượng hoặc xóa món
    const handleRemoveFood = (foodId) => {
        const existing = tempSelectedFoods.find(f => f.foodId === foodId);
        if (existing && existing.quantity > 1) {
            setTempSelectedFoods(tempSelectedFoods.map(f =>
                f.foodId === foodId ? { ...f, quantity: f.quantity - 1 } : f
            ));
        } else {
            setTempSelectedFoods(tempSelectedFoods.filter(f => f.foodId !== foodId));
        }
    };

    // Xác nhận chọn món
    const handleConfirmSelection = () => {
        // Gọi onSelectFood cho từng món hoặc gộp lại
        tempSelectedFoods.forEach(food => {
            onSelectFood(food);
        });
        onClose();
    };

    // Hủy và đóng modal
    const handleCancel = () => {
        setTempSelectedFoods([]);
        onClose();
    };

    const filteredFoods = foods.filter(food => {
        if (searchTerm) {
            return food.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (food.description && food.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return true;
    });

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

    const totalAmount = tempSelectedFoods.reduce((sum, f) => sum + (f.price * f.quantity), 0);

    if (!show) return null;

    return (
        <div className={styles.overlay} onClick={handleCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>🍽️ Chọn món ăn</h2>
                    <button className={styles.closeBtn} onClick={handleCancel}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Tìm kiếm món ăn yêu thích..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className={styles.searchClear} onClick={() => setSearchTerm('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                {categories.length > 0 && (
                    <div className={styles.categoryTabs}>
                        <button
                            className={`${styles.categoryTab} ${selectedCategory?.id === 'all' ? styles.active : ''}`}
                            onClick={() => handleCategorySelect(allCategory)}
                        >
                            {allCategory.icon} {allCategory.name}
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`${styles.categoryTab} ${selectedCategory?.id === cat.id ? styles.active : ''}`}
                                onClick={() => handleCategorySelect({ id: cat.id, name: cat.name })}
                            >
                                🍲 {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className={styles.statsBar}>
                    <div className={styles.foodCount}>
                        <strong>{filteredFoods.length}</strong> món được tìm thấy
                    </div>
                    {tempSelectedFoods.length > 0 && (
                        <div className={styles.selectedCount}>
                            🛒 Đã chọn: <strong>{tempSelectedFoods.reduce((sum, f) => sum + f.quantity, 0)}</strong> món
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>Đang tải món ăn...</p>
                    </div>
                ) : error ? (
                    <div className={styles.errorContainer}>
                        <p>⚠️ {error}</p>
                        <button onClick={() => fetchFoodsByBranch()} className={styles.retryBtn}>
                            Thử lại
                        </button>
                    </div>
                ) : (
                    <div className={styles.foodContainer}>
                        <div className={styles.foodGrid}>
                            {filteredFoods.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>🔍 Không tìm thấy món "{searchTerm}"</p>
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            handleCategorySelect(allCategory);
                                        }}
                                        className={styles.clearFilterBtn}
                                    >
                                        Xóa bộ lọc
                                    </button>
                                </div>
                            ) : (
                                filteredFoods.map(food => {
                                    const isSelected = isFoodSelected(food.foodId);  // 🔥 Dùng foodId
                                    const quantity = getSelectedQuantity(food.foodId);  // 🔥 Dùng foodId

                                    return (
                                        <div
                                            key={food.id}  // Dùng branchFoodId làm key
                                            className={`${styles.foodCard} ${!food.isAvailable ? styles.inactive : ''} ${isSelected ? styles.selected : ''}`}
                                        >
                                            {/* ... */}
                                            <div className={styles.foodActions}>
                                                {isSelected && (
                                                    <button
                                                        className={styles.removeBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveFood(food.foodId);  // 🔥 Dùng foodId
                                                        }}
                                                    >
                                                        -
                                                    </button>
                                                )}
                                                <button
                                                    className={styles.addBtn}
                                                    disabled={!food.isAvailable || food.stockQuantity === 0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddFood(food);
                                                    }}
                                                >
                                                    {isSelected ? `+ Thêm (${quantity})` : "+ Thêm vào đơn"}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Footer với nút xác nhận */}
                {tempSelectedFoods.length > 0 && (
                    <div className={styles.footer}>
                        <div className={styles.totalInfo}>
                            <span className={styles.totalLabel}>Tổng cộng:</span>
                            <span className={styles.totalAmount}>{formatPrice(totalAmount)}</span>
                        </div>
                        <div className={styles.footerButtons}>
                            <button className={styles.cancelFooterBtn} onClick={handleCancel}>
                                Hủy
                            </button>
                            <button className={styles.confirmBtn} onClick={handleConfirmSelection}>
                                Xác nhận ({tempSelectedFoods.reduce((sum, f) => sum + f.quantity, 0)} món)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FoodSelectionModal;