// KitchenMonitor.js - Đã sửa với tabs lọc trạng thái món + Socket real-time
import React, { useState, useEffect } from "react";
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
const API = "http://localhost:8080";

const KitchenMonitor = () => {
    const [kitchenOrders, setKitchenOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;

    // ===== ĐĂNG KÝ ROLE WAITER =====
    useEffect(() => {
        if (branchId && user?.id) {
            console.log("🔌 [KitchenMonitor] Đăng ký role WAITER với socket server");
            console.log(`   UserID: ${user.id}, Branch: ${branchId}`);

            socket.emit('register-role', {
                role: 'waiter',
                userId: user.id,
                branchId: branchId
            });

            console.log("✅ [KitchenMonitor] Đã gửi register-role thành công");
        }
    }, [branchId, user?.id]);

    // ===== FETCH DATA =====
    const fetchKitchenOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // Lấy danh sách đơn hàng
            const ordersResponse = await fetch(`${API}/api/customer/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!ordersResponse.ok) throw new Error('Failed to fetch orders');

            const allOrders = await ordersResponse.json();
            const branchOrders = allOrders.filter(o => o.branch?.id === branchId);

            // Lấy trạng thái từ KitchenOrderItem
            const kitchenItemsResponse = await fetch(`${API}/api/kitchen-order-items/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const kitchenItems = await kitchenItemsResponse.json();

            console.log("📦 Kitchen Items from API:", kitchenItems);

            // Map từng KitchenOrderItem thành 1 item riêng biệt
            const enrichedOrders = branchOrders.map(order => {
                const orderKitchenItems = kitchenItems.filter(ki => ki.orderId === order.id);

                const enrichedItems = orderKitchenItems.map(ki => {
                    const originalItem = (order.items || []).find(oi =>
                        oi.food?.id === ki.food?.id
                    );

                    return {
                        id: ki.id,
                        food: ki.food || originalItem?.food,
                        kitchenStatus: ki.kitchenStatus || 'WAITING',
                        status: ki.kitchenStatus || 'WAITING',
                        quantity: 1,
                        note: originalItem?.note || ki.notes || '',
                        price: originalItem?.price,
                        kitchenItemId: ki.id
                    };
                });

                // Fallback nếu không có KitchenOrderItem
                if (enrichedItems.length === 0) {
                    return {
                        ...order,
                        items: (order.items || []).map(item => ({
                            ...item,
                            kitchenStatus: item.kitchenStatus || 'WAITING',
                            status: item.kitchenStatus || 'WAITING'
                        }))
                    };
                }

                return {
                    ...order,
                    items: enrichedItems
                };
            });

            // Lọc đơn hàng đang xử lý
            const activeOrders = enrichedOrders.filter(o =>
                o.status !== "PAID" &&
                o.status !== "CANCELED"
            );

            console.log("✅ Enriched Orders:", activeOrders.length);
            setKitchenOrders(activeOrders);

        } catch (err) {
            console.error("Lỗi tải đơn bếp:", err);
        } finally {
            setLoading(false);
        }
    };

    // ===== SOCKET LISTENERS =====
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

            socket.on("kitchen-item-status-changed", (data) => {
                if (data.branchId === branchId) {
                    console.log("🔔 [KitchenMonitor] Nhận thông báo từ bếp:", data);
                    console.log(`📋 Món: ${data.itemName} → ${data.status}`);
                    console.log(`📝 Message: ${data.message}`);
                    fetchKitchenOrders();
                }
            });

            socket.on("update-order-item-status", (data) => {
                if (data.branchId === branchId) {
                    console.log("🔄 [KitchenMonitor] Cập nhật trạng thái món:", data);
                    fetchKitchenOrders();
                }
            });
        }

        return () => {
            socket.off("new-order");
            socket.off("order-updated");
            socket.off("item-completed");
            socket.off("kitchen-item-status-changed");
            socket.off("update-order-item-status");
        };
    }, [branchId]);

    // ===== FILTER ORDERS BY ITEM STATUS =====
    const getFilteredOrders = () => {
        if (activeTab === 'ALL') return kitchenOrders;

        return kitchenOrders.filter(order => {
            return order.items?.some(item => item.kitchenStatus === activeTab);
        }).map(order => {
            return {
                ...order,
                items: order.items?.filter(item => item.kitchenStatus === activeTab)
            };
        });
    };

    const filteredOrders = getFilteredOrders();

    // ===== STATS DỰA TRÊN ITEM STATUS =====
    const getAllItems = () => {
        return kitchenOrders.flatMap(order => order.items || []);
    };

    const allItems = getAllItems();

    const stats = {
        total: kitchenOrders.length,
        waiting: allItems.filter(item => item.kitchenStatus === 'WAITING').length,
        preparing: allItems.filter(item => item.kitchenStatus === 'PREPARING').length,
        completed: allItems.filter(item => item.kitchenStatus === 'READY' || item.kitchenStatus === 'COMPLETED').length,
        totalItems: allItems.length
    };

    // ===== HELPER FUNCTIONS =====
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
            case 'READY': return '#10b981';
            case 'COMPLETED': return '#10b981';
            default: return '#6b7280';
        }
    };

    const getItemStatusText = (status) => {
        switch (status) {
            case 'WAITING': return '⏳ Chờ nấu';
            case 'PREPARING': return '🔪 Đang nấu';
            case 'READY': return '✅ Hoàn thành';
            case 'COMPLETED': return '✅ Hoàn thành';
            default: return status || 'Không xác định';
        }
    };

    const getItemStatusIcon = (status) => {
        switch (status) {
            case 'WAITING': return '⏳';
            case 'PREPARING': return '🔪';
            case 'READY': return '✅';
            case 'COMPLETED': return '✅';
            default: return '📦';
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
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.waiting}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>⏳ Chờ nấu</div>
                    </div>
                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '12px',
                        textAlign: 'center',
                        borderLeft: '4px solid #3b82f6'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.preparing}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>🔪 Đang nấu</div>
                    </div>
                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '12px',
                        textAlign: 'center',
                        borderLeft: '4px solid #10b981'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.completed}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>✅ Hoàn thành</div>
                    </div>
                </div>

                {/* TABS LỌC THEO TRẠNG THÁI MÓN */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '20px',
                    flexWrap: 'wrap'
                }}>
                    {[
                        { key: 'ALL', label: 'Tất cả', count: stats.totalItems, color: '#3b82f6' },
                        { key: 'WAITING', label: '⏳ Món mới', count: stats.waiting, color: '#f59e0b' },
                        { key: 'PREPARING', label: '🔪 Đang làm', count: stats.preparing, color: '#3b82f6' },
                        { key: 'READY', label: '✅ Hoàn thành', count: stats.completed, color: '#10b981' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: activeTab === tab.key
                                    ? `2px solid ${tab.color}`
                                    : '1px solid #e2e8f0',
                                background: activeTab === tab.key
                                    ? `${tab.color}10`
                                    : 'white',
                                color: activeTab === tab.key ? tab.color : '#64748b',
                                cursor: 'pointer',
                                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.label}
                            <span style={{
                                background: activeTab === tab.key ? tab.color : '#e2e8f0',
                                color: activeTab === tab.key ? 'white' : '#64748b',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
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
            ) : filteredOrders.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    background: 'white',
                    borderRadius: '16px'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🍽️</div>
                    <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>
                        {activeTab === 'ALL' ? 'Không có đơn hàng nào' : `Không có món ${getItemStatusText(activeTab).toLowerCase()}`}
                    </h3>
                    <p style={{ color: '#64748b' }}>
                        {activeTab === 'ALL'
                            ? 'Hiện tại không có đơn hàng nào đang chế biến'
                            : `Không có món nào ở trạng thái "${getItemStatusText(activeTab)}"`
                        }
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    {filteredOrders.map(order => (
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
                                    <h4 style={{ margin: '16px 0 12px', color: '#1e293b' }}>
                                        📋 Danh sách món
                                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                                            (Hiển thị: {activeTab === 'ALL' ? 'Tất cả' : getItemStatusText(activeTab)})
                                        </span>
                                    </h4>
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
                                                    borderLeft: `3px solid ${getItemStatusColor(item.kitchenStatus)}`
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 500, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span>{getItemStatusIcon(item.kitchenStatus)}</span>
                                                        {item.food?.name || 'Món ăn'}
                                                    </div>
                                                    {item.note && (
                                                        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                                                            📝 {item.note}
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                                        ID: {item.kitchenItemId || item.id} | Status: {item.kitchenStatus || 'N/A'}
                                                    </div>
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
                                                        background: `${getItemStatusColor(item.kitchenStatus)}20`,
                                                        color: getItemStatusColor(item.kitchenStatus),
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {getItemStatusText(item.kitchenStatus)}
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