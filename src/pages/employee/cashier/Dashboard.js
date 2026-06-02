// pages/employee/cashier/Dashboard.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Play, StopCircle, Clock, AlertCircle, RefreshCw, Eye,
    DollarSign, Receipt, CreditCard, TrendingUp, Users,
    Wallet, History, BarChart3, Phone, Building2,
    ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle,
    FileText, Loader, Coffee
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
            todayRevenue: 0,
            totalOrders: 0,
            pendingOrders: 0,
            cashRevenue: 0,
            mobileRevenue: 0,
            cardRevenue: 0,
            bankingRevenue: 0
        },
        paymentMethods: [],
        hourlyRevenue: [],
        lastUpdated: null
    });

    // Update state helper
    const updateState = useCallback((updates) => {
        setState(prev => {
            const newState = { ...prev, ...updates };
            return newState;
        });
    }, []);

    // Get auth token
    const getToken = useCallback(() => {
        return localStorage.getItem('token');
    }, []);

    // API headers
    const getHeaders = useCallback(() => {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        };
    }, [getToken]);

    // Initialize dashboard
    useEffect(() => {
        const initializeDashboard = async () => {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('User data:', userData);
            updateState({ user: userData });
            await fetchDashboardData();
        };
        initializeDashboard();

        // Cleanup interval on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Auto-refresh every 30 seconds when shift is active
    useEffect(() => {
        if (state.currentShift) {
            intervalRef.current = setInterval(() => {
                fetchDashboardData(false);
            }, 30000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [state.currentShift]);

    // Consolidated data fetching
    const fetchDashboardData = async (showLoading = true) => {
        if (showLoading) {
            updateState({ loading: true, error: null });
        }
        try {
            const results = await Promise.allSettled([
                fetchCurrentShift(),
                fetchStats(),
                fetchRecentOrders(),
                fetchHourlyRevenue()
            ]);
            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0 && showLoading) {
                console.warn('Some data fetches failed:', failures);
            }
            updateState({ lastUpdated: new Date() });
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            if (showLoading) {
                updateState({ error: "Không thể tải dữ liệu. Vui lòng thử lại." });
            }
        } finally {
            if (showLoading) {
                updateState({ loading: false });
            }
        }
    };

    // ===== FETCH CURRENT SHIFT - SỬA ĐỂ KHỚP BACKEND =====
    const fetchCurrentShift = async () => {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const staffId = currentUser.id || currentUser.staffId;

        if (!staffId) {
            console.warn('No staff ID found');
            updateState({ currentShift: null, cashTransactions: [] });
            return;
        }

        try {
            // Sử dụng API endpoint khớp với backend: /cashier-sessions/current/{staffId}
            const response = await fetch(`${API_BASE_URL}/cashier-sessions/current/${staffId}`, {
                headers: getHeaders()
            });

            if (response.status === 404) {
                updateState({ currentShift: null, cashTransactions: [] });
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            if (!text || text === 'null' || text === '') {
                updateState({ currentShift: null, cashTransactions: [] });
                return;
            }

            const data = JSON.parse(text);
            console.log('Current shift data:', data);

            updateState({
                currentShift: data,
                cashTransactions: data.cashTransactions || []
            });
        } catch (error) {
            console.error("Error fetching current shift:", error);
            updateState({ currentShift: null, cashTransactions: [] });
        }
    };

    // ===== FETCH STATS - GIỮ NGUYÊN =====
    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/employee/bills`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const bills = await response.json();
            const today = new Date().toISOString().split('T')[0];

            const todayBills = bills.filter(bill => {
                const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
                return billDate === today;
            });

            const paidBills = todayBills.filter(bill => bill.paymentStatus === 'PAID');

            const revenueByMethod = paidBills.reduce((acc, bill) => {
                const method = bill.paymentMethod || 'CASH';
                if (!acc[method]) {
                    acc[method] = { revenue: 0, count: 0 };
                }
                acc[method].revenue += bill.totalAmount || 0;
                acc[method].count += 1;
                return acc;
            }, {});

            const stats = {
                todayRevenue: paidBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
                totalOrders: paidBills.length,
                pendingOrders: bills.filter(b =>
                    b.paymentStatus !== 'PAID' &&
                    new Date(b.createdAt).toISOString().split('T')[0] === today
                ).length,
                cashRevenue: revenueByMethod.CASH?.revenue || 0,
                mobileRevenue: (revenueByMethod.MOBILE?.revenue || 0) + (revenueByMethod.MOMO?.revenue || 0),
                cardRevenue: (revenueByMethod.CARD?.revenue || 0),
                bankingRevenue: (revenueByMethod.BANKING?.revenue || 0),
                revenueByMethod
            };

            const paymentMethods = Object.entries(PAYMENT_METHODS).map(([key, config]) => {
                let methodData = revenueByMethod[key] || { revenue: 0, count: 0 };
                let totalRevenue = methodData.revenue;
                let totalCount = methodData.count;

                if (key === 'MOBILE') {
                    totalRevenue += revenueByMethod.MOMO?.revenue || 0;
                    totalCount += revenueByMethod.MOMO?.count || 0;
                }

                return {
                    key,
                    name: config.label,
                    Icon: config.icon,
                    color: config.color,
                    value: totalRevenue,
                    count: totalCount,
                    percentage: stats.todayRevenue > 0
                        ? ((totalRevenue / stats.todayRevenue) * 100).toFixed(1)
                        : 0
                };
            }).filter(method => method.count > 0 || method.value > 0);

            updateState({ stats, paymentMethods });
        } catch (error) {
            console.error("Error fetching stats:", error);
            throw error;
        }
    };

    // ===== FETCH RECENT ORDERS - GIỮ NGUYÊN =====
    const fetchRecentOrders = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/employee/bills`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const bills = await response.json();
            const recentBills = bills
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10)
                .map(bill => ({
                    id: bill.id,
                    code: `#${bill.id}`,
                    tableNumber: bill.order?.table?.number ||
                        bill.order?.room?.number ||
                        bill.room?.number ||
                        'Takeaway',
                    createdAt: bill.createdAt,
                    totalAmount: bill.totalAmount || 0,
                    paymentStatus: bill.paymentStatus === 'PAID' ? 'paid' : 'pending',
                    paymentMethod: bill.paymentMethod || 'CASH',
                    items: bill.order?.orderItems?.length || bill.items?.length || 0
                }));

            updateState({ recentOrders: recentBills });
        } catch (error) {
            console.error("Error fetching recent orders:", error);
            throw error;
        }
    };

    // ===== FETCH HOURLY REVENUE - GIỮ NGUYÊN =====
    const fetchHourlyRevenue = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/employee/bills`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const bills = await response.json();
            const today = new Date().toISOString().split('T')[0];

            const todayBills = bills.filter(bill => {
                const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
                return billDate === today && bill.paymentStatus === 'PAID';
            });

            const hourlyMap = {};
            for (let i = 0; i < 24; i++) {
                hourlyMap[i] = { hour: i, revenue: 0, orders: 0 };
            }

            todayBills.forEach(bill => {
                const hour = new Date(bill.createdAt).getHours();
                hourlyMap[hour].revenue += bill.totalAmount || 0;
                hourlyMap[hour].orders += 1;
            });

            const hourlyRevenue = Object.values(hourlyMap);
            updateState({ hourlyRevenue });
        } catch (error) {
            console.error("Error fetching hourly revenue:", error);
            throw error;
        }
    };

    // ===== START SHIFT - SỬA ĐỂ KHỚP BACKEND =====
    const startShift = async () => {
        const { floatAmount, user } = state;
        const staffId = user.id || user.staffId;
        const branchId = user.branch?.id || user.branchId;

        if (!floatAmount || parseFloat(floatAmount) <= 0) {
            alert("Vui lòng nhập số tiền quỹ đầu ca hợp lệ");
            return;
        }

        if (parseFloat(floatAmount) > 100000000) {
            alert("Số tiền quỹ đầu ca không được vượt quá 100,000,000đ");
            return;
        }

        if (!staffId) {
            alert("Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.");
            return;
        }

        updateState({ loading: true, error: null });
        try {
            // Sử dụng API endpoint khớp với backend: /cashier-sessions/open
            const response = await fetch(`${API_BASE_URL}/cashier-sessions/open`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    openingCash: parseFloat(floatAmount),
                    branchId: branchId,
                    staffId: staffId,
                    shiftId: null
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = "Không thể bắt đầu ca";
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Start shift response:', data);

            updateState({
                currentShift: data,
                showStartShiftModal: false,
                floatAmount: "",
                cashTransactions: data.cashTransactions || []
            });

            await fetchDashboardData(false);
            alert("Bắt đầu ca thành công!");

        } catch (error) {
            console.error("Error starting shift:", error);
            updateState({ error: error.message });
            alert(error.message || "Có lỗi xảy ra khi bắt đầu ca");
        } finally {
            updateState({ loading: false });
        }
    };

    // ===== END SHIFT - HOÀN CHỈNH (BỎ ALERT CONFIRM) =====
    const endShift = async () => {
        const { currentShift } = state;
        const summary = getShiftSummary();

        if (!currentShift || !currentShift.id) {
            alert("Không có ca làm việc để kết thúc");
            return;
        }

        updateState({ loading: true, error: null });

        try {
            const response = await fetch(`${API_BASE_URL}/cashier-sessions/${currentShift.id}/close`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    actualCash: summary.currentCash,
                    note: `Kết thúc ca - DT: ${formatCurrency(summary.revenue)} - Đơn: ${summary.orderCount}`
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = "Không thể kết thúc ca";
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('End shift response:', data);

            updateState({
                currentShift: null,
                showEndShiftModal: false,
                cashTransactions: [],
                stats: {
                    todayRevenue: 0,
                    totalOrders: 0,
                    pendingOrders: 0,
                    cashRevenue: 0,
                    mobileRevenue: 0,
                    cardRevenue: 0,
                    bankingRevenue: 0
                },
                paymentMethods: [],
                hourlyRevenue: [],
                recentOrders: []
            });

            const difference = data.differenceAmount || 0;
            const differenceText = difference === 0
                ? "Không có chênh lệch"
                : (difference > 0
                    ? `Dư: ${formatCurrency(difference)}`
                    : `Thiếu: ${formatCurrency(Math.abs(difference))}`);

            alert(
                `✅ Kết thúc ca thành công!\n\n` +
                `📊 Doanh thu tiền mặt: ${formatCurrency(data.cashRevenue || summary.cashRevenue)}\n` +
                `💳 Doanh thu chuyển khoản: ${formatCurrency(data.transferRevenue || summary.nonCashRevenue)}\n` +
                `💰 Tổng doanh thu: ${formatCurrency(data.totalRevenue || summary.revenue)}\n` +
                `📋 Số đơn: ${data.totalOrders || summary.orderCount} đơn\n\n` +
                `💵 Tiền mặt thực tế: ${formatCurrency(data.actualCash || summary.currentCash)}\n` +
                `📝 Chênh lệch: ${differenceText}`
            );

        } catch (error) {
            console.error("Error ending shift:", error);
            updateState({ error: error.message });
            alert("❌ " + (error.message || "Có lỗi xảy ra khi kết thúc ca"));
        } finally {
            updateState({ loading: false });
        }
    };
    // ===== CASH IN/OUT - CHƯA CÓ BACKEND, TẠM THỜI THÔNG BÁO =====
    const handleCashAction = async () => {
        const { cashAction } = state;
        const actionText = cashAction === 'withdraw' ? 'Rút tiền' : 'Nộp tiền';
        alert(`${actionText} - Tính năng đang được phát triển. Vui lòng liên hệ quản lý.`);
        updateState({
            showCashModal: false,
            cashAmount: "",
            cashReason: ""
        });
    };

    // Format helpers
    const formatCurrency = (amount) => {
        if (amount == null || isNaN(amount)) return "0đ";
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "--:--";
        return new Date(dateString).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return "--:--";
        return new Date(dateString).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
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
        return PAYMENT_METHODS[method] || {
            label: method || 'Không xác định',
            icon: CreditCard,
            color: '#9ca3af'
        };
    };

    // Navigation
    const handleViewOrder = (orderId) => {
        navigate(`/employee/cashier/bill?orderId=${orderId}`);
    };

    const handleCreateOrder = () => {
        navigate('/cashier/tables');
    };

    // Modal handlers
    const openCashModal = (action) => {
        updateState({
            showCashModal: true,
            cashAction: action,
            cashAmount: "",
            cashReason: ""
        });
    };

    const closeAllModals = () => {
        updateState({
            showStartShiftModal: false,
            showEndShiftModal: false,
            showCashModal: false,
            cashAction: null,
            cashAmount: "",
            cashReason: "",
            floatAmount: "",
            error: null
        });
    };

    // Calculate shift summary
    const getShiftSummary = () => {
        const { currentShift } = state;
        if (!currentShift) return null;

        const openingCash = currentShift.openingCash || 0;

        // Dùng stats (từ bills API) - chính xác hơn currentShift
        const cashRevenue = stats.cashRevenue;
        const totalRevenue = stats.todayRevenue;
        const totalOrders = stats.totalOrders;
        const nonCashRevenue = totalRevenue - cashRevenue;
        const currentCash = openingCash + cashRevenue;
        const amountToDeposit = cashRevenue;

        return {
            floatAmount: openingCash,
            currentCash: currentCash,
            revenue: totalRevenue,
            cashRevenue: cashRevenue,
            nonCashRevenue: nonCashRevenue,
            totalCashFlow: 0,
            amountToDeposit: amountToDeposit,
            orderCount: totalOrders
        };
    };

    // Destructure state for easy access
    const {
        currentShift, loading, error, showStartShiftModal, showEndShiftModal,
        showCashModal, cashAction, cashAmount, cashReason, floatAmount,
        user, recentOrders, cashTransactions, stats, paymentMethods,
        hourlyRevenue, lastUpdated
    } = state;

    const shiftSummary = getShiftSummary();
    const maxHourlyRevenue = Math.max(...hourlyRevenue.map(h => h.revenue), 0);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h2>Dashboard Thu Ngân</h2>
                    {currentShift && (
                        <div className={styles.shiftStatus}>
                            <span className={styles.statusBadge}>● Đang hoạt động</span>
                            <div className={styles.shiftTimer}>
                                <Clock size={14} />
                                {formatDuration(currentShift.openedAt)}
                            </div>
                        </div>
                    )}
                    {lastUpdated && (
                        <div className={styles.lastUpdated}>
                            <RefreshCw size={12} />
                            Cập nhật: {formatTime(lastUpdated)}
                        </div>
                    )}
                </div>
                <div className={styles.headerRight}>
                    {!currentShift ? (
                        <button
                            onClick={() => updateState({ showStartShiftModal: true, error: null })}
                            className={styles.startShiftBtn}
                            disabled={loading}
                        >
                            <Play size={16} /> Bắt đầu ca
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleCreateOrder}
                                className={styles.createOrderBtn}
                            >
                                <Coffee size={16} /> Tạo đơn
                            </button>
                            <button
                                onClick={() => updateState({ showEndShiftModal: true, error: null })}
                                className={styles.endShiftBtn}
                                disabled={loading}
                            >
                                <StopCircle size={16} /> Kết thúc ca
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => fetchDashboardData()}
                        className={styles.refreshBtn}
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? styles.spinning : ''} />
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className={styles.errorAlert}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button onClick={() => updateState({ error: null })} className={styles.errorClose}>
                        ×
                    </button>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className={styles.loadingOverlay}>
                    <Loader size={32} className={styles.spinning} />
                    <span>Đang tải dữ liệu...</span>
                </div>
            )}

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.primaryCard}`}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
                        <DollarSign size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>Doanh thu hôm nay</div>
                        <div className={styles.statValue}>{formatCurrency(stats.todayRevenue)}</div>
                        <div className={styles.statSub}>{stats.totalOrders} đơn hàng</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}>
                        <DollarSign size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>Tiền mặt</div>
                        <div className={styles.statValue}>{formatCurrency(stats.cashRevenue)}</div>
                        <div className={styles.statSub}>
                            {stats.todayRevenue > 0
                                ? `${((stats.cashRevenue / stats.todayRevenue) * 100).toFixed(1)}%`
                                : '0%'} tổng doanh thu
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
                        <CreditCard size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>Chuyển khoản/Thẻ</div>
                        <div className={styles.statValue}>
                            {formatCurrency(stats.mobileRevenue + stats.cardRevenue + stats.bankingRevenue)}
                        </div>
                        <div className={styles.statSub}>MoMo + Thẻ + Chuyển khoản</div>
                    </div>
                </div>

                {stats.pendingOrders > 0 && (
                    <div className={`${styles.statCard} ${styles.warningCard}`}>
                        <div className={styles.statIcon} style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
                            <AlertCircle size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <div className={styles.statTitle}>Đơn chờ thanh toán</div>
                            <div className={styles.statValue}>{stats.pendingOrders}</div>
                            <div className={styles.statSub}>cần xử lý</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Methods Breakdown */}
            {paymentMethods.length > 0 && (
                <div className={styles.paymentMethodsCard}>
                    <h3><CreditCard size={18} /> Phương thức thanh toán hôm nay</h3>
                    <div className={styles.methodsGrid}>
                        {paymentMethods.map((method, index) => {
                            const Icon = method.Icon;
                            return (
                                <div key={index} className={styles.methodItem}>
                                    <div className={styles.methodIcon} style={{ color: method.color }}>
                                        <Icon size={20} />
                                    </div>
                                    <div className={styles.methodInfo}>
                                        <div className={styles.methodName}>{method.name}</div>
                                        <div className={styles.methodValue}>
                                            {formatCurrency(method.value)}
                                        </div>
                                        <div className={styles.methodCount}>
                                            {method.count} đơn ({method.percentage}%)
                                        </div>
                                    </div>
                                    <div className={styles.methodBar}>
                                        <div
                                            className={styles.methodBarFill}
                                            style={{
                                                width: `${method.percentage}%`,
                                                backgroundColor: method.color
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Current Shift Info */}
            {currentShift ? (
                <>
                    <div className={styles.shiftInfoCard}>
                        <div className={styles.shiftInfoHeader}>
                            <h3><History size={18} /> Ca làm việc hiện tại</h3>
                            <div className={styles.actionButtons}>
                                <button
                                    onClick={() => openCashModal('withdraw')}
                                    className={styles.withdrawBtn}
                                    disabled={loading}
                                >
                                    <ArrowUpCircle size={14} /> Rút tiền
                                </button>
                                <button
                                    onClick={() => openCashModal('deposit')}
                                    className={styles.depositBtn}
                                    disabled={loading}
                                >
                                    <ArrowDownCircle size={14} /> Nộp tiền
                                </button>
                            </div>
                        </div>
                        <div className={styles.shiftInfoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    <Clock size={14} /> Bắt đầu:
                                </span>
                                <span className={styles.infoValue}>
                                    {formatDateTime(currentShift.openedAt)}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    <Users size={14} /> Thu ngân:
                                </span>
                                <span className={styles.infoValue}>
                                    {user?.fullName || user?.username || "---"}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    <Wallet size={14} /> Quỹ đầu ca:
                                </span>
                                <span className={styles.infoValue}>
                                    {formatCurrency(shiftSummary?.floatAmount)}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    <TrendingUp size={14} /> Doanh thu:
                                </span>
                                <span className={styles.infoValue}>
                                    {formatCurrency(shiftSummary?.revenue)}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    <DollarSign size={14} /> Tiền mặt hiện có:
                                </span>
                                <span className={styles.infoValueHighlight}>
                                    {formatCurrency(shiftSummary?.currentCash)}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    <Receipt size={14} /> Số đơn:
                                </span>
                                <span className={styles.infoValue}>
                                    {shiftSummary?.orderCount || 0} đơn
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    <History size={14} /> Rút/Nộp thêm:
                                </span>
                                <span className={styles.infoValue}>
                                    {formatCurrency(shiftSummary?.totalCashFlow)}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    <CreditCard size={14} /> Thanh toán khác:
                                </span>
                                <span className={styles.infoValue}>
                                    {formatCurrency(shiftSummary?.nonCashRevenue)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Hourly Revenue Chart */}
                    <div className={styles.hourlyRevenueCard}>
                        <h3><BarChart3 size={18} /> Doanh thu theo giờ hôm nay</h3>
                        <div className={styles.chartContainer}>
                            {hourlyRevenue.map((data) => (
                                <div key={data.hour} className={styles.chartBarGroup}>
                                    <div className={styles.chartBar}>
                                        <div
                                            className={styles.chartBarFill}
                                            style={{
                                                height: `${maxHourlyRevenue > 0
                                                    ? (data.revenue / maxHourlyRevenue) * 100
                                                    : 0}%`,
                                                backgroundColor: data.revenue > 0 ? '#10b981' : '#e5e7eb'
                                            }}
                                            title={`${data.hour}:00 - ${formatCurrency(data.revenue)} (${data.orders} đơn)`}
                                        />
                                    </div>
                                    <div className={styles.chartBarLabel}>
                                        {data.hour.toString().padStart(2, '0')}:00
                                    </div>
                                    {data.revenue > 0 && (
                                        <div className={styles.chartBarTooltip}>
                                            {formatCurrency(data.revenue)}
                                            <br />
                                            {data.orders} đơn
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className={styles.chartLegend}>
                            <div className={styles.legendItem}>
                                <div className={styles.legendColor} style={{ backgroundColor: '#10b981' }} />
                                <span>Có doanh thu</span>
                            </div>
                            <div className={styles.legendItem}>
                                <div className={styles.legendColor} style={{ backgroundColor: '#e5e7eb' }} />
                                <span>Chưa có doanh thu</span>
                            </div>
                        </div>
                    </div>

                    {/* Cash Transactions */}
                    {cashTransactions.length > 0 && (
                        <div className={styles.transactionsCard}>
                            <h3><History size={18} /> Lịch sử giao dịch tiền mặt trong ca</h3>
                            <div className={styles.tableWrapper}>
                                <table className={styles.transactionsTable}>
                                    <thead>
                                        <tr>
                                            <th>Loại</th>
                                            <th>Thời gian</th>
                                            <th>Số tiền</th>
                                            <th>Lý do</th>
                                            <th>Số dư sau GD</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cashTransactions.map((tx, index) => (
                                            <tr key={tx.id || index} className={
                                                tx.type === 'withdraw' || tx.type === 'CASH_OUT'
                                                    ? styles.withdrawRow
                                                    : styles.depositRow
                                            }>
                                                <td>
                                                    <span className={
                                                        tx.type === 'withdraw' || tx.type === 'CASH_OUT'
                                                            ? styles.withdrawBadge
                                                            : styles.depositBadge
                                                    }>
                                                        {tx.type === 'withdraw' || tx.type === 'CASH_OUT'
                                                            ? <ArrowUpCircle size={12} />
                                                            : <ArrowDownCircle size={12} />
                                                        }
                                                        {tx.type === 'withdraw' || tx.type === 'CASH_OUT'
                                                            ? ' Rút tiền'
                                                            : ' Nộp tiền'
                                                        }
                                                    </span>
                                                </td>
                                                <td>{formatDateTime(tx.createdAt || tx.transactionDate)}</td>
                                                <td className={
                                                    tx.type === 'withdraw' || tx.type === 'CASH_OUT'
                                                        ? styles.withdrawAmount
                                                        : styles.depositAmount
                                                }>
                                                    {tx.type === 'withdraw' || tx.type === 'CASH_OUT' ? '-' : '+'}
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                                <td className={styles.transactionReason}>
                                                    {tx.reason || tx.note || '--'}
                                                </td>
                                                <td className={styles.balanceAfter}>
                                                    {formatCurrency(tx.balanceAfter || tx.currentBalance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Recent Orders */}
                    <div className={styles.recentOrdersCard}>
                        <div className={styles.cardHeader}>
                            <h3><Receipt size={18} /> Đơn hàng gần đây</h3>
                            <button
                                onClick={() => navigate('/employee/cashier/orders')}
                                className={styles.viewAllBtn}
                            >
                                Xem tất cả
                            </button>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.ordersTable}>
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Bàn/KV</th>
                                        <th>Thời gian</th>
                                        <th>SL món</th>
                                        <th>Tổng tiền</th>
                                        <th>Thanh toán</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.length > 0 ? (
                                        recentOrders.map((order) => {
                                            const paymentInfo = getPaymentMethodInfo(order.paymentMethod);
                                            const PaymentIcon = paymentInfo.icon;
                                            return (
                                                <tr key={order.id} className={
                                                    order.paymentStatus === 'paid'
                                                        ? styles.paidRow
                                                        : styles.pendingRow
                                                }>
                                                    <td className={styles.orderId}>{order.code}</td>
                                                    <td>
                                                        {order.tableNumber !== 'Takeaway'
                                                            ? `Bàn ${order.tableNumber}`
                                                            : 'Mang về'
                                                        }
                                                    </td>
                                                    <td>{formatTime(order.createdAt)}</td>
                                                    <td>{order.items || 0}</td>
                                                    <td className={styles.orderAmount}>
                                                        {formatCurrency(order.totalAmount)}
                                                    </td>
                                                    <td>
                                                        <span className={styles.paymentMethod}>
                                                            <PaymentIcon size={14} style={{ color: paymentInfo.color }} />
                                                            {' '}{paymentInfo.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={
                                                            order.paymentStatus === 'paid'
                                                                ? styles.paidBadge
                                                                : styles.unpaidBadge
                                                        }>
                                                            {order.paymentStatus === 'paid'
                                                                ? <CheckCircle size={12} />
                                                                : <XCircle size={12} />
                                                            }
                                                            {order.paymentStatus === 'paid'
                                                                ? ' Đã TT'
                                                                : ' Chưa TT'
                                                            }
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => handleViewOrder(order.id)}
                                                            className={styles.viewBtn}
                                                        >
                                                            <Eye size={14} /> Xem
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className={styles.noData}>
                                                Chưa có đơn hàng nào hôm nay
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* No Shift State */
                <div className={styles.noShiftCard}>
                    <div className={styles.noShiftContent}>
                        <div className={styles.noShiftIcon}>
                            <Coffee size={64} />
                        </div>
                        <h3>Chưa có ca làm việc</h3>
                        <p>Nhấn nút "Bắt đầu ca" để bắt đầu ca làm việc mới</p>
                        <div className={styles.noShiftInstructions}>
                            <div className={styles.instructionItem}>
                                <span className={styles.stepNumber}>1</span>
                                <span>Nhập số tiền quỹ đầu ca</span>
                            </div>
                            <div className={styles.instructionItem}>
                                <span className={styles.stepNumber}>2</span>
                                <span>Bắt đầu nhận đơn và thanh toán</span>
                            </div>
                            <div className={styles.instructionItem}>
                                <span className={styles.stepNumber}>3</span>
                                <span>Kết thúc ca và đối chiếu tiền mặt</span>
                            </div>
                        </div>
                        <button
                            onClick={() => updateState({ showStartShiftModal: true, error: null })}
                            className={styles.startShiftLargeBtn}
                            disabled={loading}
                        >
                            <Play size={20} /> Bắt đầu ca ngay
                        </button>
                    </div>
                </div>
            )}

            {/* Start Shift Modal */}
            {showStartShiftModal && (
                <div className={styles.modalOverlay} onClick={closeAllModals}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3><Play size={18} /> Bắt đầu ca làm việc</h3>
                            <button onClick={closeAllModals} className={styles.modalClose}>×</button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.formGroup}>
                                <label>
                                    <Wallet size={14} /> Nhập quỹ đầu ca <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="Ví dụ: 2,000,000"
                                    value={floatAmount}
                                    onChange={(e) => updateState({ floatAmount: e.target.value })}
                                    className={styles.modalInput}
                                    autoFocus
                                    min="10000"
                                    max="100000000"
                                    step="10000"
                                />
                                <div className={styles.inputHint}>
                                    Số tiền mặt nhận từ quỹ chính (tối thiểu 10,000đ)
                                </div>
                            </div>
                            <div className={styles.modalInfo}>
                                <AlertCircle size={16} />
                                <span>
                                    Quỹ đầu ca là số tiền mặt bạn nhận từ quỹ chính để làm vốn
                                    trả tiền thừa cho khách trong suốt ca làm việc.
                                </span>
                            </div>
                            {floatAmount && (
                                <div className={styles.quickAmounts}>
                                    <span>Chọn nhanh:</span>
                                    {[500000, 1000000, 2000000, 5000000].map(amount => (
                                        <button
                                            key={amount}
                                            onClick={() => updateState({ floatAmount: amount.toString() })}
                                            className={`${styles.quickAmountBtn} ${floatAmount === amount.toString() ? styles.active : ''
                                                }`}
                                        >
                                            {formatCurrency(amount)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                onClick={closeAllModals}
                                className={styles.cancelBtn}
                                disabled={loading}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={startShift}
                                disabled={loading || !floatAmount}
                                className={styles.confirmBtn}
                            >
                                {loading ? (
                                    <>
                                        <Loader size={16} className={styles.spinning} />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    'Bắt đầu ca'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Shift Modal */}
            {showEndShiftModal && shiftSummary && (
                <div className={styles.modalOverlay} onClick={closeAllModals}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3><StopCircle size={18} /> Kết thúc ca làm việc</h3>
                            <button onClick={closeAllModals} className={styles.modalClose}>×</button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.endShiftSummary}>
                                <div className={styles.summarySection}>
                                    <h4>Thông tin ca làm việc</h4>
                                    <div className={styles.summaryRow}>
                                        <span><Clock size={14} /> Thời gian:</span>
                                        <strong>
                                            {formatDateTime(currentShift.openedAt)}
                                        </strong>
                                    </div>
                                    <div className={styles.summaryRow}>
                                        <span><Users size={14} /> Thu ngân:</span>
                                        <strong>{user?.fullName || '---'}</strong>
                                    </div>
                                </div>

                                <div className={styles.divider}></div>

                                <div className={styles.summarySection}>
                                    <h4>Tổng kết tài chính</h4>
                                    <div className={styles.summaryRow}>
                                        <span><Wallet size={14} /> Quỹ đầu ca:</span>
                                        <strong>{formatCurrency(shiftSummary.floatAmount)}</strong>
                                    </div>
                                    <div className={styles.summaryRow}>
                                        <span><TrendingUp size={14} /> Tổng doanh thu:</span>
                                        <strong>{formatCurrency(shiftSummary.revenue)}</strong>
                                    </div>
                                    <div className={styles.summaryRow}>
                                        <span><DollarSign size={14} /> Doanh thu tiền mặt:</span>
                                        <strong>{formatCurrency(shiftSummary.cashRevenue)}</strong>
                                    </div>
                                    <div className={styles.summaryRow}>
                                        <span><CreditCard size={14} /> Thanh toán khác:</span>
                                        <strong>{formatCurrency(shiftSummary.nonCashRevenue)}</strong>
                                    </div>
                                    <div className={styles.summaryRow}>
                                        <span><Receipt size={14} /> Số đơn:</span>
                                        <strong>{shiftSummary.orderCount} đơn</strong>
                                    </div>
                                    <div className={styles.summaryRow}>
                                        <span><History size={14} /> Rút/Nộp thêm:</span>
                                        <strong>{formatCurrency(shiftSummary.totalCashFlow)}</strong>
                                    </div>
                                </div>

                                <div className={styles.divider}></div>

                                <div className={styles.summarySection}>
                                    <h4>Đối chiếu tiền mặt</h4>
                                    <div className={styles.summaryRowHighlight}>
                                        <span><DollarSign size={14} /> Tiền mặt hiện tại:</span>
                                        <strong>{formatCurrency(shiftSummary.currentCash)}</strong>
                                    </div>
                                    <div className={styles.summaryRowHighlight}>
                                        <span><TrendingUp size={14} /> Tổng tiền phải nộp:</span>
                                        <strong className={styles.totalHighlight}>
                                            {formatCurrency(shiftSummary.amountToDeposit)}
                                        </strong>
                                    </div>
                                    <div className={styles.calculationNote}>
                                        <AlertCircle size={14} />
                                        <span>
                                            Tiền phải nộp = Tiền mặt hiện tại - Quỹ đầu ca = {' '}
                                            {formatCurrency(shiftSummary.currentCash)} - {' '}
                                            {formatCurrency(shiftSummary.floatAmount)} = {' '}
                                            {formatCurrency(shiftSummary.amountToDeposit)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                onClick={closeAllModals}
                                className={styles.cancelBtn}
                                disabled={loading}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={endShift}
                                disabled={loading}
                                className={styles.endShiftConfirmBtn}
                            >
                                {loading ? (
                                    <>
                                        <Loader size={16} className={styles.spinning} />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    'Xác nhận kết thúc ca'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Action Modal */}
            {showCashModal && (
                <div className={styles.modalOverlay} onClick={closeAllModals}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>
                                {cashAction === 'withdraw'
                                    ? <ArrowUpCircle size={18} />
                                    : <ArrowDownCircle size={18} />
                                }
                                {cashAction === 'withdraw' ? ' Rút tiền từ quỹ' : ' Nộp tiền vào quỹ'}
                            </h3>
                            <button onClick={closeAllModals} className={styles.modalClose}>×</button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.formGroup}>
                                <label>
                                    <DollarSign size={14} /> Số tiền <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="Nhập số tiền"
                                    value={cashAmount}
                                    onChange={(e) => updateState({ cashAmount: e.target.value })}
                                    className={styles.modalInput}
                                    autoFocus
                                    min="1000"
                                    step="1000"
                                />
                                {cashAction === 'withdraw' && (
                                    <div className={styles.inputHint}>
                                        Tiền mặt hiện có: {formatCurrency(shiftSummary?.currentCash)}
                                    </div>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label>
                                    <FileText size={14} /> Lý do (không bắt buộc)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nhập lý do giao dịch"
                                    value={cashReason}
                                    onChange={(e) => updateState({ cashReason: e.target.value })}
                                    className={styles.modalInput}
                                    maxLength={200}
                                />
                            </div>
                            <div className={styles.modalInfo}>
                                <AlertCircle size={16} />
                                <span>
                                    {cashAction === 'withdraw'
                                        ? "Rút tiền từ quỹ chính để bổ sung vào ngăn kéo khi hết tiền thối cho khách."
                                        : "Nộp tiền từ ngăn kéo vào quỹ chính khi có quá nhiều tiền mặt tích lũy."}
                                </span>
                            </div>
                            <div className={styles.developmentNote}>
                                <AlertCircle size={16} color="#f59e0b" />
                                <span style={{ color: '#f59e0b' }}>
                                    Tính năng đang được phát triển. Vui lòng liên hệ quản lý để thực hiện.
                                </span>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                onClick={closeAllModals}
                                className={styles.cancelBtn}
                                disabled={loading}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCashAction}
                                disabled={loading || !cashAmount}
                                className={
                                    cashAction === 'withdraw'
                                        ? styles.withdrawConfirmBtn
                                        : styles.depositConfirmBtn
                                }
                            >
                                {loading ? (
                                    <>
                                        <Loader size={16} className={styles.spinning} />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    'Xác nhận'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;