// pages/employee/chef/ChefDashboard.js
import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, AlertCircle, CheckCircle, Play, Check, RefreshCw } from 'lucide-react';
import styles from './ChefDashboard.module.css';
import ToastNotification from './ToastNotification';

const ChefDashboard = () => {
    const [orderItems, setOrderItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [toasts, setToasts] = useState([]);
    const [currentBranch, setCurrentBranch] = useState(null);

    // Dữ liệu mock
    const mockBranch = {
        id: 1,
        name: "Chi nhánh Trung Tâm",
        address: "123 Đường Lê Lợi, Quận 1, TP.HCM",
        phone: "028 1234 5678"
    };

    const mockOrderItems = [
        {
            id: 1,
            status: 'NEW',
            quantity: 2,
            createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
            notes: 'Không ớt',
            product: { id: 101, name: 'Phở bò tái' },
            order: { id: 1001, tableNumber: 'Bàn 12', createdAt: new Date(Date.now() - 5 * 60000).toISOString() }
        },
        {
            id: 2,
            status: 'NEW',
            quantity: 1,
            createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
            notes: '',
            product: { id: 102, name: 'Bún chả Hà Nội' },
            order: { id: 1001, tableNumber: 'Bàn 12', createdAt: new Date(Date.now() - 5 * 60000).toISOString() }
        },
        {
            id: 3,
            status: 'COOKING',
            quantity: 3,
            createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
            notes: 'Làm chín kỹ',
            product: { id: 103, name: 'Cơm rang dưa bò' },
            order: { id: 1002, tableNumber: 'Bàn 8', createdAt: new Date(Date.now() - 20 * 60000).toISOString() }
        },
        {
            id: 4,
            status: 'COOKING',
            quantity: 1,
            createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
            notes: '',
            product: { id: 104, name: 'Gà chiên nước mắm' },
            order: { id: 1003, tableNumber: 'Bàn 5', createdAt: new Date(Date.now() - 10 * 60000).toISOString() }
        },
        {
            id: 5,
            status: 'DONE',
            quantity: 2,
            createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
            notes: 'Thêm sa tế',
            product: { id: 105, name: 'Mì xào hải sản' },
            order: { id: 1004, tableNumber: 'Bàn 3', createdAt: new Date(Date.now() - 30 * 60000).toISOString() }
        },
        {
            id: 6,
            status: 'DONE',
            quantity: 1,
            createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
            notes: '',
            product: { id: 106, name: 'Lẩu thái hải sản' },
            order: { id: 1005, tableNumber: 'Bàn 10', createdAt: new Date(Date.now() - 25 * 60000).toISOString() }
        },
        {
            id: 7,
            status: 'NEW',
            quantity: 4,
            createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
            notes: 'Rau sống nhiều',
            product: { id: 107, name: 'Bánh xèo' },
            order: { id: 1006, tableNumber: 'Bàn 15', createdAt: new Date(Date.now() - 2 * 60000).toISOString() }
        },
        {
            id: 8,
            status: 'COOKING',
            quantity: 1,
            createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
            notes: 'Ít đường',
            product: { id: 108, name: 'Chè Thái' },
            order: { id: 1007, tableNumber: 'Bàn 7', createdAt: new Date(Date.now() - 18 * 60000).toISOString() }
        }
    ];

    const showToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        const newToast = { id, message, type, duration };
        setToasts(prev => [...prev, newToast]);
        setTimeout(() => removeToast(id), duration);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const fetchCurrentBranch = async () => {
        setTimeout(() => {
            console.log('✅ Branch loaded:', mockBranch);
            setCurrentBranch(mockBranch);
            setInitialLoading(false);
        }, 500);
    };

    const fetchOrderItems = async () => {
        setLoading(true);
        setTimeout(() => {
            const sortedItems = [...mockOrderItems];
            sortedItems.sort((a, b) => {
                const statusPriority = { 'NEW': 1, 'COOKING': 2, 'DONE': 3 };
                const priorityA = statusPriority[a.status] || 999;
                const priorityB = statusPriority[b.status] || 999;
                if (priorityA !== priorityB) return priorityA - priorityB;
                const timeA = new Date(a.createdAt || 0);
                const timeB = new Date(b.createdAt || 0);
                return timeA - timeB;
            });
            setOrderItems(sortedItems);
            setLoading(false);
            console.log('✅ Mock items loaded:', sortedItems.length);
        }, 500);
    };

    const updateItemStatus = async (itemId, newStatus) => {
        const item = orderItems.find(i => i.id === itemId);
        const updatedItems = orderItems.map(i =>
            i.id === itemId ? { ...i, status: newStatus } : i
        );
        setOrderItems(updatedItems);

        const statusText = {
            'COOKING': '👨‍🍳 Đang làm',
            'DONE': '✅ Hoàn thành'
        };

        showToast(
            `${statusText[newStatus]}: ${item?.product?.name}`,
            newStatus === 'DONE' ? 'success' : 'info',
            3000
        );
    };

    const getTimeAgo = (dateString) => {
        if (!dateString) return 'N/A';
        const now = new Date();
        const past = new Date(dateString);
        const diffMins = Math.floor((now - past) / 60000);
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours} giờ trước`;
    };

    const isOverdue = (dateString) => {
        if (!dateString) return false;
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

    useEffect(() => {
        console.log('🚀 ChefDashboard mounted');
        fetchCurrentBranch();
        fetchOrderItems();
    }, []);

    if (initialLoading) {
        return (
            <div className={styles.loadingContainer}>
                <RefreshCw size={48} className={styles.spinIcon} />
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
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
                            className={`${styles.itemCard} ${isOverdue(item.createdAt || item.order?.createdAt) && item.status !== 'DONE' ? styles.overdueCard : ''}`}
                        >
                            <div className={styles.itemHeader}>
                                <div className={styles.tableInfo}>
                                    {item.order?.tableNumber || `Bàn ${item.id + 10}`}
                                </div>
                                <div className={`${styles.timeInfo} ${isOverdue(item.createdAt || item.order?.createdAt) && item.status !== 'DONE' ? styles.overdueTime : ''}`}>
                                    <Clock size={14} />
                                    {getTimeAgo(item.createdAt || item.order?.createdAt)}
                                    {isOverdue(item.createdAt || item.order?.createdAt) && item.status !== 'DONE' && (
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
                                        <span className={styles.completedText}>✓ Chờ phục vụ</span>
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
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div style={{
                position: 'fixed',
                top: '80px',
                right: '20px',
                zIndex: 9999,
                pointerEvents: 'none'
            }}>
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        style={{
                            marginTop: '8px',
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
        </div>
    );
};

export default ChefDashboard;