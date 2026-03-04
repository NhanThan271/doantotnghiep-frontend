import React, { useEffect, useState } from 'react';
import {
    Tag,
    Calendar,
    Percent,
    DollarSign,
    Edit2,
    Trash2,
    X,
    Save,
    Package,
    Search,
    AlertCircle
} from 'lucide-react';

export default function PromotionManagement() {
    const [promotions, setPromotions] = useState([]);
    const [products, setProducts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        discountPercentage: '',
        discountAmount: '',
        startDate: '',
        endDate: '',
        isActive: true,
        productIds: [],
        branchIds: []
    });

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        fetchPromotions();
        fetchProducts();
        fetchBranches();
    }, []);

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/promotions/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            const processedData = data.map(promotion => ({
                ...promotion,
                productIds: promotion.productIds || (promotion.products?.map(p => p.id) || [])
            }));
            setPromotions(Array.isArray(processedData) ? processedData : []);
        } catch (error) {
            console.error('Error fetching promotions:', error);
            setPromotions([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/products`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setBranches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const handleOpenAdd = () => {
        setEditingPromotion(null);
        setFormData({
            name: '',
            description: '',
            discountPercentage: '',
            discountAmount: '',
            startDate: '',
            endDate: '',
            isActive: true,
            productIds: [],
            branchIds: []
        });
        setShowModal(true);
    };

    const handleOpenEdit = (promotion) => {
        setEditingPromotion(promotion);
        setFormData({
            name: promotion.name || '',
            description: promotion.description || '',
            discountPercentage: promotion.discountPercentage || '',
            discountAmount: promotion.discountAmount || '',
            startDate: promotion.startDate || '',
            endDate: promotion.endDate || '',
            isActive: promotion.isActive ?? true,
            productIds: promotion.productIds || [],
            branchIds: promotion.branchIds || []
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name.trim()) {
            alert('Vui lòng nhập tên chương trình khuyến mãi');
            return;
        }

        if (!formData.discountPercentage && !formData.discountAmount) {
            alert('Vui lòng nhập giá trị giảm giá (% hoặc số tiền)');
            return;
        }

        if (!formData.startDate || !formData.endDate) {
            alert('Vui lòng chọn thời gian áp dụng');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            console.log('🔑 Token exists:', !!token);
            console.log('🔑 Token length:', token?.length);
            console.log('🔑 Token preview:', token?.substring(0, 50) + '...');

            const payload = {
                name: formData.name,
                description: formData.description,
                discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : null,
                discountAmount: formData.discountAmount ? parseFloat(formData.discountAmount) : null,
                startDate: formData.startDate,
                endDate: formData.endDate,
                isActive: formData.isActive,
                productIds: formData.productIds || [],
                branchIds: formData.branchIds || []
            };

            console.log('📤 Payload gửi lên:', payload);

            const url = editingPromotion
                ? `${API_BASE_URL}/api/promotions/${editingPromotion.id}`
                : `${API_BASE_URL}/api/promotions`;

            const method = editingPromotion ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('❌ Error response:', errorData);
                throw new Error(`Failed to save promotion: ${errorData}`);
            }

            const result = await response.json();
            console.log('✅ Success:', result);

            alert(editingPromotion ? 'Cập nhật khuyến mãi thành công!' : 'Tạo khuyến mãi thành công!');
            setShowModal(false);
            fetchPromotions();
        } catch (error) {
            console.error('Error saving promotion:', error);
            alert('Không thể lưu khuyến mãi. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa chương trình khuyến mãi này?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/promotions/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Delete failed');

            alert('Xóa khuyến mãi thành công!');
            fetchPromotions();
        } catch (error) {
            console.error('Error deleting promotion:', error);
            alert('Không thể xóa khuyến mãi. Vui lòng thử lại!');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const isPromotionActive = (promotion) => {
        if (!promotion.isActive) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const start = new Date(promotion.startDate + 'T00:00:00');
        const end = new Date(promotion.endDate + 'T23:59:59');

        return now >= start && now <= end;
    };

    const filteredPromotions = promotions.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'active' && isPromotionActive(p)) ||
            (filterStatus === 'inactive' && !isPromotionActive(p));
        return matchesSearch && matchesStatus;
    });

    const toggleProductSelection = (productId) => {
        setFormData(prev => ({
            ...prev,
            productIds: prev.productIds.includes(productId)
                ? prev.productIds.filter(id => id !== productId)
                : [...prev.productIds, productId]
        }));
    };

    const toggleBranchSelection = (branchId) => {
        setFormData(prev => ({
            ...prev,
            branchIds: prev.branchIds.includes(branchId)
                ? prev.branchIds.filter(id => id !== branchId)
                : [...prev.branchIds, branchId]
        }));
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', color: '#D4AF37' }}>
                            Quản lý Khuyến mãi
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                            Tổng số: {promotions.length} chương trình
                        </p>
                    </div>
                    <button
                        onClick={handleOpenAdd}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #D4AF37, #F4E4C1)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        + Tạo khuyến mãi
                    </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm khuyến mãi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang chạy</option>
                        <option value="inactive">Đã kết thúc</option>
                    </select>
                </div>
            </div>

            {/* Promotions List */}
            {loading && !showModal ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #334155',
                        borderTop: '4px solid #D4AF37',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }} />
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {filteredPromotions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                            <Tag size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                            <p>Không tìm thấy chương trình khuyến mãi nào</p>
                        </div>
                    ) : (
                        filteredPromotions.map(promotion => {
                            const isActive = isPromotionActive(promotion);
                            return (
                                <div
                                    key={promotion.id}
                                    style={{
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                                <div style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    background: 'rgba(212, 175, 55, 0.1)',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Tag size={24} color="#D4AF37" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', color: '#fff' }}>
                                                        {promotion.name}
                                                    </h3>
                                                    {promotion.description && (
                                                        <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                                                            {promotion.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    background: isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: isActive ? '#22c55e' : '#ef4444',
                                                    border: `1px solid ${isActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                                }}>
                                                    {isActive ? '● Đang chạy' : '● Đã kết thúc'}
                                                </span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                                                {/* Discount Info */}
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Giảm giá</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {promotion.discountPercentage && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D4AF37', fontWeight: '600' }}>
                                                                <Percent size={16} />
                                                                <span>{promotion.discountPercentage}%</span>
                                                            </div>
                                                        )}
                                                        {promotion.discountAmount && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D4AF37', fontWeight: '600' }}>
                                                                <DollarSign size={16} />
                                                                <span>{parseFloat(promotion.discountAmount).toLocaleString('vi-VN')}đ</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Date Range */}
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Thời gian áp dụng</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#e2e8f0' }}>
                                                        <Calendar size={16} color="#64748b" />
                                                        <span>{formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}</span>
                                                    </div>
                                                </div>

                                                {/* Product Count */}
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Sản phẩm áp dụng</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#e2e8f0' }}>
                                                        <Package size={16} color="#64748b" />
                                                        <span>{promotion.productIds?.length || 0} sản phẩm</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                                            <button
                                                onClick={() => handleOpenEdit(promotion)}
                                                style={{
                                                    padding: '10px',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    color: '#3B82F6',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(promotion.id)}
                                                style={{
                                                    padding: '10px',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#EF4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        style={{
                            background: '#1e293b',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            border: '1px solid #334155'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '24px',
                            borderBottom: '1px solid #334155',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            background: '#1e293b',
                            zIndex: 1
                        }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>
                                {editingPromotion ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: '8px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#334155';
                                    e.currentTarget.style.color = '#fff';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gap: '24px' }}>
                                {/* Basic Info */}
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                                            Tên chương trình *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="VD: Giảm giá mùa hè"
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                                            Mô tả
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Mô tả chi tiết về chương trình khuyến mãi"
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Discount */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                                        Giá trị giảm giá *
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Giảm theo %</div>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    value={formData.discountPercentage}
                                                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value, discountAmount: '' })}
                                                    placeholder="0"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 36px 12px 12px',
                                                        background: '#0f172a',
                                                        border: '1px solid #334155',
                                                        borderRadius: '8px',
                                                        color: '#fff',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                                <Percent size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Giảm theo số tiền</div>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    value={formData.discountAmount}
                                                    onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value, discountPercentage: '' })}
                                                    placeholder="0"
                                                    min="0"
                                                    step="1000"
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 36px 12px 12px',
                                                        background: '#0f172a',
                                                        border: '1px solid #334155',
                                                        borderRadius: '8px',
                                                        color: '#fff',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                                <DollarSign size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertCircle size={14} />
                                        Chọn một trong hai loại giảm giá
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                                            Ngày bắt đầu *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                                            Ngày kết thúc *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            required
                                            min={formData.startDate}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Products Selection */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                                        Sản phẩm áp dụng ({formData.productIds.length} đã chọn)
                                    </label>
                                    <div style={{
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                        padding: '8px'
                                    }}>
                                        {products.length === 0 ? (
                                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                                                Không có sản phẩm nào
                                            </div>
                                        ) : (
                                            products.map(product => (
                                                <label
                                                    key={product.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        marginBottom: '4px',
                                                        background: formData.productIds.includes(product.id) ? 'rgba(212, 175, 55, 0.1)' : 'transparent'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        if (!formData.productIds.includes(product.id)) {
                                                            e.currentTarget.style.background = '#1e293b';
                                                        }
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if (!formData.productIds.includes(product.id)) {
                                                            e.currentTarget.style.background = 'transparent';
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.productIds.includes(product.id)}
                                                        onChange={() => toggleProductSelection(product.id)}
                                                        style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            cursor: 'pointer',
                                                            accentColor: '#D4AF37'
                                                        }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '500' }}>
                                                            {product.name}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                            {parseFloat(product.price).toLocaleString('vi-VN')}đ
                                                        </div>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Branches Selection */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                                        Chi nhánh áp dụng ({formData.branchIds.length} đã chọn)
                                    </label>
                                    <div style={{
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        maxHeight: '150px',
                                        overflow: 'auto',
                                        padding: '8px'
                                    }}>
                                        {branches.length === 0 ? (
                                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                                                Không có chi nhánh nào
                                            </div>
                                        ) : (
                                            branches.map(branch => (
                                                <label
                                                    key={branch.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        marginBottom: '4px',
                                                        background: formData.branchIds.includes(branch.id) ? 'rgba(212, 175, 55, 0.1)' : 'transparent'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        if (!formData.branchIds.includes(branch.id)) {
                                                            e.currentTarget.style.background = '#1e293b';
                                                        }
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if (!formData.branchIds.includes(branch.id)) {
                                                            e.currentTarget.style.background = 'transparent';
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.branchIds.includes(branch.id)}
                                                        onChange={() => toggleBranchSelection(branch.id)}
                                                        style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            cursor: 'pointer',
                                                            accentColor: '#D4AF37'
                                                        }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '500' }}>
                                                            {branch.name}
                                                        </div>
                                                        {branch.address && (
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                                {branch.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Active Status */}
                                <div>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        padding: '12px',
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s'
                                    }}
                                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#475569'}
                                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#334155'}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            style={{
                                                width: '18px',
                                                height: '18px',
                                                cursor: 'pointer',
                                                accentColor: '#D4AF37'
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '500' }}>
                                                Kích hoạt ngay
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                Chương trình sẽ được áp dụng ngay khi lưu
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                {/* Form Actions */}
                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    justifyContent: 'flex-end',
                                    paddingTop: '16px',
                                    borderTop: '1px solid #334155'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        style={{
                                            padding: '12px 24px',
                                            background: '#334155',
                                            color: '#e2e8f0',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#475569'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#334155'}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            padding: '12px 24px',
                                            background: loading ? '#64748b' : 'linear-gradient(135deg, #D4AF37, #F4E4C1)',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseOut={(e) => {
                                            if (!loading) e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <Save size={18} />
                                        {loading ? 'Đang lưu...' : (editingPromotion ? 'Cập nhật' : 'Tạo mới')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}