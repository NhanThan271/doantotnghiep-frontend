import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Users, Mail, Phone, Briefcase, UserCheck, UserX, Building2, ChevronDown } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';
import StaffPositionForm from './forms/StaffPositionForm';

const POSITION_MAP = {
    WAITER: { label: 'Phục vụ', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    CHEF: { label: 'Bếp', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    CASHIER: { label: 'Thu ngân', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    STOCK: { label: 'Kho', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
};

export default function Employees({ openAdd, openEdit, refreshTrigger }) {
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffMap, setStaffMap] = useState({});
    const [filter, setFilter] = useState('all'); // all, active, inactive
    const [selectedBranch, setSelectedBranch] = useState('all'); // all hoặc branch ID
    const [expandedEmpId, setExpandedEmpId] = useState(null);
    const [positionForm, setPositionForm] = useState(null);
    const API_BASE_URL = 'http://localhost:8080';

    // Fetch chi nhánh
    const fetchBranches = () => {
        const token = localStorage.getItem('token');

        fetch(`${API_BASE_URL}/api/branches`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                console.log('Branches data:', data);
                setBranches(data);
            })
            .catch(err => {
                console.error('Lỗi lấy chi nhánh:', err);
                setBranches([]);
            });
    };

    // Fetch tất cả users và lọc role EMPLOYEE, MANAGER, KITCHEN
    const fetchEmployees = () => {
        const token = localStorage.getItem('token');
        setLoading(true);

        fetch(`${API_BASE_URL}/api/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Lỗi lấy dữ liệu');
                return res.json();
            })
            .then(data => {
                console.log('Users data:', data);
                const empList = data.filter(user =>
                    user.role === 'EMPLOYEE' ||
                    user.role === 'MANAGER' ||
                    user.role === 'KITCHEN'
                );
                setEmployees(empList);
                fetchStaffInfo(empList, token);
            })
            .catch(err => {
                console.error('Lỗi:', err);
                setEmployees([]);
            })
            .finally(() => {
                setLoading(false);
            });
    };
    const fetchStaffInfo = (empList, token) => {
        const uniqueBranchIds = [...new Set(empList.map(e => e.branch?.id).filter(Boolean))];
        Promise.all(
            uniqueBranchIds.map(bid =>
                fetch(`${API_BASE_URL}/api/staff/branch/${bid}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(r => r.ok ? r.json() : [])
                    .catch(() => [])
            )
        ).then(allStaffArrays => {
            const map = {};
            allStaffArrays.flat().forEach(staff => {
                if (staff?.userId) {
                    map[staff.userId] = { id: staff.id, position: staff.position };
                }
            });
            setStaffMap(map);
        });
    };
    useEffect(() => {
        fetchBranches();
        fetchEmployees();
    }, []);

    // Tự động refresh khi có trigger từ parent component
    useEffect(() => {
        if (refreshTrigger) {
            fetchEmployees();
        }
    }, [refreshTrigger]);

    const handleDelete = (id, name) => {
        if (!window.confirm(`Bạn có chắc muốn xóa nhân viên "${name}" không?`)) return;

        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Xóa thất bại');
                alert('Xóa nhân viên thành công!');
                fetchEmployees();
            })
            .catch(err => {
                console.error(err);
                alert('Không thể xóa nhân viên. Vui lòng thử lại!');
            });
    };

    // Lọc nhân viên theo trạng thái và chi nhánh
    const filteredEmployees = employees.filter(emp => {
        // Lọc theo trạng thái
        let statusMatch = true;
        if (filter === 'active') statusMatch = emp.isActive;
        if (filter === 'inactive') statusMatch = !emp.isActive;

        // Lọc theo chi nhánh
        let branchMatch = true;
        if (selectedBranch !== 'all') {
            branchMatch = emp.branch?.id === parseInt(selectedBranch);
        }

        return statusMatch && branchMatch;
    });

    // Thống kê tổng quan
    const stats = {
        total: employees.length,
        active: employees.filter(e => e.isActive).length,
        inactive: employees.filter(e => !e.isActive).length
    };

    // Thống kê theo chi nhánh được chọn
    const branchStats = selectedBranch !== 'all' ? {
        total: employees.filter(e => e.branch?.id === parseInt(selectedBranch)).length,
        active: employees.filter(e => e.branch?.id === parseInt(selectedBranch) && e.isActive).length,
        inactive: employees.filter(e => e.branch?.id === parseInt(selectedBranch) && !e.isActive).length
    } : stats;

    // Get initial from name
    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;

        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }

        if (imageUrl.startsWith('/')) {
            return `${API_BASE_URL}${imageUrl}`;
        }

        return `${API_BASE_URL}/${imageUrl}`;
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '400px',
                color: 'var(--color-text-secondary)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid var(--color-border)',
                        borderTop: '4px solid var(--color-primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <div>
                        <h2 style={{
                            fontSize: '32px',
                            fontWeight: '800',
                            marginBottom: '8px',
                            background: 'linear-gradient(135deg, var(--color-primary-light))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px'
                        }}>
                            Quản lý Nhân viên
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                            {selectedBranch === 'all'
                                ? 'Quản lý thông tin và phân quyền nhân viên toàn hệ thống'
                                : `Chi nhánh: ${branches.find(b => b.id === parseInt(selectedBranch))?.name || 'Đang tải...'}`
                            }
                        </p>
                    </div>
                    <button
                        onClick={openAdd}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                            color: '#000',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Users size={18} />
                        Thêm nhân viên
                    </button>
                </div>

                {/* Bộ lọc chi nhánh */}
                <div className={styles.card} style={{ marginBottom: '20px', padding: '20px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        <Building2 size={20} color="var(--color-primary)" />
                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            margin: 0,
                            color: 'var(--color-text-secondary)'
                        }}>
                            Lọc theo Chi nhánh
                        </h4>
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={() => setSelectedBranch('all')}
                            style={{
                                padding: '10px 20px',
                                background: selectedBranch === 'all'
                                    ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                                    : 'var(--color-bg-secondary)',
                                color: selectedBranch === 'all' ? '#000' : 'var(--color-text-secondary)',
                                border: selectedBranch === 'all'
                                    ? 'none'
                                    : '1px solid var(--color-border)',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedBranch !== 'all') {
                                    e.currentTarget.style.background = 'var(--color-bg-hover)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedBranch !== 'all') {
                                    e.currentTarget.style.background = 'var(--color-bg-secondary)';
                                }
                            }}
                        >
                            <Users size={16} />
                            Tất cả chi nhánh ({employees.length})
                        </button>
                        {branches.map(branch => {
                            const empCount = employees.filter(e => e.branch?.id === branch.id).length;
                            return (
                                <button
                                    key={branch.id}
                                    onClick={() => setSelectedBranch(branch.id.toString())}
                                    style={{
                                        padding: '10px 20px',
                                        background: selectedBranch === branch.id.toString()
                                            ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                                            : 'var(--color-bg-secondary)',
                                        color: selectedBranch === branch.id.toString() ? '#000' : 'var(--color-text-secondary)',
                                        border: selectedBranch === branch.id.toString()
                                            ? 'none'
                                            : '1px solid var(--color-border)',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedBranch !== branch.id.toString()) {
                                            e.currentTarget.style.background = 'var(--color-bg-hover)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedBranch !== branch.id.toString()) {
                                            e.currentTarget.style.background = 'var(--color-bg-secondary)';
                                        }
                                    }}
                                >
                                    <Building2 size={16} />
                                    {branch.name} ({empCount})
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div
                        className={styles.card}
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: filter === 'all' ? 'rgba(212, 175, 55, 0.1)' : ''
                        }}
                        onClick={() => setFilter('all')}
                        onMouseEnter={(e) => {
                            if (filter !== 'all') e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                    {selectedBranch === 'all' ? 'Tổng nhân viên' : 'Nhân viên chi nhánh'}
                                </p>
                                <h3 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#3B82F6' }}>
                                    {branchStats.total}
                                </h3>
                            </div>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Users size={24} color="#3B82F6" />
                            </div>
                        </div>
                    </div>

                    <div
                        className={styles.card}
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: filter === 'active' ? 'rgba(16, 185, 129, 0.1)' : ''
                        }}
                        onClick={() => setFilter('active')}
                        onMouseEnter={(e) => {
                            if (filter !== 'active') e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                    Đang hoạt động
                                </p>
                                <h3 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#10B981' }}>
                                    {branchStats.active}
                                </h3>
                            </div>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <UserCheck size={24} color="#10B981" />
                            </div>
                        </div>
                    </div>

                    <div
                        className={styles.card}
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: filter === 'inactive' ? 'rgba(239, 68, 68, 0.1)' : ''
                        }}
                        onClick={() => setFilter('inactive')}
                        onMouseEnter={(e) => {
                            if (filter !== 'inactive') e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                    Ngưng hoạt động
                                </p>
                                <h3 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#EF4444' }}>
                                    {branchStats.inactive}
                                </h3>
                            </div>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <UserX size={24} color="#EF4444" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={styles['table-wrapper']}>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '280px' }}>Nhân viên</th>
                            <th style={{ width: '220px' }}>Email</th>
                            <th style={{ width: '150px' }}>Số điện thoại</th>
                            <th style={{ width: '180px' }}>Chi nhánh</th>
                            <th style={{ width: '120px' }}>Vị trí</th>
                            <th style={{ width: '130px' }}>Trạng thái</th>
                            <th style={{ width: '150px' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                    <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                    <p style={{ color: 'var(--color-text-secondary)' }}>
                                        {selectedBranch !== 'all'
                                            ? `Không có nhân viên ${filter === 'active' ? 'đang hoạt động' : filter === 'inactive' ? 'ngưng hoạt động' : ''} tại chi nhánh này`
                                            : filter === 'all'
                                                ? 'Chưa có nhân viên nào'
                                                : `Không có nhân viên ${filter === 'active' ? 'đang hoạt động' : 'ngưng hoạt động'}`
                                        }
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filteredEmployees.map(emp => {
                                const staffInfo = staffMap[emp.id] || null;
                                const posInfo = POSITION_MAP[staffInfo?.position];
                                return (
                                    <React.Fragment key={emp.id}>
                                        <tr>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {emp.imageUrl ? (
                                                        <div
                                                            style={{
                                                                width: '44px',
                                                                height: '44px',
                                                                borderRadius: '12px',
                                                                overflow: 'hidden',
                                                                flexShrink: 0,
                                                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <img
                                                                src={getImageUrl(emp.imageUrl)}
                                                                alt={emp.fullName || emp.username}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover'
                                                                }}
                                                                onError={(e) => {
                                                                    console.error('Image load error:', emp.imageUrl);
                                                                    const parent = e.target.parentElement;
                                                                    e.target.style.display = 'none';
                                                                    const span = document.createElement('span');
                                                                    span.style.fontWeight = '700';
                                                                    span.style.fontSize = '14px';
                                                                    span.style.color = '#000';
                                                                    span.textContent = getInitials(emp.fullName || emp.username);
                                                                    parent.appendChild(span);
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                width: '44px',
                                                                height: '44px',
                                                                borderRadius: '12px',
                                                                flexShrink: 0,
                                                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontWeight: '700',
                                                                    fontSize: '14px',
                                                                    color: '#000'
                                                                }}
                                                            >
                                                                {getInitials(emp.fullName || emp.username)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: '600', marginBottom: '2px', color: 'var(--color-text-secondary)' }}>
                                                            {emp.fullName || emp.username}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '12px',
                                                            color: 'var(--color-text-secondary)'
                                                        }}>
                                                            ID: {emp.id}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Mail size={16} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                                                    <span style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {emp.email || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Phone size={16} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                                                    <span>{emp.phone || '-'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Building2 size={16} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                                                    <span style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {emp.branch?.name || 'Chưa phân công'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                {emp.role === 'MANAGER' ? (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
                                                        <Briefcase size={14} /> Quản lý
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={e => setExpandedEmpId(prev => prev === emp.id ? null : emp.id)}
                                                        title="Click để xem / sửa chức vụ"
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            padding: '6px 10px',
                                                            background: posInfo ? posInfo.bg : 'rgba(107,114,128,0.1)',
                                                            color: posInfo ? posInfo.color : '#6B7280',
                                                            border: `1px solid ${posInfo ? posInfo.color + '40' : 'rgba(107,114,128,0.3)'}`,
                                                            borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                                                            cursor: 'pointer', transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                        onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                    >
                                                        <span>{posInfo ? posInfo.label : 'Chưa có'}</span>
                                                        <ChevronDown size={12} />
                                                    </button>
                                                )}
                                            </td>
                                            <td>
                                                <span className={emp.isActive ? styles['badge-green'] : styles['badge-red']}>
                                                    {emp.isActive ? 'Hoạt động' : 'Ngưng'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => openEdit('Employee', emp, fetchEmployees)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            background: 'rgba(59, 130, 246, 0.1)',
                                                            color: '#3B82F6',
                                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                                        }}
                                                        title="Sửa thông tin"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(emp.id, emp.fullName || emp.username)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            color: '#EF4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                        }}
                                                        title="Xóa nhân viên"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Row accordion chức vụ */}
                                        {
                                            expandedEmpId === emp.id && emp.role !== 'MANAGER' && (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: 0, background: 'rgba(139,92,246,0.04)' }}>
                                                        <div style={{
                                                            padding: '16px 24px',
                                                            borderTop: '1px solid rgba(139,92,246,0.2)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '16px',
                                                            animation: 'slideInUp 0.2s ease'
                                                        }}>
                                                            {/* Chức vụ hiện tại */}
                                                            {posInfo ? (
                                                                <div style={{
                                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                                    padding: '10px 16px',
                                                                    background: posInfo.bg,
                                                                    border: `1px solid ${posInfo.color}40`,
                                                                    borderRadius: '10px'
                                                                }}>
                                                                    <div style={{ fontWeight: '700', color: posInfo.color, fontSize: '14px' }}>
                                                                        {posInfo.label}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                                                        Chức vụ hiện tại
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{
                                                                    padding: '10px 16px',
                                                                    background: 'rgba(107,114,128,0.1)',
                                                                    borderRadius: '10px',
                                                                    fontSize: '13px',
                                                                    color: 'var(--color-text-secondary)'
                                                                }}>
                                                                    Chưa được gán chức vụ
                                                                </div>
                                                            )}

                                                            {/* Nút sửa/gán */}
                                                            <button
                                                                onClick={() => {
                                                                    setPositionForm({ emp, staffInfo: staffMap[emp.id] || null });
                                                                    setExpandedEmpId(null);
                                                                }}
                                                                style={{
                                                                    padding: '9px 18px', borderRadius: '10px',
                                                                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                                                    color: '#fff', border: 'none', fontWeight: '600',
                                                                    fontSize: '13px', cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                                    transition: 'transform 0.15s'
                                                                }}
                                                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                            >
                                                                <Edit2 size={14} />
                                                                {staffMap[emp.id] ? 'Sửa chức vụ' : 'Gán chức vụ'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }
                                    </React.Fragment>
                                );

                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Form sửa/gán chức vụ */}
            {positionForm && (
                <StaffPositionForm
                    employee={positionForm.emp}
                    staffInfo={positionForm.staffInfo}
                    closeForm={() => setPositionForm(null)}
                    onSave={() => { fetchEmployees(); setPositionForm(null); }}
                />
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}