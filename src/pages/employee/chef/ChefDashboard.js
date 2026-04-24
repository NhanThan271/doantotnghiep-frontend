import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChefHat, Clock, Play, Check, RefreshCw, Bell, Wifi, WifiOff } from 'lucide-react';
import { kitchenAPI } from '../../../services/api';
import ToastNotification from './ToastNotification';
import IngredientWarning from './IngredientWarning';
import styles from './ChefDashboard.module.css';
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

const playNotificationSound = () => {
    try {
        const audio = new Audio('/notification.mp3');
        audio.onerror = () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.3;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
            oscillator.stop(audioContext.currentTime + 0.5);
            audioContext.resume();
        };
        audio.play().catch(err => console.log("Audio play failed:", err));
    } catch (err) {
        console.log("Sound not supported");
    }
};

const ChefDashboard = () => {
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('ALL');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [updatingId, setUpdatingId] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);
    const [showIngredientWarning, setShowIngredientWarning] = useState(true);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [itemUpdating, setItemUpdating] = useState({});

    // ⏰ REAL-TIME STATES
    const [realTimeClock, setRealTimeClock] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(Date.now());

    const audioRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;

    // ⏰ REAL-TIME CLOCK - Cập nhật mỗi giây
    useEffect(() => {
        const timer = setInterval(() => {
            setRealTimeClock(new Date());
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [{ id, message, type, timestamp: new Date() }, ...prev]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);

        playNotificationSound();

        if (Notification.permission === 'granted') {
            new Notification('🍽️ Nhà hàng thông báo', {
                body: message,
                icon: '/logo192.png'
            });
        }
    };

    useEffect(() => {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    // 📌 ĐĂNG KÝ KITCHEN ROLE
    useEffect(() => {
        const registerKitchen = () => {
            if (socket.connected) {
                socket.emit('register-role', {
                    role: 'kitchen',
                    userId: user?.id,
                    branchId: branchId
                });
                console.log('🔪 Kitchen registered:', socket.id, 'Branch:', branchId);
                setIsSocketConnected(true);
            }
        };

        const handleConnect = () => {
            console.log('✅ Socket connected:', socket.id);
            setIsSocketConnected(true);
            registerKitchen();
            showToast('🟢 Kết nối real-time đã sẵn sàng', 'success');
            fetchData();
        };

        const handleDisconnect = () => {
            console.log('❌ Socket disconnected');
            setIsSocketConnected(false);
            showToast('🔴 Mất kết nối real-time, đang thử kết nối lại...', 'warning');
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        if (!socket.connected) {
            socket.connect();
        } else {
            registerKitchen();
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, [branchId, user?.id]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await kitchenAPI.getQueue();
            const items = Array.isArray(res.data) ? res.data : [];

            const mapped = items.map(item => ({
                id: item.id,
                name: item.food?.name || 'Món ăn',
                quantity: item.quantity,
                status: item.kitchenStatus,
                table: item.order?.table?.number || item.order?.id || '?',
                createdAt: item.createdAt,
                notes: item.notes || '',
                orderId: item.orderId,
                foodId: item.foodId
            }));

            setAllItems(mapped);
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
            showToast('❌ Lỗi tải dữ liệu', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // LẮNG NGHE SOCKET
    useEffect(() => {
        const handleNewOrder = (orderData) => {
            console.log("🆕 Đơn hàng mới:", orderData);
            fetchData();
            const tableNumber = orderData.table?.number || orderData.tableNumber;
            const message = `📋 Đơn hàng mới từ bàn ${tableNumber}`;
            showToast(message, 'info');
            addNotification(message, 'order');
        };

        const handleItemsAdded = (data) => {
            console.log("🆕 Món mới được thêm:", data);
            fetchData();
            const itemNames = data.items?.map(i => i.name).join(', ') || '';
            const message = `➕ Thêm món cho bàn ${data.tableNumber}: ${itemNames}`;
            showToast(message, 'info');
            addNotification(message, 'item');
        };

        const handleUpdateTables = () => {
            console.log("🔄 Cập nhật bàn, refresh dữ liệu bếp...");
            fetchData();
        };

        const handleItemUpdated = (itemData) => {
            console.log("🍳 Cập nhật món từ bếp khác:", itemData);
            fetchData();
        };

        socket.on("new-order", handleNewOrder);
        socket.on("order-items-added", handleItemsAdded);
        socket.on("update-tables", handleUpdateTables);
        socket.on("order-item-updated", handleItemUpdated);

        return () => {
            socket.off("new-order", handleNewOrder);
            socket.off("order-items-added", handleItemsAdded);
            socket.off("update-tables", handleUpdateTables);
            socket.off("order-item-updated", handleItemUpdated);
        };
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateStatus = async (id, status, itemName, tableNumber) => {
        setUpdatingId(id);
        setItemUpdating(prev => ({ ...prev, [id]: true }));

        try {
            await kitchenAPI.updateItemStatus(id, status);
            await fetchData();

            socket.emit("update-order-item-status", {
                itemId: id,
                status: status,
                itemName: itemName,
                tableNumber: tableNumber,
                branchId: branchId,
                timestamp: new Date().toISOString()
            });

            socket.emit("update-tables");

            showToast(`✅ Đã ${status === 'PREPARING' ? 'bắt đầu nấu' : 'hoàn thành'} món ${itemName}`, 'success');

            if (status === 'READY') {
                addNotification(`✅ Món ${itemName} (Bàn ${tableNumber}) đã hoàn thành!`, 'success');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            showToast(`❌ Update thất bại: ${errorMsg}`, 'error');
        } finally {
            setUpdatingId(null);
            setItemUpdating(prev => ({ ...prev, [id]: false }));
        }
    };

    // ⏰ HÀM LẤY THỜI GIAN REAL-TIME
    const getElapsedTime = (createdAt) => {
        const elapsed = Math.floor((currentTime - new Date(createdAt).getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        if (minutes < 1) return `${seconds} giây`;
        if (minutes < 60) return `${minutes} phút`;
        return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
    };

    // ⏰ KIỂM TRA QUÁ HẠN REAL-TIME
    const isOverdue = useCallback((createdAt) => {
        return (currentTime - new Date(createdAt)) / 60000 > 15;
    }, [currentTime]);

    // ⏰ LẤY MÀU THEO THỜI GIAN
    const getTimeColor = (createdAt) => {
        const diffInMinutes = (currentTime - new Date(createdAt).getTime()) / 60000;

        if (diffInMinutes > 15) return '#ef4444';
        if (diffInMinutes > 10) return '#f59e0b';
        if (diffInMinutes > 5) return '#fbbf24';
        return '#10b981';
    };

    const filtered = allItems.filter(i => {
        if (activeTab === 'WAITING') return i.status === 'WAITING';
        if (activeTab === 'PREPARING') return i.status === 'PREPARING';
        return true;
    });

    // Sort với real-time
    const sortedItems = [...filtered].sort((a, b) => {
        const aDiff = (currentTime - new Date(a.createdAt).getTime()) / 60000;
        const bDiff = (currentTime - new Date(b.createdAt).getTime()) / 60000;

        if ((aDiff > 15) !== (bDiff > 15)) {
            return aDiff > 15 ? -1 : 1;
        }
        if (a.status !== b.status) {
            return a.status === 'WAITING' ? -1 : 1;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const counts = {
        ALL: allItems.length,
        WAITING: allItems.filter(i => i.status === 'WAITING').length,
        PREPARING: allItems.filter(i => i.status === 'PREPARING').length,
        OVERDUE: allItems.filter(i => isOverdue(i.createdAt)).length
    };

    const unreadCount = notifications.length;

    return (
        <div className={styles.container}>
            {showIngredientWarning && branchId && (
                <IngredientWarning
                    branchId={branchId}
                    onClose={() => setShowIngredientWarning(false)}
                    autoRefresh={true}
                />
            )}

            {/* ==================== HEADER ĐƠN GIẢN ==================== */}
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '2px'
                        }}>
                            <span style={{
                                fontFamily: 'monospace',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: '#1f2937',
                                letterSpacing: '1px'
                            }}>
                                {realTimeClock.toLocaleTimeString('vi-VN')}
                            </span>
                            <span style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                background: '#f3f4f6',
                                padding: '2px 6px',
                                borderRadius: '4px'
                            }}>
                                {realTimeClock.toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: '#f8fafc',
                        padding: '6px 12px',
                        borderRadius: '8px'
                    }}>
                        <div
                            className={styles.notificationIcon}
                            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* NOTIFICATION PANEL */}
            {showNotificationPanel && (
                <div className={styles.notificationPanel}>
                    <div className={styles.notificationHeader}>
                        <h4>Thông báo</h4>
                        <button onClick={() => setNotifications([])}>Xóa tất cả</button>
                    </div>
                    <div className={styles.notificationList}>
                        {notifications.length === 0 ? (
                            <p className={styles.noNotification}>Chưa có thông báo</p>
                        ) : (
                            notifications.map(noti => (
                                <div key={noti.id} className={`${styles.notificationItem} ${styles[noti.type]}`}>
                                    <span>{noti.message}</span>
                                    <small>{noti.timestamp?.toLocaleTimeString()}</small>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* OVERVIEW STATS */}
            <div className={styles.stats}>
                <div className={styles.card}>
                    <div className={styles.cardValue}>{counts.WAITING}</div>
                    <div className={styles.cardLabel}>⏳ Chờ làm</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardValue}>{counts.PREPARING}</div>
                    <div className={styles.cardLabel}>🔥 Đang nấu</div>
                </div>
                <div className={`${styles.card} ${counts.OVERDUE > 0 ? styles.cardWarning : ''}`}>
                    <div className={styles.cardValue}>{counts.OVERDUE}</div>
                    <div className={styles.cardLabel}>⚠️ Quá hạn</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardValue}>{counts.ALL}</div>
                    <div className={styles.cardLabel}>📋 Tổng món</div>
                </div>
            </div>

            {/* TABS FILTER */}
            <div className={styles.tabs}>
                {['ALL', 'WAITING', 'PREPARING'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                    >
                        {tab === 'ALL' ? '📋 Tất cả' : tab === 'WAITING' ? '⏳ Món mới' : '🔥 Đang làm'}
                        <span className={styles.tabCount}>({counts[tab]})</span>
                    </button>
                ))}
            </div>

            {/* REFRESH BUTTON */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className={styles.refreshBtn}
                >
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* ITEMS LIST */}
            {loading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            ) : sortedItems.length === 0 ? (
                <div className={styles.emptyState}>
                    <ChefHat size={48} style={{ opacity: 0.5 }} />
                    <p>Không có món ăn nào trong danh sách</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {sortedItems.map(item => {
                        const timeColor = getTimeColor(item.createdAt);
                        const overdue = isOverdue(item.createdAt);

                        return (
                            <div
                                key={item.id}
                                className={`${styles.item} ${overdue ? styles.overdue : ''} ${itemUpdating[item.id] ? styles.updating : ''}`}
                            >
                                <div className={styles.itemHeader}>
                                    <div className={styles.tableInfo}>
                                        <span className={styles.tableBadge}>🪑 Bàn {item.table}</span>
                                        {overdue && <span className={styles.overdueBadge}>Quá hạn!</span>}
                                    </div>
                                    <div className={styles.timeInfo} style={{ color: timeColor }}>
                                        <Clock size={12} />
                                        <span>{getElapsedTime(item.createdAt)}</span>
                                    </div>
                                </div>

                                <h3 className={styles.itemName}>{item.name}</h3>
                                <p className={styles.itemQuantity}>
                                    Số lượng: <strong>{item.quantity}</strong>
                                </p>

                                {item.notes && <p className={styles.note}>📝 {item.notes}</p>}

                                <div className={styles.itemFooter}>
                                    <span className={`${styles.status} ${styles[item.status]}`}>
                                        {item.status === 'WAITING' ? '⏳ Chờ làm' : '🔵 Đang nấu'}
                                    </span>

                                    <div className={styles.actions}>
                                        {item.status === 'WAITING' && (
                                            <button
                                                className={styles.startBtn}
                                                disabled={updatingId === item.id}
                                                onClick={() => updateStatus(item.id, 'PREPARING', item.name, item.table)}
                                            >
                                                <Play size={14} /> Bắt đầu nấu
                                            </button>
                                        )}

                                        {item.status === 'PREPARING' && (
                                            <button
                                                className={styles.completeBtn}
                                                disabled={updatingId === item.id}
                                                onClick={() => updateStatus(item.id, 'READY', item.name, item.table)}
                                            >
                                                <Check size={14} /> Hoàn thành
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TOAST NOTIFICATIONS */}
            <div className={styles.toast}>
                {toasts.map(t => (
                    <ToastNotification
                        key={t.id}
                        message={t.message}
                        type={t.type}
                        onClose={() => removeToast(t.id)}
                    />
                ))}
            </div>

            <style>{`
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ChefDashboard;