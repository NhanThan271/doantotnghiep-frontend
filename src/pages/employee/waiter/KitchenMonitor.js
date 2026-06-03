// KitchenMonitor.js - FULL CODE - ICON IMPORT + MÀU SẮC
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import {
    ChefHat, Clock, CheckCircle2, Loader2, Package,
    MapPin, Home, User, RefreshCw, CookingPot,
    ListFilter, Timer, Utensils
} from 'lucide-react';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

const KitchenMonitor = () => {
    const [kitchenOrders, setKitchenOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;

    // ===== SOCKET REGISTRATION =====
    useEffect(() => {
        if (!branchId || !user?.id) return;

        const registerSocket = () => {
            console.log("🔌 [KitchenMonitor] Đăng ký role WAITER");
            socket.emit('register-role', {
                role: 'waiter',
                userId: user.id,
                branchId: branchId
            });
        };

        if (socket.connected) registerSocket();
        socket.on('connect', registerSocket);
        return () => { socket.off('connect', registerSocket); };
    }, [branchId, user?.id]);

    // ===== API CALLS =====
    const fetchKitchenOrders = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersResponse, kitchenItemsResponse] = await Promise.all([
                axiosClient.get('/customer/orders'),
                axiosClient.get('/kitchen-order-items/active')
            ]);

            const allOrders = ordersResponse.data;
            const kitchenItems = kitchenItemsResponse.data;
            const branchOrders = allOrders.filter(o => o.branch?.id === branchId);

            const enrichedOrders = branchOrders.map(order => {
                const orderKitchenItems = kitchenItems.filter(ki => ki.orderId === order.id);
                const enrichedItems = orderKitchenItems.map(ki => {
                    const originalItem = (order.items || []).find(oi => oi.food?.id === ki.food?.id);
                    return {
                        id: ki.id,
                        food: ki.food || originalItem?.food,
                        kitchenStatus: ki.kitchenStatus || 'WAITING',
                        status: ki.kitchenStatus || 'WAITING',
                        quantity: originalItem?.quantity || 1,
                        note: originalItem?.note || ki.notes || '',
                        price: originalItem?.price,
                        kitchenItemId: ki.id
                    };
                });

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

                return { ...order, items: enrichedItems };
            });

            const activeOrders = enrichedOrders.filter(o =>
                o.status !== "PAID" && o.status !== "CANCELED"
            );

            setKitchenOrders(activeOrders);
        } catch (err) {
            console.error("Lỗi tải đơn bếp:", err);
        } finally {
            setLoading(false);
        }
    }, [branchId]);

    // ===== INITIAL LOAD & SOCKET =====
    useEffect(() => {
        if (!branchId) return;
        fetchKitchenOrders();

        const events = ["new-order", "order-updated", "item-completed", "kitchen-item-status-changed", "update-order-item-status"];
        events.forEach(event => socket.on(event, () => fetchKitchenOrders()));

        return () => events.forEach(event => socket.off(event));
    }, [branchId, fetchKitchenOrders]);

    // ===== GỘP MÓN CÙNG TÊN + CÙNG TRẠNG THÁI =====
    const mergeItemsByOrder = useCallback((orders) => {
        return orders.map(order => {
            const items = order.items || [];
            const groupedMap = new Map();

            items.forEach(item => {
                const foodName = item.food?.name || 'Món ăn';
                const status = item.kitchenStatus || 'WAITING';
                const key = `${foodName}__${status}`;

                if (groupedMap.has(key)) {
                    const existing = groupedMap.get(key);
                    existing.totalQuantity += item.quantity || 1;
                    existing.originalIds.push(item.kitchenItemId || item.id);
                    existing.originalItems.push(item);
                } else {
                    groupedMap.set(key, {
                        name: foodName,
                        food: item.food,
                        kitchenStatus: status,
                        totalQuantity: item.quantity || 1,
                        originalIds: [item.kitchenItemId || item.id],
                        originalItems: [item],
                        note: item.note || ''
                    });
                }
            });

            return { ...order, mergedItems: Array.from(groupedMap.values()) };
        });
    }, []);

    const ordersWithMergedItems = useMemo(() => mergeItemsByOrder(kitchenOrders), [kitchenOrders, mergeItemsByOrder]);

    // ===== FILTERED ORDERS =====
    const filteredOrders = useMemo(() => {
        if (activeTab === 'ALL') return ordersWithMergedItems;

        return ordersWithMergedItems.filter(order => {
            return order.mergedItems?.some(item => item.kitchenStatus === activeTab);
        }).map(order => ({
            ...order,
            mergedItems: order.mergedItems?.filter(item => item.kitchenStatus === activeTab)
        }));
    }, [ordersWithMergedItems, activeTab]);

    // ===== STATS =====
    const stats = useMemo(() => {
        const allMergedItems = ordersWithMergedItems.flatMap(order => order.mergedItems || []);
        return {
            total: ordersWithMergedItems.length,
            waiting: allMergedItems.filter(item => item.kitchenStatus === 'WAITING').length,
            preparing: allMergedItems.filter(item => item.kitchenStatus === 'PREPARING').length,
            completed: allMergedItems.filter(item => item.kitchenStatus === 'READY' || item.kitchenStatus === 'COMPLETED').length,
            totalItems: allMergedItems.length,
            totalQuantity: allMergedItems.reduce((sum, item) => sum + item.totalQuantity, 0)
        };
    }, [ordersWithMergedItems]);

    // ===== HELPERS =====
    const getLocation = (order) => {
        if (order.room) return `Phòng VIP ${order.room.number}`;
        if (order.table) return `Bàn ${order.table.number}`;
        return order.locationDetail || 'Takeaway';
    };

    const getAreaName = (order) => {
        if (order.room) return order.room.area || 'Khu VIP';
        if (order.table) return order.table.area || 'Khu chính';
        return 'Khu vực chung';
    };

    const getStatusColor = (status) => {
        const colors = { PENDING: '#f59e0b', PREPARING: '#3b82f6', CONFIRMED: '#8b5cf6', COMPLETED: '#10b981' };
        return colors[status] || '#6b7280';
    };

    const getStatusText = (status) => {
        const texts = { PENDING: 'Chờ chế biến', PREPARING: 'Đang chế biến', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Hoàn thành' };
        return texts[status] || status;
    };

    const getStatusIcon = (status) => {
        const props = { size: 16, color: getStatusColor(status) };
        switch (status) {
            case 'PENDING': return <Clock {...props} />;
            case 'PREPARING': return <CookingPot {...props} />;
            case 'CONFIRMED': return <Package {...props} />;
            case 'COMPLETED': return <CheckCircle2 {...props} />;
            default: return <Package {...props} />;
        }
    };

    const getItemStatusColor = (status) => {
        const colors = { WAITING: '#f59e0b', PREPARING: '#3b82f6', READY: '#10b981', COMPLETED: '#10b981' };
        return colors[status] || '#6b7280';
    };

    const getItemStatusText = (status) => {
        const texts = { WAITING: 'Chờ nấu', PREPARING: 'Đang nấu', READY: 'Hoàn thành', COMPLETED: 'Hoàn thành' };
        return texts[status] || status;
    };

    const getItemStatusIcon = (status) => {
        const color = getItemStatusColor(status);
        switch (status) {
            case 'WAITING': return <Clock size={18} color={color} />;
            case 'PREPARING': return <CookingPot size={18} color={color} />;
            case 'READY': return <CheckCircle2 size={18} color={color} />;
            case 'COMPLETED': return <CheckCircle2 size={18} color={color} />;
            default: return <Package size={18} color={color} />;
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return "--";
        return new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return "--";
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const toggleExpand = (orderId) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    // ===== TAB CONFIG =====
    const tabs = [
        { key: 'ALL', label: 'Tất cả', count: stats.totalItems, color: '#3b82f6', icon: <ListFilter size={16} /> },
        { key: 'WAITING', label: 'Món mới', count: stats.waiting, color: '#f59e0b', icon: <Clock size={16} color="#f59e0b" /> },
        { key: 'PREPARING', label: 'Đang làm', count: stats.preparing, color: '#3b82f6', icon: <CookingPot size={16} color="#3b82f6" /> },
        { key: 'READY', label: 'Hoàn thành', count: stats.completed, color: '#10b981', icon: <CheckCircle2 size={16} color="#10b981" /> }
    ];

    const statCards = [
        { label: 'Tổng đơn', value: stats.total, color: '#3b82f6', icon: <ChefHat size={24} color="#3b82f6" /> },
        { label: 'Chờ nấu', value: stats.waiting, color: '#f59e0b', icon: <Clock size={24} color="#f59e0b" /> },
        { label: 'Đang nấu', value: stats.preparing, color: '#3b82f6', icon: <CookingPot size={24} color="#3b82f6" /> },
        { label: 'Hoàn thành', value: stats.completed, color: '#10b981', icon: <CheckCircle2 size={24} color="#10b981" /> }
    ];

    // ===== RENDER =====
    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ChefHat size={28} color="#ea580c" /> Theo dõi bếp
                    </h2>
                    <button onClick={fetchKitchenOrders} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RefreshCw size={16} /> Làm mới
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '20px' }}>
                    {statCards.map((card, i) => (
                        <div key={i} style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${card.color}`, display: 'flex', alignItems: 'center', gap: 12, transition: 'transform 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                            {card.icon}
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{card.value}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                            padding: '8px 16px', borderRadius: '20px',
                            border: activeTab === tab.key ? `2px solid ${tab.color}` : '1px solid #e2e8f0',
                            background: activeTab === tab.key ? `${tab.color}10` : 'white',
                            color: activeTab === tab.key ? tab.color : '#64748b',
                            cursor: 'pointer', fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                            fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                        }}>
                            {tab.icon} {tab.label}
                            <span style={{ background: activeTab === tab.key ? tab.color : '#e2e8f0', color: activeTab === tab.key ? 'white' : '#64748b', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>{tab.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading / Empty / Orders */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' }}>
                    <Loader2 size={48} color="#3b82f6" style={{ animation: 'spin 0.8s linear infinite', marginBottom: 20 }} />
                    <p style={{ color: '#64748b' }}>Đang tải dữ liệu...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' }}>
                    <Utensils size={64} color="#cbd5e1" style={{ marginBottom: 16 }} />
                    <h3 style={{ color: '#1e293b', marginBottom: 8 }}>Không có đơn hàng nào</h3>
                    <p style={{ color: '#64748b' }}>Hiện tại chưa có đơn hàng nào cần chế biến</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredOrders.map(order => (
                        <div key={order.id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${getStatusColor(order.status)}` }}>
                            <div onClick={() => toggleExpand(order.id)} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: expandedOrder === order.id ? '#f8fafc' : 'white' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: 16, color: '#1e293b' }}>Đơn #{order.id}</span>
                                        <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status), display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {getStatusIcon(order.status)} {getStatusText(order.status)}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} color="#ea580c" /> {getLocation(order)}</span>
                                        <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 10, background: '#e0f2fe', color: '#0369a1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><Home size={12} color="#0369a1" /> {getAreaName(order)}</span>
                                        <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Timer size={14} color="#64748b" /> {formatTime(order.createdAt)} - {formatDate(order.createdAt)}</span>
                                        <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} color="#64748b" /> {order.customerName || 'Khách lẻ'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ background: '#e2e8f0', padding: '4px 12px', borderRadius: 20, fontSize: 12, color: '#475569' }}>{order.mergedItems?.length || 0} món</span>
                                </div>
                            </div>

                            {expandedOrder === order.id && (
                                <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {(order.mergedItems || []).map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', borderLeft: `4px solid ${getItemStatusColor(item.kitchenStatus)}` }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                        {getItemStatusIcon(item.kitchenStatus)} {item.name}
                                                    </div>
                                                    {item.note && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>📝 {item.note}</div>}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                                                    <div style={{ textAlign: 'center', padding: '8px 16px', background: '#e2e8f0', borderRadius: '12px', minWidth: '50px' }}>
                                                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b' }}>{item.totalQuantity}</div>
                                                        <div style={{ fontSize: 10, color: '#64748b' }}>phần</div>
                                                    </div>
                                                    <span style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, background: `${getItemStatusColor(item.kitchenStatus)}20`, color: getItemStatusColor(item.kitchenStatus), fontWeight: 'bold', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        {getItemStatusIcon(item.kitchenStatus)} {getItemStatusText(item.kitchenStatus)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {order.notes && (
                                        <div style={{ marginTop: 16, padding: '12px', background: '#fef3c7', borderRadius: 12, fontSize: 13, color: '#92400e' }}>
                                            📝 Ghi chú đơn hàng: {order.notes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default KitchenMonitor;