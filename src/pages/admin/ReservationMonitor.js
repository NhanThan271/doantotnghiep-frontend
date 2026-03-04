import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Users, AlertTriangle, CheckCircle, XCircle, Phone, Mail, MapPin, Search, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function ReservationMonitor() {
    const [reservations, setReservations] = useState([]);
    const [branches, setBranches] = useState([]);
    const [tables, setTables] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto refresh mỗi 30s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [resRes, branchRes, tableRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/reservations/pending`, { headers }),
                axios.get(`${API_BASE_URL}/api/branches`, { headers }),
                axios.get(`${API_BASE_URL}/api/customer/tables`, { headers })
            ]);

            setReservations(resRes.data);
            setBranches(branchRes.data);
            setTables(tableRes.data);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateReservationStatus = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE_URL}/api/reservations/${id}/status?status=${status}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchData();
            setSelectedReservation(null);
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái:', error);
            alert('Không thể cập nhật trạng thái. Vui lòng thử lại!');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            PENDING: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#FBBF24' },
            CONFIRMED: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981' },
            CANCELLED: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444' },
            COMPLETED: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8B5CF6' }
        };
        return colors[status] || colors.PENDING;
    };

    const getStatusText = (status) => {
        const texts = {
            PENDING: 'Chờ xác nhận',
            CONFIRMED: 'Đã xác nhận',
            CANCELLED: 'Đã hủy',
            COMPLETED: 'Hoàn thành'
        };
        return texts[status] || status;
    };

    const getTableInfo = (tableId) => {
        return tables.find(t => t.id === tableId);
    };

    const getBranchName = (branchId) => {
        const branch = branches.find(b => b.id === branchId);
        return branch ? branch.name : 'N/A';
    };

    const getBranchStats = () => {
        const stats = branches.map(branch => {
            const branchReservations = reservations.filter(r => r.branch?.id === branch.id);
            const pending = branchReservations.filter(r => r.status === 'PENDING').length;
            const confirmed = branchReservations.filter(r => r.status === 'CONFIRMED').length;
            const isOverload = pending + confirmed > 10;

            return {
                branch,
                total: branchReservations.length,
                pending,
                confirmed,
                isOverload
            };
        });
        return stats;
    };

    const filteredReservations = reservations.filter(r => {
        const matchBranch = selectedBranch === 'all' || r.branch?.id === parseInt(selectedBranch);
        const matchStatus = selectedStatus === 'all' || r.status === selectedStatus;
        const matchSearch = r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.phone?.includes(searchTerm);
        return matchBranch && matchStatus && matchSearch;
    });

    const formatDateTime = (dateTime) => {
        const date = new Date(dateTime);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const statusCounts = {
        total: reservations.length,
        pending: reservations.filter(r => r.status === 'PENDING').length,
        confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
        overload: getBranchStats().filter(s => s.isOverload).length
    };

    return (
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
            {/* Header */}
            <div style={{
                padding: '32px 24px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(26, 26, 26, 0.8) 100%)',
                borderRadius: '20px',
                marginBottom: '24px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{
                            fontSize: '32px',
                            fontWeight: '800',
                            marginBottom: '8px',
                            background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Giám sát Đặt bàn
                        </h1>
                        <p style={{ color: '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={16} />
                            Theo dõi và quản lý đặt bàn toàn hệ thống
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: loading ? 0.6 : 1,
                            transition: 'all 0.3s'
                        }}
                    >
                        <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '16px',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Calendar size={24} color="#3B82F6" />
                        </div>
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#3B82F6' }}>
                                {statusCounts.total}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Tổng đặt bàn</div>
                        </div>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    borderRadius: '16px',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(251, 191, 36, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Clock size={24} color="#FBBF24" />
                        </div>
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#FBBF24' }}>
                                {statusCounts.pending}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Chờ xác nhận</div>
                        </div>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '16px',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CheckCircle size={24} color="#10B981" />
                        </div>
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#10B981' }}>
                                {statusCounts.confirmed}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Đã xác nhận</div>
                        </div>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '16px',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AlertTriangle size={24} color="#EF4444" />
                        </div>
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#EF4444' }}>
                                {statusCounts.overload}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Chi nhánh quá tải</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch Overload Warning */}
            {statusCounts.overload > 0 && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle size={24} color="#EF4444" />
                        <div>
                            <div style={{ fontWeight: '600', color: '#EF4444', marginBottom: '4px' }}>
                                Cảnh báo quá tải!
                            </div>
                            <div style={{ fontSize: '14px', color: '#94A3B8' }}>
                                {getBranchStats().filter(s => s.isOverload).map(s => s.branch.name).join(', ')} đang có quá nhiều đơn đặt bàn
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{
                background: '#1A1A1A',
                border: '1px solid #2D2D2D',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={20} style={{
                            position: 'absolute',
                            left: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#64748B'
                        }} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc SĐT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 48px',
                                background: '#0F0F0F',
                                border: '1px solid #2D2D2D',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{
                            padding: '12px 16px',
                            background: '#0F0F0F',
                            border: '1px solid #2D2D2D',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">Tất cả chi nhánh</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        style={{
                            padding: '12px 16px',
                            background: '#0F0F0F',
                            border: '1px solid #2D2D2D',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '14px',
                            cursor: 'pointer'
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

            {/* Reservations List */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '20px'
            }}>
                {filteredReservations.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: '#1A1A1A',
                        border: '1px solid #2D2D2D',
                        borderRadius: '16px'
                    }}>
                        <Calendar size={64} color="#64748B" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ color: '#94A3B8', fontSize: '16px' }}>Không có đặt bàn nào</p>
                    </div>
                ) : (
                    filteredReservations.map(reservation => {
                        const statusColor = getStatusColor(reservation.status);
                        const tableInfo = getTableInfo(reservation.table?.id);

                        return (
                            <div
                                key={reservation.id}
                                style={{
                                    background: '#1A1A1A',
                                    border: `1px solid ${statusColor.border}`,
                                    borderRadius: '16px',
                                    padding: '20px',
                                    transition: 'all 0.3s',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setSelectedReservation(reservation)}
                            >
                                {/* Status Badge */}
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: statusColor.bg,
                                    border: `1px solid ${statusColor.border}`,
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: statusColor.text,
                                    marginBottom: '16px'
                                }}>
                                    {reservation.status === 'PENDING' && <Clock size={14} />}
                                    {reservation.status === 'CONFIRMED' && <CheckCircle size={14} />}
                                    {reservation.status === 'CANCELLED' && <XCircle size={14} />}
                                    {getStatusText(reservation.status)}
                                </div>

                                {/* Customer Info */}
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: '700',
                                    color: 'white',
                                    marginBottom: '12px'
                                }}>
                                    {reservation.customerName}
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94A3B8' }}>
                                        <Phone size={16} />
                                        {reservation.phone}
                                    </div>
                                    {reservation.email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94A3B8' }}>
                                            <Mail size={16} />
                                            {reservation.email}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94A3B8' }}>
                                        <MapPin size={16} />
                                        {getBranchName(reservation.branch?.id)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94A3B8' }}>
                                        <Users size={16} />
                                        {reservation.guestCount} người
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94A3B8' }}>
                                        <Clock size={16} />
                                        {formatDateTime(reservation.reservationTime)}
                                    </div>
                                </div>

                                {/* Table Info */}
                                {tableInfo && (
                                    <div style={{
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        fontSize: '13px',
                                        color: '#3B82F6',
                                        marginBottom: '12px'
                                    }}>
                                        Bàn số {tableInfo.number} - Khu {tableInfo.area} (Sức chứa: {tableInfo.capacity})
                                    </div>
                                )}

                                {/* Notes */}
                                {reservation.notes && (
                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(100, 116, 139, 0.1)',
                                        border: '1px solid rgba(100, 116, 139, 0.2)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#94A3B8',
                                        fontStyle: 'italic'
                                    }}>
                                        {reservation.notes}
                                    </div>
                                )}

                                {/* Quick Actions */}
                                {reservation.status === 'PENDING' && (
                                    <div style={{
                                        display: 'flex',
                                        gap: '8px',
                                        marginTop: '16px',
                                        paddingTop: '16px',
                                        borderTop: '1px solid #2D2D2D'
                                    }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateReservationStatus(reservation.id, 'CONFIRMED');
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Xác nhận
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateReservationStatus(reservation.id, 'CANCELLED');
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Detail Modal */}
            {selectedReservation && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '24px'
                    }}
                    onClick={() => setSelectedReservation(null)}
                >
                    <div
                        style={{
                            background: '#1A1A1A',
                            border: '1px solid #2D2D2D',
                            borderRadius: '20px',
                            padding: '32px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px'
                        }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>
                                Chi tiết đặt bàn
                            </h2>
                            <button
                                onClick={() => setSelectedReservation(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94A3B8',
                                    cursor: 'pointer',
                                    fontSize: '24px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* All info sections similar to card but more detailed */}
                            <div>
                                <label style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px', display: 'block' }}>
                                    Trạng thái
                                </label>
                                <div style={{
                                    ...getStatusColor(selectedReservation.status),
                                    padding: '12px',
                                    borderRadius: '8px',
                                    fontWeight: '600'
                                }}>
                                    {getStatusText(selectedReservation.status)}
                                </div>
                            </div>

                            {selectedReservation.status === 'PENDING' && (
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => updateReservationStatus(selectedReservation.id, 'CONFIRMED')}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            background: 'linear-gradient(135deg, #10B981, #059669)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Xác nhận đặt bàn
                                    </button>
                                    <button
                                        onClick={() => updateReservationStatus(selectedReservation.id, 'CANCELLED')}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Hủy đặt bàn
                                    </button>
                                </div>
                            )}

                            {selectedReservation.status === 'CONFIRMED' && (
                                <button
                                    onClick={() => updateReservationStatus(selectedReservation.id, 'COMPLETED')}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Đánh dấu hoàn thành
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}