import React, { useState, useEffect } from 'react';
import { X, ChefHat, Package, Beaker, Hash, Trash2 } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';
import { showToast } from '../../../hooks/useToast';

export default function EditRecipeForm({ closeForm, onSave, recipeData }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = '';

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
            const msg = 'Công thức phải có ít nhất một nguyên liệu';
            setError(msg);
            showToast('warning', 'Công thức trống', msg);
            return false;
        }
        for (let i = 0; i < rows.length; i++) {
            const qty = parseFloat(rows[i].quantityRequired);
            if (!rows[i].quantityRequired || isNaN(qty) || qty <= 0) {
                const msg = `Định lượng của "${rows[i].ingredientName}" không hợp lệ`;
                setError(msg);
                showToast('warning', 'Định lượng không hợp lệ', msg);
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

            showToast('success', 'Cập nhật thành công!', `Công thức của <b>${recipeData?.foodName}</b> đã được lưu.`);

            if (onSave) onSave(updatedRecipes);
            closeForm();
        } catch (err) {
            console.error('Lỗi khi cập nhật công thức:', err);
            showToast('error', 'Cập nhật thất bại', err.message || 'Không thể cập nhật công thức. Vui lòng thử lại!');
            setError(err.message || 'Không thể cập nhật công thức. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    /* ---------- render ---------- */
    return (
        <div className={styles['modal-backdrop-light']} onClick={closeForm}>
            <div className={styles['modal-container-light']} onClick={(e) => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className={styles['modal-header-light']}>
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
                            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#111827' }}>
                                Chỉnh sửa công thức
                            </h2>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
                                Cập nhật định lượng nguyên liệu
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
                            transition: 'all 0.2s',
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

                {/* ── Body ── */}
                <div className={styles['modal-body-light']}>
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
                                        fontSize: '11px', color: '#6B7280', margin: 0,
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
                                <strong>Lưu ý:</strong> Việc thay đổi định lượng sẽ ảnh hưởng đến toàn bộ hệ thống.
                                Hãy kiểm tra kỹ trước khi lưu.
                            </p>
                        </div>

                        {/* ── Danh sách nguyên liệu ── */}
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{
                                display: 'block', marginBottom: '12px',
                                fontSize: '14px', fontWeight: '600', color: '#111827',
                            }}>
                                Danh sách nguyên liệu <span style={{ color: '#EF4444' }}>*</span>
                                <span style={{
                                    marginLeft: '8px', fontSize: '12px',
                                    color: '#6B7280', fontWeight: '400',
                                }}>
                                    ({rows.length} nguyên liệu)
                                </span>
                            </label>

                            {rows.length === 0 && (
                                <div style={{
                                    padding: '24px', textAlign: 'center',
                                    color: '#6B7280', fontSize: '14px',
                                    border: '1px dashed #D1D5DB', borderRadius: '12px',
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
                                        background: '#F9FAFB',
                                        border: '1px solid #E5E7EB',
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
                                        <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0 0' }}>
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
                                                color: '#6B7280',
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
                                                background: '#FFFFFF',
                                                borderRadius: '8px',
                                                border: '1px solid #D1D5DB',
                                                color: '#111827',
                                                fontSize: '14px',
                                                outline: 'none',
                                                transition: 'all 0.2s ease',
                                                boxSizing: 'border-box',
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = '#F97316';
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = '#D1D5DB';
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
                                            border: '1px solid #D1D5DB',
                                            background: 'transparent',
                                            color: '#6B7280', cursor: 'pointer',
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
                                            e.currentTarget.style.borderColor = '#D1D5DB';
                                            e.currentTarget.style.color = '#6B7280';
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
                                fontSize: '14px', transition: 'all 0.2s',
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