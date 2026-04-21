import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, Play, Check, RefreshCw } from 'lucide-react';
import { kitchenAPI } from '../../../services/api';
import ToastNotification from './ToastNotification';
import styles from './ChefDashboard.module.css';

const ChefDashboard = () => {
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('ALL');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [updatingId, setUpdatingId] = useState(null);

    // Toast
    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Fetch data
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

    // Chỉ fetch 1 lần khi mount, KHÔNG có interval
    useEffect(() => {
        fetchData();
        // ❌ ĐÃ XÓA interval refresh
    }, [fetchData]);

    // Update status
    const updateStatus = async (id, status) => {
        setUpdatingId(id);
        try {
            await kitchenAPI.updateItemStatus(id, status);
            await fetchData(); // Refresh sau khi update
            showToast('✅ Cập nhật thành công!', 'success');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            showToast(`❌ Update thất bại: ${errorMsg}`, 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    // Filter
    const filtered = allItems.filter(i => {
        if (activeTab === 'WAITING') return i.status === 'WAITING';
        if (activeTab === 'PREPARING') return i.status === 'PREPARING';
        return true;
    });

    // Overdue
    const isOverdue = (time) => {
        return (Date.now() - new Date(time)) / 60000 > 15;
    };

    // Sort
    const sortedItems = [...filtered].sort((a, b) => {
        if (isOverdue(a.createdAt) !== isOverdue(b.createdAt)) {
            return isOverdue(a.createdAt) ? -1 : 1;
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

    const getTimeAgo = (t) => {
        const diff = Math.floor((Date.now() - new Date(t)) / 60000);
        if (diff < 1) return 'Vừa xong';
        if (diff < 60) return diff + ' phút';
        return Math.floor(diff / 60) + ' giờ';
    };

    return (
        <div className={styles.container}>
            {/* HEADER */}
            <div className={styles.header}>
                <div>🕐 {lastUpdated?.toLocaleTimeString() || '--:--:--'}</div>
            </div>

            {/* OVERVIEW */}
            <div className={styles.stats}>
                <div className={styles.card}>
                    ⏳ {counts.WAITING}
                    <span>Chờ</span>
                </div>
                <div className={styles.card}>
                    🔥 {counts.PREPARING}
                    <span>Đang nấu</span>
                </div>
                <div className={styles.card}>
                    ⚠️ {counts.OVERDUE}
                    <span>Quá hạn</span>
                </div>
                <div className={styles.card}>
                    📋 {counts.ALL}
                    <span>Tổng</span>
                </div>
            </div>

            {/* FILTER */}
            <div className={styles.tabs}>
                {['ALL', 'WAITING', 'PREPARING'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={activeTab === tab ? styles.activeTab : ''}
                    >
                        {tab === 'ALL' ? '📋 Tất cả' : tab === 'WAITING' ? '⏳ Món mới' : '🔥 Đang làm'} ({counts[tab]})
                    </button>
                ))}
            </div>

            {/* REFRESH BUTTON - Thêm nút làm mới thủ công */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* LIST */}
            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className={styles.grid}>
                    {sortedItems.map(item => (
                        <div
                            key={item.id}
                            className={`${styles.item} ${isOverdue(item.createdAt) ? styles.overdue : ''}`}
                        >
                            <div className={styles.top}>
                                <b>🪑 Bàn {item.table}</b>
                                <span>{getTimeAgo(item.createdAt)}</span>
                            </div>

                            <h3>{item.name}</h3>
                            <p>Số lượng: <strong>{item.quantity}</strong></p>

                            {item.notes && <p className={styles.note}>📝 {item.notes}</p>}

                            <div className={styles.footer}>
                                <span className={styles.status}>
                                    {item.status === 'WAITING' ? '⏳ Chờ làm' : '🔵 Đang nấu'}
                                </span>

                                {item.status === 'WAITING' && (
                                    <button
                                        disabled={updatingId === item.id}
                                        onClick={() => updateStatus(item.id, 'PREPARING')}
                                    >
                                        <Play size={14} /> Bắt đầu nấu
                                    </button>
                                )}

                                {item.status === 'PREPARING' && (
                                    <button
                                        disabled={updatingId === item.id}
                                        onClick={() => updateStatus(item.id, 'READY')}
                                    >
                                        <Check size={14} /> Hoàn thành
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TOAST */}
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
        </div>
    );
};

export default ChefDashboard;