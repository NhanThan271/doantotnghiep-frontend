import React, { useEffect, useState } from 'react';
import { Users, Calendar, Clock, Search, CalendarPlus, AlertCircle, RefreshCw, Store, Edit2, Mail, Phone, Briefcase, UserCheck, ChevronDown, ChevronUp, X, Save, CheckCircle, ClipboardList, BarChart3, FileText, UserX } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';
import StaffPositionForm from './forms/StaffPositionForm';
import { showToast } from '../../hooks/useToast';


const POSITION_MAP = {
    WAITER: { label: 'Phục vụ', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    CHEF: { label: 'Bếp', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    CASHIER: { label: 'Thu ngân', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    STOCK: { label: 'Kho', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
};
export default function BranchEmployeesManager({ openAdd, openEdit, openDelete }) {
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
    const [weekShifts, setWeekShifts] = useState([]);
    const [positionForm, setPositionForm] = useState(null);

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

    const [shiftsSubTab, setShiftsSubTab] = useState('schedule');
    const [shiftSchedules, setShiftSchedules] = useState([]);
    const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        workDay: new Date().toISOString().split('T')[0],
        shiftId: '',
        requiredStaff: 1,
        maxStaff: 10,
        branchId: null,
    });

    const [attendanceSubTab, setAttendanceSubTab] = useState('overview');
    const [selectedStaffForAttendance, setSelectedStaffForAttendance] = useState('');
    const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
    const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());
    const [monthlyReport, setMonthlyReport] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

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

    const getWeekDays = (dateStr) => {
        const date = new Date(dateStr);
        const day = date.getDay();
        const monday = new Date(date);
        monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d.toISOString().split('T')[0];
        });
    };

    const fetchWorkShifts = async (date = selectedDate) => {
        if (!currentBranch?.id) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const staffRes = await fetch(
                `${API_BASE_URL}/api/staff/branch/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const staffListData = await staffRes.json();
            const staffIds = new Set(staffListData.map(s => s.id));

            const shiftRes = await fetch(
                `${API_BASE_URL}/api/staff-shifts/date?date=${date}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const allShifts = await shiftRes.json();
            const branchShifts = allShifts.filter(ss => staffIds.has(ss.staff?.id));
            setWorkShifts(branchShifts);
        } catch (error) {
            console.error('Lỗi:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkShiftsForWeek = async (date = selectedDate) => {
        if (!currentBranch?.id) return;
        try {
            const token = localStorage.getItem('token');

            const d = new Date(date);
            const day = d.getDay();
            const monday = new Date(d);
            monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
            const startDate = monday.toISOString().split('T')[0];

            const res = await fetch(
                `${API_BASE_URL}/api/staff-shifts/manager/week?branchId=${currentBranch.id}&startDate=${startDate}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) return;
            const data = await res.json();
            setWeekShifts(data);
        } catch (error) {
            console.error('Lỗi fetch week:', error);
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

    const fetchMonthlyAttendance = async (staffId) => {
        if (!staffId) return;
        setAttendanceLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/attendance/monthly/${staffId}?month=${attendanceMonth}&year=${attendanceYear}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Không thể lấy báo cáo');
            const data = await res.json();
            setMonthlyReport(data);
        } catch (err) {
            console.error(err);
        } finally {
            setAttendanceLoading(false);
        }
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
            fetchWorkShiftsForWeek();
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

    const fetchShiftSchedules = async (date = selectedDate) => {
        if (!currentBranch?.id) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/shift-schedules/branch/${currentBranch.id}/work-day?workDay=${date}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) return;
            const data = await res.json();
            setShiftSchedules(data);
        } catch (err) {
            console.error('Lỗi lấy shift schedules:', err);
        }
    };

    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/shift-schedules`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workDay: scheduleForm.workDay,
                    shift: { id: parseInt(scheduleForm.shiftId) },
                    branch: { id: currentBranch.id },
                    requiredStaff: scheduleForm.requiredStaff,
                    maxStaff: scheduleForm.maxStaff,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            alert('Tạo lịch ca thành công!');
            setShowCreateScheduleModal(false);
            fetchShiftSchedules();
        } catch (err) {
            alert(err.message);
        }
    };

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
            fetchWorkShiftsForWeek();
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
        } else if (activeTab === 'shifts') {
            fetchWorkShifts(selectedDate);
            fetchWorkShiftsForWeek(selectedDate);
            fetchShiftSchedules(selectedDate);
        }
    }, [currentBranch, activeTab]);

    useEffect(() => {
        if (!currentBranch || activeTab !== 'shifts') return;
        fetchShiftSchedules(selectedDate);
        fetchWorkShifts(selectedDate);
        fetchWorkShiftsForWeek(selectedDate);
    }, [selectedDate, activeTab, currentBranch, shiftsSubTab]);

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

    const filteredShifts = workShifts.filter(shift =>
        shift.workDay?.toString().slice(0, 10) === selectedDate
    );

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
                                        <th className={styles.textCenter}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className={styles.emptyState}>
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
                                                            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                                                ID: {emp.id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '15px' }}>
                                                        <Mail size={16} style={{ color: 'var(--color-text-secondary)' }} />
                                                        {emp.email || '-'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '15px' }}>
                                                        <Phone size={16} style={{ color: 'var(--color-text-secondary)' }} />
                                                        {emp.phone || '-'}
                                                    </div>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    {(() => {
                                                        const staffInfo = staffMap[emp.id];
                                                        const posInfo = staffInfo ? POSITION_MAP[staffInfo.position] : null;
                                                        return (
                                                            <button
                                                                onClick={() => setPositionForm({ emp, staffInfo })}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                                    padding: '4px 12px',
                                                                    background: posInfo ? posInfo.bg : 'rgba(107,114,128,0.1)',
                                                                    color: posInfo ? posInfo.color : '#6B7280',
                                                                    border: `1px solid ${posInfo ? posInfo.color + '40' : 'rgba(107,114,128,0.3)'}`,
                                                                    borderRadius: '8px',
                                                                    fontSize: '13px', fontWeight: '600',
                                                                    cursor: 'pointer', transition: 'all 0.2s'
                                                                }}
                                                                onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                                                                onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                                            >
                                                                {posInfo ? posInfo.label : 'Chưa có'}
                                                                <ChevronDown size={12} />
                                                            </button>
                                                        );
                                                    })()}
                                                </td>

                                                <td className={styles.textCenter}>
                                                    <span className={emp.isActive ? styles.badgeSuccess : styles.badgeInactive}>
                                                        {emp.isActive ? 'Hoạt động' : 'Ngưng'}
                                                    </span>
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        {/* Xem lịch ca */}
                                                        <button
                                                            title="Xem lịch làm"
                                                            onClick={() => {
                                                                setActiveTab('shifts');
                                                                // Lọc theo nhân viên này (lưu filter nếu cần)
                                                            }}
                                                            style={{
                                                                background: 'rgba(88, 253, 107, 0.1)',
                                                                border: '1px solid rgba(43, 248, 57, 0.3)',
                                                                borderRadius: '8px',
                                                                padding: '6px 10px',
                                                                cursor: 'pointer',
                                                                color: '#07d64c'
                                                            }}
                                                        >
                                                            <Calendar size={16} />
                                                        </button>

                                                        {/* Xem chấm công */}
                                                        <button
                                                            title="Xem chấm công"
                                                            onClick={() => {
                                                                setSelectedStaffForAttendance(emp.id);
                                                                setAttendanceSubTab('detail');
                                                                setActiveTab('attendance');
                                                            }}
                                                            style={{
                                                                background: 'rgba(139,92,246,0.1)',
                                                                border: '1px solid rgba(139,92,246,0.3)',
                                                                borderRadius: '8px',
                                                                padding: '6px 10px',
                                                                cursor: 'pointer',
                                                                color: '#8B5CF6'
                                                            }}
                                                        >
                                                            <Clock size={16} />
                                                        </button>

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
                                                            title="Sửa / Gán chức vụ"
                                                            onClick={() => {
                                                                const staffInfo = staffMap[emp.id] || null;
                                                                setPositionForm({ emp, staffInfo });
                                                            }}
                                                            style={{
                                                                background: 'rgba(88, 253, 107, 0.1)',
                                                                border: '1px solid rgba(88, 253, 107, 0.3)',
                                                                borderRadius: '8px',
                                                                padding: '6px 10px',
                                                                cursor: 'pointer',
                                                                color: '#07d64c'
                                                            }}
                                                        >
                                                            <Briefcase size={16} />
                                                        </button>
                                                    </div>
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
                    {/* Date picker giữ nguyên */}
                    <div className={styles.headerCard} style={{ marginTop: '16px' }}>
                        <div className={styles.filterBar}>
                            {/* --- Sub-tab buttons --- */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setShiftsSubTab('schedule')}
                                    className={shiftsSubTab === 'schedule' ? styles.tabActive : styles.tabInactive}
                                >
                                    <ClipboardList size={16} /> Lịch ca
                                </button>
                                <button
                                    onClick={() => setShiftsSubTab('assign')}
                                    className={shiftsSubTab === 'assign' ? styles.tabActive : styles.tabInactive}
                                >
                                    <Users size={16} /> Phân công
                                </button>
                            </div>

                            {/* Date picker */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-secondary)' }}>
                                <Calendar size={20} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className={styles.filterSelect}
                                    style={{ width: 'auto' }}
                                />
                            </div>

                            {/* Nút tạo lịch ca (chỉ hiện ở sub-tab Lịch ca) */}
                            {shiftsSubTab === 'schedule' && (
                                <button
                                    onClick={() => setShowCreateScheduleModal(true)}
                                    className={styles.primaryButton}
                                >
                                    + Tạo lịch ca
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ---- SUB-TAB: LỊCH CA ---- */}
                    {shiftsSubTab === 'schedule' && (
                        <>
                            <div className={styles.tableCard}>
                                {shiftSchedules.length === 0 ? (
                                    <div className={styles.emptyState} style={{ padding: '60px 20px' }}>
                                        <Calendar size={48} className={styles.emptyIcon} />
                                        <p>Chưa có lịch ca nào cho ngày này</p>
                                    </div>
                                ) : (
                                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {shiftSchedules.map(sc => {
                                            // Đếm số nhân viên đã phân công vào ca này
                                            const assigned = workShifts.filter(ws => ws.shift?.id === sc.shift?.id).length;
                                            const isFull = assigned >= sc.requiredStaff;
                                            return (
                                                <div key={sc.id} style={{
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '12px',
                                                    padding: '20px',
                                                    background: 'var(--color-bg-card)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '600' }}>
                                                                <Briefcase size={16} className="mr-2" />
                                                                {sc.shift?.name} — {sc.shift?.startTime} - {sc.shift?.endTime}
                                                            </h3>
                                                            <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                                                                Cần: <strong>{sc.requiredStaff}</strong> nhân viên &nbsp;|&nbsp;
                                                                Đã phân: <strong style={{ color: isFull ? '#10B981' : '#F59E0B' }}>{assigned}</strong>
                                                                {!isFull && (
                                                                    <span style={{ color: '#EF4444', marginLeft: '8px' }}>
                                                                        ⚠ Thiếu {sc.requiredStaff - assigned} người
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        {/* Progress bar */}
                                                        <div style={{ width: '120px' }}>
                                                            <div style={{
                                                                height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    width: `${Math.min(100, (assigned / sc.requiredStaff) * 100)}%`,
                                                                    background: isFull ? '#10B981' : '#F59E0B',
                                                                    borderRadius: '4px',
                                                                    transition: 'width 0.3s'
                                                                }} />
                                                            </div>
                                                            <p style={{
                                                                fontSize: '12px', textAlign: 'right', margin: '4px 0 0',
                                                                color: 'var(--color-text-secondary)'
                                                            }}>
                                                                {assigned}/{sc.requiredStaff}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className={styles.tableCard} style={{ marginTop: '16px', padding: '20px', overflowX: 'auto' }}>
                                <h4 style={{
                                    marginBottom: '12px', background: 'rgba(88, 253, 107, 0.1)',
                                    border: '1px solid rgba(88, 253, 107, 0.3)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    color: '#07d64c'
                                }}><ClipboardList size={20} className="mr-2" /> Lịch tuần</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', background: 'var(--color-bg-card)' }}>Ca</th>
                                            {getWeekDays(selectedDate).map(d => (
                                                <th key={d} style={{
                                                    padding: '8px 12px', textAlign: 'center',
                                                    background: d === selectedDate ? 'rgba(59,130,246,0.1)' : 'var(--color-bg-card)',
                                                    fontWeight: d === selectedDate ? '700' : '400'
                                                }}>
                                                    {new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shiftTemplates.map(sh => (
                                            <tr key={sh.id}>
                                                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: '600', borderTop: '1px solid var(--color-border)' }}>
                                                    {sh.name}<br />
                                                    <span style={{ fontWeight: '400', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                                                        {sh.startTime}–{sh.endTime}
                                                    </span>
                                                </td>
                                                {getWeekDays(selectedDate).map(d => {
                                                    // Tìm WeeklyScheduleDTO khớp ngày + ca
                                                    const entry = weekShifts.find(ws =>
                                                        ws.workDay?.toString().slice(0, 10) === d &&
                                                        ws.shiftId === sh.id
                                                    );
                                                    const assigned = entry?.assignedStaff ?? 0;
                                                    const required = entry?.requiredStaff ?? 0;
                                                    const missing = entry?.missingStaff ?? 0;
                                                    const isFull = missing === 0 && required > 0;

                                                    return (
                                                        <td key={d} style={{
                                                            padding: '10px 12px', textAlign: 'center',
                                                            borderTop: '1px solid var(--color-border)',
                                                            background: d === selectedDate ? 'rgba(59,130,246,0.05)' : 'transparent'
                                                        }}>
                                                            {entry ? (
                                                                <span style={{
                                                                    display: 'inline-block', padding: '4px 10px',
                                                                    borderRadius: '20px', fontWeight: '600',
                                                                    background: isFull
                                                                        ? 'rgba(16,185,129,0.1)'
                                                                        : 'rgba(245,158,11,0.1)',
                                                                    color: isFull ? '#10B981' : '#F59E0B',
                                                                }}>
                                                                    {assigned}/{required}
                                                                    {missing > 0 && (
                                                                        <span style={{ fontSize: '10px', marginLeft: '4px', color: '#EF4444' }}>
                                                                            -{missing}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <span style={{
                                                                    display: 'inline-block', padding: '4px 10px',
                                                                    borderRadius: '20px', fontWeight: '600',
                                                                    background: 'rgba(239,68,68,0.08)',
                                                                    color: '#9CA3AF'
                                                                }}>
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* ---- SUB-TAB: PHÂN CÔNG (giữ nguyên code cũ) ---- */}
                    {shiftsSubTab === 'assign' && (
                        <>
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
                                                                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--color-text-secondary)' }}>
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
                                                                                    <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                                                        {getInitials(ss.staff?.user?.fullName || 'U')}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div>
                                                                                <div style={{ fontWeight: '600', color: 'var(--color-text-secondary)' }}>
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
                </>
            )}

            {showCreateScheduleModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateScheduleModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>📋 Tạo lịch ca</h3>
                            <button onClick={() => setShowCreateScheduleModal(false)} className={styles.modalClose}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ngày làm việc *</label>
                                <input type="date" value={scheduleForm.workDay}
                                    onChange={e => setScheduleForm({ ...scheduleForm, workDay: e.target.value })}
                                    className={styles.formInput} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ca làm việc *</label>
                                <select value={scheduleForm.shiftId}
                                    onChange={e => setScheduleForm({ ...scheduleForm, shiftId: e.target.value })}
                                    className={styles.formInput} required>
                                    <option value="">-- Chọn ca --</option>
                                    {shiftTemplates.map(sh => (
                                        <option key={sh.id} value={sh.id}>
                                            {sh.name} ({sh.startTime} - {sh.endTime})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Số nhân viên cần *</label>
                                <input type="number" min="1" value={scheduleForm.requiredStaff}
                                    onChange={e => setScheduleForm({ ...scheduleForm, requiredStaff: parseInt(e.target.value) })}
                                    className={styles.formInput} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Số nhân viên tối đa</label>
                                <input type="number" min="1" value={scheduleForm.maxStaff}
                                    onChange={e => setScheduleForm({ ...scheduleForm, maxStaff: parseInt(e.target.value) })}
                                    className={styles.formInput} />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowCreateScheduleModal(false)} className={styles.secondaryButton}>
                                Hủy
                            </button>
                            <button onClick={handleCreateSchedule} className={styles.primaryButton}>
                                <Save size={18} /> Tạo lịch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
                <>
                    <div className={styles.headerCard} style={{ marginTop: '16px' }}>
                        <div className={styles.filterBar}>
                            {/* Sub-tab */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setAttendanceSubTab('overview')}
                                    className={attendanceSubTab === 'overview' ? styles.tabActive : styles.tabInactive}
                                >
                                    <BarChart3 size={18} /> Tổng quan
                                </button>
                                <button
                                    onClick={() => setAttendanceSubTab('detail')}
                                    className={attendanceSubTab === 'detail' ? styles.tabActive : styles.tabInactive}
                                >
                                    <UserCheck size={18} /> Chi tiết nhân viên
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ---- TỔNG QUAN ---- */}
                    {attendanceSubTab === 'overview' && (
                        <div className={styles.tableCard} style={{ padding: '24px' }}>
                            <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: '600' }}>
                                Tháng {attendanceMonth}/{attendanceYear} — {currentBranch?.name}
                            </h3>
                            {/* Thống kê nhanh toàn chi nhánh nếu bạn có API aggregate,
            hiện tại để placeholder đẹp */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '20px' }}>
                                {[
                                    { label: 'Đúng giờ', color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle, key: 'presentDays' },
                                    { label: 'Đi trễ', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: Clock, key: 'lateDays' },
                                    { label: 'Nghỉ phép', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: FileText, key: 'leaveDays' },
                                    { label: 'Vắng mặt', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: Calendar, key: 'absentDays' },
                                ].map(item => {
                                    const IconComponent = item.icon;
                                    return (
                                        <div key={item.key} style={{ background: item.bg, borderRadius: '12px', padding: '20px', border: `1px solid ${item.color}30`, textAlign: 'center' }}>
                                            <IconComponent size={28} color={item.color} style={{ marginBottom: '8px' }} />
                                            <div style={{ fontSize: '28px', fontWeight: '700', color: item.color, marginTop: '8px' }}>—</div>
                                            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{item.label}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ---- CHI TIẾT NHÂN VIÊN ---- */}
                    {attendanceSubTab === 'detail' && (
                        <div className={styles.tableCard} style={{ padding: '24px' }}>
                            {/* Bộ lọc */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                                <select
                                    value={selectedStaffForAttendance}
                                    onChange={e => {
                                        setSelectedStaffForAttendance(e.target.value);
                                        setMonthlyReport(null);
                                    }}
                                    className={styles.formInput}
                                    style={{ minWidth: '220px' }}
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.fullName || s.username} — {POSITION_MAP[s.position]?.label || s.position}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={attendanceMonth}
                                    onChange={e => setAttendanceMonth(parseInt(e.target.value))}
                                    className={styles.formInput}
                                    style={{ width: '120px' }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                                    ))}
                                </select>

                                <input
                                    type="number"
                                    value={attendanceYear}
                                    onChange={e => setAttendanceYear(parseInt(e.target.value))}
                                    className={styles.formInput}
                                    style={{ width: '100px' }}
                                    min="2020" max="2030"
                                />

                                <button
                                    onClick={() => fetchMonthlyAttendance(selectedStaffForAttendance)}
                                    className={styles.primaryButton}
                                    disabled={!selectedStaffForAttendance || attendanceLoading}
                                >
                                    {attendanceLoading ? '...' : (
                                        <>
                                            <Search size={16} className="mr-2" />
                                            Xem
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Kết quả */}
                            {monthlyReport ? (
                                <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '20px' }}>
                                        {[
                                            { label: 'Đúng giờ', color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle, key: 'presentDays' },
                                            { label: 'Đi trễ', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: Clock, key: 'lateDays' },
                                            { label: 'Nghỉ phép', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: FileText, key: 'leaveDays' },
                                            { label: 'Vắng mặt', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: Calendar, key: 'absentDays' },
                                        ].map(item => {
                                            const IconComponent = item.icon;
                                            return (
                                                <div key={item.key} style={{ background: item.bg, borderRadius: '12px', padding: '20px', border: `1px solid ${item.color}30`, textAlign: 'center' }}>
                                                    <IconComponent size={32} color={item.color} style={{ marginBottom: '8px' }} />
                                                    <div style={{ fontSize: '28px', fontWeight: '700', color: item.color, marginTop: '8px' }}>—</div>
                                                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{item.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.emptyState} style={{ padding: '40px' }}>
                                    <CheckCircle size={48} className={styles.emptyIcon} />
                                    <p>Chọn nhân viên và nhấn Xem để hiển thị báo cáo</p>
                                </div>
                            )}
                        </div>
                    )}
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

            {positionForm && (
                <StaffPositionForm
                    employee={positionForm.emp}
                    staffInfo={positionForm.staffInfo}
                    closeForm={() => setPositionForm(null)}
                    onSave={() => {
                        fetchStaffList();
                        fetchBranchEmployees();
                        setPositionForm(null);
                        showToast('success', 'Thành công', 'Chức vụ đã được cập nhật');
                    }}
                />
            )}
        </div>
    );
}