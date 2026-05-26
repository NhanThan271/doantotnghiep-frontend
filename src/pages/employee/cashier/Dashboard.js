// pages/employee/cashier/Dashboard.js
import React, { useState, useEffect } from "react";
import { Play, StopCircle, Clock, AlertCircle, RefreshCw, Eye, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";

const Dashboard = () => {
    const navigate = useNavigate();
    const [currentShift, setCurrentShift] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showStartShiftModal, setShowStartShiftModal] = useState(false);
    const [showEndShiftModal, setShowEndShiftModal] = useState(false);
    const [showCashModal, setShowCashModal] = useState(false);
    const [cashAction, setCashAction] = useState(null);
    const [cashAmount, setCashAmount] = useState("");
    const [cashReason, setCashReason] = useState("");
    const [floatAmount, setFloatAmount] = useState("");
    const [user, setUser] = useState({});
    const [recentOrders, setRecentOrders] = useState([]);
    const [cashTransactions, setCashTransactions] = useState([]);
    const [stats, setStats] = useState({
        todayRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        cashRevenue: 0,
        momoRevenue: 0,
        bankingRevenue: 0
    });
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [hourlyRevenue, setHourlyRevenue] = useState([]);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);
        fetchCurrentShift();
        fetchStats();
        fetchRecentOrders();
        fetchHourlyRevenue();
    }, []);

    const fetchCurrentShift = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/cashier/current-shift', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentShift(data);
                if (data?.cashTransactions) {
                    setCashTransactions(data.cashTransactions);
                }
            }
        } catch (error) {
            console.error("Error fetching current shift:", error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/employee/bills', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const bills = await response.json();
                const today = new Date().toISOString().split('T')[0];

                const todayBills = bills.filter(bill => {
                    const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
                    return billDate === today && bill.paymentStatus === 'PAID';
                });

                const cashRevenue = todayBills
                    .filter(b => b.paymentMethod === 'CASH')
                    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

                const momoRevenue = todayBills
                    .filter(b => b.paymentMethod === 'MOMO')
                    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

                const bankingRevenue = todayBills
                    .filter(b => b.paymentMethod === 'BANKING')
                    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

                const methods = [
                    { name: 'Tiền mặt', value: cashRevenue, count: todayBills.filter(b => b.paymentMethod === 'CASH').length, icon: '💵' },
                    { name: 'MoMo', value: momoRevenue, count: todayBills.filter(b => b.paymentMethod === 'MOMO').length, icon: '📱' },
                    { name: 'Chuyển khoản', value: bankingRevenue, count: todayBills.filter(b => b.paymentMethod === 'BANKING').length, icon: '🏦' }
                ];

                setPaymentMethods(methods);

                setStats({
                    todayRevenue: todayBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
                    totalOrders: todayBills.length,
                    pendingOrders: bills.filter(b => b.paymentStatus !== 'PAID').length,
                    cashRevenue: cashRevenue,
                    momoRevenue: momoRevenue,
                    bankingRevenue: bankingRevenue
                });
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const fetchRecentOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/employee/bills', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const bills = await response.json();
                const recentBills = bills
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 10)
                    .map(bill => ({
                        id: bill.id,
                        code: bill.id,
                        tableNumber: bill.order?.table?.number || bill.room?.number || '--',
                        createdAt: bill.createdAt,
                        totalAmount: bill.totalAmount,
                        paymentStatus: bill.paymentStatus === 'PAID' ? 'paid' : 'pending',
                        paymentMethod: bill.paymentMethod
                    }));
                setRecentOrders(recentBills);
            }
        } catch (error) {
            console.error("Error fetching recent orders:", error);
        }
    };

    const fetchHourlyRevenue = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/employee/bills', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const bills = await response.json();
                const today = new Date().toISOString().split('T')[0];

                const todayBills = bills.filter(bill => {
                    const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
                    return billDate === today && bill.paymentStatus === 'PAID';
                });

                const hourlyMap = {};
                for (let i = 0; i < 24; i++) {
                    hourlyMap[i] = 0;
                }

                todayBills.forEach(bill => {
                    const hour = new Date(bill.createdAt).getHours();
                    hourlyMap[hour] += bill.totalAmount || 0;
                });

                const hourlyData = Object.entries(hourlyMap).map(([hour, revenue]) => ({
                    hour: parseInt(hour),
                    revenue: revenue
                }));

                setHourlyRevenue(hourlyData);
            }
        } catch (error) {
            console.error("Error fetching hourly revenue:", error);
        }
    };

    const startShift = async () => {
        if (!floatAmount || parseFloat(floatAmount) <= 0) {
            alert("Vui lòng nhập số tiền quỹ đầu ca hợp lệ");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/cashier/start-shift', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    floatAmount: parseFloat(floatAmount),
                    branchId: user.branch?.id,
                    cashierId: user.id
                })
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentShift(data);
                setShowStartShiftModal(false);
                setFloatAmount("");
                fetchStats();
                alert("Bắt đầu ca thành công!");
            } else {
                const error = await response.json();
                alert(error.message || "Không thể bắt đầu ca");
            }
        } catch (error) {
            console.error("Error starting shift:", error);
            alert("Có lỗi xảy ra khi bắt đầu ca");
        } finally {
            setLoading(false);
        }
    };

    const endShift = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/cashier/end-shift', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    shiftId: currentShift?.id,
                    actualCash: currentShift?.currentCash
                })
            });
            if (response.ok) {
                setCurrentShift(null);
                setShowEndShiftModal(false);
                await fetchCurrentShift();
                alert("Kết thúc ca thành công!");
            } else {
                const error = await response.json();
                alert(error.message || "Không thể kết thúc ca");
            }
        } catch (error) {
            console.error("Error ending shift:", error);
            alert("Có lỗi xảy ra khi kết thúc ca");
        } finally {
            setLoading(false);
        }
    };

    const handleCashAction = async () => {
        const amount = parseFloat(cashAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Vui lòng nhập số tiền hợp lệ");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/cashier/${cashAction}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    shiftId: currentShift?.id,
                    amount: amount,
                    reason: cashReason || (cashAction === 'withdraw' ? 'Rút tiền bổ sung quỹ' : 'Nộp tiền vào quỹ')
                })
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentShift(data);
                setShowCashModal(false);
                setCashAmount("");
                setCashReason("");
                await fetchCurrentShift();
                alert(cashAction === 'withdraw' ? "Rút tiền thành công!" : "Nộp tiền thành công!");
            } else {
                const error = await response.json();
                alert(error.message || "Không thể thực hiện");
            }
        } catch (error) {
            console.error("Error processing cash action:", error);
            alert("Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return "0đ";
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "--:--";
        return new Date(dateString).toLocaleString('vi-VN');
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

    const handleViewOrder = (orderId) => {
        navigate(`/cashier/bill?orderId=${orderId}`);
    };

    const getPaymentMethodIcon = (method) => {
        switch (method) {
            case 'CASH': return '💵';
            case 'MOMO': return '📱';
            case 'BANKING': return '🏦';
            default: return '💰';
        }
    };

    const maxRevenue = Math.max(...hourlyRevenue.map(h => h.revenue), 0);

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
                                <Clock size={14} /> {formatDuration(currentShift?.startTime, currentShift?.endTime)}
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles.headerRight}>
                    {!currentShift ? (
                        <button onClick={() => setShowStartShiftModal(true)} className={styles.startShiftBtn}>
                            <Play size={16} /> Bắt đầu ca
                        </button>
                    ) : (
                        <button onClick={() => setShowEndShiftModal(true)} className={styles.endShiftBtn}>
                            <StopCircle size={16} /> Kết thúc ca
                        </button>
                    )}
                    <button onClick={() => { fetchCurrentShift(); fetchStats(); fetchRecentOrders(); fetchHourlyRevenue(); }} className={styles.refreshBtn}>
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>💰</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>Doanh thu hôm nay</div>
                        <div className={styles.statValue}>{formatCurrency(stats.todayRevenue)}</div>
                        <div className={styles.statSub}>{stats.totalOrders} đơn hàng</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>🧾</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>Đơn chờ thanh toán</div>
                        <div className={styles.statValue}>{stats.pendingOrders}</div>
                        <div className={styles.statSub}>chưa thanh toán</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>💵</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>Tiền mặt</div>
                        <div className={styles.statValue}>{formatCurrency(stats.cashRevenue)}</div>
                        <div className={styles.statSub}>đã thu</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>📱</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>Chuyển khoản</div>
                        <div className={styles.statValue}>{formatCurrency(stats.momoRevenue + stats.bankingRevenue)}</div>
                        <div className={styles.statSub}>MoMo + Chuyển khoản</div>
                    </div>
                </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className={styles.paymentMethodsCard}>
                <h3>💳 Phương thức thanh toán</h3>
                <div className={styles.methodsGrid}>
                    {paymentMethods.map((method, index) => (
                        <div key={index} className={styles.methodItem}>
                            <div className={styles.methodIcon}>{method.icon}</div>
                            <div className={styles.methodInfo}>
                                <div className={styles.methodName}>{method.name}</div>
                                <div className={styles.methodValue}>{formatCurrency(method.value)}</div>
                                <div className={styles.methodCount}>{method.count} đơn</div>
                            </div>
                            <div className={styles.methodPercent}>
                                {stats.todayRevenue > 0 ? ((method.value / stats.todayRevenue) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Current Shift Info */}
            {currentShift ? (
                <>
                    <div className={styles.shiftInfoCard}>
                        <div className={styles.shiftInfoHeader}>
                            <h3>📊 Ca làm việc hiện tại</h3>
                            <div className={styles.actionButtons}>
                                <button onClick={() => { setCashAction('withdraw'); setShowCashModal(true); }} className={styles.withdrawBtn}>
                                    <Minus size={14} /> Rút tiền
                                </button>
                                <button onClick={() => { setCashAction('deposit'); setShowCashModal(true); }} className={styles.depositBtn}>
                                    <Plus size={14} /> Nộp tiền
                                </button>
                            </div>
                        </div>
                        <div className={styles.shiftInfoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>🕐 Bắt đầu:</span>
                                <span className={styles.infoValue}>{formatDateTime(currentShift?.startTime)}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>👤 Thu ngân:</span>
                                <span className={styles.infoValue}>{user?.fullName || "---"}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>💰 Quỹ đầu ca:</span>
                                <span className={styles.infoValue}>{formatCurrency(currentShift?.floatAmount)}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>📈 Doanh thu:</span>
                                <span className={styles.infoValue}>{formatCurrency(currentShift?.revenue)}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>💵 Tiền mặt:</span>
                                <span className={styles.infoValue}>{formatCurrency(currentShift?.currentCash)}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>🆔 Mã ca:</span>
                                <span className={styles.infoValue}>#{currentShift?.id}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>📊 Số đơn:</span>
                                <span className={styles.infoValue}>{currentShift?.orderCount || 0} đơn</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>🔄 Rút/Nộp:</span>
                                <span className={styles.infoValue}>{formatCurrency(currentShift?.totalCashFlow || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Hourly Revenue Chart */}
                    <div className={styles.hourlyRevenueCard}>
                        <h3>📈 Doanh thu theo giờ</h3>
                        <div className={styles.chartContainer}>
                            {hourlyRevenue.map((data) => (
                                <div key={data.hour} className={styles.chartBar}>
                                    <div className={styles.chartBarLabel}>{data.hour}:00</div>
                                    <div
                                        className={styles.chartBarFill}
                                        style={{
                                            height: `${maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0}%`,
                                            backgroundColor: data.revenue > 0 ? '#10b981' : '#e5e7eb'
                                        }}
                                    />
                                    <div className={styles.chartBarValue}>{formatCurrency(data.revenue)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cash Transactions */}
                    {cashTransactions.length > 0 && (
                        <div className={styles.transactionsCard}>
                            <h3>📋 Lịch sử giao dịch tiền mặt</h3>
                            <div className={styles.transactionsList}>
                                <table className={styles.transactionsTable}>
                                    <thead>
                                        <tr>
                                            <th>Loại</th>
                                            <th>Thời gian</th>
                                            <th>Số tiền</th>
                                            <th>Lý do</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cashTransactions.map((tx, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <span className={tx.type === 'withdraw' ? styles.withdrawText : styles.depositText}>
                                                        {tx.type === 'withdraw' ? '📤 Rút tiền' : '📥 Nộp tiền'}
                                                    </span>
                                                </td>
                                                <td>{formatDateTime(tx.createdAt)}</td>
                                                <td className={tx.type === 'withdraw' ? styles.withdrawAmount : styles.depositAmount}>
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                                <td className={styles.transactionReason}>{tx.reason || '--'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Recent Orders */}
                    <div className={styles.recentOrdersCard}>
                        <h3>🔄 Đơn hàng gần đây</h3>
                        <div className={styles.tableWrapper}>
                            <table className={styles.ordersTable}>
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Bàn</th>
                                        <th>Thời gian</th>
                                        <th>Tổng tiền</th>
                                        <th>Thanh toán</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((order) => (
                                        <tr key={order.id}>
                                            <td className={styles.orderId}>#{order.code}</td>
                                            <td>{order.tableNumber !== '--' ? `Bàn ${order.tableNumber}` : 'Takeaway'}</td>
                                            <td>{formatTime(order.createdAt)}</td>
                                            <td className={styles.orderAmount}>{formatCurrency(order.totalAmount)}</td>
                                            <td>
                                                <span className={styles.paymentMethod}>
                                                    {getPaymentMethodIcon(order.paymentMethod)} {order.paymentMethod || '--'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={order.paymentStatus === 'paid' ? styles.paidBadge : styles.unpaidBadge}>
                                                    {order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                                </span>
                                            </td>
                                            <td>
                                                <button onClick={() => handleViewOrder(order.id)} className={styles.viewBtn}>
                                                    <Eye size={14} /> Xem
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* No Shift State - Chỉ hiển thị thông báo, không có nút bắt đầu ca nữa */
                <div className={styles.noShiftCard}>
                    <div className={styles.noShiftContent}>
                        <AlertCircle size={64} color="#9ca3af" />
                        <h3>Chưa có ca làm việc</h3>
                        <p>Nhấn nút "Bắt đầu ca" ở góc trên bên phải để bắt đầu ca làm việc mới</p>
                    </div>
                </div>
            )}

            {/* Start Shift Modal */}
            {showStartShiftModal && (
                <div className={styles.modalOverlay} onClick={() => setShowStartShiftModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>🚀 Bắt đầu ca làm việc</h3>
                        <div className={styles.modalContent}>
                            <label>💰 Nhập quỹ đầu ca <span className={styles.required}>*</span></label>
                            <input
                                type="number"
                                placeholder="Ví dụ: 2000000"
                                value={floatAmount}
                                onChange={(e) => setFloatAmount(e.target.value)}
                                className={styles.modalInput}
                                autoFocus
                            />
                            <div className={styles.modalInfo}>
                                <AlertCircle size={14} />
                                <span>Quỹ đầu ca là số tiền mặt bạn nhận từ quỹ chính để làm vốn trả tiền thừa cho khách</span>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowStartShiftModal(false)} className={styles.cancelBtn}>Hủy</button>
                            <button onClick={startShift} disabled={loading} className={styles.confirmBtn}>
                                {loading ? "Đang xử lý..." : "Bắt đầu ca"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Shift Modal */}
            {showEndShiftModal && currentShift && (
                <div className={styles.modalOverlay} onClick={() => setShowEndShiftModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>🏁 Kết thúc ca làm việc</h3>
                        <div className={styles.endShiftSummary}>
                            <div className={styles.summaryRow}>
                                <span>💰 Quỹ đầu ca:</span>
                                <strong>{formatCurrency(currentShift?.floatAmount)}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>📈 Doanh thu:</span>
                                <strong>{formatCurrency(currentShift?.revenue)}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>📊 Số đơn:</span>
                                <strong>{currentShift?.orderCount || 0} đơn</strong>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>🔄 Tổng rút/nộp:</span>
                                <strong>{formatCurrency(currentShift?.totalCashFlow || 0)}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>💳 Thanh toán khác:</span>
                                <strong>{formatCurrency((currentShift?.revenue || 0) - (currentShift?.cashRevenue || 0))}</strong>
                            </div>
                            <div className={styles.divider}></div>
                            <div className={styles.summaryRow}>
                                <span>💰 Tiền mặt hiện tại:</span>
                                <strong className={styles.cashHighlight}>{formatCurrency(currentShift?.currentCash)}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>📌 Tổng tiền phải nộp:</span>
                                <strong className={styles.totalHighlight}>
                                    {formatCurrency((currentShift?.currentCash || 0) - (currentShift?.floatAmount || 0))}
                                </strong>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowEndShiftModal(false)} className={styles.cancelBtn}>Hủy</button>
                            <button onClick={endShift} disabled={loading} className={styles.endShiftConfirmBtn}>
                                {loading ? "Đang xử lý..." : "Xác nhận kết thúc ca"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Action Modal */}
            {showCashModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCashModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>{cashAction === 'withdraw' ? '📤 Rút tiền từ quỹ' : '📥 Nộp tiền vào quỹ'}</h3>
                        <div className={styles.modalContent}>
                            <label>💰 Số tiền <span className={styles.required}>*</span></label>
                            <input
                                type="number"
                                placeholder="Nhập số tiền"
                                value={cashAmount}
                                onChange={(e) => setCashAmount(e.target.value)}
                                className={styles.modalInput}
                                autoFocus
                            />
                            <label>📝 Lý do</label>
                            <input
                                type="text"
                                placeholder="Nhập lý do (không bắt buộc)"
                                value={cashReason}
                                onChange={(e) => setCashReason(e.target.value)}
                                className={styles.modalInput}
                            />
                            <div className={styles.modalInfo}>
                                <AlertCircle size={14} />
                                <span>
                                    {cashAction === 'withdraw'
                                        ? "Rút tiền từ quỹ chính để bổ sung vào ngăn kéo khi hết tiền thối"
                                        : "Nộp tiền từ ngăn kéo vào quỹ chính khi có quá nhiều tiền mặt"}
                                </span>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowCashModal(false)} className={styles.cancelBtn}>Hủy</button>
                            <button onClick={handleCashAction} disabled={loading} className={cashAction === 'withdraw' ? styles.withdrawConfirmBtn : styles.depositConfirmBtn}>
                                {loading ? "Đang xử lý..." : "Xác nhận"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;