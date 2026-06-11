import React, { useState, useEffect, useCallback, useMemo } from "react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import {
    ChefHat, Clock, CheckCircle2, Loader2, Package,
    MapPin, Home, User, RefreshCw, CookingPot,
    ListFilter, Timer, Utensils, ChevronDown
} from 'lucide-react';
import styles from "./KitchenMonitor.module.css";

const socket = io('/', {
    path: '/socket.io/',
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
        <div className={styles.container}>
            {/* Header Card */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <h2 className={styles.title}>
                        <ChefHat size={28} color="#ea580c" /> Theo dõi bếp
                    </h2>
                    <button className={styles.refreshBtn} onClick={fetchKitchenOrders}>
                        <RefreshCw size={16} /> Làm mới
                    </button>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    {statCards.map((card, i) => (
                        <div key={i} className={styles.statCard} style={{ borderLeftColor: card.color }}>
                            <div className={styles.statIcon}>{card.icon}</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statValue}>{card.value}</div>
                                <div className={styles.statLabel}>{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs */}
                <div className={styles.tabsContainer}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ''}`}
                            style={activeTab === tab.key ? { borderColor: tab.color, color: tab.color } : {}}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.icon} {tab.label}
                            <span className={styles.tabCount} style={{
                                background: activeTab === tab.key ? tab.color : '#e2e8f0',
                                color: activeTab === tab.key ? 'white' : '#64748b'
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className={styles.loadingContainer}>
                    <Loader2 size={48} color="#3b82f6" className={styles.spinner} />
                    <p style={{ color: '#64748b' }}>Đang tải dữ liệu...</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredOrders.length === 0 && (
                <div className={styles.emptyContainer}>
                    <div className={styles.emptyIcon}>
                        <Utensils size={48} color="#cbd5e1" />
                    </div>
                    <h3 className={styles.emptyTitle}>Không có đơn hàng nào</h3>
                    <p className={styles.emptyText}>Hiện tại chưa có đơn hàng nào cần chế biến</p>
                </div>
            )}

            {/* Orders List */}
            {!loading && filteredOrders.length > 0 && (
                <div className={styles.ordersList}>
                    {filteredOrders.map(order => (
                        <div key={order.id} className={styles.orderCard} style={{ borderLeftColor: getStatusColor(order.status) }}>
                            {/* Order Header */}
                            <div
                                className={`${styles.orderHeader} ${expandedOrder === order.id ? styles.orderHeaderExpanded : ''}`}
                                onClick={() => toggleExpand(order.id)}
                            >
                                <div className={styles.orderInfo}>
                                    <div className={styles.orderTitleRow}>
                                        <span className={styles.orderId}>Đơn #{order.id}</span>
                                        <span className={styles.orderStatusBadge} style={{ backgroundColor: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status) }}>
                                            {getStatusIcon(order.status)} {getStatusText(order.status)}
                                        </span>
                                    </div>
                                    <div className={styles.orderMeta}>
                                        <span className={styles.metaItem}>
                                            <MapPin size={14} color="#ea580c" /> {getLocation(order)}
                                        </span>
                                        <span className={styles.areaBadge}>
                                            <Home size={12} color="#0369a1" /> {getAreaName(order)}
                                        </span>
                                        <span className={styles.metaItem}>
                                            <Timer size={14} color="#64748b" /> {formatTime(order.createdAt)} - {formatDate(order.createdAt)}
                                        </span>
                                        <span className={styles.metaItem}>
                                            <User size={14} color="#64748b" /> {order.customerName || 'Khách lẻ'}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.orderStats}>
                                    <span className={styles.itemCount}>{order.mergedItems?.length || 0} món</span>
                                    <ChevronDown size={20} className={`${styles.expandIcon} ${expandedOrder === order.id ? styles.expandIconRotated : ''}`} />
                                </div>
                            </div>

                            {/* Order Details (Expanded) */}
                            {expandedOrder === order.id && (
                                <div className={styles.orderDetails}>
                                    <div className={styles.itemsList}>
                                        {(order.mergedItems || []).map((item, idx) => (
                                            <div key={idx} className={styles.itemCard} style={{ borderLeftColor: getItemStatusColor(item.kitchenStatus) }}>
                                                <div className={styles.itemInfo}>
                                                    <div className={styles.itemName}>
                                                        {getItemStatusIcon(item.kitchenStatus)} {item.name}
                                                    </div>
                                                    {item.note && (
                                                        <div className={styles.itemNote}>
                                                            📝 {item.note}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.itemActions}>
                                                    <div className={styles.itemQuantityBox}>
                                                        <div className={styles.itemQuantityValue}>{item.totalQuantity}</div>
                                                        <div className={styles.itemQuantityLabel}>phần</div>
                                                    </div>
                                                    <span className={styles.itemStatusBadge} style={{
                                                        backgroundColor: `${getItemStatusColor(item.kitchenStatus)}20`,
                                                        color: getItemStatusColor(item.kitchenStatus)
                                                    }}>
                                                        {getItemStatusIcon(item.kitchenStatus)} {getItemStatusText(item.kitchenStatus)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {order.notes && (
                                        <div className={styles.orderNote}>
                                            📝 Ghi chú đơn hàng: {order.notes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KitchenMonitor;