import React, { useEffect, useState } from 'react';
import { Calendar, Search, Clock, Users, Phone, Mail, CheckCircle, XCircle, RefreshCw, Store, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function BranchReservationManager() {
    const [reservations, setReservations] = useState([]);
    const [tables, setTables] = useState([]);
    const [currentBranch, setCurrentBranch] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDate, setFilterDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [expandedReservation, setExpandedReservation] = useState(null);

    // Modal gán bàn
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [selectedTableId, setSelectedTableId] = useState('');

    const API_BASE_URL = 'http://localhost:8080';

    // Lấy thông tin chi nhánh hiện tại
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
                if (branchId) {
                    localStorage.setItem('user', JSON.stringify({
                        ...user,
                        branchId,
                        branch: userData.branch
                    }));
                }
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

    // Lấy danh sách đặt bàn
    const fetchReservations = async () => {
        if (!currentBranch?.id) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/reservations/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể tải danh sách đặt bàn');
            const data = await response.json();
            // Lọc theo chi nhánh
            const branchReservations = data.filter(r => r.branch?.id === currentBranch.id);
            setReservations(branchReservations);
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Không thể tải danh sách đặt bàn.');
        } finally {
            setLoading(false);
        }
    };

    // Lấy danh sách bàn
    const fetchTables = async () => {
        if (!currentBranch?.id) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/tables`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể tải danh sách bàn');
            const data = await response.json();
            // Lọc theo chi nhánh
            const branchTables = data.filter(t => t.branch?.id === currentBranch.id);
            setTables(branchTables);
        } catch (error) {
            console.error('Lỗi:', error);
        }
    };

    useEffect(() => {
        fetchCurrentBranch();
    }, []);

    useEffect(() => {
        if (currentBranch) {
            fetchReservations();
            fetchTables();
        }
    }, [currentBranch]);

    // Cập nhật trạng thái đặt bàn
    const updateReservationStatus = async (reservationId, status) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/reservations/${reservationId}/status?status=${status}`,
                {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (!response.ok) throw new Error('Cập nhật thất bại');
            alert(`${status === 'CONFIRMED' ? 'Xác nhận' : 'Hủy'} đặt bàn thành công!`);
            fetchReservations();
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Không thể cập nhật trạng thái.');
        } finally {
            setLoading(false);
        }
    };

    // Gán bàn
    const handleAssignTable = async () => {
        if (!selectedTableId) {
            alert('Vui lòng chọn bàn!');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // Cập nhật reservation với table
            const updateRes = await fetch(
                `${API_BASE_URL}/api/reservations/${selectedReservation.id}/status?status=CONFIRMED`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!updateRes.ok) throw new Error('Gán bàn thất bại');

            // Đổi trạng thái bàn sang RESERVED
            await fetch(`${API_BASE_URL}/api/customer/tables/${selectedTableId}/occupy`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('Gán bàn thành công!');
            setShowAssignModal(false);
            setSelectedReservation(null);
            setSelectedTableId('');
            fetchReservations();
            fetchTables();
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Không thể gán bàn.');
        } finally {
            setLoading(false);
        }
    };

    // Lọc reservations
    const filteredReservations = reservations.filter(res => {
        const matchesSearch =
            res.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.phone?.includes(searchTerm) ||
            res.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' ? true : res.status === filterStatus;

        const matchesDate = !filterDate ? true :
            new Date(res.reservationTime).toISOString().split('T')[0] === filterDate;

        return matchesSearch && matchesStatus && matchesDate;
    });

    const getToday = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    useEffect(() => {
        setFilterDate(getToday());
    }, []);

    // Thống kê
    const stats = {
        pending: reservations.filter(r => r.status === 'PENDING').length,
        confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
        cancelled: reservations.filter(r => r.status === 'CANCELLED').length,
        total: reservations.length
    };

    // Bàn trống
    const availableTables = tables.filter(t => t.status === 'FREE');

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
                        <h2 className={styles.pageTitle}>Quản lý Đặt bàn</h2>
                        <p className={styles.branchInfo}>
                            <Store size={16} />
                            <span className={styles.branchName}>{currentBranch.name}</span>
                            {currentBranch.address && (
                                <span className={styles.branchAddress}>• {currentBranch.address}</span>
                            )}
                        </p>
                    </div>

                    <button
                        onClick={fetchReservations}
                        disabled={loading}
                        className={`${styles.refreshButton} ${loading ? styles.refreshButtonDisabled : ''}`}
                    >
                        <RefreshCw size={18} className={loading ? styles.spinIcon : ''} />
                        Làm mới
                    </button>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.pending}</div>
                            <div className={styles.statLabel}>Chờ xác nhận</div>
                        </div>
                    </div>

                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.confirmed}</div>
                            <div className={styles.statLabel}>Đã xác nhận</div>
                        </div>
                    </div>

                    <div className={styles.statCardDanger}>
                        <div className={styles.statIcon}>
                            <XCircle size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.cancelled}</div>
                            <div className={styles.statLabel}>Đã hủy</div>
                        </div>
                    </div>

                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <MapPin size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{availableTables.length}</div>
                            <div className={styles.statLabel}>Bàn trống</div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, SĐT, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className={styles.filterSelect}
                            style={{ width: '180px', background: 'rgb(243, 244, 246)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                        />

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
                            <option value="CANCELLED">Đã hủy</option>
                            <option value="COMPLETED">Hoàn thành</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Reservations List */}
            <div style={{ marginTop: '16px' }}>
                {filteredReservations.length === 0 ? (
                    <div className={styles.tableCard}>
                        <div className={styles.emptyState} style={{ padding: '60px 20px' }}>
                            <Calendar size={48} className={styles.emptyIcon} />
                            <p>Không tìm thấy đặt bàn nào</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {filteredReservations.map((reservation) => {
                            const isExpanded = expandedReservation === reservation.id;
                            const reservationDate = new Date(reservation.reservationTime);

                            return (
                                <div key={reservation.id} className={styles.tableCard}>
                                    <div
                                        style={{
                                            padding: '20px',
                                            cursor: 'pointer',
                                            borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none'
                                        }}
                                        onClick={() => setExpandedReservation(isExpanded ? null : reservation.id)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                                                        {reservation.customerName}
                                                    </h3>
                                                    <span className={
                                                        reservation.status === 'PENDING' ? styles.badgePending :
                                                            reservation.status === 'CONFIRMED' ? styles.badgeSuccess :
                                                                reservation.status === 'CANCELLED' ? styles.badgeDanger :
                                                                    styles.badgeWarning
                                                    }>
                                                        {reservation.status === 'PENDING' ? 'Chờ xác nhận' :
                                                            reservation.status === 'CONFIRMED' ? 'Đã xác nhận' :
                                                                reservation.status === 'CANCELLED' ? 'Đã hủy' : 'Hoàn thành'}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Phone size={16} />
                                                        {reservation.phone}
                                                    </div>
                                                    {reservation.email && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Mail size={16} />
                                                            {reservation.email}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Calendar size={16} />
                                                        {reservationDate.toLocaleDateString('vi-VN')} {reservationDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Users size={16} />
                                                        {reservation.guestCount} người
                                                    </div>
                                                    {reservation.table && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <MapPin size={16} />
                                                            Bàn {reservation.table.number} - {reservation.table.area}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '20px', backgroundColor: 'var(--color-background-secondary)' }}>
                                            {reservation.notes && (
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ fontSize: '14px' }}>Ghi chú:</strong>
                                                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                                        {reservation.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {reservation.status === 'PENDING' && (
                                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => updateReservationStatus(reservation.id, 'CANCELLED')}
                                                        className={styles.dangerButton}
                                                        disabled={loading}
                                                    >
                                                        <XCircle size={18} />
                                                        Hủy đặt bàn
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedReservation(reservation);
                                                            setShowAssignModal(true);
                                                        }}
                                                        className={styles.successButton}
                                                        disabled={loading}
                                                    >
                                                        <CheckCircle size={18} />
                                                        Xác nhận & Gán bàn
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Gán bàn */}
            {showAssignModal && selectedReservation && (
                <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                <MapPin size={24} />
                                Gán bàn cho {selectedReservation.customerName}
                            </h3>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--color-background-secondary)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                    <div><strong>Số người:</strong> {selectedReservation.guestCount}</div>
                                    <div><strong>Thời gian:</strong> {new Date(selectedReservation.reservationTime).toLocaleString('vi-VN')}</div>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Chọn bàn *</label>
                                <select
                                    value={selectedTableId}
                                    onChange={(e) => setSelectedTableId(e.target.value)}
                                    className={styles.formInput}
                                >
                                    <option value="">-- Chọn bàn --</option>
                                    {tables
                                        .filter(t => t.status === 'FREE' && t.capacity >= selectedReservation.guestCount)
                                        .map(table => (
                                            <option key={table.id} value={table.id}>
                                                Bàn {table.number} - {table.area} (Sức chứa: {table.capacity})
                                            </option>
                                        ))}
                                </select>
                                {availableTables.length === 0 && (
                                    <small style={{ color: 'var(--color-danger)', fontSize: '12px' }}>
                                        Không có bàn trống phù hợp
                                    </small>
                                )}
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className={styles.secondaryButton}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAssignTable}
                                className={styles.successButton}
                                disabled={loading || !selectedTableId}
                            >
                                <CheckCircle size={18} />
                                {loading ? 'Đang xử lý...' : 'Xác nhận'}
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
                        <p>Đang xử lý...</p>
                    </div>
                </div>
            )}
        </div>
    );
}