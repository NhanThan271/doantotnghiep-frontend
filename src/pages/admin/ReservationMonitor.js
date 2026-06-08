import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, Phone, Search, RefreshCw, UtensilsCrossed, BookOpen, ChefHat, CreditCard } from 'lucide-react';
import axios from 'axios';
import styles from './ReservationMonitor.module.css';

const API_BASE_URL = 'http://localhost:8080';

const ORDER_STATUS_CONFIG = {
    PENDING:   { label: 'Chờ xử lý', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', icon: Clock },
    CONFIRMED: { label: 'Đã xác nhận', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: CheckCircle },
    PREPARING: { label: 'Đang nấu', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: ChefHat },
    COMPLETED: { label: 'Đã hoàn thành', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: CheckCircle },
    PAID: { label: 'Đã thanh toán', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', icon: CreditCard },
    CANCELED: { label: 'Đã hủy', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: XCircle },
};

const RESERVATION_STATUS_CONFIG = {
    PENDING: { label: 'Chờ xác nhận', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', icon: Clock },
    CONFIRMED: { label: 'Đã xác nhận', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: CheckCircle },
    CHECKED_IN: { label: 'Đã check-in', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: CheckCircle },
    COMPLETED: { label: 'Hoàn thành', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', icon: CheckCircle },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: XCircle },
    REJECTED: { label: 'Từ chối', color: '#DC2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.3)', icon: XCircle },
};

// ─── Badge ────────────────────────────────────────────────────
function StatusBadge({ status, config }) {
    const cfg = config[status] || config.PENDING;
    const Icon = cfg.icon;
    return (
        <span
            className={styles.badge}
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        >
            <Icon size={12} />
            {cfg.label}
        </span>
    );
}

// ─── Tab Orders ───────────────────────────────────────────────
function OrdersTab() {
    const [orders, setOrders] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterBranch, setFilterBranch] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/customer/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
        } catch (err) {
            console.error('Lỗi tải orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(res.data);
        } catch (err) {
            console.error('Lỗi tải branches:', err);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchBranches();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    // Lọc theo chi nhánh trước
    const ordersInBranch = filterBranch === 'all'
        ? orders
        : orders.filter(o => o.branch?.id === parseInt(filterBranch)
            || o.branch?.name === filterBranch);

    const counts = Object.keys(ORDER_STATUS_CONFIG).reduce((acc, s) => {
        acc[s] = ordersInBranch.filter(o => o.status === s).length;
        return acc;
    }, {});

    const filtered = ordersInBranch.filter(o => {
        const matchStatus = filterStatus === 'all' || o.status === filterStatus;
        const matchSearch = !searchTerm ||
            o.id?.toString().includes(searchTerm) ||
            o.table?.number?.toString().includes(searchTerm);
        return matchStatus && matchSearch;
    });

    const fmt = dt => dt ? new Date(dt).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '—';

    return (
        <div>
            {/* Status pills — luôn hiển thị tất cả */}
            <div className={styles.pillsRow}>
                <div
                    className={`${styles.pill} ${styles.pillAll} ${filterStatus === 'all' ? styles.pillAllActive : ''}`}
                    onClick={() => setFilterStatus('all')}
                >
                    Tất cả ({ordersInBranch.length})
                </div>
                {Object.entries(ORDER_STATUS_CONFIG).map(([s, cfg]) => (
                    <div
                        key={s}
                        className={styles.pill}
                        onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                        style={{
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            outline: filterStatus === s ? `2px solid ${cfg.color}` : 'none',
                            opacity: filterStatus !== 'all' && filterStatus !== s ? 0.5 : 1
                        }}
                    >
                        {cfg.label} ({counts[s] || 0})
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className={styles.filterBar}>
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        className={styles.searchInput}
                        placeholder="Tìm theo ID hoặc số bàn..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Select chi nhánh */}
                <select
                    className={styles.filterSelect}
                    value={filterBranch}
                    onChange={e => setFilterBranch(e.target.value)}
                >
                    <option value="all">Tất cả chi nhánh</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>

                <select
                    className={styles.filterSelect}
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                >
                    <option value="all">Tất cả trạng thái</option>
                    {Object.entries(ORDER_STATUS_CONFIG).map(([s, cfg]) => (
                        <option key={s} value={s}>{cfg.label}</option>
                    ))}
                </select>

                <button className={styles.refreshBtn} onClick={fetchOrders} disabled={loading}>
                    <RefreshCw size={15} className={loading ? styles.spinning : ''} />
                    Làm mới
                </button>
            </div>

            {/* Content giữ nguyên */}
            {loading && orders.length === 0 ? (
                <div className={styles.loadingState}>
                    <RefreshCw size={32} className={styles.loadingIcon} />
                    <p>Đang tải...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className={styles.emptyState}>
                    <UtensilsCrossed size={40} className={styles.emptyIcon} />
                    <p>Không có đơn hàng nào</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {['ID', 'Chi nhánh', 'Bàn / Phòng', 'Tổng tiền', 'Trạng thái', 'Thời gian tạo', 'Cập nhật'].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(order => (
                                <tr key={order.id}>
                                    <td className={styles.tdId}>#{order.id}</td>
                                    <td>{order.branch?.name || '—'}</td>
                                    <td>
                                        {order.table
                                            ? `Bàn ${order.table.number}`
                                            : order.room
                                                ? `Phòng ${order.room.name}`
                                                : '—'}
                                    </td>
                                    <td className={styles.tdMoney}>
                                        {order.totalAmount?.toLocaleString('vi-VN')}đ
                                    </td>
                                    <td>
                                        <StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />
                                    </td>
                                    <td className={styles.tdMuted}>{fmt(order.createdAt)}</td>
                                    <td className={styles.tdMuted}>{fmt(order.updatedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Tab Reservations ─────────────────────────────────────────
function ReservationsTab() {
    const [reservations, setReservations] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterBranch, setFilterBranch] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchReservations = async () => {
        const token = localStorage.getItem('token');

        const res = await axios.get(
            `${API_BASE_URL}/api/reservations/status`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        setReservations(res.data);
    };

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(res.data);
        } catch (err) {
            console.error('Lỗi tải branches:', err);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchReservations();
    }, []);

    useEffect(() => {
        const interval = setInterval(fetchReservations, 30000);
        return () => clearInterval(interval);
    }, [filterStatus]);

    // Đếm theo status — dựa trên reservations đã lọc branch
    const reservationsInBranch = filterBranch === 'all'
        ? reservations
        : reservations.filter(r => r.branchName === filterBranch);

    const counts = Object.keys(RESERVATION_STATUS_CONFIG).reduce((acc, s) => {
        acc[s] = reservationsInBranch.filter(r => r.status === s).length;
        return acc;
    }, {});

    const filtered = reservationsInBranch.filter(r => {
        const matchStatus =
            filterStatus === 'all' ||
            r.status === filterStatus;

        const matchSearch =
            !searchTerm ||
            r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.phone?.includes(searchTerm);

        return matchStatus && matchSearch;
    });

    const fmt = dt => dt ? new Date(dt).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }) : '—';

    return (
        <div>
            {/* Status pills — luôn hiển thị tất cả */}
            <div className={styles.pillsRow}>
                <div
                    className={`${styles.pill} ${styles.pillAll} ${filterStatus === 'all' ? styles.pillAllActive : ''}`}
                    onClick={() => setFilterStatus('all')}
                >
                    Tất cả ({reservationsInBranch.length})
                </div>
                {Object.entries(RESERVATION_STATUS_CONFIG).map(([s, cfg]) => (
                    <div
                        key={s}
                        className={styles.pill}
                        onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                        style={{
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            outline: filterStatus === s ? `2px solid ${cfg.color}` : 'none',
                            opacity: filterStatus !== 'all' && filterStatus !== s ? 0.5 : 1
                        }}
                    >
                        {cfg.label} ({counts[s] || 0})
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className={styles.filterBar}>
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        className={styles.searchInput}
                        placeholder="Tìm theo tên khách hoặc SĐT..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Select chi nhánh */}
                <select
                    className={styles.filterSelect}
                    value={filterBranch}
                    onChange={e => setFilterBranch(e.target.value)}
                >
                    <option value="all">Tất cả chi nhánh</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                </select>

                <button className={styles.refreshBtn} onClick={fetchReservations} disabled={loading}>
                    <RefreshCw size={15} className={loading ? styles.spinning : ''} />
                    Làm mới
                </button>
            </div>

            {/* Content */}
            {loading && reservations.length === 0 ? (
                <div className={styles.loadingState}>
                    <RefreshCw size={32} className={styles.loadingIcon} />
                    <p>Đang tải...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className={styles.emptyState}>
                    <BookOpen size={40} className={styles.emptyIcon} />
                    <p>Không có đặt bàn nào</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {['ID', 'Khách hàng', 'SĐT', 'Email', 'Chi nhánh', 'Bàn / Phòng', 'Check-in', 'Check-out', 'Còn lại', 'Trạng thái'].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id}>
                                    <td className={styles.tdId}>#{r.id}</td>
                                    <td className={styles.tdName}>{r.customerName || '—'}</td>
                                    <td>
                                        <div className={styles.tdFlex}>
                                            <Phone size={13} color="#94A3B8" />
                                            {r.phone || '—'}
                                        </div>
                                    </td>
                                    <td className={styles.tdMuted}>{r.email || '—'}</td>
                                    <td>{r.branchName || '—'}</td>
                                    <td>
                                        {r.tableNumber
                                            ? `Bàn ${r.tableNumber}`
                                            : r.roomNumber
                                                ? `Phòng ${r.roomNumber}`
                                                : '—'}
                                    </td>
                                    <td className={styles.tdMuted}>{fmt(r.checkInTime)}</td>
                                    <td className={styles.tdMuted}>{fmt(r.checkOutTime)}</td>
                                    <td className={styles.tdMoney}>
                                        {r.remainingAmount != null
                                            ? `${r.remainingAmount.toLocaleString('vi-VN')}đ`
                                            : '—'}
                                    </td>
                                    <td>
                                        <StatusBadge status={r.status} config={RESERVATION_STATUS_CONFIG} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Component chính ──────────────────────────────────────────
export default function ReservationMonitor() {
    const [activeTab, setActiveTab] = useState('orders');

    const tabs = [
        { key: 'orders', label: 'Đơn hàng', icon: UtensilsCrossed },
        { key: 'reservations', label: 'Đặt trước', icon: BookOpen },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Giám sát hệ thống</h1>
                <p className={styles.subtitle}>Theo dõi đơn hàng và đặt bàn theo thời gian thực</p>
            </div>

            <div className={styles.tabBar}>
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        className={`${styles.tabBtn} ${activeTab === key ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab(key)}
                    >
                        <Icon size={16} />
                        {label}
                    </button>
                ))}
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'orders' && <OrdersTab />}
                {activeTab === 'reservations' && <ReservationsTab />}
            </div>
        </div>
    );
}