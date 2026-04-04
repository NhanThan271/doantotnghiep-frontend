import React, { useState, useEffect } from 'react';
import { X, Upload, Package, DollarSign, Hash, FolderOpen } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

export default function EditProductForm({ product, closeForm, onSave, refreshCallback }) {
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        stockQuantity: '',
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

        if (product) {
            setFormData({
                name: product.name || '',
                price: product.price || '',
                stockQuantity: product.stockQuantity || 0,
                categoryId: product.category?.id || '',
                image: null
            });
            if (product.imageUrl) {
                setImagePreview(`${API_BASE_URL}/${product.imageUrl}`);
            }
        }
    }, [product]);

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/employee/categories`, {
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
        if (formData.stockQuantity === '' || formData.stockQuantity < 0) {
            setError('Vui lòng nhập số lượng hợp lệ');
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
            formDataToSend.append('stockQuantity', formData.stockQuantity);

            if (formData.categoryId) {
                formDataToSend.append('categoryId', formData.categoryId);
            }

            if (formData.image) {
                formDataToSend.append('image', formData.image);
            }

            const response = await fetch(`${API_BASE_URL}/api/foods/${product.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataToSend
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Cập nhật sản phẩm thất bại');
            }

            const updatedProduct = await response.json();
            console.log('✅ Cập nhật sản phẩm thành công:', updatedProduct);

            alert('Cập nhật sản phẩm thành công!');

            // ✅ GỌI CALLBACK ĐỂ REFRESH DANH SÁCH
            if (refreshCallback && typeof refreshCallback === 'function') {
                console.log('🔄 Đang refresh danh sách sản phẩm...');
                refreshCallback();
            }

            // Callback cũ (nếu có)
            if (onSave) {
                onSave(updatedProduct, 'product');
            }

            closeForm();
        } catch (err) {
            console.error('❌ Lỗi khi cập nhật sản phẩm:', err);
            setError(err.message || 'Không thể cập nhật sản phẩm. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, image: null }));
        if (product.imageUrl) {
            setImagePreview(`${API_BASE_URL}/${product.imageUrl}`);
        } else {
            setImagePreview(null);
        }
    };

    return (
        <div className={styles['modal-backdrop']} onClick={closeForm}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
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
                            <Package size={20} color="#3B82F6" />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                margin: 0,
                                color: 'var(--color-text-primary)'
                            }}>
                                Sửa sản phẩm
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--color-text-secondary)',
                                margin: '4px 0 0 0'
                            }}>
                                Cập nhật thông tin sản phẩm
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeForm}
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

                <form onSubmit={handleSubmit}>
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

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            Hình ảnh sản phẩm <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: '400' }}>(Tùy chọn)</span>
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
                                {formData.image && (
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
                                )}
                                <label style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    right: '8px',
                                    padding: '8px 12px',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.85)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                                    }}
                                >
                                    <Upload size={14} />
                                    Đổi ảnh
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
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
                            }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = '#3B82F6';
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                    e.currentTarget.style.background = 'var(--color-bg-dark)';
                                }}
                            >
                                <Upload size={32} color="var(--color-text-secondary)" />
                                <p style={{
                                    marginTop: '12px',
                                    fontSize: '14px',
                                    color: 'var(--color-text-secondary)'
                                }}>
                                    Click để chọn ảnh mới
                                </p>
                                <p style={{
                                    fontSize: '12px',
                                    color: 'var(--color-text-secondary)',
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

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
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
                                    color: 'var(--color-text-secondary)'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Nhập tên sản phẩm"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                style={{
                                    paddingLeft: '44px'
                                }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
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
                                    color: 'var(--color-text-secondary)',
                                    pointerEvents: 'none',
                                    zIndex: 1
                                }}
                            />
                            <select
                                value={formData.categoryId}
                                onChange={(e) => handleChange('categoryId', e.target.value)}
                                style={{
                                    paddingLeft: '44px',
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

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '20px'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--color-text-primary)'
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
                                        color: 'var(--color-text-secondary)'
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
                                        paddingLeft: '44px'
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--color-text-primary)'
                            }}>
                                Số lượng <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Hash
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
                                    type="number"
                                    placeholder="0"
                                    value={formData.stockQuantity}
                                    onChange={(e) => handleChange('stockQuantity', e.target.value)}
                                    min="0"
                                    style={{
                                        paddingLeft: '44px'
                                    }}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button
                            type="button"
                            onClick={closeForm}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'transparent',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s'
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
                            type="submit"
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
                </form>
            </div>
        </div>
    );
}