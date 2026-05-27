import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChefHat,
    Clock,
    Play,
    Check,
    RefreshCw,
    Bell,
    AlertCircle,
    X,
    Loader2,
    Package,
    Utensils,
    MapPin,
    FileText,
    Users
} from 'lucide-react';
import { kitchenAPI } from '../../../services/api';
import ToastNotification from './ToastNotification';
import IngredientWarning from './IngredientWarning';
import styles from './ChefDashboard.module.css';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

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

    const lastNotificationKey = useRef('');
    const lastNotificationTime = useRef(0);
    const audioContextRef = useRef(null);
    const socketRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;
    const API_BASE_URL = 'http://localhost:8080';

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
            new Notification('Nhà hàng thông báo', {
                body: message,
                icon: '/logo192.png'
            });
        }
    };

    const fetchData = useCallback(async (silent = false) => {
        if (!branchId) return;
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/kitchen-order-items/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const items = await response.json();
            const data = Array.isArray(items) ? items : [];

            // GỘP MÓN THEO TÊN VÀ TRẠNG THÁI
            const groupedMap = new Map();

            data
                .filter(item => !item.branch?.id || item.branch?.id === branchId)
                .forEach(item => {
                    let displayLocation = 'Khu vực chung';
                    let tableNumber = null;
                    if (item.table && item.table.number) {
                        displayLocation = `Bàn ${item.table.number}`;
                        tableNumber = item.table.number;
                    } else if (item.orderId && !displayLocation) {
                        displayLocation = `Đơn #${item.orderId}`;
                    }

                    const foodName = item.food?.name || 'Món ăn';
                    const status = item.kitchenStatus || 'WAITING';

                    // Key gộp: TÊN MÓN + TRẠNG THÁI
                    const groupKey = `${foodName}_${status}`;

                    const createdAt = item.createdAt;

                    if (groupedMap.has(groupKey)) {
                        const existing = groupedMap.get(groupKey);
                        // Cộng dồn số lượng
                        existing.totalQuantity += (item.quantity || 1);
                        // Thêm bàn mới nếu chưa có
                        if (!existing.tables.includes(displayLocation)) {
                            existing.tables.push(displayLocation);
                        }

                        // QUAN TRỌNG: LUÔN LẤY THỜI GIAN MỚI NHẤT
                        // So sánh và cập nhật nếu item mới hơn
                        if (new Date(createdAt) > new Date(existing.latestItemTime)) {
                            existing.latestItemTime = createdAt;
                            existing.displayTime = createdAt; // Thời gian hiển thị là mới nhất
                        }

                        // Lưu lại thời gian cũ nhất nếu muốn biết món đã tồn tại bao lâu
                        if (new Date(createdAt) < new Date(existing.earliestTime)) {
                            existing.earliestTime = createdAt;
                        }

                        // Lưu lại các ID gốc để cập nhật sau
                        existing.originalIds.push(item.id);

                        // Log để debug
                        console.log(`📦 Gộp món: ${foodName} - Thời gian mới nhất: ${existing.displayTime}`);
                    } else {
                        groupedMap.set(groupKey, {
                            key: groupKey,
                            name: foodName,
                            status: status,
                            totalQuantity: item.quantity || 1,
                            tables: [displayLocation],
                            earliestTime: createdAt,
                            latestItemTime: createdAt,
                            displayTime: createdAt, // Thời gian hiển thị
                            originalIds: [item.id],
                            notes: item.notes,
                        });
                    }
                });

            // Chuyển đổi Map thành mảng và sắp xếp
            let groupedItems = Array.from(groupedMap.values()).map(group => ({
                id: group.key,
                name: group.name,
                quantity: group.totalQuantity,
                status: group.status,
                tables: group.tables,
                displayLocations: group.tables.join(', '),
                createdAt: group.displayTime, // Dùng thời gian MỚI NHẤT để tính thời gian chờ
                earliestTime: group.earliestTime,
                latestItemTime: group.latestItemTime,
                originalIds: group.originalIds,
                notes: group.notes,
                tableCount: group.tables.length,
                hasMultipleTimes: group.earliestTime !== group.latestItemTime // Có nhiều thời gian khác nhau
            }));

            // Sắp xếp: Ưu tiên theo status (WAITING lên đầu) và thời gian tạo
            const sortedItems = [...groupedItems].sort((a, b) => {
                if (a.status === 'WAITING' && b.status !== 'WAITING') return -1;
                if (a.status !== 'WAITING' && b.status === 'WAITING') return 1;
                return new Date(a.createdAt) - new Date(b.createdAt);
            });

            setAllItems(sortedItems);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Fetch error:", err);
            showToast('Lỗi tải dữ liệu', 'error');
        } finally {
            setLoading(false);
        }
    }, [branchId, API_BASE_URL]);

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
            if (vietnameseVoice) utterance.voice = vietnameseVoice;
            window.speechSynthesis.speak(utterance);
        };
        if (window.speechSynthesis.getVoices().length > 0) speak();
        else window.speechSynthesis.onvoiceschanged = speak;
    };

    // ========== SOCKET SETUP ==========
    const setupSocket = useCallback(() => {
        if (socketRef.current) socketRef.current.disconnect();
        if (!branchId) return;

        const newSocket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling']
        });
        socketRef.current = newSocket;

        const handleConnect = () => {
            console.log('Socket connected for branch:', branchId);
            setIsSocketConnected(true);
            newSocket.emit('register-role', { role: 'kitchen', userId: user?.id, branchId: branchId });
            fetchData();
        };
        const handleDisconnect = () => {
            console.log('Socket disconnected');
            setIsSocketConnected(false);
            showToast('Mất kết nối real-time', 'warning');
        };

        const handleNewOrder = (orderData) => {
            if (orderData.branchId && branchId && orderData.branchId !== branchId) return;
            const notiKey = `${orderData.orderId}_${orderData.tableNumber}_${JSON.stringify(orderData.items)}`;
            const now = Date.now();
            if (notiKey === lastNotificationKey.current && (now - lastNotificationTime.current) < 500) return;
            lastNotificationKey.current = notiKey;
            lastNotificationTime.current = now;
            playNotificationSound();
            fetchData();

            if (orderData.items?.length) {
                const areaName = orderData.areaName || "Khu chính";
                const locationName = orderData.locationName || (orderData.isRoom ? `Phòng ${orderData.tableNumber}` : `Bàn ${orderData.tableNumber}`);
                const itemDetails = orderData.items.map(item => `${item.name} x${item.quantity}`).join(', ');
                const message = `ĐƠN MỚI - ${areaName} - ${locationName}: ${itemDetails}`;
                showToast(message, 'info');
                addNotification(message, 'order');
                const speechText = `Đơn hàng mới tại ${areaName} ${locationName}: ${orderData.items.map(item => `${item.name} ${item.quantity === 1 ? 'một phần' : `${item.quantity} phần`}`).join(', ')}`;
                speakVietnamese(speechText);
            }
        };

        const handleOrderUpdated = (data) => {
            if (data.branchId && branchId && data.branchId !== branchId) return;
            const notiKey = `${data.orderId}_${data.tableNumber}_${JSON.stringify(data.items)}`;
            const now = Date.now();
            if (notiKey === lastNotificationKey.current && (now - lastNotificationTime.current) < 500) return;
            lastNotificationKey.current = notiKey;
            lastNotificationTime.current = now;
            playNotificationSound();
            fetchData();

            if (data.items?.length) {
                const areaName = data.areaName || "Khu chính";
                const locationName = data.locationName || (data.isRoom ? `Phòng ${data.tableNumber}` : `Bàn ${data.tableNumber}`);
                const itemDetails = data.items.map(item => `${item.name} x${item.quantity}`).join(', ');
                const message = `THÊM MÓN - ${areaName} - ${locationName}: ${itemDetails}`;
                showToast(message, 'info');
                addNotification(message, 'item');
                const speechText = `Thêm món mới tại ${areaName} ${locationName}: ${data.items.map(item => `${item.name} ${item.quantity === 1 ? 'một phần' : `${item.quantity} phần`}`).join(', ')}`;
                speakVietnamese(speechText);
            }
        };

        const handleReservationUpcoming = (data) => {
            const foodList = data.foods?.map(f => `${f.foodName} x${f.quantity}`).join(', ') || '';
            const message = ` ${data.message} | Khách: ${data.customerName} | ${data.table} - ${data.branch} | Giờ đến: ${data.time} | Món: ${foodList}`;
            showToast(message, 'warning');
            addNotification(message, 'warning');
            speakVietnamese(`Chuẩn bị món cho khách ${data.customerName} tại ${data.table}, đến lúc ${data.time}`);
        };
        const handleUpdateTables = () => fetchData();
        const handleItemUpdated = () => fetchData();

        newSocket.on("connect", handleConnect);
        newSocket.on("disconnect", handleDisconnect);
        newSocket.on("new-order", handleNewOrder);
        newSocket.on("update-order-status", handleOrderUpdated);
        newSocket.on("update-tables", handleUpdateTables);
        newSocket.on("order-item-updated", handleItemUpdated);
        newSocket.on("reservation-upcoming", handleReservationUpcoming);

        if (newSocket.connected) handleConnect();
        return () => {
            newSocket.off("connect", handleConnect);
            newSocket.off("disconnect", handleDisconnect);
            newSocket.off("new-order", handleNewOrder);
            newSocket.off("update-order-status", handleOrderUpdated);
            newSocket.off("update-tables", handleUpdateTables);
            newSocket.off("order-item-updated", handleItemUpdated);
            newSocket.off("reservation-upcoming", handleReservationUpcoming);
        };
    }, [branchId, user?.id, fetchData, playNotificationSound]);

    useEffect(() => {
        if (branchId) return setupSocket();
    }, [branchId, setupSocket]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!isSocketConnected) fetchData(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchData, isSocketConnected]);

    useEffect(() => {
        const interval = setInterval(() => {
            setRealTimeClock(new Date());
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    const updateStatus = async (itemGroup, status) => {
        const idsToUpdate = itemGroup.originalIds;
        if (!idsToUpdate || idsToUpdate.length === 0) {
            showToast(`Không tìm thấy món ${itemGroup.name}`, 'error');
            return;
        }

        setItemUpdating(prev => ({ ...prev, [itemGroup.id]: true }));

        try {
            for (const originalId of idsToUpdate) {
                await kitchenAPI.updateItemStatus(originalId, status);
            }
            await fetchData();
            if (socketRef.current?.connected) {
                socketRef.current.emit("update-order-item-status", {
                    itemId: itemGroup.id,
                    status,
                    itemName: itemGroup.name,
                    tables: itemGroup.tables,
                    branchId,
                    timestamp: new Date().toISOString()
                });
                socketRef.current.emit("update-tables");
            }
            if (status === 'READY') {
                const tableList = itemGroup.tables.join(', ');
                const message = `Hoàn thành món ${itemGroup.name} - ${tableList}`;
                showToast(message, 'success');
                addNotification(message, 'success');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data || err.message;
            showToast(`Update thất bại: ${errorMsg}`, 'error');
        } finally {
            setItemUpdating(prev => ({ ...prev, [itemGroup.id]: false }));
        }
    };

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

    const filtered = allItems.filter(i => {
        if (activeTab === 'WAITING') return i.status === 'WAITING';
        if (activeTab === 'PREPARING') return i.status === 'PREPARING';
        return true;
    });

    const counts = {
        ALL: allItems.length,
        WAITING: allItems.filter(i => i.status === 'WAITING').length,
        PREPARING: allItems.filter(i => i.status === 'PREPARING').length,
        OVERDUE: allItems.filter(i => isOverdue(i.createdAt)).length
    };

    const unreadCount = notifications.length;

    const getStatusIcon = (status) => {
        if (status === 'WAITING') return <Clock size={12} color="#fbbf24" />;
        if (status === 'PREPARING') return <ChefHat size={12} color="#f97316" />;
        return <Check size={12} color="#10b981" />;
    };

    const getStatusText = (status) => {
        if (status === 'WAITING') return 'Chờ làm';
        if (status === 'PREPARING') return 'Đang nấu';
        return 'Hoàn thành';
    };

    return (
        <div className={styles.container}>
            {!isSocketConnected && (
                <div className={styles.warningBanner}>
                    <AlertCircle size={16} color="#fbbf24" />
                    <span>Đang mất kết nối real-time. Đơn hàng mới có thể không hiển thị ngay!</span>
                </div>
            )}
            {showIngredientWarning && branchId && (
                <IngredientWarning branchId={branchId} onClose={() => setShowIngredientWarning(false)} autoRefresh={true} />
            )}
            <div className={styles.header}>
                <div className={styles.headerCenter}>
                    <div className={styles.clock}>
                        <Clock size={16} color="#ffffff" />
                        <span className={styles.time}>{realTimeClock.toLocaleTimeString('vi-VN')}</span>
                        <span className={styles.date}>{realTimeClock.toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.notificationBell} onClick={() => setShowNotificationPanel(!showNotificationPanel)}>
                        <Bell size={20} color="#ffffff" />
                        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </div>
                </div>
            </div>
            {showNotificationPanel && (
                <div className={styles.notificationPanel}>
                    <div className={styles.notificationHeader}>
                        <h4>Thông báo</h4>
                        <button onClick={() => setNotifications([])}><X size={16} color="#9ca3af" /> Xóa tất cả</button>
                    </div>
                    <div className={styles.notificationList}>
                        {notifications.length === 0 ? <p className={styles.noNotification}>Chưa có thông báo</p> :
                            notifications.map(noti => (
                                <div key={noti.id} className={`${styles.notificationItem} ${styles[noti.type]}`}>
                                    <div className={styles.notificationMessage}>{noti.message}</div>
                                    <div className={styles.notificationTime}>{noti.timestamp?.toLocaleTimeString('vi-VN')}</div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${counts.WAITING > 0 ? styles.hasWaiting : ''}`}>
                    <div className={styles.statValue}>{counts.WAITING}</div>
                    <div className={styles.statLabel}><Clock size={14} color="#fbbf24" /> Chờ làm</div>
                </div>
                <div className={`${styles.statCard} ${counts.PREPARING > 0 ? styles.hasPreparing : ''}`}>
                    <div className={styles.statValue}>{counts.PREPARING}</div>
                    <div className={styles.statLabel}><ChefHat size={14} color="#f97316" /> Đang nấu</div>
                </div>
                <div className={`${styles.statCard} ${counts.OVERDUE > 0 ? styles.hasOverdue : ''}`}>
                    <div className={styles.statValue}>{counts.OVERDUE}</div>
                    <div className={styles.statLabel}><AlertCircle size={14} color="#ef4444" /> Quá hạn</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{counts.ALL}</div>
                    <div className={styles.statLabel}><Package size={14} color="#3b82f6" /> Tổng món</div>
                </div>
            </div>
            <div className={styles.tabsContainer}>
                {[
                    { key: 'ALL', label: 'Tất cả', icon: <Package size={14} color="#3b82f6" />, count: counts.ALL },
                    { key: 'WAITING', label: 'Món mới', icon: <Clock size={14} color="#fbbf24" />, count: counts.WAITING },
                    { key: 'PREPARING', label: 'Đang làm', icon: <ChefHat size={14} color="#f97316" />, count: counts.PREPARING }
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`${styles.tab} ${activeTab === tab.key ? styles.activeTab : ''}`}>
                        {tab.icon} <span>{tab.label}</span> <span className={styles.tabCount}>({tab.count})</span>
                    </button>
                ))}
            </div>
            <div className={styles.refreshSection}>
                <button onClick={() => fetchData()} disabled={loading} className={styles.refreshBtn}>
                    <RefreshCw size={16} color="#ffffff" className={loading ? styles.spinning : ''} /> Làm mới
                </button>
                {lastUpdated && <span className={styles.lastUpdated}>Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')}</span>}
            </div>
            {loading ? (
                <div className={styles.loadingState}>
                    <Loader2 size={48} color="#3b82f6" className={styles.spinner} />
                    <p>Đang tải dữ liệu...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className={styles.emptyState}>
                    <ChefHat size={64} color="#9ca3af" className={styles.emptyIcon} />
                    <p>Không có món ăn nào trong danh sách</p>
                    <p className={styles.emptySubtext}>Chờ đơn hàng từ quầy...</p>
                </div>
            ) : (
                <div className={styles.itemsGrid}>
                    {filtered.map(item => {
                        const timeColor = getTimeColor(item.createdAt);
                        const overdue = isOverdue(item.createdAt);
                        const isUpdatingItem = itemUpdating[item.id];
                        const hasMultipleTimes = item.hasMultipleTimes;

                        // Hiển thị danh sách bàn
                        const tableDisplay = item.tableCount > 1
                            ? `${item.tables.slice(0, 3).join(', ')}${item.tableCount > 3 ? ` và ${item.tableCount - 3} bàn khác` : ''}`
                            : item.tables[0];

                        return (
                            <div key={item.id} className={`${styles.orderItem} ${overdue ? styles.overdueItem : ''} ${isUpdatingItem ? styles.updatingItem : ''}`}>
                                <div className={styles.itemHeader}>
                                    <div className={styles.tableInfo}>
                                        <div className={styles.tableBadgeGroup}>
                                            <Users size={12} color="#10b981" />
                                            <span className={styles.tableBadge}>{tableDisplay}</span>
                                            {item.tableCount > 1 && (
                                                <span className={styles.tableCount}>({item.tableCount} bàn)</span>
                                            )}
                                        </div>
                                        {overdue && <span className={styles.overdueBadge}>Quá hạn!</span>}
                                        {hasMultipleTimes && (
                                            <span className={styles.newItemBadge}>
                                                🆕 Có món mới
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.timeInfo} style={{ color: timeColor }}>
                                        <Clock size={12} />
                                        <span>{getElapsedTime(item.createdAt)}</span>
                                        {hasMultipleTimes && (
                                            <span className={styles.newTimeLabel}>(món mới nhất)</span>
                                        )}
                                    </div>
                                </div>
                                <h3 className={styles.itemName}>
                                    <Utensils size={16} color="#f59e0b" /> {item.name}
                                </h3>
                                <div className={styles.itemDetails}>
                                    <span className={styles.itemQuantity}>
                                        <Package size={12} color="#3b82f6" /> Số lượng: <strong>{item.quantity}</strong>
                                    </span>
                                </div>
                                {item.notes && (
                                    <p className={styles.itemNotes}>
                                        <FileText size={12} color="#8b5cf6" /> {item.notes}
                                    </p>
                                )}
                                <div className={styles.itemFooter}>
                                    <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                        {getStatusIcon(item.status)} {getStatusText(item.status)}
                                    </span>
                                    <div className={styles.actionButtons}>
                                        {item.status === 'WAITING' && (
                                            <button
                                                className={styles.startBtn}
                                                disabled={isUpdatingItem}
                                                onClick={() => updateStatus(item, 'PREPARING')}
                                            >
                                                <Play size={14} color="#ffffff" /> Bắt đầu
                                            </button>
                                        )}
                                        {item.status === 'PREPARING' && (
                                            <button
                                                className={styles.completeBtn}
                                                disabled={isUpdatingItem}
                                                onClick={() => updateStatus(item, 'READY')}
                                            >
                                                <Check size={14} color="#ffffff" /> Hoàn thành
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
                {toasts.map(toast => <ToastNotification key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />)}
            </div>
        </div>
    );
};

export default ChefDashboard;