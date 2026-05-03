import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Download, RefreshCw, Store, Calendar, FileText, Eye, X } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from '../../layouts/AdminLayout.module.css';

const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
export default function BranchReports() {
    const [loading, setLoading] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(null);
    const [bills, setBills] = useState([]);
    const [orders, setOrders] = useState([]);
    const [payments, setPayments] = useState([]);

    // Filters
    const todayDate = new Date();

    const [dateFrom, setDateFrom] = useState(getLocalDateString(todayDate));
    const [dateTo, setDateTo] = useState(getLocalDateString(todayDate));
    const [activeTab, setActiveTab] = useState('overview'); // overview, bills, revenue

    // Modal
    const [showBillDetail, setShowBillDetail] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);

    const API_BASE_URL = 'http://localhost:8080';

    // Fetch current branch
    const fetchCurrentBranch = async () => {
        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            let branchId = user?.branch?.id || user?.branchId;

            if (!branchId) {
                const userRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!userRes.ok) throw new Error('Không thể lấy thông tin user');
                const userData = await userRes.json();
                branchId = userData.branch?.id;
            }

            if (!branchId) {
                alert('Tài khoản của bạn chưa được gán chi nhánh.');
                return;
            }

            const branchRes = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (branchRes.ok) {
                const branchData = await branchRes.json();
                setCurrentBranch(branchData);
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Không thể lấy thông tin chi nhánh.');
        }
    };

    // Fetch bills
    const fetchBills = async () => {
        if (!currentBranch?.id) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/employee/bills`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể tải hóa đơn');
            const data = await response.json();

            // Filter by branch
            const branchBills = data.filter(bill =>
                bill.order?.branch?.id === currentBranch.id
            );
            setBills(branchBills);
        } catch (error) {
            console.error('Lỗi:', error);
            setBills([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch orders
    const fetchOrders = async () => {
        if (!currentBranch?.id) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/customer/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể tải đơn hàng');
            const data = await response.json();

            // Filter by branch
            const branchOrders = data.filter(order =>
                order.branch?.id === currentBranch.id
            );
            setOrders(branchOrders);
        } catch (error) {
            console.error('Lỗi:', error);
            setOrders([]);
        }
    };

    useEffect(() => {
        fetchCurrentBranch();
    }, []);

    useEffect(() => {
        if (currentBranch) {
            fetchBills();
            fetchOrders();
        }
    }, [currentBranch]);

    // Filter bills by date range
    const filteredBills = bills.filter(bill => {
        if (!bill.issuedAt) return false;
        const billDate = getLocalDateString(new Date(bill.issuedAt));
        return billDate >= dateFrom && billDate <= dateTo;
    });

    // Calculate statistics
    const stats = {
        totalRevenue: filteredBills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0),
        totalBills: filteredBills.length,
        paidBills: filteredBills.filter(b => b.paymentStatus === 'PAID').length,
        pendingBills: filteredBills.filter(b => b.paymentStatus === 'PENDING').length,
        avgBillValue: filteredBills.length > 0 ?
            filteredBills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0) / filteredBills.length : 0
    };

    const handleExportExcel = () => {
        // Chuẩn bị dữ liệu cho sheet Tổng quan
        const summaryData = [
            ['BÁO CÁO CHI NHÁNH'],
            ['Chi nhánh:', currentBranch.name],
            ['Địa chỉ:', currentBranch.address || '-'],
            ['Từ ngày:', dateFrom],
            ['Đến ngày:', dateTo],
            [''],
            ['THỐNG KÊ TỔNG HỢP'],
            ['Tổng doanh thu:', stats.totalRevenue],
            ['Tổng số hóa đơn:', stats.totalBills],
            ['Đã thanh toán:', stats.paidBills],
            ['Chờ thanh toán:', stats.pendingBills],
            ['Giá trị TB/Hóa đơn:', stats.avgBillValue],
        ];

        // Chuẩn bị dữ liệu cho sheet Hóa đơn
        const billsData = [
            ['Mã HĐ', 'Ngày xuất', 'Mã đơn hàng', 'Tổng tiền', 'PT Thanh toán', 'Trạng thái']
        ];
        filteredBills.forEach(bill => {
            billsData.push([
                bill.id,
                formatDate(bill.issuedAt),
                bill.order?.id || '-',
                bill.totalAmount,
                bill.paymentMethod || 'N/A',
                bill.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'
            ]);
        });

        // Chuẩn bị dữ liệu cho sheet Doanh thu theo ngày
        const revenueData = [
            ['Ngày', 'Số hóa đơn', 'Doanh thu', 'TB/Hóa đơn']
        ];
        dailyRevenueData.forEach(day => {
            revenueData.push([
                new Date(day.date).toLocaleDateString('vi-VN'),
                day.count,
                day.revenue,
                day.revenue / day.count
            ]);
        });

        // Tạo workbook
        const wb = XLSX.utils.book_new();

        // Tạo các worksheet
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        const wsBills = XLSX.utils.aoa_to_sheet(billsData);
        const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData);

        // Thêm các sheet vào workbook
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng quan');
        XLSX.utils.book_append_sheet(wb, wsBills, 'Hóa đơn');
        XLSX.utils.book_append_sheet(wb, wsRevenue, 'Doanh thu theo ngày');

        // Xuất file
        const fileName = `BaoCao_${currentBranch.name}_${dateFrom}_${dateTo}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // Revenue by date
    const revenueByDate = {};
    filteredBills.forEach(bill => {
        if (!bill.issuedAt) return;
        const date = getLocalDateString(new Date(bill.issuedAt));
        if (!revenueByDate[date]) {
            revenueByDate[date] = { date, revenue: 0, count: 0 };
        }
        revenueByDate[date].revenue += parseFloat(bill.totalAmount || 0);
        revenueByDate[date].count += 1;
    });

    const dailyRevenueData = Object.values(revenueByDate)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // Last 14 days

    // Payment methods distribution
    const paymentMethodStats = {};
    filteredBills.forEach(bill => {
        const method = bill.paymentMethod || 'UNKNOWN';
        if (!paymentMethodStats[method]) {
            paymentMethodStats[method] = { name: method, value: 0, color: method === 'CASH' ? '#10B981' : '#3B82F6' };
        }
        paymentMethodStats[method].value += 1;
    });

    const paymentMethodData = Object.values(paymentMethodStats);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleViewBill = (bill) => {
        setSelectedBill(bill);
        setShowBillDetail(true);
    };

    const handleExportPDF = async (billId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/employee/bills/${billId}/export`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể xuất PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bill_${billId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Không thể xuất PDF. Vui lòng thử lại.');
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color, fontSize: '14px', margin: '4px 0' }}>
                            {entry.name}: {entry.name.includes('Doanh thu') ? formatCurrency(entry.value) : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (!currentBranch) {
        return (
            <div className={styles.loadingContainer}>
                <RefreshCw size={48} className={styles.spinIcon} />
                <p className={styles.loadingText}>Đang tải thông tin chi nhánh...</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>Báo cáo Chi nhánh</h2>
                        <p className={styles.branchInfo}>
                            <Store size={16} />
                            <span className={styles.branchName}>{currentBranch.name}</span>
                            {currentBranch.address && (
                                <span className={styles.branchAddress}>• {currentBranch.address}</span>
                            )}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleExportExcel}
                            className={styles.primaryButton}
                        >
                            <Download size={18} />
                            Xuất Excel
                        </button>

                        <button
                            onClick={() => {
                                fetchBills();
                                fetchOrders();
                            }}
                            disabled={loading}
                            className={`${styles.refreshButton} ${loading ? styles.refreshButtonDisabled : ''}`}
                        >
                            <RefreshCw size={18} className={loading ? styles.spinIcon : ''} />
                            Làm mới
                        </button>
                    </div>
                </div>

                {/* Date Filter */}
                <div className={styles.filterBar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Calendar size={20} style={{ color: 'var(--color-text-secondary)' }} />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className={styles.filterSelect}
                            style={{ width: 'auto', background: 'rgb(243, 244, 246)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                        />
                        <span>đến</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className={styles.filterSelect}
                            style={{ width: 'auto', background: 'rgb(243, 244, 246)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                        />
                    </div>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</div>
                            <div className={styles.statLabel}>Tổng doanh thu</div>
                        </div>
                    </div>

                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.totalBills}</div>
                            <div className={styles.statLabel}>Tổng hóa đơn</div>
                        </div>
                    </div>

                    <div className={styles.statCardDanger}>
                        <div className={styles.statIcon}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{formatCurrency(stats.avgBillValue)}</div>
                            <div className={styles.statLabel}>Giá trị TB/Hóa đơn</div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className={styles.filterBar}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={activeTab === 'overview' ? styles.tabActive : styles.tabInactive}
                        >
                            <BarChart3 size={18} />
                            Tổng quan
                        </button>
                        <button
                            onClick={() => setActiveTab('bills')}
                            className={activeTab === 'bills' ? styles.tabActive : styles.tabInactive}
                        >
                            <FileText size={18} />
                            Hóa đơn
                        </button>
                        <button
                            onClick={() => setActiveTab('revenue')}
                            className={activeTab === 'revenue' ? styles.tabActive : styles.tabInactive}
                        >
                            <DollarSign size={18} />
                            Doanh thu
                        </button>
                    </div>
                </div>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className={styles['grid-2']} style={{ marginTop: '16px' }}>
                    {/* Daily Revenue Chart */}
                    <div className={styles.card}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                                Doanh thu 14 ngày gần đây
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                Theo dõi xu hướng doanh thu hàng ngày
                            </p>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dailyRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--color-text-secondary)"
                                    style={{ fontSize: '12px' }}
                                    tickFormatter={(date) => {
                                        const d = new Date(date);
                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis
                                    stroke="var(--color-text-secondary)"
                                    style={{ fontSize: '12px' }}
                                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="revenue"
                                    fill="var(--color-primary)"
                                    radius={[8, 8, 0, 0]}
                                    name="Doanh thu"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Payment Methods Pie Chart */}
                    <div className={styles.card}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                                Phương thức thanh toán
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                Phân bổ theo hình thức thanh toán
                            </p>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={paymentMethodData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {paymentMethodData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '24px',
                            marginTop: '16px',
                            flexWrap: 'wrap'
                        }}>
                            {paymentMethodData.map((item, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '3px',
                                        background: item.color
                                    }}></div>
                                    <span style={{ fontSize: '14px' }}>
                                        {item.name}: <strong>{item.value}</strong>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bills Count Line Chart */}
                    <div className={styles.card}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                                Số lượng hóa đơn theo ngày
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                Xu hướng số lượng giao dịch
                            </p>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={dailyRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--color-text-secondary)"
                                    style={{ fontSize: '12px' }}
                                    tickFormatter={(date) => {
                                        const d = new Date(date);
                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis
                                    stroke="var(--color-text-secondary)"
                                    style={{ fontSize: '12px' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    dot={{ fill: '#3B82F6', r: 5 }}
                                    activeDot={{ r: 7 }}
                                    name="Số hóa đơn"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Payment Status */}
                    <div className={styles.card}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                                Trạng thái thanh toán
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                Tình trạng hóa đơn
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--color-success-light)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }}></div>
                                    <span style={{ fontWeight: '600' }}>Đã thanh toán</span>
                                </div>
                                <span style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                                    {stats.paidBills}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--color-warning-light)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }}></div>
                                    <span style={{ fontWeight: '600' }}>Chờ thanh toán</span>
                                </div>
                                <span style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B' }}>
                                    {stats.pendingBills}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BILLS TAB */}
            {activeTab === 'bills' && (
                <div className={styles.tableCard} style={{ marginTop: '16px' }}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Mã HĐ</th>
                                    <th>Ngày xuất</th>
                                    <th>Đơn hàng</th>
                                    <th className={styles.textCenter}>Tổng tiền</th>
                                    <th className={styles.textCenter}>PT Thanh toán</th>
                                    <th className={styles.textCenter}>Trạng thái</th>
                                    <th className={styles.textCenter}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className={styles.emptyState}>
                                            <FileText size={48} className={styles.emptyIcon} />
                                            <p>Không có hóa đơn nào trong khoảng thời gian này</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBills.map(bill => (
                                        <tr key={bill.id}>
                                            <td>
                                                <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                                                    #{bill.id}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '14px' }}>
                                                    {formatDate(bill.issuedAt)}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <ShoppingCart size={16} style={{ color: 'var(--color-text-secondary)' }} />
                                                    Đơn #{bill.order?.id || '-'}
                                                </div>
                                            </td>
                                            <td className={styles.textCenter}>
                                                <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                                                    {formatCurrency(bill.totalAmount)}
                                                </div>
                                            </td>
                                            <td className={styles.textCenter}>
                                                <span className={styles.badgePrimary}>
                                                    {bill.paymentMethod || 'N/A'}
                                                </span>
                                            </td>
                                            <td className={styles.textCenter}>
                                                <span className={bill.paymentStatus === 'PAID' ? styles.badgeSuccess : styles.badgeWarning}>
                                                    {bill.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                                                </span>
                                            </td>
                                            <td className={styles.textCenter}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleViewBill(bill)}
                                                        className={styles.primaryButton}
                                                        style={{ padding: '6px 12px', fontSize: '14px' }}
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleExportPDF(bill.id)}
                                                        className={styles.secondaryButton}
                                                        style={{ padding: '6px 12px', fontSize: '14px' }}
                                                        title="Xuất PDF"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* REVENUE TAB */}
            {activeTab === 'revenue' && (
                <div style={{ marginTop: '16px' }}>
                    <div className={styles.card}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                                Chi tiết doanh thu theo ngày
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                Bảng phân tích doanh thu chi tiết
                            </p>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Ngày</th>
                                        <th className={styles.textCenter}>Số hóa đơn</th>
                                        <th className={styles.textCenter}>Doanh thu</th>
                                        <th className={styles.textCenter}>TB/Hóa đơn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyRevenueData.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className={styles.emptyState}>
                                                <BarChart3 size={48} className={styles.emptyIcon} />
                                                <p>Không có dữ liệu doanh thu</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        dailyRevenueData.map((day, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <div style={{ fontWeight: '600' }}>
                                                        {new Date(day.date).toLocaleDateString('vi-VN', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <span className={styles.badgePrimary}>{day.count}</span>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                                                        {formatCurrency(day.revenue)}
                                                    </div>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <div style={{ fontWeight: '500' }}>
                                                        {formatCurrency(day.revenue / day.count)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* BILL DETAIL MODAL */}
            {showBillDetail && selectedBill && (
                <div className={styles.modalOverlay} onClick={() => setShowBillDetail(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                <FileText size={24} />
                                Chi tiết Hóa đơn #{selectedBill.id}
                            </h3>
                            <button
                                onClick={() => setShowBillDetail(false)}
                                className={styles.modalClose}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* Bill Info */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className={styles.formLabel}>Ngày xuất</label>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                            {formatDate(selectedBill.issuedAt)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className={styles.formLabel}>Đơn hàng</label>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                            #{selectedBill.order?.id || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className={styles.formLabel}>Phương thức TT</label>
                                        <span className={styles.badgePrimary}>
                                            {selectedBill.paymentMethod || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <label className={styles.formLabel}>Trạng thái</label>
                                        <span className={selectedBill.paymentStatus === 'PAID' ? styles.badgeSuccess : styles.badgeWarning}>
                                            {selectedBill.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Items */}
                            {selectedBill.order?.items && selectedBill.order.items.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <label className={styles.formLabel} style={{ marginBottom: '12px', display: 'block' }}>
                                        Chi tiết sản phẩm
                                    </label>
                                    <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', fontSize: '14px' }}>
                                            <thead style={{ background: 'var(--color-bg-secondary)' }}>
                                                <tr>
                                                    <th style={{ padding: '12px', textAlign: 'left' }}>Sản phẩm</th>
                                                    <th style={{ padding: '12px', textAlign: 'center' }}>SL</th>
                                                    <th style={{ padding: '12px', textAlign: 'right' }}>Đơn giá</th>
                                                    <th style={{ padding: '12px', textAlign: 'right' }}>Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedBill.order.items.map((item, index) => (
                                                    <tr key={index} style={{ borderTop: '1px solid var(--color-border)' }}>
                                                        <td style={{ padding: '12px' }}>
                                                            {item.product?.name || 'N/A'}
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                                            {item.quantity}
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                                            {formatCurrency(item.price)}
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                                            {formatCurrency(item.subtotal)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedBill.notes && (
                                <div style={{ marginBottom: '24px' }}>
                                    <label className={styles.formLabel}>Ghi chú</label>
                                    <div style={{
                                        padding: '12px',
                                        background: 'var(--color-bg-secondary)',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}>
                                        {selectedBill.notes}
                                    </div>
                                </div>
                            )}

                            {/* Total */}
                            <div style={{
                                borderTop: '2px solid var(--color-border)',
                                paddingTop: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '18px', fontWeight: '700' }}>Tổng cộng:</span>
                                <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)' }}>
                                    {formatCurrency(selectedBill.totalAmount)}
                                </span>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                onClick={() => setShowBillDetail(false)}
                                className={styles.secondaryButton}
                            >
                                Đóng
                            </button>
                            <button
                                onClick={() => handleExportPDF(selectedBill.id)}
                                className={styles.primaryButton}
                            >
                                <Download size={18} />
                                Xuất PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingModal}>
                        <RefreshCw size={48} className={styles.spinIcon} />
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            )}
        </div>
    );
}