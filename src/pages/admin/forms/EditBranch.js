import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, FileText } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

export default function EditBranch({ branch, onClose, closeForm, onSuccess, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        isActive: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        if (branch) {
            setFormData({
                name: branch.name || '',
                address: branch.address || '',
                phone: branch.phone || '',
                isActive: branch.isActive !== undefined ? branch.isActive : true
            });
        }
    }, [branch]);

    const handleClose = () => {
        if (onClose) onClose();
        if (closeForm) closeForm();
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Vui lòng nhập tên chi nhánh');
            return false;
        }
        if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone.trim())) {
            setError('Số điện thoại không hợp lệ (10-11 số)');
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
            const dataToSend = {
                name: formData.name.trim(),
                address: formData.address.trim() || null,
                phone: formData.phone.trim() || null,
                isActive: formData.isActive
            };

            const response = await fetch(`${API_BASE_URL}/api/branches/${branch.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Cập nhật chi nhánh thất bại');
            }

            const updatedBranch = await response.json();
            alert('Cập nhật chi nhánh thành công!');
            if (onSuccess) onSuccess(updatedBranch);
            if (onSave) onSave(updatedBranch, 'branch');
            handleClose();
        } catch (err) {
            console.error('Lỗi khi cập nhật chi nhánh:', err);
            setError(err.message || 'Không thể cập nhật chi nhánh. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles['modal-backdrop']} onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
        }}>
            <div className={styles.modal} style={{
                maxWidth: '900px',
                height: '600px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MapPin size={20} color="#22C55E" />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                margin: 0,
                                color: 'var(--color-text-primary)'
                            }}>
                                Chỉnh sửa chi nhánh
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--color-text-secondary)',
                                margin: '4px 0 0 0'
                            }}>
                                Cập nhật thông tin chi nhánh
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            background: 'transparent',
                            color: 'var(--color-text-secondary)',
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
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

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

                {/* Branch Name */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--color-text-primary)'
                    }}>
                        Tên chi nhánh <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <MapPin
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-secondary)'
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Nhập tên chi nhánh"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            maxLength={100}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                </div>

                {/* Address */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--color-text-primary)'
                    }}>
                        Địa chỉ
                    </label>
                    <div style={{ position: 'relative' }}>
                        <FileText
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '14px',
                                top: '14px',
                                color: 'var(--color-text-secondary)'
                            }}
                        />
                        <textarea
                            placeholder="Nhập địa chỉ chi nhánh"
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            rows={3}
                            style={{
                                paddingLeft: '44px',
                                resize: 'vertical',
                                minHeight: '80px'
                            }}
                        />
                    </div>
                </div>

                {/* Phone */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--color-text-primary)'
                    }}>
                        Số điện thoại
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Phone
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-secondary)'
                            }}
                        />
                        <input
                            type="tel"
                            placeholder="Nhập số điện thoại"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            maxLength={11}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                </div>

                {/* Status */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '12px',
                        background: 'var(--color-bg-dark)',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)'
                    }}>
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => handleChange('isActive', e.target.checked)}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: '#3B82F6'
                            }}
                        />
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                                Chi nhánh hoạt động
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                Chi nhánh này đang {formData.isActive ? 'hoạt động' : 'tạm ngừng'}
                            </div>
                        </div>
                    </label>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'transparent',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--color-hover)';
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: loading
                                ? 'var(--color-text-secondary)'
                                : 'linear-gradient(135deg, #22C55E, #16A34A)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            transition: 'transform 0.2s',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Đang xử lý...' : 'Cập nhật'}
                    </button>
                </div>
            </div>
        </div>
    );
}