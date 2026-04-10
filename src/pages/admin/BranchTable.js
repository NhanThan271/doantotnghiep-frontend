import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Users, Grid, Search, Layers } from 'lucide-react';
import TableFormModal from '../admin/forms/TableFormModal';
import './BranchTable.css';

export default function TableManagement() {
    const [branches, setBranches] = useState([]);
    const [tables, setTables] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterArea, setFilterArea] = useState('all');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        number: '',
        capacity: '',
        area: '',
        status: 'FREE'
    });

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            fetchTables();
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

    const fetchTables = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/tables`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            const branchTables = data.filter(t => t.branch.id === selectedBranch.id);
            setTables(branchTables);
        } catch (error) {
            console.error('Lỗi khi lấy bàn:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingTable(null);
        setFormData({
            number: '',
            capacity: '',
            area: '',
            status: 'FREE'
        });
        setShowModal(true);
    };

    const handleOpenEdit = (table) => {
        setEditingTable(table);
        setFormData({
            number: table.number,
            capacity: table.capacity,
            area: table.area || '',
            status: table.status
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.number || !formData.capacity || !formData.area) {
            alert('Vui lòng nhập đầy đủ thông tin (bao gồm cả khu vực/tầng)');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const payload = {
                branch: { id: selectedBranch.id },
                number: parseInt(formData.number),
                capacity: parseInt(formData.capacity),
                area: formData.area.trim(), // Trim whitespace
                status: formData.status
            };

            const url = editingTable
                ? `${API_BASE_URL}/api/tables/${editingTable.id}`
                : `${API_BASE_URL}/api/tables`;

            const method = editingTable ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save table');
            }

            alert(editingTable ? 'Cập nhật bàn thành công!' : 'Tạo bàn thành công!');
            setShowModal(false);
            fetchTables();
        } catch (error) {
            console.error('Error saving table:', error);
            alert(error.message || 'Không thể lưu bàn. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa bàn này?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/tables/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Delete failed');

            alert('Xóa bàn thành công!');
            fetchTables();
        } catch (error) {
            console.error('Error deleting table:', error);
            alert('Không thể xóa bàn. Vui lòng thử lại!');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'FREE': return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981' };
            case 'OCCUPIED': return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444' };
            case 'RESERVED': return { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#FBBF24' };
            default: return { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', text: '#64748B' };
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'FREE': return 'Trống';
            case 'OCCUPIED': return 'Đang dùng';
            case 'RESERVED': return 'Đã đặt';
            default: return status;
        }
    };

    const uniqueAreas = [...new Set(tables.map(t => t.area).filter(Boolean))];

    const filteredTables = tables.filter(t => {
        const matchesSearch = t.number.toString().includes(searchTerm) ||
            (t.area && t.area.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesArea = filterArea === 'all' || t.area === filterArea;
        return matchesSearch && matchesArea;
    });

    const freeCount = tables.filter(t => t.status === 'FREE').length;
    const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length;

    return (
        <div className="table-management">
            {/* Header */}
            <div className="header">
                <div className="header-content">
                    <div>
                        <h2 className="header-title">Quản lý Bàn</h2>
                        <p className="header-subtitle">
                            <Grid size={16} />
                            Cấu hình và quản lý bàn theo chi nhánh
                        </p>
                    </div>
                    {selectedBranch && (
                        <button onClick={handleOpenAdd} className="btn-add">
                            <Plus size={18} />
                            Thêm bàn mới
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
                                <div className="branch-name">{branch.name}</div>
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
                                            <div className="stat-value free">{freeCount}</div>
                                            <div className="stat-label">Bàn trống</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-card occupied">
                                    <div className="stat-content">
                                        <div className="stat-icon occupied">
                                            <Users size={24} />
                                        </div>
                                        <div>
                                            <div className="stat-value occupied">{occupiedCount}</div>
                                            <div className="stat-label">Đang dùng</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-card total">
                                    <div className="stat-content">
                                        <div className="stat-icon total">
                                            <Layers size={24} />
                                        </div>
                                        <div>
                                            <div className="stat-value total">{tables.length}</div>
                                            <div className="stat-label">Tổng bàn</div>
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
                                        placeholder="Tìm kiếm bàn hoặc khu vực..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="search-input"
                                        style={{ paddingLeft: '48px' }}
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

                            {/* Tables Grid */}
                            <div className="tables-grid">
                                {filteredTables.length === 0 ? (
                                    <div className="empty-state">
                                        <Grid size={48} className="empty-icon" />
                                        <p className="empty-text">Chưa có bàn nào</p>
                                    </div>
                                ) : (
                                    filteredTables.map(table => {
                                        const statusColor = getStatusColor(table.status);
                                        return (
                                            <div
                                                key={table.id}
                                                className="table-card"
                                                style={{ borderColor: statusColor.border }}
                                            >
                                                <div className="table-header">
                                                    <div>
                                                        <div className="table-number">Bàn {table.number}</div>
                                                        {table.area && (
                                                            <div className="table-area">
                                                                <Layers size={14} />
                                                                {table.area}
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
                                                        {getStatusText(table.status)}
                                                    </div>
                                                </div>

                                                <div className="table-capacity">
                                                    <Users size={18} color="#8B5CF6" />
                                                    <span className="capacity-text">
                                                        Sức chứa: {table.capacity} người
                                                    </span>
                                                </div>

                                                <div className="table-actions">
                                                    <button
                                                        onClick={() => handleOpenEdit(table)}
                                                        className="btn-edit"
                                                    >
                                                        <Edit2 size={16} />
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(table.id)}
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
            <TableFormModal
                showModal={showModal}
                editingTable={editingTable}
                formData={formData}
                setFormData={setFormData}
                loading={loading}
                onClose={() => setShowModal(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}