// pages/employee/cashier/ReportPage.js
import React, { useState, useEffect } from "react";
import { Calendar, TrendingUp, DollarSign, Users, Coffee, Download, Filter } from "lucide-react";
import styles from "./ReportPage.module.css";

const ReportPage = () => {
    const [reportType, setReportType] = useState('daily');
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Tự động fetch khi reportType thay đổi
    useEffect(() => {
        if (reportType !== 'custom') {
            fetchReport();
        }
    }, [reportType]);

    const getDateRangeByType = () => {
        const today = new Date();
        switch (reportType) {
            case 'daily':
                return {
                    startDate: today.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };
            case 'weekly': {
                const startOfWeek = new Date(today);
                const day = today.getDay();
                const diff = day === 0 ? 6 : day - 1;
                startOfWeek.setDate(today.getDate() - diff);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return {
                    startDate: startOfWeek.toISOString().split('T')[0],
                    endDate: endOfWeek.toISOString().split('T')[0]
                };
            }
            case 'monthly': {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                return {
                    startDate: startOfMonth.toISOString().split('T')[0],
                    endDate: endOfMonth.toISOString().split('T')[0]
                };
            }
            default:
                return dateRange;
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const { startDate, endDate } = getDateRangeByType();

            // Gọi API lấy danh sách bills
            const response = await fetch(`http://localhost:8080/api/employee/bills`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                let allBills = await response.json();

                // Lọc theo ngày
                const filteredBills = allBills.filter(bill => {
                    const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
                    return billDate >= startDate && billDate <= endDate && bill.paymentStatus === 'PAID';
                });

                // Tính toán thống kê
                const totalRevenue = filteredBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                const totalOrders = filteredBills.length;
                const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

                // Thống kê theo phương thức thanh toán
                const cashBills = filteredBills.filter(b => b.paymentMethod === 'CASH');
                const momoBills = filteredBills.filter(b => b.paymentMethod === 'MOMO' || b.paymentMethod === 'MOBILE');
                const bankingBills = filteredBills.filter(b => b.paymentMethod === 'BANKING' || b.paymentMethod === 'CARD');

                const cashRevenue = cashBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                const momoRevenue = momoBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                const bankingRevenue = bankingBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

                // Thống kê top món ăn (từ order items)
                const dishStats = {};
                for (const bill of filteredBills) {
                    if (bill.order?.items) {
                        for (const item of bill.order.items) {
                            const dishName = item.foodName || item.name || 'Món ăn';
                            if (!dishStats[dishName]) {
                                dishStats[dishName] = { quantity: 0, revenue: 0 };
                            }
                            dishStats[dishName].quantity += item.quantity || 1;
                            dishStats[dishName].revenue += (item.price || 0) * (item.quantity || 1);
                        }
                    }
                }

                const topDishes = Object.entries(dishStats)
                    .map(([name, stats]) => ({ name, quantity: stats.quantity, revenue: stats.revenue }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5);

                setReportData({
                    totalRevenue,
                    totalOrders,
                    averageOrderValue,
                    totalCustomers: filteredBills.length,
                    cashCount: cashBills.length,
                    cashRevenue,
                    momoCount: momoBills.length,
                    momoRevenue,
                    bankingCount: bankingBills.length,
                    bankingRevenue,
                    topDishes,
                    startDate,
                    endDate
                });
            }
        } catch (error) {
            console.error("Error fetching report:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const token = localStorage.getItem('token');
            const { startDate, endDate } = getDateRangeByType();

            // Gọi API export
            const response = await fetch(`http://localhost:8080/api/cashier/export-report?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bao_cao_doanh_thu_${startDate}_den_${endDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                alert("Không thể xuất báo cáo");
            }
        } catch (error) {
            console.error("Error exporting report:", error);
            alert("Có lỗi khi xuất báo cáo");
        } finally {
            setExporting(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return "0đ";
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Báo cáo doanh thu</h2>
                {reportData && (
                    <button onClick={handleExportExcel} disabled={exporting} className={styles.exportBtn}>
                        <Download size={16} /> {exporting ? "Đang xuất..." : "Xuất Excel"}
                    </button>
                )}
            </div>

            <div className={styles.filterSection}>
                <div className={styles.reportTypeBtns}>
                    <button className={reportType === 'daily' ? styles.activeBtn : styles.btn} onClick={() => setReportType('daily')}>
                        Hôm nay
                    </button>
                    <button className={reportType === 'weekly' ? styles.activeBtn : styles.btn} onClick={() => setReportType('weekly')}>
                        Tuần này
                    </button>
                    <button className={reportType === 'monthly' ? styles.activeBtn : styles.btn} onClick={() => setReportType('monthly')}>
                        Tháng này
                    </button>
                    <button className={reportType === 'custom' ? styles.activeBtn : styles.btn} onClick={() => setReportType('custom')}>
                        Tùy chọn
                    </button>
                </div>

                {reportType === 'custom' && (
                    <div className={styles.dateRange}>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className={styles.dateInput}
                        />
                        <span>→</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className={styles.dateInput}
                        />
                        <button onClick={fetchReport} className={styles.viewReportBtn}>
                            <Filter size={16} /> Xem báo cáo
                        </button>
                    </div>
                )}

                {reportType !== 'custom' && (
                    <div className={styles.reportInfo}>
                        <span className={styles.dateRangeInfo}>
                            {reportData && `Từ ${formatDate(reportData.startDate)} → ${formatDate(reportData.endDate)}`}
                        </span>
                    </div>
                )}
            </div>

            {loading && (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <span>Đang tải dữ liệu...</span>
                </div>
            )}

            {reportData && !loading && (
                <>
                    <div className={styles.summaryCards}>
                        <div className={styles.summaryCard}>
                            <div className={styles.cardIcon}>💰</div>
                            <div className={styles.cardInfo}>
                                <div className={styles.cardTitle}>Tổng doanh thu</div>
                                <div className={styles.cardValue}>{formatCurrency(reportData.totalRevenue)}</div>
                            </div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.cardIcon}>🧾</div>
                            <div className={styles.cardInfo}>
                                <div className={styles.cardTitle}>Số đơn hàng</div>
                                <div className={styles.cardValue}>{reportData.totalOrders}</div>
                            </div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.cardIcon}>📊</div>
                            <div className={styles.cardInfo}>
                                <div className={styles.cardTitle}>TB mỗi đơn</div>
                                <div className={styles.cardValue}>{formatCurrency(reportData.averageOrderValue)}</div>
                            </div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.cardIcon}>👥</div>
                            <div className={styles.cardInfo}>
                                <div className={styles.cardTitle}>Khách hàng</div>
                                <div className={styles.cardValue}>{reportData.totalCustomers}</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.paymentBreakdown}>
                        <h3>Chi tiết theo hình thức thanh toán</h3>
                        <table className={styles.breakdownTable}>
                            <thead>
                                <tr>
                                    <th>Phương thức</th>
                                    <th>Số lượng</th>
                                    <th>Doanh thu</th>
                                    <th>Tỷ lệ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>💵 Tiền mặt</td>
                                    <td>{reportData.cashCount || 0}</td>
                                    <td>{formatCurrency(reportData.cashRevenue)}</td>
                                    <td>{reportData.totalRevenue > 0 ? ((reportData.cashRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                <tr>
                                    <td>📱 MoMo</td>
                                    <td>{reportData.momoCount || 0}</td>
                                    <td>{formatCurrency(reportData.momoRevenue)}</td>
                                    <td>{reportData.totalRevenue > 0 ? ((reportData.momoRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                <tr>
                                    <td>💳 Chuyển khoản/Thẻ</td>
                                    <td>{reportData.bankingCount || 0}</td>
                                    <td>{formatCurrency(reportData.bankingRevenue)}</td>
                                    <td>{reportData.totalRevenue > 0 ? ((reportData.bankingRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {reportData.topDishes?.length > 0 && (
                        <div className={styles.topDishes}>
                            <h3>🔥 Top món bán chạy</h3>
                            <div className={styles.dishesList}>
                                {reportData.topDishes.map((dish, idx) => (
                                    <div key={idx} className={styles.dishItem}>
                                        <span className={styles.dishRank}>#{idx + 1}</span>
                                        <span className={styles.dishName}>{dish.name}</span>
                                        <span className={styles.dishQuantity}>{dish.quantity} lượt</span>
                                        <span className={styles.dishRevenue}>{formatCurrency(dish.revenue)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {!loading && !reportData && reportType !== 'custom' && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    <h3>Chưa có dữ liệu</h3>
                    <p>Chọn loại báo cáo để xem thống kê doanh thu</p>
                </div>
            )}
        </div>
    );
};

export default ReportPage;