import React, { useEffect, useState } from 'react';
import { Users, Calendar, Clock, Search, CalendarPlus, AlertCircle, RefreshCw, Store, Edit2, Mail, Phone, Briefcase, UserCheck, ChevronDown, ChevronUp, X, Save, CheckCircle, ClipboardList, BarChart3, FileText, UserX, BarChart2, CalendarDays } from 'lucide-react';
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
    const [employmentTypes, setEmploymentTypes] = useState([]);

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
        requiredStaff: '',
        maxStaff: '',
        branchId: null,
    });

    const [attendanceSubTab, setAttendanceSubTab] = useState('overview');
    const [selectedStaffForAttendance, setSelectedStaffForAttendance] = useState('');
    const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
    const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());
    const [monthlyReport, setMonthlyReport] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [showEmploymentModal, setShowEmploymentModal] = useState(false);
    const [employmentTarget, setEmploymentTarget] = useState(null); // { staffId, currentType }
    const [selectedEmploymentTypeId, setSelectedEmploymentTypeId] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [overviewStats, setOverviewStats] = useState(null);
    const [cashierSessions, setCashierSessions] = useState([]);
    const [cashierLoading, setCashierLoading] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [showSessionDetail, setShowSessionDetail] = useState(false);
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [filterStaffId, setFilterStaffId] = useState(null);
    const [staffWeekShifts, setStaffWeekShifts] = useState([]);
    const [staffWeekLoading, setStaffWeekLoading] = useState(false);

    const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [editScheduleForm, setEditScheduleForm] = useState({
        workDay: '',
        shiftId: '',
        requiredStaff: '',
        maxStaff: '',
    });
    const [showDeleteScheduleModal, setShowDeleteScheduleModal] = useState(false);
    const [deletingSchedule, setDeletingSchedule] = useState(null);

    const API_BASE_URL = '';

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
                showToast('error', 'Lỗi', 'Tài khoản của bạn chưa được gán chi nhánh.');
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
            showToast('error', 'Lỗi', 'Không thể lấy thông tin chi nhánh.');
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
            showToast('error', 'Lỗi', 'Không thể lấy thông tin nhân viên.');
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
            showToast('error', 'Lỗi', 'Không thể tải danh sách nhân viên.');
        }
    };

    const fetchOverviewStats = async () => {
        if (!staffList.length) return;
        setOverviewLoading(true);
        const token = localStorage.getItem('token');
        try {
            const results = await Promise.all(
                staffList.map(s =>
                    fetch(`${API_BASE_URL}/api/attendance/monthly/${s.id}?month=${attendanceMonth}&year=${attendanceYear}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(r => r.ok ? r.json() : null).catch(() => null)
                )
            );
            const valid = results.filter(Boolean);
            setOverviewStats({
                presentDays: valid.reduce((sum, r) => sum + (r.presentDays || 0), 0),
                lateDays: valid.reduce((sum, r) => sum + (r.lateDays || 0), 0),
                leaveDays: valid.reduce((sum, r) => sum + (r.leaveDays || 0), 0),
                totalDays: valid.reduce((sum, r) => sum + (r.totalDays || 0), 0),
            });
        } finally {
            setOverviewLoading(false);
        }
    };

    const fetchCashierSessions = async () => {
        if (!currentBranch?.id) return;
        setCashierLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/cashier-sessions/branch/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Không thể tải ca thu ngân');
            const data = await res.json();
            console.log('Sessions raw:', data);
            setCashierSessions(data);
        } catch (err) {
            showToast('error', 'Lỗi', err.message);
        } finally {
            setCashierLoading(false);
        }
    };

    const fetchSessionDetail = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/cashier-sessions/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            setSelectedSession(data);
            setShowSessionDetail(true);
        } catch {
            showToast('error', 'Lỗi', 'Không thể tải chi tiết ca');
        }
    };

    const fetchStaffWeeklySchedule = async (staffId, date = selectedDate) => {
        if (!staffId) return;
        setStaffWeekLoading(true);
        const token = localStorage.getItem('token');
        try {
            // Tính thứ 2 đầu tuần
            const d = new Date(date);
            const day = d.getDay();
            const monday = new Date(d);
            monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
            const startDate = monday.toISOString().split('T')[0];

            const res = await fetch(
                `${API_BASE_URL}/api/staff-shifts/staff/${staffId}/week?startDate=${startDate}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) return;
            const data = await res.json();
            setStaffWeekShifts(data);
        } catch (err) {
            console.error('Lỗi fetch lịch tuần nhân viên:', err);
        } finally {
            setStaffWeekLoading(false);
        }
    };

    const fetchEmploymentTypes = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/employment-types`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            setEmploymentTypes(await res.json());
        } catch (err) {
            console.error('Lỗi lấy employment types:', err);
            showToast('error', 'Lỗi', 'Không thể tải danh sách loại hình làm việc.');
        }
    };

    const fetchBranchEmployees = async () => {
        if (!currentBranch?.id) return;
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
            showToast('error', 'Lỗi', 'Không thể tải danh sách nhân viên.');
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
            showToast('error', 'Lỗi', 'Vui lòng chọn nhân viên và ca làm việc!');
            return;
        }
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
            showToast('success', 'Thành công', 'Đã phân ca thành công!');
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
            const text = await res.text();

            if (!res.ok) {
                // Thử parse JSON để lấy message đẹp hơn
                let errorMsg = text;
                try {
                    const json = JSON.parse(text);
                    errorMsg = json.message || json.error || text;
                } catch (_) { }

                // Nhận diện lỗi trùng lịch ca
                if (
                    res.status === 409 ||
                    errorMsg.toLowerCase().includes('trùng') ||
                    errorMsg.toLowerCase().includes('duplicate') ||
                    errorMsg.toLowerCase().includes('exists') ||
                    errorMsg.toLowerCase().includes('already')
                ) {
                    showToast('error', 'Trùng lịch ca', 'Ca này đã được tạo cho ngày đã chọn. Vui lòng chọn ca hoặc ngày khác!');
                } else {
                    showToast('error', 'Lỗi', errorMsg || 'Không thể tạo lịch ca');
                }
                return;
            }

            showToast('success', 'Thành công', 'Đã tạo lịch ca làm việc!');
            setShowCreateScheduleModal(false);
            fetchShiftSchedules();
        } catch (err) {
            showToast('error', 'Lỗi', err.message);
        }
    };

    const handleOpenEditSchedule = (sc) => {
        setEditingSchedule(sc);
        setEditScheduleForm({
            workDay: sc.workDay,
            shiftId: sc.shift?.id || '',
            requiredStaff: sc.requiredStaff,
            maxStaff: sc.maxStaff,
        });
        setShowEditScheduleModal(true);
    };

    const handleUpdateSchedule = async () => {
        if (!editScheduleForm.shiftId) {
            showToast('error', 'Lỗi', 'Vui lòng chọn ca làm việc!');
            return;
        }
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/shift-schedules/${editingSchedule.id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workDay: editScheduleForm.workDay,
                    shift: { id: parseInt(editScheduleForm.shiftId) },
                    branch: { id: currentBranch.id },
                    requiredStaff: editScheduleForm.requiredStaff,
                    maxStaff: editScheduleForm.maxStaff,
                }),
            });

            const text = await res.text();
            if (!res.ok) {
                let msg = text;
                try { msg = JSON.parse(text).message || text; } catch (_) { }
                showToast('error', 'Lỗi', msg || 'Không thể cập nhật lịch ca');
                return;
            }

            showToast('success', 'Thành công', 'Đã cập nhật lịch ca!');
            setShowEditScheduleModal(false);
            setEditingSchedule(null);
            fetchShiftSchedules();
            fetchWorkShiftsForWeek();
        } catch (err) {
            showToast('error', 'Lỗi', err.message);
        }
    };

    const handleDeleteSchedule = async () => {
        if (!deletingSchedule) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/shift-schedules/${deletingSchedule.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const text = await res.text();
                let msg = text;
                try { msg = JSON.parse(text).message || text; } catch (_) { }
                showToast('error', 'Lỗi', msg || 'Không thể xóa lịch ca');
                return;
            }

            showToast('success', 'Thành công', 'Đã xóa lịch ca!');
            setShowDeleteScheduleModal(false);
            setDeletingSchedule(null);
            fetchShiftSchedules();
            fetchWorkShiftsForWeek();
        } catch (err) {
            showToast('error', 'Lỗi', err.message);
        }
    };

    const fetchEmployees = () => {
        const token = localStorage.getItem('token');

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

    const handleAssignEmploymentType = async () => {
        if (!selectedEmploymentTypeId || !employmentTarget?.staffId) {
            showToast('error', 'Lỗi', 'Vui lòng chọn loại hợp đồng!');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/api/staff/${employmentTarget.staffId}/employment-type?employmentTypeId=${selectedEmploymentTypeId}`,
                {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (!res.ok) throw new Error(await res.text());
            showToast('success', 'Thành công', 'Đã cập nhật loại hợp đồng!');
            setShowEmploymentModal(false);
            fetchStaffList();
        } catch (err) {
            showToast('error', 'Lỗi', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEmployee = async () => {
        if (!deleteTarget) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/users/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(await res.text());
            showToast('success', 'Thành công', 'Đã xóa nhân viên!');
            setShowDeleteModal(false);
            setDeleteTarget(null);
            fetchBranchEmployees();
        } catch (err) {
            showToast('error', 'Lỗi', err.message || 'Không thể xóa nhân viên');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateShift = async (e) => {
        e.preventDefault();
        if (!editForm.shiftId || !editForm.workDay) {
            showToast('error', 'Lỗi', 'Vui lòng chọn ca làm việc và ngày!');
            return;
        }
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
            showToast('success', 'Thành công', 'Đã cập nhật ca làm việc!');
            setShowEditModal(false);
            fetchWorkShiftsForWeek();
        } catch (error) {
            showToast('error', 'Lỗi', error.message);
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
        fetchEmploymentTypes();

        if (activeTab === 'employees') {
            fetchBranchEmployees();
            setFilterStaffId(null);
        } else if (activeTab === 'shifts') {
            fetchWorkShifts(selectedDate);
            fetchWorkShiftsForWeek(selectedDate);
            fetchShiftSchedules(selectedDate);
        } else if (activeTab === 'cashier') {
            fetchCashierSessions();
        } else if (activeTab === 'attendance' && attendanceSubTab === 'overview') {
            fetchOverviewStats();
        }

        const intervalId = setInterval(() => {
            switch (activeTab) {
                case 'employees':
                    fetchBranchEmployees();
                    fetchStaffList();
                    break;

                case 'shifts':
                    fetchWorkShifts(selectedDate);
                    fetchWorkShiftsForWeek(selectedDate);
                    fetchShiftSchedules(selectedDate);
                    if (shiftsSubTab === 'staffWeek' && filterStaffId) {
                        fetchStaffWeeklySchedule(filterStaffId, selectedDate);
                    }
                    break;

                case 'attendance':
                    if (attendanceSubTab === 'overview') {
                        fetchOverviewStats();
                    } else if (attendanceSubTab === 'detail' && selectedStaffForAttendance) {
                        fetchMonthlyAttendance(selectedStaffForAttendance);
                    }
                    break;

                case 'cashier':
                    fetchCashierSessions();
                    break;

                default:
                    break;
            }
        }, 5000);

        return () => clearInterval(intervalId);
    }, [
        currentBranch,
        activeTab,
        selectedDate,
        shiftsSubTab,
        filterStaffId,
        attendanceSubTab,
        selectedStaffForAttendance,
    ]);

    useEffect(() => {
        if (!currentBranch || activeTab !== 'shifts') return;
        fetchShiftSchedules(selectedDate);
        fetchWorkShifts(selectedDate);
        fetchWorkShiftsForWeek(selectedDate);
    }, [selectedDate, activeTab, currentBranch, shiftsSubTab]);


    useEffect(() => {
        if (activeTab === 'attendance' && attendanceSubTab === 'overview' && staffList.length > 0) {
            fetchOverviewStats();
        }
    }, [activeTab, attendanceSubTab, attendanceMonth, attendanceYear, staffList]);

    useEffect(() => {
        if (activeTab === 'attendance' && attendanceSubTab === 'detail' && selectedStaffForAttendance) {
            fetchMonthlyAttendance(selectedStaffForAttendance);
        }
    }, [activeTab, attendanceSubTab, selectedStaffForAttendance]);

    useEffect(() => {
        if (activeTab === 'shifts' && shiftsSubTab === 'staffWeek' && filterStaffId) {
            fetchStaffWeeklySchedule(filterStaffId, selectedDate);
        }
    }, [selectedDate, activeTab, shiftsSubTab, filterStaffId]);

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

    const filteredShifts = workShifts.filter(shift => {
        const matchDate = shift.workDay?.toString().slice(0, 10) === selectedDate;
        const matchStaff = filterStaffId ? shift.staff?.id === filterStaffId : true;
        return matchDate && matchStaff;
    });

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
                        <button
                            onClick={() => setActiveTab('cashier')}
                            className={activeTab === 'cashier' ? styles.tabActive : styles.tabInactive}
                        >
                            <Store size={18} />
                            Quỹ tiền mặt
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
                                        <th className={styles.textCenter}>Hợp đồng</th>
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
                                                    {(() => {
                                                        const staffInfo = staffMap[emp.id];
                                                        const staff = staffList.find(s => s.id === staffInfo?.id);
                                                        const etName = staff?.employmentTypeName || staff?.employmentType?.name;
                                                        return etName ? (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '4px 12px',
                                                                background: 'rgba(16,185,129,0.1)',
                                                                color: '#10B981',
                                                                border: '1px solid rgba(16,185,129,0.3)',
                                                                borderRadius: '8px',
                                                                fontSize: '13px',
                                                                fontWeight: '600'
                                                            }}>
                                                                {etName}
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '4px 12px',
                                                                background: 'rgba(107,114,128,0.1)',
                                                                color: '#9CA3AF',
                                                                border: '1px solid rgba(107,114,128,0.2)',
                                                                borderRadius: '8px',
                                                                fontSize: '13px'
                                                            }}>
                                                                Chưa có
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        {/* Xem lịch ca */}
                                                        <button
                                                            title="Xem lịch làm"
                                                            onClick={() => {
                                                                const staffInfo = staffMap[emp.id];
                                                                if (!staffInfo?.id) {
                                                                    showToast('error', 'Lỗi', 'Nhân viên này chưa được gán chức vụ!');
                                                                    return;
                                                                }
                                                                setFilterStaffId(staffInfo.id);
                                                                setStaffWeekShifts([]);
                                                                fetchStaffWeeklySchedule(staffInfo.id);
                                                                setShiftsSubTab('staffWeek');
                                                                setActiveTab('shifts');

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
                                                                const staffInfo = staffMap[emp.id];
                                                                if (!staffInfo?.id) {
                                                                    showToast('error', 'Lỗi', 'Nhân viên này chưa được gán chức vụ!');
                                                                    return;
                                                                }
                                                                setSelectedStaffForAttendance(staffInfo.id);
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
                                                            onClick={() => openEdit('Employee', emp, fetchBranchEmployees)}
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

                                                        <button
                                                            title="Gán loại hợp đồng"
                                                            onClick={() => {
                                                                const staffInfo = staffMap[emp.id];
                                                                if (!staffInfo?.id) {
                                                                    showToast('error', 'Lỗi', 'Nhân viên này chưa được gán chức vụ. Hãy gán chức vụ trước!');
                                                                    return;
                                                                }
                                                                setEmploymentTarget({
                                                                    staffId: staffInfo?.id,
                                                                    empName: emp.fullName || emp.username,
                                                                });
                                                                setSelectedEmploymentTypeId('');
                                                                setShowEmploymentModal(true);
                                                            }}
                                                            style={{
                                                                background: 'rgba(245,158,11,0.1)',
                                                                border: '1px solid rgba(245,158,11,0.3)',
                                                                borderRadius: '8px',
                                                                padding: '6px 10px',
                                                                cursor: 'pointer',
                                                                color: '#F59E0B'
                                                            }}
                                                        >
                                                            <FileText size={16} />
                                                        </button>

                                                        <button
                                                            title="Xóa nhân viên"
                                                            onClick={() => {
                                                                setDeleteTarget(emp);
                                                                setShowDeleteModal(true);
                                                            }}
                                                            style={{
                                                                background: 'rgba(239,68,68,0.1)',
                                                                border: '1px solid rgba(239,68,68,0.3)',
                                                                borderRadius: '8px',
                                                                padding: '6px 10px',
                                                                cursor: 'pointer',
                                                                color: '#EF4444'
                                                            }}
                                                        >
                                                            <UserX size={16} />
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
                                <button
                                    onClick={() => setShiftsSubTab('staffWeek')}
                                    className={shiftsSubTab === 'staffWeek' ? styles.tabActive : styles.tabInactive}
                                >
                                    <UserCheck size={16} /> Lịch cá nhân
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
                                                    background: 'rgb(247, 240, 234)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {/* Progress bar */}
                                                            <div style={{ width: '120px' }}>
                                                                <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                                                                    <div style={{
                                                                        height: '100%',
                                                                        width: `${Math.min(100, (assigned / sc.requiredStaff) * 100)}%`,
                                                                        background: isFull ? '#10B981' : '#F59E0B',
                                                                        borderRadius: '4px', transition: 'width 0.3s'
                                                                    }} />
                                                                </div>
                                                                <p style={{ fontSize: '12px', textAlign: 'right', margin: '4px 0 0', color: 'var(--color-text-secondary)' }}>
                                                                    {assigned}/{sc.requiredStaff}
                                                                </p>
                                                            </div>

                                                            {/* Nút sửa */}
                                                            <button
                                                                onClick={() => handleOpenEditSchedule(sc)}
                                                                title="Sửa lịch ca"
                                                                style={{
                                                                    padding: '8px 10px',
                                                                    background: 'rgba(59,130,246,0.1)',
                                                                    color: '#3B82F6',
                                                                    border: '1px solid rgba(59,130,246,0.3)',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center'
                                                                }}
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>

                                                            {/* Nút xóa */}
                                                            <button
                                                                onClick={() => { setDeletingSchedule(sc); setShowDeleteScheduleModal(true); }}
                                                                title="Xóa lịch ca"
                                                                style={{
                                                                    padding: '8px 10px',
                                                                    background: 'rgba(239,68,68,0.1)',
                                                                    color: '#EF4444',
                                                                    border: '1px solid rgba(239,68,68,0.3)',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center'
                                                                }}
                                                            >
                                                                <X size={15} />
                                                            </button>
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
                                            <th style={{ padding: '8px 12px', textAlign: 'left', background: 'rgb(247, 240, 234)' }}>Ca</th>
                                            {getWeekDays(selectedDate).map(d => (
                                                <th key={d} style={{
                                                    padding: '8px 12px', textAlign: 'center',
                                                    background: d === selectedDate ? 'rgba(59,130,246,0.1)' : 'rgb(247, 240, 234)',
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
                    {shiftsSubTab === 'staffWeek' && (() => {
                        const staff = staffList.find(s => s.id === filterStaffId);
                        const weekDays = getWeekDays(selectedDate);

                        return (
                            <div className={styles.tableCard} style={{ marginTop: '16px', padding: '24px' }}>

                                {/* Header thông tin nhân viên */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    marginBottom: '20px', flexWrap: 'wrap', gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className={styles.productImagePlaceholder} style={{ width: 48, height: 48 }}>
                                            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-secondary)' }}>
                                                {getInitials(staff?.fullName || staff?.username)}
                                            </span>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-text-secondary)' }}>
                                                {staff?.fullName || staff?.username}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                                {POSITION_MAP[staff?.position]?.label || staff?.position}
                                                {' '}•{' '}
                                                Tuần: {weekDays[0]} → {weekDays[6]}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setFilterStaffId(null);
                                            setStaffWeekShifts([]);
                                            setShiftsSubTab('assign');
                                        }}
                                        style={{
                                            background: 'none', border: '1px solid var(--color-border)',
                                            borderRadius: 8, padding: '6px 14px',
                                            cursor: 'pointer', color: 'var(--color-text-secondary)',
                                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
                                        }}
                                    >
                                        <X size={14} /> Đóng
                                    </button>
                                </div>

                                {/* Bảng lịch tuần */}
                                {(
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead>
                                                <tr>
                                                    <th style={{
                                                        padding: '10px 14px', textAlign: 'left',
                                                        background: 'rgb(247, 240, 234)',
                                                        borderBottom: '2px solid var(--color-border)',
                                                        color: 'var(--color-text-secondary)', fontWeight: 600
                                                    }}>
                                                        Ca làm việc
                                                    </th>
                                                    {weekDays.map(d => {
                                                        const isToday = d === new Date().toISOString().split('T')[0];
                                                        const isSelected = d === selectedDate;
                                                        return (
                                                            <th key={d} style={{
                                                                padding: '10px 14px', textAlign: 'center',
                                                                background: isSelected
                                                                    ? 'rgba(59,130,246,0.1)'
                                                                    : isToday
                                                                        ? 'rgba(16,185,129,0.06)'
                                                                        : 'rgb(247, 240, 234)',
                                                                borderBottom: '2px solid var(--color-border)',
                                                                color: isSelected ? '#3B82F6' : isToday ? '#10B981' : 'var(--color-text-secondary)',
                                                                fontWeight: isSelected || isToday ? 700 : 400,
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {new Date(d).toLocaleDateString('vi-VN', {
                                                                    weekday: 'short', day: '2-digit', month: '2-digit'
                                                                })}
                                                                {isToday && (
                                                                    <div style={{ fontSize: 10, color: '#10B981', marginTop: 2 }}>
                                                                        Hôm nay
                                                                    </div>
                                                                )}
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {shiftTemplates.map(sh => {
                                                    const hasAnyShift = weekDays.some(d =>
                                                        staffWeekShifts.some(ws =>
                                                            ws.shift?.id === sh.id &&
                                                            ws.workDay?.toString().slice(0, 10) === d
                                                        )
                                                    );

                                                    return (
                                                        <tr key={sh.id}>
                                                            <td style={{
                                                                padding: '12px 14px',
                                                                borderTop: '1px solid var(--color-border)',
                                                                fontWeight: 600,
                                                                color: 'var(--color-text-secondary)',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {sh.name}
                                                                <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                                                    {sh.startTime} – {sh.endTime}
                                                                </div>
                                                            </td>
                                                            {weekDays.map(d => {
                                                                const shift = staffWeekShifts.find(ws =>
                                                                    ws.shift?.id === sh.id &&
                                                                    ws.workDay?.toString().slice(0, 10) === d
                                                                );
                                                                const isSelected = d === selectedDate;

                                                                return (
                                                                    <td key={d} style={{
                                                                        padding: '12px 14px', textAlign: 'center',
                                                                        borderTop: '1px solid var(--color-border)',
                                                                        background: isSelected ? 'rgba(59,130,246,0.03)' : 'transparent'
                                                                    }}>
                                                                        {shift ? (
                                                                            <span style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: 4,
                                                                                padding: '5px 12px',
                                                                                borderRadius: 20,
                                                                                fontWeight: 600,
                                                                                fontSize: 12,
                                                                                background: 'rgba(16,185,129,0.12)',
                                                                                color: '#10B981',
                                                                                border: '1px solid rgba(16,185,129,0.3)'
                                                                            }}>
                                                                                <CheckCircle size={12} />
                                                                                Có ca
                                                                            </span>
                                                                        ) : (
                                                                            <span style={{
                                                                                display: 'inline-block',
                                                                                padding: '5px 12px',
                                                                                borderRadius: 20,
                                                                                fontSize: 12,
                                                                                background: 'rgba(107,114,128,0.08)',
                                                                                color: '#9CA3AF'
                                                                            }}>
                                                                                không có
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {/* Thống kê nhanh */}
                                        <div style={{
                                            marginTop: 20, padding: '14px 16px',
                                            background: 'rgba(59,130,246,0.05)',
                                            border: '1px solid rgba(59,130,246,0.15)',
                                            borderRadius: 10,
                                            display: 'flex', gap: 24, flexWrap: 'wrap'
                                        }}>
                                            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <BarChart2 size={14} color="#3B82F6" />
                                                Tuần này:{' '}
                                                <strong style={{ color: '#3B82F6' }}>
                                                    {staffWeekShifts.length} ca
                                                </strong>
                                            </span>
                                            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <CalendarDays size={14} color="#10B981" />
                                                Số ngày có ca:{' '}
                                                <strong style={{ color: '#10B981' }}>
                                                    {new Set(staffWeekShifts.map(ws => ws.workDay?.toString().slice(0, 10))).size} ngày
                                                </strong>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </>
            )}

            {showCreateScheduleModal && (
                <div className={styles['modalOverlay-light']} onClick={() => setShowCreateScheduleModal(false)}>
                    <div className={styles['modal-light']} onClick={e => e.stopPropagation()}>
                        <div className={styles['modalHeader-light']}>
                            <h3 className={styles['modalTitle-light']}> Tạo lịch ca</h3>
                            <button onClick={() => setShowCreateScheduleModal(false)} className={styles['modalClose-light']}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles['modalBody-light']}>
                            <div className={styles.formGroup}>
                                <label className={styles['formLabel-light']}>Ngày làm việc *</label>
                                <input type="date" value={scheduleForm.workDay}
                                    onChange={e => setScheduleForm({ ...scheduleForm, workDay: e.target.value })}
                                    className={styles['formInput-light']} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles['formLabel-light']}>Ca làm việc *</label>
                                <select value={scheduleForm.shiftId}
                                    onChange={e => setScheduleForm({ ...scheduleForm, shiftId: e.target.value })}
                                    className={styles['formInput-light']} required>
                                    <option value="">-- Chọn ca --</option>
                                    {shiftTemplates.map(sh => (
                                        <option key={sh.id} value={sh.id}>
                                            {sh.name} ({sh.startTime} - {sh.endTime})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles['formLabel-light']}>Số nhân viên cần *</label>
                                <input type="number" min="1" value={scheduleForm.requiredStaff}
                                    onChange={e => setScheduleForm({ ...scheduleForm, requiredStaff: parseInt(e.target.value) })}
                                    className={styles['formInput-light']} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles['formLabel-light']}>Số nhân viên tối đa</label>
                                <input type="number" min="1" value={scheduleForm.maxStaff}
                                    onChange={e => setScheduleForm({ ...scheduleForm, maxStaff: parseInt(e.target.value) })}
                                    className={styles['formInput-light']} />
                            </div>
                        </div>
                        <div className={styles['modalFooter-light']}>
                            <button onClick={() => setShowCreateScheduleModal(false)} className={styles['secondaryButton-light']}>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                                    Tháng {attendanceMonth}/{attendanceYear} — {currentBranch?.name}
                                </h3>
                                <div style={{ display: 'flex', gap: 8, background: '#fff' }}>
                                    <select value={attendanceMonth} onChange={e => setAttendanceMonth(parseInt(e.target.value))} className={styles['formInput-light']} style={{ width: 120 }}>
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                                        ))}
                                    </select>
                                    <input type="number" value={attendanceYear} onChange={e => setAttendanceYear(parseInt(e.target.value))}
                                        className={styles['formInput-light']} style={{ width: 90 }} min="2020" max="2030" />
                                </div>
                            </div>

                            {(
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                    {[
                                        { label: 'Đúng giờ', color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle, key: 'presentDays' },
                                        { label: 'Đi trễ', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: Clock, key: 'lateDays' },
                                        { label: 'Nghỉ phép', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: FileText, key: 'leaveDays' },
                                        { label: 'Tổng lượt', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: Calendar, key: 'totalDays' },
                                    ].map(item => {
                                        const IconComponent = item.icon;
                                        return (
                                            <div key={item.key} style={{ background: item.bg, borderRadius: '12px', padding: '20px', border: `1px solid ${item.color}30`, textAlign: 'center' }}>
                                                <IconComponent size={28} color={item.color} />
                                                <div style={{ fontSize: '28px', fontWeight: '700', color: item.color, marginTop: '8px' }}>
                                                    {overviewStats ? (overviewStats[item.key] ?? 0) : '—'}
                                                </div>
                                                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{item.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
                                    className={styles['formInput-light']}
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
                                    className={styles['formInput-light']}
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
                                    className={styles['formInput-light']}
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
                                            { label: 'Tổng ngày', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: Calendar, key: 'totalDays' },
                                        ].map(item => {
                                            const IconComponent = item.icon;
                                            return (
                                                <div key={item.key} style={{ background: item.bg, borderRadius: '12px', padding: '20px', border: `1px solid ${item.color}30`, textAlign: 'center' }}>
                                                    <IconComponent size={32} color={item.color} style={{ marginBottom: '8px' }} />
                                                    <div style={{ fontSize: '28px', fontWeight: '700', color: item.color, marginTop: '8px' }}>
                                                        {monthlyReport[item.key] ?? 0}
                                                    </div>
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

            {activeTab === 'cashier' && (() => {
                const openSessions = cashierSessions.filter(s => s.status === 'OPEN');
                const totalOpening = cashierSessions.reduce((sum, s) => sum + (s.openingCash || 0), 0);
                const totalCash = cashierSessions.reduce((sum, s) => sum + (s.cashRevenue || 0), 0);
                const totalTransfer = cashierSessions.reduce((sum, s) => sum + (s.transferRevenue || 0), 0);

                const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

                return (
                    <>
                        {/* Thẻ tổng quan */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 16 }}>
                            {[
                                { label: 'Ca đang mở', value: openSessions.length, color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: Store },
                                { label: 'Tiền đầu ca', value: fmt(totalOpening), color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: FileText },
                                { label: 'DT tiền mặt', value: fmt(totalCash), color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: BarChart2 },
                                { label: 'DT chuyển khoản', value: fmt(totalTransfer), color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', icon: BarChart3 },
                            ].map(({ label, value, color, bg, icon: Icon }) => (
                                <div key={label} style={{
                                    background: bg, border: `1px solid ${color}30`,
                                    borderRadius: 12, padding: 20,
                                    display: 'flex', alignItems: 'center', gap: 16
                                }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 12,
                                        background: `${color}20`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Icon size={24} color={color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bảng danh sách */}
                        <div className={styles.tableCard} style={{ marginTop: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Danh sách ca thu ngân</h3>
                            </div>

                            {cashierSessions.length === 0 ? (
                                <div className={styles.emptyState} style={{ padding: 60 }}>
                                    <Store size={48} className={styles.emptyIcon} />
                                    <p>Chưa có ca thu ngân nào</p>
                                </div>
                            ) : (
                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Thu ngân</th>
                                                <th>Mở ca</th>
                                                <th>Kết ca</th>
                                                <th>Tiền đầu ca</th>
                                                <th>DT tiền mặt</th>
                                                <th>DT chuyển khoản</th>
                                                <th>Tổng DT</th>
                                                <th className={styles.textCenter}>Trạng thái</th>
                                                <th className={styles.textCenter}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cashierSessions.map(s => (
                                                <tr key={s.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{s.staffName}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.branchName}</div>
                                                    </td>
                                                    <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                                        {s.openedAt ? new Date(s.openedAt).toLocaleString('vi-VN') : '—'}
                                                    </td>
                                                    <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                                        {s.closedAt ? new Date(s.closedAt).toLocaleString('vi-VN') : '—'}
                                                    </td>
                                                    <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{fmt(s.openingCash)}</td>
                                                    <td style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>{fmt(s.cashRevenue)}</td>
                                                    <td style={{ fontSize: 13, color: '#8B5CF6', fontWeight: 600 }}>{fmt(s.transferRevenue)}</td>
                                                    <td style={{ fontSize: 13, color: '#10B981', fontWeight: 700 }}>{fmt(s.totalRevenue)}</td>
                                                    <td className={styles.textCenter}>
                                                        <span style={{
                                                            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                            background: s.status === 'OPEN' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                                            color: s.status === 'OPEN' ? '#10B981' : '#6B7280',
                                                            border: `1px solid ${s.status === 'OPEN' ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.2)'}`
                                                        }}>
                                                            {s.status === 'OPEN' ? ' Đang mở' : ' Đã đóng'}
                                                        </span>
                                                    </td>
                                                    <td className={styles.textCenter}>
                                                        <button
                                                            onClick={() => fetchSessionDetail(s.id)}
                                                            style={{
                                                                padding: '6px 14px', borderRadius: 8, fontSize: 13,
                                                                background: 'rgba(59,130,246,0.1)', color: '#3B82F6',
                                                                border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer',
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            Chi tiết
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                );
            })()}

            {/* MODAL PHÂN CA */}
            {showAssignModal && (
                <div className={styles['modalOverlay-light']} onClick={() => setShowAssignModal(false)}>
                    <div className={styles['modal-light']} onClick={(e) => e.stopPropagation()}>
                        <div className={styles['modalTitle-light']}>
                            <h3 className={styles['modalTitle-light']}>
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

                        <div className={styles['modalBody-light']}>
                            <div className={styles.formGroup}>
                                <label className={styles['formLabel-light']}>Nhân viên *</label>
                                <select
                                    value={assignForm.staffId}
                                    onChange={(e) => setAssignForm({ ...assignForm, staffId: e.target.value })}
                                    className={styles['formInput-light']}
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
                                <label className={styles['formLabel-light']}>Ca làm việc *</label>
                                <select
                                    value={assignForm.shiftId}
                                    onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
                                    className={styles['formInput-light']}
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
                                <label className={styles['formLabel-light']}>Ngày làm việc *</label>
                                <input
                                    type="date"
                                    value={assignForm.workDay}
                                    onChange={(e) => setAssignForm({ ...assignForm, workDay: e.target.value })}
                                    className={styles['formInput-light']}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles['modalFooter-light']}>
                            <button
                                type="button"
                                onClick={() => setShowAssignModal(false)}
                                className={styles['secondaryButton-light']}
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
                <div className={styles['modalOverlay-light']} onClick={() => setShowEditModal(false)}>
                    <div className={styles['modal-light']} onClick={(e) => e.stopPropagation()}>
                        <div className={styles['modalHeader-light']}>
                            <h3 className={styles['modalTitle-light']}><Edit2 size={24} /> Chỉnh sửa ca làm việc</h3>
                            <button onClick={() => setShowEditModal(false)} className={styles['modalClose-light']}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles['modalBody-light']}>
                            {/* Hiển thị tên nhân viên (readonly) */}
                            <div className={styles.formGroup}>
                                <label className={styles['formLabel-light']}>Nhân viên</label>
                                <input
                                    type="text"
                                    value={editingShift.staff?.user?.fullName || editingShift.staff?.user?.username || ''}
                                    className={styles['formInput-light']}
                                    disabled
                                />
                            </div>

                            {/* Đổi ca */}
                            <div className={styles.formGroup}>
                                <label className={styles['formLabel-light']}>Ca làm việc *</label>
                                <select
                                    value={editForm.shiftId}
                                    onChange={(e) => setEditForm({ ...editForm, shiftId: e.target.value })}
                                    className={styles['formInput-light']}
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
                                <label className={styles['formLabel-light']}>Ngày làm việc *</label>
                                <input
                                    type="date"
                                    value={editForm.workDay}
                                    onChange={(e) => setEditForm({ ...editForm, workDay: e.target.value })}
                                    className={styles['formInput-light']}
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

                        <div className={styles['modalFooter-light']}>
                            <button type="button" onClick={() => setShowEditModal(false)} className={styles['secondaryButton-light']}>
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

            {showEmploymentModal && employmentTarget && (
                <div className={styles['modalOverlay-light']} onClick={() => setShowEmploymentModal(false)}>
                    <div className={styles['modal-light']} onClick={e => e.stopPropagation()}>
                        <div className={styles['modalHeader-light']}>
                            <h3 className={styles['modalTitle-light']}>
                                <FileText size={20} /> Gán loại hợp đồng
                            </h3>
                            <button onClick={() => setShowEmploymentModal(false)} className={styles['modalClose-light']}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles['modalBody-light']}>
                            {/* Tên nhân viên readonly */}
                            <div className={styles.formGroup}>
                                <label className={styles['formLabel-light']}>Nhân viên</label>
                                <input
                                    type="text"
                                    value={employmentTarget.empName}
                                    className={styles['formInput-light']}
                                    disabled
                                />
                            </div>

                            {/* Chọn loại hợp đồng */}
                            <div className={styles.formGroup}>
                                <label className={styles['formLabel-light']}>Loại hợp đồng *</label>
                                {employmentTypes.length === 0 ? (
                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(239,68,68,0.08)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#EF4444'
                                    }}>
                                        Chưa có loại hợp đồng nào. Vui lòng tạo trước trong phần cấu hình.
                                    </div>
                                ) : (
                                    <select
                                        value={selectedEmploymentTypeId}
                                        onChange={e => setSelectedEmploymentTypeId(e.target.value)}
                                        className={styles['formInput-light']}
                                    >
                                        <option value="">-- Chọn loại hợp đồng --</option>
                                        {employmentTypes.map(et => (
                                            <option key={et.id} value={et.id}>
                                                {et.name} {et.description ? `— ${et.description}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className={styles['modalFooter-light']}>
                            <button
                                onClick={() => setShowEmploymentModal(false)}
                                className={styles['secondaryButton-light']}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAssignEmploymentType}
                                className={styles.primaryButton}
                                disabled={loading || !selectedEmploymentTypeId || employmentTypes.length === 0}
                            >
                                <Save size={18} />
                                {loading ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteModal && deleteTarget && (
                <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 28,
                        width: '100%', maxWidth: 400,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'rgba(239,68,68,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <UserX size={28} color="#EF4444" />
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#f1f3f7' }}>
                                Xóa nhân viên
                            </h3>
                            <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                                Bạn có chắc muốn xóa <strong>{deleteTarget.fullName || deleteTarget.username}</strong>?
                                <br />Hành động này không thể hoàn tác.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                                style={{
                                    flex: 1, padding: '10px', border: '1px solid #e5e7eb',
                                    borderRadius: 10, background: '#f9fafb',
                                    cursor: 'pointer', fontWeight: 600, fontSize: 14
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDeleteEmployee}
                                disabled={loading}
                                style={{
                                    flex: 2, padding: '10px', border: 'none',
                                    borderRadius: 10, cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: '#fff', fontWeight: 700, fontSize: 14
                                }}
                            >
                                {loading ? 'Đang xóa...' : '🗑 Xác nhận xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showSessionDetail && selectedSession && (
                <div className={styles.modalOverlay} onClick={() => setShowSessionDetail(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                <FileText size={20} /> Chi tiết ca thu ngân #{selectedSession.id}
                            </h3>
                            <button onClick={() => setShowSessionDetail(false)} className={styles.modalClose}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {(() => {
                                const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
                                const s = selectedSession;
                                const diff = s.differenceAmount ?? ((s.actualCash ?? 0) - (s.expectedCash ?? 0));
                                const rows = [
                                    { label: 'Thu ngân', value: s.staffName },
                                    { label: 'Chi nhánh', value: s.branchName },
                                    { label: 'Mở ca', value: s.openedAt ? new Date(s.openedAt).toLocaleString('vi-VN') : '—' },
                                    { label: 'Kết ca', value: s.closedAt ? new Date(s.closedAt).toLocaleString('vi-VN') : '—' },
                                    { label: 'Tiền đầu ca', value: fmt(s.openingCash), color: '#3B82F6' },
                                    { label: 'DT tiền mặt', value: fmt(s.cashRevenue), color: '#F59E0B' },
                                    { label: 'DT chuyển khoản', value: fmt(s.transferRevenue), color: '#8B5CF6' },
                                    { label: 'Tổng doanh thu', value: fmt(s.totalRevenue), color: '#10B981', bold: true },
                                    { label: 'Tổng đơn hàng', value: `${s.totalOrders} đơn` },
                                    ...(s.status === 'CLOSED' ? [
                                        { label: 'Tiền dự kiến', value: fmt(s.expectedCash) },
                                        { label: 'Tiền thực tế', value: fmt(s.actualCash) },
                                        {
                                            label: 'Chênh lệch',
                                            value: fmt(diff),
                                            color: diff < 0 ? '#EF4444' : diff > 0 ? '#10B981' : '#6B7280',
                                            bold: true
                                        },
                                    ] : []),
                                ];
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{
                                            display: 'inline-flex', alignSelf: 'flex-start',
                                            padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                            background: s.status === 'OPEN' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                            color: s.status === 'OPEN' ? '#10B981' : '#6B7280',
                                            border: `1px solid ${s.status === 'OPEN' ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.2)'}`
                                        }}>
                                            {s.status === 'OPEN' ? ' Đang mở' : ' Đã đóng'}
                                        </div>

                                        {rows.map(row => (
                                            <div key={row.label} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '10px 0', borderBottom: '1px solid var(--color-border)'
                                            }}>
                                                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{row.label}</span>
                                                <span style={{
                                                    fontSize: 14,
                                                    fontWeight: row.bold ? 700 : 500,
                                                    color: row.color || 'var(--color-text-primary)'
                                                }}>
                                                    {row.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowSessionDetail(false)} className={styles.secondaryButton}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL SỬA LỊCH CA */}
            {showEditScheduleModal && editingSchedule && (
                <div className={styles.modalOverlay} onClick={() => setShowEditScheduleModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                <Edit2 size={20} /> Sửa lịch ca
                            </h3>
                            <button onClick={() => setShowEditScheduleModal(false)} className={styles.modalClose}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ngày làm việc *</label>
                                <input
                                    type="date"
                                    value={editScheduleForm.workDay}
                                    onChange={e => setEditScheduleForm({ ...editScheduleForm, workDay: e.target.value })}
                                    className={styles.formInput}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ca làm việc *</label>
                                <select
                                    value={editScheduleForm.shiftId}
                                    onChange={e => setEditScheduleForm({ ...editScheduleForm, shiftId: e.target.value })}
                                    className={styles.formInput}
                                >
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
                                <input
                                    type="number" min="1"
                                    value={editScheduleForm.requiredStaff}
                                    onChange={e => setEditScheduleForm({ ...editScheduleForm, requiredStaff: parseInt(e.target.value) })}
                                    className={styles.formInput}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Số nhân viên tối đa</label>
                                <input
                                    type="number" min="1"
                                    value={editScheduleForm.maxStaff}
                                    onChange={e => setEditScheduleForm({ ...editScheduleForm, maxStaff: parseInt(e.target.value) })}
                                    className={styles.formInput}
                                />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowEditScheduleModal(false)} className={styles.secondaryButton}>
                                Hủy
                            </button>
                            <button onClick={handleUpdateSchedule} className={styles.primaryButton}>
                                <Save size={18} /> Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL XÁC NHẬN XÓA LỊCH CA */}
            {showDeleteScheduleModal && deletingSchedule && (
                <div className={styles.modalOverlay} onClick={() => setShowDeleteScheduleModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--color-bg-card)',
                        borderRadius: 16, padding: 28,
                        width: '100%', maxWidth: 400,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'rgba(239,68,68,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <AlertCircle size={28} color="#EF4444" />
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
                                Xóa lịch ca
                            </h3>
                            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                                Bạn có chắc muốn xóa lịch ca{' '}
                                <strong>{deletingSchedule.shift?.name}</strong>{' '}
                                ngày <strong>{deletingSchedule.workDay}</strong>?
                                <br />
                                <span style={{ color: '#EF4444', fontSize: 13, marginTop: 6, display: 'block' }}>
                                    ⚠ Lịch phân công nhân viên trong ca này sẽ không bị xóa.
                                </span>
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => { setShowDeleteScheduleModal(false); setDeletingSchedule(null); }}
                                style={{
                                    flex: 1, padding: '10px',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 10, background: 'var(--color-bg-card)',
                                    cursor: 'pointer', fontWeight: 600, fontSize: 14,
                                    color: 'var(--color-text-primary)'
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDeleteSchedule}
                                style={{
                                    flex: 2, padding: '10px', border: 'none',
                                    borderRadius: 10, cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: '#fff', fontWeight: 700, fontSize: 14
                                }}
                            >
                                Xác nhận xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}