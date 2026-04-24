// pages/employee/cashier/BillPage.js
import React, { useState, useEffect } from "react";
import {
    Search, Filter, Eye, Printer, Calendar, ChevronLeft, ChevronRight,
    DollarSign, Download, RefreshCw
} from "lucide-react";
import styles from "./BillPage.module.css";

const BillPage = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [filter, setFilter] = useState({ status: 'all', search: '', startDate: '', endDate: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedBill, setSelectedBill] = useState(null);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [tableNumbers, setTableNumbers] = useState({}); // Lưu số bàn cho từng bill
    const itemsPerPage = 10;

    useEffect(() => {
        fetchBills();
    }, [filter, currentPage]);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/employee/bills`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                let allBills = await response.json();
                console.log("Fetched bills:", allBills);

                // Lọc theo trạng thái
                if (filter.status !== 'all') {
                    allBills = allBills.filter(bill => bill.paymentStatus === filter.status.toUpperCase());
                }

                // Lọc theo tìm kiếm
                if (filter.search) {
                    allBills = allBills.filter(bill =>
                        bill.id?.toString().includes(filter.search) ||
                        bill.order?.id?.toString().includes(filter.search)
                    );
                }

                // Lọc theo ngày
                if (filter.startDate) {
                    const startDate = new Date(filter.startDate);
                    startDate.setHours(0, 0, 0);
                    allBills = allBills.filter(bill => new Date(bill.createdAt) >= startDate);
                }

                if (filter.endDate) {
                    const endDate = new Date(filter.endDate);
                    endDate.setHours(23, 59, 59);
                    allBills = allBills.filter(bill => new Date(bill.createdAt) <= endDate);
                }

                // Sắp xếp theo id giảm dần
                allBills.sort((a, b) => b.id - a.id);

                // Phân trang
                setTotalPages(Math.ceil(allBills.length / itemsPerPage));
                const start = (currentPage - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedBills = allBills.slice(start, end);
                setBills(paginatedBills);

                // ✅ SỬA: Fetch số bàn cho TẤT CẢ bill (bỏ điều kiện && bill.paymentStatus === 'PENDING')
                for (const bill of paginatedBills) {
                    if (bill.order?.id && !tableNumbers[bill.id]) {
                        await fetchTableNumber(bill.id, bill.order.id);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching bills:", error);
        } finally {
            setLoading(false);
        }
    };

    // Lấy số bàn từ order detail
    const fetchTableNumber = async (billId, orderId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/customer/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const orderDetail = await response.json();
                setTableNumbers(prev => ({
                    ...prev,
                    [billId]: orderDetail.table?.number || '--'
                }));
            }
        } catch (error) {
            console.error("Error fetching table number:", error);
        }
    };

    // Gọi API lấy chi tiết đơn hàng
    const fetchOrderDetail = async (orderId) => {
        setLoadingDetail(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/customer/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Order detail:", data);
                return data;
            }
        } catch (error) {
            console.error("Error fetching order detail:", error);
        } finally {
            setLoadingDetail(false);
        }
        return null;
    };

    // Xem chi tiết hóa đơn
    const handleViewDetail = async (bill) => {
        setSelectedBill(bill);
        setSelectedOrderDetail(null);
        setShowDetailModal(true);

        if (bill.order?.id) {
            const orderDetail = await fetchOrderDetail(bill.order.id);
            setSelectedOrderDetail(orderDetail);
        }
    };

    const handleProcessPayment = async (orderId) => {
        setProcessingPayment(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/customer/orders/${orderId}/pay?paymentMethod=${paymentMethod}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Payment result:", result);
                alert("Thanh toán thành công!");
                setShowPaymentModal(false);
                setSelectedOrderForPayment(null);
                fetchBills();
            } else {
                const error = await response.json();
                alert(error.message || error.error || "Thanh toán thất bại");
            }
        } catch (error) {
            console.error("Error processing payment:", error);
            alert("Có lỗi xảy ra khi thanh toán");
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleExportBill = async (billId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/employee/bills/${billId}/export`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bill_${billId}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                alert("Không thể xuất hóa đơn");
            }
        } catch (error) {
            console.error("Error exporting bill:", error);
            alert("Có lỗi khi xuất hóa đơn");
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return "0đ";
        return Number(amount).toLocaleString('vi-VN') + 'đ';
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "--:--";
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'PAID': { text: 'Đã thanh toán', color: '#10b981' },
            'PENDING': { text: 'Chờ thanh toán', color: '#f59e0b' },
            'CANCELLED': { text: 'Đã hủy', color: '#ef4444' },
            'REFUNDED': { text: 'Đã hoàn tiền', color: '#8b5cf6' }
        };
        const s = statusMap[status] || { text: status, color: '#6b7280' };
        return <span style={{ background: s.color + '20', color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{s.text}</span>;
    };

    const getPaymentMethodLabel = (method) => {
        const methods = {
            'CASH': '💵 Tiền mặt',
            'MOMO': '📱 Ví MoMo',
            'MOBILE': '📱 Ví MoMo',
            'BANKING': '🏦 Chuyển khoản',
            'CARD': '💳 Thẻ ngân hàng'
        };
        return methods[method] || method;
    };

    // Lấy order detail để hiển thị (ưu tiên từ API riêng)
    const getDisplayOrder = () => {
        if (selectedOrderDetail) return selectedOrderDetail;
        if (selectedBill?.order) return selectedBill.order;
        return null;
    };

    const displayOrder = getDisplayOrder();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Quản lý hóa đơn</h2>
                <button onClick={() => fetchBills()} className={styles.refreshBtn}>
                    <RefreshCw size={16} /> Làm mới
                </button>
            </div>

            {/* Filters */}
            <div className={styles.filterSection}>
                <div className={styles.filterRow}>
                    <div className={styles.filterGroup}>
                        <label><Search size={14} /> Tìm kiếm</label>
                        <input
                            type="text"
                            placeholder="Mã HD, mã đơn..."
                            value={filter.search}
                            onChange={(e) => setFilter({ ...filter, search: e.target.value, currentPage: 1 })}
                            className={styles.searchInput}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label><Filter size={14} /> Trạng thái</label>
                        <select
                            value={filter.status}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value, currentPage: 1 })}
                            className={styles.selectInput}
                        >
                            <option value="all">Tất cả</option>
                            <option value="PAID">Đã thanh toán</option>
                            <option value="PENDING">Chờ thanh toán</option>
                            <option value="CANCELLED">Đã hủy</option>
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label><Calendar size={14} /> Từ ngày</label>
                        <input
                            type="date"
                            value={filter.startDate}
                            onChange={(e) => setFilter({ ...filter, startDate: e.target.value, currentPage: 1 })}
                            className={styles.dateInput}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label><Calendar size={14} /> Đến ngày</label>
                        <input
                            type="date"
                            value={filter.endDate}
                            onChange={(e) => setFilter({ ...filter, endDate: e.target.value, currentPage: 1 })}
                            className={styles.dateInput}
                        />
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className={styles.summaryStats}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Tổng hóa đơn</div>
                    <div className={styles.statValue}>{bills.length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Đã thanh toán</div>
                    <div className={styles.statValue}>{bills.filter(b => b.paymentStatus === 'PAID').length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Chờ thanh toán</div>
                    <div className={styles.statValue}>{bills.filter(b => b.paymentStatus === 'PENDING').length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Tổng doanh thu</div>
                    <div className={styles.statValue}>
                        {formatCurrency(bills.filter(b => b.paymentStatus === 'PAID').reduce((sum, b) => sum + (b.totalAmount || 0), 0))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableWrapper}>
                {loading ? (
                    <div className={styles.loading}>Đang tải...</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã HD</th>
                                <th>Mã đơn</th>
                                <th>Bàn</th>
                                <th>Thời gian</th>
                                <th>Tổng tiền</th>
                                <th>Phương thức</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.length === 0 ? (
                                <tr key="no-data">
                                    <td colSpan="8" className={styles.noData}>Không có dữ liệu</td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <tr key={bill.id}>
                                        <td><span className={styles.orderId}>#{bill.id}</span></td>
                                        <td>#{bill.order?.id || '--'}</td>
                                        <td>
                                            {tableNumbers[bill.id] ? `Bàn ${tableNumbers[bill.id]}` : 'Đang tải...'}
                                        </td>
                                        <td>{formatDateTime(bill.createdAt)}</td>
                                        <td><span className={styles.amount}>{formatCurrency(bill.totalAmount)}</span></td>
                                        <td>{getPaymentMethodLabel(bill.paymentMethod)}</td>
                                        <td>{getStatusBadge(bill.paymentStatus)}</td>
                                        <td>
                                            <button
                                                onClick={() => handleViewDetail(bill)}
                                                className={styles.viewBtn}
                                            >
                                                <Eye size={14} /> Chi tiết
                                            </button>
                                            {bill.paymentStatus === 'PAID' && (
                                                <button
                                                    onClick={() => handleExportBill(bill.id)}
                                                    className={styles.printBtn}
                                                >
                                                    <Download size={14} /> PDF
                                                </button>
                                            )}
                                            {bill.paymentStatus === 'PENDING' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrderForPayment(bill.order);
                                                        setShowPaymentModal(true);
                                                    }}
                                                    className={styles.paymentBtn}
                                                >
                                                    <DollarSign size={14} /> Thanh toán
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={styles.pageBtn}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className={styles.pageInfo}>Trang {currentPage} / {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={styles.pageBtn}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedBill && (
                <div className={styles.modalOverlay} onClick={() => {
                    setShowDetailModal(false);
                    setSelectedOrderDetail(null);
                }}>
                    <div className={styles.modalLg} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Chi tiết hóa đơn #{selectedBill.id}</h3>
                            <button onClick={() => {
                                setShowDetailModal(false);
                                setSelectedOrderDetail(null);
                            }} className={styles.closeBtn}>✕</button>
                        </div>
                        <div className={styles.orderDetail}>
                            {loadingDetail ? (
                                <div className={styles.loading}>Đang tải chi tiết...</div>
                            ) : (
                                <>
                                    <div className={styles.infoGrid}>
                                        <div className={styles.infoRow}>
                                            <span>Mã hóa đơn:</span>
                                            <strong>#{selectedBill.id}</strong>
                                        </div>
                                        <div className={styles.infoRow}>
                                            <span>Mã đơn hàng:</span>
                                            <strong>#{displayOrder?.id || selectedBill.order?.id || '--'}</strong>
                                        </div>
                                        <div className={styles.infoRow}>
                                            <span>Bàn:</span>
                                            <strong>
                                                {displayOrder?.table?.number
                                                    ? `Bàn ${displayOrder.table.number}`
                                                    : 'Đang tải...'}
                                            </strong>
                                        </div>
                                        <div className={styles.infoRow}>
                                            <span>Khách hàng:</span>
                                            <strong>{displayOrder?.customerName || 'Khách lẻ'}</strong>
                                        </div>
                                        <div className={styles.infoRow}>
                                            <span>Thời gian tạo:</span>
                                            <strong>{formatDateTime(selectedBill.createdAt)}</strong>
                                        </div>
                                        <div className={styles.infoRow}>
                                            <span>Thời gian xuất HD:</span>
                                            <strong>{formatDateTime(selectedBill.issuedAt)}</strong>
                                        </div>
                                        <div className={styles.infoRow}>
                                            <span>Phương thức thanh toán:</span>
                                            <strong>{getPaymentMethodLabel(selectedBill.paymentMethod)}</strong>
                                        </div>
                                        <div className={styles.infoRow}>
                                            <span>Trạng thái:</span>
                                            <strong>{selectedBill.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}</strong>
                                        </div>
                                    </div>

                                    <div className={styles.divider}></div>

                                    <div className={styles.itemsList}>
                                        <h4>📋 Danh sách món:</h4>
                                        {displayOrder?.items && displayOrder.items.length > 0 ? (
                                            <table className={styles.itemsTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Tên món</th>
                                                        <th>Số lượng</th>
                                                        <th>Đơn giá</th>
                                                        <th>Thành tiền</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {displayOrder.items.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td>{item.foodName || item.name || `Món #${item.foodId}`}</td>
                                                            <td className={styles.textCenter}>{item.quantity}</td>
                                                            <td className={styles.textRight}>{formatCurrency(item.price)}</td>
                                                            <td className={styles.textRight}>{formatCurrency(item.price * item.quantity)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className={styles.totalRow}>
                                                        <td colSpan="3" className={styles.textRight}><strong>Tổng cộng:</strong></td>
                                                        <td className={styles.textRight}><strong className={styles.totalAmount}>{formatCurrency(selectedBill.totalAmount)}</strong></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        ) : (
                                            <div className={styles.noItems}>Không có món ăn</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => {
                                setShowDetailModal(false);
                                setSelectedOrderDetail(null);
                            }} className={styles.closeModalBtn}>Đóng</button>
                            {selectedBill.paymentStatus === 'PAID' && (
                                <button
                                    onClick={() => handleExportBill(selectedBill.id)}
                                    className={styles.printBtnLarge}
                                >
                                    <Download size={16} /> Xuất PDF
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedOrderForPayment && (
                <div className={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Thanh toán đơn hàng</h3>
                            <button onClick={() => setShowPaymentModal(false)} className={styles.closeBtn}>✕</button>
                        </div>
                        <div className={styles.orderDetail}>
                            <div className={styles.infoRow}>
                                <span>Mã đơn hàng:</span>
                                <strong>#{selectedOrderForPayment?.id}</strong>
                            </div>
                            <div className={styles.infoRow}>
                                <span>Bàn:</span>
                                <strong>{selectedOrderForPayment?.table?.number ? `Bàn ${selectedOrderForPayment.table.number}` : 'Bàn --'}</strong>
                            </div>
                            <div className={styles.totalRow}>
                                <span>Tổng tiền:</span>
                                <strong className={styles.totalAmount}>{formatCurrency(selectedOrderForPayment?.totalAmount)}</strong>
                            </div>
                            <div className={styles.divider}></div>
                            <div className={styles.paymentMethodSection}>
                                <label>Chọn phương thức thanh toán:</label>
                                <div className={styles.paymentMethods}>
                                    <button
                                        className={`${styles.methodBtn} ${paymentMethod === 'CASH' ? styles.activeMethod : ''}`}
                                        onClick={() => setPaymentMethod('CASH')}
                                    >
                                        💵 Tiền mặt
                                    </button>
                                    <button
                                        className={`${styles.methodBtn} ${paymentMethod === 'MOMO' ? styles.activeMethod : ''}`}
                                        onClick={() => setPaymentMethod('MOMO')}
                                    >
                                        📱 MoMo
                                    </button>
                                    <button
                                        className={`${styles.methodBtn} ${paymentMethod === 'BANKING' ? styles.activeMethod : ''}`}
                                        onClick={() => setPaymentMethod('BANKING')}
                                    >
                                        🏦 Chuyển khoản
                                    </button>
                                    <button
                                        className={`${styles.methodBtn} ${paymentMethod === 'CARD' ? styles.activeMethod : ''}`}
                                        onClick={() => setPaymentMethod('CARD')}
                                    >
                                        💳 Thẻ ngân hàng
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowPaymentModal(false)} className={styles.cancelBtn}>Hủy</button>
                            <button
                                onClick={() => handleProcessPayment(selectedOrderForPayment?.id)}
                                className={styles.confirmPaymentBtn}
                                disabled={processingPayment}
                            >
                                {processingPayment ? "Đang xử lý..." : "Xác nhận thanh toán"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillPage;