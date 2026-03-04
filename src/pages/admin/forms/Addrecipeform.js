import React, { useState, useEffect } from 'react';
import { X, ChefHat, Package, Beaker, Hash } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

export default function AddRecipeForm({ closeForm, onSave }) {
    const [formData, setFormData] = useState({
        productId: '',
        ingredientId: '',
        quantityRequired: ''
    });
    const [products, setProducts] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        fetchProducts();
        fetchIngredients();
    }, []);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/products`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (err) {
            console.error('Lỗi khi lấy danh sách sản phẩm:', err);
        }
    };

    const fetchIngredients = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/ingredients/active`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setIngredients(data);
            }
        } catch (err) {
            console.error('Lỗi khi lấy danh sách nguyên liệu:', err);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.productId) {
            setError('Vui lòng chọn sản phẩm');
            return false;
        }
        if (!formData.ingredientId) {
            setError('Vui lòng chọn nguyên liệu');
            return false;
        }
        if (!formData.quantityRequired || formData.quantityRequired <= 0) {
            setError('Vui lòng nhập định lượng hợp lệ');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');

            const response = await fetch(
                `${API_BASE_URL}/api/recipes?productId=${formData.productId}&ingredientId=${formData.ingredientId}&quantityRequired=${formData.quantityRequired}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                if (errorText.includes('already exists')) {
                    throw new Error('Công thức này đã tồn tại. Vui lòng chọn tổ hợp sản phẩm và nguyên liệu khác!');
                }
                throw new Error(errorText || 'Thêm công thức thất bại');
            }

            const newRecipe = await response.json();
            console.log('Thêm công thức thành công:', newRecipe);

            alert('Thêm công thức thành công!');

            if (onSave) {
                onSave(newRecipe);
            }

            closeForm();
        } catch (err) {
            console.error('Lỗi khi thêm công thức:', err);
            setError(err.message || 'Không thể thêm công thức. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    const selectedIngredient = ingredients.find(ing => ing.id === parseInt(formData.ingredientId));

    return (
        <div className={styles['modal-backdrop']} onClick={closeForm}>
            <div className={styles['modal-container']} onClick={(e) => e.stopPropagation()}>
                {/* Header - Fixed */}
                <div className={styles['modal-header']}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'rgba(249, 115, 22, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ChefHat size={20} color="#F97316" />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                margin: 0,
                                color: '#FFFFFF'
                            }}>
                                Thêm công thức mới
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: '#B8B8B8',
                                margin: '4px 0 0 0'
                            }}>
                                Tạo công thức cho món ăn
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeForm}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid #2A2A2A',
                            background: 'transparent',
                            color: '#B8B8B8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.borderColor = '#EF4444';
                            e.currentTarget.style.color = '#EF4444';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = '#2A2A2A';
                            e.currentTarget.style.color = '#B8B8B8';
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Content - Scrollable */}
                <div className={styles['modal-body']}>
                    <form onSubmit={handleSubmit}>
                        {/* Error message */}
                        {error && (
                            <div style={{
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                color: '#EF4444',
                                fontSize: '14px',
                                marginBottom: '20px'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Info box */}
                        <div style={{
                            padding: '12px',
                            background: 'rgba(249, 115, 22, 0.1)',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <p style={{
                                fontSize: '13px',
                                color: '#F97316',
                                margin: 0
                            }}>
                                💡 <strong>Lưu ý:</strong> Mỗi sản phẩm chỉ có thể có một công thức cho mỗi nguyên liệu.
                            </p>
                        </div>

                        {/* Product Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#FFFFFF'
                            }}>
                                Sản phẩm <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Package
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#B8B8B8',
                                        pointerEvents: 'none',
                                        zIndex: 1
                                    }}
                                />
                                <select
                                    value={formData.productId}
                                    onChange={(e) => handleChange('productId', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px 12px 44px',
                                        background: '#0F0F0F',
                                        borderRadius: '12px',
                                        border: '1px solid #2A2A2A',
                                        color: '#FFFFFF',
                                        fontSize: '14px',
                                        outline: 'none',
                                        appearance: 'none',
                                        backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px center',
                                        backgroundSize: '20px',
                                        cursor: 'pointer'
                                    }}
                                    required
                                >
                                    <option value="">-- Chọn sản phẩm --</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Ingredient Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#FFFFFF'
                            }}>
                                Nguyên liệu <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Beaker
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#B8B8B8',
                                        pointerEvents: 'none',
                                        zIndex: 1
                                    }}
                                />
                                <select
                                    value={formData.ingredientId}
                                    onChange={(e) => handleChange('ingredientId', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px 12px 44px',
                                        background: '#0F0F0F',
                                        borderRadius: '12px',
                                        border: '1px solid #2A2A2A',
                                        color: '#FFFFFF',
                                        fontSize: '14px',
                                        outline: 'none',
                                        appearance: 'none',
                                        backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px center',
                                        backgroundSize: '20px',
                                        cursor: 'pointer'
                                    }}
                                    required
                                >
                                    <option value="">-- Chọn nguyên liệu --</option>
                                    {ingredients.map(ingredient => (
                                        <option key={ingredient.id} value={ingredient.id}>
                                            {ingredient.name} ({ingredient.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Quantity Required */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#FFFFFF'
                            }}>
                                Định lượng <span style={{ color: '#EF4444' }}>*</span>
                                {selectedIngredient && (
                                    <span style={{
                                        marginLeft: '8px',
                                        fontSize: '12px',
                                        color: '#B8B8B8',
                                        fontWeight: '400'
                                    }}>
                                        (Đơn vị: {selectedIngredient.unit})
                                    </span>
                                )}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Hash
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#B8B8B8'
                                    }}
                                />
                                <input
                                    type="number"
                                    placeholder="Nhập số lượng"
                                    value={formData.quantityRequired}
                                    onChange={(e) => handleChange('quantityRequired', e.target.value)}
                                    min="0"
                                    step="0.01"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px 12px 44px',
                                        background: '#0F0F0F',
                                        borderRadius: '12px',
                                        border: '1px solid #2A2A2A',
                                        color: '#FFFFFF',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                    required
                                />
                            </div>
                            <p style={{
                                fontSize: '12px',
                                color: '#B8B8B8',
                                marginTop: '6px',
                                marginLeft: '4px'
                            }}>
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer - Fixed */}
                <div className={styles['modal-footer']}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={closeForm}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'transparent',
                                color: '#B8B8B8',
                                border: '1px solid #2A2A2A',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                                e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#B8B8B8';
                            }}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            onClick={handleSubmit}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: loading
                                    ? '#B8B8B8'
                                    : 'linear-gradient(135deg, #F97316, #EA580C)',
                                color: loading ? '#666' : '#FFF',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'transform 0.2s',
                                opacity: loading ? 0.6 : 1
                            }}
                            onMouseOver={(e) => {
                                if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {loading ? 'Đang xử lý...' : 'Thêm công thức'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}