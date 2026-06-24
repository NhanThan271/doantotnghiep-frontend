import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';
import { showToast } from '../../../hooks/useToast';

export default function AddIngredientForm({ closeForm, onSave }) {
    const [ingredients, setIngredients] = useState([
        { id: Date.now(), name: '', unit: '' }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [duplicateIds, setDuplicateIds] = useState(new Set());

    const API_BASE_URL = '';

    const addRow = () => {
        setIngredients(prev => [...prev, { id: Date.now(), name: '', unit: '' }]);
    };

    const removeRow = (id) => {
        if (ingredients.length === 1) return;
        setIngredients(prev => prev.filter(item => item.id !== id));
    };

    const handleChange = (id, field, value) => {
        const updated = ingredients.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        setIngredients(updated);
        setError('');
        setError('');
        if (field === 'name') {
            const names = updated.map(i => ({ id: i.id, name: i.name.trim().toLowerCase() }));
            const dupIds = new Set();
            names.forEach((item, index) => {
                if (item.name && names.some((other, i) => i !== index && other.name === item.name)) {
                    dupIds.add(item.id);
                }
            });
            setDuplicateIds(dupIds);
        }
    };

    const validateForm = () => {
        for (const item of ingredients) {
            if (!item.name.trim()) {
                showToast('error', 'Thiếu thông tin', 'Vui lòng nhập đầy đủ tên nguyên liệu');
                return false;
            }
            if (!item.unit.trim()) {
                showToast('error', 'Thiếu thông tin', 'Vui lòng nhập đầy đủ đơn vị tính');
                return false;
            }
        }
        const names = ingredients.map(i => i.name.trim().toLowerCase());
        const hasDuplicate = names.some((name, index) => names.indexOf(name) !== index);
        if (hasDuplicate) {
            showToast('error', 'Trùng tên', 'Có nguyên liệu trùng tên trong danh sách, vui lòng kiểm tra lại');
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

            const existingRes = await fetch(`${API_BASE_URL}/api/ingredients`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const existingList = existingRes.ok ? await existingRes.json() : [];
            const existingNames = existingList.map(i => i.name.trim().toLowerCase());

            const duplicates = ingredients
                .map(i => i.name.trim())
                .filter(name => existingNames.includes(name.toLowerCase()));

            if (duplicates.length > 0) {
                showToast(
                    'error',
                    'Trùng nguyên liệu',
                    `Các nguyên liệu sau đã tồn tại: ${duplicates.join(', ')}`
                );
                setLoading(false);
                return;
            }

            const results = await Promise.all(
                ingredients.map(item =>
                    fetch(`${API_BASE_URL}/api/ingredients`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: item.name.trim(),
                            unit: item.unit.trim()
                        })
                    }).then(async res => {
                        if (!res.ok) {
                            const text = await res.text();
                            throw new Error(text || `Thêm "${item.name}" thất bại`);
                        }
                        return res.json();
                    })
                )
            );

            showToast('success', 'Thành công', `Thêm thành công ${results.length} nguyên liệu!`);
            if (onSave) onSave(results);
            closeForm();
        } catch (err) {
            showToast('error', 'Lỗi', err.message || 'Có lỗi xảy ra. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles['modal-backdrop']} onClick={closeForm}>
            <div className={styles['modal-container']} onClick={(e) => e.stopPropagation()}>
                {/* Header - Fixed */}
                <div className={styles['modal-header']}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'rgba(212, 175, 55, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Package size={20} color="#D4AF37" />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                margin: 0,
                                color: '#FFFFFF'
                            }}>
                                Thêm nguyên liệu mới
                            </h2>
                            <p style={{
                                fontSize: '14px',
                                color: '#B8B8B8',
                                margin: '4px 0 0 0'
                            }}>
                                Điền thông tin nguyên liệu
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



                        {/* Header cột */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px 40px',
                            gap: '8px',
                            marginBottom: '8px',
                            padding: '0 4px'
                        }}>
                            <label style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>
                                Tên nguyên liệu <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <label style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>
                                Đơn vị <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div />
                        </div>

                        {/* Danh sách dòng */}
                        {ingredients.map((item, index) => (
                            <div key={item.id} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 140px 40px',
                                gap: '8px',
                                marginBottom: '10px',
                                alignItems: 'center'
                            }}>
                                <input
                                    type="text"
                                    placeholder={`Nguyên liệu ${index + 1}`}
                                    value={item.name}
                                    onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                                    style={{
                                        padding: '10px 14px',
                                        background: '#0F0F0F',
                                        borderRadius: '10px',
                                        border: '1px solid #2A2A2A',
                                        color: '#FFFFFF',
                                        fontSize: '14px',
                                        outline: 'none',
                                        border: duplicateIds.has(item.id)
                                            ? '1px solid #EF4444'
                                            : '1px solid #2A2A2A',
                                        boxShadow: duplicateIds.has(item.id)
                                            ? '0 0 0 3px rgba(239,68,68,0.15)'
                                            : 'none',
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="kg, lít, gói..."
                                    value={item.unit}
                                    onChange={(e) => handleChange(item.id, 'unit', e.target.value)}
                                    style={{
                                        padding: '10px 14px',
                                        background: '#0F0F0F',
                                        borderRadius: '10px',
                                        border: '1px solid #2A2A2A',
                                        color: '#FFFFFF',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeRow(item.id)}
                                    disabled={ingredients.length === 1}
                                    style={{
                                        width: '36px', height: '36px',
                                        borderRadius: '8px',
                                        border: '1px solid #2A2A2A',
                                        background: 'transparent',
                                        color: ingredients.length === 1 ? '#444' : '#EF4444',
                                        cursor: ingredients.length === 1 ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}

                        {/* Nút thêm dòng */}
                        <button
                            type="button"
                            onClick={addRow}
                            style={{
                                width: '100%',
                                padding: '10px',
                                marginTop: '4px',
                                background: 'rgba(212, 175, 55, 0.08)',
                                border: '1px dashed #D4AF37',
                                borderRadius: '10px',
                                color: '#D4AF37',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            + Thêm dòng
                        </button>
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
                                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
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
                                    : 'linear-gradient(135deg, #D4AF37, #B8941F)',
                                color: '#000',
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
                            {loading ? 'Đang xử lý...' : `Thêm ${ingredients.length} nguyên liệu`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}