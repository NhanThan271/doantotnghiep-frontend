// pages/employee/cashier/ReportPage.js
import React, { useState, useEffect, useCallback } from "react";
import {
    Calendar, TrendingUp, DollarSign, Users, Coffee, Download, Filter,
    Receipt, BarChart3, CreditCard, Phone, Building2,
    Clock, Award, AlertCircle,
} from "lucide-react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
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
    // XÓA dòng này vì không dùng
    // const [setAllBills] = useState([]);

    const formatCurrency = useCallback((amount) => {
        if (!amount) return "0đ";
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1).replace('.0', '') + ' triệu';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(0) + 'k';
        }
        return amount.toLocaleString('vi-VN') + 'đ';
    }, []);

    const formatDate = useCallback((dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    }, []);

    const getDateRangeByType = useCallback(() => {
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
    }, [reportType, dateRange]);

    // ĐỊNH NGHĨA fetchReport TRƯỚC KHI DÙNG TRONG useEffect
    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const { startDate, endDate } = getDateRangeByType();

            const response = await fetch(`http://localhost:8080/api/employee/bills`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                let allBills = await response.json();

                const filteredBills = allBills.filter(bill => {
                    const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
                    return billDate >= startDate && billDate <= endDate && bill.paymentStatus === 'PAID';
                });

                const totalRevenue = filteredBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                const totalOrders = filteredBills.length;
                const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

                const cashBills = filteredBills.filter(b => b.paymentMethod === 'CASH');
                const momoBills = filteredBills.filter(b => b.paymentMethod === 'MOMO' || b.paymentMethod === 'MOBILE');
                const bankingBills = filteredBills.filter(b => b.paymentMethod === 'BANKING' || b.paymentMethod === 'CARD');

                const cashRevenue = cashBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                const momoRevenue = momoBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                const bankingRevenue = bankingBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

                const dishStats = {};
                const billDetails = [];

                for (const bill of filteredBills) {
                    const billDetail = {
                        'Mã hóa đơn': bill.id || bill.billId,
                        'Ngày tạo': new Date(bill.createdAt).toLocaleString('vi-VN'),
                        'Khách hàng': bill.customerName || 'Khách lẻ',
                        'Số điện thoại': bill.customerPhone || '',
                        'Tổng tiền': bill.totalAmount || 0,
                        'Phương thức': bill.paymentMethod === 'CASH' ? 'Tiền mặt' :
                            bill.paymentMethod === 'MOMO' ? 'MoMo' : 'Chuyển khoản',
                        'Trạng thái': bill.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'
                    };
                    billDetails.push(billDetail);

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
                    endDate,
                    billDetails
                });
            }
        } catch (error) {
            console.error("Error fetching report:", error);
        } finally {
            setLoading(false);
        }
    }, [getDateRangeByType]);

    // useEffect sử dụng fetchReport (đã được định nghĩa)
    useEffect(() => {
        if (reportType !== 'custom') {
            fetchReport();
        }
    }, [reportType, fetchReport]);

    const exportToExcel = useCallback(() => {
        if (!reportData) return;

        setExporting(true);
        try {
            const workbook = XLSX.utils.book_new();

            const summaryData = [
                ['BÁO CÁO DOANH THU'],
                [`Từ ngày: ${formatDate(reportData.startDate)}`],
                [`Đến ngày: ${formatDate(reportData.endDate)}`],
                [''],
                ['THỐNG KÊ TỔNG QUAN'],
                ['Chỉ tiêu', 'Giá trị'],
                ['Tổng doanh thu', formatCurrency(reportData.totalRevenue)],
                ['Số đơn hàng', reportData.totalOrders],
                ['Trung bình mỗi đơn', formatCurrency(reportData.averageOrderValue)],
                ['Số khách hàng', reportData.totalCustomers],
                [''],
                ['THỐNG KÊ THEO PHƯƠNG THỨC THANH TOÁN'],
                ['Phương thức', 'Số lượng', 'Doanh thu', 'Tỷ lệ'],
                ['Tiền mặt', reportData.cashCount || 0, formatCurrency(reportData.cashRevenue),
                    `${reportData.totalRevenue > 0 ? ((reportData.cashRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%`],
                ['MoMo', reportData.momoCount || 0, formatCurrency(reportData.momoRevenue),
                    `${reportData.totalRevenue > 0 ? ((reportData.momoRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%`],
                ['Chuyển khoản/Thẻ', reportData.bankingCount || 0, formatCurrency(reportData.bankingRevenue),
                    `${reportData.totalRevenue > 0 ? ((reportData.bankingRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%`],
                [''],
                ['TOP MÓN BÁN CHẠY'],
                ['STT', 'Tên món', 'Số lượng', 'Doanh thu']
            ];

            reportData.topDishes?.forEach((dish, idx) => {
                summaryData.push([idx + 1, dish.name, dish.quantity, formatCurrency(dish.revenue)]);
            });

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');

            if (reportData.billDetails && reportData.billDetails.length > 0) {
                const billSheetData = [
                    ['CHI TIẾT HÓA ĐƠN'],
                    [`Từ ngày: ${formatDate(reportData.startDate)}`],
                    [`Đến ngày: ${formatDate(reportData.endDate)}`],
                    [''],
                    ['Mã hóa đơn', 'Ngày tạo', 'Khách hàng', 'Số điện thoại', 'Tổng tiền', 'Phương thức', 'Trạng thái']
                ];

                reportData.billDetails.forEach(bill => {
                    billSheetData.push([
                        bill['Mã hóa đơn'],
                        bill['Ngày tạo'],
                        bill['Khách hàng'],
                        bill['Số điện thoại'],
                        bill['Tổng tiền'],
                        bill['Phương thức'],
                        bill['Trạng thái']
                    ]);
                });

                const billSheet = XLSX.utils.aoa_to_sheet(billSheetData);
                billSheet['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
                XLSX.utils.book_append_sheet(workbook, billSheet, 'Chi tiết hóa đơn');
            }

            const addDishDetailSheet = async () => {
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:8080/api/employee/bills`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const allBills = await response.json();
                    const { startDate, endDate } = getDateRangeByType();
                    const filteredBills = allBills.filter(bill => {
                        const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
                        return billDate >= startDate && billDate <= endDate && bill.paymentStatus === 'PAID';
                    });

                    const dishData = [
                        ['CHI TIẾT MÓN ĂN THEO HÓA ĐƠN'],
                        [`Từ ngày: ${formatDate(reportData.startDate)}`],
                        [`Đến ngày: ${formatDate(reportData.endDate)}`],
                        [''],
                        ['Mã hóa đơn', 'Tên món', 'Số lượng', 'Đơn giá', 'Thành tiền']
                    ];

                    filteredBills.forEach(bill => {
                        if (bill.order?.items) {
                            bill.order.items.forEach(item => {
                                dishData.push([
                                    bill.id || bill.billId,
                                    item.foodName || item.name || 'Món ăn',
                                    item.quantity || 1,
                                    formatCurrency(item.price || 0),
                                    formatCurrency((item.price || 0) * (item.quantity || 1))
                                ]);
                            });
                        }
                    });

                    const dishSheet = XLSX.utils.aoa_to_sheet(dishData);
                    dishSheet['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
                    XLSX.utils.book_append_sheet(workbook, dishSheet, 'Chi tiết món ăn');

                    const fileName = `Bao_cao_doanh_thu_${reportData.startDate}_den_${reportData.endDate}.xlsx`;
                    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
                    saveAs(blob, fileName);
                    setExporting(false);
                } else {
                    setExporting(false);
                }
            };

            addDishDetailSheet();
        } catch (error) {
            console.error("Error exporting to Excel:", error);
            alert("Có lỗi khi xuất file Excel");
            setExporting(false);
        }
    }, [reportData, formatCurrency, formatDate, getDateRangeByType]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2><BarChart3 size={20} /> Báo cáo doanh thu</h2>
                {reportData && (
                    <button onClick={exportToExcel} disabled={exporting} className={styles.exportBtn}>
                        <Download size={16} /> {exporting ? "Đang xuất..." : "Xuất Excel"}
                    </button>
                )}
            </div>

            <div className={styles.filterSection}>
                <div className={styles.reportTypeBtns}>
                    <button className={reportType === 'daily' ? styles.activeBtn : styles.btn} onClick={() => setReportType('daily')}>
                        <Calendar size={14} /> Hôm nay
                    </button>
                    <button className={reportType === 'weekly' ? styles.activeBtn : styles.btn} onClick={() => setReportType('weekly')}>
                        <Calendar size={14} /> Tuần này
                    </button>
                    <button className={reportType === 'monthly' ? styles.activeBtn : styles.btn} onClick={() => setReportType('monthly')}>
                        <Calendar size={14} /> Tháng này
                    </button>
                    <button className={reportType === 'custom' ? styles.activeBtn : styles.btn} onClick={() => setReportType('custom')}>
                        <Filter size={14} /> Tùy chọn
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
                            <Clock size={14} />
                            {reportData && ` Từ ${formatDate(reportData.startDate)} → ${formatDate(reportData.endDate)}`}
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
                            <div className={styles.cardIcon}><DollarSign size={24} /></div>
                            <div className={styles.cardInfo}>
                                <div className={styles.cardTitle}>Tổng doanh thu</div>
                                <div className={styles.cardValue}>{formatCurrency(reportData.totalRevenue)}</div>
                            </div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.cardIcon}><Receipt size={24} /></div>
                            <div className={styles.cardInfo}>
                                <div className={styles.cardTitle}>Số đơn hàng</div>
                                <div className={styles.cardValue}>{reportData.totalOrders}</div>
                            </div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.cardIcon}><TrendingUp size={24} /></div>
                            <div className={styles.cardInfo}>
                                <div className={styles.cardTitle}>TB mỗi đơn</div>
                                <div className={styles.cardValue}>{formatCurrency(reportData.averageOrderValue)}</div>
                            </div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.cardIcon}><Users size={24} /></div>
                            <div className={styles.cardInfo}>
                                <div className={styles.cardTitle}>Khách hàng</div>
                                <div className={styles.cardValue}>{reportData.totalCustomers}</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.paymentBreakdown}>
                        <h3><CreditCard size={18} /> Chi tiết theo hình thức thanh toán</h3>
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
                                    <td><DollarSign size={14} /> Tiền mặt</td>
                                    <td>{reportData.cashCount || 0}</td>
                                    <td>{formatCurrency(reportData.cashRevenue)}</td>
                                    <td>{reportData.totalRevenue > 0 ? ((reportData.cashRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                <tr>
                                    <td><Phone size={14} /> MoMo</td>
                                    <td>{reportData.momoCount || 0}</td>
                                    <td>{formatCurrency(reportData.momoRevenue)}</td>
                                    <td>{reportData.totalRevenue > 0 ? ((reportData.momoRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                <tr>
                                    <td><Building2 size={14} /> Chuyển khoản/Thẻ</td>
                                    <td>{reportData.bankingCount || 0}</td>
                                    <td>{formatCurrency(reportData.bankingRevenue)}</td>
                                    <td>{reportData.totalRevenue > 0 ? ((reportData.bankingRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {reportData.topDishes?.length > 0 && (
                        <div className={styles.topDishes}>
                            <h3><Award size={18} /> Top món bán chạy</h3>
                            <div className={styles.dishesList}>
                                {reportData.topDishes.map((dish, idx) => (
                                    <div key={idx} className={styles.dishItem}>
                                        <span className={styles.dishRank}>#{idx + 1}</span>
                                        <span className={styles.dishName}>{dish.name}</span>
                                        <span className={styles.dishQuantity}><Coffee size={12} /> {dish.quantity} lượt</span>
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
                    <div className={styles.emptyIcon}><AlertCircle size={48} /></div>
                    <h3>Chưa có dữ liệu</h3>
                    <p>Chọn loại báo cáo để xem thống kê doanh thu</p>
                </div>
            )}
        </div>
    );
};

export default ReportPage;