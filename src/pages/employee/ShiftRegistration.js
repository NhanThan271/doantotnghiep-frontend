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

// ========== HELPER FUNCTIONS ==========
const formatTime = (time) => {
    if (!time) return 'N/A';
    return time.substring(0, 5);
};

const formatCurrency = (amount) => {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

// ========== SKELETON LOADING ==========
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
                    <div className="stat-value">{value}</div>
                </div>
                <i className={`ti ti-${icon} stat-icon`}></i>
            </div>
        </Card.Body>
    </Card>
);

// ========== MAIN COMPONENT ==========
const ShiftRegistration = () => {
    // ===== LẤY USER TỪ LOCALSTORAGE =====
    const [user, setUser] = useState(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error('Lỗi parse user:', e);
            }
        }
    }, []);

    // ===== STATE =====
    const [staffId, setStaffId] = useState(null);
    const [staffInfo, setStaffInfo] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [staffShifts, setStaffShifts] = useState([]);
    const [shiftSchedules, setShiftSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('calendar');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Modal states
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [selectedStaffShift, setSelectedStaffShift] = useState(null);
    const [registeringShiftId, setRegisteringShiftId] = useState(null);
    const [cancellingShiftId, setCancellingShiftId] = useState(null);

    // Stats
    const [monthlyStats, setMonthlyStats] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Preloaded data
    const [allMonthShifts, setAllMonthShifts] = useState([]);
    const [allMonthSchedules, setAllMonthSchedules] = useState([]);
    const [preloading, setPreloading] = useState(false);

    // Cache
    const cacheRef = useRef({});
    const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

    // ===== API CALLS =====

    // Lấy staff ID từ user
    useEffect(() => {
        const fetchStaffInfo = async () => {
            if (!user?.id) return;
            try {
                const res = await axiosClient.get(`/staff/user/${user.id}`);
                setStaffId(res.data.id);
                setStaffInfo(res.data);
            } catch (err) {
                console.error('Lỗi lấy thông tin nhân viên:', err);
                setError('Không thể lấy thông tin nhân viên. Vui lòng đăng nhập lại.');
            }
        };
        fetchStaffInfo();
    }, [user]);

    // Lấy danh sách ca làm
    useEffect(() => {
        const fetchShifts = async () => {
            try {
                const res = await axiosClient.get('/shifts');
                setShifts(res.data);
            } catch (err) {
                console.error('Lỗi lấy danh sách ca:', err);
            }
        };
        fetchShifts();
    }, []);

    // Preload data cả tháng
    const preloadMonthData = useCallback(async (date) => {
        if (!staffId || !staffInfo?.branch?.id) return;

        const monthKey = moment(date).format('YYYY-MM');
        const cached = cacheRef.current[monthKey];

        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            setAllMonthShifts(cached.data.shifts || []);
            setAllMonthSchedules(cached.data.schedules || []);
            return;
        }

        setPreloading(true);
        try {
            const [shiftsRes, schedulesRes] = await Promise.all([
                axiosClient.get(`/staff-shifts/staff/${staffId}`).catch(() => ({ data: [] })),
                axiosClient.get(`/shift-schedules/branch/${staffInfo.branch.id}`).catch(() => ({ data: [] }))
            ]);

            setAllMonthShifts(shiftsRes.data || []);
            setAllMonthSchedules(schedulesRes.data || []);

            cacheRef.current[monthKey] = {
                data: {
                    shifts: shiftsRes.data || [],
                    schedules: schedulesRes.data || []
                },
                timestamp: Date.now()
            };

        } catch (err) {
            console.error('Lỗi preload:', err);
        } finally {
            setPreloading(false);
        }
    }, [staffId, staffInfo]);

    // Preload khi component mount
    useEffect(() => {
        preloadMonthData(new Date());
    }, [preloadMonthData]);

    // Xử lý khi chọn ngày - CỰC NHANH (dùng data đã preload)
    const handleDateSelect = useCallback((date) => {
        setSelectedDate(date);

        const dateStr = moment(date).format('YYYY-MM-DD');

        // Lọc từ data đã preload (gần như instant)
        const dayShifts = allMonthShifts.filter(
            s => moment(s.workDay).format('YYYY-MM-DD') === dateStr
        );
        const daySchedules = allMonthSchedules.filter(
            s => moment(s.workDay).format('YYYY-MM-DD') === dateStr
        );

        setStaffShifts(dayShifts);
        setShiftSchedules(daySchedules);

        // Nếu chưa có data, fetch riêng ngày đó
        if (daySchedules.length === 0 && staffInfo?.branch?.id) {
            fetchShiftSchedulesByDate(date);
        }

        setShowRegisterModal(true);
    }, [allMonthShifts, allMonthSchedules, staffInfo]);

    // Fetch shift schedules theo ngày (fallback)
    const fetchShiftSchedulesByDate = useCallback(async (date) => {
        setLoading(true);
        try {
            const formattedDate = moment(date).format('YYYY-MM-DD');
            const res = await axiosClient.get('/shift-schedules/work-day', {
                params: { workDay: formattedDate }
            });
            setShiftSchedules(res.data);
        } catch (err) {
            console.error('Lỗi lấy lịch làm việc:', err);
            showToast('error', 'Lỗi', 'Không thể tải lịch làm việc');
        } finally {
            setLoading(false);
        }
    }, []);

    // Lấy thống kê hàng tháng
    const fetchMonthlyStats = useCallback(async () => {
        if (!staffId) return;

        try {
            const res = await axiosClient.get(`/attendance/monthly/${staffId}`, {
                params: { month: selectedMonth, year: selectedYear }
            });
            setMonthlyStats(res.data);
        } catch (err) {
            console.error('Lỗi lấy thống kê:', err);
        }
    }, [staffId, selectedMonth, selectedYear]);

    useEffect(() => {
        if (staffId) {
            fetchMonthlyStats();
        }
    }, [staffId, selectedMonth, selectedYear, fetchMonthlyStats]);

    // ===== ACTIONS =====

    // Đăng ký ca
    const handleRegisterShift = async (shiftId) => {
        if (!staffId) {
            showToast('error', 'Lỗi', 'Không tìm thấy thông tin nhân viên');
            return;
        }

        setRegisteringShiftId(shiftId);
        try {
            const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
            await axiosClient.post('/staff-shifts', null, {
                params: {
                    staffId: staffId,
                    shiftId: shiftId,
                    workDay: formattedDate
                }
            });

            showToast('success', 'Thành công', '🎉 Đăng ký ca làm thành công!');
            setShowRegisterModal(false);

            // Refresh data
            await preloadMonthData(currentMonth);

            // Update current view
            const dateStr = formattedDate;
            const updatedShifts = allMonthShifts.filter(
                s => moment(s.workDay).format('YYYY-MM-DD') === dateStr
            );
            setStaffShifts(updatedShifts);

        } catch (err) {
            console.error('Lỗi đăng ký ca:', err);
            const message = err.response?.data?.message || 'Không thể đăng ký ca. Vui lòng thử lại sau';
            showToast('error', 'Lỗi', message);
        } finally {
            setRegisteringShiftId(null);
        }
    };

    // Hủy đăng ký ca
    const handleCancelRegistration = async (staffShiftId) => {
        if (!window.confirm('Bạn có chắc muốn hủy đăng ký ca này?')) return;

        setCancellingShiftId(staffShiftId);
        try {
            await axiosClient.delete(`/staff-shifts/${staffShiftId}`);
            showToast('success', 'Thành công', '✅ Đã hủy đăng ký ca');
            setShowDetailModal(false);

            // Refresh
            await preloadMonthData(currentMonth);

            // Update current view
            setStaffShifts(prev => prev.filter(s => s.id !== staffShiftId));

        } catch (err) {
            console.error('Lỗi hủy ca:', err);
            showToast('error', 'Lỗi', 'Không thể hủy đăng ký ca');
        } finally {
            setCancellingShiftId(null);
        }
    };

    // ===== CALENDAR EVENTS =====

    const calendarEvents = useMemo(() => {
        if (!allMonthShifts.length || !shifts.length) return [];

        return allMonthShifts.map(staffShift => {
            const shift = shifts.find(s => s.id === staffShift.shift?.id);
            const startTime = shift?.startTime || '00:00';
            const endTime = shift?.endTime || '00:00';

            return {
                id: staffShift.id,
                title: shift?.name || 'Ca làm',
                start: moment(`${staffShift.workDay} ${startTime}`).toDate(),
                end: moment(`${staffShift.workDay} ${endTime}`).toDate(),
                resource: staffShift,
                allDay: false
            };
        });
    }, [allMonthShifts, shifts]);

    // Calendar event style
    const eventStyleGetter = useCallback((event) => {
        const shift = shifts.find(s => s.id === event.resource?.shift?.id);
        let backgroundColor = '#4361ee';

        // Màu khác nhau cho từng ca
        if (shift?.name?.includes('Sáng')) backgroundColor = '#f59e0b';
        if (shift?.name?.includes('Chiều')) backgroundColor = '#06d6a0';
        if (shift?.name?.includes('Tối')) backgroundColor = '#7c3aed';

        return {
            style: {
                backgroundColor,
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: 'none',
                padding: '2px 6px',
                fontSize: '0.85rem',
                fontWeight: '500',
                cursor: 'pointer'
            }
        };
    }, [shifts]);

    // ===== HELPERS =====

    const isShiftRegistered = useCallback((shiftId) => {
        return staffShifts.some(ss => ss.shift?.id === shiftId);
    }, [staffShifts]);

    // ===== RENDER =====

    if (error) {
        return (
            <Container className="shift-registration py-4">
                <Alert variant="danger" className="fade-in-up">
                    <i className="ti ti-alert-triangle me-2"></i>
                    {error}
                </Alert>
            </Container>
        );
    }

    return (
        <div className="shift-registration">
            <Container fluid className="py-4">
                {/* Header */}
                <div className="shift-registration-header fade-in-up">
                    <h2>
                        <i className="ti ti-calendar-time me-2"></i>
                        Đăng ký ca làm việc
                    </h2>
                    <p>Quản lý và đăng ký ca làm việc của bạn một cách dễ dàng</p>
                </div>

                {/* Thống kê tháng */}
                {monthlyStats && (
                    <Row className="mb-4 g-3">
                        <Col xl={3} md={6}>
                            <StatCard
                                icon="calendar-stats"
                                label="Tổng số ngày"
                                value={monthlyStats.totalDays}
                                variant="primary"
                            />
                        </Col>
                        <Col xl={3} md={6}>
                            <StatCard
                                icon="check"
                                label="Có mặt đúng giờ"
                                value={monthlyStats.presentDays}
                                variant="success"
                            />
                        </Col>
                        <Col xl={3} md={6}>
                            <StatCard
                                icon="clock-exclamation"
                                label="Đi trễ"
                                value={monthlyStats.lateDays}
                                variant="warning"
                            />
                        </Col>
                        <Col xl={3} md={6}>
                            <StatCard
                                icon="calendar-off"
                                label="Nghỉ phép"
                                value={monthlyStats.leaveDays}
                                variant="info"
                            />
                        </Col>
                    </Row>
                )}

                {/* Chọn tháng thống kê */}
                <div className="month-selector fade-in-up">
                    <label>
                        <i className="ti ti-chart-bar me-2"></i>
                        Xem thống kê tháng
                    </label>
                    <Form.Select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        size="sm"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </Form.Select>
                    <Form.Select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        size="sm"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </Form.Select>

                    {preloading && (
                        <Spinner animation="border" size="sm" className="ms-2" />
                    )}
                </div>

                {/* Tabs chuyển đổi view */}
                <Tabs
                    activeKey={viewMode}
                    onSelect={(k) => setViewMode(k)}
                    className="shift-tabs mb-4 fade-in-up"
                >
                    {/* ========== CALENDAR VIEW ========== */}
                    <Tab
                        eventKey="calendar"
                        title={<><i className="ti ti-calendar me-1"></i> Lịch</>}
                    >
                        <Card className="calendar-card">
                            <Card.Body>
                                {preloading && (
                                    <div className="text-center mb-3">
                                        <Spinner animation="border" size="sm" variant="primary" />
                                        <span className="ms-2 text-muted">Đang tải dữ liệu...</span>
                                    </div>
                                )}
                                <Calendar
                                    localizer={localizer}
                                    events={calendarEvents}
                                    startAccessor="start"
                                    endAccessor="end"
                                    style={{ height: 550 }}
                                    selectable
                                    onSelectSlot={(slotInfo) => {
                                        handleDateSelect(slotInfo.start);
                                    }}
                                    onSelectEvent={(event) => {
                                        setSelectedStaffShift(event.resource);
                                        setShowDetailModal(true);
                                    }}
                                    onNavigate={(date) => {
                                        setCurrentMonth(date);
                                        preloadMonthData(date);
                                    }}
                                    views={['month', 'week', 'day']}
                                    defaultView="month"
                                    date={currentMonth}
                                    eventPropGetter={eventStyleGetter}
                                    messages={{
                                        today: 'Hôm nay',
                                        previous: 'Trước',
                                        next: 'Sau',
                                        month: 'Tháng',
                                        week: 'Tuần',
                                        day: 'Ngày',
                                        agenda: 'Lịch trình',
                                        date: 'Ngày',
                                        time: 'Thời gian',
                                        event: 'Sự kiện',
                                        noEventsInRange: 'Không có ca làm nào'
                                    }}
                                    dayPropGetter={(date) => {
                                        const today = moment().startOf('day');
                                        const dateMoment = moment(date).startOf('day');
                                        if (dateMoment.isSame(today)) {
                                            return {
                                                style: {
                                                    backgroundColor: 'rgba(67, 97, 238, 0.05)'
                                                }
                                            };
                                        }
                                        return {};
                                    }}
                                />
                            </Card.Body>
                        </Card>
                    </Tab>

                    {/* ========== LIST VIEW ========== */}
                    <Tab
                        eventKey="list"
                        title={<><i className="ti ti-list me-1"></i> Danh sách</>}
                    >
                        <Card className="list-view-card">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                    <h5 className="mb-0">
                                        <i className="ti ti-calendar-event me-2"></i>
                                        Ca làm ngày {moment(selectedDate).format('DD/MM/YYYY')}
                                    </h5>
                                    <div className="d-flex gap-2 align-items-center">
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={() => {
                                                const prevDay = moment(selectedDate).subtract(1, 'day').toDate();
                                                handleDateSelect(prevDay);
                                            }}
                                        >
                                            <i className="ti ti-chevron-left"></i>
                                        </Button>
                                        <Form.Control
                                            type="date"
                                            value={moment(selectedDate).format('YYYY-MM-DD')}
                                            onChange={(e) => {
                                                const newDate = e.target.value ? new Date(e.target.value) : new Date();
                                                handleDateSelect(newDate);
                                            }}
                                            style={{ width: '160px' }}
                                            className="date-picker"
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={() => {
                                                const nextDay = moment(selectedDate).add(1, 'day').toDate();
                                                handleDateSelect(nextDay);
                                            }}
                                        >
                                            <i className="ti ti-chevron-right"></i>
                                        </Button>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => {
                                                const today = new Date();
                                                handleDateSelect(today);
                                            }}
                                        >
                                            Hôm nay
                                        </Button>
                                    </div>
                                </div>

                                {loading ? (
                                    <ShiftSkeleton />
                                ) : (
                                    <>
                                        {/* Ca đã đăng ký */}
                                        <div className="section-title">
                                            <i className="ti ti-clipboard-check me-2"></i>
                                            Ca đã đăng ký ({staffShifts.length})
                                        </div>
                                        {staffShifts.length === 0 ? (
                                            <Alert variant="light" className="empty-state-small">
                                                <i className="ti ti-info-circle me-2"></i>
                                                Chưa đăng ký ca nào cho ngày này
                                            </Alert>
                                        ) : (
                                            <ListGroup className="mb-4 shift-list-group">
                                                {staffShifts.map((staffShift) => (
                                                    <ListGroup.Item
                                                        key={staffShift.id}
                                                        className="shift-list-item registered"
                                                        action
                                                        onClick={() => {
                                                            setSelectedStaffShift(staffShift);
                                                            setShowDetailModal(true);
                                                        }}
                                                    >
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <div className="shift-name">
                                                                    {staffShift.shift?.name || 'N/A'}
                                                                </div>
                                                                <div className="shift-time">
                                                                    <i className="ti ti-clock"></i>
                                                                    {formatTime(staffShift.shift?.startTime)} - {formatTime(staffShift.shift?.endTime)}
                                                                    {staffShift.shift?.workingHours && ` (${staffShift.shift.workingHours}h)`}
                                                                </div>
                                                                {staffShift.shift?.shiftAllowance > 0 && (
                                                                    <div className="shift-meta">
                                                                        <Badge className="badge-shift badge-allowance">
                                                                            +{formatCurrency(staffShift.shift.shiftAllowance)}
                                                                        </Badge>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Badge className="badge-shift badge-registered">
                                                                <i className="ti ti-check me-1"></i>
                                                                Đã đăng ký
                                                            </Badge>
                                                        </div>
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        )}

                                        {/* Ca có sẵn */}
                                        <div className="section-title">
                                            <i className="ti ti-plus-circle me-2"></i>
                                            Ca có sẵn để đăng ký ({shiftSchedules.length})
                                        </div>
                                        {shiftSchedules.length === 0 ? (
                                            <Alert variant="light" className="empty-state-small">
                                                <i className="ti ti-info-circle me-2"></i>
                                                Không có ca làm nào khả dụng cho ngày này
                                            </Alert>
                                        ) : (
                                            <ListGroup className="shift-list-group">
                                                {shiftSchedules.map((schedule) => {
                                                    const shift = schedule.shift || {};
                                                    const registered = isShiftRegistered(shift.id);
                                                    const slotsLeft = (schedule.maxStaff || 0) - (schedule.requiredStaff || 0);

                                                    return (
                                                        <ListGroup.Item
                                                            key={schedule.id}
                                                            className={`shift-list-item ${registered ? 'registered' : ''}`}
                                                            disabled={registered}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                                <div>
                                                                    <div className="shift-name">
                                                                        {shift.name || 'N/A'}
                                                                    </div>
                                                                    <div className="shift-time">
                                                                        <i className="ti ti-clock"></i>
                                                                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                                        {shift.workingHours && ` (${shift.workingHours}h)`}
                                                                    </div>
                                                                    <div className="shift-meta">
                                                                        <Badge
                                                                            bg={slotsLeft > 0 ? 'success' : 'danger'}
                                                                            className="badge-shift me-2"
                                                                        >
                                                                            {slotsLeft > 0 ? `Còn ${slotsLeft} slot` : 'Hết slot'}
                                                                        </Badge>
                                                                        {shift.shiftAllowance > 0 && (
                                                                            <Badge className="badge-shift badge-allowance">
                                                                                +{formatCurrency(shift.shiftAllowance)}
                                                                            </Badge>
                                                                        )}
                                                                        <small className="text-muted ms-2">
                                                                            {schedule.requiredStaff}/{schedule.maxStaff} đã đăng ký
                                                                        </small>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant={registered ? "secondary" : "primary"}
                                                                    size="sm"
                                                                    className="btn-register-shift"
                                                                    disabled={registered || slotsLeft <= 0}
                                                                    onClick={() => {
                                                                        setSelectedSchedule(schedule);
                                                                        handleRegisterShift(shift.id);
                                                                    }}
                                                                >
                                                                    {registeringShiftId === shift.id ? (
                                                                        <>
                                                                            <Spinner animation="border" size="sm" className="me-1" />
                                                                            Đang xử lý...
                                                                        </>
                                                                    ) : registered ? (
                                                                        <>
                                                                            <i className="ti ti-check me-1"></i>
                                                                            Đã đăng ký
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <i className="ti ti-plus me-1"></i>
                                                                            Đăng ký
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </ListGroup.Item>
                                                    );
                                                })}
                                            </ListGroup>
                                        )}
                                    </>
                                )}
                            </Card.Body>
                        </Card>
                    </Tab>
                </Tabs>

                {/* ========== MODAL ĐĂNG KÝ CA ========== */}
                <Modal
                    show={showRegisterModal}
                    onHide={() => setShowRegisterModal(false)}
                    centered
                    size="lg"
                    className="shift-modal"
                >
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <i className="ti ti-calendar-plus me-2"></i>
                            Đăng ký ca làm
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="text-center mb-4">
                            <h5>
                                <i className="ti ti-calendar me-2"></i>
                                {moment(selectedDate).format('dddd, DD/MM/YYYY')}
                            </h5>
                            {moment(selectedDate).isBefore(moment(), 'day') && (
                                <Badge bg="danger" className="mt-2">
                                    <i className="ti ti-alert-triangle me-1"></i>
                                    Ngày đã qua
                                </Badge>
                            )}
                        </div>

                        {loading ? (
                            <ShiftSkeleton />
                        ) : shiftSchedules.length === 0 ? (
                            <div className="empty-state">
                                <i className="ti ti-calendar-off empty-icon"></i>
                                <p className="empty-text">Không có ca làm khả dụng</p>
                                <p className="empty-subtext">
                                    Vui lòng chọn ngày khác hoặc liên hệ quản lý
                                </p>
                            </div>
                        ) : (
                            <ListGroup className="shift-list-group">
                                {shiftSchedules.map((schedule) => {
                                    const shift = schedule.shift || {};
                                    const registered = isShiftRegistered(shift.id);
                                    const slotsLeft = (schedule.maxStaff || 0) - (schedule.requiredStaff || 0);

                                    return (
                                        <ListGroup.Item
                                            key={schedule.id}
                                            className={`shift-list-item ${registered ? 'registered' : ''}`}
                                        >
                                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <div>
                                                    <div className="shift-name">
                                                        {shift.name || 'N/A'}
                                                        {shift.workingHours && (
                                                            <small className="text-muted ms-2">
                                                                ({shift.workingHours}h)
                                                            </small>
                                                        )}
                                                    </div>
                                                    <div className="shift-time">
                                                        <i className="ti ti-clock"></i>
                                                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                    </div>
                                                    <div className="shift-meta mt-2">
                                                        <Badge
                                                            bg={slotsLeft > 0 ? 'success' : 'danger'}
                                                            className="badge-shift me-2"
                                                        >
                                                            {slotsLeft > 0 ? `Còn ${slotsLeft} slot` : 'Đã đầy'}
                                                        </Badge>
                                                        {shift.shiftAllowance > 0 && (
                                                            <Badge className="badge-shift badge-allowance">
                                                                <i className="ti ti-coin me-1"></i>
                                                                +{formatCurrency(shift.shiftAllowance)}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant={registered ? "success" : "primary"}
                                                    size="sm"
                                                    className={`btn-register-shift ${registered ? 'pulse-animation' : ''}`}
                                                    disabled={registered || slotsLeft <= 0}
                                                    onClick={() => handleRegisterShift(shift.id)}
                                                >
                                                    {registeringShiftId === shift.id ? (
                                                        <Spinner animation="border" size="sm" />
                                                    ) : registered ? (
                                                        <>
                                                            <i className="ti ti-check me-1"></i>
                                                            Đã đăng ký
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="ti ti-plus me-1"></i>
                                                            Đăng ký ngay
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </ListGroup.Item>
                                    );
                                })}
                            </ListGroup>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowRegisterModal(false)}>
                            <i className="ti ti-x me-1"></i>
                            Đóng
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* ========== MODAL CHI TIẾT CA ========== */}
                <Modal
                    show={showDetailModal}
                    onHide={() => setShowDetailModal(false)}
                    centered
                    className="shift-modal"
                >
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <i className="ti ti-clipboard-check me-2"></i>
                            Chi tiết ca đăng ký
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedStaffShift && (
                            <>
                                <div className="text-center mb-4">
                                    <div className="shift-detail-badge mb-2">
                                        <Badge bg="success" className="fs-6 px-3 py-2">
                                            <i className="ti ti-check me-1"></i>
                                            Đã đăng ký
                                        </Badge>
                                    </div>
                                    <h5 className="text-primary">
                                        {selectedStaffShift.shift?.name || 'N/A'}
                                    </h5>
                                </div>

                                <div className="shift-detail-grid">
                                    <div className="shift-detail-item">
                                        <div className="label">
                                            <i className="ti ti-calendar me-1"></i>
                                            Ngày làm việc
                                        </div>
                                        <div className="value">
                                            {moment(selectedStaffShift.workDay).format('dddd, DD/MM/YYYY')}
                                        </div>
                                    </div>

                                    <div className="shift-detail-item">
                                        <div className="label">
                                            <i className="ti ti-clock-play me-1"></i>
                                            Giờ bắt đầu
                                        </div>
                                        <div className="value">
                                            {formatTime(selectedStaffShift.shift?.startTime)}
                                        </div>
                                    </div>

                                    <div className="shift-detail-item">
                                        <div className="label">
                                            <i className="ti ti-clock-stop me-1"></i>
                                            Giờ kết thúc
                                        </div>
                                        <div className="value">
                                            {formatTime(selectedStaffShift.shift?.endTime)}
                                        </div>
                                    </div>

                                    {selectedStaffShift.shift?.workingHours && (
                                        <div className="shift-detail-item">
                                            <div className="label">
                                                <i className="ti ti-hourglass me-1"></i>
                                                Số giờ làm
                                            </div>
                                            <div className="value">
                                                {selectedStaffShift.shift.workingHours} giờ
                                            </div>
                                        </div>
                                    )}

                                    {selectedStaffShift.shift?.shiftAllowance > 0 && (
                                        <div className="shift-detail-item">
                                            <div className="label">
                                                <i className="ti ti-coin me-1"></i>
                                                Phụ cấp ca
                                            </div>
                                            <div className="value text-warning">
                                                +{formatCurrency(selectedStaffShift.shift.shiftAllowance)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="d-flex justify-content-between">
                        <Button
                            variant="danger"
                            onClick={() => selectedStaffShift && handleCancelRegistration(selectedStaffShift.id)}
                            disabled={cancellingShiftId === selectedStaffShift?.id}
                        >
                            {cancellingShiftId === selectedStaffShift?.id ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-1" />
                                    Đang hủy...
                                </>
                            ) : (
                                <>
                                    <i className="ti ti-trash me-1"></i>
                                    Hủy đăng ký
                                </>
                            )}
                        </Button>
                        <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                            <i className="ti ti-x me-1"></i>
                            Đóng
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default ShiftRegistration;