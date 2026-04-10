import React, { useState, useEffect } from 'react';
import { X, ChefHat, Package, Beaker, Hash, Plus, Trash2 } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

/**
 * EditRecipeForm - Chỉnh sửa công thức của một món ăn (nhiều nguyên liệu)
 *
 * Props:
 *   closeForm  : () => void
 *   onSave     : (updatedRecipes: Recipe[]) => void
 *   recipeData : { foodId, foodName, recipes: [{ id, ingredient: { id, name, unit }, quantityRequired }] }
 */
export default function EditRecipeForm({ closeForm, onSave, recipeData }) {
    // rows = [{ recipeId, ingredientId, ingredientName, unit, quantityRequired }]
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = 'http://localhost:8080';

    /* ---------- khởi tạo rows từ recipeData ---------- */
    useEffect(() => {
        if (recipeData?.recipes?.length) {
            setRows(
                recipeData.recipes.map((r) => ({
                    recipeId: r.id,
                    ingredientId: r.ingredient?.id ?? '',
                    ingredientName: r.ingredient?.name ?? 'N/A',
                    unit: r.ingredient?.unit ?? '',
                    quantityRequired: r.quantityRequired ?? '',
                }))
            );
        }
    }, [recipeData]);

    /* ---------- handlers ---------- */
    const handleQtyChange = (index, value) => {
        setRows((prev) =>
            prev.map((row, i) => (i === index ? { ...row, quantityRequired: value } : row))
        );
        setError('');
    };

    const handleRemoveRow = (index) => {
        setRows((prev) => prev.filter((_, i) => i !== index));
    };

    /* ---------- validate ---------- */
    const validateForm = () => {
        if (rows.length === 0) {
            setError('Công thức phải có ít nhất một nguyên liệu');
            return false;
        }
        for (let i = 0; i < rows.length; i++) {
            const qty = parseFloat(rows[i].quantityRequired);
            if (!rows[i].quantityRequired || isNaN(qty) || qty <= 0) {
                setError(`Định lượng của "${rows[i].ingredientName}" không hợp lệ`);
                return false;
            }
        }
        return true;
    };

    /* ---------- submit ---------- */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');

            // Gọi PUT /api/recipes/food/{foodId} với toàn bộ danh sách nguyên liệu mới
            const payload = rows.map((row) => ({
                ingredientId: row.ingredientId,
                quantityRequired: parseFloat(row.quantityRequired),
            }));

            const response = await fetch(
                `${API_BASE_URL}/api/recipes/food/${recipeData.foodId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Cập nhật công thức thất bại');
            }

            const updatedRecipes = await response.json();
            console.log('Cập nhật công thức thành công:', updatedRecipes);

            alert('Cập nhật công thức thành công!');

            if (onSave) onSave(updatedRecipes);
            closeForm();
        } catch (err) {
            console.error('Lỗi khi cập nhật công thức:', err);
            setError(err.message || 'Không thể cập nhật công thức. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    /* ---------- render ---------- */
    return (
        <div className={styles['modal-backdrop']} onClick={closeForm}>
            <div className={styles['modal-container']} onClick={(e) => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className={styles['modal-header']}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            background: 'rgba(249, 115, 22, 0.1)',
                            borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <ChefHat size={20} color="#F97316" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#FFFFFF' }}>
                                Chỉnh sửa công thức
                            </h2>
                            <p style={{ fontSize: '13px', color: '#B8B8B8', margin: '4px 0 0 0' }}>
                                Cập nhật định lượng nguyên liệu
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={closeForm}
                        style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            border: '1px solid #2A2A2A', background: 'transparent',
                            color: '#B8B8B8', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
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

                {/* ── Body ── */}
                <div className={styles['modal-body']}>
                    <form onSubmit={handleSubmit}>

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px', color: '#EF4444',
                                fontSize: '14px', marginBottom: '20px',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Food info */}
                        <div style={{
                            padding: '16px',
                            background: 'rgba(249, 115, 22, 0.1)',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            borderRadius: '12px', marginBottom: '20px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Package size={20} color="#F97316" />
                                <div>
                                    <p style={{
                                        fontSize: '11px', color: '#B8B8B8', margin: 0,
                                        textTransform: 'uppercase', letterSpacing: '0.5px',
                                    }}>
                                        Sản phẩm
                                    </p>
                                    <p style={{ fontSize: '16px', color: '#F97316', margin: 0, fontWeight: '700' }}>
                                        {recipeData?.foodName || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Info note */}
                        <div style={{
                            padding: '12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px', marginBottom: '20px',
                        }}>
                            <p style={{ fontSize: '13px', color: '#3B82F6', margin: 0 }}>
                                💡 <strong>Lưu ý:</strong> Việc thay đổi định lượng sẽ ảnh hưởng đến toàn bộ hệ thống.
                                Hãy kiểm tra kỹ trước khi lưu.
                            </p>
                        </div>

                        {/* ── Danh sách nguyên liệu ── */}
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{
                                display: 'block', marginBottom: '12px',
                                fontSize: '14px', fontWeight: '600', color: '#FFFFFF',
                            }}>
                                Danh sách nguyên liệu <span style={{ color: '#EF4444' }}>*</span>
                                <span style={{
                                    marginLeft: '8px', fontSize: '12px',
                                    color: '#B8B8B8', fontWeight: '400',
                                }}>
                                    ({rows.length} nguyên liệu)
                                </span>
                            </label>

                            {rows.length === 0 && (
                                <div style={{
                                    padding: '24px', textAlign: 'center',
                                    color: '#B8B8B8', fontSize: '14px',
                                    border: '1px dashed #2A2A2A', borderRadius: '12px',
                                }}>
                                    Chưa có nguyên liệu nào
                                </div>
                            )}

                            {rows.map((row, index) => (
                                <div
                                    key={row.recipeId ?? index}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '12px 14px',
                                        background: '#0F0F0F',
                                        border: '1px solid #2A2A2A',
                                        borderRadius: '12px',
                                        marginBottom: '10px',
                                    }}
                                >
                                    {/* Icon + tên nguyên liệu */}
                                    <Beaker size={18} color="#8B5CF6" style={{ flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: '13px', fontWeight: '600',
                                            color: '#8B5CF6', margin: 0,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {row.ingredientName}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#B8B8B8', margin: '2px 0 0 0' }}>
                                            Đơn vị: {row.unit || 'N/A'}
                                        </p>
                                    </div>

                                    {/* Input định lượng */}
                                    <div style={{ position: 'relative', width: '130px', flexShrink: 0 }}>
                                        <Hash
                                            size={14}
                                            style={{
                                                position: 'absolute', left: '10px',
                                                top: '50%', transform: 'translateY(-50%)',
                                                color: '#B8B8B8',
                                            }}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Số lượng"
                                            value={row.quantityRequired}
                                            onChange={(e) => handleQtyChange(index, e.target.value)}
                                            min="0"
                                            step="0.01"
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px 8px 30px',
                                                background: '#1A1A1A',
                                                borderRadius: '8px',
                                                border: '1px solid #2A2A2A',
                                                color: '#FFFFFF',
                                                fontSize: '14px',
                                                outline: 'none',
                                                transition: 'all 0.2s ease',
                                                boxSizing: 'border-box',
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = '#F97316';
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = '#2A2A2A';
                                            }}
                                            required
                                        />
                                    </div>

                                    {/* Nút xóa hàng */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRow(index)}
                                        style={{
                                            width: '32px', height: '32px', flexShrink: 0,
                                            borderRadius: '8px',
                                            border: '1px solid #2A2A2A',
                                            background: 'transparent',
                                            color: '#B8B8B8', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s',
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
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </form>
                </div>

                {/* ── Footer ── */}
                <div className={styles['modal-footer']}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={closeForm}
                            style={{
                                flex: 1, padding: '12px',
                                background: 'transparent', color: '#B8B8B8',
                                border: '1px solid #2A2A2A', borderRadius: '12px',
                                fontWeight: '600', cursor: 'pointer',
                                fontSize: '14px', transition: 'all 0.2s',
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
                                flex: 1, padding: '12px',
                                background: loading
                                    ? '#B8B8B8'
                                    : 'linear-gradient(135deg, #F97316, #EA580C)',
                                color: loading ? '#666' : '#FFF',
                                border: 'none', borderRadius: '12px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'transform 0.2s',
                                opacity: loading ? 0.6 : 1,
                            }}
                            onMouseOver={(e) => {
                                if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {loading ? 'Đang xử lý...' : 'Cập nhật công thức'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}