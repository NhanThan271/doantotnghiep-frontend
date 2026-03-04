import React, { useState, useEffect } from 'react';
import { X, Package, Ruler } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

export default function EditIngredientForm({ closeForm, onSave, ingredientData }) {
    const [formData, setFormData] = useState({
        name: '',
        unit: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        if (ingredientData) {
            setFormData({
                name: ingredientData.name || '',
                unit: ingredientData.unit || ''
            });
        }
    }, [ingredientData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Vui lòng nhập tên nguyên liệu');
            return false;
        }
        if (!formData.unit.trim()) {
            setError('Vui lòng nhập đơn vị tính');
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

            const response = await fetch(`${API_BASE_URL}/api/ingredients/${ingredientData.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    unit: formData.unit.trim()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Cập nhật nguyên liệu thất bại');
            }

            const updatedIngredient = await response.json();
            console.log('Cập nhật nguyên liệu thành công:', updatedIngredient);

            alert('Cập nhật nguyên liệu thành công!');

            if (onSave) {
                onSave(updatedIngredient);
            }

            closeForm();
        } catch (err) {
            console.error('Lỗi khi cập nhật nguyên liệu:', err);
            setError(err.message || 'Không thể cập nhật nguyên liệu. Vui lòng thử lại!');
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
                                Chỉnh sửa nguyên liệu
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: '#B8B8B8',
                                margin: '4px 0 0 0'
                            }}>
                                Cập nhật thông tin nguyên liệu
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
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <p style={{
                                fontSize: '13px',
                                color: '#D4AF37',
                                margin: 0
                            }}>
                                Đang chỉnh sửa: <strong>{ingredientData?.name}</strong>
                            </p>
                        </div>

                        {/* Ingredient Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#FFFFFF'
                            }}>
                                Tên nguyên liệu <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Package
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
                                    type="text"
                                    placeholder="Nhập tên nguyên liệu"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
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
                        </div>

                        {/* Unit */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#FFFFFF'
                            }}>
                                Đơn vị tính <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Ruler
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
                                    type="text"
                                    placeholder="Ví dụ: kg, lít, gói..."
                                    value={formData.unit}
                                    onChange={(e) => handleChange('unit', e.target.value)}
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
                            {loading ? 'Đang xử lý...' : 'Cập nhật'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}