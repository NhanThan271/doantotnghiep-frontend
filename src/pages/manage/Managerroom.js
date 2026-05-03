import React, { useEffect, useState } from 'react';
import {
    Search, Eye, RefreshCw, MapPin, X,
    Check, Users, Clock, Layers, DoorOpen
} from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function ManagerRoomManagement() {
    const [rooms, setRooms] = useState([]);
    const [filteredRooms, setFilteredRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterArea, setFilterArea] = useState('all');
    const [selectedRoom, setSelectedRoom] = useState(null);
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

    // Fetch rooms by branch
    const fetchRooms = async () => {
        if (!currentBranch?.id) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/rooms/branch/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error('Không thể tải danh sách phòng');
            const data = await response.json();
            setRooms(Array.isArray(data) ? data : []);
            setFilteredRooms(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Lỗi khi tải danh sách phòng:', error);
            alert('Không thể tải danh sách phòng. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Update room status
    const updateRoomStatus = async (roomId, status) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/rooms/${roomId}/status?status=${status}`,
                {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (!response.ok) throw new Error('Không thể cập nhật trạng thái phòng');
            await fetchRooms();
            const msg = status === 'OCCUPIED' ? 'Đã mở phòng thành công!' : 'Đã đóng phòng thành công!';
            alert(msg);
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái phòng:', error);
            alert('Không thể cập nhật trạng thái phòng. Vui lòng thử lại.');
        }
    };

    useEffect(() => {
        fetchCurrentBranch();
    }, []);

    useEffect(() => {
        if (currentBranch) fetchRooms();
    }, [currentBranch]);

    // Filter rooms
    useEffect(() => {
        let filtered = rooms;
        if (filterStatus !== 'all') {
            filtered = filtered.filter(r => r.status === filterStatus);
        }
        if (filterArea !== 'all') {
            filtered = filtered.filter(r => r.area === filterArea);
        }
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.number?.toString().includes(searchTerm) ||
                r.area?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredRooms(filtered);
    }, [rooms, filterStatus, filterArea, searchTerm]);

    const getStatusText = (status) => {
        const map = { FREE: 'Trống', OCCUPIED: 'Đang sử dụng', RESERVED: 'Đã đặt' };
        return map[status] || status;
    };

    const getStatusBadgeClass = (status) => {
        const map = {
            FREE: styles.badgeSuccess,
            OCCUPIED: styles.badgeDanger,
            RESERVED: styles.badgeWarning
        };
        return map[status] || styles.badgeInactive;
    };

    const getStatusColor = (status) => {
        const map = { FREE: '#10b981', OCCUPIED: '#ef4444', RESERVED: '#f59e0b' };
        return map[status] || '#9ca3af';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(dateString));
    };

    const areas = [...new Set(rooms.map(r => r.area).filter(Boolean))];

    const stats = {
        total: rooms.length,
        free: rooms.filter(r => r.status === 'FREE').length,
        occupied: rooms.filter(r => r.status === 'OCCUPIED').length,
        reserved: rooms.filter(r => r.status === 'RESERVED').length,
    };

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>Quản lý Phòng</h2>
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
                        onClick={fetchRooms}
                        disabled={loading}
                        className={`${styles.refreshButton} ${loading ? styles.refreshButtonDisabled : ''}`}
                    >
                        <RefreshCw size={18} className={loading ? styles.spinIcon : ''} />
                        Làm mới
                    </button>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}><DoorOpen size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{stats.total}</div>
                            <div className={styles.statLabel}>Tổng số phòng</div>
                        </div>
                    </div>
                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}><Check size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{stats.free}</div>
                            <div className={styles.statLabel}>Phòng trống</div>
                        </div>
                    </div>
                    <div className={styles.statCardDanger}>
                        <div className={styles.statIcon}><Users size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{stats.occupied}</div>
                            <div className={styles.statLabel}>Đang sử dụng</div>
                        </div>
                    </div>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}><Clock size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{stats.reserved}</div>
                            <div className={styles.statLabel}>Đã đặt</div>
                        </div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Tìm theo số phòng, khu vực..."
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
                                minWidth: '150px'
                            }}
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="FREE">Trống</option>
                            <option value="OCCUPIED">Đang sử dụng</option>
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

            {/* Rooms Grid */}
            <div className={styles.tableCard}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '20px',
                    padding: '20px'
                }}>
                    {filteredRooms.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
                            <DoorOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#9ca3af' }} />
                            <p style={{ color: '#9ca3af', fontSize: '16px' }}>Không có phòng nào</p>
                        </div>
                    ) : (
                        filteredRooms.map((room) => {
                            const color = getStatusColor(room.status);
                            return (
                                <div
                                    key={room.id}
                                    style={{
                                        border: `2px solid ${color}`,
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
                                    {/* Room Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                                                Phòng {room.number}
                                            </div>
                                            {room.area && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                                    <Layers size={14} />
                                                    {room.area}
                                                </div>
                                            )}
                                        </div>
                                        <span className={getStatusBadgeClass(room.status)}>
                                            {getStatusText(room.status)}
                                        </span>
                                    </div>

                                    {/* Room Info */}
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                        marginBottom: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <Users size={16} style={{ color: '#6b7280' }} />
                                            <span style={{ fontSize: '14px', color: '#374151' }}>
                                                Sức chứa: {room.capacity} người
                                            </span>
                                        </div>
                                        {room.updatedAt && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Clock size={14} style={{ color: '#9ca3af' }} />
                                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                    Cập nhật: {formatDate(room.updatedAt)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => { setSelectedRoom(room); setShowDetailModal(true); }}
                                            className={styles.actionButtonView}
                                            style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                        >
                                            <Eye size={16} />
                                            Chi tiết
                                        </button>
                                        {room.status === 'FREE' ? (
                                            <button
                                                onClick={() => updateRoomStatus(room.id, 'OCCUPIED')}
                                                className={styles.actionButtonSuccess}
                                                style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <Check size={16} />
                                                Mở phòng
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateRoomStatus(room.id, 'FREE')}
                                                className={styles.actionButtonDanger}
                                                style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <X size={16} />
                                                Đóng phòng
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Room Detail Modal */}
            {showDetailModal && selectedRoom && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2 className={styles.modalTitle}>Chi tiết Phòng {selectedRoom.number}</h2>
                                <p className={styles.modalSubtitle}>{selectedRoom.area}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className={styles.modalCloseButton}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.orderInfoGrid}>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Số phòng</p>
                                    <p className={styles.infoValue}>{selectedRoom.number}</p>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Khu vực</p>
                                    <p className={styles.infoValue}>{selectedRoom.area || '-'}</p>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Sức chứa</p>
                                    <p className={styles.infoValue}>{selectedRoom.capacity} người</p>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Trạng thái</p>
                                    <span className={getStatusBadgeClass(selectedRoom.status)}>
                                        {getStatusText(selectedRoom.status)}
                                    </span>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Ngày tạo</p>
                                    <p className={styles.infoValue}>{formatDate(selectedRoom.createdAt)}</p>
                                </div>
                                <div className={styles.infoCard}>
                                    <p className={styles.infoLabel}>Cập nhật lần cuối</p>
                                    <p className={styles.infoValue}>{formatDate(selectedRoom.updatedAt)}</p>
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                {selectedRoom.status === 'FREE' ? (
                                    <button
                                        onClick={() => {
                                            updateRoomStatus(selectedRoom.id, 'OCCUPIED');
                                            setShowDetailModal(false);
                                        }}
                                        className={styles.buttonSuccess}
                                    >
                                        <Check size={20} />
                                        Mở phòng
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            updateRoomStatus(selectedRoom.id, 'FREE');
                                            setShowDetailModal(false);
                                        }}
                                        className={styles.buttonDanger}
                                    >
                                        <X size={20} />
                                        Đóng phòng
                                    </button>
                                )}
                                {selectedRoom.status !== 'RESERVED' && (
                                    <button
                                        onClick={() => {
                                            updateRoomStatus(selectedRoom.id, 'RESERVED');
                                            setShowDetailModal(false);
                                        }}
                                        className={styles.actionButtonPrimary}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                                    >
                                        <Clock size={20} />
                                        Đặt phòng
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