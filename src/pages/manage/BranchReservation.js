import React, { useEffect, useState } from 'react';
import { Calendar, Search, Clock, Users, Phone, Mail, CheckCircle, XCircle, RefreshCw, Store, MapPin, ChevronDown, ChevronUp, UtensilsCrossed, LogIn } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';
import { showToast } from '../../hooks/useToast';

export default function BranchReservationManager() {
    const [reservations, setReservations] = useState([]);
    const [currentBranch, setCurrentBranch] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [expandedReservation, setExpandedReservation] = useState(null);

    // Modal xác nhận
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    const [pendingReservations, setPendingReservations] = useState([]);
    const [confirmedReservations, setConfirmedReservations] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [checkedInReservations, setCheckedInReservations] = useState([]);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    const API_BASE_URL = 'http://localhost:8080';
    const token = () => localStorage.getItem('token');

    // ── Lấy chi nhánh hiện tại ──
    const fetchCurrentBranch = async () => {
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            let branchId = user?.branch?.id || user?.branchId;

            if (!branchId) {
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token()}` }
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                branchId = data.branch?.id;
                if (branchId) {
                    localStorage.setItem('user', JSON.stringify({ ...user, branchId, branch: data.branch }));
                }
            }

            if (!branchId) { alert('Tài khoản chưa được gán chi nhánh.'); return; }

            const res = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            if (res.ok) setCurrentBranch(await res.json());
        } catch {
            showToast('error', 'Lỗi', 'Không thể tải thông tin chi nhánh. Vui lòng thử lại.');
        }
    };

    // ── Lấy danh sách PENDING theo chi nhánh ──
    const fetchReservations = async () => {
        if (!currentBranch?.id) return;
        try {
            const [pendingRes, confirmedRes, checkedInRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/reservations/status?status=PENDING`, {
                    headers: { Authorization: `Bearer ${token()}` }
                }),
                fetch(`${API_BASE_URL}/api/reservations/status?status=CONFIRMED`, {
                    headers: { Authorization: `Bearer ${token()}` }
                }),
                fetch(`${API_BASE_URL}/api/reservations/status?status=CHECKED_IN`, {
                    headers: { Authorization: `Bearer ${token()}` }
                })
            ]);
            if (pendingRes.ok) {
                const data = await pendingRes.json();
                setPendingReservations(data.filter(r => r.branchName === currentBranch.name));
            }
            if (confirmedRes.ok) {
                const data = await confirmedRes.json();
                setConfirmedReservations(data.filter(r => r.branchName === currentBranch.name));
            }
            if (checkedInRes.ok) {
                const data = await checkedInRes.json();
                setCheckedInReservations(data.filter(r => r.branchName === currentBranch.name));
            }
        } catch {
            showToast('error', 'Lỗi', 'Không thể tải danh sách đặt bàn. Vui lòng thử lại.');
        }
    };

    useEffect(() => { fetchCurrentBranch(); }, []);
    useEffect(() => {
        if (!currentBranch) return;
        fetchReservations();
        const interval = setInterval(fetchReservations, 15000);
        return () => clearInterval(interval);
    }, [currentBranch]);

    // ── Cập nhật trạng thái ──
    const updateStatus = async (reservationId, status) => {
        setLoading(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/reservations/${reservationId}/status?status=${status}`,
                { method: 'PUT', headers: { Authorization: `Bearer ${token()}` } }
            );
            if (!res.ok) throw new Error();
            setShowConfirmModal(false);
            setSelectedReservation(null);
            fetchReservations();

            if (status === 'CONFIRMED') {
                showToast('success', 'Xác nhận thành công', 'Đơn đặt chỗ đã được xác nhận!');
            } else if (status === 'CHECKED_IN') {
                showToast('success', 'Check-in thành công', 'Khách đã được check-in!');
            } else {
                showToast('warning', 'Đã từ chối', 'Đơn đặt chỗ đã bị hủy.');
            }

        } catch {
            showToast('error', 'Lỗi', 'Không thể cập nhật trạng thái. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // ── Mở modal xác nhận hành động ──
    const openActionModal = (e, reservation, action) => {
        e.stopPropagation();
        setSelectedReservation(reservation);
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    // ── Filter tìm kiếm ──
    const currentList = activeTab === 'pending'
        ? pendingReservations
        : activeTab === 'confirmed'
            ? confirmedReservations
            : checkedInReservations;
    const filtered = currentList
    .filter(r => {
        const matchSearch =
            r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.phone?.includes(searchTerm) ||
            r.email?.toLowerCase().includes(searchTerm.toLowerCase());
        let matchDate = true;
        if (activeTab !== 'pending' && filterDate) {
            const checkIn = new Date(r.checkInTime);
            const checkInStr = checkIn.toISOString().split('T')[0];
            matchDate = checkInStr === filterDate; 
        }

        return matchSearch && matchDate;
    })
    .sort((a, b) => new Date(a.checkInTime) - new Date(b.checkInTime));

    const stats = {
        total: pendingReservations.length,
        withTable: pendingReservations.filter(r => r.tableNumber != null).length,
        withRoom: pendingReservations.filter(r => r.roomNumber != null).length,
    };

    if (!currentBranch) return (
        <div className={styles.loadingContainer}>
            <RefreshCw size={48} className={styles.spinIcon} />
            <p className={styles.loadingText}>Đang tải thông tin chi nhánh...</p>
        </div>
    );

    return (
        <div className={styles.pageContainer}>

            {/* ── HEADER ── */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>Xác nhận Đặt bàn / Phòng</h2>
                        <p className={styles.branchInfo}>
                            <Store size={16} />
                            <span className={styles.branchName}>{currentBranch.name}</span>
                            {currentBranch.address && (
                                <span className={styles.branchAddress}>• {currentBranch.address}</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}><Clock size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{stats.total}</div>
                            <div className={styles.statLabel}>Chờ xác nhận</div>
                        </div>
                    </div>
                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}><MapPin size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{stats.withTable}</div>
                            <div className={styles.statLabel}>Đặt bàn</div>
                        </div>
                    </div>
                    <div className={styles.statCardDanger}>
                        <div className={styles.statIcon}><MapPin size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{stats.withRoom}</div>
                            <div className={styles.statLabel}>Đặt phòng</div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên, SĐT, email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>
                <div className={styles.filterBar} style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={activeTab === 'pending' ? styles.tabActive : styles.tabInactive}
                        >
                            <Clock size={16} />
                            Chờ xác nhận
                            {pendingReservations.length > 0 && (
                                <span style={{
                                    marginLeft: 6, background: '#EF4444', color: '#fff',
                                    borderRadius: '50%', width: 20, height: 20,
                                    display: 'inline-flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: 11, fontWeight: 700
                                }}>
                                    {pendingReservations.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('confirmed')}
                            className={activeTab === 'confirmed' ? styles.tabActive : styles.tabInactive}
                        >
                            <CheckCircle size={16} />
                            Đã xác nhận
                            {confirmedReservations.length > 0 && (
                                <span style={{
                                    marginLeft: 6, background: '#10B981', color: '#fff',
                                    borderRadius: '50%', width: 20, height: 20,
                                    display: 'inline-flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: 11, fontWeight: 700
                                }}>
                                    {confirmedReservations.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('checkedIn')}
                            className={activeTab === 'checkedIn' ? styles.tabActive : styles.tabInactive}
                        >
                            <Users size={16} />
                            Đang phục vụ
                            {checkedInReservations.length > 0 && (
                                <span style={{
                                    marginLeft: 6, background: '#3B82F6', color: '#fff',
                                    borderRadius: '50%', width: 20, height: 20,
                                    display: 'inline-flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: 11, fontWeight: 700
                                }}>
                                    {checkedInReservations.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── DANH SÁCH ── */}
            {loading && reservations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    <RefreshCw size={32} className={styles.spinIcon} />
                    <p>Đang tải...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                    <CheckCircle size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 16 }}>Không có đặt bàn nào đang chờ xác nhận</p>
                </div>
            ) : (
                filtered.map(reservation => {
                    const isExpanded = expandedReservation === reservation.id;
                    const checkInDate = new Date(reservation.checkInTime);
                    const isTable = !!reservation.tableNumber;
                    const isRoom = !!reservation.roomNumber;

                    return (
                        <div key={reservation.id} className={styles.tableCard} style={{ marginBottom: 12 }}>

                            {/* Header card */}
                            <div
                                onClick={() => setExpandedReservation(isExpanded ? null : reservation.id)}
                                style={{
                                    padding: '16px 20px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none'
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                    background: isTable
                                        ? 'linear-gradient(135deg, #E07B39, #B85C1E)'
                                        : 'linear-gradient(135deg, #4361ee, #3a0ca3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 17, color: '#fff'
                                }}>
                                    {reservation.customerName?.[0]?.toUpperCase() || '?'}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                                            {reservation.customerName}
                                        </span>
                                        {/* Badge loại đặt */}
                                        <span style={{
                                            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                            background: isTable ? '#fff3e0' : '#ede7f6',
                                            color: isTable ? '#E07B39' : '#4361ee',
                                            border: `1px solid ${isTable ? '#fcd34d' : '#c5b8f8'}`
                                        }}>
                                            {isTable ? `Bàn ${reservation.tableNumber}` : isRoom ? `Phòng ${reservation.roomNumber}` : 'Chưa chọn chỗ'}
                                        </span>
                                        {/* Badge PENDING */}
                                        <span style={{
                                            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                            ...(activeTab === 'pending'
                                                ? { background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' }
                                                : activeTab === 'confirmed'
                                                    ? { background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }
                                                    : { background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' })
                                        }}>
                                            {activeTab === 'pending' ? 'Chờ xác nhận' : activeTab === 'confirmed' ? 'Đã xác nhận' : 'Đang phục vụ'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                        {reservation.phone && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                                <Phone size={13} /> {reservation.phone}
                                            </span>
                                        )}
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                            <Calendar size={13} />
                                            {checkInDate.toLocaleDateString('vi-VN')} lúc {checkInDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {reservation.guestCount && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                                <Users size={13} /> {reservation.guestCount} người
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {/* Expanded */}
                            {isExpanded && (
                                <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.02)' }}>

                                    {/* Chi tiết */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                                            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Check-in</div>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: '#9ca3af' }}>{new Date(reservation.checkInTime).toLocaleString('vi-VN')}</div>
                                        </div>
                                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                                            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Check-out</div>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: '#9ca3af' }}>{new Date(reservation.checkOutTime).toLocaleString('vi-VN')}</div>
                                        </div>
                                    </div>

                                    {reservation.email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                                            <Mail size={14} /> {reservation.email}
                                        </div>
                                    )}

                                    {reservation.notes && (
                                        <div style={{ padding: '10px 14px', background: 'rgba(224,123,57,0.08)', borderLeft: '3px solid #E07B39', borderRadius: 6, fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                                            <strong>Ghi chú:</strong> {reservation.notes}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    {/* Action buttons — chỉ hiện ở tab pending */}
                                    {activeTab === 'pending' && (
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={e => openActionModal(e, reservation, 'CANCELLED')}
                                                className={styles.buttonDanger}
                                                disabled={loading}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                <XCircle size={16} /> Từ chối
                                            </button>
                                            <button
                                                onClick={e => openActionModal(e, reservation, 'CONFIRMED')}
                                                className={styles.buttonSuccess}
                                                disabled={loading}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                <CheckCircle size={16} /> Xác nhận
                                            </button>
                                        </div>
                                    )}

                                    {/* Tab confirmed: hiện badge trạng thái + nút Check-in */}
                                    {activeTab === 'confirmed' && (
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                                            <span style={{
                                                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                                background: 'rgba(16,185,129,0.1)', color: '#10B981',
                                                border: '1px solid rgba(16,185,129,0.3)'
                                            }}>
                                                <CheckCircle size={14} style={{ marginRight: 4 }} /> Đã xác nhận
                                            </span>
                                            <button
                                                onClick={e => openActionModal(e, reservation, 'CHECKED_IN')}
                                                className={styles.primaryButton}
                                                disabled={loading}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                <Users size={16} /> Check-in
                                            </button>
                                        </div>
                                    )}
                                    {activeTab === 'checkedIn' && (
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                                            <span style={{
                                                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                                background: 'rgba(59,130,246,0.1)', color: '#3B82F6',
                                                border: '1px solid rgba(59,130,246,0.3)'
                                            }}>
                                                <UtensilsCrossed size={14} style={{ marginRight: 4 }} /> Đang phục vụ
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* ── MODAL XÁC NHẬN HÀNH ĐỘNG ── */}
            {showConfirmModal && selectedReservation && (
                <div className={styles.modalOverlay} onClick={() => setShowConfirmModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: 16, padding: 28,
                        width: '100%', maxWidth: 400,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
                    }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {confirmAction === 'CONFIRMED'
                                    ? <><CheckCircle size={20} color="#22c55e" /> Xác nhận đặt chỗ</>
                                    : confirmAction === 'CHECKED_IN'
                                        ? <><LogIn size={20} color="#3B82F6" /> Check-in khách</>
                                        : <><XCircle size={20} color="#ef4444" /> Từ chối đặt chỗ</>}
                            </span>
                        </h3>

                        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid #e5e7eb' }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, color: '#6b7280' }}>{selectedReservation.customerName}</div>
                            <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {selectedReservation.phone && <span><Phone size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{selectedReservation.phone}</span>}
                                <span><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    {new Date(selectedReservation.checkInTime).toLocaleString('vi-VN')}
                                </span>
                                {selectedReservation.tableNumber && <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Bàn {selectedReservation.tableNumber}</span>}
                                {selectedReservation.roomNumber && <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Phòng {selectedReservation.roomNumber}</span>}
                            </div>
                        </div>

                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                            {confirmAction === 'CONFIRMED'
                                ? 'Xác nhận sẽ chuyển trạng thái sang CONFIRMED. Nhân viên sẽ được thông báo.'
                                : confirmAction === 'CHECKED_IN'
                                    ? 'Xác nhận khách đã đến. Bàn/phòng sẽ chuyển sang trạng thái đang sử dụng.'
                                    : 'Từ chối sẽ hủy đặt chỗ này. Hành động không thể hoàn tác.'}
                        </p>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#f9fafb', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={() => updateStatus(selectedReservation.id, confirmAction)}
                                disabled={loading}
                                style={{
                                    flex: 2, padding: '10px', border: 'none', borderRadius: 10,
                                    cursor: 'pointer', fontWeight: 700, fontSize: 14,
                                    background: confirmAction === 'CONFIRMED'
                                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                        : confirmAction === 'CHECKED_IN'
                                            ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                                            : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: '#fff'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    {loading ? <><RefreshCw size={16} /> Đang xử lý...</>
                                        : confirmAction === 'CONFIRMED' ? <><CheckCircle size={16} /> Xác nhận</>
                                            : confirmAction === 'CHECKED_IN' ? <><LogIn size={16} /> Check-in</>
                                                : <><XCircle size={16} /> Từ chối</>}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}