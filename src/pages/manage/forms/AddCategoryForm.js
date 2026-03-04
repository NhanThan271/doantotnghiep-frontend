import React, { useState } from 'react';
import { X, FolderOpen, FileText, Upload } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

export default function AddCategory({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        image: null
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = 'http://localhost:8080';

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Kích thước ảnh không được vượt quá 5MB');
                return;
            }
            if (!file.type.startsWith('image/')) {
                setError('Vui lòng chọn file ảnh');
                return;
            }

            setFormData(prev => ({ ...prev, image: file, imageUrl: '' }));

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, image: null, imageUrl: '' }));
        setImagePreview(null);
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Vui lòng nhập tên danh mục');
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
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name.trim());
            formDataToSend.append('description', formData.description.trim());

            if (formData.image) {
                formDataToSend.append('image', formData.image);
            } else if (formData.imageUrl.trim()) {
                formDataToSend.append('imageUrl', formData.imageUrl.trim());
            }

            const response = await fetch(`${API_BASE_URL}/api/employee/categories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataToSend
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Thêm danh mục thất bại');
            }

            const newCategory = await response.json();
            alert('Thêm danh mục thành công!');
            if (onSuccess) onSuccess(newCategory);
            onClose();
        } catch (err) {
            console.error('Lỗi khi thêm danh mục:', err);
            setError(err.message || 'Không thể thêm danh mục. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles['modal-backdrop']} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
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
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FolderOpen size={20} color="#3B82F6" />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                margin: 0,
                                color: 'var(--color-text-primary)'
                            }}>
                                Thêm danh mục
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--color-text-secondary)',
                                margin: '4px 0 0 0'
                            }}>
                                Nhập thông tin danh mục mới
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
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

                {/* Image Upload */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--color-text-primary)'
                    }}>
                        Hình ảnh danh mục <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: '400' }}>(Tùy chọn)</span>
                    </label>

                    {imagePreview ? (
                        <div style={{ position: 'relative' }}>
                            <img
                                src={imagePreview}
                                alt="Preview"
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    objectFit: 'cover',
                                    borderRadius: '12px',
                                    border: '1px solid var(--color-border)'
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'rgba(239, 68, 68, 0.9)',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                            <label style={{
                                position: 'absolute',
                                bottom: '8px',
                                right: '8px',
                                padding: '8px 12px',
                                background: 'rgba(0, 0, 0, 0.7)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <Upload size={14} />
                                Đổi ảnh
                                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                            </label>
                        </div>
                    ) : (
                        <label style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '200px',
                            border: '2px dashed var(--color-border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: 'var(--color-bg-dark)'
                        }}>
                            <Upload size={32} color="var(--color-text-secondary)" />
                            <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                Click để chọn ảnh
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                PNG, JPG (max 5MB)
                            </p>
                            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                        </label>
                    )}
                </div>

                {/* Category Name */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--color-text-primary)'
                    }}>
                        Tên danh mục <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <FolderOpen
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
                            placeholder="Nhập tên danh mục"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            maxLength={50}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--color-text-primary)'
                    }}>
                        Mô tả
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
                            placeholder="Nhập mô tả danh mục"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            rows={4}
                            style={{
                                paddingLeft: '44px',
                                resize: 'vertical',
                                minHeight: '100px'
                            }}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                        type="button"
                        onClick={onClose}
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
                                : 'linear-gradient(135deg, #3B82F6, #2563EB)',
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
                        {loading ? 'Đang xử lý...' : 'Thêm danh mục'}
                    </button>
                </div>
            </div>
        </div>
    );
}
