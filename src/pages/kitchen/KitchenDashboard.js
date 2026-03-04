import React, { useEffect, useState } from 'react';
import { ChefHat, Clock, AlertCircle, CheckCircle, Play, Check, RefreshCw } from 'lucide-react';
import styles from './KitchenDashboard.module.css';
import KitchenLayout from '../../layouts/KitchenLayout';
import io from 'socket.io-client';
import ToastNotification from './ToastNotification';

const socket = io('http://localhost:3001');

export default function KitchenDashboard() {
    const [orderItems, setOrderItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [toasts, setToasts] = useState([]);
    const API_BASE_URL = 'restaurant-management-backend.up.railway.app';

    const showToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        const newToast = { id, message, type, duration };

        setToasts(prev => [...prev, newToast]);

        try {
            const audio = new Audio('/notification-sound.mp3');
            audio.volume = 0.5;
            audio.play().catch(err => console.log('Cannot play sound:', err));
        } catch (err) {
            console.log('Audio not supported');
        }
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    // Fetch branch info
    const fetchCurrentBranch = async () => {
        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');

            console.log('🔍 Token:', token ? 'exists' : 'missing');
            console.log('🔍 User:', userStr);

            const user = userStr ? JSON.parse(userStr) : null;

            let branchId = user?.branch?.id || user?.branchId;

            if (!branchId) {
                const userRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (userRes.ok) {
                    const userData = await userRes.json();
                    branchId = userData.branch?.id;

                    if (branchId) {
                        localStorage.setItem('user', JSON.stringify({
                            ...user,
                            branchId,
                            branch: userData.branch
                        }));
                    }
                }
            }

            if (!branchId) {
                console.error('❌ Không tìm thấy branchId');
                showToast('Tài khoản chưa được gán chi nhánh', 'warning', 6000);
                setInitialLoading(false); // IMPORTANT: Stop loading even on error
                return;
            }

            const branchRes = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (branchRes.ok) {
                const branchData = await branchRes.json();
                console.log('✅ Branch loaded:', branchData);
                setCurrentBranch(branchData);
            } else {
                console.error('❌ Branch fetch failed:', branchRes.status);
                showToast('Không thể tải thông tin chi nhánh', 'error', 5000);
            }
        } catch (error) {
            console.error('❌ Lỗi khi lấy thông tin chi nhánh:', error);
            showToast('Không thể lấy thông tin chi nhánh', 'error', 5000);
        } finally {
            setInitialLoading(false); // ALWAYS stop loading
        }
    };

    // Fetch order items
    const fetchOrderItems = async () => {
        if (!currentBranch?.id) {
            console.log('⚠️ Không có branch ID, bỏ qua fetch items');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            // THÊM LOG ĐỂ KIỂM TRA
            console.log('🔍 User info:', user);
            console.log('🔍 User roles:', user.roles);
            console.log('🔍 Token:', token?.substring(0, 20) + '...');
            const ordersRes = await fetch(`${API_BASE_URL}/api/customer/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('📥 Orders response status:', ordersRes.status);

            if (!ordersRes.ok) {
                const errorText = await ordersRes.text();
                console.error('❌ Orders API error:', errorText);
                throw new Error('Không thể tải đơn hàng');
            }

            const orders = await ordersRes.json();
            // Chỉ lấy đơn CONFIRMED của chi nhánh này
            const confirmedOrders = orders.filter(order =>
                order.status === 'CONFIRMED' &&
                order.branch?.id === currentBranch.id
            );

            const itemsRes = await fetch(`${API_BASE_URL}/api/kitchen/order-items`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('📥 Items response status:', itemsRes.status);

            if (!itemsRes.ok) {
                const errorText = await itemsRes.text();
                console.error('❌ Items API error:', errorText);
                throw new Error('Không thể tải món');
            }

            const allItems = await itemsRes.json();

            // Chỉ lấy món thuộc đơn CONFIRMED và chưa SERVED
            const kitchenItems = allItems.filter(item => {
                const belongsToConfirmedOrder = confirmedOrders.some(order => order.id === item.order?.id);
                const notServed = item.status !== 'SERVED';
                return belongsToConfirmedOrder && notServed;
            });

            // SẮP XẾP ƯU TIÊN: NEW → COOKING → DONE, sau đó theo thời gian và số lượng
            kitchenItems.sort((a, b) => {
                // Thứ tự ưu tiên trạng thái
                const statusPriority = { 'NEW': 1, 'COOKING': 2, 'DONE': 3 };
                const priorityA = statusPriority[a.status] || 999;
                const priorityB = statusPriority[b.status] || 999;

                if (priorityA !== priorityB) {
                    return priorityA - priorityB; // NEW trước, DONE sau
                }

                // Cùng trạng thái → sắp theo thời gian (cũ trước)
                const timeA = new Date(a.order?.createdAt || 0);
                const timeB = new Date(b.order?.createdAt || 0);
                if (timeA - timeB !== 0) return timeA - timeB;

                // Cùng thời gian → món nhiều trước
                return (b.quantity || 0) - (a.quantity || 0);
            });

            console.log('✅ Loaded items:', kitchenItems.length);
            setOrderItems(kitchenItems);
        } catch (error) {
            console.error('❌ Lỗi khi tải món:', error);
            showToast('Không thể tải danh sách món', 'error', 5000);
        } finally {
            setLoading(false);
        }
    };

    // WebSocket & Initial Load
    useEffect(() => {
        console.log('🚀 Component mounted');
        fetchCurrentBranch();

        socket.emit("register-role", "kitchen");

        socket.on("order-for-staff", (orderData) => {
            console.log("📦 Bếp nhận đơn mới:", orderData);

            if (orderData.status === 'CONFIRMED') {
                showToast(
                    `🍳 Đơn mới #${orderData.id}\nBàn ${orderData.table?.number || "?"}`,
                    'success',
                    6000
                );
                fetchOrderItems();
            }
        });

        socket.on("update-order-status", (updatedOrder) => {
            console.log("🔄 Cập nhật trạng thái đơn:", updatedOrder);

            if (updatedOrder.status === 'CONFIRMED') {
                showToast(
                    `🔔 Đơn #${updatedOrder.id} đã được xác nhận`,
                    'info',
                    4000
                );
                fetchOrderItems();
            }
        });

        // ✅ LISTEN: Khi bếp khác hoặc nhân viên cập nhật món
        socket.on("order-item-updated", (itemData) => {
            console.log("🔄 Món được cập nhật từ bếp khác:", itemData);

            // Chỉ refresh nếu cùng chi nhánh
            if (itemData.branchId === currentBranch?.id) {
                fetchOrderItems();
            }
        });

        // Auto-refresh mỗi 60 giây
        const autoRefreshInterval = setInterval(() => {
            console.log('🔄 Auto-refresh kitchen items');
            fetchOrderItems();
        }, 60000);

        return () => {
            socket.off("order-for-staff");
            socket.off("update-order-status");
            socket.off("order-item-updated");
            clearInterval(autoRefreshInterval);
        };
    }, []);

    useEffect(() => {
        if (currentBranch) {
            console.log('🏢 Branch available, fetching items...');
            fetchOrderItems();
        }
    }, [currentBranch]);

    const updateItemStatus = async (itemId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const item = orderItems.find(i => i.id === itemId);

            const response = await fetch(`${API_BASE_URL}/api/kitchen/order-items/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...item,
                    status: newStatus
                })
            });

            if (!response.ok) throw new Error('Cập nhật thất bại');

            const updatedItem = await response.json();

            // ✅ EMIT socket event để thông báo cho các bếp khác và nhân viên
            socket.emit('update-order-item-status', {
                id: itemId,
                orderId: item.order?.id,
                status: newStatus,
                productName: item.product?.name,
                tableNumber: item.order?.tableEntity?.tableNumber,
                branchId: currentBranch.id
            });

            const statusText = {
                'COOKING': '👨‍🍳 Đang làm',
                'DONE': '✅ Hoàn thành'
            };

            showToast(
                `${statusText[newStatus]}: ${item?.product?.name}`,
                newStatus === 'DONE' ? 'success' : 'info',
                3000
            );

            fetchOrderItems();
        } catch (error) {
            console.error('❌ Lỗi khi cập nhật:', error);
            showToast('Không thể cập nhật trạng thái món', 'error', 5000);
        }
    };

    const getTimeAgo = (dateString) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours} giờ trước`;
    };

    // Kiểm tra món có quá hạn không (> 15 phút)
    const isOverdue = (dateString) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffMins = Math.floor((now - past) / 60000);
        return diffMins > 15;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'NEW': return styles.statusNew;
            case 'COOKING': return styles.statusCooking;
            case 'DONE': return styles.statusDone;
            default: return '';
        }
    };

    const filteredItems = orderItems.filter(item => {
        if (filterStatus === 'all') return true;
        return item.status === filterStatus;
    });

    const newCount = orderItems.filter(i => i.status === 'NEW').length;
    const cookingCount = orderItems.filter(i => i.status === 'COOKING').length;
    const doneCount = orderItems.filter(i => i.status === 'DONE').length;

    // SHOW LOADING ONLY DURING INITIAL LOAD
    if (initialLoading) {
        return (
            <KitchenLayout>
                <div className={styles.loadingContainer}>
                    <RefreshCw size={48} className={styles.spinIcon} />
                    <p>Đang tải thông tin chi nhánh...</p>
                </div>
            </KitchenLayout>
        );
    }

    // SHOW ERROR STATE IF NO BRANCH AFTER LOADING
    if (!currentBranch) {
        return (
            <KitchenLayout>
                <div className={styles.loadingContainer}>
                    <AlertCircle size={48} style={{ color: '#f59e0b' }} />
                    <p style={{ marginTop: '16px' }}>Không tìm thấy thông tin chi nhánh</p>
                    <button
                        onClick={fetchCurrentBranch}
                        style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Thử lại
                    </button>
                </div>
            </KitchenLayout>
        );
    }

    return (
        <KitchenLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <h2 className={styles.title}>Danh sách món cần làm</h2>
                        <button onClick={fetchOrderItems} disabled={loading} className={styles.refreshBtn}>
                            <RefreshCw size={18} className={loading ? styles.spinIcon : ''} />
                            Làm mới
                        </button>
                    </div>

                    {/* Stats */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIconNew}>
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <div className={styles.statValue}>{newCount}</div>
                                <div className={styles.statLabel}>Món mới</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIconCooking}>
                                <ChefHat size={24} />
                            </div>
                            <div>
                                <div className={styles.statValue}>{cookingCount}</div>
                                <div className={styles.statLabel}>Đang làm</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIconDone}>
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div className={styles.statValue}>{doneCount}</div>
                                <div className={styles.statLabel}>Hoàn thành</div>
                            </div>
                        </div>
                    </div>

                    {/* Filter */}
                    <div className={styles.filterBar}>
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={filterStatus === 'all' ? styles.filterActive : styles.filterInactive}
                        >
                            Tất cả ({orderItems.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('NEW')}
                            className={filterStatus === 'NEW' ? styles.filterActive : styles.filterInactive}
                        >
                            Món mới ({newCount})
                        </button>
                        <button
                            onClick={() => setFilterStatus('COOKING')}
                            className={filterStatus === 'COOKING' ? styles.filterActive : styles.filterInactive}
                        >
                            Đang làm ({cookingCount})
                        </button>
                        <button
                            onClick={() => setFilterStatus('DONE')}
                            className={filterStatus === 'DONE' ? styles.filterActive : styles.filterInactive}
                        >
                            Hoàn thành ({doneCount})
                        </button>
                    </div>
                </div>

                {/* Items Grid */}
                <div className={styles.itemsGrid}>
                    {filteredItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            <ChefHat size={64} className={styles.emptyIcon} />
                            <p>Không có món nào cần làm</p>
                        </div>
                    ) : (
                        filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className={`${styles.itemCard} ${isOverdue(item.order?.createdAt) && item.status !== 'DONE' ? styles.overdueCard : ''}`}
                            >
                                <div className={styles.itemHeader}>
                                    <div className={styles.tableInfo}>
                                        Bàn {item.order?.tableEntity?.tableNumber || 'N/A'}
                                    </div>
                                    <div className={`${styles.timeInfo} ${isOverdue(item.order?.createdAt) && item.status !== 'DONE' ? styles.overdueTime : ''}`}>
                                        <Clock size={14} />
                                        {getTimeAgo(item.order?.createdAt)}
                                        {isOverdue(item.order?.createdAt) && item.status !== 'DONE' && (
                                            <span className={styles.overdueLabel}>⚠️ QUÁ HẠN</span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.itemContent}>
                                    <h3 className={styles.productName}>{item.product?.name || 'Món ăn'}</h3>
                                    <div className={styles.quantity}>
                                        Số lượng: <strong>{item.quantity}</strong>
                                    </div>

                                    {item.notes && (
                                        <div className={styles.notes}>
                                            Ghi chú: {item.notes}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.itemFooter}>
                                    <span className={`${styles.statusBadge} ${getStatusColor(item.status)}`}>
                                        {item.status === 'NEW' && 'Món mới'}
                                        {item.status === 'COOKING' && 'Đang làm'}
                                        {item.status === 'DONE' && 'Hoàn thành'}
                                    </span>

                                    <div className={styles.actions}>
                                        {item.status === 'NEW' && (
                                            <button
                                                onClick={() => updateItemStatus(item.id, 'COOKING')}
                                                className={styles.btnStart}
                                            >
                                                <Play size={16} />
                                                Bắt đầu
                                            </button>
                                        )}

                                        {item.status === 'COOKING' && (
                                            <button
                                                onClick={() => updateItemStatus(item.id, 'DONE')}
                                                className={styles.btnDone}
                                            >
                                                <Check size={16} />
                                                Hoàn thành
                                            </button>
                                        )}

                                        {item.status === 'DONE' && (
                                            <span className={styles.completedText}>
                                                ✓ Chờ phục vụ
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Loading Overlay */}
                {loading && (
                    <div className={styles.loadingOverlay}>
                        <div className={styles.loadingModal}>
                            <RefreshCw size={48} className={styles.spinIcon} />
                            <p>Đang tải menu...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast Notifications */}
            <div style={{
                position: 'fixed',
                top: '80px',
                right: '20px',
                zIndex: 9999,
                pointerEvents: 'none'
            }}>
                {toasts.map((toast, index) => (
                    <div
                        key={toast.id}
                        style={{
                            marginTop: index > 0 ? '10px' : '0',
                            pointerEvents: 'auto'
                        }}
                    >
                        <ToastNotification
                            message={toast.message}
                            type={toast.type}
                            duration={toast.duration}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
        </KitchenLayout>
    );
}