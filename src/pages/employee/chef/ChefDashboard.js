import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChefHat, Clock, Play, Check, RefreshCw, Bell } from 'lucide-react';
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
    const [realTimeClock, setRealTimeClock] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Debounce cho notifications
    const lastNotificationKey = useRef('');
    const lastNotificationTime = useRef(0);

    const audioContextRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;

    // ========== AUDIO SETUP ==========
    const unlockAudio = useCallback(() => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            gain.gain.value = 0.001;
            oscillator.start();
            oscillator.stop(0.01);

            audioContext.resume().catch(err => {
                console.log("Failed to unlock audio:", err);
            });

            return true;
        } catch (err) {
            console.log("Audio unlock error:", err);
            return false;
        }
    }, []);

    useEffect(() => {
        const handleUserInteraction = () => {
            unlockAudio();
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('touchstart', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
        };

        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('touchstart', handleUserInteraction);
        document.addEventListener('keydown', handleUserInteraction);

        return () => {
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('touchstart', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
        };
    }, [unlockAudio]);

    const playNotificationSound = useCallback(() => {
        try {
            let audioContext = audioContextRef.current;

            if (!audioContext || audioContext.state === 'closed') {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContextClass();
                audioContextRef.current = audioContext;
            }

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

            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        } catch (err) {
            console.log("Sound error:", err);
        }
    }, []);

    // ========== HELPER FUNCTIONS ==========
    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    };

    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        const timestamp = new Date();
        setNotifications(prev => [{ id, message, type, timestamp }, ...prev]);

        playNotificationSound();

        if (Notification.permission === 'granted') {
            new Notification('🍽️ Nhà hàng thông báo', {
                body: message,
                icon: '/logo192.png'
            });
        }
    };

    // Helper lấy branchId từ item
    const getItemBranchId = useCallback((item) => {
        return item.order?.branch?.id ||
            item.order?.branchId ||
            item.branchId ||
            item.food?.branchId;
    }, []);

    // ========== FETCH DATA FUNCTION ==========
    const fetchData = useCallback(async (silent = false) => {
        if (!branchId) return;
        if (!silent) setLoading(true);
        try {
            const res = await kitchenAPI.getQueue();
            const items = Array.isArray(res.data) ? res.data : [];

            console.log('📦 First item:', items[0]);

            const mapped = items
                .filter(item => !item.branch?.id || item.branch?.id === branchId)
                .map(item => ({
                    id: item.id,
                    name: item.food?.name || 'Món ăn',
                    quantity: item.quantity || 1,
                    status: item.kitchenStatus || 'WAITING',
                    table: item.table?.number || '?',
                    createdAt: item.createdAt,
                    notes: item.notes || '',
                    orderId: item.orderId,
                    foodId: item.food?.id
                }));

            console.log('✅ Mapped:', mapped.length, 'items');
            setAllItems(mapped);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Fetch error:", err);
            showToast('❌ Lỗi tải dữ liệu', 'error');
        } finally {
            setLoading(false);
        }
    }, [branchId, getItemBranchId]);

    // Clear data khi branch thay đổi
    useEffect(() => {
        if (branchId) {
            console.log(`🔄 Branch changed to: ${branchId}, clearing old data`);
            setAllItems([]);
            fetchData();
        }
    }, [branchId, fetchData]);

    // ========== SPEECH FUNCTION ==========
    const speakVietnamese = (text) => {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        utterance.volume = 1;

        const speak = () => {
            const voices = window.speechSynthesis.getVoices();
            const vietnameseVoice = voices.find(voice =>
                voice.lang === 'vi-VN' || voice.lang === 'vi' || voice.name.includes('Vietnamese')
            );

            if (vietnameseVoice) {
                utterance.voice = vietnameseVoice;
            }

            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            speak();
        } else {
            window.speechSynthesis.onvoiceschanged = speak;
        }
    };

    // ========== SOCKET EVENT HANDLERS ==========
    useEffect(() => {
        const handleNewOrder = (orderData) => {
            const notiKey = `${orderData.orderId}_${orderData.tableNumber}_${JSON.stringify(orderData.items)}`;
            const now = Date.now();

            if (notiKey === lastNotificationKey.current && (now - lastNotificationTime.current) < 500) {
                return;
            }

            lastNotificationKey.current = notiKey;
            lastNotificationTime.current = now;

            if (orderData.branchId && branchId && orderData.branchId !== branchId) return;

            playNotificationSound();
            fetchData();

            if (orderData.items && orderData.items.length > 0) {
                const areaName = orderData.areaName || "Khu chính";
                const locationName = orderData.locationName || `Bàn ${orderData.tableNumber}`;
                const fullLocation = `${areaName} - ${locationName}`;
                const itemDetails = orderData.items.map(item => `${item.name} x${item.quantity}`).join(', ');
                const message = `📋 ĐƠN MỚI - ${fullLocation}: ${itemDetails}`;

                showToast(message, 'info');
                addNotification(message, 'order');

                const speechText = `Đơn hàng mới tại ${areaName} ${locationName}: ${orderData.items.map(item =>
                    `${item.name} ${item.quantity === 1 ? 'một phần' : `${item.quantity} phần`}`
                ).join(', ')}`;

                speakVietnamese(speechText);
            }
        };

        const handleOrderUpdated = (data) => {
            const notiKey = `${data.orderId}_${data.tableNumber}_${JSON.stringify(data.items)}`;
            const now = Date.now();

            if (notiKey === lastNotificationKey.current && (now - lastNotificationTime.current) < 500) {
                return;
            }

            lastNotificationKey.current = notiKey;
            lastNotificationTime.current = now;

            if (data.branchId && branchId && data.branchId !== branchId) return;

            playNotificationSound();
            fetchData();

            if (data.items && data.items.length > 0) {
                const areaName = data.areaName || "Khu chính";
                const locationName = data.locationName || `Bàn ${data.tableNumber}`;
                const fullLocation = `${areaName} - ${locationName}`;
                const itemDetails = data.items.map(item => `${item.name} x${item.quantity}`).join(', ');
                const message = `➕ ${fullLocation}: ${itemDetails}`;

                showToast(message, 'info');
                addNotification(message, 'item');

                const speechText = `Thêm món mới tại ${areaName} ${locationName}: ${data.items.map(item =>
                    `${item.name} ${item.quantity === 1 ? 'một phần' : `${item.quantity} phần`}`
                ).join(', ')}`;

                speakVietnamese(speechText);
            }
        };

        const handleUpdateTables = () => {
            fetchData();
        };

        const handleItemUpdated = () => {
            fetchData();
        };

        const registerKitchen = () => {
            if (socket.connected) {
                socket.emit('register-role', {
                    role: 'kitchen',
                    userId: user?.id,
                    branchId: branchId
                });
                setIsSocketConnected(true);
                fetchData();
            }
        };

        socket.on("new-order", handleNewOrder);
        socket.on("update-order-status", handleOrderUpdated);
        socket.on("update-tables", handleUpdateTables);
        socket.on("order-item-updated", handleItemUpdated);
        socket.on('connect', () => {
            setIsSocketConnected(true);
            registerKitchen();
        });
        socket.on('disconnect', () => {
            setIsSocketConnected(false);
            showToast('🔴 Mất kết nối real-time', 'warning');
        });

        if (socket.connected) {
            registerKitchen();
        }

        return () => {
            socket.off("new-order", handleNewOrder);
            socket.off("update-order-status", handleOrderUpdated);
            socket.off("update-tables", handleUpdateTables);
            socket.off("order-item-updated", handleItemUpdated);
            socket.off('connect');
            socket.off('disconnect');
        };
    }, [fetchData, branchId, user?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchData(true);
        }, 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    // ========== UPDATE STATUS FUNCTION ==========
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

            if (status === 'READY') {
                const areaName = "Khu chính";
                const message = `✅ Hoàn thành món ${itemName} (${areaName} - Bàn ${tableNumber})`;
                showToast(message, 'success');
                addNotification(message, 'success');
            }

        } catch (err) {
            console.error('Update error:', err.response?.status, err.response?.data);
            const errorMsg = err.response?.data?.message || err.response?.data || err.message;
            showToast(`❌ Update thất bại: ${errorMsg}`, 'error');
        } finally {
            setUpdatingId(null);
            setItemUpdating(prev => ({ ...prev, [id]: false }));
        }
    };

    // ========== HELPER FUNCTIONS ==========
    const getElapsedTime = (createdAt) => {
        if (!createdAt) return '0 giây';
        const elapsed = Math.floor((currentTime - new Date(createdAt).getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        if (minutes < 1) return `${seconds} giây`;
        if (minutes < 60) return `${minutes} phút ${seconds} giây`;
        return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
    };

    const isOverdue = useCallback((createdAt) => {
        if (!createdAt) return false;
        return (currentTime - new Date(createdAt)) / 60000 > 15;
    }, [currentTime]);

    const getTimeColor = (createdAt) => {
        if (!createdAt) return '#6b7280';
        const diffInMinutes = (currentTime - new Date(createdAt).getTime()) / 60000;

        if (diffInMinutes > 15) return '#ef4444';
        if (diffInMinutes > 10) return '#f59e0b';
        if (diffInMinutes > 5) return '#fbbf24';
        return '#10b981';
    };

    // ========== FILTER & SORT ==========
    const filtered = allItems.filter(i => {
        if (activeTab === 'WAITING') return i.status === 'WAITING';
        if (activeTab === 'PREPARING') return i.status === 'PREPARING';
        return true;
    });

    const sortedItems = [...filtered].sort((a, b) => {
        const aDiff = (currentTime - new Date(a.createdAt).getTime()) / 60000;
        const bDiff = (currentTime - new Date(b.createdAt).getTime()) / 60000;

        const aOverdue = aDiff > 15;
        const bOverdue = bDiff > 15;
        if (aOverdue !== bOverdue) {
            return aOverdue ? -1 : 1;
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

    // ========== RENDER ==========
    return (
        <div className={styles.container}>
            {!isSocketConnected && (
                <div className={styles.warningBanner}>
                    ⚠️ Đang mất kết nối real-time. Đơn hàng mới có thể không hiển thị ngay!
                </div>
            )}

            {showIngredientWarning && branchId && (
                <IngredientWarning
                    branchId={branchId}
                    onClose={() => setShowIngredientWarning(false)}
                    autoRefresh={true}
                />
            )}

            <div className={styles.header}>
                <div className={styles.headerCenter}>
                    <div className={styles.clock}>
                        <Clock size={16} />
                        <span className={styles.time}>{realTimeClock.toLocaleTimeString('vi-VN')}</span>
                        <span className={styles.date}>{realTimeClock.toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div
                        className={styles.notificationBell}
                        onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </div>
                </div>
            </div>

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
                                    <div className={styles.notificationMessage}>{noti.message}</div>
                                    <div className={styles.notificationTime}>
                                        {noti.timestamp?.toLocaleTimeString('vi-VN')}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${counts.WAITING > 0 ? styles.hasWaiting : ''}`}>
                    <div className={styles.statValue}>{counts.WAITING}</div>
                    <div className={styles.statLabel}>⏳ Chờ làm</div>
                </div>
                <div className={`${styles.statCard} ${counts.PREPARING > 0 ? styles.hasPreparing : ''}`}>
                    <div className={styles.statValue}>{counts.PREPARING}</div>
                    <div className={styles.statLabel}>🔥 Đang nấu</div>
                </div>
                <div className={`${styles.statCard} ${counts.OVERDUE > 0 ? styles.hasOverdue : ''}`}>
                    <div className={styles.statValue}>{counts.OVERDUE}</div>
                    <div className={styles.statLabel}>⚠️ Quá hạn</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{counts.ALL}</div>
                    <div className={styles.statLabel}>📋 Tổng món</div>
                </div>
            </div>

            <div className={styles.tabsContainer}>
                {[
                    { key: 'ALL', label: '📋 Tất cả', count: counts.ALL },
                    { key: 'WAITING', label: '⏳ Món mới', count: counts.WAITING },
                    { key: 'PREPARING', label: '🔥 Đang làm', count: counts.PREPARING }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`${styles.tab} ${activeTab === tab.key ? styles.activeTab : ''}`}
                    >
                        {tab.label}
                        <span className={styles.tabCount}>({tab.count})</span>
                    </button>
                ))}
            </div>

            <div className={styles.refreshSection}>
                <button onClick={fetchData} disabled={loading} className={styles.refreshBtn}>
                    <RefreshCw size={16} className={loading ? styles.spinning : ''} />
                    Làm mới
                </button>
                {lastUpdated && (
                    <span className={styles.lastUpdated}>
                        Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')}
                    </span>
                )}
            </div>

            {loading ? (
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            ) : sortedItems.length === 0 ? (
                <div className={styles.emptyState}>
                    <ChefHat size={64} className={styles.emptyIcon} />
                    <p>Không có món ăn nào trong danh sách</p>
                    <p className={styles.emptySubtext}>Chờ đơn hàng từ quầy...</p>
                </div>
            ) : (
                <div className={styles.itemsGrid}>
                    {sortedItems.map(item => {
                        const timeColor = getTimeColor(item.createdAt);
                        const overdue = isOverdue(item.createdAt);
                        const isUpdatingItem = itemUpdating[item.id];

                        return (
                            <div
                                key={item.id}
                                className={`${styles.orderItem} ${overdue ? styles.overdueItem : ''} ${isUpdatingItem ? styles.updatingItem : ''}`}
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

                                <div className={styles.itemDetails}>
                                    <span className={styles.itemQuantity}>
                                        📦 Số lượng: <strong>{item.quantity}</strong>
                                    </span>
                                </div>

                                {item.notes && <p className={styles.itemNotes}>📝 {item.notes}</p>}

                                <div className={styles.itemFooter}>
                                    <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                        {item.status === 'WAITING' ? '⏳ Chờ làm' : '🔪 Đang nấu'}
                                    </span>

                                    <div className={styles.actionButtons}>
                                        {item.status === 'WAITING' && (
                                            <button
                                                className={styles.startBtn}
                                                disabled={isUpdatingItem}
                                                onClick={() => updateStatus(item.id, 'PREPARING', item.name, item.table)}
                                            >
                                                <Play size={14} /> Bắt đầu
                                            </button>
                                        )}

                                        {item.status === 'PREPARING' && (
                                            <button
                                                className={styles.completeBtn}
                                                disabled={isUpdatingItem}
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

            <div className={styles.toastContainer}>
                {toasts.map(toast => (
                    <ToastNotification
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ChefDashboard;