import React, { useEffect, useState } from 'react';
import { Users, Calendar, Clock, Search, CalendarPlus, AlertCircle, RefreshCw, Store, Edit2, Mail, Phone, UserCheck, ChevronDown, ChevronUp, X, Save, CheckCircle } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';


const POSITION_MAP = {
    WAITER: { label: 'Phục vụ', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    CHEF: { label: 'Bếp', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    CASHIER: { label: 'Thu ngân', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    STOCK: { label: 'Kho', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
};
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
    const [staffMap, setStaffMap] = useState({});
    const [shiftTemplates, setShiftTemplates] = useState([]);
    const [staffList, setStaffList] = useState([]);

    // State cho modal phân ca
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({
        staffId: '',
        shiftId: '',
        workDay: new Date().toISOString().split('T')[0],
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [editForm, setEditForm] = useState({
        shiftId: '',
        workDay: '',
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

    const fetchStaffInfo = async (empList) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/staff/branch/${currentBranch.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const staffList = await res.json();
            const map = {};
            staffList.forEach(staff => {
                if (staff?.userId) {
                    map[staff.userId] = { id: staff.id, position: staff.position };
                }
            });
            setStaffMap(map);
        } catch (err) {
            console.error('Lỗi lấy staff info:', err);
        }
    };

    const fetchStaffList = async () => {
        if (!currentBranch?.id) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/staff/branch/${currentBranch.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            setStaffList(data);

            const map = {};
            data.forEach(s => {
                if (s?.userId) map[s.userId] = { id: s.id, position: s.position };
            });
            setStaffMap(map);
        } catch (err) {
            console.error('Lỗi lấy staff list:', err);
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
            await fetchStaffInfo(branchEmployees);
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
            const staffRes = await fetch(
                `${API_BASE_URL}/api/staff/branch/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const staffList = await staffRes.json();

            const shiftRes = await fetch(
                `${API_BASE_URL}/api/staff-shifts/date?date=${selectedDate}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const allShifts = await shiftRes.json();

            const staffIds = new Set(staffList.map(s => s.id));
            const branchShifts = allShifts.filter(ss => staffIds.has(ss.staff?.id));

            setWorkShifts(branchShifts);
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Không thể tải ca làm việc.');
        } finally {
            setLoading(false);
        }
    };

    const fetchShiftTemplates = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/shifts`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShiftTemplates(data);
    };

    // Xử lý phân ca
    const handleAssignShift = async (e) => {
        e.preventDefault();
        if (!assignForm.staffId || !assignForm.shiftId) {
            alert('Vui lòng chọn nhân viên và ca làm việc!');
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                staffId: assignForm.staffId,
                shiftId: assignForm.shiftId,
                workDay: assignForm.workDay,
            });
            const response = await fetch(
                `${API_BASE_URL}/api/staff-shifts?${params}`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (!response.ok) {
                const msg = await response.text();
                throw new Error(msg || 'Phân ca thất bại');
            }
            alert('Phân ca thành công!');
            setShowAssignModal(false);
            fetchWorkShifts();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };
    const handleOpenEditModal = (shift) => {
        setEditingShift(shift);
        setEditForm({
            shiftId: shift.shift?.id || '',
            workDay: shift.workDay || selectedDate,
        });
        setShowEditModal(true);
    };

    const handleUpdateShift = async (e) => {
        e.preventDefault();
        if (!editForm.shiftId || !editForm.workDay) {
            alert('Vui lòng chọn ca làm việc và ngày!');
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                shiftId: editForm.shiftId,
                workDay: editForm.workDay,
            });
            const response = await fetch(
                `${API_BASE_URL}/api/staff-shifts/${editingShift.id}?${params}`,
                {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (!response.ok) {
                const msg = await response.text();
                throw new Error(msg || 'Cập nhật thất bại');
            }
            alert('Cập nhật ca thành công!');
            setShowEditModal(false);
            fetchWorkShifts();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentBranch();
    }, []);

    useEffect(() => {
        if (!currentBranch) return;
        fetchShiftTemplates();
        fetchStaffList();
        if (activeTab === 'employees') {
            fetchBranchEmployees();
        } else {
            fetchWorkShifts();
        }
    }, [currentBranch, activeTab]);

    useEffect(() => {
        if (!currentBranch || activeTab !== 'shifts') return;
        fetchWorkShifts();
    }, [selectedDate]);

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

    const filteredShifts = workShifts.filter(shift => shift.workDay === selectedDate);

    const groupedShifts = filteredShifts.reduce((acc, ss) => {
        const key = ss.shift?.id;
        if (!acc[key]) acc[key] = { shift: ss.shift, items: [] };
        acc[key].items.push(ss);
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
                                                    {(() => {
                                                        const staffInfo = staffMap[emp.id];
                                                        const posInfo = staffInfo ? POSITION_MAP[staffInfo.position] : null;
                                                        return posInfo ? (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '4px 12px',
                                                                background: posInfo.bg,
                                                                color: posInfo.color,
                                                                borderRadius: '8px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                border: `1px solid ${posInfo.color}40`
                                                            }}>
                                                                {posInfo.label}
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '4px 12px',
                                                                background: 'rgba(107,114,128,0.1)',
                                                                color: '#6B7280',
                                                                borderRadius: '8px',
                                                                fontSize: '12px',
                                                                fontWeight: '600'
                                                            }}>
                                                                Chưa có
                                                            </span>
                                                        );
                                                    })()}
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
                                {Object.entries(groupedShifts).map(([shiftId, { shift, items }]) => {
                                    const isExpanded = expandedShift === shiftId;
                                    return (
                                        <div key={shiftId} className={styles.shiftCard}>
                                            <div
                                                className={styles.shiftHeader}
                                                onClick={() => setExpandedShift(isExpanded ? null : shiftId)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className={styles.statIcon} style={{ width: '40px', height: '40px' }}>
                                                        <Clock size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                                                            {shift?.name} — {shift?.startTime} - {shift?.endTime}
                                                        </h3>
                                                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                                                            {items.length} nhân viên
                                                        </p>
                                                    </div>
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>

                                            {isExpanded && (
                                                <div className={styles.shiftContent}>
                                                    {items.map(ss => (
                                                        <div key={ss.id} className={styles.shiftItem}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    {ss.staff?.user?.imageUrl ? (
                                                                        <img
                                                                            src={getImageUrl(ss.staff.user.imageUrl)}
                                                                            alt={ss.staff.user.fullName}
                                                                            className={styles.productImage}
                                                                            style={{ width: '40px', height: '40px' }}
                                                                        />
                                                                    ) : (
                                                                        <div className={styles.productImagePlaceholder} style={{ width: '40px', height: '40px' }}>
                                                                            <span style={{ fontWeight: '700', fontSize: '12px' }}>
                                                                                {getInitials(ss.staff?.user?.fullName || 'U')}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div style={{ fontWeight: '600' }}>
                                                                            {ss.staff?.user?.fullName || ss.staff?.user?.username || 'N/A'}
                                                                        </div>
                                                                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                                            {ss.staff?.position
                                                                                ? (POSITION_MAP[ss.staff.position]?.label || ss.staff.position)
                                                                                : '—'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenEditModal(ss); }}
                                                                    className={styles.primaryButton}
                                                                    title="Sửa ca làm việc"
                                                                >
                                                                    <Edit2 size={18} /> Sửa ca
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
                                    value={assignForm.staffId}
                                    onChange={(e) => setAssignForm({ ...assignForm, staffId: e.target.value })}
                                    className={styles.formInput}
                                    required
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {staffList
                                        .filter(s => s.status !== 'INACTIVE')
                                        .map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.fullName || s.username} — {POSITION_MAP[s.position]?.label || s.position}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Chọn ca (template) */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ca làm việc *</label>
                                <select
                                    value={assignForm.shiftId}
                                    onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
                                    className={styles.formInput}
                                    required
                                >
                                    <option value="">-- Chọn ca --</option>
                                    {shiftTemplates.map(sh => (
                                        <option key={sh.id} value={sh.id}>
                                            {sh.name} ({sh.startTime} - {sh.endTime})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Ngày làm */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ngày làm việc *</label>
                                <input
                                    type="date"
                                    value={assignForm.workDay}
                                    onChange={(e) => setAssignForm({ ...assignForm, workDay: e.target.value })}
                                    className={styles.formInput}
                                    required
                                />
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
                            <h3 className={styles.modalTitle}><Edit2 size={24} /> Chỉnh sửa ca làm việc</h3>
                            <button onClick={() => setShowEditModal(false)} className={styles.modalClose}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* Hiển thị tên nhân viên (readonly) */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Nhân viên</label>
                                <input
                                    type="text"
                                    value={editingShift.staff?.user?.fullName || editingShift.staff?.user?.username || ''}
                                    className={styles.formInput}
                                    disabled
                                />
                            </div>

                            {/* Đổi ca */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ca làm việc *</label>
                                <select
                                    value={editForm.shiftId}
                                    onChange={(e) => setEditForm({ ...editForm, shiftId: e.target.value })}
                                    className={styles.formInput}
                                    required
                                >
                                    <option value="">-- Chọn ca --</option>
                                    {shiftTemplates.map(sh => (
                                        <option key={sh.id} value={sh.id}>
                                            {sh.name} ({sh.startTime} - {sh.endTime})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Đổi ngày */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ngày làm việc *</label>
                                <input
                                    type="date"
                                    value={editForm.workDay}
                                    onChange={(e) => setEditForm({ ...editForm, workDay: e.target.value })}
                                    className={styles.formInput}
                                    required
                                />
                            </div>

                            <div style={{
                                padding: '12px', backgroundColor: 'var(--color-warning-light)',
                                borderRadius: '8px', marginTop: '16px'
                            }}>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-warning-dark)' }}>
                                    <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                    Lưu ý: Chỉ có thể đổi ca hoặc ngày, không thể đổi nhân viên ở đây
                                </p>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button type="button" onClick={() => setShowEditModal(false)} className={styles.secondaryButton}>
                                Hủy
                            </button>
                            <button type="button" onClick={handleUpdateShift} className={styles.primaryButton} disabled={loading}>
                                <Save size={18} /> {loading ? 'Đang lưu...' : 'Cập nhật'}
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