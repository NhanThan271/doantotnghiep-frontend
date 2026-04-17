import React, { useState, useEffect } from 'react';
import { X, Upload, Package, DollarSign, Hash, FolderOpen } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

export default function AddProductForm({ closeForm, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        categoryId: '',
        image: null
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (err) {
            console.error('Lỗi khi lấy danh sách categories:', err);
        }
    };

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

            setFormData(prev => ({ ...prev, image: file }));

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Vui lòng nhập tên sản phẩm');
            return false;
        }
        if (!formData.price || formData.price <= 0) {
            setError('Vui lòng nhập giá sản phẩm hợp lệ');
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
            formDataToSend.append('price', formData.price);

            if (formData.categoryId) {
                formDataToSend.append('categoryId', formData.categoryId);
            }

            if (formData.image) {
                formDataToSend.append('image', formData.image);
            }

            const response = await fetch(`${API_BASE_URL}/api/foods`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataToSend
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Thêm sản phẩm thất bại');
            }

            const newProduct = await response.json();
            console.log('Thêm sản phẩm thành công:', newProduct);

            alert('Thêm sản phẩm thành công!');

            if (onSave) {
                onSave(newProduct, 'product');
            }

            closeForm();
        } catch (err) {
            console.error('Lỗi khi thêm sản phẩm:', err);
            setError(err.message || 'Không thể thêm sản phẩm. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, image: null }));
        setImagePreview(null);
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
                                Thêm sản phẩm mới
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: '#B8B8B8',
                                margin: '4px 0 0 0'
                            }}>
                                Điền thông tin sản phẩm
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

                        {/* Image Upload */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#FFFFFF'
                            }}>
                                Hình ảnh sản phẩm
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
                                            border: '1px solid #2A2A2A'
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
                                </div>
                            ) : (
                                <label style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '200px',
                                    border: '2px dashed #2A2A2A',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: '#0F0F0F'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = '#D4AF37';
                                        e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = '#2A2A2A';
                                        e.currentTarget.style.background = '#0F0F0F';
                                    }}
                                >
                                    <Upload size={32} color="#B8B8B8" />
                                    <p style={{
                                        marginTop: '12px',
                                        fontSize: '14px',
                                        color: '#B8B8B8'
                                    }}>
                                        Click để chọn ảnh
                                    </p>
                                    <p style={{
                                        fontSize: '12px',
                                        color: '#B8B8B8',
                                        marginTop: '4px'
                                    }}>
                                        PNG, JPG (max 5MB)
                                    </p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            )}
                        </div>

                        {/* Product Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#FFFFFF'
                            }}>
                                Tên sản phẩm <span style={{ color: '#EF4444' }}>*</span>
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
                                    placeholder="Nhập tên sản phẩm"
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

                        {/* Category */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#FFFFFF'
                            }}>
                                Danh mục
                            </label>
                            <div style={{ position: 'relative' }}>
                                <FolderOpen
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
                                    value={formData.categoryId}
                                    onChange={(e) => handleChange('categoryId', e.target.value)}
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
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Price columns */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '16px',
                            marginBottom: '20px'
                        }}>
                            {/* Price */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#FFFFFF'
                                }}>
                                    Giá sản phẩm <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <DollarSign
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
                                        placeholder="0"
                                        value={formData.price}
                                        onChange={(e) => handleChange('price', e.target.value)}
                                        min="0"
                                        step="1000"
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px 12px 44px',
                                            background: '#0F0F0F',
                                            borderRadius: '12px',
                                            border: '1px solid #2A2A2A',
                                            color: '#FFFFFF',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                        required
                                    />
                                </div>
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
                            {loading ? 'Đang xử lý...' : 'Thêm sản phẩm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}