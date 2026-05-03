import React, { useEffect, useState } from 'react';
import { Grid3x3, Search, Eye, RefreshCw, MapPin, X, ShoppingCart, Check, AlertCircle, Users, Clock, Layers } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function ManagerTableManagement() {
    const [tables, setTables] = useState([]);
    const [orders, setOrders] = useState([]);
    const [filteredTables, setFilteredTables] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterArea, setFilterArea] = useState('all');
    const [selectedTable, setSelectedTable] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showAssignOrderModal, setShowAssignOrderModal] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(null);
    const [pendingOrders, setPendingOrders] = useState([]);

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

    // Fetch all tables
    const fetchTables = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/tables`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể tải danh sách bàn');

            const data = await response.json();
            const branchTables = currentBranch
                ? data.filter(table => table.branch?.id === currentBranch.id)
                : data;
            setTables(branchTables);
            setFilteredTables(branchTables);
        } catch (error) {
            console.error('Lỗi khi tải danh sách bàn:', error);
            alert('Không thể tải danh sách bàn. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch all orders
    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/customer/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể tải đơn hàng');

            const data = await response.json();
            const branchOrders = currentBranch
                ? data.filter(order => order.branch?.id === currentBranch.id)
                : data;
            setOrders(branchOrders);

            // Get pending orders (orders without table assigned)
            const pending = branchOrders.filter(order =>
                !order.table && (order.status === 'PENDING' || order.status === 'CONFIRMED')
            );
            setPendingOrders(pending);
        } catch (error) {
            console.error('Lỗi khi tải đơn hàng:', error);
        }
    };

    useEffect(() => {
        fetchCurrentBranch();
    }, []);

    useEffect(() => {
        if (currentBranch) {
            fetchTables();
            fetchOrders();
        }
    }, [currentBranch]);

    // Filter tables
    useEffect(() => {
        let filtered = tables;

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(table => table.status === filterStatus);
        }

        // Filter by area
        if (filterArea !== 'all') {
            filtered = filtered.filter(table => table.area === filterArea);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(table =>
                table.number?.toString().includes(searchTerm) ||
                table.area?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredTables(filtered);
    }, [tables, filterStatus, filterArea, searchTerm]);

    // Occupy table
    const occupyTable = async (tableId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/customer/tables/${tableId}/occupy`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể mở bàn');

            await fetchTables();
            alert('Đã mở bàn thành công!');
        } catch (error) {
            console.error('Lỗi khi mở bàn:', error);
            alert('Không thể mở bàn. Vui lòng thử lại.');
        }
    };

    // Free table
    const freeTable = async (tableId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/customer/tables/${tableId}/free`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể đóng bàn');

            await fetchTables();
            alert('Đã đóng bàn thành công!');
        } catch (error) {
            console.error('Lỗi khi đóng bàn:', error);
            alert('Không thể đóng bàn. Vui lòng thử lại.');
        }
    };

    // View table detail
    const viewTableDetail = (table) => {
        setSelectedTable(table);
        setShowDetailModal(true);
    };

    // Show assign order modal
    const showAssignOrder = (table) => {
        setSelectedTable(table);
        setShowAssignOrderModal(true);
    };

    // Helper functions
    const getStatusText = (status) => {
        const statusMap = {
            'FREE': 'Trống',
            'OCCUPIED': 'Đang phục vụ',
            'RESERVED': 'Đã đặt'
        };
        return statusMap[status] || status;
    };

    const getStatusStyle = (status) => {
        const styles = {
            'FREE': 'bg-green-100 text-green-800 border-green-300',
            'OCCUPIED': 'bg-red-100 text-red-800 border-red-300',
            'RESERVED': 'bg-yellow-100 text-yellow-800 border-yellow-300'
        };
        return styles[status] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getStatusBadgeClass = (status) => {
        const badgeClasses = {
            'FREE': styles.badgeSuccess,
            'OCCUPIED': styles.badgeDanger,
            'RESERVED': styles.badgeWarning
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

    // Get unique areas
    const areas = [...new Set(tables.map(t => t.area).filter(Boolean))];

    // Get orders for a specific table
    const getTableOrders = (tableId) => {
        return orders.filter(order =>
            order.table?.id === tableId &&
            order.status !== 'PAID' &&
            order.status !== 'CANCELED'
        );
    };

    // Statistics
    const stats = {
        total: tables.length,
        free: tables.filter(t => t.status === 'FREE').length,
        occupied: tables.filter(t => t.status === 'OCCUPIED').length,
        reserved: tables.filter(t => t.status === 'RESERVED').length,
        pendingOrders: pendingOrders.length
    };

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>
                            Quản lý Bàn
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
                        onClick={() => {
                            fetchTables();
                            fetchOrders();
                        }}
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
                            <Grid3x3 size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.total}</div>
                            <div className={styles.statLabel}>Tổng số bàn</div>
                        </div>
                    </div>

                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <Check size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.free}</div>
                            <div className={styles.statLabel}>Bàn trống</div>
                        </div>
                    </div>

                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <Users size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.occupied}</div>
                            <div className={styles.statLabel}>Đang phục vụ</div>
                        </div>
                    </div>

                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.reserved}</div>
                            <div className={styles.statLabel}>Đã đặt</div>
                        </div>
                    </div>

                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.pendingOrders}</div>
                            <div className={styles.statLabel}>Đơn chờ gán</div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Tìm theo số bàn, khu vực..."
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
                            <option value="FREE">Trống</option>
                            <option value="OCCUPIED">Đang phục vụ</option>
                            <option value="RESERVED">Đã đặt</option>
                        </select>

                        <select
                            value={filterArea}
                            onChange={(e) => setFilterArea(e.target.value)}
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
                            <option value="all">Tất cả khu vực</option>
                            {areas.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tables Grid */}
            <div className={styles.tableCard}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '20px' }}>
                    {filteredTables.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
                            <Grid3x3 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                            <p style={{ color: '#666', fontSize: '16px' }}>Không có bàn nào</p>
                        </div>
                    ) : (
                        filteredTables.map((table) => {
                            const tableOrders = getTableOrders(table.id);
                            const totalAmount = tableOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

                            return (
                                <div
                                    key={table.id}
                                    style={{
                                        border: '2px solid',
                                        borderColor: table.status === 'FREE' ? '#10b981' : table.status === 'OCCUPIED' ? '#ef4444' : '#f59e0b',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        backgroundColor: 'white',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    {/* Table Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div>
                                            <div className="table-number">Bàn {table.number}</div>
                                            {table.area && (
                                                <div className="table-area">
                                                    <Layers size={14} />
                                                    {table.area}
                                                </div>
                                            )}
                                        </div>
                                        <span className={getStatusBadgeClass(table.status)}>
                                            {getStatusText(table.status)}
                                        </span>
                                    </div>

                                    {/* Table Info */}
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                        marginBottom: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <Users size={16} style={{ color: '#6b7280' }} />
                                            <span style={{ fontSize: '14px', color: '#374151' }}>
                                                Sức chứa: {table.capacity} người
                                            </span>
                                        </div>

                                        {tableOrders.length > 0 && (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <ShoppingCart size={16} style={{ color: '#6b7280' }} />
                                                    <span style={{ fontSize: '14px', color: '#374151' }}>
                                                        {tableOrders.length} đơn hàng
                                                    </span>
                                                </div>
                                                <div style={{
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    color: '#059669',
                                                    marginTop: '8px',
                                                    paddingTop: '8px',
                                                    borderTop: '1px solid #e5e7eb'
                                                }}>
                                                    {formatPrice(totalAmount)}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => viewTableDetail(table)}
                                            className={styles.actionButtonView}
                                            style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                        >
                                            <Eye size={16} />
                                            Chi tiết
                                        </button>

                                        {table.status === 'FREE' ? (
                                            <button
                                                onClick={() => occupyTable(table.id)}
                                                className={styles.actionButtonSuccess}
                                                style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <Check size={16} />
                                                Mở bàn
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => freeTable(table.id)}
                                                className={styles.actionButtonDanger}
                                                style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <X size={16} />
                                                Đóng bàn
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Table Detail Modal */}
            {showDetailModal && selectedTable && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2 className={styles.modalTitle}>Chi tiết Bàn {selectedTable.number}</h2>
                                <p className={styles.modalSubtitle}>{selectedTable.area}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className={styles.modalCloseButton}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* Table Info */}
                            <div className={styles.orderInfoGrid}>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Số bàn</p>
                                    <p className={styles.infoValue}>{selectedTable.number}</p>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Khu vực</p>
                                    <p className={styles.infoValue}>{selectedTable.area}</p>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Sức chứa</p>
                                    <p className={styles.infoValue}>{selectedTable.capacity} người</p>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Trạng thái</p>
                                    <span className={getStatusBadgeClass(selectedTable.status)}>
                                        {getStatusText(selectedTable.status)}
                                    </span>
                                </div>
                            </div>

                            {/* Orders for this table */}
                            {getTableOrders(selectedTable.id).length > 0 && (
                                <div className={styles.orderItemsSection}>
                                    <h3 className={styles.sectionTitle}>
                                        <ShoppingCart size={20} />
                                        Đơn hàng ({getTableOrders(selectedTable.id).length})
                                    </h3>
                                    <div className={styles.orderItemsList}>
                                        {getTableOrders(selectedTable.id).map((order) => (
                                            <div key={order.id} className={styles.orderItem}>
                                                <div className={styles.orderItemInfo}>
                                                    <div>
                                                        <p className={styles.itemName}>Đơn #{order.id}</p>
                                                        <p className={styles.itemPrice}>
                                                            {order.customerName || 'Khách lẻ'} • {formatDate(order.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p className={styles.itemSubtotal}>{formatPrice(order.totalAmount)}</p>
                                                    <span className={getStatusBadgeClass(order.status)} style={{ fontSize: '12px', padding: '2px 8px' }}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className={styles.modalActions}>
                                {selectedTable.status === 'FREE' ? (
                                    <button
                                        onClick={() => {
                                            occupyTable(selectedTable.id);
                                            setShowDetailModal(false);
                                        }}
                                        className={styles.buttonSuccess}
                                    >
                                        <Check size={20} />
                                        Mở bàn
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            freeTable(selectedTable.id);
                                            setShowDetailModal(false);
                                        }}
                                        className={styles.buttonDanger}
                                    >
                                        <X size={20} />
                                        Đóng bàn
                                    </button>
                                )}
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