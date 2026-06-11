// pages/employee/cashier/BillPage.js
import React, { useState, useEffect, useCallback } from "react";
import {
    Search, Filter, Eye, Calendar, ChevronLeft, ChevronRight,
    DollarSign, Download, RefreshCw
} from "lucide-react";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import styles from "./BillPage.module.css";

// ========== Hàm bỏ dấu tiếng Việt ==========
const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');
    str = str.replace(/[^a-zA-Z0-9\s.,!?\-_()/]/g, '');
    return str.trim();
};

const formatCurrencyPDF = (amount) => {
    if (!amount) return "0d";
    return Number(amount).toLocaleString('vi-VN') + 'd';
};

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
    const [entityInfo, setEntityInfo] = useState({});
    const itemsPerPage = 10;

    // ===== FETCH ENTITY INFO (TÊN BÀN/PHÒNG VÀ PHÍ PHÒNG) =====
    const fetchEntityInfo = useCallback(async (billId, orderId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/customer/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const orderDetail = await response.json();
                const entityName = orderDetail.table?.number
                    ? `Bàn ${orderDetail.table.number}`
                    : orderDetail.room?.number
                        ? `Phòng ${orderDetail.room.number}`
                        : '--';
                const roomFee = orderDetail.room?.roomFee || 0;

                setEntityInfo(prev => ({
                    ...prev,
                    [billId]: { name: entityName, roomFee: roomFee }
                }));
            }
        } catch (error) {
            console.error("Error fetching entity info:", error);
        }
    }, []);

    // ===== FETCH BILLS =====
    const fetchBills = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/employee/bills`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                let allBills = await response.json();

                if (filter.status !== 'all') {
                    allBills = allBills.filter(bill => bill.paymentStatus === filter.status.toUpperCase());
                }
                if (filter.search) {
                    const searchLower = filter.search.toLowerCase();
                    allBills = allBills.filter(bill =>
                        bill.id?.toString().includes(searchLower) ||
                        bill.order?.id?.toString().includes(searchLower)
                    );
                }
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

                allBills.sort((a, b) => b.id - a.id);

                setTotalPages(Math.ceil(allBills.length / itemsPerPage));
                const start = (currentPage - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedBills = allBills.slice(start, end);
                setBills(paginatedBills);

                for (const bill of paginatedBills) {
                    if (bill.order?.id && !entityInfo[bill.id]) {
                        fetchEntityInfo(bill.id, bill.order.id);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching bills:", error);
        } finally {
            setLoading(false);
        }
    }, [filter.status, filter.search, filter.startDate, filter.endDate, currentPage, entityInfo, fetchEntityInfo]);

    useEffect(() => {
        fetchBills();
    }, [fetchBills]);

    // ===== FETCH ORDER DETAIL =====
    const fetchOrderDetail = useCallback(async (orderId) => {
        setLoadingDetail(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/customer/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error("Error fetching order detail:", error);
        } finally {
            setLoadingDetail(false);
        }
        return null;
    }, []);

    // ===== HANDLE VIEW DETAIL =====
    const handleViewDetail = useCallback(async (bill) => {
        setSelectedBill(bill);
        setSelectedOrderDetail(null);
        setShowDetailModal(true);

        if (bill.order?.id) {
            let orderDetail = await fetchOrderDetail(bill.order.id);
            if (orderDetail) {
                const roomFee = entityInfo[bill.id]?.roomFee || orderDetail.room?.roomFee || 0;

                // Thêm phí phòng vào danh sách món nếu có
                if (roomFee > 0) {
                    orderDetail = {
                        ...orderDetail,
                        items: [
                            ...(orderDetail.items || []),
                            {
                                foodName: '🏠 Phí phòng VIP',
                                name: 'Phí phòng VIP',
                                quantity: 1,
                                price: roomFee,
                                subtotal: roomFee,
                                isRoomFee: true
                            }
                        ]
                    };
                }
                setSelectedOrderDetail(orderDetail);
            }
        }
    }, [fetchOrderDetail, entityInfo]);

    // ===== HANDLE PROCESS PAYMENT =====
    const handleProcessPayment = useCallback(async (orderId) => {
        setProcessingPayment(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `/api/customer/orders/${orderId}/pay?paymentMethod=${paymentMethod}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.ok) {
                alert("Thanh toán thành công!");
                setShowPaymentModal(false);
                setSelectedOrderForPayment(null);
                fetchBills();
            } else {
                const error = await response.json();
                alert(error.message || "Thanh toán thất bại");
            }
        } catch (error) {
            console.error("Error processing payment:", error);
            alert("Có lỗi xảy ra khi thanh toán");
        } finally {
            setProcessingPayment(false);
        }
    }, [paymentMethod, fetchBills]);

    // ========== XUẤT PDF ==========
    const handleExportBill = useCallback(async (billId) => {
        try {
            const bill = bills.find(b => b.id === billId);
            if (!bill) {
                alert('Không tìm thấy hóa đơn');
                return;
            }

            let orderDetail = null;
            if (bill.order?.id) {
                orderDetail = await fetchOrderDetail(bill.order.id);
                if (orderDetail) {
                    const roomFee = entityInfo[bill.id]?.roomFee || orderDetail.room?.roomFee || 0;
                    if (roomFee > 0) {
                        orderDetail.items = [
                            ...(orderDetail.items || []),
                            {
                                foodName: 'Phí phòng VIP',
                                name: 'Phí phòng VIP',
                                quantity: 1,
                                price: roomFee,
                                isRoomFee: true
                            }
                        ];
                    }
                }
            }

            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('HOA DON THANH TOAN', pageWidth / 2, 20, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.setDrawColor(67, 97, 238);
            doc.line(14, 25, pageWidth - 14, 25);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            const userStr = localStorage.getItem('user') || '{}';
            const userData = JSON.parse(userStr);
            const branchName = userData?.branchName || '';
            doc.text(removeVietnameseTones(branchName), pageWidth / 2, 30, { align: 'center' });
            doc.text('Dia chi: ' + removeVietnameseTones(userData?.branch?.address || ''), pageWidth / 2, 35, { align: 'center' });

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);

            const leftX = 14;
            const rightCol = 110;
            let y = 44;
            const lh = 7;

            doc.setFont('helvetica', 'bold');
            doc.text('Ma hoa don:', leftX, y);
            doc.text('Ma don hang:', leftX, y + lh);
            doc.text('Ban/Phong:', leftX, y + lh * 2);
            doc.text('Khach hang:', leftX, y + lh * 3);

            doc.setFont('helvetica', 'normal');
            doc.text(`#${bill.id}`, leftX + 30, y);
            doc.text(`#${bill.order?.id || '--'}`, leftX + 30, y + lh);
            doc.text(removeVietnameseTones(entityInfo[bill.id]?.name || '--'), leftX + 30, y + lh * 2);
            doc.text(removeVietnameseTones(orderDetail?.customerName || 'Khach le'), leftX + 30, y + lh * 3);

            doc.setFont('helvetica', 'bold');
            doc.text('Ngay xuat:', rightCol, y);
            doc.text('Phuong thuc:', rightCol, y + lh);
            doc.text('Trang thai:', rightCol, y + lh * 2);
            doc.text('Thu ngan:', rightCol, y + lh * 3);

            doc.setFont('helvetica', 'normal');
            doc.text(formatDateTime(bill.createdAt), rightCol + 28, y);
            doc.text(removeVietnameseTones(getPaymentMethodText(bill.paymentMethod)), rightCol + 28, y + lh);
            doc.text(bill.paymentStatus === 'PAID' ? 'Da thanh toan' : 'Cho thanh toan', rightCol + 28, y + lh * 2);
            doc.text(removeVietnameseTones(userData?.fullName || ''), rightCol + 28, y + lh * 3);

            y = y + lh * 4 + 2;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, y, pageWidth - 14, y);

            y += 8;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(67, 97, 238);
            doc.text('CHI TIET DON HANG', leftX, y);

            if (orderDetail?.items && orderDetail.items.length > 0) {
                const tableData = orderDetail.items.map((item, idx) => [
                    (idx + 1).toString(),
                    removeVietnameseTones(item.foodName || item.name || `Mon ${item.foodId}`),
                    (item.quantity || 1).toString(),
                    formatCurrencyPDF(item.price),
                    formatCurrencyPDF((item.price || 0) * (item.quantity || 1))
                ]);

                tableData.push(['', '', '', 'TONG CONG:', formatCurrencyPDF(bill.totalAmount)]);

                doc.autoTable({
                    startY: y + 4,
                    head: [['STT', 'Ten mon', 'SL', 'Don gia', 'Thanh tien']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: {
                        fillColor: [67, 97, 238],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        fontSize: 10,
                        halign: 'center'
                    },
                    bodyStyles: { fontSize: 10, textColor: [50, 50, 50] },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'center' },
                        1: { cellWidth: 70 },
                        2: { cellWidth: 12, halign: 'center' },
                        3: { cellWidth: 35, halign: 'right' },
                        4: { cellWidth: 40, halign: 'right' }
                    },
                    styles: { cellPadding: 3, overflow: 'linebreak' },
                    alternateRowStyles: { fillColor: [245, 247, 250] }
                });

                const finalY = doc.lastAutoTable.finalY + 10;
                doc.setDrawColor(67, 97, 238);
                doc.setLineWidth(0.8);
                doc.line(120, finalY - 4, pageWidth - 14, finalY - 4);
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(220, 50, 50);
                doc.text('TONG CONG: ' + formatCurrencyPDF(bill.totalAmount), pageWidth - 14, finalY + 4, { align: 'right' });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100, 100, 100);
                doc.text('Cam on quy khach da su dung dich vu!', pageWidth / 2, finalY + 20, { align: 'center' });
                doc.text('Hen gap lai quy khach lan sau.', pageWidth / 2, finalY + 26, { align: 'center' });
                doc.setFontSize(7);
                doc.text('Bill #' + bill.id + ' - ' + new Date().toISOString().split('T')[0], pageWidth / 2, finalY + 34, { align: 'center' });
            } else {
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text('Khong co mon an nao.', leftX, y + 10);
            }

            doc.save(`HoaDon_${bill.id}.pdf`);
        } catch (error) {
            console.error('PDF Error:', error);
            alert('Loi xuat hoa don: ' + error.message);
        }
    }, [bills, entityInfo, fetchOrderDetail]);

    // ========== HELPERS ==========
    const formatCurrency = (amount) => {
        if (!amount) return "0đ";
        return Number(amount).toLocaleString('vi-VN') + 'đ';
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "--:--";
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: '2-digit', year: 'numeric'
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
        };
        return methods[method] || method;
    };

    const getPaymentMethodText = (method) => {
        const methods = {
            'CASH': 'Tien mat',
            'MOMO': 'Vi MoMo',
            'MOBILE': 'Vi dien tu',
            'BANKING': 'Chuyen khoan',
        };
        return methods[method] || method || 'Khong xac dinh';
    };

    const getDisplayOrder = () => {
        if (selectedOrderDetail) return selectedOrderDetail;
        if (selectedBill?.order) return selectedBill.order;
        return null;
    };

    const displayOrder = getDisplayOrder();

    // ========== RENDER ==========
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Quản lý hóa đơn</h2>
                <button onClick={() => fetchBills()} className={styles.refreshBtn}>
                    <RefreshCw size={16} /> Làm mới
                </button>
            </div>

            <div className={styles.filterSection}>
                <div className={styles.filterRow}>
                    <div className={styles.filterGroup}>
                        <label><Search size={14} /> Tìm kiếm</label>
                        <input type="text" placeholder="Mã HD, mã đơn..." value={filter.search}
                            onChange={(e) => setFilter({ ...filter, search: e.target.value, currentPage: 1 })}
                            className={styles.searchInput} />
                    </div>
                    <div className={styles.filterGroup}>
                        <label><Filter size={14} /> Trạng thái</label>
                        <select value={filter.status}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value, currentPage: 1 })}
                            className={styles.selectInput}>
                            <option value="all">Tất cả</option>
                            <option value="PAID">Đã thanh toán</option>
                            <option value="PENDING">Chờ thanh toán</option>
                            <option value="CANCELLED">Đã hủy</option>
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label><Calendar size={14} /> Từ ngày</label>
                        <input type="date" value={filter.startDate}
                            onChange={(e) => setFilter({ ...filter, startDate: e.target.value, currentPage: 1 })}
                            className={styles.dateInput} />
                    </div>
                    <div className={styles.filterGroup}>
                        <label><Calendar size={14} /> Đến ngày</label>
                        <input type="date" value={filter.endDate}
                            onChange={(e) => setFilter({ ...filter, endDate: e.target.value, currentPage: 1 })}
                            className={styles.dateInput} />
                    </div>
                </div>
            </div>

            <div className={styles.summaryStats}>
                <div className={styles.statCard}><div className={styles.statLabel}>Tổng hóa đơn</div><div className={styles.statValue}>{bills.length}</div></div>
                <div className={styles.statCard}><div className={styles.statLabel}>Đã thanh toán</div><div className={styles.statValue}>{bills.filter(b => b.paymentStatus === 'PAID').length}</div></div>
                <div className={styles.statCard}><div className={styles.statLabel}>Chờ thanh toán</div><div className={styles.statValue}>{bills.filter(b => b.paymentStatus === 'PENDING').length}</div></div>
                <div className={styles.statCard}><div className={styles.statLabel}>Tổng doanh thu</div><div className={styles.statValue}>{formatCurrency(bills.filter(b => b.paymentStatus === 'PAID').reduce((sum, b) => sum + (b.totalAmount || 0), 0))}</div></div>
            </div>

            <div className={styles.tableWrapper}>
                {loading ? <div className={styles.loading}>Đang tải...</div> : (
                    <table className={styles.table}>
                        <thead>
                            <tr><th>Mã HD</th><th>Mã đơn</th><th>Bàn/Phòng</th><th>Thời gian</th><th>Tổng tiền</th><th>Phương thức</th><th>Trạng thái</th><th>Thao tác</th></tr>
                        </thead>
                        <tbody>
                            {bills.length === 0 ? (
                                <tr><td colSpan="8" className={styles.noData}>Không có dữ liệu</td></tr>
                            ) : bills.map((bill) => (
                                <tr key={bill.id}>
                                    <td><span className={styles.orderId}>#{bill.id}</span></td>
                                    <td>#{bill.order?.id || '--'}</td>
                                    <td>{entityInfo[bill.id]?.name || '...'}</td>
                                    <td>{formatDateTime(bill.createdAt)}</td>
                                    <td><span className={styles.amount}>{formatCurrency(bill.totalAmount)}</span></td>
                                    <td>{getPaymentMethodLabel(bill.paymentMethod)}</td>
                                    <td>{getStatusBadge(bill.paymentStatus)}</td>
                                    <td>
                                        <button onClick={() => handleViewDetail(bill)} className={styles.viewBtn}><Eye size={14} /> Chi tiết</button>
                                        {bill.paymentStatus === 'PAID' && (
                                            <button onClick={() => handleExportBill(bill.id)} className={styles.printBtn}><Download size={14} /> PDF</button>
                                        )}
                                        {bill.paymentStatus === 'PENDING' && (
                                            <button onClick={() => { setSelectedOrderForPayment(bill.order); setShowPaymentModal(true); }} className={styles.paymentBtn}><DollarSign size={14} /> TT</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={styles.pageBtn}><ChevronLeft size={18} /></button>
                    <span className={styles.pageInfo}>Trang {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={styles.pageBtn}><ChevronRight size={18} /></button>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedBill && (
                <div className={styles.modalOverlay} onClick={() => { setShowDetailModal(false); setSelectedOrderDetail(null); }}>
                    <div className={styles.modalLg} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Chi tiết hóa đơn #{selectedBill.id}</h3>
                            <button onClick={() => { setShowDetailModal(false); setSelectedOrderDetail(null); }} className={styles.closeBtn}>✕</button>
                        </div>
                        <div className={styles.orderDetail}>
                            {loadingDetail ? <div className={styles.loading}>Đang tải...</div> : (
                                <>
                                    <div className={styles.infoGrid}>
                                        <div className={styles.infoRow}><span>Mã hóa đơn:</span><strong>#{selectedBill.id}</strong></div>
                                        <div className={styles.infoRow}><span>Mã đơn hàng:</span><strong>#{displayOrder?.id || '--'}</strong></div>
                                        <div className={styles.infoRow}><span>Bàn/Phòng:</span><strong>{displayOrder?.table?.number ? `Bàn ${displayOrder.table.number}` : displayOrder?.room?.number ? `Phòng ${displayOrder.room.number}` : entityInfo[selectedBill.id]?.name || '--'}</strong></div>
                                        <div className={styles.infoRow}><span>Khách hàng:</span><strong>{displayOrder?.customerName || 'Khách lẻ'}</strong></div>
                                        <div className={styles.infoRow}><span>Thời gian:</span><strong>{formatDateTime(selectedBill.createdAt)}</strong></div>
                                        <div className={styles.infoRow}><span>Phương thức:</span><strong>{getPaymentMethodLabel(selectedBill.paymentMethod)}</strong></div>
                                        <div className={styles.infoRow}><span>Trạng thái:</span><strong>{selectedBill.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}</strong></div>
                                    </div>
                                    <div className={styles.divider}></div>
                                    <div className={styles.itemsList}>
                                        <h4>📋 Danh sách món:</h4>
                                        {displayOrder?.items?.length > 0 ? (
                                            <table className={styles.itemsTable}>
                                                <thead><tr><th>Tên món</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                                                <tbody>
                                                    {displayOrder.items.map((item, idx) => (
                                                        <tr key={idx} className={item.isRoomFee ? styles.roomFeeRow : ''}>
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
                                        ) : <div className={styles.noItems}>Không có món ăn</div>}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => { setShowDetailModal(false); setSelectedOrderDetail(null); }} className={styles.closeModalBtn}>Đóng</button>
                            {selectedBill.paymentStatus === 'PAID' && (
                                <button onClick={() => handleExportBill(selectedBill.id)} className={styles.printBtnLarge}><Download size={16} /> Xuất PDF</button>
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
                            <div className={styles.infoRow}><span>Mã đơn:</span><strong>#{selectedOrderForPayment?.id}</strong></div>
                            <div className={styles.infoRow}><span>Bàn/Phòng:</span><strong>{selectedOrderForPayment?.table?.number ? `Bàn ${selectedOrderForPayment.table.number}` : selectedOrderForPayment?.room?.number ? `Phòng ${selectedOrderForPayment.room.number}` : '--'}</strong></div>
                            <div className={styles.totalRow}><span>Tổng tiền:</span><strong className={styles.totalAmount}>{formatCurrency(selectedOrderForPayment?.totalAmount)}</strong></div>
                            <div className={styles.divider}></div>
                            <div className={styles.paymentMethodSection}>
                                <label>Chọn phương thức:</label>
                                <div className={styles.paymentMethods}>
                                    {['CASH', 'MOMO', 'BANKING'].map(m => (
                                        <button key={m} className={`${styles.methodBtn} ${paymentMethod === m ? styles.activeMethod : ''}`} onClick={() => setPaymentMethod(m)}>
                                            {m === 'CASH' ? '💵 Tiền mặt' : m === 'MOMO' ? '📱 MoMo' : '🏦 Chuyển khoản'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowPaymentModal(false)} className={styles.cancelBtn}>Hủy</button>
                            <button onClick={() => handleProcessPayment(selectedOrderForPayment?.id)} className={styles.confirmPaymentBtn} disabled={processingPayment}>
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