// WaiterLayout.js - MENU CÙNG HÀNG HEADER
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
const API = "http://localhost:8080";

// Key lưu trong localStorage
const NOTIFICATIONS_KEY = 'waiter_notifications';

const WaiterLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;

    const [unreadCount, setUnreadCount] = useState(0);

    // ===== KHÔI PHỤC NOTIFICATIONS TỪ LOCALSTORAGE KHI MOUNT =====
    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem(NOTIFICATIONS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
            }
        } catch (e) {
            console.error("Lỗi đọc notifications từ localStorage:", e);
        }
        return [];
    });

    const [showNotificationPanel, setShowNotificationPanel] = useState(false);

    // ===== LƯU NOTIFICATIONS VÀO LOCALSTORAGE =====
    useEffect(() => {
        try {
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
        } catch (e) {
            console.error("Lỗi lưu notifications:", e);
        }
    }, [notifications]);

    // Phát âm thanh thông báo
    const playNotificationSound = useCallback(() => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContextClass();
            const now = audioContext.currentTime;

            const osc1 = audioContext.createOscillator();
            const gain1 = audioContext.createGain();
            osc1.connect(gain1);
            gain1.connect(audioContext.destination);
            osc1.frequency.value = 880;
            gain1.gain.value = 0.3;
            osc1.start(now);
            gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.2);
            osc1.stop(now + 0.2);

            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 660;
            gain2.gain.value = 0.3;
            osc2.start(now + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.35);
            osc2.stop(now + 0.35);
        } catch (err) {
            console.log("Sound error:", err);
        }
    }, []);

    // Thêm thông báo mới
    const addNotification = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        const timestamp = new Date();

        setNotifications(prev => {
            const newNotifications = [{ id, message, type, timestamp }, ...prev];
            return newNotifications.slice(0, 50);
        });
        playNotificationSound();
    }, [playNotificationSound]);

    // ===== NHẬN NOTIFICATIONS TỪ PAYMENT SUCCESS (CÙNG TAB) =====
    useEffect(() => {
        const handleWaiterNotification = (event) => {
            const { message, type, timestamp } = event.detail;
            const id = Date.now() + Math.random();

            console.log('🔔 WaiterLayout nhận notification từ PaymentSuccess:', { message, type });

            setNotifications(prev => [{
                id,
                message,
                type: type || 'info',
                timestamp: new Date(timestamp || Date.now())
            }, ...prev].slice(0, 50));

            playNotificationSound();
        };

        window.addEventListener('waiter-notification', handleWaiterNotification);

        return () => {
            window.removeEventListener('waiter-notification', handleWaiterNotification);
        };
    }, [playNotificationSound]);

    // ===== LẮNG NGHE PAYMENT SUCCESS QUA SOCKET (GIỮA CÁC TAB/TRÌNH DUYỆT) =====
    useEffect(() => {
        if (!branchId) return;

        const handlePaymentSuccess = (data) => {
            if (data.branchId === branchId) {
                console.log('💰 [Waiter] Nhận payment success qua socket:', data);
                addNotification(`💰 ${data.entityType} ${data.entityNumber} đã thanh toán thành công${data.amount || ''}`, 'success');

                // Lưu vào localStorage
                const saved = localStorage.getItem(NOTIFICATIONS_KEY);
                const current = saved ? JSON.parse(saved) : [];
                const newNoti = {
                    id: Date.now() + Math.random(),
                    message: `💰 ${data.entityType} ${data.entityNumber} đã thanh toán thành công${data.amount || ''}`,
                    type: 'success',
                    timestamp: new Date().toISOString()
                };
                current.unshift(newNoti);
                localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(current.slice(0, 50)));
            }
        };

        socket.on("payment-success", handlePaymentSuccess);

        return () => {
            socket.off("payment-success", handlePaymentSuccess);
        };
    }, [branchId, addNotification]);

    // ===== LẮNG NGHE THAY ĐỔI LOCALSTORAGE TỪ TAB KHÁC (DỰ PHÒNG) =====
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === NOTIFICATIONS_KEY && e.newValue) {
                try {
                    const newNotifications = JSON.parse(e.newValue);
                    console.log('📦 [Waiter] Nhận notification từ storage change:', newNotifications);
                    setNotifications(newNotifications.map(n => ({
                        ...n,
                        timestamp: new Date(n.timestamp)
                    })));
                    playNotificationSound();
                } catch (err) {
                    console.error("Lỗi parse storage data:", err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [playNotificationSound]);

    const menuItems = [
        { label: "🍽️ Gọi món", path: "/waiter/orders" },
        { label: "👨‍🍳 Theo dõi bếp", path: "/waiter/kitchen" },
        { label: "📅 Ca làm", path: "/waiter/shift" },
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };

    const handleLogout = () => {
        localStorage.removeItem(NOTIFICATIONS_KEY);
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

    // ========== SOCKET ==========
    useEffect(() => {
        if (!branchId) return;

        fetchUnreadCount();

        const registerAsWaiter = () => {
            socket.emit("register-role", {
                role: "waiter",
                userId: user?.id,
                branchId: branchId
            });
        };

        if (socket.connected) registerAsWaiter();

        const handleConnect = () => registerAsWaiter();
        socket.on("connect", handleConnect);

        const handleNewOrder = (data) => {
            if (data.branchId === branchId) {
                fetchUnreadCount();
                const locationName = data.locationName || `Bàn ${data.tableNumber}`;
                const itemList = data.items?.map(item => `${item.name} x${item.quantity}`).join(', ') || '';
                addNotification(`🆕 Đơn mới - ${locationName}: ${itemList}`, 'info');
            }
        };

        const handleOrderUpdated = (data) => {
            if (data.branchId === branchId) {
                fetchUnreadCount();
                const locationName = data.locationName || `Bàn ${data.tableNumber}`;
                const itemList = data.items?.map(item => `${item.name} x${item.quantity}`).join(', ') || '';
                addNotification(`➕ Thêm món - ${locationName}: ${itemList}`, 'info');
            }
        };

        const handleUpdateOrderItemStatus = (data) => {
            if (data.branchId === branchId) {
                let statusText, notiType;
                switch (data.status) {
                    case 'PREPARING': statusText = '🔪 ĐANG NẤU'; notiType = 'info'; break;
                    case 'READY': statusText = '✅ HOÀN THÀNH'; notiType = 'success'; break;
                    default: statusText = `📋 ${data.status}`; notiType = 'info';
                }
                const tableInfo = data.tables?.join(', ') || '';
                addNotification(`${statusText}: ${data.itemName} - ${tableInfo}`, notiType);
            }
        };

        const handleItemCompleted = (data) => {
            if (data.branchId === branchId) {
                fetchUnreadCount();
                addNotification(`✅ Món hoàn thành: ${data.itemName || 'Món ăn'}`, 'success');
            }
        };

        const handleUpdateTables = () => fetchUnreadCount();

        socket.on("new-order", handleNewOrder);
        socket.on("order-updated", handleOrderUpdated);
        socket.on("update-order-item-status", handleUpdateOrderItemStatus);
        socket.on("item-completed", handleItemCompleted);
        socket.on("update-tables", handleUpdateTables);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("new-order", handleNewOrder);
            socket.off("order-updated", handleOrderUpdated);
            socket.off("update-order-item-status", handleUpdateOrderItemStatus);
            socket.off("item-completed", handleItemCompleted);
            socket.off("update-tables", handleUpdateTables);
        };
    }, [branchId, addNotification]);

    // Click outside để đóng panel
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
            {/* ===== HEADER + MENU CÙNG HÀNG ===== */}
            <div style={{
                background: '#1e293b',
                color: 'white',
                padding: '12px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
                {/* Left: Logo + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>🍽️ Waiter</h2>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>| {user.username || 'Nhân viên'}</span>
                    {user.branch && (
                        <span style={{
                            fontSize: 12, background: '#334155', padding: '4px 12px',
                            borderRadius: 20, color: '#94a3b8'
                        }}>
                            🏢 {user.branch.name}
                        </span>
                    )}
                </div>

                {/* Center: Menu Items - NẰM CÙNG HÀNG */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => navigate(item.path)}
                            style={{
                                position: 'relative',
                                padding: '8px 18px',
                                background: isActive(item.path) ? '#f59e0b' : 'transparent',
                                border: isActive(item.path) ? 'none' : '1px solid rgba(255,255,255,0.2)',
                                color: isActive(item.path) ? '#1e293b' : 'white',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: isActive(item.path) ? 600 : 500,
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive(item.path)) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive(item.path)) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            {item.label}
                            {/* Badge cho Kitchen */}
                            {item.path === "/waiter/kitchen" && unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: -6, right: -6,
                                    background: '#ef4444', color: 'white',
                                    fontSize: 10, fontWeight: 'bold',
                                    padding: '2px 6px', borderRadius: 10,
                                    minWidth: 18, textAlign: 'center',
                                    border: '2px solid #1e293b'
                                }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Right: Notification + Logout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Notification Bell */}
                    <div
                        id="notification-bell"
                        onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                        style={{
                            position: 'relative',
                            background: showNotificationPanel ? '#334155' : 'transparent',
                            width: 42, height: 42, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            border: '2px solid rgba(255,255,255,0.2)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!showNotificationPanel) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!showNotificationPanel) {
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        <span style={{ fontSize: 22 }}>🔔</span>
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                background: '#ef4444', color: 'white',
                                fontSize: 11, fontWeight: 'bold',
                                minWidth: 20, height: 20, borderRadius: 10,
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', padding: '0 4px',
                                border: '2px solid #1e293b',
                            }}>
                                {notifications.length > 99 ? '99+' : notifications.length}
                            </span>
                        )}
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#fca5a5',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 14,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            e.currentTarget.style.color = '#fca5a5';
                        }}
                    >
                        🚪 Đăng xuất
                    </button>
                </div>
            </div>

            {/* ===== NOTIFICATION PANEL ===== */}
            {showNotificationPanel && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}>
                    <div id="notification-panel" style={{
                        position: 'fixed', top: 70, right: 24, width: 420, maxHeight: 500,
                        background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        zIndex: 999, overflow: 'hidden',
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '16px 20px', background: '#1e293b', color: 'white',
                            borderBottom: '2px solid #334155'
                        }}>
                            <h4 style={{ margin: 0, fontSize: 16 }}>
                                🔔 Thông báo ({notifications.length})
                            </h4>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {notifications.length > 0 && (
                                    <button onClick={() => setNotifications([])} style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white', padding: '4px 12px',
                                        borderRadius: 6, fontSize: 12, cursor: 'pointer',
                                    }}>
                                        ✕ Xóa tất cả
                                    </button>
                                )}
                                <button onClick={() => setShowNotificationPanel(false)} style={{
                                    background: 'transparent', border: 'none',
                                    color: 'white', cursor: 'pointer', fontSize: 18,
                                }}>
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div style={{ maxHeight: 420, overflowY: 'auto', padding: 8 }}>
                            {notifications.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
                                    <p>Chưa có thông báo nào</p>
                                </div>
                            ) : (
                                notifications.map(noti => (
                                    <div key={noti.id} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 12,
                                        padding: 12, borderRadius: 8, marginBottom: 6,
                                        background: noti.type === 'success' ? '#f0fdf4' :
                                            noti.type === 'warning' ? '#fffbeb' : '#f9fafb',
                                        borderLeft: `4px solid ${noti.type === 'success' ? '#10b981' :
                                            noti.type === 'warning' ? '#f59e0b' : '#3b82f6'
                                            }`,
                                    }}>
                                        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                                            {getNotificationIcon(noti.type)}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 13, color: '#1f2937',
                                                lineHeight: 1.5, wordBreak: 'break-word'
                                            }}>
                                                {noti.message}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                                {noti.timestamp.toLocaleTimeString('vi-VN')} - {' '}
                                                {noti.timestamp.toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MAIN CONTENT ===== */}
            <div style={{ padding: 24 }}>
                <Outlet />
            </div>
        </div>
    );
};

export default WaiterLayout;