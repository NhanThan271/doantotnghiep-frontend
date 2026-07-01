import React, { useState, useEffect } from 'react';
import { X, ChefHat, Package, Beaker, Hash, Plus, Trash2 } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';
import { showToast } from '../../../hooks/useToast';

export default function AddRecipeForm({ closeForm, onSave }) {
    const [productId, setProductId] = useState('');
    const [ingredientItems, setIngredientItems] = useState([
        { ingredientId: '', quantityRequired: '' }
    ]);
    const [products, setProducts] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [productOpen, setProductOpen] = useState(false);
    const [ingSearchTerms, setIngSearchTerms] = useState({});
    const [ingOpenDropdowns, setIngOpenDropdowns] = useState({});

    const API_BASE_URL = '';

    useEffect(() => {
        fetchProducts();
        fetchIngredients();
    }, []);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/foods`, {
                headers: { 'Authorization': `Bearer ${token}` }
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
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const sorted = data.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
                setIngredients(sorted);
            }
        } catch (err) {
            console.error('Lỗi khi lấy danh sách nguyên liệu:', err);
        }
    };

    const handleItemChange = (index, field, value) => {
        setIngredientItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
        setError('');
    };

    const addIngredientRow = () => {
        setIngredientItems(prev => [...prev, { ingredientId: '', quantityRequired: '' }]);
    };

    const removeIngredientRow = (index) => {
        setIngredientItems(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        if (!productId) {
            const msg = 'Vui lòng chọn sản phẩm';
            setError(msg);
            showToast('warning', 'Thiếu thông tin', msg);
            return false;
        }
        for (let i = 0; i < ingredientItems.length; i++) {
            const item = ingredientItems[i];
            if (!item.ingredientId) {
                const msg = `Vui lòng chọn nguyên liệu cho dòng ${i + 1}`;
                setError(msg);
                showToast('warning', 'Thiếu thông tin', msg);
                return false;
            }
            if (!item.quantityRequired || parseFloat(item.quantityRequired) <= 0) {
                const msg = `Vui lòng nhập định lượng hợp lệ cho dòng ${i + 1}`;
                setError(msg);
                showToast('warning', 'Định lượng không hợp lệ', msg);
                return false;
            }
        }
        // Kiểm tra trùng nguyên liệu
        const ids = ingredientItems.map(i => i.ingredientId);
        const dupeIndex = ids.findIndex((id, idx) => ids.indexOf(id) !== idx);
        if (dupeIndex !== -1) {
            const dupeName = ingredients.find(ing => ing.id === parseInt(ids[dupeIndex]))?.name || 'Không rõ';
            const msg = `Nguyên liệu <b>${dupeName}</b> bị trùng lặp, vui lòng kiểm tra lại`;
            setError(`Nguyên liệu "${dupeName}" bị trùng lặp`);
            showToast('error', 'Trùng nguyên liệu!', msg, 4500);
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

            const body = {
                foodId: parseInt(productId),
                ingredients: ingredientItems.map(item => ({
                    ingredientId: parseInt(item.ingredientId),
                    quantityRequired: parseFloat(item.quantityRequired)
                }))
            };

            const response = await fetch(`${API_BASE_URL}/api/recipes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Thêm công thức thất bại');
            }

            const newRecipes = await response.json();
            console.log('OK:', newRecipes);

            showToast('success', 'Thêm thành công!', 'Công thức đã được thêm thành công.');
            if (onSave) onSave(newRecipes);

            closeForm();

        } catch (err) {
            console.error(err);
            setError(err.message || 'Đã có lỗi xảy ra, vui lòng thử lại.');
            showToast('error', 'Thêm thất bại', err.message || 'Đã có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 16px 12px 44px',
        background: '#F9FAFB',
        borderRadius: '12px',
        border: '1px solid #D1D5DB',
        color: '#111827',
        fontSize: '14px',
        outline: 'none',
        appearance: 'none',
        backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '20px',
        cursor: 'pointer',
        boxSizing: 'border-box'
    };

    const iconStyle = {
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#6B7280',
        pointerEvents: 'none',
        zIndex: 1
    };

    return (
        <div className={styles['modal-backdrop-light']} onClick={closeForm}>
            <div className={styles['modal-container-light']} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles['modal-header-light']}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            background: 'rgba(249, 115, 22, 0.1)',
                            borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ChefHat size={20} color="#F97316" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#111827' }}>
                                Thêm công thức mới
                            </h2>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
                                Tạo công thức cho món ăn
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeForm}
                        style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            border: '1px solid #D1D5DB', background: 'transparent',
                            color: '#6B7280', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.borderColor = '#EF4444';
                            e.currentTarget.style.color = '#EF4444';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = '#D1D5DB';
                            e.currentTarget.style.color = '#6B7280';
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className={styles['modal-body-light']}>
                    <form onSubmit={handleSubmit}>
                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px', color: '#EF4444',
                                fontSize: '14px', marginBottom: '20px'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Info box */}
                        <div style={{
                            padding: '12px',
                            background: 'rgba(249, 115, 22, 0.1)',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            borderRadius: '8px', marginBottom: '20px'
                        }}>
                            <p style={{ fontSize: '13px', color: '#F97316', margin: 0 }}>
                                <strong>Lưu ý:</strong> Mỗi sản phẩm chỉ có thể có một công thức cho mỗi nguyên liệu.
                            </p>
                        </div>

                        {/* Product Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block', marginBottom: '8px',
                                fontSize: '14px', fontWeight: '600', color: '#111827'
                            }}>
                                Sản phẩm <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Package size={18} style={iconStyle} />
                                <input
                                    type="text"
                                    placeholder="Tìm sản phẩm..."
                                    value={
                                        productId
                                            ? (productOpen
                                                ? productSearch
                                                : products.find(p => p.id === parseInt(productId))?.name || '')
                                            : productSearch
                                    }
                                    onChange={e => {
                                        setProductSearch(e.target.value);
                                        setProductOpen(true);
                                        if (!e.target.value) setProductId('');
                                        setError('');
                                    }}
                                    onFocus={() => setProductOpen(true)}
                                    style={{
                                        width: '100%', padding: '12px 16px 12px 44px',
                                        background: '#F9FAFB', borderRadius: '12px',
                                        border: '1px solid #D1D5DB', color: '#111827',
                                        fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                                {productOpen && (
                                    <>
                                        <div
                                            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                                            onClick={() => setProductOpen(false)}
                                        />
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                            background: '#FFFFFF', border: '1px solid #D1D5DB',
                                            borderRadius: '10px', zIndex: 100, maxHeight: 220,
                                            overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                            marginTop: 4
                                        }}>
                                            {products
                                                .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                                .map(p => (
                                                    <div
                                                        key={p.id}
                                                        onMouseDown={() => {
                                                            setProductId(String(p.id));
                                                            setProductSearch('');
                                                            setProductOpen(false);
                                                            setError('');
                                                        }}
                                                        style={{
                                                            padding: '10px 16px', cursor: 'pointer', fontSize: 14,
                                                            color: parseInt(productId) === p.id ? '#F97316' : '#374151',
                                                            background: parseInt(productId) === p.id ? 'rgba(249,115,22,0.15)' : 'transparent',
                                                            borderBottom: '1px solid #F3F4F6',
                                                            transition: 'background 0.1s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.1)'}
                                                        onMouseLeave={e => e.currentTarget.style.background =
                                                            parseInt(productId) === p.id ? 'rgba(249,115,22,0.15)' : 'transparent'}
                                                    >
                                                        {p.name}
                                                    </div>
                                                ))}
                                            {products.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                                                    Không tìm thấy sản phẩm
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Ingredient Rows */}
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', marginBottom: '12px'
                            }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                                    Nguyên liệu <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={addIngredientRow}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '6px 12px', borderRadius: '8px',
                                        border: '1px solid rgba(249, 115, 22, 0.4)',
                                        background: 'rgba(249, 115, 22, 0.1)',
                                        color: '#F97316', fontSize: '13px',
                                        fontWeight: '600', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)';
                                        e.currentTarget.style.borderColor = '#F97316';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                                        e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                                    }}
                                >
                                    <Plus size={14} />
                                    Thêm nguyên liệu
                                </button>
                            </div>

                            {ingredientItems.map((item, index) => {
                                const selectedIng = ingredients.find(ing => ing.id === parseInt(item.ingredientId));
                                return (
                                    <div
                                        key={index}
                                        style={{
                                            padding: '16px',
                                            background: '#F9FAFB',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '12px',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between', marginBottom: '12px'
                                        }}>
                                            <span style={{
                                                fontSize: '12px', fontWeight: '600',
                                                color: '#F97316',
                                                background: 'rgba(249, 115, 22, 0.1)',
                                                padding: '2px 8px', borderRadius: '6px'
                                            }}>
                                                #{index + 1}
                                            </span>
                                            {ingredientItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeIngredientRow(index)}
                                                    style={{
                                                        width: '28px', height: '28px',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        background: 'rgba(239, 68, 68, 0.08)',
                                                        color: '#EF4444', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                                        e.currentTarget.style.borderColor = '#EF4444';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                                    }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Ingredient Select */}
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <Beaker size={18} style={iconStyle} />
                                                <input
                                                    type="text"
                                                    placeholder="Tìm nguyên liệu..."
                                                    value={
                                                        item.ingredientId
                                                            ? (ingOpenDropdowns[index]
                                                                ? (ingSearchTerms[index] ?? '')
                                                                : (() => {
                                                                    const ing = ingredients.find(i => i.id === parseInt(item.ingredientId));
                                                                    return ing ? `${ing.name} (${ing.unit})` : '';
                                                                })())
                                                            : (ingSearchTerms[index] ?? '')
                                                    }
                                                    onChange={e => {
                                                        setIngSearchTerms(prev => ({ ...prev, [index]: e.target.value }));
                                                        setIngOpenDropdowns(prev => ({ ...prev, [index]: true }));
                                                        if (!e.target.value) handleItemChange(index, 'ingredientId', '');
                                                        setError('');
                                                    }}
                                                    onFocus={() => setIngOpenDropdowns(prev => ({ ...prev, [index]: true }))}
                                                    style={{
                                                        width: '100%', padding: '12px 16px 12px 44px',
                                                        background: '#F9FAFB', borderRadius: '12px',
                                                        border: '1px solid #D1D5DB', color: '#111827',
                                                        fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                                                    }}
                                                />
                                                {ingOpenDropdowns[index] && (
                                                    <>
                                                        <div
                                                            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                                                            onClick={() => setIngOpenDropdowns(prev => ({ ...prev, [index]: false }))}
                                                        />
                                                        <div style={{
                                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                                            background: '#FFFFFF', border: '1px solid #D1D5DB',
                                                            borderRadius: '10px', zIndex: 100, maxHeight: 200,
                                                            overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                            marginTop: 4
                                                        }}>
                                                            {ingredients
                                                                .filter(ing => {
                                                                    const term = (ingSearchTerms[index] ?? '').toLowerCase();
                                                                    return !term || ing.name.toLowerCase().includes(term);
                                                                })
                                                                .map(ing => (
                                                                    <div
                                                                        key={ing.id}
                                                                        onMouseDown={() => {
                                                                            handleItemChange(index, 'ingredientId', ing.id);
                                                                            setIngSearchTerms(prev => ({ ...prev, [index]: '' }));
                                                                            setIngOpenDropdowns(prev => ({ ...prev, [index]: false }));
                                                                            setError('');
                                                                        }}
                                                                        style={{
                                                                            padding: '10px 16px', cursor: 'pointer', fontSize: 13,
                                                                            color: parseInt(item.ingredientId) === ing.id ? '#F97316' : '#374151',
                                                                            background: parseInt(item.ingredientId) === ing.id ? 'rgba(249,115,22,0.15)' : 'transparent',
                                                                            borderBottom: '1px solid #F3F4F6',
                                                                            transition: 'background 0.1s'
                                                                        }}
                                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.1)'}
                                                                        onMouseLeave={e => e.currentTarget.style.background =
                                                                            parseInt(item.ingredientId) === ing.id ? 'rgba(249,115,22,0.15)' : 'transparent'}
                                                                    >
                                                                        {ing.name} <span style={{ color: '#9ca3af', fontSize: 12 }}>({ing.unit})</span>
                                                                    </div>
                                                                ))}
                                                            {ingredients.filter(ing => {
                                                                const term = (ingSearchTerms[index] ?? '').toLowerCase();
                                                                return !term || ing.name.toLowerCase().includes(term);
                                                            }).length === 0 && (
                                                                    <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                                                                        Không tìm thấy nguyên liệu
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quantity */}
                                        <div>
                                            <label style={{
                                                display: 'block', marginBottom: '6px',
                                                fontSize: '13px', color: '#6B7280'
                                            }}>
                                                Định lượng
                                                {selectedIng && (
                                                    <span style={{ marginLeft: '6px', color: '#F97316' }}>
                                                        ({selectedIng.unit})
                                                    </span>
                                                )}
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <Hash size={18} style={iconStyle} />
                                                <input
                                                    type="number"
                                                    placeholder="Nhập số lượng"
                                                    value={item.quantityRequired}
                                                    onChange={(e) => handleItemChange(index, 'quantityRequired', e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px 12px 44px',
                                                        background: '#F9FAFB',
                                                        borderRadius: '12px',
                                                        border: '1px solid #D1D5DB',
                                                        color: '#111827',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        transition: 'all 0.2s ease',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className={styles['modal-footer-light']}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={closeForm}
                            style={{
                                flex: 1, padding: '12px',
                                background: 'transparent', color: '#6B7280',
                                border: '1px solid #D1D5DB', borderRadius: '12px',
                                fontWeight: '600', cursor: 'pointer',
                                fontSize: '14px', transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                                e.currentTarget.style.color = '#111827';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#6B7280';
                            }}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            onClick={handleSubmit}
                            style={{
                                flex: 1, padding: '12px',
                                background: loading
                                    ? '#D1D5DB'
                                    : 'linear-gradient(135deg, #F97316, #EA580C)',
                                color: loading ? '#666' : '#FFF',
                                border: 'none', borderRadius: '12px',
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
                            {loading ? 'Đang xử lý...' : `Thêm công thức (${ingredientItems.length} nguyên liệu)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}