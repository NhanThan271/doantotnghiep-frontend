import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChefHat, Clock, Play, Check, RefreshCw, AlertCircle,
    Loader2, Package, Utensils, Users
} from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import ToastNotification from './ToastNotification';
import IngredientWarning from './IngredientWarning';
import styles from './ChefDashboard.module.css';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

const ChefDashboard = () => {
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('ALL');
    const [toasts, setToasts] = useState([]);
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
    const knownItemIdsRef = useRef(new Map());

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

            audioContext.resume().catch(err => console.log("Failed to unlock audio:", err));
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

            if (audioContext.state === 'suspended') audioContext.resume();
        } catch (err) {
            console.log("Sound error:", err);
        }
    }, []);

    // ========== TOAST FUNCTIONS ==========
    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    }, []);

    // ========== GỬI NOTIFICATION LÊN CHEFLAYOUT ==========
    const sendNotificationToLayout = useCallback((message, type = 'info') => {
        window.dispatchEvent(new CustomEvent('chef-notification', {
            detail: { message, type, timestamp: new Date().toISOString() }
        }));
    }, []);

    // ========== SPEECH ==========
    const speakVietnamese = useCallback((text) => {
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

        if (window.speechSynthesis.getVoices().length > 0) {
            speak();
        } else {
            window.speechSynthesis.onvoiceschanged = speak;
        }
    }, []);

    // ========== DEDUCT INGREDIENTS ==========
    const deductIngredientsForItem = async (foodId, quantity, branchId) => {
        try {
            const warnings = [];
            let hasError = false;

            const recipeResponse = await axiosClient.get(`/recipes/food/${foodId}`);
            const recipes = recipeResponse.data;

            if (!recipes || recipes.length === 0) {
                return { success: true, warnings: null, hasError: false };
            }

            const ingredientsResponse = await axiosClient.get(`/branch-ingredients/branch/${branchId}`);
            const branchIngredients = ingredientsResponse.data;

            for (const recipe of recipes) {
                const ingredientId = recipe.ingredient?.id;
                const ingredientName = recipe.ingredient?.name || 'Không xác định';
                const unit = recipe.ingredient?.unit || '';
                const requiredPerItem = recipe.quantityRequired || 0;
                const totalRequired = requiredPerItem * quantity;

                if (totalRequired === 0) continue;

                const branchIngredient = branchIngredients.find(bi => bi.ingredient?.id === ingredientId);

                if (!branchIngredient) {
                    warnings.push(`⚠️ Không tìm thấy "${ingredientName}" trong kho`);
                    continue;
                }

                const currentQuantity = branchIngredient.quantity || 0;

                if (currentQuantity < totalRequired) {
                    hasError = true;
                    warnings.push(`❌ KHÔNG ĐỦ "${ingredientName}": cần ${totalRequired}${unit}, hiện có ${currentQuantity}${unit}`);
                }
            }

            if (hasError) return { success: false, hasError: true, warnings };

            for (const recipe of recipes) {
                const ingredientId = recipe.ingredient?.id;
                const ingredientName = recipe.ingredient?.name || 'Không xác định';
                const unit = recipe.ingredient?.unit || '';
                const requiredPerItem = recipe.quantityRequired || 0;
                const totalRequired = requiredPerItem * quantity;

                if (totalRequired === 0) continue;

                const branchIngredient = branchIngredients.find(bi => bi.ingredient?.id === ingredientId);
                if (!branchIngredient) continue;

                const currentQuantity = branchIngredient.quantity || 0;
                const newQuantity = currentQuantity - totalRequired;

                if (newQuantity < 10) {
                    warnings.push(`⚠️ "${ingredientName}" sắp hết: còn ${newQuantity.toFixed(2)}${unit}`);
                }

                await axiosClient.put(`/branch-ingredients/${branchIngredient.id}?quantity=${newQuantity}`);
            }

            return { success: true, hasError: false, warnings: warnings.length > 0 ? warnings : null };
        } catch (error) {
            console.error('Lỗi trừ nguyên liệu:', error);
            return { success: false, hasError: true, error: error.message, warnings: [`❌ Lỗi hệ thống: ${error.message}`] };
        }
    };

    // ========== FETCH DATA ==========
    const fetchData = useCallback(async (silent = false) => {
        if (!branchId) return;
        if (!silent) setLoading(true);

        try {
            const response = await axiosClient.get('/kitchen-order-items/active');
            const items = response.data;
            const data = Array.isArray(items) ? items : [];

            // Debug
            if (data.length > 0) {
                console.log("📋 Kitchen items count:", data.length);
            }

            // ✅ B1: Thu thập orderId cần fetch thêm (item có orderId nhưng không có table/room)
            const orderIdsNeedFetch = new Set();
            data.forEach(item => {
                if (!item.table?.number && !item.room?.number && item.orderId) {
                    orderIdsNeedFetch.add(item.orderId);
                }
            });

            // ✅ B2: Fetch thông tin order để lấy table/room
            const orderInfoMap = {};
            if (orderIdsNeedFetch.size > 0) {
                console.log(`🔍 Fetch ${orderIdsNeedFetch.size} orders:`, [...orderIdsNeedFetch]);

                const orderPromises = [...orderIdsNeedFetch].map(async (orderId) => {
                    try {
                        const orderRes = await axiosClient.get(`/customer/orders/${orderId}`);
                        const order = orderRes.data;
                        orderInfoMap[orderId] = order;
                        console.log(`✅ Order #${orderId}: table=${order.table?.number}, room=${order.room?.number}`);
                    } catch (err) {
                        console.error(`❌ Lỗi fetch order #${orderId}:`, err.message);
                    }
                });

                await Promise.all(orderPromises);
            }

            // ✅ B3: Xử lý dữ liệu
            const groupedMap = new Map();

            data.forEach(item => {
                if (item.branch?.id && item.branch.id !== branchId) return;

                const foodId = item.food?.id;
                const status = item.kitchenStatus || 'WAITING';
                const key = `${foodId}_${status}`;

                let displayLocation = 'Khu vực chung';
                let areaName = 'Khu chính';

                // Ưu tiên item.table / item.room (có sẵn từ API)
                if (item.table?.number) {
                    displayLocation = `Bàn ${item.table.number}`;
                    areaName = item.table.area || 'Khu chính';
                } else if (item.room?.number) {
                    displayLocation = `Phòng ${item.room.number}`;
                    areaName = item.room.area || 'Khu VIP';
                }
                // Nếu không có, dùng orderInfoMap
                else if (item.orderId && orderInfoMap[item.orderId]) {
                    const order = orderInfoMap[item.orderId];
                    if (order.table?.number) {
                        displayLocation = `Bàn ${order.table.number}`;
                        areaName = order.table.area || 'Khu chính';
                    } else if (order.room?.number) {
                        displayLocation = `Phòng ${order.room.number}`;
                        areaName = order.room.area || 'Khu VIP';
                    } else {
                        displayLocation = `Đơn #${item.orderId}`;
                    }
                }
                // Fallback cuối cùng
                else if (item.orderId) {
                    displayLocation = `Đơn #${item.orderId}`;
                }

                const isNewItem = !knownItemIdsRef.current.has(item.id);
                knownItemIdsRef.current.set(item.id, true);

                let itemCreatedAt = isNewItem ? new Date().toISOString() : (item.createdAt || new Date().toISOString());

                if (groupedMap.has(key)) {
                    const existing = groupedMap.get(key);
                    existing.quantity += 1;
                    existing.originalIds.push(item.id);

                    if (!existing.tables.includes(displayLocation)) {
                        existing.tables.push(displayLocation);
                        existing.tableCount++;
                        existing.displayLocations = existing.tables.join(', ');
                    }

                    if (isNewItem) {
                        existing.latestItemTime = itemCreatedAt;
                        existing.isNewlyAdded = true;
                    }
                } else {
                    const savedTime = knownItemIdsRef.current.get(`group_${key}`);
                    let groupCreatedAt = savedTime || (isNewItem ? new Date().toISOString() : (item.createdAt || new Date().toISOString()));
                    if (!savedTime) knownItemIdsRef.current.set(`group_${key}`, groupCreatedAt);

                    groupedMap.set(key, {
                        id: item.id,
                        name: item.food?.name || 'Món ăn',
                        foodId: foodId,
                        quantity: 1,
                        status: status,
                        tables: [displayLocation],
                        displayLocations: displayLocation,
                        createdAt: groupCreatedAt,
                        latestItemTime: itemCreatedAt,
                        originalIds: [item.id],
                        notes: item.notes || '',
                        tableCount: 1,
                        isNewlyAdded: isNewItem && status === 'WAITING',
                        areaName: areaName
                    });
                }
            });

            const processedItems = Array.from(groupedMap.values());
            const sortedItems = [...processedItems].sort((a, b) => {
                if (a.status === 'WAITING' && b.status !== 'WAITING') return -1;
                if (a.status !== 'WAITING' && b.status === 'WAITING') return 1;
                return new Date(a.createdAt) - new Date(b.createdAt);
            });

            console.log("📊 Processed items:", sortedItems.length);
            setAllItems(sortedItems);
        } catch (err) {
            console.error("Fetch error:", err);
            if (!silent) showToast('Lỗi tải dữ liệu', 'error');
        } finally {
            setLoading(false);
        }
    }, [branchId, showToast]);    // ========== SOCKET SETUP ==========
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
            console.log("📦 NEW ORDER in Chef:", orderData);

            if (orderData.branchId && branchId && orderData.branchId !== branchId) return;

            const notiKey = `${orderData.orderId}_${orderData.tableNumber}_${JSON.stringify(orderData.items)}`;
            const now = Date.now();
            if (notiKey === lastNotificationKey.current && (now - lastNotificationTime.current) < 500) return;

            lastNotificationKey.current = notiKey;
            lastNotificationTime.current = now;

            playNotificationSound();
            fetchData();

            if (orderData.items?.length) {
                // ✅ SỬA: Phân biệt bàn/phòng
                const areaName = orderData.areaName || (orderData.isRoom ? "Khu VIP" : "Khu chính");
                const locationName = orderData.locationName ||
                    (orderData.isRoom ? `Phòng ${orderData.tableNumber}` : `Bàn ${orderData.tableNumber}`);

                const itemDetails = orderData.items.map(item => `${item.name} x${item.quantity}`).join(', ');
                const message = `🆕 ĐƠN MỚI - ${areaName} - ${locationName}: ${itemDetails}`;

                showToast(message, 'info');
                sendNotificationToLayout(message, 'order');

                // ✅ SỬA: Đọc đúng tên location khi nói
                const speechText = `Đơn hàng mới tại ${areaName} ${locationName}: ${orderData.items.map(item =>
                    `${item.name} ${item.quantity === 1 ? 'một phần' : `${item.quantity} phần`}`
                ).join(', ')}`;
                speakVietnamese(speechText);
            }
        };

        const handleOrderUpdated = (data) => {
            console.log("📦 ORDER UPDATED in Chef:", data);

            if (data.branchId && branchId && data.branchId !== branchId) return;

            const notiKey = `${data.orderId}_${data.tableNumber}_${JSON.stringify(data.items)}`;
            const now = Date.now();
            if (notiKey === lastNotificationKey.current && (now - lastNotificationTime.current) < 500) return;

            lastNotificationKey.current = notiKey;
            lastNotificationTime.current = now;

            playNotificationSound();
            fetchData();

            if (data.items?.length) {
                // ✅ SỬA: Phân biệt bàn/phòng
                const areaName = data.areaName || (data.isRoom ? "Khu VIP" : "Khu chính");
                const locationName = data.locationName ||
                    (data.isRoom ? `Phòng ${data.tableNumber}` : `Bàn ${data.tableNumber}`);

                const itemDetails = data.items.map(item => `${item.name} x${item.quantity}`).join(', ');
                const message = `➕ THÊM MÓN - ${areaName} - ${locationName}: ${itemDetails}`;

                showToast(message, 'info');
                sendNotificationToLayout(message, 'item');

                const speechText = `Thêm món mới tại ${areaName} ${locationName}: ${data.items.map(item =>
                    `${item.name} ${item.quantity === 1 ? 'một phần' : `${item.quantity} phần`}`
                ).join(', ')}`;
                speakVietnamese(speechText);
            }
        };

        const handleReservationUpcoming = (data) => {
            const foodList = data.foods?.map(f => `${f.foodName} x${f.quantity}`).join(', ') || '';
            const message = `📅 ${data.message} | Khách: ${data.customerName} | ${data.table} - ${data.branch} | Giờ đến: ${data.time} | Món: ${foodList}`;
            showToast(message, 'warning');
            sendNotificationToLayout(message, 'warning');
            speakVietnamese(`Chuẩn bị món cho khách ${data.customerName} tại ${data.table}, đến lúc ${data.time}`);
        };

        const handleUpdateTables = () => fetchData();
        const handleItemUpdated = () => fetchData();

        newSocket.on("connect", handleConnect);
        newSocket.on("disconnect", handleDisconnect);
        newSocket.on("new-order", handleNewOrder);
        newSocket.on("order-updated", handleOrderUpdated);
        newSocket.on("update-tables", handleUpdateTables);
        newSocket.on("order-item-updated", handleItemUpdated);
        newSocket.on("reservation-upcoming", handleReservationUpcoming);

        if (newSocket.connected) handleConnect();

        return () => {
            newSocket.off("connect", handleConnect);
            newSocket.off("disconnect", handleDisconnect);
            newSocket.off("new-order", handleNewOrder);
            newSocket.off("order-updated", handleOrderUpdated);
            newSocket.off("update-tables", handleUpdateTables);
            newSocket.off("order-item-updated", handleItemUpdated);
            newSocket.off("reservation-upcoming", handleReservationUpcoming);
        };
    }, [branchId, user?.id, fetchData, playNotificationSound, showToast, sendNotificationToLayout, speakVietnamese]);

    useEffect(() => { if (branchId) return setupSocket(); }, [branchId, setupSocket]);

    useEffect(() => {
        const interval = setInterval(() => { if (!isSocketConnected) fetchData(true); }, 30000);
        return () => clearInterval(interval);
    }, [fetchData, isSocketConnected]);

    useEffect(() => {
        const interval = setInterval(() => {
            setRealTimeClock(new Date());
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // ========== UPDATE STATUS ==========
    const updateStatus = async (itemGroup, status) => {
        const idsToUpdate = itemGroup.originalIds;
        if (!idsToUpdate || idsToUpdate.length === 0) {
            showToast(`Không tìm thấy món ${itemGroup.name}`, 'error');
            return;
        }

        setItemUpdating(prev => ({ ...prev, [itemGroup.id]: true }));

        try {
            if (status === 'PREPARING' && branchId) {
                const foodId = itemGroup.foodId;
                if (foodId) {
                    const deductResult = await deductIngredientsForItem(foodId, itemGroup.quantity, branchId);

                    if (deductResult.warnings && deductResult.warnings.length > 0) {
                        deductResult.warnings.forEach(warning => {
                            if (warning.includes('❌')) {
                                showToast(warning, 'error');
                                sendNotificationToLayout(warning, 'error');
                            } else {
                                showToast(warning, 'warning');
                            }
                        });
                    }

                    if (deductResult.hasError) {
                        showToast('🚫 Không đủ nguyên liệu!', 'error');
                        sendNotificationToLayout('🚫 Không đủ nguyên liệu cho: ' + itemGroup.name, 'error');
                        setItemUpdating(prev => ({ ...prev, [itemGroup.id]: false }));
                        return;
                    }
                }
            }

            for (const originalId of idsToUpdate) {
                await axiosClient.put(`/kitchen-order-items/${originalId}/status?status=${status}`);
            }

            const oldKey = `${itemGroup.foodId}_${itemGroup.status}`;
            knownItemIdsRef.current.delete(`group_${oldKey}`);

            await fetchData();

            if (socketRef.current?.connected) {
                const emitData = {
                    items: idsToUpdate.map(id => parseInt(id)),
                    status: status,
                    itemName: itemGroup.name,
                    tables: itemGroup.tables,
                    branchId: branchId,
                    timestamp: new Date().toISOString()
                };
                socketRef.current.emit("update-order-item-status", emitData);

                const statusMessage = status === 'PREPARING'
                    ? `🔪 Bắt đầu nấu: ${itemGroup.name} (SL: ${itemGroup.quantity})`
                    : `✅ Hoàn thành: ${itemGroup.name} (SL: ${itemGroup.quantity})`;

                socketRef.current.emit("kitchen-item-status-changed", { ...emitData, message: statusMessage });
                socketRef.current.emit("update-tables");
            }

            const toastMessage = status === 'PREPARING'
                ? `🔪 Bắt đầu nấu: ${itemGroup.name}`
                : `✅ Hoàn thành: ${itemGroup.name}`;

            showToast(toastMessage, 'success');
        } catch (err) {
            console.error("❌ Error in updateStatus:", err);
            showToast(`Lỗi: ${err.response?.data?.message || err.message}`, 'error');
        } finally {
            setItemUpdating(prev => ({ ...prev, [itemGroup.id]: false }));
        }
    };

    // ========== TIME HELPERS ==========
    const getElapsedTime = useCallback((createdAt) => {
        if (!createdAt) return '0 giây';
        const elapsed = Math.floor((currentTime - new Date(createdAt).getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        if (minutes < 1) return `${seconds} giây`;
        if (minutes < 60) return `${minutes} phút ${seconds} giây`;
        return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
    }, [currentTime]);

    const isOverdue = useCallback((createdAt) => {
        if (!createdAt) return false;
        return (currentTime - new Date(createdAt)) / 60000 > 15;
    }, [currentTime]);

    const getTimeColor = useCallback((createdAt) => {
        if (!createdAt) return '#6b7280';
        const diffInMinutes = (currentTime - new Date(createdAt).getTime()) / 60000;
        if (diffInMinutes > 15) return '#ef4444';
        if (diffInMinutes > 10) return '#f59e0b';
        if (diffInMinutes > 5) return '#fbbf24';
        return '#10b981';
    }, [currentTime]);

    // ===== FILTER =====
    const filtered = allItems.filter(i => {
        if (i.status === 'READY' || i.status === 'COMPLETED') return false;
        if (activeTab === 'WAITING') return i.status === 'WAITING';
        if (activeTab === 'PREPARING') return i.status === 'PREPARING';
        return true;
    });

    // ===== COUNTS =====
    const counts = {
        ALL: allItems.filter(i => i.status !== 'READY' && i.status !== 'COMPLETED').length,
        WAITING: allItems.filter(i => i.status === 'WAITING').length,
        PREPARING: allItems.filter(i => i.status === 'PREPARING').length,
        OVERDUE: allItems.filter(i => i.status !== 'READY' && i.status !== 'COMPLETED' && isOverdue(i.createdAt)).length
    };

    // ========== RENDER ==========
    return (
        <div className={styles.container}>
            {/* Socket Disconnected Warning */}
            {!isSocketConnected && (
                <div className={styles.warningBanner}>
                    <AlertCircle size={16} color="#fbbf24" />
                    <span>Đang mất kết nối real-time. Đơn hàng mới có thể không hiển thị ngay!</span>
                </div>
            )}

            {/* Ingredient Warning */}
            {showIngredientWarning && branchId && (
                <IngredientWarning branchId={branchId} onClose={() => setShowIngredientWarning(false)} autoRefresh={true} />
            )}

            {/* ===== HEADER: Stats + Đồng hồ + Làm mới ===== */}
            <div style={{
                background: 'white', borderRadius: 16, padding: '16px 24px',
                marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 16
            }}>
                {/* Left: Stats */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                        { icon: <Clock size={18} color="#fbbf24" />, count: counts.WAITING, label: 'Chờ làm', color: '#fbbf24', bg: '#fef3c7' },
                        { icon: <ChefHat size={18} color="#f97316" />, count: counts.PREPARING, label: 'Đang nấu', color: '#f97316', bg: '#fff7ed' },
                        { icon: <AlertCircle size={18} color={counts.OVERDUE > 0 ? '#ef4444' : '#9ca3af'} />, count: counts.OVERDUE, label: 'Quá hạn', color: counts.OVERDUE > 0 ? '#ef4444' : '#9ca3af', bg: counts.OVERDUE > 0 ? '#fef2f2' : '#f8fafc' },
                        { icon: <Package size={18} color="#3b82f6" />, count: counts.ALL, label: 'Tổng món', color: '#3b82f6', bg: '#f8fafc' },
                    ].map((stat, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: stat.bg, padding: '10px 16px', borderRadius: 10,
                            border: `2px solid ${stat.count > 0 ? stat.color : '#e2e8f0'}`
                        }}>
                            {stat.icon}
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{stat.count}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Đồng hồ + Làm mới */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#1e293b', color: 'white', padding: '10px 16px', borderRadius: 10
                    }}>
                        <Clock size={18} color="#fbbf24" />
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
                                {realTimeClock.toLocaleTimeString('vi-VN')}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.2 }}>
                                {realTimeClock.toLocaleDateString('vi-VN')}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => fetchData()}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '12px 20px', background: loading ? '#94a3b8' : '#3b82f6',
                            color: 'white', border: 'none', borderRadius: 10,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap'
                        }}
                    >
                        <RefreshCw size={18} className={loading ? styles.spinning : ''} />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* ===== TABS ===== */}
            <div style={{
                background: 'white', borderRadius: 16, padding: '8px 16px',
                marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                display: 'flex', gap: 8
            }}>
                {[
                    { key: 'ALL', label: 'Tất cả', icon: '📋', count: counts.ALL, color: '#3b82f6' },
                    { key: 'WAITING', label: 'Món mới', icon: '🆕', count: counts.WAITING, color: '#fbbf24' },
                    { key: 'PREPARING', label: 'Đang làm', icon: '🔪', count: counts.PREPARING, color: '#f97316' },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '10px 20px',
                        background: activeTab === tab.key ? tab.color : 'transparent',
                        color: activeTab === tab.key ? 'white' : '#64748b',
                        border: activeTab === tab.key ? 'none' : '2px solid #e2e8f0',
                        borderRadius: 10, cursor: 'pointer',
                        fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 500,
                        whiteSpace: 'nowrap'
                    }}>
                        <span style={{ fontSize: 16 }}>{tab.icon}</span>
                        <span>{tab.label}</span>
                        <span style={{
                            background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#f1f5f9',
                            padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700
                        }}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* ===== CONTENT ===== */}
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
                                        </div>
                                        {overdue && <span className={styles.overdueBadge}>Quá hạn!</span>}
                                        {item.isNewlyAdded && <span className={styles.newItemBadge}>🆕 Mới</span>}
                                    </div>
                                    <div className={styles.timeInfo} style={{ color: timeColor }}>
                                        <Clock size={12} />
                                        <span>{getElapsedTime(item.createdAt)}</span>
                                    </div>
                                </div>

                                <h3 className={styles.itemName}>
                                    <Utensils size={16} color="#f59e0b" /> {item.name}
                                </h3>

                                <div className={styles.itemDetails}>
                                    <span className={styles.itemQuantity}>
                                        <Package size={12} color="#3b82f6" />
                                        SL: <strong>{item.quantity}</strong>
                                    </span>
                                </div>

                                <div className={styles.itemFooter}>
                                    <span className={`${styles.statusBadge} ${styles[item.status] || ''}`}>
                                        {item.status === 'WAITING' ? <><Clock size={12} color="#fbbf24" /> Chờ làm</> : <><ChefHat size={12} color="#f97316" /> Đang nấu</>}
                                    </span>
                                    <div className={styles.actionButtons}>
                                        {item.status === 'WAITING' && (
                                            <button className={styles.startBtn} disabled={isUpdatingItem} onClick={() => updateStatus(item, 'PREPARING')}>
                                                <Play size={14} color="#ffffff" /> Bắt đầu
                                            </button>
                                        )}
                                        {item.status === 'PREPARING' && (
                                            <button className={styles.completeBtn} disabled={isUpdatingItem} onClick={() => updateStatus(item, 'READY')}>
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

            {/* Toast Notifications */}
            <div className={styles.toastContainer}>
                {toasts.map(toast => (
                    <ToastNotification key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
        </div>
    );
};

export default ChefDashboard;