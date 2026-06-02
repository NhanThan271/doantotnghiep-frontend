import React, { useEffect, useState } from 'react';
import { Calendar, Search, Clock, Users, Phone, Mail, CheckCircle, XCircle, RefreshCw, Store, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function BranchReservationManager() {
    const [reservations, setReservations] = useState([]);
    const [tables, setTables] = useState([]);
    const [currentBranch, setCurrentBranch] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
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
            const branchReservations = data.filter(r => r.branchName === currentBranch.name);
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

        return matchesSearch && matchesStatus;
    });

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
            {filteredReservations.map((reservation) => {
                const isExpanded = expandedReservation === reservation.id;
                const reservationDate = new Date(reservation.checkInTime);

                return (
                    <div key={reservation.id} className={styles.tableCard}
                        style={{ marginBottom: 0, transition: 'box-shadow 0.2s' }}>

                        {/* ── HEADER CARD ── */}
                        <div
                            onClick={() => setExpandedReservation(isExpanded ? null : reservation.id)}
                            style={{
                                padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                                borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none'
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #E07B39, #B85C1E)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 17, color: '#fff'
                            }}>
                                {reservation.customerName?.[0]?.toUpperCase() || '?'}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Tên + badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                                        {reservation.customerName}
                                    </span>
                                    <span className={
                                        reservation.status === 'PENDING' ? styles.badgePending :
                                            reservation.status === 'CONFIRMED' ? styles.badgeSuccess :
                                                reservation.status === 'CANCELLED' ? styles.badgeDanger :
                                                    styles.badgeWarning
                                    }>
                                        {reservation.status === 'PENDING' ? 'Chờ xác nhận' :
                                            reservation.status === 'CONFIRMED' ? '✓ Đã xác nhận' :
                                                reservation.status === 'CANCELLED' ? '✕ Đã hủy' : 'Hoàn thành'}
                                    </span>
                                </div>

                                {/* Info row */}
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                    {reservation.phone && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                            <Phone size={13} /> {reservation.phone}
                                        </span>
                                    )}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                        <Calendar size={13} />
                                        {reservationDate.toLocaleDateString('vi-VN')} {reservationDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {reservation.guestCount && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                            <Users size={13} /> {reservation.guestCount} người
                                        </span>
                                    )}
                                    {reservation.tableNumber && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                            <MapPin size={13} /> Bàn {reservation.tableNumber}
                                        </span>
                                    )}
                                    {reservation.roomNumber && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                            <MapPin size={13} /> Phòng {reservation.roomNumber}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                        </div>

                        {/* ── EXPANDED ── */}
                        {isExpanded && (
                            <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.05)' }}>
                                {reservation.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                                        <Mail size={14} /> {reservation.email}
                                    </div>
                                )}
                                {reservation.notes && (
                                    <div style={{ padding: '10px 14px', background: 'rgba(224,123,57,0.08)', borderLeft: '3px solid #E07B39', borderRadius: 6, fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                                        <strong>Ghi chú:</strong> {reservation.notes}
                                    </div>
                                )}
                                {reservation.status === 'PENDING' && (
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updateReservationStatus(reservation.id, 'CANCELLED'); }}
                                            className={styles.buttonDanger}
                                            disabled={loading}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                        >
                                            <XCircle size={16} /> Hủy đặt bàn
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedReservation(reservation); setShowAssignModal(true); }}
                                            className={styles.buttonSuccess}
                                            disabled={loading}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                        >
                                            <CheckCircle size={16} /> Xác nhận & Gán bàn
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Modal Gán bàn */}
            {showAssignModal && selectedReservation && (
                <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: 16, padding: 28,
                        width: '100%', maxWidth: 420,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                                Gán bàn cho khách
                            </h3>
                            <button onClick={() => setShowAssignModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>✕</button>
                        </div>

                        {/* Thông tin khách */}
                        <div style={{ background: '#fef3c7', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid #fcd34d' }}>
                            <div style={{ fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{selectedReservation.customerName}</div>
                            <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', gap: 16 }}>
                                <span><Users size={12} style={{ verticalAlign: 'middle' }} /> {selectedReservation.guestCount} người</span>
                                <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> {new Date(selectedReservation.checkInTime).toLocaleString('vi-VN')}</span>
                            </div>
                        </div>

                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Chọn bàn *</label>
                        <select
                            value={selectedTableId}
                            onChange={e => setSelectedTableId(e.target.value)}
                            style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, marginBottom: 6, background: '#f9fafb', color: '#1f2937', outline: 'none', boxSizing: 'border-box' }}
                        >
                            <option value="">-- Chọn bàn trống --</option>
                            {tables.filter(t => t.status === 'FREE' && t.capacity >= selectedReservation.guestCount).map(t => (
                                <option key={t.id} value={t.id}>Bàn {t.number} — {t.area} (Sức chứa: {t.capacity})</option>
                            ))}
                        </select>
                        {availableTables.length === 0 && (
                            <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 12px' }}>Không có bàn trống phù hợp</p>
                        )}

                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setShowAssignModal(false)} className={styles.secondaryButton} style={{ flex: 1 }}>Hủy</button>
                            <button
                                onClick={handleAssignTable}
                                disabled={loading || !selectedTableId}
                                style={{
                                    flex: 2, padding: '11px', border: 'none', borderRadius: 10, cursor: selectedTableId ? 'pointer' : 'not-allowed',
                                    background: selectedTableId ? 'linear-gradient(135deg, #E07B39, #B85C1E)' : '#e5e7eb',
                                    color: selectedTableId ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 14
                                }}
                            >
                                {loading ? 'Đang xử lý...' : '✓ Xác nhận gán bàn'}
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