import React, { useState, useEffect } from 'react';
import { X, Tag, Percent, Calendar, Package } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

export default function EditPromotionForm({ promotion, closeForm, onSave, refreshCallback }) {
    const [formData, setFormData] = useState({
        name: '',
        discountPercentage: '',
        discountAmount: '',
        startDate: '',
        endDate: '',
        isActive: true,
        foodIds: []
    });
    const [foods, setFoods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [discountType, setDiscountType] = useState('percentage');

    const API_BASE_URL = 'http://localhost:8080';

    // Load dữ liệu khuyến mãi khi component mount
    useEffect(() => {
        if (promotion) {
            // Xác định loại giảm giá
            const type = promotion.discountPercentage ? 'percentage' : 'amount';
            setDiscountType(type);

            setFormData({
                name: promotion.name || '',
                discountPercentage: promotion.discountPercentage || '',
                discountAmount: promotion.discountAmount || '',
                startDate: promotion.startDate || '',
                endDate: promotion.endDate || '',
                isActive: promotion.isActive !== undefined ? promotion.isActive : true,
                foodIds: promotion.foodIds || []
            });
        }
        fetchFoods();
    }, [promotion]);

    const fetchFoods = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/foods`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setFoods(data);
            }
        } catch (err) {
            console.error('Lỗi khi tải món ăn:', err);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleFoodToggle = (foodId) => {
        setFormData(prev => {
            const foodIds = prev.foodIds.includes(foodId)
                ? prev.foodIds.filter(id => id !== foodId)
                : [...prev.foodIds, foodId];
            return { ...prev, foodIds };
        });
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Vui lòng nhập tên khuyến mãi');
            return false;
        }

        if (discountType === 'percentage') {
            if (!formData.discountPercentage || formData.discountPercentage <= 0 || formData.discountPercentage > 100) {
                setError('Vui lòng nhập phần trăm giảm giá hợp lệ (1-100)');
                return false;
            }
        } else {
            if (!formData.discountAmount || formData.discountAmount <= 0) {
                setError('Vui lòng nhập số tiền giảm giá hợp lệ');
                return false;
            }
        }

        if (!formData.startDate) {
            setError('Vui lòng chọn ngày bắt đầu');
            return false;
        }

        if (!formData.endDate) {
            setError('Vui lòng chọn ngày kết thúc');
            return false;
        }

        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            setError('Ngày kết thúc phải sau ngày bắt đầu');
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

            // Chuẩn bị dữ liệu gửi lên
            const promotionData = {
                name: formData.name.trim(),
                discountPercentage: discountType === 'percentage' ? parseFloat(formData.discountPercentage) : null,
                discountAmount: discountType === 'amount' ? parseFloat(formData.discountAmount) : null,
                startDate: formData.startDate,
                endDate: formData.endDate,
                isActive: formData.isActive,
                foodIds: formData.foodIds
            };

            const response = await fetch(`${API_BASE_URL}/api/customer/promotions/${promotion.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(promotionData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Cập nhật khuyến mãi thất bại');
            }

            const updatedPromotion = await response.json();
            console.log('Cập nhật khuyến mãi thành công:', updatedPromotion);

            alert('Cập nhật khuyến mãi thành công!');

            // ✅ GỌI CALLBACK ĐỂ REFRESH DANH SÁCH
            if (refreshCallback && typeof refreshCallback === 'function') {
                console.log('🔄 Đang refresh danh sách sản phẩm...');
                refreshCallback();
            }

            if (onSave) {
                onSave(updatedPromotion, 'promotion');
            }

            closeForm();
        } catch (err) {
            console.error('Lỗi khi cập nhật khuyến mãi:', err);
            setError(err.message || 'Không thể cập nhật khuyến mãi. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles['modal-backdrop']} onClick={closeForm}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--color-bg)',
                    paddingBottom: '16px',
                    zIndex: 10
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
                            <Tag size={20} color="#3B82F6" />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                margin: 0,
                                color: 'var(--color-text-primary)'
                            }}>
                                Sửa khuyến mãi
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--color-text-secondary)',
                                margin: '4px 0 0 0'
                            }}>
                                Cập nhật thông tin khuyến mãi
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

                    {/* Promotion Name */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            Tên khuyến mãi <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Tag
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
                                placeholder="Nhập tên khuyến mãi"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                style={{ paddingLeft: '44px' }}
                                required
                            />
                        </div>
                    </div>

                    {/* Discount Type Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            Loại giảm giá <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{
                                flex: 1,
                                padding: '12px',
                                border: `2px solid ${discountType === 'percentage' ? '#3B82F6' : 'var(--color-border)'}`,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: discountType === 'percentage' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="radio"
                                    name="discountType"
                                    value="percentage"
                                    checked={discountType === 'percentage'}
                                    onChange={(e) => setDiscountType(e.target.value)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <Percent size={16} color={discountType === 'percentage' ? '#3B82F6' : 'var(--color-text-secondary)'} />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Theo phần trăm (%)</span>
                            </label>
                            <label style={{
                                flex: 1,
                                padding: '12px',
                                border: `2px solid ${discountType === 'amount' ? '#3B82F6' : 'var(--color-border)'}`,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: discountType === 'amount' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="radio"
                                    name="discountType"
                                    value="amount"
                                    checked={discountType === 'amount'}
                                    onChange={(e) => setDiscountType(e.target.value)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '18px', fontWeight: '600' }}>₫</span>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Theo số tiền</span>
                            </label>
                        </div>
                    </div>

                    {/* Discount Value */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            {discountType === 'percentage' ? 'Phần trăm giảm giá' : 'Số tiền giảm'} <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            {discountType === 'percentage' ? (
                                <Percent
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-secondary)'
                                    }}
                                />
                            ) : (
                                <span style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-secondary)',
                                    fontSize: '18px',
                                    fontWeight: '600'
                                }}>₫</span>
                            )}
                            <input
                                type="number"
                                placeholder={discountType === 'percentage' ? '0-100' : '0'}
                                value={discountType === 'percentage' ? formData.discountPercentage : formData.discountAmount}
                                onChange={(e) => handleChange(
                                    discountType === 'percentage' ? 'discountPercentage' : 'discountAmount',
                                    e.target.value
                                )}
                                min="0"
                                max={discountType === 'percentage' ? 100 : undefined}
                                step={discountType === 'percentage' ? '0.1' : '1000'}
                                style={{ paddingLeft: '44px' }}
                                required
                            />
                        </div>
                    </div>

                    {/* Date Range - 2 columns */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '20px'
                    }}>
                        {/* Start Date */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--color-text-primary)'
                            }}>
                                Ngày bắt đầu <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Calendar
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-secondary)',
                                        pointerEvents: 'none'
                                    }}
                                />
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => handleChange('startDate', e.target.value)}
                                    style={{ paddingLeft: '44px' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* End Date */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--color-text-primary)'
                            }}>
                                Ngày kết thúc <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Calendar
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-secondary)',
                                        pointerEvents: 'none'
                                    }}
                                />
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => handleChange('endDate', e.target.value)}
                                    style={{ paddingLeft: '44px' }}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active Status */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '12px',
                            border: '1px solid var(--color-border)',
                            borderRadius: '10px',
                            background: formData.isActive ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                        }}>
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => handleChange('isActive', e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                Kích hoạt
                            </span>
                        </label>
                    </div>

                    {/* food Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            <Package size={16} style={{ display: 'inline', marginRight: '6px' }} />
                            Áp dụng cho món ăn
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: '400', marginLeft: '8px' }}>
                                ({formData.foodIds.length} đã chọn)
                            </span>
                        </label>
                        <div style={{
                            maxHeight: '250px',
                            overflowY: 'auto',
                            border: '1px solid var(--color-border)',
                            borderRadius: '10px',
                            padding: '12px'
                        }}>
                            {foods.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                                    Không có món ăn nào
                                </p>
                            ) : (
                                foods.map(food => (
                                    <label
                                        key={food.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px',
                                            cursor: 'pointer',
                                            borderRadius: '8px',
                                            marginBottom: '8px',
                                            background: formData.foodIds.includes(food.id)
                                                ? 'rgba(59, 130, 246, 0.05)'
                                                : 'transparent',
                                            border: `1px solid ${formData.foodIds.includes(food.id)
                                                ? '#3B82F6'
                                                : 'transparent'}`,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!formData.foodIds.includes(food.id)) {
                                                e.currentTarget.style.background = 'var(--color-hover)';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!formData.foodIds.includes(food.id)) {
                                                e.currentTarget.style.background = 'transparent';
                                            }
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.foodIds.includes(food.id)}
                                            onChange={() => handleFoodToggle(food.id)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        {food.imageUrl && (
                                            <img
                                                src={`${API_BASE_URL}/${food.imageUrl}`}
                                                alt={food.name}
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    objectFit: 'cover',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--color-border)'
                                                }}
                                            />
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                                                {food.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                {food.price?.toLocaleString('vi-VN')}₫
                                            </div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Buttons */}
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