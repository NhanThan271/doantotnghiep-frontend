// WaiterLayout.js - SỬA LẠI PHẦN SOCKET
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
const API = "http://localhost:8080";

const WaiterLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;

    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);

    console.log("🔍 WaiterLayout render - branchId:", branchId);

    // Phát âm thanh thông báo
    const playNotificationSound = useCallback(() => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContextClass();

            const osc1 = audioContext.createOscillator();
            const gain1 = audioContext.createGain();
            osc1.connect(gain1);
            gain1.connect(audioContext.destination);
            osc1.frequency.value = 880;
            gain1.gain.value = 0.3;
            osc1.start(audioContext.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
            osc1.stop(audioContext.currentTime + 0.2);

            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 660;
            gain2.gain.value = 0.3;
            osc2.start(audioContext.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.35);
            osc2.stop(audioContext.currentTime + 0.35);
        } catch (err) {
            console.log("Sound error:", err);
        }
    }, []);

    // Thêm thông báo mới
    const addNotification = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        const timestamp = new Date();
        console.log("🔔 Thêm notification:", { message, type });
        setNotifications(prev => [{ id, message, type, timestamp }, ...prev]);
        playNotificationSound();
        setNotifications(prev => prev.slice(0, 50));
    }, [playNotificationSound]);

    const menuItems = [
        { label: "🍽️ Gọi món", path: "/waiter/orders" },
        { label: "📋 Yêu cầu thanh toán", path: "/waiter/payment-requests" },
        { label: "👨‍🍳 Theo dõi bếp", path: "/waiter/kitchen" },
        { label: "👨‍🍳 Ca làm", path: "/waiter/shift" },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/customer/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const branchOrders = data.filter(o => o.branch?.id === branchId);
                const activeOrders = branchOrders.filter(o =>
                    o.status === "PENDING" || o.status === "PREPARING"
                );
                setUnreadCount(activeOrders.length);
            }
        } catch (err) {
            console.error("Lỗi tải đơn bếp:", err);
        }
    };

    // ========== SOCKET - PHẦN QUAN TRỌNG ==========
    useEffect(() => {
        if (!branchId) {
            console.log("⏭ [WaiterLayout] Bỏ qua - không có branchId");
            return;
        }

        console.log("🔌 [WaiterLayout] Bắt đầu đăng ký socket");
        console.log("👤 User ID:", user?.id);
        console.log("🏢 Branch ID:", branchId);
        console.log("🆔 Socket ID:", socket.id);
        console.log("🔗 Socket connected status:", socket.connected);

        fetchUnreadCount();

        // ===== ĐĂNG KÝ ROLE NGAY NẾU SOCKET ĐÃ CONNECTED =====
        const registerAsWaiter = () => {
            console.log("📝 Đăng ký role waiter...");
            socket.emit("register-role", {
                role: "waiter",
                userId: user?.id,
                branchId: branchId
            });
            console.log("✅ Đã gửi register-role: waiter, branchId:", branchId);
        };

        if (socket.connected) {
            console.log("⚡ Socket đã connected - đăng ký ngay");
            registerAsWaiter();
        }

        // Socket connect event
        const handleConnect = () => {
            console.log("✅ [WaiterLayout] Connect event - socket ID:", socket.id);
            registerAsWaiter();
        };

        const handleDisconnect = () => {
            console.log("❌ [WaiterLayout] Disconnected");
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        // ===== CÁC LISTENER =====

        // Đơn hàng mới
        const handleNewOrder = (data) => {
            console.log("📢 [WaiterLayout] new-order:", data?.branchId, "| my branch:", branchId);
            if (data.branchId === branchId) {
                fetchUnreadCount();
                const locationName = data.locationName ||
                    (data.isRoom ? `Phòng ${data.tableNumber}` : `Bàn ${data.tableNumber}`);
                const itemList = data.items?.map(item => `${item.name} x${item.quantity}`).join(', ') || '';
                addNotification(`🆕 Đơn mới - ${locationName}: ${itemList}`, 'info');
            }
        };

        // Cập nhật đơn hàng
        const handleOrderUpdated = (data) => {
            console.log("🔄 [WaiterLayout] order-updated:", data?.branchId, "| my branch:", branchId);
            if (data.branchId === branchId) {
                fetchUnreadCount();
                const locationName = data.locationName ||
                    (data.isRoom ? `Phòng ${data.tableNumber}` : `Bàn ${data.tableNumber}`);
                const itemList = data.items?.map(item => `${item.name} x${item.quantity}`).join(', ') || '';
                addNotification(`➕ Thêm món - ${locationName}: ${itemList}`, 'info');
            }
        };

        // ===== ĐÂY LÀ EVENT QUAN TRỌNG: BẾP CẬP NHẬT TRẠNG THÁI MÓN =====
        const handleUpdateOrderItemStatus = (data) => {
            console.log("🍳🍳🍳 [WaiterLayout] update-order-item-status NHẬN ĐƯỢC:", data);
            console.log("🍳 branchId:", data.branchId, "| my branchId:", branchId);

            if (data.branchId === branchId) {
                console.log("✅✅✅ CÙNG BRANCH - SẼ HIỂN THỊ THÔNG BÁO");

                let statusText, notiType;
                switch (data.status) {
                    case 'PREPARING':
                        statusText = '🔪 ĐANG NẤU';
                        notiType = 'info';
                        break;
                    case 'READY':
                        statusText = '✅ HOÀN THÀNH';
                        notiType = 'success';
                        break;
                    default:
                        statusText = `📋 ${data.status}`;
                        notiType = 'info';
                }

                const tableInfo = data.tables?.join(', ') || '';
                const message = `${statusText}: ${data.itemName} - ${tableInfo}`;

                console.log("🔔 Hiển thị notification:", message);
                addNotification(message, notiType);
            } else {
                console.log("⏭ Bỏ qua - khác branchId");
            }
        };

        const handleItemCompleted = (data) => {
            console.log("✅ [WaiterLayout] item-completed:", data);
            if (data.branchId === branchId) {
                fetchUnreadCount();
                addNotification(`✅ Món hoàn thành: ${data.itemName || 'Món ăn'} - Bàn ${data.tableNumber || 'N/A'}`, 'success');
            }
        };

        const handleUpdateTables = () => {
            console.log("🔄 [WaiterLayout] update-tables");
            fetchUnreadCount();
        };

        socket.on("new-order", handleNewOrder);
        socket.on("order-updated", handleOrderUpdated);
        socket.on("update-order-item-status", handleUpdateOrderItemStatus);
        socket.on("item-completed", handleItemCompleted);
        socket.on("update-tables", handleUpdateTables);

        // Debug: Log tất cả events
        socket.onAny((event, ...args) => {
            if (event !== 'update-tables') { // Bỏ qua event quá nhiều
                console.log(`📡 [WaiterLayout] Event: "${event}"`, args);
            }
        });

        return () => {
            console.log("🧹 [WaiterLayout] Cleanup socket listeners");
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("new-order", handleNewOrder);
            socket.off("order-updated", handleOrderUpdated);
            socket.off("update-order-item-status", handleUpdateOrderItemStatus);
            socket.off("item-completed", handleItemCompleted);
            socket.off("update-tables", handleUpdateTables);
            socket.offAny();
        };
    }, [branchId, addNotification, user?.id]);

    // Tự động ẩn notification panel khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showNotificationPanel && !e.target.closest('#notification-panel') &&
                !e.target.closest('#notification-bell')) {
                setShowNotificationPanel(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showNotificationPanel]);

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return '🔔';
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
            {/* Header */}
            <div style={{
                background: '#1e293b',
                color: 'white',
                padding: '12px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>🍽️ Waiter</h2>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>| {user.username || 'Nhân viên phục vụ'}</span>
                    {user.branch && (
                        <span style={{
                            fontSize: 12,
                            background: '#334155',
                            padding: '4px 12px',
                            borderRadius: 20,
                            color: '#94a3b8'
                        }}>
                            🏢 {user.branch.name}
                        </span>
                    )}
                    <span style={{ fontSize: 10, color: socket.connected ? '#10b981' : '#ef4444' }}>
                        {socket.connected ? '🟢 Online' : '🔴 Offline'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Notification Bell */}
                    <div
                        id="notification-bell"
                        onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                        style={{
                            position: 'relative',
                            background: showNotificationPanel ? '#334155' : 'transparent',
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            border: '2px solid rgba(255,255,255,0.2)'
                        }}
                        onMouseEnter={(e) => {
                            if (!showNotificationPanel) e.currentTarget.style.background = '#334155';
                        }}
                        onMouseLeave={(e) => {
                            if (!showNotificationPanel) e.currentTarget.style.background = 'transparent';
                        }}
                        title="Thông báo"
                    >
                        <span style={{ fontSize: 22 }}>🔔</span>
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                background: '#ef4444',
                                color: 'white',
                                fontSize: 11,
                                fontWeight: 'bold',
                                minWidth: 20,
                                height: 20,
                                borderRadius: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                border: '2px solid #1e293b',
                                animation: 'pulse 2s infinite'
                            }}>
                                {notifications.length > 99 ? '99+' : notifications.length}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '6px 16px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer'
                        }}
                    >
                        🚪 Đăng xuất
                    </button>
                </div>
            </div>

            {/* Notification Panel */}
            {showNotificationPanel && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}>
                    <div
                        id="notification-panel"
                        style={{
                            position: 'fixed',
                            top: 70,
                            right: 24,
                            width: 420,
                            maxHeight: 500,
                            background: 'white',
                            borderRadius: 12,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            zIndex: 999,
                            overflow: 'hidden',
                            animation: 'slideDown 0.3s ease'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            background: '#1e293b',
                            color: 'white',
                            borderBottom: '2px solid #334155'
                        }}>
                            <h4 style={{ margin: 0, fontSize: 16 }}>🔔 Thông báo ({notifications.length})</h4>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {notifications.length > 0 && (
                                    <button onClick={() => setNotifications([])} style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white',
                                        padding: '4px 12px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>
                                        ✕ Xóa tất cả
                                    </button>
                                )}
                                <button onClick={() => setShowNotificationPanel(false)} style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    padding: 4,
                                    borderRadius: 4,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div style={{ maxHeight: 420, overflowY: 'auto', padding: 8 }}>
                            {notifications.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
                                    <p style={{ margin: 0 }}>Chưa có thông báo nào</p>
                                </div>
                            ) : (
                                notifications.map(noti => (
                                    <div key={noti.id} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 12,
                                        padding: 12,
                                        borderRadius: 8,
                                        marginBottom: 6,
                                        background: noti.type === 'success' ? '#f0fdf4' : noti.type === 'warning' ? '#fffbeb' : '#f9fafb',
                                        borderLeft: `4px solid ${noti.type === 'success' ? '#10b981' : noti.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                                        transition: 'all 0.2s',
                                        cursor: 'default'
                                    }}>
                                        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                                            {getNotificationIcon(noti.type)}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                                {noti.message}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                                {noti.timestamp.toLocaleTimeString('vi-VN')} - {noti.timestamp.toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Menu ngang */}
            <div style={{
                background: 'white',
                padding: '8px 24px',
                display: 'flex',
                gap: 8,
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
                {menuItems.map((item, index) => (
                    <button key={index} onClick={() => navigate(item.path)} style={{
                        position: 'relative',
                        padding: '8px 20px',
                        background: location.pathname === item.path ? '#f1f5f9' : 'transparent',
                        border: 'none',
                        color: '#1e293b',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: location.pathname === item.path ? 600 : 500
                    }}>
                        {item.label}
                        {item.path === "/waiter/kitchen" && unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                background: '#ef4444',
                                color: 'white',
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 10,
                                minWidth: 16,
                                textAlign: 'center'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Nội dung */}
            <div style={{ padding: 24 }}>
                <Outlet />
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default WaiterLayout;