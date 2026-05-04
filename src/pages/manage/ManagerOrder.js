import React, { useEffect, useState } from 'react';
import { Search, Eye, Check, X, RefreshCw, Clock, CreditCard, Calendar, User, Package, MapPin, FileText, TrendingUp, Activity } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function ManagerOrderManagement() {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(null);

    const API_BASE_URL = 'http://localhost:8080';

    // Fetch branch info
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
                if (userRes.ok) {
                    const userData = await userRes.json();
                    branchId = userData.branch?.id;
                }
            }

            if (branchId) {
                const branchRes = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (branchRes.ok) {
                    const branchData = await branchRes.json();
                    setCurrentBranch(branchData);
                }
            }
        } catch (error) {
            console.error('Lỗi khi lấy thông tin chi nhánh:', error);
        }
    };

    // Fetch all orders
    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/customer/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể tải đơn hàng');

            const data = await response.json();

            console.log('=================================');
            console.log('📦 All orders from API:', data);
            console.log('📦 Total orders:', data.length);
            console.log('🏢 Current branch:', currentBranch);
            console.log('🏢 Current branch ID:', currentBranch?.id);
            // Log từng order để xem có branch không
            data.forEach((order, index) => {
                console.log(`Order ${index + 1}:`, {
                    id: order.id,
                    branchId: order.branch?.id,
                    branchName: order.branch?.name,
                    hasBranch: !!order.branch
                });
            });
            // Filter by branch if available
            const branchOrders = currentBranch
                ? data.filter(order => {
                    const match = order.branch?.id === currentBranch.id;
                    console.log(`Order #${order.id}: branch.id=${order.branch?.id}, currentBranch.id=${currentBranch.id}, match=${match}`);
                    return match;
                })
                : data;

            console.log('Filtered orders:', branchOrders);
            console.log('Filtered count:', branchOrders.length);
            console.log('=================================');
            setOrders(branchOrders);
            setFilteredOrders(branchOrders);
        } catch (error) {
            console.error('Lỗi khi tải đơn hàng:', error);
            alert('Không thể tải đơn hàng. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentBranch();
    }, []);

    useEffect(() => {
        if (currentBranch) {
            fetchOrders();
        }
    }, [currentBranch]);

    // Filter orders
    useEffect(() => {
        let filtered = orders;

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(order => order.status === filterStatus);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.id.toString().includes(searchTerm) ||
                order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.table?.number?.toString().includes(searchTerm)
            );
        }

        setFilteredOrders(filtered);
    }, [orders, filterStatus, searchTerm]);

    const statusApiMap = {
        CONFIRMED: 'confirm',
        CANCELED: 'cancel',
        COMPLETED: 'complete',
        PREPARING: 'prepare',
        PAID: 'pay'
    };

    // Update order status
    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const apiStatus = statusApiMap[newStatus];
            const response = await fetch(
                `${API_BASE_URL}/api/customer/orders/${orderId}/${apiStatus}`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Cập nhật thất bại');

            await fetchOrders();
            if (selectedOrder?.id === orderId) {
                const updatedOrder = await fetchOrderDetail(orderId);
                setSelectedOrder(updatedOrder);
            }
            alert(`Đơn hàng #${orderId} đã được cập nhật thành ${getStatusText(newStatus)}`);
        } catch (error) {
            console.error('Lỗi khi cập nhật đơn hàng:', error);
            alert('Không thể cập nhật đơn hàng. Vui lòng thử lại.');
        }
    };

    // Fetch order detail
    const fetchOrderDetail = async (orderId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/customer/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể tải chi tiết đơn hàng');
            return await response.json();
        } catch (error) {
            console.error('Lỗi khi tải chi tiết đơn hàng:', error);
            return null;
        }
    };

    // View order detail
    const viewOrderDetail = async (orderId) => {
        const orderDetail = await fetchOrderDetail(orderId);
        if (orderDetail) {
            setSelectedOrder(orderDetail);
            setShowDetailModal(true);
        }
    };

    // Helper functions
    const getStatusText = (status) => {
        const statusMap = {
            'PENDING': 'Chờ xác nhận',
            'CONFIRMED': 'Đã xác nhận',
            'PREPARING': 'Đang chuẩn bị',
            'COMPLETED': 'Hoàn thành',
            'PAID': 'Đã thanh toán',
            'CANCELED': 'Đã hủy'
        };
        return statusMap[status] || status;
    };

    const getStatusBadgeClass = (status) => {
        const badgeClasses = {
            'PENDING': styles.badgeWarning,
            'CONFIRMED': styles.badgeInfo,
            'PREPARING': styles.badgeInfo,
            'COMPLETED': styles.badgeSuccess,
            'PAID': styles.badgeSuccess,
            'CANCELED': styles.badgeDanger
        };
        return badgeClasses[status] || styles.badgeInactive;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    // Statistics
    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
        paid: orders.filter(o => o.status === 'PAID').length,
        revenue: orders
            .filter(o => o.status === 'PAID')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    };

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>
                            Quản lý Đơn hàng
                        </h2>
                        {currentBranch && (
                            <p className={styles.branchInfo}>
                                <MapPin size={16} />
                                <span className={styles.branchName}>{currentBranch.name}</span>
                                {currentBranch.address && (
                                    <span className={styles.branchAddress}>• {currentBranch.address}</span>
                                )}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={fetchOrders}
                        disabled={loading}
                        className={`${styles.refreshButton} ${loading ? styles.refreshButtonDisabled : ''}`}
                    >
                        <RefreshCw size={18} className={loading ? styles.spinIcon : ''} />
                        Làm mới
                    </button>
                </div>

                {/* Statistics Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.refreshButton}>
                        <div className={styles.statIcon}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.total}</div>
                            <div className={styles.statLabel}>Tổng đơn</div>
                        </div>
                    </div>

                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.pending}</div>
                            <div className={styles.statLabel}>Chờ xử lý</div>
                        </div>
                    </div>

                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <Check size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.confirmed}</div>
                            <div className={styles.statLabel}>Đã xác nhận</div>
                        </div>
                    </div>

                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.paid}</div>
                            <div className={styles.statLabel}>Đã thanh toán</div>
                        </div>
                    </div>

                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{(stats.revenue / 1000000).toFixed(1)}M</div>
                            <div className={styles.statLabel}>Doanh thu</div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Tìm theo mã đơn, tên khách, số bàn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.filterControls}>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className={styles.filterSelect}
                            style={{
                                padding: '12px 16px',
                                background: 'rgb(243, 244, 246)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                color: 'var(--color-text-secondary)',
                                fontSize: '14px',
                                cursor: 'pointer',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                minWidth: '150px'
                            }}
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="PENDING">Chờ xác nhận</option>
                            <option value="CONFIRMED">Đã xác nhận</option>
                            <option value="PREPARING">Đang chuẩn bị</option>
                            <option value="COMPLETED">Hoàn thành</option>
                            <option value="PAID">Đã thanh toán</option>
                            <option value="CANCELED">Đã hủy</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className={styles.tableCard}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Bàn</th>
                                <th>Thời gian</th>
                                <th className={styles.textRight}>Tổng tiền</th>
                                <th className={styles.textCenter}>Trạng thái</th>
                                <th className={styles.textCenter}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className={styles.emptyState}>
                                        <Package size={48} className={styles.emptyIcon} />
                                        <p>Không có đơn hàng nào</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td>
                                            <span className={styles.orderId}>#{order.id}</span>
                                        </td>
                                        <td>
                                            <div className={styles.customerCell}>
                                                <User size={16} />
                                                <span>{order.customerName || 'Khách lẻ'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.tableNumber}>Bàn {order.table?.number}</span>
                                            {order.table?.area && (
                                                <span className={styles.tableArea}>({order.table.area})</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles.dateCell}>
                                                <Calendar size={14} />
                                                {formatDate(order.createdAt)}
                                            </div>
                                        </td>
                                        <td className={styles.textRight}>
                                            <span className={styles.priceAmount}>
                                                {formatPrice(order.totalAmount)}
                                            </span>
                                        </td>
                                        <td className={styles.textCenter}>
                                            <span className={getStatusBadgeClass(order.status)}>
                                                {getStatusText(order.status)}
                                            </span>
                                        </td>
                                        <td className={styles.textCenter}>
                                            <div className={styles.actionButtons}>
                                                <button
                                                    onClick={() => viewOrderDetail(order.id)}
                                                    className={styles.actionButtonView}
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                {order.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                                                            className={styles.actionButtonSuccess}
                                                            title="Xác nhận"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => updateOrderStatus(order.id, 'CANCELED')}
                                                            className={styles.actionButtonDanger}
                                                            title="Hủy đơn"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                )}

                                                {order.status === 'CONFIRMED' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, 'CANCELED')}
                                                        className={styles.actionButtonDanger}
                                                        title="Hủy đơn"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Detail Modal */}
            {showDetailModal && selectedOrder && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        {/* Modal Header */}
                        <div className={styles.modalHeader}>
                            <div>
                                <h2 className={styles.modalTitle}>Chi tiết đơn hàng #{selectedOrder.id}</h2>
                                <p className={styles.modalSubtitle}>{formatDate(selectedOrder.createdAt)}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className={styles.modalCloseButton}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className={styles.modalBody}>
                            {/* Order Info */}
                            <div className={styles.orderInfoGrid}>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Khách hàng</p>
                                    <p className={styles.infoValue}>{selectedOrder.customerName || 'Khách lẻ'}</p>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Bàn</p>
                                    <p className={styles.infoValue}>
                                        Bàn {selectedOrder.table?.number} - {selectedOrder.table?.area}
                                    </p>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Trạng thái</p>
                                    <span className={getStatusBadgeClass(selectedOrder.status)}>
                                        {getStatusText(selectedOrder.status)}
                                    </span>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Nhân viên</p>
                                    <p className={styles.infoValue}>{selectedOrder.employee?.name || '-'}</p>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className={styles.orderItemsSection}>
                                <h3 className={styles.sectionTitle}>
                                    <FileText size={20} />
                                    Món đã gọi ({selectedOrder.items?.length || 0})
                                </h3>
                                <div className={styles.orderItemsList}>
                                    {selectedOrder.items?.map((item, index) => (
                                        <div key={index} className={styles.orderItem}>
                                            <div className={styles.orderItemInfo}>
                                                <span className={styles.itemQuantity}>{item.quantity}x</span>
                                                <div>
                                                    <p className={styles.itemName}>{item.product?.name}</p>
                                                    <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
                                                </div>
                                            </div>
                                            <p className={styles.itemSubtotal}>{formatPrice(item.subtotal)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedOrder.notes && (
                                <div className={styles.notesSection}>
                                    <p className={styles.notesLabel}>Ghi chú:</p>
                                    <p className={styles.notesContent}>{selectedOrder.notes}</p>
                                </div>
                            )}

                            {/* Total */}
                            <div className={styles.orderTotal}>
                                <div className={styles.totalRow}>
                                    <span className={styles.totalLabel}>Tổng cộng:</span>
                                    <span className={styles.totalAmount}>
                                        {formatPrice(selectedOrder.totalAmount)}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                <div className={styles.modalActions}>
                                    {selectedOrder.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    updateOrderStatus(selectedOrder.id, 'CONFIRMED');
                                                    setShowDetailModal(false);
                                                }}
                                                className={styles.buttonSuccess}
                                            >
                                                <Check size={20} />
                                                Xác nhận đơn
                                            </button>
                                            <button
                                                onClick={() => {
                                                    updateOrderStatus(selectedOrder.id, 'CANCELED');
                                                    setShowDetailModal(false);
                                                }}
                                                className={styles.buttonDanger}
                                            >
                                                <X size={20} />
                                                Hủy đơn
                                            </button>
                                        </>
                                    )}

                                    {selectedOrder.status === 'CONFIRMED' && (
                                        <button
                                            onClick={() => {
                                                updateOrderStatus(selectedOrder.id, 'CANCELED');
                                                setShowDetailModal(false);
                                            }}
                                            className={styles.buttonDangerFull}
                                        >
                                            <X size={20} />
                                            Hủy đơn
                                        </button>
                                    )}
                                </div>
                            </div>
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