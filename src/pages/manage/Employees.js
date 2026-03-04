import React, { useEffect, useState } from 'react';
import { Users, Calendar, Clock, Search, CalendarPlus, AlertCircle, RefreshCw, Store, Edit2, Mail, Phone, UserCheck, ChevronDown, ChevronUp, X, Save, CheckCircle } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function BranchEmployeesManager() {
    const [employees, setEmployees] = useState([]);
    const [workShifts, setWorkShifts] = useState([]);
    const [currentBranch, setCurrentBranch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('employees');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedShift, setExpandedShift] = useState(null);

    // State cho modal phân ca
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({
        userId: '',
        shiftDate: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '17:00',
        role: 'EMPLOYEE'
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [editForm, setEditForm] = useState({
        shiftDate: '',
        startTime: '',
        endTime: '',
        role: '',
        userId: ''
    });

    const API_BASE_URL = 'http://localhost:8080';

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

    const fetchBranchEmployees = async () => {
        if (!currentBranch?.id) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể tải danh sách nhân viên');
            const data = await response.json();
            const branchEmployees = data.filter(user =>
                (user.role === 'EMPLOYEE' || user.role === 'KITCHEN') &&
                user.branch?.id === currentBranch.id
            );
            setEmployees(branchEmployees);
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Không thể tải danh sách nhân viên.');
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkShifts = async () => {
        if (!currentBranch?.id) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/work-shifts/branch/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error('Không thể tải ca làm việc');
            const data = await response.json();
            setWorkShifts(data);
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Không thể tải ca làm việc.');
        } finally {
            setLoading(false);
        }
    };

    // Xử lý phân ca
    const handleAssignShift = async (e) => {
        e.preventDefault();
        if (!assignForm.userId || !currentBranch?.id) {
            alert('Vui lòng chọn nhân viên!');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/work-shifts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user: { id: parseInt(assignForm.userId) },
                    branch: { id: currentBranch.id },
                    shiftDate: assignForm.shiftDate,
                    startTime: assignForm.startTime,
                    endTime: assignForm.endTime,
                    role: assignForm.role
                })
            });

            if (!response.ok) throw new Error('Phân ca thất bại');

            alert('Phân ca thành công!');
            setShowAssignModal(false);
            setAssignForm({
                userId: '',
                shiftDate: new Date().toISOString().split('T')[0],
                startTime: '08:00',
                endTime: '17:00',
                role: 'EMPLOYEE'
            });
            fetchWorkShifts();
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Không thể phân ca. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditModal = (shift) => {
        setEditingShift(shift);
        setEditForm({
            shiftDate: shift.shiftDate,
            startTime: shift.startTime,
            endTime: shift.endTime,
            role: shift.role,
            userId: shift.user?.id || ''
        });
        setShowEditModal(true);
    };

    const handleUpdateShift = async (e) => {
        e.preventDefault();
        if (!editingShift) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/work-shifts/${editingShift.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    shiftDate: editForm.shiftDate,
                    startTime: editForm.startTime,
                    endTime: editForm.endTime,
                    role: editForm.role,
                    user: { id: parseInt(editForm.userId) },
                    branch: { id: currentBranch.id }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Cập nhật ca thất bại');
            }

            alert('Cập nhật ca làm việc thành công!');
            setShowEditModal(false);
            setEditingShift(null);
            fetchWorkShifts();
        } catch (error) {
            console.error('Lỗi:', error);
            alert(error.message || 'Không thể cập nhật ca làm việc. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentBranch();
    }, []);

    useEffect(() => {
        if (currentBranch) {
            if (activeTab === 'employees') {
                fetchBranchEmployees();
            } else {
                fetchWorkShifts();
            }
        }
    }, [currentBranch, activeTab]);

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
        if (imageUrl.startsWith('/')) return `${API_BASE_URL}${imageUrl}`;
        return `${API_BASE_URL}/${imageUrl}`;
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.phone?.includes(searchTerm);
        const matchesFilter = filterStatus === 'all' ? true :
            filterStatus === 'active' ? emp.isActive : !emp.isActive;
        return matchesSearch && matchesFilter;
    });

    const filteredShifts = workShifts.filter(shift => shift.shiftDate === selectedDate);

    const groupedShifts = filteredShifts.reduce((acc, shift) => {
        const timeKey = `${shift.startTime}-${shift.endTime}`;
        if (!acc[timeKey]) acc[timeKey] = [];
        acc[timeKey].push(shift);
        return acc;
    }, {});

    const stats = {
        total: employees.length,
        active: employees.filter(e => e.isActive).length,
        inactive: employees.filter(e => !e.isActive).length,
        todayShifts: filteredShifts.length
    };

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
                        <h2 className={styles.pageTitle}>Quản lý Nhân viên & Ca làm</h2>
                        <p className={styles.branchInfo}>
                            <Store size={16} />
                            <span className={styles.branchName}>{currentBranch.name}</span>
                            {currentBranch.address && (
                                <span className={styles.branchAddress}>• {currentBranch.address}</span>
                            )}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        {activeTab === 'shifts' && (
                            <button
                                onClick={() => setShowAssignModal(true)}
                                className={styles.primaryButton}
                            >
                                <CalendarPlus size={18} />
                                Phân ca
                            </button>
                        )}
                        <button
                            onClick={() => activeTab === 'employees' ? fetchBranchEmployees() : fetchWorkShifts()}
                            disabled={loading}
                            className={`${styles.refreshButton} ${loading ? styles.refreshButtonDisabled : ''}`}
                        >
                            <RefreshCw size={18} className={loading ? styles.spinIcon : ''} />
                            Làm mới
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.active}</div>
                            <div className={styles.statLabel}>Đang hoạt động</div>
                        </div>
                    </div>

                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <Users size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.total}</div>
                            <div className={styles.statLabel}>Tổng nhân viên</div>
                        </div>
                    </div>

                    <div className={styles.statCardDanger}>
                        <div className={styles.statIcon}>
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.todayShifts}</div>
                            <div className={styles.statLabel}>Ca hôm nay</div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className={styles.filterBar}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setActiveTab('employees')}
                            className={activeTab === 'employees' ? styles.tabActive : styles.tabInactive}
                        >
                            <Users size={18} />
                            Nhân viên
                        </button>
                        <button
                            onClick={() => setActiveTab('shifts')}
                            className={activeTab === 'shifts' ? styles.tabActive : styles.tabInactive}
                        >
                            <Calendar size={18} />
                            Ca làm việc
                        </button>
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={activeTab === 'attendance' ? styles.tabActive : styles.tabInactive}
                        >
                            <CheckCircle size={18} />
                            Chấm công
                        </button>
                    </div>
                </div>
            </div>

            {/* EMPLOYEES TAB */}
            {activeTab === 'employees' && (
                <>
                    <div className={styles.headerCard} style={{ marginTop: '16px' }}>
                        <div className={styles.filterBar}>
                            <div className={styles.searchBox}>
                                <Search size={20} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm nhân viên..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={styles.searchInput}
                                />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className={styles.filterSelect}
                                style={{
                                    padding: '12px 16px',
                                    background: 'var(--color-bg-dark)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '12px',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'all 0.2s ease',
                                    minWidth: '150px'
                                }}
                            >
                                <option value="all">Tất cả</option>
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Ngưng hoạt động</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.tableCard}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Nhân viên</th>
                                        <th>Email</th>
                                        <th>Số điện thoại</th>
                                        <th className={styles.textCenter}>Vị trí</th>
                                        <th className={styles.textCenter}>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className={styles.emptyState}>
                                                <Users size={48} className={styles.emptyIcon} />
                                                <p>Không tìm thấy nhân viên nào</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEmployees.map(emp => (
                                            <tr key={emp.id}>
                                                <td>
                                                    <div className={styles.productCell}>
                                                        {emp.imageUrl ? (
                                                            <img
                                                                src={getImageUrl(emp.imageUrl)}
                                                                alt={emp.fullName}
                                                                className={styles.productImage}
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.nextSibling.style.display = 'flex';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div
                                                            className={styles.productImagePlaceholder}
                                                            style={{ display: emp.imageUrl ? 'none' : 'flex' }}
                                                        >
                                                            <span style={{ fontWeight: '700', fontSize: '14px' }}>
                                                                {getInitials(emp.fullName || emp.username)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className={styles.productName}>
                                                                {emp.fullName || emp.username}
                                                            </span>
                                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                                ID: {emp.id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Mail size={16} style={{ color: 'var(--color-text-secondary)' }} />
                                                        {emp.email || '-'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Phone size={16} style={{ color: 'var(--color-text-secondary)' }} />
                                                        {emp.phone || '-'}
                                                    </div>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <span className={styles.badgePrimary}>{emp.role}</span>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <span className={emp.isActive ? styles.badgeSuccess : styles.badgeInactive}>
                                                        {emp.isActive ? 'Hoạt động' : 'Ngưng'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* SHIFTS TAB */}
            {activeTab === 'shifts' && (
                <>
                    <div className={styles.headerCard} style={{ marginTop: '16px' }}>
                        <div className={styles.filterBar}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Calendar size={20} style={{ color: 'var(--color-text-secondary)' }} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className={styles.filterSelect}
                                    style={{ width: 'auto' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.tableCard}>
                        {Object.keys(groupedShifts).length === 0 ? (
                            <div className={styles.emptyState} style={{ padding: '60px 20px' }}>
                                <Clock size={48} className={styles.emptyIcon} />
                                <p>Không có ca làm việc nào trong ngày này</p>
                            </div>
                        ) : (
                            <div style={{ padding: '20px' }}>
                                {Object.entries(groupedShifts).map(([timeKey, shifts]) => {
                                    const [startTime, endTime] = timeKey.split('-');
                                    const isExpanded = expandedShift === timeKey;
                                    return (
                                        <div key={timeKey} className={styles.shiftCard}>
                                            <div
                                                className={styles.shiftHeader}
                                                onClick={() => setExpandedShift(isExpanded ? null : timeKey)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className={styles.statIcon} style={{ width: '40px', height: '40px' }}>
                                                        <Clock size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                                                            {startTime} - {endTime}
                                                        </h3>
                                                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                                                            {shifts.length} nhân viên
                                                        </p>
                                                    </div>
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>

                                            {isExpanded && (
                                                <div className={styles.shiftContent}>
                                                    {shifts.map((shift) => (
                                                        <div key={shift.id} className={styles.shiftItem}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    {shift.user?.imageUrl ? (
                                                                        <img
                                                                            src={getImageUrl(shift.user.imageUrl)}
                                                                            alt={shift.user.fullName}
                                                                            className={styles.productImage}
                                                                            style={{ width: '40px', height: '40px' }}
                                                                        />
                                                                    ) : (
                                                                        <div className={styles.productImagePlaceholder} style={{ width: '40px', height: '40px' }}>
                                                                            <span style={{ fontWeight: '700', fontSize: '12px' }}>
                                                                                {getInitials(shift.user?.fullName || 'U')}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div style={{ fontWeight: '600' }}>
                                                                            {shift.user?.fullName || shift.user?.username || 'N/A'}
                                                                        </div>
                                                                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                                            {shift.role}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenEditModal(shift);
                                                                    }}
                                                                    className={styles.primaryButton}
                                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'}
                                                                    title="Sửa ca làm việc"
                                                                >
                                                                    <Edit2 size={18} />
                                                                    Sửa ca làm việc
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
                <>
                    <div className={styles.headerCard} style={{ marginTop: '16px' }}>
                        <div className={styles.filterBar}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Calendar size={20} style={{ color: 'var(--color-text-secondary)' }} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className={styles.filterSelect}
                                    style={{ width: 'auto' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.tableCard}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Nhân viên</th>
                                        <th className={styles.textCenter}>Ca làm</th>
                                        <th className={styles.textCenter}>Vị trí</th>
                                        <th className={styles.textCenter}>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredShifts.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className={styles.emptyState}>
                                                <CheckCircle size={48} className={styles.emptyIcon} />
                                                <p>Không có ca làm việc nào trong ngày này</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredShifts.map(shift => (
                                            <tr key={shift.id}>
                                                <td>
                                                    <div className={styles.productCell}>
                                                        {shift.user?.imageUrl ? (
                                                            <img
                                                                src={getImageUrl(shift.user.imageUrl)}
                                                                alt={shift.user.fullName}
                                                                className={styles.productImage}
                                                            />
                                                        ) : (
                                                            <div className={styles.productImagePlaceholder}>
                                                                <span style={{ fontWeight: '700', fontSize: '14px' }}>
                                                                    {getInitials(shift.user?.fullName || 'U')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <span className={styles.productName}>
                                                            {shift.user?.fullName || shift.user?.username || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <Clock size={16} style={{ color: 'var(--color-text-secondary)' }} />
                                                        {shift.startTime} - {shift.endTime}
                                                    </div>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <span className={styles.badgePrimary}>{shift.role}</span>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <span className={styles.badgeSuccess}>Có mặt</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL PHÂN CA */}
            {showAssignModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                <CalendarPlus size={24} />
                                Phân ca làm việc
                            </h3>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className={styles.modalClose}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Nhân viên *</label>
                                <select
                                    value={assignForm.userId}
                                    onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                                    className={styles.formInput}
                                    required
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {employees.filter(e => e.isActive).map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.fullName || emp.username} ({emp.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ngày làm việc *</label>
                                <input
                                    type="date"
                                    value={assignForm.shiftDate}
                                    onChange={(e) => setAssignForm({ ...assignForm, shiftDate: e.target.value })}
                                    className={styles.formInput}
                                    required
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Giờ bắt đầu *</label>
                                    <input
                                        type="time"
                                        value={assignForm.startTime}
                                        onChange={(e) => setAssignForm({ ...assignForm, startTime: e.target.value })}
                                        className={styles.formInput}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Giờ kết thúc *</label>
                                    <input
                                        type="time"
                                        value={assignForm.endTime}
                                        onChange={(e) => setAssignForm({ ...assignForm, endTime: e.target.value })}
                                        className={styles.formInput}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Vị trí *</label>
                                <select
                                    value={assignForm.role}
                                    onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
                                    className={styles.formInput}
                                    required
                                >
                                    <option value="EMPLOYEE">Nhân viên phục vụ</option>
                                    <option value="KITCHEN">Nhân viên bếp</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                type="button"
                                onClick={() => setShowAssignModal(false)}
                                className={styles.secondaryButton}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                onClick={handleAssignShift}
                                className={styles.primaryButton}
                                disabled={loading}
                            >
                                <Save size={18} />
                                {loading ? 'Đang lưu...' : 'Phân ca'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL SỬA CA */}
            {showEditModal && editingShift && (
                <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                <Edit2 size={24} />
                                Chỉnh sửa ca làm việc
                            </h3>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className={styles.modalClose}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Nhân viên *</label>
                                <select
                                    value={editForm.userId}
                                    onChange={(e) => setEditForm({ ...editForm, userId: e.target.value })}
                                    className={styles.formInput}
                                    required
                                    disabled={editingShift.status !== 'SCHEDULED'}
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {employees.filter(e => e.isActive).map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.fullName || emp.username} ({emp.role})
                                        </option>
                                    ))}
                                </select>
                                {editingShift.status !== 'SCHEDULED' && (
                                    <small style={{ color: 'var(--color-warning)', fontSize: '12px', marginTop: '4px' }}>
                                        * Chỉ có thể đổi nhân viên khi ca chưa bắt đầu
                                    </small>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ngày làm việc *</label>
                                <input
                                    type="date"
                                    value={editForm.shiftDate}
                                    onChange={(e) => setEditForm({ ...editForm, shiftDate: e.target.value })}
                                    className={styles.formInput}
                                    required
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Giờ bắt đầu *</label>
                                    <input
                                        type="time"
                                        value={editForm.startTime}
                                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                                        className={styles.formInput}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Giờ kết thúc *</label>
                                    <input
                                        type="time"
                                        value={editForm.endTime}
                                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                                        className={styles.formInput}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Vị trí *</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className={styles.formInput}
                                    required
                                >
                                    <option value="EMPLOYEE">Nhân viên phục vụ</option>
                                    <option value="KITCHEN">Nhân viên bếp</option>
                                </select>
                            </div>

                            <div style={{
                                padding: '12px',
                                backgroundColor: 'var(--color-warning-light)',
                                borderRadius: '8px',
                                marginTop: '16px'
                            }}>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-warning-dark)' }}>
                                    <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                    Lưu ý: Không thể sửa ca đã hoàn thành
                                </p>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className={styles.secondaryButton}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                onClick={handleUpdateShift}
                                className={styles.primaryButton}
                                disabled={loading}
                            >
                                <Save size={18} />
                                {loading ? 'Đang lưu...' : 'Cập nhật'}
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