import React, { useState, useEffect } from 'react';
import { X, ChefHat, Package, Beaker, Hash } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

export default function EditRecipeForm({ closeForm, onSave, recipeData }) {
    const [formData, setFormData] = useState({
        quantityRequired: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        if (recipeData) {
            setFormData({
                quantityRequired: recipeData.quantityRequired || ''
            });
        }
    }, [recipeData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validateForm = () => {
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
                `${API_BASE_URL}/api/recipes/${recipeData.id}?quantityRequired=${formData.quantityRequired}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Cập nhật công thức thất bại');
            }

            const updatedRecipe = await response.json();
            console.log('Cập nhật công thức thành công:', updatedRecipe);

            alert('Cập nhật công thức thành công!');

            if (onSave) {
                onSave(updatedRecipe);
            }

            closeForm();
        } catch (err) {
            console.error('Lỗi khi cập nhật công thức:', err);
            setError(err.message || 'Không thể cập nhật công thức. Vui lòng thử lại!');
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
                                Chỉnh sửa công thức
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: '#B8B8B8',
                                margin: '4px 0 0 0'
                            }}>
                                Cập nhật định lượng nguyên liệu
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

                        {/* Recipe Info */}
                        <div style={{
                            padding: '16px',
                            background: 'rgba(249, 115, 22, 0.1)',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            borderRadius: '12px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '12px'
                            }}>
                                <Package size={20} color="#F97316" />
                                <div>
                                    <p style={{
                                        fontSize: '11px',
                                        color: '#B8B8B8',
                                        margin: 0,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Sản phẩm
                                    </p>
                                    <p style={{
                                        fontSize: '16px',
                                        color: '#F97316',
                                        margin: 0,
                                        fontWeight: '700'
                                    }}>
                                        {recipeData?.product?.name || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div style={{
                                height: '1px',
                                background: 'rgba(249, 115, 22, 0.2)',
                                margin: '12px 0'
                            }} />
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <Beaker size={20} color="#8B5CF6" />
                                <div>
                                    <p style={{
                                        fontSize: '11px',
                                        color: '#B8B8B8',
                                        margin: 0,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Nguyên liệu
                                    </p>
                                    <p style={{
                                        fontSize: '16px',
                                        color: '#8B5CF6',
                                        margin: 0,
                                        fontWeight: '700'
                                    }}>
                                        {recipeData?.ingredient?.name || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Info box */}
                        <div style={{
                            padding: '12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <p style={{
                                fontSize: '13px',
                                color: '#3B82F6',
                                margin: 0
                            }}>
                                💡 <strong>Lưu ý:</strong> Việc thay đổi định lượng sẽ ảnh hưởng đến toàn bộ hệ thống.
                                Hãy đảm bảo bạn đã kiểm tra kỹ trước khi lưu.
                            </p>
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
                                Định lượng mới <span style={{ color: '#EF4444' }}>*</span>
                                <span style={{
                                    marginLeft: '8px',
                                    fontSize: '12px',
                                    color: '#B8B8B8',
                                    fontWeight: '400'
                                }}>
                                    (Đơn vị: {recipeData?.ingredient?.unit || 'N/A'})
                                </span>
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
                            <div style={{
                                marginTop: '12px',
                                padding: '12px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: '8px'
                            }}>
                                <p style={{
                                    fontSize: '12px',
                                    color: '#10B981',
                                    margin: 0
                                }}>
                                    <strong>Định lượng hiện tại:</strong> {recipeData?.ingredient?.unit}
                                </p>
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
                            {loading ? 'Đang xử lý...' : 'Cập nhật công thức'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}