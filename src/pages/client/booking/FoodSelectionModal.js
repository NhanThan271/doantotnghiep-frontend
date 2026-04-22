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

    const allCategory = { id: 'all', name: 'Tất cả món ăn', icon: '🍽️' };
    const getAuthToken = () => localStorage.getItem('token');

    useEffect(() => {
        if (show) setTempSelectedFoods([...selectedFoods]);
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
                headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
            });
            const data = await response.json();
            setCategories(data || []);
            setSelectedCategory(allCategory);
        } catch (err) {
            console.error('❌ Lỗi khi lấy danh mục:', err);
            setCategories([]);
            setSelectedCategory(allCategory);
        }
    };

    const fetchFoodsByBranch = async (categoryId = null) => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            let url = `${API}/api/branch-foods/branch/${branchId}`;
            if (categoryId && categoryId !== 'all') url += `?categoryId=${categoryId}`;

            const response = await fetch(url, {
                headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
            });
            const data = await response.json();
            setFoods(data.map(item => ({
                id: item.id, foodId: item.food?.id, name: item.food?.name, description: item.food?.description || '',
                price: item.customPrice || item.food?.price, imageUrl: item.food?.imageUrl,
                categoryId: item.food?.category?.id, stockQuantity: item.stockQuantity, isAvailable: item.isActive
            })));
        } catch (err) {
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
        await fetchFoodsByBranch(category.id === 'all' ? null : category.id);
        setSearchTerm('');
    };

    const isFoodSelected = (branchFoodId) => tempSelectedFoods.some(f => f.branchFoodId === branchFoodId);
    const getSelectedQuantity = (branchFoodId) => tempSelectedFoods.find(f => f.branchFoodId === branchFoodId)?.quantity || 0;

    const handleAddFood = (food) => {
        if (food.isAvailable === false || food.stockQuantity === 0) {
            alert("❌ Món này không khả dụng!");
            return;
        }
        const existing = tempSelectedFoods.find(f => f.branchFoodId === food.id);
        if (existing) {
            setTempSelectedFoods(tempSelectedFoods.map(f => f.branchFoodId === food.id ? { ...f, quantity: f.quantity + 1 } : f));
        } else {
            setTempSelectedFoods([...tempSelectedFoods, {
                id: food.id, branchFoodId: food.id, foodId: food.foodId, name: food.name,
                price: food.price, quantity: 1, imageUrl: food.imageUrl
            }]);
        }
    };

    const handleRemoveFood = (branchFoodId) => {
        const existing = tempSelectedFoods.find(f => f.branchFoodId === branchFoodId);
        if (existing && existing.quantity > 1) {
            setTempSelectedFoods(tempSelectedFoods.map(f => f.branchFoodId === branchFoodId ? { ...f, quantity: f.quantity - 1 } : f));
        } else {
            setTempSelectedFoods(tempSelectedFoods.filter(f => f.branchFoodId !== branchFoodId));
        }
    };

    const handleConfirmSelection = () => {
        tempSelectedFoods.forEach(food => onSelectFood(food));
        onClose();
    };

    const handleCancel = () => {
        setTempSelectedFoods([]);
        onClose();
    };

    const filteredFoods = foods.filter(food =>
        !searchTerm || food.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatPrice = (price) => price?.toLocaleString('vi-VN') + 'đ' || '0đ';
    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http')) return imageUrl;
        return `${API}/uploads/${imageUrl}`;
    };

    const totalAmount = tempSelectedFoods.reduce((sum, f) => sum + (f.price * f.quantity), 0);

    if (!show) return null;

    return (
        <div className={styles.overlay} onClick={handleCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>🍽️ Chọn món ăn</h2>
                    <button className={styles.closeBtn} onClick={handleCancel}><X size={24} /></button>
                </div>

                <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} />
                    <input type="text" className={styles.searchInput} placeholder="Tìm kiếm món ăn yêu thích..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {searchTerm && <button className={styles.searchClear} onClick={() => setSearchTerm('')}><X size={16} /></button>}
                </div>

                {categories.length > 0 && (
                    <div className={styles.categoryTabs}>
                        <button className={`${styles.categoryTab} ${selectedCategory?.id === 'all' ? styles.active : ''}`} onClick={() => handleCategorySelect(allCategory)}>
                            {allCategory.icon} {allCategory.name}
                        </button>
                        {categories.map(cat => (
                            <button key={cat.id} className={`${styles.categoryTab} ${selectedCategory?.id === cat.id ? styles.active : ''}`} onClick={() => handleCategorySelect({ id: cat.id, name: cat.name })}>
                                🍲 {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className={styles.statsBar}>
                    <div className={styles.foodCount}><strong>{filteredFoods.length}</strong> món được tìm thấy</div>
                    {tempSelectedFoods.length > 0 && <div className={styles.selectedCount}>🛒 Đã chọn: <strong>{tempSelectedFoods.reduce((sum, f) => sum + f.quantity, 0)}</strong> món</div>}
                </div>

                {loading ? (
                    <div className={styles.loadingContainer}><div className={styles.spinner}></div><p>Đang tải món ăn...</p></div>
                ) : error ? (
                    <div className={styles.errorContainer}><p>⚠️ {error}</p><button onClick={() => fetchFoodsByBranch()} className={styles.retryBtn}>Thử lại</button></div>
                ) : (
                    <div className={styles.foodContainer}>
                        <div className={styles.foodGrid}>
                            {filteredFoods.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>🔍 Không tìm thấy món "{searchTerm}"</p>
                                    <button onClick={() => { setSearchTerm(''); handleCategorySelect(allCategory); }} className={styles.clearFilterBtn}>Xóa bộ lọc</button>
                                </div>
                            ) : (
                                filteredFoods.map(food => {
                                    const isSelected = isFoodSelected(food.id);
                                    const quantity = getSelectedQuantity(food.id);
                                    const imageUrl = getImageUrl(food.imageUrl);
                                    return (
                                        <div key={food.id} className={`${styles.foodCard} ${!food.isAvailable ? styles.inactive : ''} ${isSelected ? styles.selected : ''}`}>
                                            <div className={styles.imageWrapper}>
                                                {imageUrl ? <img src={imageUrl} alt={food.name} className={styles.foodImage} onError={(e) => { e.target.src = "https://via.placeholder.com/300x200?text=No+Image"; }} />
                                                    : <div className={styles.imagePlaceholder}><span>🍽️</span></div>}
                                                {isSelected && <div className={styles.selectedBadge}><Check size={16} /></div>}
                                            </div>
                                            <div className={styles.foodInfo}>
                                                <h4 className={styles.foodName}>{food.name}</h4>
                                                {food.description && <p className={styles.foodDescription}>{food.description.substring(0, 60)}</p>}
                                                <div className={styles.foodPrice}>{formatPrice(food.price)}</div>
                                                <div className={styles.foodStatus}>
                                                    {food.stockQuantity <= 10 && food.stockQuantity > 0 && <span className={styles.stockWarning}>⚠️ Còn {food.stockQuantity}</span>}
                                                    {food.stockQuantity === 0 && <span className={styles.stockOut}>🔥 Hết hàng</span>}
                                                </div>
                                                <div className={styles.foodActions}>
                                                    {isSelected && <button className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); handleRemoveFood(food.id); }}>-</button>}
                                                    <button className={styles.addBtn} disabled={!food.isAvailable || food.stockQuantity === 0} onClick={(e) => { e.stopPropagation(); handleAddFood(food); }}>
                                                        {isSelected ? `+ Thêm (${quantity})` : "+ Thêm vào đơn"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {tempSelectedFoods.length > 0 && (
                    <div className={styles.footer}>
                        <div className={styles.totalInfo}><span className={styles.totalLabel}>Tổng cộng:</span><span className={styles.totalAmount}>{formatPrice(totalAmount)}</span></div>
                        <div className={styles.footerButtons}>
                            <button className={styles.cancelFooterBtn} onClick={handleCancel}>Hủy</button>
                            <button className={styles.confirmBtn} onClick={handleConfirmSelection}>Xác nhận ({tempSelectedFoods.reduce((sum, f) => sum + f.quantity, 0)} món)</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FoodSelectionModal;