// pages/employee/cashier/Dashboard.js
import React, { useState, useEffect } from "react";
import { Play, StopCircle, TrendingUp, TrendingDown, Clock, AlertCircle, RefreshCw, Eye } from "lucide-react";
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
    const [floatAmount, setFloatAmount] = useState("");
    const [user, setUser] = useState({});
    const [recentOrders, setRecentOrders] = useState([]);
    const [cashTransactions, setCashTransactions] = useState([]);
    const [stats, setStats] = useState({
        todayRevenue: 0,
        totalOrders: 0,
        activeTables: 0,
        pendingOrders: 0,
        cashRevenue: 0,
        momoRevenue: 0,
        bankingRevenue: 0
    });

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);
        fetchCurrentShift();
        fetchStats();
        fetchRecentOrders();
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
                    .filter(b => b.paymentMethod === 'MOMO' || b.paymentMethod === 'MOBILE')
                    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

                const bankingRevenue = todayBills
                    .filter(b => b.paymentMethod === 'BANKING' || b.paymentMethod === 'CARD')
                    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

                setStats({
                    todayRevenue: todayBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
                    totalOrders: todayBills.length,
                    activeTables: 0,
                    pendingOrders: 0,
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
                    .slice(0, 5)
                    .map(bill => ({
                        id: bill.id,
                        code: bill.id,
                        tableNumber: bill.order?.table?.number || '--',
                        createdAt: bill.createdAt,
                        totalAmount: bill.totalAmount,
                        paymentStatus: bill.paymentStatus === 'PAID' ? 'paid' : 'pending'
                    }));
                setRecentOrders(recentBills);
            }
        } catch (error) {
            console.error("Error fetching recent orders:", error);
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
                    reason: cashAction === 'withdraw' ? 'Rút tiền bổ sung quỹ' : 'Nộp tiền vào quỹ'
                })
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentShift(data);
                setShowCashModal(false);
                setCashAmount("");
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

    const formatDuration = (start, end) => {
        if (!start) return "00:00:00";
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : new Date();
        const diff = Math.abs(endTime - startTime);
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    const handleViewOrder = (orderId) => {
        navigate(`/cashier/bill`);
    };

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
                            ▶ Bắt đầu ca
                        </button>
                    ) : (
                        <button onClick={() => setShowEndShiftModal(true)} className={styles.endShiftBtn}>
                            ⏹ Kết thúc ca
                        </button>
                    )}
                    <button onClick={() => { fetchCurrentShift(); fetchStats(); fetchRecentOrders(); }} className={styles.refreshBtn}>
                        🔄
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
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>🧾</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>Số đơn hàng</div>
                        <div className={styles.statValue}>{stats.totalOrders}</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>💵</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>Tiền mặt</div>
                        <div className={styles.statValue}>{formatCurrency(stats.cashRevenue)}</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>📱</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statTitle}>MoMo/CK</div>
                        <div className={styles.statValue}>{formatCurrency(stats.momoRevenue + stats.bankingRevenue)}</div>
                    </div>
                </div>
            </div>

            {/* Current Shift Info */}
            {currentShift && (
                <>
                    <div className={styles.shiftInfoCard}>
                        <div className={styles.shiftInfoHeader}>
                            <h3>Ca làm việc hiện tại</h3>
                            <div className={styles.actionButtons}>
                                <button onClick={() => { setCashAction('withdraw'); setShowCashModal(true); }} className={styles.withdrawBtn}>
                                    📤 Rút tiền
                                </button>
                                <button onClick={() => { setCashAction('deposit'); setShowCashModal(true); }} className={styles.depositBtn}>
                                    📥 Nộp tiền
                                </button>
                            </div>
                        </div>
                        <div className={styles.shiftInfoGrid}>
                            <div><span>🕐 Bắt đầu:</span> {formatDateTime(currentShift?.startTime)}</div>
                            <div><span>👤 Thu ngân:</span> {user?.fullName || "---"}</div>
                            <div><span>💰 Quỹ đầu ca:</span> {formatCurrency(currentShift?.floatAmount)}</div>
                            <div><span>📈 Doanh thu:</span> {formatCurrency(currentShift?.revenue)}</div>
                            <div><span>💵 Tiền mặt:</span> {formatCurrency(currentShift?.currentCash)}</div>
                            <div><span>🆔 Mã ca:</span> #{currentShift?.id}</div>
                        </div>
                    </div>

                    {/* Cash Transactions */}
                    {cashTransactions.length > 0 && (
                        <div className={styles.transactionsCard}>
                            <h3>📋 Lịch sử giao dịch tiền mặt</h3>
                            <div className={styles.transactionsList}>
                                {cashTransactions.map((tx, index) => (
                                    <div key={index} className={styles.transactionItem}>
                                        <span className={tx.type === 'withdraw' ? styles.withdrawText : styles.depositText}>
                                            {tx.type === 'withdraw' ? '📤 Rút tiền' : '📥 Nộp tiền'}
                                        </span>
                                        <span>{formatDateTime(tx.createdAt)}</span>
                                        <span className={styles.transactionAmount}>{formatCurrency(tx.amount)}</span>
                                        <span className={styles.transactionReason}>{tx.reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent Orders */}
                    <div className={styles.recentOrdersCard}>
                        <h3>🔄 Đơn hàng gần đây</h3>
                        <table className={styles.ordersTable}>
                            <thead>
                                <tr>
                                    <th>Mã đơn</th>
                                    <th>Bàn</th>
                                    <th>Thời gian</th>
                                    <th>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td>#{order.code}</td>
                                        <td>Bàn {order.tableNumber}</td>
                                        <td>{formatDateTime(order.createdAt)}</td>
                                        <td>{formatCurrency(order.totalAmount)}</td>
                                        <td>
                                            <span className={order.paymentStatus === 'paid' ? styles.paidBadge : styles.unpaidBadge}>
                                                {order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                            </span>
                                        </td>
                                        <td>
                                            <button onClick={() => handleViewOrder(order.id)} className={styles.viewBtn}>
                                                👁 Xem
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* No Shift State */}
            {!currentShift && (
                <div className={styles.noShiftCard}>
                    <div className={styles.noShiftContent}>
                        <AlertCircle size={64} color="#9ca3af" />
                        <h3>Chưa có ca làm việc</h3>
                        <p>Nhấn "Bắt đầu ca" để bắt đầu ca làm việc mới</p>
                    </div>
                </div>
            )}

            {/* Start Shift Modal */}
            {showStartShiftModal && (
                <div className={styles.modalOverlay} onClick={() => setShowStartShiftModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>Bắt đầu ca làm việc</h3>
                        <div className={styles.modalContent}>
                            <label>💰 Nhập quỹ đầu ca</label>
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
                                <span>Quỹ đầu ca là số tiền mặt bạn nhận từ quỹ chính để làm vốn trả tiền thừa</span>
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
                        <h3>Kết thúc ca làm việc</h3>
                        <div className={styles.endShiftSummary}>
                            <div className={styles.summaryRow}><span>Quỹ đầu ca:</span><strong>{formatCurrency(currentShift?.floatAmount)}</strong></div>
                            <div className={styles.summaryRow}><span>Doanh thu:</span><strong>{formatCurrency(currentShift?.revenue)}</strong></div>
                            <div className={styles.summaryRow}><span>Số đơn:</span><strong>{currentShift?.orderCount || 0}</strong></div>
                            <div className={styles.summaryRow}><span>Tổng rút/nộp:</span><strong>{formatCurrency(currentShift?.totalCashFlow || 0)}</strong></div>
                            <div className={styles.divider}></div>
                            <div className={styles.summaryRow}><span>💰 Tiền mặt hiện tại:</span><strong className={styles.cashHighlight}>{formatCurrency(currentShift?.currentCash)}</strong></div>
                            <div className={styles.summaryRow}><span>📌 Tổng tiền phải nộp:</span><strong className={styles.totalHighlight}>{formatCurrency((currentShift?.currentCash || 0) - (currentShift?.floatAmount || 0))}</strong></div>
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
                            <label>💰 Số tiền:</label>
                            <input
                                type="number"
                                placeholder="Nhập số tiền"
                                value={cashAmount}
                                onChange={(e) => setCashAmount(e.target.value)}
                                className={styles.modalInput}
                                autoFocus
                            />
                            <div className={styles.modalInfo}>
                                <AlertCircle size={14} />
                                <span>{cashAction === 'withdraw' ? "Rút tiền từ quỹ chính để bổ sung vào ngăn kéo" : "Nộp tiền từ ngăn kéo vào quỹ chính"}</span>
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