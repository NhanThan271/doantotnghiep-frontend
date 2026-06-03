import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Container, Row, Col, Card, Button, Badge, Spinner,
    Alert, Modal, Form, ListGroup, Tabs, Tab, ProgressBar
} from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'moment/locale/vi';
import { showToast } from '../../hooks/useToast';
import axiosClient from '../../api/axiosClient';
import './ShiftRegistration.css';

// Import icons from react-icons
import {
    FaChartBar, FaCheckCircle, FaExclamationTriangle,
    FaCalendarAlt, FaUser, FaBuilding, FaClock, FaHourglassHalf,
    FaSyncAlt, FaCheck, FaTimes, FaTrashAlt, FaInfoCircle,
    FaClipboardList, FaList, FaEye, FaDollarSign
} from 'react-icons/fa';
import { FiClock, FiCalendar, FiUser, FiHome, FiRefreshCw } from 'react-icons/fi';
import { TiTick, TiCancel, TiArrowRight, TiArrowLeft } from 'react-icons/ti';

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
const StatCard = ({ icon: IconComponent, label, value, variant }) => (
    <Card className={`stat-card ${variant} fade-in-up`}>
        <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value">{value || 0}</div>
                </div>
                <IconComponent className="stat-icon" size={40} />
            </div>
        </Card.Body>
    </Card>
);

// ========== ATTENDANCE BADGE ==========
const AttendanceBadge = ({ status, checkIn, checkOut }) => {
    if (checkOut) return <Badge bg="success" className="px-3 py-2"><FaCheck className="me-1" /> Đã hoàn thành</Badge>;
    if (checkIn) return <Badge bg="primary" className="px-3 py-2"><FaClock className="me-1" /> Đang làm việc</Badge>;
    if (status === 'LATE') return <Badge bg="warning" className="px-3 py-2"><FaExclamationTriangle className="me-1" /> Check-in trễ</Badge>;
    return <Badge bg="secondary" className="px-3 py-2"><FaClock className="me-1" /> Chưa check-in</Badge>;
};

// ========== SHIFT CARD COMPONENT ==========
const ShiftCard = ({ shift, assignedCount, requiredStaff, maxStaff, registered, onRegister, registering, showRegister = true }) => {
    const filled = requiredStaff > 0 ? Math.min(100, (assignedCount / requiredStaff) * 100) : 0;
    const isFull = assignedCount >= requiredStaff;
    const isOver = assignedCount > requiredStaff;

    let statusColor = '#e9ecef';
    let statusText = '';
    let progressVariant = 'secondary';

    if (assignedCount === 0) {
        statusColor = '#dc3545';
        statusText = 'Chưa có ai';
        progressVariant = 'danger';
    } else if (isFull && !isOver) {
        statusColor = '#28a745';
        statusText = 'Đã đủ';
        progressVariant = 'success';
    } else if (isOver) {
        statusColor = '#17a2b8';
        statusText = 'Đã đủ (dư)';
        progressVariant = 'info';
    } else {
        statusColor = '#ffc107';
        statusText = `Thiếu ${requiredStaff - assignedCount}`;
        progressVariant = 'warning';
    }

    return (
        <Card className="shift-card mb-3" style={{
            borderLeft: `4px solid ${statusColor}`,
            borderRadius: '12px',
            transition: 'all 0.3s ease',
            backgroundColor: registered ? '#f0fff4' : 'white'
        }}>
            <Card.Body className="py-3 px-4">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <h6 className="mb-0 fw-bold">{shift.name || 'Ca'}</h6>
                            {shift.shiftAllowance > 0 && (
                                <Badge bg="warning" text="dark" className="px-2">
                                    <FaDollarSign className="me-1" /> +{formatCurrency(shift.shiftAllowance)}
                                </Badge>
                            )}
                            {registered && (
                                <Badge bg="success" className="px-2"><FaCheck className="me-1" /> Đã đăng ký</Badge>
                            )}
                        </div>

                        <div className="d-flex align-items-center gap-3 text-muted small mb-2">
                            <span>
                                <FiClock className="me-1" size={14} />
                                {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                            </span>
                            {shift.workingHours && (
                                <span>
                                    <FaHourglassHalf className="me-1" size={14} />
                                    {shift.workingHours}h
                                </span>
                            )}
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <div style={{ width: '120px' }}>
                                <ProgressBar
                                    now={filled}
                                    variant={progressVariant}
                                    style={{ height: '8px', borderRadius: '4px' }}
                                />
                            </div>
                            <Badge bg={isFull ? 'success' : 'warning'} className="px-2">
                                {assignedCount}/{requiredStaff}
                            </Badge>
                            <small className="text-muted">{statusText}</small>
                        </div>
                    </div>

                    {showRegister && (
                        <Button
                            variant={registered ? 'outline-success' : 'primary'}
                            size="sm"
                            className="px-4 rounded-pill"
                            disabled={registered || isFull || registering}
                            onClick={onRegister}
                            style={{ minWidth: '100px' }}
                        >
                            {registering ? (
                                <Spinner size="sm" />
                            ) : registered ? (
                                'Đã đăng ký'
                            ) : isFull ? (
                                'Đã đủ'
                            ) : (
                                'Đăng ký'
                            )}
                        </Button>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
};

// ========== MAIN COMPONENT ==========
const ShiftRegistration = () => {
    const [staffId, setStaffId] = useState(null);
    const [staffInfo, setStaffInfo] = useState(null);
    const [branchId, setBranchId] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [error, setError] = useState(null);

    const [shifts, setShifts] = useState([]);
    const [staffShifts, setStaffShifts] = useState([]);
    const [shiftSchedules, setShiftSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('list');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedStaffShift, setSelectedStaffShift] = useState(null);
    const [registeringShiftId, setRegisteringShiftId] = useState(null);
    const [cancellingShiftId, setCancellingShiftId] = useState(null);

    const [checkingIn, setCheckingIn] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    const [monthlyStats, setMonthlyStats] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [allMonthShifts, setAllMonthShifts] = useState([]);
    const [allMonthSchedules, setAllMonthSchedules] = useState([]);
    const [preloading, setPreloading] = useState(false);
    const cacheRef = useRef({});

    // ========== INIT ==========
    useEffect(() => { initUserData(); }, []);

    const initUserData = async () => {
        setLoadingUser(true);
        try {
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            let apiData = {};
            try { const res = await axiosClient.get('/auth/me'); apiData = res.data; } catch (e) { }
            const data = { ...stored, ...apiData };

            let bid = data.branchId || data.branch?.id || data.branch;
            let bname = data.branchName || data.branch?.name || 'N/A';
            let sid = data.staffId || null;

            if (!sid && bid && data.id) {
                try {
                    const res = await axiosClient.get(`/staff/branch/${bid}`);
                    const found = res.data.find(s => (s.userId || s.user?.id) === data.id);
                    sid = found?.id || data.id;
                } catch (e) { sid = data.id; }
            }
            if (!sid) sid = data.id;

            setStaffId(sid); setBranchId(bid);
            setStaffInfo({
                id: sid, position: data.position,
                user: { id: data.id, fullName: data.fullName || data.username },
                branch: { id: bid, name: bname }
            });
        } catch (e) { setError('Lỗi tải thông tin'); }
        finally { setLoadingUser(false); }
    };

    // ========== SHIFTS ==========
    useEffect(() => { axiosClient.get('/shifts').then(r => setShifts(r.data)).catch(() => { }); }, []);

    // ========== MONTH DATA ==========
    useEffect(() => { if (staffId && branchId) preloadMonthData(currentMonth); }, [staffId, branchId, currentMonth]);

    const preloadMonthData = useCallback(async (date) => {
        if (!staffId || !branchId) return;
        setPreloading(true);
        try {
            const [ss, sc] = await Promise.all([
                axiosClient.get(`/staff-shifts/staff/${staffId}`).catch(() => ({ data: [] })),
                axiosClient.get(`/shift-schedules/branch/${branchId}`).catch(() => ({ data: [] }))
            ]);
            setAllMonthShifts(ss.data || []);
            setAllMonthSchedules(sc.data || []);
        } catch (e) { } finally { setPreloading(false); }
    }, [staffId, branchId]);

    // ========== DAY DATA ==========
    const loadDayData = useCallback(async (date) => {
        if (!staffId) return;
        setSelectedDate(date);
        const ds = moment(date).format('YYYY-MM-DD');
        setLoading(true);
        try {
            const ssRes = await axiosClient.get('/staff-shifts/staff-date', { params: { staffId, date: ds } }).catch(() => ({ data: [] }));
            const filtered = allMonthSchedules.filter(s => {
                const sd = s.workDay || s.work_day;
                return sd === ds || moment(sd).format('YYYY-MM-DD') === ds;
            });
            setStaffShifts(ssRes.data || []);
            setShiftSchedules(filtered || []);
        } catch (e) { } finally { setLoading(false); }
    }, [staffId, allMonthSchedules]);

    useEffect(() => { if (allMonthSchedules.length > 0) loadDayData(selectedDate); }, [allMonthSchedules]);

    // ========== STATS ==========
    const fetchMonthlyStats = useCallback(() => {
        if (!staffId) return;
        axiosClient.get(`/attendance/monthly/${staffId}`, { params: { month: selectedMonth, year: selectedYear } })
            .then(r => setMonthlyStats(r.data)).catch(() => { });
    }, [staffId, selectedMonth, selectedYear]);
    useEffect(() => { fetchMonthlyStats(); }, [fetchMonthlyStats]);

    // ========== REGISTER ==========
    const handleRegister = async (shiftId) => {
        setRegisteringShiftId(shiftId);
        try {
            await axiosClient.post('/staff-shifts', null, { params: { staffId, shiftId, workDay: moment(selectedDate).format('YYYY-MM-DD') } });
            showToast('success', 'Thành công', 'Đăng ký ca thành công!');
            preloadMonthData(currentMonth);
            loadDayData(selectedDate);
        } catch (err) {
            showToast('error', 'Lỗi', err.response?.data?.message || 'Không thể đăng ký');
        } finally { setRegisteringShiftId(null); }
    };

    // ========== CANCEL ==========
    const handleCancel = async (id) => {
        if (!window.confirm('Hủy đăng ký?')) return;
        setCancellingShiftId(id);
        try {
            await axiosClient.delete(`/staff-shifts/${id}`);
            showToast('success', 'Thành công', 'Đã hủy!');
            setShowDetailModal(false);
            preloadMonthData(currentMonth);
            loadDayData(selectedDate);
        } catch (err) { showToast('error', 'Lỗi', 'Không thể hủy'); }
        finally { setCancellingShiftId(null); }
    };

    // ========== DETAIL + ATTENDANCE ==========
    const openDetail = (ss) => {
        setSelectedStaffShift(ss);
        setTodayAttendance(null);
        setShowDetailModal(true);
        const today = moment().format('YYYY-MM-DD');
        const sd = moment(ss.workDay).format('YYYY-MM-DD');
        if (today === sd) {
            const sc = allMonthSchedules.find(s => {
                return (s.shift?.id || s.shiftId) === (ss.shift?.id || ss.shiftId) &&
                    ((s.workDay || s.work_day) === sd || moment(s.workDay || s.work_day).format('YYYY-MM-DD') === sd);
            });
            if (sc) fetchAttendance(sc.id);
        }
    };

    const fetchAttendance = async (scheduleId) => {
        setAttendanceLoading(true);
        try {
            const res = await axiosClient.get(`/attendance/today/${staffId}`, { params: { shiftScheduleId: scheduleId } });
            setTodayAttendance(res.data);
        } catch (e) { setTodayAttendance(null); }
        finally { setAttendanceLoading(false); }
    };

    const handleCheckIn = async () => {
        const sd = moment(selectedStaffShift.workDay).format('YYYY-MM-DD');
        const sc = allMonthSchedules.find(s => {
            return (s.shift?.id || s.shiftId) === (selectedStaffShift.shift?.id || selectedStaffShift.shiftId) &&
                ((s.workDay || s.work_day) === sd || moment(s.workDay || s.work_day).format('YYYY-MM-DD') === sd);
        });
        if (!sc) { showToast('error', 'Lỗi', 'Không tìm thấy lịch ca'); return; }
        setCheckingIn(true);
        try {
            await axiosClient.post(`/attendance/check-in/${staffId}`, null, { params: { shiftScheduleId: sc.id } });
            showToast('success', 'OK', 'Check-in thành công!');
            fetchAttendance(sc.id);
            fetchMonthlyStats();
        } catch (err) { showToast('error', 'Lỗi', err.response?.data?.message); }
        finally { setCheckingIn(false); }
    };

    const handleCheckOut = async () => {
        if (!window.confirm('Check-out?')) return;
        const sd = moment(selectedStaffShift.workDay).format('YYYY-MM-DD');
        const sc = allMonthSchedules.find(s => {
            return (s.shift?.id || s.shiftId) === (selectedStaffShift.shift?.id || selectedStaffShift.shiftId) &&
                ((s.workDay || s.work_day) === sd || moment(s.workDay || s.work_day).format('YYYY-MM-DD') === sd);
        });
        if (!sc) { showToast('error', 'Lỗi', 'Không tìm thấy lịch ca'); return; }
        setCheckingOut(true);
        try {
            await axiosClient.post(`/attendance/check-out/${staffId}`, null, { params: { shiftScheduleId: sc.id } });
            showToast('success', 'OK', 'Check-out thành công!');
            fetchAttendance(sc.id);
            fetchMonthlyStats();
        } catch (err) { showToast('error', 'Lỗi', err.response?.data?.message); }
        finally { setCheckingOut(false); }
    };

    // ========== CALENDAR ==========
    const calendarEvents = useMemo(() => {
        return allMonthShifts.map(ss => {
            const shift = shifts.find(s => s.id === (ss.shift?.id || ss.shiftId));
            return {
                id: ss.id, title: `${shift?.name || 'Ca'}`,
                start: moment(`${ss.workDay} ${shift?.startTime || '08:00'}`).toDate(),
                end: moment(`${ss.workDay} ${shift?.endTime || '17:00'}`).toDate(),
                resource: ss, allDay: false
            };
        });
    }, [allMonthShifts, shifts]);

    const isToday = (d) => moment(d).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD');

    if (loadingUser) return <Container className="text-center py-5"><Spinner /></Container>;
    if (error) return <Container className="py-5"><Alert variant="warning">{error}</Alert></Container>;

    return (
        <div style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)', minHeight: '100vh', padding: '24px' }}>
            <Container fluid>
                {/* HEADER */}
                <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '16px', background: 'white' }}>
                    <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h3 className="mb-1" style={{ color: '#2c3e50', fontWeight: 700 }}>
                                    <FaCalendarAlt className="me-2" /> Quản lý ca làm việc
                                </h3>
                                <div className="d-flex align-items-center gap-3 mt-2">
                                    <span className="text-muted">
                                        <FaUser className="me-1" size={14} /> <strong>{staffInfo?.user?.fullName}</strong>
                                    </span>
                                    <span className="text-muted">|</span>
                                    <span className="text-muted">
                                        <FaBuilding className="me-1" size={14} /> <strong>{staffInfo?.branch?.name}</strong>
                                    </span>
                                    {staffInfo?.position && (
                                        <Badge bg="primary" className="px-3 py-2 rounded-pill">{staffInfo.position}</Badge>
                                    )}
                                </div>
                            </div>
                            <Button variant="outline-secondary" size="sm" className="rounded-pill" onClick={() => preloadMonthData(currentMonth)}>
                                <FaSyncAlt className="me-1" size={12} /> Tải lại
                            </Button>
                        </div>
                    </Card.Body>
                </Card>

                {/* STATS */}
                {monthlyStats && (
                    <Row className="mb-4 g-3">
                        {[
                            { icon: FaChartBar, label: 'Tổng ngày', val: monthlyStats.totalDays, variant: 'primary' },
                            { icon: FaCheckCircle, label: 'Đúng giờ', val: monthlyStats.presentDays, variant: 'success' },
                            { icon: FaExclamationTriangle, label: 'Đi trễ', val: monthlyStats.lateDays, variant: 'warning' },
                            { icon: FaCalendarAlt, label: 'Nghỉ phép', val: monthlyStats.leaveDays, variant: 'info' },
                        ].map((s, i) => (
                            <Col key={i} xs={6} md={3}>
                                <StatCard icon={s.icon} label={s.label} value={s.val} variant={s.variant} />
                            </Col>
                        ))}
                    </Row>
                )}

                {/* MONTH SELECTOR */}
                <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                    <Card.Body className="py-2 px-4">
                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold"><FaChartBar className="me-1" /> Thống kê:</span>
                            <Form.Select size="sm" value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)} style={{ width: 130 }}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                            </Form.Select>
                            <Form.Select size="sm" value={selectedYear} onChange={e => setSelectedYear(+e.target.value)} style={{ width: 100 }}>
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </Form.Select>
                        </div>
                    </Card.Body>
                </Card>

                {/* TABS */}
                <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <Card.Header className="bg-white border-0 pt-3 px-4">
                        <Tabs activeKey={viewMode} onSelect={k => setViewMode(k)} className="border-0">
                            <Tab eventKey="list" title={<span className="px-2"><FaClipboardList className="me-2" /> Danh sách ca</span>} />
                            <Tab eventKey="calendar" title={<span className="px-2"><FaCalendarAlt className="me-2" /> Lịch tháng</span>} />
                        </Tabs>
                    </Card.Header>
                    <Card.Body className="p-4">
                        {viewMode === 'list' && (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div className="date-display">
                                        <h5 className="mb-0 d-flex align-items-center">
                                            <FaCalendarAlt className="me-2" />
                                            <span>{moment(selectedDate).format('dddd, DD/MM/YYYY')}</span>
                                            {isToday(selectedDate) && (
                                                <Badge className="ms-2 rounded-pill px-3">Hôm nay</Badge>
                                            )}
                                        </h5>
                                    </div>
                                    <Form.Control
                                        type="date"
                                        className="date-picker"
                                        value={moment(selectedDate).format('YYYY-MM-DD')}
                                        onChange={e => loadDayData(new Date(e.target.value))}
                                        style={{ width: 180 }}
                                    />
                                </div>

                                {loading ? <ShiftSkeleton /> : (
                                    <>
                                        {/* ĐÃ ĐĂNG KÝ */}
                                        {staffShifts.length > 0 && (
                                            <div className="mb-4">
                                                <h6 className="fw-bold mb-3" style={{ color: '#28a745' }}>
                                                    <FaCheckCircle className="me-2" /> Ca đã đăng ký ({staffShifts.length})
                                                </h6>
                                                {staffShifts.map(ss => (
                                                    <Card key={ss.id} className="mb-2 border-0 shadow-sm"
                                                        style={{ borderRadius: '12px', borderLeft: '4px solid #28a745', cursor: 'pointer' }}
                                                        onClick={() => openDetail(ss)}>
                                                        <Card.Body className="py-3 px-4">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <strong className="text-success">{ss.shift?.name}</strong>
                                                                    <span className="text-muted ms-3">
                                                                        <FiClock className="me-1" size={14} /> {formatTime(ss.shift?.startTime)} - {formatTime(ss.shift?.endTime)}
                                                                    </span>
                                                                </div>
                                                                <div className="d-flex gap-2">
                                                                    {isToday(ss.workDay) && <Badge bg="warning" className="rounded-pill px-3">Hôm nay</Badge>}
                                                                    <Badge bg="success" className="rounded-pill px-3"><FaCheck className="me-1" /> Đã đăng ký</Badge>
                                                                </div>
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}

                                        {/* CA CÓ SẴN */}
                                        {shiftSchedules.length > 0 && (
                                            <div>
                                                <h6 className="fw-bold mb-3" style={{ color: '#4361ee' }}>
                                                    <FiClock className="me-2" /> Ca có sẵn để đăng ký ({shiftSchedules.length})
                                                </h6>
                                                {shiftSchedules.map(sc => {
                                                    const shift = sc.shift || {};
                                                    const registered = staffShifts.some(ss => (ss.shift?.id || ss.shiftId) === shift.id);
                                                    const assignedCount = staffShifts.filter(ss => (ss.shift?.id || ss.shiftId) === shift.id).length;
                                                    const requiredStaff = sc.requiredStaff || 0;
                                                    const maxStaff = sc.maxStaff || 10;
                                                    const isFull = assignedCount >= requiredStaff;

                                                    return (
                                                        <ShiftCard
                                                            key={sc.id}
                                                            shift={shift}
                                                            assignedCount={assignedCount}
                                                            requiredStaff={requiredStaff}
                                                            maxStaff={maxStaff}
                                                            registered={registered}
                                                            onRegister={() => handleRegister(shift.id)}
                                                            registering={registeringShiftId === shift.id}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {staffShifts.length === 0 && shiftSchedules.length === 0 && (
                                            <div className="text-center py-5">
                                                <FaCalendarAlt style={{ fontSize: '4rem', opacity: 0.3 }} />
                                                <p className="text-muted mt-3">Không có ca làm nào cho ngày này</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {viewMode === 'calendar' && (
                            <Calendar localizer={localizer} events={calendarEvents}
                                startAccessor="start" endAccessor="end" style={{ height: 500 }}
                                selectable onSelectSlot={s => { loadDayData(s.start); setViewMode('list'); }}
                                onSelectEvent={e => openDetail(e.resource)}
                                onNavigate={d => setCurrentMonth(d)} views={['month']} date={currentMonth}
                                eventPropGetter={() => ({ style: { backgroundColor: '#06d6a0', borderRadius: '8px', color: 'white', border: 'none', padding: '4px 8px', fontWeight: 600, cursor: 'pointer' } })}
                                messages={{ today: 'Hôm nay', noEventsInRange: 'Click ngày để xem ca' }} />
                        )}
                    </Card.Body>
                </Card>

                {/* MODAL CHI TIẾT */}
                <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered>
                    <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #4361ee, #3f37c9)', color: 'white', borderRadius: '12px 12px 0 0' }}>
                        <Modal.Title><FaInfoCircle className="me-2" /> Chi tiết ca làm</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {selectedStaffShift && (
                            <>
                                <Row className="mb-4">
                                    <Col xs={6}>
                                        <div className="text-center p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                                            <small className="text-muted d-block mb-1"><FaCalendarAlt className="me-1" /> Ngày làm</small>
                                            <strong className="d-block" style={{ fontSize: '1.2rem' }}>
                                                {moment(selectedStaffShift.workDay).format('DD/MM/YYYY')}
                                            </strong>
                                            {isToday(selectedStaffShift.workDay) && <Badge bg="warning" className="mt-1 rounded-pill">Hôm nay</Badge>}
                                        </div>
                                    </Col>
                                    <Col xs={6}>
                                        <div className="text-center p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                                            <small className="text-muted d-block mb-1"><FiClock className="me-1" /> Ca làm</small>
                                            <strong className="d-block" style={{ fontSize: '1.2rem' }}>{selectedStaffShift.shift?.name}</strong>
                                            <small className="text-muted">{formatTime(selectedStaffShift.shift?.startTime)} - {formatTime(selectedStaffShift.shift?.endTime)}</small>
                                        </div>
                                    </Col>
                                </Row>

                                {isToday(selectedStaffShift.workDay) && (
                                    <div className="p-3 rounded-3 mb-3" style={{ background: '#f0f4ff', border: '2px solid #4361ee' }}>
                                        <h6 className="mb-3"><FiClock className="me-2" /> Điểm danh hôm nay</h6>
                                        {attendanceLoading ? <div className="text-center"><Spinner size="sm" /></div> :
                                            todayAttendance ? (
                                                <div>
                                                    <div className="d-flex justify-content-between mb-2"><span>Trạng thái:</span><AttendanceBadge {...todayAttendance} /></div>
                                                    <div className="d-flex justify-content-between mb-2"><span>Check-in:</span><strong>{formatDateTime(todayAttendance.checkIn)}</strong></div>
                                                    <div className="d-flex justify-content-between"><span>Check-out:</span><strong>{formatDateTime(todayAttendance.checkOut)}</strong></div>
                                                </div>
                                            ) : <Alert variant="light" className="text-center mb-0">Chưa điểm danh</Alert>}
                                        <div className="d-flex gap-2 mt-3">
                                            <Button variant="success" className="flex-fill rounded-pill" disabled={todayAttendance?.checkIn || checkingIn} onClick={handleCheckIn}>
                                                {checkingIn ? <Spinner size="sm" /> : todayAttendance?.checkIn ? <><FaCheck className="me-1" /> Đã check-in</> : <><FiClock className="me-1" /> CHECK-IN</>}
                                            </Button>
                                            <Button variant="danger" className="flex-fill rounded-pill" disabled={!todayAttendance?.checkIn || todayAttendance?.checkOut || checkingOut} onClick={handleCheckOut}>
                                                {checkingOut ? <Spinner size="sm" /> : todayAttendance?.checkOut ? <><FaCheck className="me-1" /> Đã check-out</> : <><FaTimes className="me-1" /> CHECK-OUT</>}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="outline-danger" className="rounded-pill" onClick={() => handleCancel(selectedStaffShift?.id)}>
                            <FaTrashAlt className="me-1" /> Hủy đăng ký
                        </Button>
                        <Button variant="secondary" className="rounded-pill" onClick={() => setShowDetailModal(false)}>Đóng</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default ShiftRegistration;