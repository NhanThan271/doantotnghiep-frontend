// KitchenMonitor.js
import React, { useState, useEffect } from "react";
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
const API = "http://localhost:8080";

const KitchenMonitor = () => {
    const [kitchenOrders, setKitchenOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;

    // Lấy danh sách đơn hàng đang nấu
    const fetchKitchenOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/customer/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const branchOrders = data.filter(o => o.branch?.id === branchId);
                // Lọc đơn hàng đang xử lý (chưa thanh toán và chưa hủy)
                const activeOrders = branchOrders.filter(o =>
                    (o.status === "PENDING" || o.status === "PREPARING") &&
                    o.status !== "PAID" &&
                    o.status !== "CANCELED"
                );
                setKitchenOrders(activeOrders);
                console.log("📦 Đơn hàng đang nấu:", activeOrders.length);
            }
        } catch (err) {
            console.error("Lỗi tải đơn bếp:", err);
        } finally {
            setLoading(false);
        }
    };

    // Lắng nghe socket events
    useEffect(() => {
        if (branchId) {
            fetchKitchenOrders();

            socket.on("new-order", (data) => {
                if (data.branchId === branchId) {
                    console.log("📢 Đơn hàng mới:", data);
                    fetchKitchenOrders();
                }
            });

            socket.on("order-updated", (data) => {
                if (data.branchId === branchId) {
                    console.log("🔄 Cập nhật đơn hàng:", data);
                    fetchKitchenOrders();
                }
            });

            socket.on("item-completed", (data) => {
                if (data.branchId === branchId) {
                    console.log("✅ Món hoàn thành:", data);
                    fetchKitchenOrders();
                }
            });
        }

        return () => {
            socket.off("new-order");
            socket.off("order-updated");
            socket.off("item-completed");
        };
    }, [branchId]);

    // Refresh mỗi 30 giây
    useEffect(() => {
        const interval = setInterval(() => {
            fetchKitchenOrders();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'PENDING': return '⏳';
            case 'PREPARING': return '🔪';
            case 'COMPLETED': return '✅';
            default: return '📦';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'PENDING': return 'Chờ chế biến';
            case 'PREPARING': return 'Đang chế biến';
            case 'COMPLETED': return 'Hoàn thành';
            default: return status;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return '#f59e0b';
            case 'PREPARING': return '#3b82f6';
            case 'COMPLETED': return '#10b981';
            default: return '#6b7280';
        }
    };

    const getItemStatusColor = (status) => {
        switch (status) {
            case 'WAITING': return '#f59e0b';
            case 'PREPARING': return '#3b82f6';
            case 'COMPLETED': return '#10b981';
            default: return '#6b7280';
        }
    };

    const getItemStatusText = (status) => {
        switch (status) {
            case 'WAITING': return 'Chờ nấu';
            case 'PREPARING': return 'Đang nấu';
            case 'COMPLETED': return 'Hoàn thành';
            default: return status;
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return "--";
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return "--";
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const getLocation = (order) => {
        if (order.room) return `Phòng VIP ${order.room.number}`;
        if (order.table) return `Bàn ${order.table.number}`;
        return order.locationDetail || 'Takeaway';
    };

    const toggleExpand = (orderId) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    // Thống kê
    const stats = {
        total: kitchenOrders.length,
        pending: kitchenOrders.filter(o => o.status === 'PENDING').length,
        preparing: kitchenOrders.filter(o => o.status === 'PREPARING').length,
        totalItems: kitchenOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0)
    };

    return (
        <div>
            {/* Header với thống kê */}
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                            👨‍🍳 Theo dõi bếp
                        </h2>
                        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
                            Danh sách đơn hàng đang chế biến
                        </p>
                    </div>
                    <button
                        onClick={fetchKitchenOrders}
                        style={{
                            padding: '8px 16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        🔄 Làm mới
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '16px',
                    marginTop: '20px'
                }}>
                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '12px',
                        textAlign: 'center',
                        borderLeft: '4px solid #3b82f6'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{stats.total}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Tổng đơn</div>
                    </div>
                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '12px',
                        textAlign: 'center',
                        borderLeft: '4px solid #f59e0b'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pending}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Chờ chế biến</div>
                    </div>
                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '12px',
                        textAlign: 'center',
                        borderLeft: '4px solid #3b82f6'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.preparing}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Đang chế biến</div>
                    </div>
                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '12px',
                        textAlign: 'center',
                        borderLeft: '4px solid #10b981'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.totalItems}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Tổng món</div>
                    </div>
                </div>
            </div>

            {/* Danh sách đơn hàng */}
            {loading ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    background: 'white',
                    borderRadius: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #e2e8f0',
                        borderTopColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            ) : kitchenOrders.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    background: 'white',
                    borderRadius: '16px'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧑‍🍳</div>
                    <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>Không có đơn hàng nào</h3>
                    <p style={{ color: '#64748b' }}>Hiện tại không có đơn hàng nào đang chế biến</p>
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    {kitchenOrders.map(order => (
                        <div
                            key={order.id}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                borderLeft: `4px solid ${getStatusColor(order.status)}`
                            }}
                        >
                            {/* Order Header */}
                            <div
                                onClick={() => toggleExpand(order.id)}
                                style={{
                                    padding: '16px 20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                    background: expandedOrder === order.id ? '#f8fafc' : 'white'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: 16, color: '#1e293b' }}>
                                            Đơn #{order.id}
                                        </span>
                                        <span style={{
                                            fontSize: 12,
                                            padding: '4px 12px',
                                            borderRadius: 20,
                                            background: `${getStatusColor(order.status)}20`,
                                            color: getStatusColor(order.status),
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}>
                                            {getStatusIcon(order.status)} {getStatusText(order.status)}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            📍 {getLocation(order)}
                                        </span>
                                        <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            🕐 {formatTime(order.createdAt)} - {formatDate(order.createdAt)}
                                        </span>
                                        <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            👤 {order.customerName || 'Khách lẻ'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{
                                        background: '#e2e8f0',
                                        padding: '4px 12px',
                                        borderRadius: 20,
                                        fontSize: 12,
                                        color: '#475569'
                                    }}>
                                        {order.items?.length || 0} món
                                    </span>
                                    <span style={{ fontSize: 18 }}>
                                        {expandedOrder === order.id ? '▲' : '▼'}
                                    </span>
                                </div>
                            </div>

                            {/* Order Items - Expandable */}
                            {expandedOrder === order.id && (
                                <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '16px 0 12px', color: '#1e293b' }}>📋 Danh sách món</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {order.items?.map((item, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '12px',
                                                    background: '#f8fafc',
                                                    borderRadius: '12px',
                                                    borderLeft: `3px solid ${getItemStatusColor(item.status)}`
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>
                                                        {item.food?.name || 'Món ăn'}
                                                    </div>
                                                    {item.note && (
                                                        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                                                            📝 {item.note}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <span style={{
                                                        background: 'white',
                                                        padding: '4px 10px',
                                                        borderRadius: 20,
                                                        fontSize: 13,
                                                        fontWeight: 500,
                                                        color: '#475569'
                                                    }}>
                                                        x{item.quantity}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 12,
                                                        padding: '4px 10px',
                                                        borderRadius: 20,
                                                        background: `${getItemStatusColor(item.status)}20`,
                                                        color: getItemStatusColor(item.status)
                                                    }}>
                                                        {getItemStatusText(item.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {order.notes && (
                                        <div style={{
                                            marginTop: 16,
                                            padding: '12px',
                                            background: '#fef3c7',
                                            borderRadius: 12,
                                            fontSize: 13,
                                            color: '#92400e'
                                        }}>
                                            📝 Ghi chú đơn hàng: {order.notes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default KitchenMonitor;