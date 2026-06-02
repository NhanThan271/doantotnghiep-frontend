import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Container, Row, Col, Card, Button, Badge, Spinner,
    Alert, Modal, Form, ListGroup, Tabs, Tab
} from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'moment/locale/vi';
import { showToast } from '../../hooks/useToast';
import axiosClient from '../../api/axiosClient';
import './ShiftRegistration.css';

moment.locale('vi');
const localizer = momentLocalizer(moment);

// ========== HELPERS ==========
const formatTime = (time) => {
    if (!time) return '--:--';
    if (typeof time === 'string') return time.substring(0, 5);
    return time;
};

const formatCurrency = (amount) => {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

const formatDateTime = (dateTime) => {
    if (!dateTime) return '--:--:--';
    return moment(dateTime).format('HH:mm:ss');
};

// ========== SKELETON ==========
const ShiftSkeleton = () => (
    <div className="skeleton-loading">
        {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-item mb-3 p-3">
                <div className="skeleton-line skeleton-line-long"></div>
                <div className="skeleton-line skeleton-line-short"></div>
            </div>
        ))}
    </div>
);

// ========== STAT CARD ==========
const StatCard = ({ icon, label, value, variant }) => (
    <Card className={`stat-card ${variant} fade-in-up`}>
        <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value">{value || 0}</div>
                </div>
                <i className={`ti ti-${icon} stat-icon`}></i>
            </div>
        </Card.Body>
    </Card>
);

// ========== ATTENDANCE BADGE ==========
const AttendanceBadge = ({ status, checkIn, checkOut }) => {
    if (checkOut) return <Badge bg="success" className="px-3 py-2">✅ Đã hoàn thành</Badge>;
    if (checkIn) return <Badge bg="primary" className="px-3 py-2">🟢 Đang làm việc</Badge>;
    if (status === 'LATE') return <Badge bg="warning" className="px-3 py-2">⚠️ Check-in trễ</Badge>;
    return <Badge bg="secondary" className="px-3 py-2">⏳ Chưa check-in</Badge>;
};

// ========== MAIN COMPONENT ==========
const ShiftRegistration = () => {
    // ===== USER STATE =====
    const [staffId, setStaffId] = useState(null);
    const [staffInfo, setStaffInfo] = useState(null);
    const [branchId, setBranchId] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [error, setError] = useState(null);

    // ===== SHIFT STATE =====
    const [shifts, setShifts] = useState([]); // Danh sách loại ca (Sáng, Chiều, Tối)
    const [staffShifts, setStaffShifts] = useState([]); // Ca đã đăng ký của ngày đang chọn
    const [shiftSchedules, setShiftSchedules] = useState([]); // Ca có sẵn của ngày đang chọn
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('list');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // ===== MODAL STATE =====
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedStaffShift, setSelectedStaffShift] = useState(null);
    const [registeringShiftId, setRegisteringShiftId] = useState(null);
    const [cancellingShiftId, setCancellingShiftId] = useState(null);

    // ===== ATTENDANCE STATE =====
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    // ===== STATS STATE =====
    const [monthlyStats, setMonthlyStats] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // ===== CACHE STATE =====
    const [allMonthShifts, setAllMonthShifts] = useState([]); // TẤT CẢ ca đã đăng ký
    const [allMonthSchedules, setAllMonthSchedules] = useState([]); // TẤT CẢ lịch ca
    const [preloading, setPreloading] = useState(false);
    const cacheRef = useRef({});

    // ==========================================
    // 1. INIT USER DATA
    // ==========================================
    useEffect(() => {
        initUserData();
    }, []);

    const initUserData = async () => {
        setLoadingUser(true);
        setError(null);
        try {
            const storedUser = localStorage.getItem('user');
            let localData = {};
            if (storedUser) {
                localData = JSON.parse(storedUser);
                console.log('📦 localStorage:', localData);
            }

            let apiData = {};
            try {
                const res = await axiosClient.get('/auth/me');
                apiData = res.data;
                console.log('✅ /auth/me:', apiData);
            } catch (err) {
                console.warn('⚠️ /auth/me failed');
            }

            const data = { ...localData, ...apiData };

            let extractedBranchId = data.branchId || data.branch?.id || (typeof data.branch === 'number' ? data.branch : null);
            let branchName = data.branchName || data.branch?.name || 'N/A';
            let fullName = data.fullName || data.username || 'N/A';
            let position = data.position || null;
            let extractedStaffId = data.staffId || data.staff?.id || null;

            // Tìm staffId nếu chưa có
            if (!extractedStaffId && extractedBranchId && data.id) {
                console.log('🔍 Finding staff from branch API...');
                try {
                    const res = await axiosClient.get(`/staff/branch/${extractedBranchId}`);
                    const found = res.data.find(s => (s.userId || s.user?.id) === data.id);
                    if (found) {
                        extractedStaffId = found.id;
                        position = position || found.position;
                        console.log('✅ Found staff:', found);
                    }
                } catch (e) {
                    console.warn('⚠️ Branch API failed, using userId');
                    extractedStaffId = data.id;
                }
            }
            if (!extractedStaffId && data.id) extractedStaffId = data.id;

            console.log('🆔 Staff ID:', extractedStaffId);
            console.log('🏢 Branch ID:', extractedBranchId);

            if (!extractedBranchId) {
                setError('Không tìm thấy thông tin chi nhánh.');
                setLoadingUser(false);
                return;
            }

            setStaffId(extractedStaffId);
            setBranchId(extractedBranchId);
            setStaffInfo({
                id: extractedStaffId,
                position,
                user: { id: data.id, fullName, username: data.username, email: data.email, phone: data.phone },
                branch: { id: extractedBranchId, name: branchName }
            });

            localStorage.setItem('user', JSON.stringify({ ...data, staffId: extractedStaffId, branchId: extractedBranchId, position }));

        } catch (err) {
            console.error('❌ Init error:', err);
            setError('Không thể tải thông tin.');
        } finally {
            setLoadingUser(false);
        }
    };

    // ==========================================
    // 2. FETCH ALL SHIFTS (loại ca)
    // ==========================================
    useEffect(() => {
        axiosClient.get('/shifts')
            .then(res => {
                console.log('✅ Shifts loaded:', res.data.length);
                setShifts(res.data);
            })
            .catch(err => console.error('❌ Shifts error:', err));
    }, []);

    // ==========================================
    // 3. LOAD MONTH DATA
    // ==========================================
    useEffect(() => {
        if (staffId && branchId) {
            preloadMonthData(currentMonth);
        }
    }, [staffId, branchId, currentMonth]);

    const preloadMonthData = useCallback(async (date) => {
        if (!staffId || !branchId) {
            console.warn('⚠️ Missing staffId or branchId', { staffId, branchId });
            return;
        }

        const monthKey = moment(date).format('YYYY-MM');
        const cached = cacheRef.current[monthKey];

        if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
            console.log('📦 Using cache for', monthKey);
            setAllMonthShifts(cached.data.shifts || []);
            setAllMonthSchedules(cached.data.schedules || []);
            return;
        }

        setPreloading(true);
        try {
            console.log('🔄 Loading month data...');
            console.log('📡 GET /staff-shifts/staff/' + staffId);
            console.log('📡 GET /shift-schedules/branch/' + branchId);

            const [shiftsRes, schedulesRes] = await Promise.all([
                axiosClient.get(`/staff-shifts/staff/${staffId}`).catch(e => {
                    console.warn('⚠️ staff-shifts error:', e.response?.status);
                    return { data: [] };
                }),
                axiosClient.get(`/shift-schedules/branch/${branchId}`).catch(e => {
                    console.warn('⚠️ schedules error:', e.response?.status);
                    return { data: [] };
                })
            ]);

            console.log('✅ My shifts:', shiftsRes.data?.length || 0, 'records');
            console.log('✅ Schedules:', schedulesRes.data?.length || 0, 'records');

            if (schedulesRes.data?.length > 0) {
                console.log('📋 Sample schedule:', JSON.stringify(schedulesRes.data[0], null, 2));
            } else {
                console.warn('⚠️ NO SCHEDULES FOUND for branch:', branchId);
            }

            setAllMonthShifts(shiftsRes.data || []);
            setAllMonthSchedules(schedulesRes.data || []);

            cacheRef.current[monthKey] = {
                data: { shifts: shiftsRes.data || [], schedules: schedulesRes.data || [] },
                timestamp: Date.now()
            };
        } catch (err) {
            console.error('❌ Preload error:', err);
        } finally {
            setPreloading(false);
        }
    }, [staffId, branchId]);

    // ==========================================
    // 4. LOAD DAY DATA (DÙNG allMonthSchedules)
    // ==========================================
    const loadDayData = useCallback(async (date) => {
        if (!staffId) return;
        setSelectedDate(date);
        const dateStr = moment(date).format('YYYY-MM-DD');

        console.log('📅 Loading day:', dateStr);
        console.log('📋 allMonthSchedules count:', allMonthSchedules.length);

        setLoading(true);
        try {
            // Lấy ca đã đăng ký từ API
            const ssRes = await axiosClient.get('/staff-shifts/staff-date', {
                params: { staffId, date: dateStr }
            }).catch(() => ({ data: [] }));

            // LỌC schedules từ allMonthSchedules
            const filtered = allMonthSchedules.filter(s => {
                const sDate = s.workDay || s.work_day;
                return sDate === dateStr || moment(sDate).format('YYYY-MM-DD') === dateStr;
            });

            console.log('✅ Staff shifts for date:', ssRes.data?.length || 0);
            console.log('✅ Filtered schedules:', filtered.length);
            if (filtered.length > 0) console.log('📋 Filtered:', filtered);

            setStaffShifts(ssRes.data || []);
            setShiftSchedules(filtered || []);

        } catch (err) {
            console.error('❌ loadDayData error:', err);
            showToast('error', 'Lỗi', 'Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [staffId, allMonthSchedules]);

    // Tự động load ngày hiện tại khi allMonthSchedules thay đổi
    useEffect(() => {
        if (allMonthSchedules.length > 0 || allMonthShifts.length > 0) {
            loadDayData(selectedDate);
        }
    }, [allMonthSchedules, allMonthShifts]);

    // ==========================================
    // 5. MONTHLY STATS
    // ==========================================
    const fetchMonthlyStats = useCallback(() => {
        if (!staffId) return;
        axiosClient.get(`/attendance/monthly/${staffId}`, {
            params: { month: selectedMonth, year: selectedYear }
        })
            .then(res => setMonthlyStats(res.data))
            .catch(() => { });
    }, [staffId, selectedMonth, selectedYear]);

    useEffect(() => {
        fetchMonthlyStats();
    }, [fetchMonthlyStats]);

    // ==========================================
    // 6. REGISTER
    // ==========================================
    const handleRegisterShift = async (shiftId) => {
        setRegisteringShiftId(shiftId);
        try {
            await axiosClient.post('/staff-shifts', null, {
                params: { staffId, shiftId, workDay: moment(selectedDate).format('YYYY-MM-DD') }
            });
            showToast('success', 'Thành công', '🎉 Đăng ký ca thành công!');
            setShowRegisterModal(false);
            preloadMonthData(currentMonth);
            loadDayData(selectedDate);
        } catch (err) {
            showToast('error', 'Lỗi', err.response?.data?.message || 'Không thể đăng ký');
        } finally {
            setRegisteringShiftId(null);
        }
    };

    // ==========================================
    // 7. CANCEL
    // ==========================================
    const handleCancelRegistration = async (staffShiftId) => {
        if (!window.confirm('Bạn có chắc muốn hủy?')) return;
        setCancellingShiftId(staffShiftId);
        try {
            await axiosClient.delete(`/staff-shifts/${staffShiftId}`);
            showToast('success', 'Thành công', '✅ Đã hủy đăng ký');
            setShowDetailModal(false);
            preloadMonthData(currentMonth);
            loadDayData(selectedDate);
        } catch (err) {
            showToast('error', 'Lỗi', 'Không thể hủy');
        } finally {
            setCancellingShiftId(null);
        }
    };

    // ==========================================
    // 8. OPEN DETAIL + LOAD ATTENDANCE
    // ==========================================
    const openShiftDetail = (staffShift) => {
        console.log('📋 Opening detail:', staffShift);
        setSelectedStaffShift(staffShift);
        setTodayAttendance(null);
        setShowDetailModal(true);

        const today = moment().format('YYYY-MM-DD');
        const shiftDate = moment(staffShift.workDay).format('YYYY-MM-DD');

        if (today === shiftDate) {
            const schedule = allMonthSchedules.find(s => {
                const sDate = s.workDay || s.work_day;
                const sShiftId = s.shift?.id || s.shiftId;
                const ssShiftId = staffShift.shift?.id || staffShift.shiftId;
                return sShiftId === ssShiftId &&
                    (sDate === shiftDate || moment(sDate).format('YYYY-MM-DD') === shiftDate);
            });

            console.log('🔍 Schedule for attendance:', schedule);
            if (schedule) {
                fetchTodayAttendance(schedule.id);
            }
        }
    };

    // ==========================================
    // 9. FETCH ATTENDANCE
    // ==========================================
    const fetchTodayAttendance = async (shiftScheduleId) => {
        if (!staffId || !shiftScheduleId) return;
        console.log('📡 GET /attendance/today/' + staffId + '?shiftScheduleId=' + shiftScheduleId);
        setAttendanceLoading(true);
        try {
            const res = await axiosClient.get(`/attendance/today/${staffId}`, {
                params: { shiftScheduleId }
            });
            console.log('✅ Attendance:', res.data);
            setTodayAttendance(res.data);
        } catch (err) {
            console.warn('⚠️ No attendance:', err.response?.status);
            setTodayAttendance(null);
        } finally {
            setAttendanceLoading(false);
        }
    };

    // ==========================================
    // 10. CHECK-IN
    // ==========================================
    const handleCheckIn = async () => {
        if (!staffId || !selectedStaffShift) return;

        const shiftDate = moment(selectedStaffShift.workDay).format('YYYY-MM-DD');
        const schedule = allMonthSchedules.find(s => {
            const sDate = s.workDay || s.work_day;
            const sShiftId = s.shift?.id || s.shiftId;
            const ssShiftId = selectedStaffShift.shift?.id || selectedStaffShift.shiftId;
            return sShiftId === ssShiftId &&
                (sDate === shiftDate || moment(sDate).format('YYYY-MM-DD') === shiftDate);
        });

        if (!schedule) {
            showToast('error', 'Lỗi', 'Không tìm thấy lịch ca để check-in');
            return;
        }

        setCheckingIn(true);
        try {
            await axiosClient.post(`/attendance/check-in/${staffId}`, null, {
                params: { shiftScheduleId: schedule.id }
            });
            showToast('success', 'Thành công', '✅ Check-in thành công! 🟢');
            fetchTodayAttendance(schedule.id);
            fetchMonthlyStats();
        } catch (err) {
            showToast('error', 'Lỗi', err.response?.data?.message || 'Check-in thất bại');
        } finally {
            setCheckingIn(false);
        }
    };

    // ==========================================
    // 11. CHECK-OUT
    // ==========================================
    const handleCheckOut = async () => {
        if (!staffId || !selectedStaffShift) return;
        if (!window.confirm('Check-out? Kết thúc ca làm?')) return;

        const shiftDate = moment(selectedStaffShift.workDay).format('YYYY-MM-DD');
        const schedule = allMonthSchedules.find(s => {
            const sDate = s.workDay || s.work_day;
            const sShiftId = s.shift?.id || s.shiftId;
            const ssShiftId = selectedStaffShift.shift?.id || selectedStaffShift.shiftId;
            return sShiftId === ssShiftId &&
                (sDate === shiftDate || moment(sDate).format('YYYY-MM-DD') === shiftDate);
        });

        if (!schedule) {
            showToast('error', 'Lỗi', 'Không tìm thấy lịch ca để check-out');
            return;
        }

        setCheckingOut(true);
        try {
            await axiosClient.post(`/attendance/check-out/${staffId}`, null, {
                params: { shiftScheduleId: schedule.id }
            });
            showToast('success', 'Thành công', '🏠 Check-out thành công!');
            fetchTodayAttendance(schedule.id);
            fetchMonthlyStats();
        } catch (err) {
            showToast('error', 'Lỗi', err.response?.data?.message || 'Check-out thất bại');
        } finally {
            setCheckingOut(false);
        }
    };

    // ==========================================
    // CALENDAR EVENTS
    // ==========================================
    const calendarEvents = useMemo(() => {
        if (!allMonthShifts.length) return [];
        return allMonthShifts.map(ss => {
            const shift = shifts.find(s => s.id === (ss.shift?.id || ss.shiftId));
            return {
                id: ss.id,
                title: `✅ ${shift?.name || 'Ca'}`,
                start: moment(`${ss.workDay} ${shift?.startTime || '08:00'}`).toDate(),
                end: moment(`${ss.workDay} ${shift?.endTime || '17:00'}`).toDate(),
                resource: ss,
                allDay: false
            };
        });
    }, [allMonthShifts, shifts]);

    const eventStyleGetter = () => ({
        style: {
            backgroundColor: '#06d6a0',
            borderRadius: '6px',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer'
        }
    });

    const isShiftRegistered = useCallback((shiftId) => {
        return staffShifts.some(ss => (ss.shift?.id || ss.shiftId) === shiftId);
    }, [staffShifts]);

    const isToday = (date) => moment(date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD');

    // ==========================================
    // RENDER
    // ==========================================
    if (loadingUser) return (
        <Container className="text-center py-5">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
            <p className="mt-3">Đang tải thông tin...</p>
        </Container>
    );

    if (error) return (
        <Container className="py-5">
            <Alert variant="warning" className="text-center fade-in-up">
                <i className="ti ti-alert-triangle me-2" style={{ fontSize: '1.5rem' }}></i>
                <strong>{error}</strong>
            </Alert>
            <div className="text-center mt-3">
                <Button variant="primary" onClick={initUserData}>
                    <i className="ti ti-refresh me-2"></i>Thử lại
                </Button>
            </div>
        </Container>
    );

    return (
        <div className="shift-registration" style={{ background: '#f0f2f5', minHeight: '100vh', padding: '20px' }}>
            <Container fluid>
                {/* ===== HEADER ===== */}
                <Card className="mb-4 shadow-sm">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <h3 className="mb-1">📅 Đăng ký ca làm việc</h3>
                                <p className="text-muted mb-0">
                                    👤 <strong>{staffInfo?.user?.fullName || 'N/A'}</strong> |
                                    🏢 <strong>{staffInfo?.branch?.name || 'N/A'}</strong>
                                    {staffInfo?.position && <Badge bg="primary" className="ms-2">{staffInfo.position}</Badge>}
                                </p>
                                <small className="text-muted">
                                    StaffID: {staffId} | BranchID: {branchId} |
                                    Ca: {allMonthShifts.length} | Lịch: {allMonthSchedules.length}
                                </small>
                            </div>
                            <div className="d-flex gap-2">
                                <Button variant="outline-success" size="sm" onClick={() => preloadMonthData(currentMonth)}>
                                    <i className="ti ti-refresh me-1"></i>Tải lại
                                </Button>
                                <Button variant="outline-primary" size="sm" onClick={initUserData}>
                                    <i className="ti ti-user-check"></i>
                                </Button>
                            </div>
                        </div>
                    </Card.Body>
                </Card>

                {/* ===== STATS ===== */}
                {monthlyStats && (
                    <Row className="mb-4 g-3">
                        {[
                            { icon: 'calendar-stats', label: 'Tổng ngày', value: monthlyStats.totalDays, variant: 'primary' },
                            { icon: 'check', label: 'Đúng giờ', value: monthlyStats.presentDays, variant: 'success' },
                            { icon: 'clock-exclamation', label: 'Đi trễ', value: monthlyStats.lateDays, variant: 'warning' },
                            { icon: 'calendar-off', label: 'Nghỉ phép', value: monthlyStats.leaveDays, variant: 'info' },
                        ].map((s, i) => (
                            <Col key={i} xl={3} md={6}>
                                <StatCard {...s} />
                            </Col>
                        ))}
                    </Row>
                )}

                {/* ===== MONTH SELECTOR ===== */}
                <Card className="mb-4 shadow-sm">
                    <Card.Body>
                        <div className="d-flex align-items-center gap-2">
                            <strong>📊 Thống kê tháng:</strong>
                            <Form.Select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)} style={{ width: 130 }}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                            </Form.Select>
                            <Form.Select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)} style={{ width: 100 }}>
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </Form.Select>
                            {preloading && <Spinner animation="border" size="sm" />}
                        </div>
                    </Card.Body>
                </Card>

                {/* ===== TABS ===== */}
                <Card className="shadow-sm">
                    <Card.Header>
                        <Tabs activeKey={viewMode} onSelect={k => setViewMode(k)}>
                            <Tab eventKey="list" title="📋 Danh sách ca" />
                            <Tab eventKey="calendar" title="📅 Lịch" />
                        </Tabs>
                    </Card.Header>
                    <Card.Body>
                        {/* ===== LIST VIEW ===== */}
                        {viewMode === 'list' && (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5>
                                        📅 {moment(selectedDate).format('DD/MM/YYYY')}
                                        {isToday(selectedDate) && <Badge bg="warning" className="ms-2">Hôm nay</Badge>}
                                    </h5>
                                    <Form.Control
                                        type="date"
                                        value={moment(selectedDate).format('YYYY-MM-DD')}
                                        onChange={e => loadDayData(new Date(e.target.value))}
                                        style={{ width: 180 }}
                                    />
                                </div>

                                {loading ? <ShiftSkeleton /> : (
                                    <>
                                        {/* CA ĐÃ ĐĂNG KÝ */}
                                        <h6 className="text-success mb-2">✅ Đã đăng ký ({staffShifts.length})</h6>
                                        {staffShifts.length === 0 && <Alert variant="light">Chưa có ca nào</Alert>}
                                        {staffShifts.map(ss => (
                                            <Card key={ss.id} className="mb-2 border-success" style={{ cursor: 'pointer' }}
                                                onClick={() => openShiftDetail(ss)}>
                                                <Card.Body className="py-2 px-3">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <strong>{ss.shift?.name || 'Ca'}</strong>
                                                            <small className="text-muted ms-2">
                                                                🕐 {formatTime(ss.shift?.startTime)} - {formatTime(ss.shift?.endTime)}
                                                            </small>
                                                        </div>
                                                        <div className="d-flex gap-2">
                                                            {isToday(ss.workDay) && <Badge bg="warning">Hôm nay</Badge>}
                                                            <Badge bg="success">Đã đăng ký</Badge>
                                                        </div>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        ))}

                                        <hr />

                                        {/* CA CÓ SẴN */}
                                        <h6 className="text-primary mb-2">📝 Có sẵn ({shiftSchedules.length})</h6>
                                        {shiftSchedules.length === 0 && <Alert variant="light">Không có ca khả dụng</Alert>}
                                        {shiftSchedules.map(sc => {
                                            const shift = sc.shift || {};
                                            const registered = isShiftRegistered(shift.id);
                                            const slots = (sc.maxStaff || 0) - (sc.requiredStaff || 0);
                                            return (
                                                <Card key={sc.id} className="mb-2">
                                                    <Card.Body className="py-2 px-3">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <strong>{shift.name || 'Ca'}</strong>
                                                                <small className="text-muted ms-2">
                                                                    🕐 {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                                    {shift.workingHours && ` (${shift.workingHours}h)`}
                                                                </small>
                                                                <br />
                                                                <Badge bg={slots > 0 ? 'success' : 'danger'}>{slots > 0 ? `Còn ${slots} slot` : 'Hết slot'}</Badge>
                                                                {shift.shiftAllowance > 0 && <Badge bg="info" className="ms-1">+{formatCurrency(shift.shiftAllowance)}</Badge>}
                                                            </div>
                                                            <Button variant="primary" size="sm"
                                                                disabled={registered || slots <= 0 || registeringShiftId === shift.id}
                                                                onClick={() => handleRegisterShift(shift.id)}>
                                                                {registeringShiftId === shift.id ? <Spinner size="sm" /> :
                                                                    registered ? 'Đã đăng ký' : 'Đăng ký'}
                                                            </Button>
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            );
                                        })}
                                    </>
                                )}
                            </>
                        )}

                        {/* ===== CALENDAR VIEW ===== */}
                        {viewMode === 'calendar' && (
                            preloading ? (
                                <div className="text-center py-5"><Spinner /></div>
                            ) : (
                                <Calendar
                                    localizer={localizer}
                                    events={calendarEvents}
                                    startAccessor="start"
                                    endAccessor="end"
                                    style={{ height: 500 }}
                                    selectable
                                    onSelectSlot={s => { loadDayData(s.start); setViewMode('list'); }}
                                    onSelectEvent={e => openShiftDetail(e.resource)}
                                    onNavigate={d => setCurrentMonth(d)}
                                    views={['month']}
                                    date={currentMonth}
                                    eventPropGetter={eventStyleGetter}
                                    messages={{
                                        today: 'Hôm nay',
                                        previous: '⬅',
                                        next: '➡',
                                        noEventsInRange: 'Click ngày để đăng ký ca'
                                    }}
                                />
                            )
                        )}
                    </Card.Body>
                </Card>

                {/* ===== MODAL: ĐĂNG KÝ CA ===== */}
                <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} centered size="lg">
                    <Modal.Header closeButton style={{ background: '#4361ee', color: 'white' }}>
                        <Modal.Title>📝 Đăng ký ca làm</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <h5 className="text-center mb-3">{moment(selectedDate).format('dddd, DD/MM/YYYY')}</h5>
                        {loading ? <ShiftSkeleton /> : shiftSchedules.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-muted">Không có ca khả dụng</p>
                            </div>
                        ) : (
                            <ListGroup>
                                {shiftSchedules.map(sc => {
                                    const shift = sc.shift || {};
                                    const registered = isShiftRegistered(shift.id);
                                    const slots = (sc.maxStaff || 0) - (sc.requiredStaff || 0);
                                    return (
                                        <ListGroup.Item key={sc.id} className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>{shift.name}</strong>
                                                <div className="text-muted">
                                                    🕐 {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                    {shift.workingHours && ` (${shift.workingHours}h)`}
                                                </div>
                                                <Badge bg={slots > 0 ? 'success' : 'danger'}>{slots > 0 ? `Còn ${slots} slot` : 'Hết slot'}</Badge>
                                                {shift.shiftAllowance > 0 && <Badge bg="info" className="ms-1">+{formatCurrency(shift.shiftAllowance)}</Badge>}
                                            </div>
                                            <Button variant="primary" size="sm"
                                                disabled={registered || slots <= 0}
                                                onClick={() => handleRegisterShift(shift.id)}>
                                                {registered ? '✓ Đã đăng ký' : 'Đăng ký ngay'}
                                            </Button>
                                        </ListGroup.Item>
                                    );
                                })}
                            </ListGroup>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowRegisterModal(false)}>Đóng</Button>
                    </Modal.Footer>
                </Modal>

                {/* ===== MODAL: CHI TIẾT + CHECK-IN/OUT ===== */}
                <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered size="lg">
                    <Modal.Header closeButton style={{ background: '#4361ee', color: 'white' }}>
                        <Modal.Title>📋 Chi tiết ca làm</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedStaffShift && (
                            <>
                                <Row className="mb-3">
                                    <Col xs={6}>
                                        <Card className="text-center p-3 bg-light">
                                            <small className="text-muted">Ngày làm</small>
                                            <h5>{moment(selectedStaffShift.workDay).format('DD/MM/YYYY')}</h5>
                                            {isToday(selectedStaffShift.workDay) && <Badge bg="warning">Hôm nay</Badge>}
                                        </Card>
                                    </Col>
                                    <Col xs={6}>
                                        <Card className="text-center p-3 bg-light">
                                            <small className="text-muted">Ca làm</small>
                                            <h5>{selectedStaffShift.shift?.name || 'Ca'}</h5>
                                            <small>{formatTime(selectedStaffShift.shift?.startTime)} - {formatTime(selectedStaffShift.shift?.endTime)}</small>
                                        </Card>
                                    </Col>
                                </Row>

                                {/* CHECK-IN / CHECK-OUT */}
                                {isToday(selectedStaffShift.workDay) && (
                                    <Card className="border-primary mb-3">
                                        <Card.Header className="bg-primary text-white"><strong>🕐 Điểm danh</strong></Card.Header>
                                        <Card.Body>
                                            {attendanceLoading ? (
                                                <div className="text-center"><Spinner size="sm" /></div>
                                            ) : todayAttendance ? (
                                                <div>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span>Trạng thái:</span>
                                                        <AttendanceBadge {...todayAttendance} />
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span>Check-in:</span>
                                                        <strong>{formatDateTime(todayAttendance.checkIn)}</strong>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span>Check-out:</span>
                                                        <strong>{formatDateTime(todayAttendance.checkOut)}</strong>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Alert variant="light" className="text-center mb-0">Chưa điểm danh</Alert>
                                            )}

                                            <div className="d-flex gap-2 mt-3">
                                                <Button variant="success" className="flex-fill"
                                                    disabled={todayAttendance?.checkIn || checkingIn}
                                                    onClick={handleCheckIn}>
                                                    {checkingIn ? <Spinner size="sm" /> :
                                                        todayAttendance?.checkIn ? '✅ Đã check-in' : '🟢 CHECK-IN'}
                                                </Button>
                                                <Button variant="danger" className="flex-fill"
                                                    disabled={!todayAttendance?.checkIn || todayAttendance?.checkOut || checkingOut}
                                                    onClick={handleCheckOut}>
                                                    {checkingOut ? <Spinner size="sm" /> :
                                                        todayAttendance?.checkOut ? '✅ Đã check-out' : '🔴 CHECK-OUT'}
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                )}

                                {!isToday(selectedStaffShift.workDay) && (
                                    <Alert variant="info" className="text-center">
                                        💡 Check-in/Check-out chỉ khả dụng trong ngày làm việc
                                    </Alert>
                                )}
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="d-flex justify-content-between">
                        <Button variant="outline-danger"
                            onClick={() => handleCancelRegistration(selectedStaffShift?.id)}
                            disabled={cancellingShiftId === selectedStaffShift?.id}>
                            {cancellingShiftId === selectedStaffShift?.id ? 'Đang hủy...' : '🗑️ Hủy đăng ký'}
                        </Button>
                        <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Đóng</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default ShiftRegistration;