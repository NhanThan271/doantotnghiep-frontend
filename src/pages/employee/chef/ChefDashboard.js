// pages/employee/chef/ChefDashboard.js
import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, Play, Check, RefreshCw } from 'lucide-react';
import { kitchenAPI } from '../../../services/api';
import KitchenLayout from '../../../layouts/KitchenLayout';

const ChefDashboard = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('ALL');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await kitchenAPI.getQueue();
            console.log('Raw API response:', res.data);

            const data = res.data.map(item => ({
                id: item.id,
                name: item.food?.name || 'Unknown',
                quantity: item.quantity || 1,
                kitchenStatus: item.kitchenStatus, // WAITING, PREPARING, READY, SERVED
                orderStatus: item.order?.status, // OrderStatus của đơn hàng
                table: item.order?.table?.number || `Bàn ${item.order?.table?.id || '?'}`,
                createdAt: item.createdAt,
                priority: item.priority || false,
                notes: item.notes || ''
            }));

            console.log('Transformed data:', data);
            setItems(data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, newKitchenStatus) => {
        console.log(`Updating item ${id} from ${items.find(i => i.id === id)?.kitchenStatus} to ${newKitchenStatus}`);

        try {
            const response = await kitchenAPI.updateItemStatus(id, newKitchenStatus);
            console.log('Update response:', response.data);

            // Refresh data ngay lập tức
            await fetchData();

            // Hiển thị thông báo thành công
            const item = items.find(i => i.id === id);
            const statusText = {
                'PREPARING': 'bắt đầu nấu',
                'READY': 'hoàn thành',
                'SERVED': 'đã phục vụ'
            };
            alert(`✅ ${item?.name} đã ${statusText[newKitchenStatus] || 'cập nhật'}!`);

        } catch (err) {
            console.error('Update error:', err);
            alert('❌ Cập nhật thất bại: ' + (err.response?.data?.message || err.message));
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Filter items theo kitchenStatus
    const filteredItems = filter === 'ALL'
        ? items
        : items.filter(item => item.kitchenStatus === filter);

    // Thống kê theo kitchenStatus
    const stats = {
        ALL: items.length,
        WAITING: items.filter(i => i.kitchenStatus === 'WAITING').length,
        PREPARING: items.filter(i => i.kitchenStatus === 'PREPARING').length,
        READY: items.filter(i => i.kitchenStatus === 'READY').length,
        SERVED: items.filter(i => i.kitchenStatus === 'SERVED').length
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'WAITING': return { background: '#fef3c7', color: '#d97706' };
            case 'PREPARING': return { background: '#dbeafe', color: '#2563eb' };
            case 'READY': return { background: '#d1fae5', color: '#059669' };
            case 'SERVED': return { background: '#e0e7ff', color: '#4f46e5' };
            default: return { background: '#f1f5f9', color: '#64748b' };
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'WAITING': return '⏳ Chờ làm';
            case 'PREPARING': return '🔵 Đang nấu';
            case 'READY': return '✅ Hoàn thành';
            case 'SERVED': return '🍽️ Đã phục vụ';
            default: return status;
        }
    };

    const renderAction = (item) => {
        switch (item.kitchenStatus) {
            case 'WAITING':
                return (
                    <button
                        onClick={() => updateStatus(item.id, 'PREPARING')}
                        style={{
                            background: '#3b82f6',
                            color: 'white',
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Play size={16} /> Bắt đầu nấu
                    </button>
                );
            case 'PREPARING':
                return (
                    <button
                        onClick={() => updateStatus(item.id, 'READY')}
                        style={{
                            background: '#10b981',
                            color: 'white',
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Check size={16} /> Hoàn thành
                    </button>
                );
            case 'READY':
                return (
                    <button
                        onClick={() => updateStatus(item.id, 'SERVED')}
                        style={{
                            background: '#8b5cf6',
                            color: 'white',
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Check size={16} /> Đã phục vụ
                    </button>
                );
            default:
                return <span style={{ color: '#059669', fontWeight: '500' }}>✓ Đã phục vụ khách</span>;
        }
    };

    const getTimeAgo = (dateString) => {
        if (!dateString) return 'N/A';
        const diff = Math.floor((Date.now() - new Date(dateString)) / 60000);
        if (diff < 1) return 'Vừa xong';
        if (diff < 60) return `${diff} phút trước`;
        return `${Math.floor(diff / 60)} giờ trước`;
    };

    return (
        <KitchenLayout>
            <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', margin: 0 }}>🍳 Bếp chính</h1>
                    <button
                        onClick={fetchData}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={18} /> Làm mới
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{ padding: '16px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.ALL}</div>
                        <div style={{ color: '#64748b' }}>Tổng số món</div>
                    </div>
                    <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.WAITING}</div>
                        <div style={{ color: '#d97706' }}>⏳ Chờ làm</div>
                    </div>
                    <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.PREPARING}</div>
                        <div style={{ color: '#2563eb' }}>🔵 Đang nấu</div>
                    </div>
                    <div style={{ padding: '16px', background: '#d1fae5', borderRadius: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.READY}</div>
                        <div style={{ color: '#059669' }}>✅ Hoàn thành</div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setFilter('ALL')}
                        style={{
                            padding: '8px 16px',
                            background: filter === 'ALL' ? '#3b82f6' : '#f1f5f9',
                            color: filter === 'ALL' ? 'white' : '#64748b',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Tất cả ({stats.ALL})
                    </button>
                    <button
                        onClick={() => setFilter('WAITING')}
                        style={{
                            padding: '8px 16px',
                            background: filter === 'WAITING' ? '#3b82f6' : '#f1f5f9',
                            color: filter === 'WAITING' ? 'white' : '#64748b',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        ⏳ Chờ làm ({stats.WAITING})
                    </button>
                    <button
                        onClick={() => setFilter('PREPARING')}
                        style={{
                            padding: '8px 16px',
                            background: filter === 'PREPARING' ? '#3b82f6' : '#f1f5f9',
                            color: filter === 'PREPARING' ? 'white' : '#64748b',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        🔵 Đang nấu ({stats.PREPARING})
                    </button>
                    <button
                        onClick={() => setFilter('READY')}
                        style={{
                            padding: '8px 16px',
                            background: filter === 'READY' ? '#3b82f6' : '#f1f5f9',
                            color: filter === 'READY' ? 'white' : '#64748b',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        ✅ Hoàn thành ({stats.READY})
                    </button>
                </div>

                {/* Loading */}
                {loading && <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>}

                {/* Items Grid */}
                {!loading && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '16px'
                    }}>
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    borderLeft: item.priority ? '4px solid #ef4444' : 'none'
                                }}
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <strong style={{ color: '#3b82f6' }}>Bàn {item.table}</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={14} style={{ color: '#64748b' }} />
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>{getTimeAgo(item.createdAt)}</span>
                                    </div>
                                </div>

                                {/* Content */}
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{item.name}</h3>
                                <div style={{ marginBottom: '12px' }}>
                                    Số lượng: <strong>{item.quantity}</strong>
                                </div>

                                {item.notes && (
                                    <div style={{
                                        padding: '8px',
                                        background: '#fef3c7',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        marginBottom: '12px'
                                    }}>
                                        📝 {item.notes}
                                    </div>
                                )}

                                {/* Footer */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        ...getStatusStyle(item.kitchenStatus)
                                    }}>
                                        {getStatusText(item.kitchenStatus)}
                                    </span>
                                    {renderAction(item)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && filteredItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <ChefHat size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>Không có món nào trong danh sách</p>
                    </div>
                )}
            </div>
        </KitchenLayout>
    );
};

export default ChefDashboard;