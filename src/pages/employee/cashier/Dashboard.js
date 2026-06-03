// pages/employee/cashier/Dashboard.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Play, StopCircle, Clock, AlertCircle, RefreshCw, Eye,
    DollarSign, Receipt, CreditCard, TrendingUp, Users,
    Wallet, History, BarChart3, Phone, Building2,
    ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle,
    FileText, Loader, Coffee, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ToastNotification from "./ToastNotification";
import styles from "./Dashboard.module.css";

// Constants
const PAYMENT_METHODS = {
    CASH: { label: 'Tiền mặt', icon: DollarSign, color: '#10b981' },
    MOMO: { label: 'MoMo', icon: Phone, color: '#8b5cf6' },
    MOBILE: { label: 'Ví điện tử', icon: Phone, color: '#8b5cf6' },
    BANKING: { label: 'Chuyển khoản', icon: Building2, color: '#3b82f6' },
    CARD: { label: 'Thẻ', icon: CreditCard, color: '#3b82f6' }
};

const API_BASE_URL = 'http://localhost:8080/api';

const Dashboard = () => {
    const navigate = useNavigate();
    const intervalRef = useRef(null);
    const errorTimeoutRef = useRef(null);

    const [displayFloatAmount, setDisplayFloatAmount] = useState("");
    const [displayCashAmount, setDisplayCashAmount] = useState("");

    // ===== TOAST STATE =====
    const [toasts, setToasts] = useState([]);

    // Add toast
    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    // Remove toast
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const [state, setState] = useState({
        currentShift: null,
        loading: false,
        error: null,
        showStartShiftModal: false,
        showEndShiftModal: false,
        showCashModal: false,
        cashAction: null,
        cashAmount: "",
        cashReason: "",
        floatAmount: "",
        user: {},
        recentOrders: [],
        cashTransactions: [],
        stats: {
            todayRevenue: 0, totalOrders: 0, pendingOrders: 0,
            cashRevenue: 0, mobileRevenue: 0, cardRevenue: 0, bankingRevenue: 0
        },
        paymentMethods: [],
        hourlyRevenue: [],
        lastUpdated: null
    });

    // Auto-clear error messages
    const showMessage = useCallback((type, message) => {
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        if (type === 'success') {
            addToast(message, 'success', 4000);
        } else {
            addToast(message, 'error', 6000);
            updateState({ error: message });
            errorTimeoutRef.current = setTimeout(() => updateState({ error: null }), 8000);
        }
    }, [addToast]);

    // Format helpers
    const formatNumberInput = (value) => {
        const cleanValue = value.toString().replace(/[^0-9]/g, '');
        if (!cleanValue) return '';
        return parseInt(cleanValue, 10).toLocaleString('vi-VN');
    };

    const parseNumberFromInput = (formattedValue) => {
        if (!formattedValue) return '';
        return formattedValue.replace(/\./g, '');
    };

    const updateState = useCallback((updates) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    const getToken = () => localStorage.getItem('token');

    const getHeaders = useCallback(() => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    }), []);

    // Initialize
    useEffect(() => {
        const init = async () => {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            updateState({ user: userData });
            await fetchDashboardData();
        };
        init();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        };
    }, []);

    // Auto-refresh
    useEffect(() => {
        if (state.currentShift) {
            intervalRef.current = setInterval(() => fetchDashboardData(false), 30000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [state.currentShift]);

    const fetchDashboardData = async (showLoading = true) => {
        if (showLoading) updateState({ loading: true, error: null });
        try {
            await Promise.allSettled([
                fetchCurrentShift(),
                fetchStats(),
                fetchRecentOrders(),
                fetchHourlyRevenue()
            ]);
            updateState({ lastUpdated: new Date() });
        } catch (error) {
            console.error("Fetch error:", error);
            if (showLoading) showMessage('error', "Không thể tải dữ liệu. Vui lòng thử lại.");
        } finally {
            if (showLoading) updateState({ loading: false });
        }
    };

    // ===== FETCH FUNCTIONS =====
    const fetchCurrentShift = async () => {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const staffId = currentUser.id || currentUser.staffId;
        if (!staffId) { updateState({ currentShift: null, cashTransactions: [] }); return; }

        try {
            const response = await fetch(`${API_BASE_URL}/cashier-sessions/current/${staffId}`, {
                headers: getHeaders()
            });
            if (response.status === 404) { updateState({ currentShift: null, cashTransactions: [] }); return; }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            if (!text || text === 'null') { updateState({ currentShift: null, cashTransactions: [] }); return; }
            const data = JSON.parse(text);
            updateState({ currentShift: data, cashTransactions: data.cashTransactions || [] });
        } catch (error) {
            console.error("Fetch shift error:", error);
            updateState({ currentShift: null, cashTransactions: [] });
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/employee/bills`, { headers: getHeaders() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const bills = await response.json();

            const shiftStartTime = state.currentShift?.openedAt
                ? new Date(state.currentShift.openedAt).getTime()
                : null;

            const today = new Date().toISOString().split('T')[0];

            const todayBills = bills.filter(bill => {
                const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
                const billTime = new Date(bill.createdAt).getTime();
                if (shiftStartTime) return billDate === today && billTime >= shiftStartTime;
                return billDate === today;
            });

            const paidBills = todayBills.filter(bill => bill.paymentStatus === 'PAID');

            const revenueByMethod = {};
            paidBills.forEach(bill => {
                const method = bill.paymentMethod || 'CASH';
                if (!revenueByMethod[method]) revenueByMethod[method] = { revenue: 0, count: 0 };
                revenueByMethod[method].revenue += bill.totalAmount || 0;
                revenueByMethod[method].count += 1;
            });

            const stats = {
                todayRevenue: paidBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
                totalOrders: paidBills.length,
                pendingOrders: todayBills.filter(b => b.paymentStatus !== 'PAID').length,
                cashRevenue: revenueByMethod.CASH?.revenue || 0,
                mobileRevenue: (revenueByMethod.MOBILE?.revenue || 0) + (revenueByMethod.MOMO?.revenue || 0),
                cardRevenue: revenueByMethod.CARD?.revenue || 0,
                bankingRevenue: revenueByMethod.BANKING?.revenue || 0,
            };

            const paymentMethods = Object.entries(PAYMENT_METHODS).map(([key, config]) => {
                let totalRevenue = revenueByMethod[key]?.revenue || 0;
                let totalCount = revenueByMethod[key]?.count || 0;
                if (key === 'MOBILE') {
                    totalRevenue += revenueByMethod.MOMO?.revenue || 0;
                    totalCount += revenueByMethod.MOMO?.count || 0;
                }
                return {
                    key, name: config.label, Icon: config.icon, color: config.color,
                    value: totalRevenue, count: totalCount,
                    percentage: stats.todayRevenue > 0 ? ((totalRevenue / stats.todayRevenue) * 100).toFixed(1) : 0
                };
            }).filter(m => m.count > 0 || m.value > 0);

            updateState({ stats, paymentMethods });
        } catch (error) { console.error("Stats error:", error); }
    };

    const fetchRecentOrders = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/employee/bills`, { headers: getHeaders() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const bills = await response.json();

            // Hàm lấy số bàn đúng
            const getTableNumber = async (bill) => {
                try {
                    // Thử lấy từ order trước
                    if (bill.order?.id) {
                        const orderRes = await fetch(`${API_BASE_URL}/customer/orders/${bill.order.id}`, {
                            headers: getHeaders()
                        });
                        if (orderRes.ok) {
                            const orderData = await orderRes.json();
                            if (orderData.table?.number) return `Bàn ${orderData.table.number}`;
                            if (orderData.room?.number) return `Phòng ${orderData.room.number}`;
                        }
                    }
                    // Fallback: lấy từ bill.order?.table?.number
                    if (bill.order?.table?.number) return `Bàn ${bill.order.table.number}`;
                    if (bill.order?.room?.number) return `Phòng ${bill.order.room.number}`;
                    if (bill.room?.number) return `Phòng ${bill.room.number}`;
                    return 'Takeaway';
                } catch (error) {
                    return 'Takeaway';
                }
            };

            // Lấy số bàn cho từng bill (có thể chậm, nên dùng Promise.all)
            const recentBills = await Promise.all(
                bills
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 10)
                    .map(async (bill) => ({
                        id: bill.id,
                        code: `#${bill.id}`,
                        tableNumber: await getTableNumber(bill),
                        createdAt: bill.createdAt,
                        totalAmount: bill.totalAmount || 0,
                        paymentStatus: bill.paymentStatus === 'PAID' ? 'paid' : 'pending',
                        paymentMethod: bill.paymentMethod || 'CASH',
                        items: bill.order?.orderItems?.length || bill.items?.length || 0
                    }))
            );

            updateState({ recentOrders: recentBills });
        } catch (error) {
            console.error("Orders error:", error);
        }
    };

    const fetchHourlyRevenue = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/employee/bills`, { headers: getHeaders() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const bills = await response.json();
            const shiftStartTime = state.currentShift?.openedAt
                ? new Date(state.currentShift.openedAt).getTime() : null;
            const today = new Date().toISOString().split('T')[0];
            const todayBills = bills.filter(bill => {
                const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
                const billTime = new Date(bill.createdAt).getTime();
                const isPaid = bill.paymentStatus === 'PAID';
                if (shiftStartTime) return billDate === today && billTime >= shiftStartTime && isPaid;
                return billDate === today && isPaid;
            });
            const hourlyMap = {};
            for (let i = 0; i < 24; i++) hourlyMap[i] = { hour: i, revenue: 0, orders: 0 };
            todayBills.forEach(bill => {
                const hour = new Date(bill.createdAt).getHours();
                hourlyMap[hour].revenue += bill.totalAmount || 0;
                hourlyMap[hour].orders += 1;
            });
            updateState({ hourlyRevenue: Object.values(hourlyMap) });
        } catch (error) { console.error("Hourly error:", error); }
    };

    // ===== SHIFT ACTIONS =====
    const openStartShiftModal = () => {
        updateState({ showStartShiftModal: true, error: null, floatAmount: "" });
        setDisplayFloatAmount("");
    };

    const startShift = async () => {
        const { floatAmount, user } = state;
        const staffId = user.id || user.staffId;
        const branchId = user.branch?.id || user.branchId;

        if (!floatAmount || parseFloat(floatAmount) <= 0) {
            showMessage('error', "Vui lòng nhập số tiền quỹ đầu ca hợp lệ");
            return;
        }
        if (parseFloat(floatAmount) > 100000000) {
            showMessage('error', "Số tiền quỹ đầu ca không được vượt quá 100,000,000đ");
            return;
        }
        if (!staffId) {
            showMessage('error', "Không tìm thấy thông tin nhân viên.");
            return;
        }

        updateState({ loading: true, error: null });
        try {
            const response = await fetch(`${API_BASE_URL}/cashier-sessions/open`, {
                method: 'POST', headers: getHeaders(),
                body: JSON.stringify({ openingCash: parseFloat(floatAmount), branchId, staffId, shiftId: null })
            });
            if (!response.ok) throw new Error((await response.json()).message || "Không thể bắt đầu ca");
            const data = await response.json();

            updateState({
                currentShift: data, showStartShiftModal: false, floatAmount: "",
                cashTransactions: data.cashTransactions || [], error: null,
                stats: { todayRevenue: 0, totalOrders: 0, pendingOrders: 0, cashRevenue: 0, mobileRevenue: 0, cardRevenue: 0, bankingRevenue: 0 },
                paymentMethods: [], hourlyRevenue: [], recentOrders: []
            });
            setDisplayFloatAmount("");
            addToast("✅ Bắt đầu ca thành công!", 'success', 3000);
            await fetchDashboardData(false);
        } catch (error) {
            showMessage('error', error.message);
        } finally {
            updateState({ loading: false });
        }
    };

    const endShift = async () => {
        const { currentShift } = state;
        const summary = getShiftSummary();
        if (!currentShift?.id) {
            showMessage('error', "Không có ca làm việc để kết thúc");
            updateState({ showEndShiftModal: false });
            return;
        }

        updateState({ loading: true, error: null });
        try {
            const response = await fetch(`${API_BASE_URL}/cashier-sessions/${currentShift.id}/close`, {
                method: 'POST', headers: getHeaders(),
                body: JSON.stringify({
                    actualCash: summary.currentCash,
                    note: `Kết thúc ca - DT: ${formatCurrency(summary.revenue)} - Đơn: ${summary.orderCount}`
                })
            });
            if (!response.ok) throw new Error((await response.json()).message || "Không thể kết thúc ca");
            const data = await response.json();

            const difference = data.differenceAmount || 0;
            const diffText = difference === 0
                ? "Không có chênh lệch"
                : (difference > 0 ? `Dư: ${formatCurrency(difference)}` : `Thiếu: ${formatCurrency(Math.abs(difference))}`);

            addToast(
                `✅ Kết thúc ca thành công!\n` +
                `📊 DT tiền mặt: ${formatCurrency(data.cashRevenue || summary.cashRevenue)}\n` +
                `💳 DT chuyển khoản: ${formatCurrency(data.transferRevenue || summary.nonCashRevenue)}\n` +
                `💰 Tổng DT: ${formatCurrency(data.totalRevenue || summary.revenue)}\n` +
                `📋 Số đơn: ${data.totalOrders || summary.orderCount}\n` +
                `💵 Tiền mặt thực tế: ${formatCurrency(data.actualCash || summary.currentCash)}\n` +
                `📝 Chênh lệch: ${diffText}`,
                'success',
                8000
            );

            updateState({
                currentShift: null, showEndShiftModal: false, cashTransactions: [],
                stats: { todayRevenue: 0, totalOrders: 0, pendingOrders: 0, cashRevenue: 0, mobileRevenue: 0, cardRevenue: 0, bankingRevenue: 0 },
                paymentMethods: [], hourlyRevenue: [], recentOrders: [], error: null
            });
        } catch (error) {
            showMessage('error', error.message);
            updateState({ showEndShiftModal: false });
        } finally {
            updateState({ loading: false });
        }
    };

    const openCashModal = (action) => {
        updateState({ showCashModal: true, cashAction: action, cashAmount: "", cashReason: "", error: null });
        setDisplayCashAmount("");
    };

    const handleCashAction = async () => {
        updateState({ showCashModal: false, cashAmount: "", cashReason: "" });
        setDisplayCashAmount("");
        addToast("⚠️ Tính năng Rút/Nộp tiền đang được phát triển.", 'warning', 4000);
    };

    const closeAllModals = () => {
        updateState({
            showStartShiftModal: false, showEndShiftModal: false, showCashModal: false,
            cashAction: null, cashAmount: "", cashReason: "", floatAmount: "", error: null
        });
        setDisplayFloatAmount(""); setDisplayCashAmount("");
    };

    // ===== HELPERS =====
    const formatCurrency = (amount) => {
        if (amount == null || isNaN(amount)) return "0đ";
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "--:--";
        return new Date(dateString).toLocaleString('vi-VN', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return "--:--";
        return new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (start, end) => {
        if (!start) return "00:00:00";
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : new Date();
        const diff = Math.abs(endTime - startTime);
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const getPaymentMethodInfo = (method) => {
        return PAYMENT_METHODS[method] || { label: method || 'Không xác định', icon: CreditCard, color: '#9ca3af' };
    };

    // ===== ĐÃ SỬA: Điều hướng đúng với routes trong App.js =====
    const handleViewOrder = (orderId) => navigate(`/cashier/bill?orderId=${orderId}`);
    const handleCreateOrder = () => navigate('/cashier/tables');

    const getShiftSummary = () => {
        const { currentShift, stats } = state;
        if (!currentShift) return null;
        const openingCash = currentShift.openingCash || 0;
        const cashRevenue = stats.cashRevenue;
        const totalRevenue = stats.todayRevenue;
        const nonCashRevenue = totalRevenue - cashRevenue;
        const totalCashFlow = 0;
        const currentCash = openingCash + cashRevenue + totalCashFlow;
        const amountToDeposit = currentCash - openingCash;
        return {
            floatAmount: openingCash, currentCash, revenue: totalRevenue,
            cashRevenue, nonCashRevenue, totalCashFlow,
            amountToDeposit: amountToDeposit > 0 ? amountToDeposit : 0,
            orderCount: stats.totalOrders
        };
    };

    const {
        currentShift, loading, error, showStartShiftModal, showEndShiftModal,
        showCashModal, cashAction, cashAmount, cashReason, floatAmount,
        user, recentOrders, cashTransactions, stats, paymentMethods,
        hourlyRevenue
    } = state;

    const shiftSummary = getShiftSummary();
    const maxHourlyRevenue = Math.max(...hourlyRevenue.map(h => h.revenue), 0);

    return (
        <div className={styles.container}>
            {/* ===== TOAST CONTAINER ===== */}
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                pointerEvents: 'none'
            }}>
                {toasts.map(toast => (
                    <ToastNotification
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h2>Dashboard Thu Ngân</h2>
                    {currentShift && (
                        <div className={styles.shiftStatus}>
                            <div className={styles.shiftTimer}>
                                <Clock size={14} />
                                {formatDuration(currentShift.openedAt)}
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles.headerRight}>
                    {!currentShift ? (
                        <button onClick={openStartShiftModal} className={styles.startShiftBtn} disabled={loading}>
                            <Play size={16} /> Bắt đầu ca
                        </button>
                    ) : (
                        <>
                            <button onClick={handleCreateOrder} className={styles.createOrderBtn}>
                                <Coffee size={16} /> Tạo đơn
                            </button>
                            <button onClick={() => updateState({ showEndShiftModal: true, error: null })} className={styles.endShiftBtn} disabled={loading}>
                                <StopCircle size={16} /> Kết thúc ca
                            </button>
                        </>
                    )}
                    <button onClick={() => fetchDashboardData()} className={styles.refreshBtn} disabled={loading}>
                        <RefreshCw size={16} className={loading ? styles.spinning : ''} />
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className={styles.errorAlert}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button onClick={() => updateState({ error: null })}><X size={14} /></button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className={styles.loadingOverlay}>
                    <Loader size={32} className={styles.spinning} />
                    <span>Đang tải...</span>
                </div>
            )}

            {/* Stats */}
            <div className={styles.statsGrid}>
                {[
                    { icon: DollarSign, label: 'Doanh thu hôm nay', value: stats.todayRevenue, sub: `${stats.totalOrders} đơn`, color: '#10b981', bg: '#10b98120' },
                    { icon: DollarSign, label: 'Tiền mặt', value: stats.cashRevenue, sub: `${stats.todayRevenue > 0 ? ((stats.cashRevenue / stats.todayRevenue) * 100).toFixed(1) : 0}%`, color: '#3b82f6', bg: '#3b82f620' },
                    { icon: CreditCard, label: 'Chuyển khoản/Thẻ', value: stats.mobileRevenue + stats.cardRevenue + stats.bankingRevenue, sub: 'MoMo + Thẻ + CK', color: '#8b5cf6', bg: '#8b5cf620' },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: s.bg, color: s.color }}><Icon size={24} /></div>
                            <div className={styles.statInfo}>
                                <div className={styles.statTitle}>{s.label}</div>
                                <div className={styles.statValue}>{formatCurrency(s.value)}</div>
                                <div className={styles.statSub}>{s.sub}</div>
                            </div>
                        </div>
                    );
                })}
                {stats.pendingOrders > 0 && (
                    <div className={`${styles.statCard} ${styles.warningCard}`}>
                        <div className={styles.statIcon} style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}><AlertCircle size={24} /></div>
                        <div className={styles.statInfo}>
                            <div className={styles.statTitle}>Đơn chờ TT</div>
                            <div className={styles.statValue}>{stats.pendingOrders}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Methods */}
            {paymentMethods.length > 0 && (
                <div className={styles.paymentMethodsCard}>
                    <h3><CreditCard size={18} /> Phương thức thanh toán</h3>
                    <div className={styles.methodsGrid}>
                        {paymentMethods.map((m, i) => {
                            const Icon = m.Icon;
                            return (
                                <div key={i} className={styles.methodItem}>
                                    <div className={styles.methodIcon} style={{ color: m.color }}><Icon size={20} /></div>
                                    <div className={styles.methodInfo}>
                                        <div className={styles.methodName}>{m.name}</div>
                                        <div className={styles.methodValue}>{formatCurrency(m.value)}</div>
                                        <div className={styles.methodCount}>{m.count} đơn ({m.percentage}%)</div>
                                    </div>
                                    <div className={styles.methodBar}>
                                        <div className={styles.methodBarFill} style={{ width: `${m.percentage}%`, backgroundColor: m.color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Current Shift */}
            {currentShift ? (
                <>
                    <div className={styles.shiftInfoCard}>
                        <div className={styles.shiftInfoHeader}>
                            <h3><History size={18} /> Ca hiện tại</h3>
                            <div className={styles.actionButtons}>
                                <button onClick={() => openCashModal('withdraw')} className={styles.withdrawBtn} disabled={loading}>
                                    <ArrowUpCircle size={14} /> Rút tiền
                                </button>
                                <button onClick={() => openCashModal('deposit')} className={styles.depositBtn} disabled={loading}>
                                    <ArrowDownCircle size={14} /> Nộp tiền
                                </button>
                            </div>
                        </div>
                        <div className={styles.shiftInfoGrid}>
                            {[
                                { icon: Clock, label: 'Bắt đầu', value: formatDateTime(currentShift.openedAt) },
                                { icon: Users, label: 'Thu ngân', value: user?.fullName || '---' },
                                { icon: Wallet, label: 'Quỹ đầu ca', value: formatCurrency(shiftSummary?.floatAmount) },
                                { icon: TrendingUp, label: 'Doanh thu', value: formatCurrency(shiftSummary?.revenue) },
                                { icon: DollarSign, label: 'Tiền mặt hiện có', value: formatCurrency(shiftSummary?.currentCash), highlight: true },
                                { icon: Receipt, label: 'Số đơn', value: `${shiftSummary?.orderCount || 0} đơn` },
                            ].map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <div key={i} className={styles.infoItem}>
                                        <span className={styles.infoLabel}><Icon size={14} /> {item.label}:</span>
                                        <span className={item.highlight ? styles.infoValueHighlight : styles.infoValue}>{item.value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Hourly Chart */}
                    <div className={styles.hourlyRevenueCard}>
                        <h3><BarChart3 size={18} /> Doanh thu theo giờ</h3>
                        <div className={styles.chartContainer}>
                            {hourlyRevenue.map(data => (
                                <div key={data.hour} className={styles.chartBarGroup}>
                                    <div className={styles.chartBar}>
                                        <div className={styles.chartBarFill}
                                            style={{ height: `${maxHourlyRevenue > 0 ? (data.revenue / maxHourlyRevenue) * 100 : 0}%`, backgroundColor: data.revenue > 0 ? '#10b981' : '#e5e7eb' }} />
                                    </div>
                                    <div className={styles.chartBarLabel}>{data.hour.toString().padStart(2, '0')}:00</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cash Transactions */}
                    {cashTransactions.length > 0 && (
                        <div className={styles.transactionsCard}>
                            <h3><History size={18} /> Giao dịch tiền mặt</h3>
                            <div className={styles.tableWrapper}>
                                <table className={styles.transactionsTable}>
                                    <thead>
                                        <tr>
                                            <th>Loại</th>
                                            <th>Thời gian</th>
                                            <th>Số tiền</th>
                                            <th>Lý do</th>
                                            <th>Số dư</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cashTransactions.map((tx, i) => {
                                            const isWithdraw = tx.type === 'withdraw' || tx.type === 'CASH_OUT';
                                            return (
                                                <tr key={tx.id || i} className={isWithdraw ? styles.withdrawRow : styles.depositRow}>
                                                    <td><span className={isWithdraw ? styles.withdrawBadge : styles.depositBadge}>
                                                        {isWithdraw ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                                                        {isWithdraw ? ' Rút' : ' Nộp'}
                                                    </span></td>
                                                    <td>{formatDateTime(tx.createdAt || tx.transactionDate)}</td>
                                                    <td className={isWithdraw ? styles.withdrawAmount : styles.depositAmount}>
                                                        {isWithdraw ? '-' : '+'}{formatCurrency(tx.amount)}
                                                    </td>
                                                    <td>{tx.reason || tx.note || '--'}</td>
                                                    <td>{formatCurrency(tx.balanceAfter || tx.currentBalance)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Recent Orders */}
                    <div className={styles.recentOrdersCard}>
                        <div className={styles.cardHeader}>
                            <h3><Receipt size={18} /> Đơn hàng gần đây</h3>
                            <button onClick={() => navigate('/cashier/bill')} className={styles.viewAllBtn}>Xem tất cả</button>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.ordersTable}>
                                <thead>
                                    <tr>
                                        <th>Mã</th>
                                        <th>Bàn</th>
                                        <th>Giờ</th>
                                        <th>Tiền</th>
                                        <th>Phương thức</th>
                                        <th>Xem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.length > 0 ? recentOrders.map(order => {
                                        // Lấy thông tin phương thức thanh toán
                                        const getPaymentMethodDisplay = (method) => {
                                            const methods = {
                                                'CASH': '💵 Tiền mặt',
                                                'MOMO': '📱 MoMo',
                                                'MOBILE': '📱 Ví điện tử',
                                                'BANKING': '🏦 Chuyển khoản',
                                                'CARD': '💳 Thẻ'
                                            };
                                            return methods[method] || method || '💵 Tiền mặt';
                                        };

                                        return (
                                            <tr key={order.id} className={order.paymentStatus === 'paid' ? styles.paidRow : styles.pendingRow}>
                                                <td>{order.code}</td>
                                                <td>{order.tableNumber}</td>
                                                <td>{formatTime(order.createdAt)}</td>
                                                <td>{formatCurrency(order.totalAmount)}</td>
                                                <td>{getPaymentMethodDisplay(order.paymentMethod)}</td>
                                                <td>
                                                    <button onClick={() => handleViewOrder(order.id)} className={styles.viewBtn}>
                                                        <Eye size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan={6} className={styles.noData}>Chưa có đơn</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className={styles.noShiftCard}>
                    <div className={styles.noShiftContent}>
                        <Coffee size={64} />
                        <h3>Chưa có ca làm việc</h3>
                        <p>Nhấn "Bắt đầu ca" để bắt đầu</p>
                        <button onClick={openStartShiftModal} className={styles.startShiftLargeBtn} disabled={loading}>
                            <Play size={20} /> Bắt đầu ca ngay
                        </button>
                    </div>
                </div>
            )}

            {/* Start Shift Modal */}
            {showStartShiftModal && (
                <div className={styles.modalOverlay} onClick={closeAllModals}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3><Play size={18} /> Bắt đầu ca</h3>
                            <button onClick={closeAllModals}><X size={20} /></button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.formGroup}>
                                <label><Wallet size={14} /> Quỹ đầu ca *</label>
                                <input type="text" placeholder="2.000.000" value={displayFloatAmount}
                                    onChange={e => { setDisplayFloatAmount(formatNumberInput(e.target.value)); updateState({ floatAmount: parseNumberFromInput(formatNumberInput(e.target.value)) }); }}
                                    className={styles.modalInput} autoFocus />
                            </div>
                            <div className={styles.quickAmounts}>
                                {[500000, 1000000, 2000000, 5000000].map(amount => (
                                    <button key={amount} onClick={() => { setDisplayFloatAmount(formatNumberInput(amount.toString())); updateState({ floatAmount: amount.toString() }); }}
                                        className={`${styles.quickAmountBtn} ${floatAmount === amount.toString() ? styles.active : ''}`}>
                                        {formatCurrency(amount)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={closeAllModals} className={styles.cancelBtn}>Hủy</button>
                            <button onClick={startShift} disabled={loading || !floatAmount} className={styles.confirmBtn}>
                                {loading ? <Loader size={16} className={styles.spinning} /> : 'Bắt đầu ca'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Shift Modal */}
            {showEndShiftModal && shiftSummary && (
                <div className={styles.modalOverlay} onClick={closeAllModals}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3><StopCircle size={18} /> Kết thúc ca</h3>
                            <button onClick={closeAllModals}><X size={20} /></button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.endShiftSummary}>
                                <h4>Tổng kết</h4>
                                {[
                                    { icon: Wallet, label: 'Quỹ đầu ca', value: formatCurrency(shiftSummary.floatAmount) },
                                    { icon: TrendingUp, label: 'Tổng doanh thu', value: formatCurrency(shiftSummary.revenue) },
                                    { icon: DollarSign, label: 'Doanh thu tiền mặt', value: formatCurrency(shiftSummary.cashRevenue) },
                                    { icon: CreditCard, label: 'Thanh toán khác', value: formatCurrency(shiftSummary.nonCashRevenue) },
                                    { icon: Receipt, label: 'Số đơn', value: `${shiftSummary.orderCount} đơn` },
                                    { icon: DollarSign, label: 'Tiền mặt hiện tại', value: formatCurrency(shiftSummary.currentCash), highlight: true },
                                    { icon: TrendingUp, label: 'Tiền phải nộp', value: formatCurrency(shiftSummary.amountToDeposit), highlight: true },
                                ].map((item, i) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={i} className={`${styles.summaryRow} ${item.highlight ? styles.summaryRowHighlight : ''}`}>
                                            <span><Icon size={14} /> {item.label}:</span>
                                            <strong>{item.value}</strong>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={closeAllModals} className={styles.cancelBtn}>Hủy</button>
                            <button onClick={endShift} disabled={loading} className={styles.endShiftConfirmBtn}>
                                {loading ? <Loader size={16} className={styles.spinning} /> : 'Xác nhận kết thúc'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Modal */}
            {showCashModal && (
                <div className={styles.modalOverlay} onClick={closeAllModals}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>{cashAction === 'withdraw' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                                {cashAction === 'withdraw' ? ' Rút tiền' : ' Nộp tiền'}</h3>
                            <button onClick={closeAllModals}><X size={20} /></button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.formGroup}>
                                <label><DollarSign size={14} /> Số tiền *</label>
                                <input type="text" placeholder="1.000.000" value={displayCashAmount}
                                    onChange={e => { setDisplayCashAmount(formatNumberInput(e.target.value)); updateState({ cashAmount: parseNumberFromInput(formatNumberInput(e.target.value)) }); }}
                                    className={styles.modalInput} autoFocus />
                            </div>
                            <div className={styles.formGroup}>
                                <label><FileText size={14} /> Lý do</label>
                                <input type="text" placeholder="Nhập lý do" value={cashReason}
                                    onChange={e => updateState({ cashReason: e.target.value })} className={styles.modalInput} />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={closeAllModals} className={styles.cancelBtn}>Hủy</button>
                            <button onClick={handleCashAction} disabled={loading || !cashAmount}
                                className={cashAction === 'withdraw' ? styles.withdrawConfirmBtn : styles.depositConfirmBtn}>
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;