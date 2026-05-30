import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Users, Grid, Search, Layers, DoorOpen } from 'lucide-react';
import RoomFormModal from '../admin/forms/RoomFormModal';
import './BranchTable.css';
import { showToast } from '../../hooks/useToast';

export default function RoomManagement() {
    const [branches, setBranches] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterArea, setFilterArea] = useState('all');
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [formData, setFormData] = useState({
        number: '',
        capacity: '',
        area: '',
        status: 'ACTIVE'
    });

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            fetchRooms();
        }
    }, [selectedBranch]);

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setBranches(data);
            if (data.length > 0 && !selectedBranch) {
                setSelectedBranch(data[0]);
            }
        } catch (error) {
            console.error('Lỗi khi lấy chi nhánh:', error);
        }
    };

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/rooms/branch/${selectedBranch.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            setRooms(Array.isArray(data) ? data : data.content ?? []);
        } catch (error) {
            console.error('Lỗi khi lấy phòng:', error);
            setRooms([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingRoom(null);
        setFormData({ number: '', capacity: '', area: '', roomFee: '', status: 'ACTIVE' });
        setShowModal(true);
    };

    const handleOpenEdit = (room) => {
        setEditingRoom(room);
        setFormData({
            number: room.number,
            capacity: room.capacity,
            area: room.area || '',
            roomFee: room.roomFee || '',
            status: room.status
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.number || !formData.capacity || !formData.area || !formData.roomFee) {
            alert('Vui lòng nhập đầy đủ thông tin (bao gồm cả khu vực/tầng và giá phòng)');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            let response;

            if (editingRoom) {
                // PUT /api/rooms/{id}?capacity=...&area=...
                const params = new URLSearchParams({
                    capacity: parseInt(formData.capacity),
                    area: formData.area.trim(),
                    roomFee: parseFloat(formData.roomFee)
                });
                response = await fetch(`${API_BASE_URL}/api/rooms/${editingRoom.id}?${params}`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                // POST /api/rooms?branchId=...&number=...&capacity=...&area=...
                const params = new URLSearchParams({
                    branchId: selectedBranch.id,
                    number: parseInt(formData.number),
                    capacity: parseInt(formData.capacity),
                    area: formData.area.trim(),
                    roomFee: parseFloat(formData.roomFee)
                });
                response = await fetch(`${API_BASE_URL}/api/rooms?${params}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to save room');
            }

            alert(editingRoom ? 'Cập nhật phòng thành công!' : 'Tạo phòng thành công!');
            setShowModal(false);
            fetchRooms();
        } catch (error) {
            console.error('Error saving room:', error);
            alert(error.message || 'Không thể lưu phòng. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        setDeleteConfirm(id);
    };
    const confirmDelete = async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/rooms/${deleteConfirm}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        })

            .then(res => {
                if (!res.ok) throw new Error('Xóa thất bại');
                showToast('success', 'Xóa thành công!', 'Phòng đã được xóa.');
                setDeleteConfirm(null);
                fetchRooms();
            })
            .catch(err => {
                console.error(err);
                showToast('error', 'Xóa thất bại', 'Không thể xóa phòng. Vui lòng thử lại!');
                setDeleteConfirm(null);
            });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981' };
            case 'RESERVED': return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444' };
            case 'MAINTENANCE': return { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#FBBF24' };
            default: return { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', text: '#64748B' };
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'ACTIVE': return 'Hoạt động';
            case 'RESERVED': return 'Đã đặt';
            case 'MAINTENANCE': return 'Bảo trì';
            default: return status;
        }
    };

    const uniqueAreas = [...new Set(rooms.map(r => r.area).filter(Boolean))];

    const filteredRooms = rooms.filter(r => {
        const matchesSearch =
            r.number.toString().includes(searchTerm) ||
            (r.area && r.area.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesArea = filterArea === 'all' || r.area === filterArea;
        return matchesSearch && matchesArea;
    });

    const activeCount = rooms.filter(r => r.status === 'ACTIVE').length;
    const bookedCount = rooms.filter(r => r.status === 'RESERVED').length;

    return (
        <div className="table-management">
            {/* Header */}
            <div className="header">
                <div className="header-content">
                    <div>
                        <h2 className="header-title">Quản lý Phòng</h2>
                        <p className="header-subtitle">
                            <DoorOpen size={16} />
                            Cấu hình và quản lý phòng theo chi nhánh
                        </p>
                    </div>
                    {selectedBranch && (
                        <button onClick={handleOpenAdd} className="btn-add">
                            <Plus size={18} />
                            Thêm phòng mới
                        </button>
                    )}
                </div>
            </div>

            <div className="main-grid">
                {/* Branches Sidebar */}
                <div className="sidebar">
                    <h3 className="sidebar-title">
                        <MapPin size={18} />
                        Chi nhánh
                    </h3>
                    <div className="branch-list">
                        {branches.map(branch => (
                            <button
                                key={branch.id}
                                onClick={() => setSelectedBranch(branch)}
                                className={`branch-item ${selectedBranch?.id === branch.id ? 'active' : ''}`}
                            >
                                <div className="branch-name1">{branch.name}</div>
                                <div className="branch-address">{branch.address}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div>
                    {selectedBranch && (
                        <>
                            {/* Stats */}
                            <div className="stats-grid">
                                <div className="stat-card free">
                                    <div className="stat-content">
                                        <div className="stat-icon free">
                                            <Grid size={24} />
                                        </div>
                                        <div>
                                            <div className="stat-value free">{activeCount}</div>
                                            <div className="stat-label">Phòng hoạt động</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-card occupied">
                                    <div className="stat-content">
                                        <div className="stat-icon occupied">
                                            <Users size={24} />
                                        </div>
                                        <div>
                                            <div className="stat-value occupied">{bookedCount}</div>
                                            <div className="stat-label">Đã đặt</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-card total">
                                    <div className="stat-content">
                                        <div className="stat-icon total">
                                            <Layers size={24} />
                                        </div>
                                        <div>
                                            <div className="stat-value total">{rooms.length}</div>
                                            <div className="stat-label">Tổng phòng</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Search & Filter */}
                            <div className="filter-bar">
                                <div className="search-wrapper">
                                    <Search size={20} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm phòng hoặc khu vực..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="search-input"
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px 12px 48px',
                                            background: '#f3f4f6',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '12px',
                                            color: 'var(--color-text-secondary)',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'all 0.2s ease'
                                        }}
                                    />
                                </div>

                                <select
                                    value={filterArea}
                                    onChange={(e) => setFilterArea(e.target.value)}
                                    className="search-input1"
                                >
                                    <option value="all">Tất cả khu vực</option>
                                    {uniqueAreas.map(area => (
                                        <option key={area} value={area}>{area}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Rooms Grid */}
                            <div className="tables-grid">
                                {filteredRooms.length === 0 ? (
                                    <div className="empty-state">
                                        <Grid size={48} className="empty-icon" />
                                        <p className="empty-text">Chưa có phòng nào</p>
                                    </div>
                                ) : (
                                    filteredRooms.map(room => {
                                        const statusColor = getStatusColor(room.status);
                                        return (
                                            <div
                                                key={room.id}
                                                className="table-card"
                                                style={{ borderColor: statusColor.border }}
                                            >
                                                <div className="table-header">
                                                    <div>
                                                        <div className="table-number">Phòng {room.number}</div>
                                                        {room.area && (
                                                            <div className="table-area">
                                                                <Layers size={14} />
                                                                {room.area}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div
                                                        className="status-badge"
                                                        style={{
                                                            background: statusColor.bg,
                                                            color: statusColor.text,
                                                            border: `1px solid ${statusColor.border}`
                                                        }}
                                                    >
                                                        {getStatusText(room.status)}
                                                    </div>
                                                </div>

                                                <div className="table-capacity">
                                                    <Users size={18} color="#8B5CF6" />
                                                    <span className="capacity-text">
                                                        Sức chứa: {room.capacity} người
                                                    </span>
                                                </div>

                                                <div className="table-capacity">
                                                    <span style={{ fontSize: '13px', color: '#10B981', fontWeight: '600' }}>
                                                        Giá phòng:{Number(room.roomFee).toLocaleString('vi-VN')} đ
                                                    </span>
                                                </div>

                                                <div className="table-actions">
                                                    <button
                                                        onClick={() => handleOpenEdit(room)}
                                                        className="btn-edit"
                                                    >
                                                        <Edit2 size={16} />
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(room.id)}
                                                        className="btn-delete"
                                                    >
                                                        <Trash2 size={16} />
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal */}
            <RoomFormModal
                showModal={showModal}
                editingRoom={editingRoom}
                formData={formData}
                setFormData={setFormData}
                loading={loading}
                onClose={() => setShowModal(false)}
                onSubmit={handleSubmit}
            />

            {deleteConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px',
                        padding: '28px', width: '380px', textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            width: '56px', height: '56px', background: 'rgba(239,68,68,0.1)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 16px'
                        }}>
                            <Trash2 size={24} color="#EF4444" />
                        </div>
                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                            Xác nhận xóa
                        </h3>
                        <p style={{ color: '#B8B8B8', fontSize: '14px', marginBottom: '24px' }}>
                            Bạn có chắc muốn xóa phòng này? Hành động này không thể hoàn tác!
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{
                                flex: 1, padding: '12px', background: 'transparent',
                                border: '1px solid #2a2a2a', borderRadius: '10px',
                                color: '#B8B8B8', cursor: 'pointer', fontWeight: '600'
                            }}>
                                Hủy
                            </button>
                            <button onClick={confirmDelete} style={{
                                flex: 1, padding: '12px',
                                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                border: 'none', borderRadius: '10px',
                                color: '#fff', cursor: 'pointer', fontWeight: '600'
                            }}>
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}