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
    if (!time) return 'N/A';
    return time?.substring(0, 5) || 'N/A';
};

const formatCurrency = (amount) => {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
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

// ========== MAIN ==========
const ShiftRegistration = () => {
    // Lấy user từ localStorage
    const [user, setUser] = useState(null);
    const [staffId, setStaffId] = useState(null);
    const [staffInfo, setStaffInfo] = useState(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                console.log('📦 User data from localStorage:', userData);
                setUser(userData);

                // Thử nhiều cách để lấy staffId
                const id = userData.staffId
                    || userData.staff?.id
                    || userData.id;

                console.log('🆔 Staff ID:', id);
                setStaffId(id);
                setStaffInfo(userData.staff || userData);

            } catch (e) {
                console.error('Lỗi parse user:', e);
                setError('Không thể đọc thông tin người dùng');
            }
        } else {
            setError('Vui lòng đăng nhập lại');
        }
    }, []);

    // State
    const [shifts, setShifts] = useState([]);
    const [staffShifts, setStaffShifts] = useState([]);
    const [shiftSchedules, setShiftSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('calendar');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Modal
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

    // Preload
    const [allMonthShifts, setAllMonthShifts] = useState([]);
    const [allMonthSchedules, setAllMonthSchedules] = useState([]);
    const [preloading, setPreloading] = useState(false);
    const cacheRef = useRef({});

    // Lấy danh sách ca làm
    useEffect(() => {
        axiosClient.get('/shifts')
            .then(res => {
                console.log('✅ Shifts loaded:', res.data);
                setShifts(res.data);
            })
            .catch(err => console.error('Lỗi lấy danh sách ca:', err));
    }, []);

    // Preload data
    const preloadMonthData = useCallback(async (date) => {
        if (!staffId) {
            console.warn('⚠️ Chưa có staffId, bỏ qua preload');
            return;
        }

        const monthKey = moment(date).format('YYYY-MM');
        const cached = cacheRef.current[monthKey];

        if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
            setAllMonthShifts(cached.data.shifts || []);
            setAllMonthSchedules(cached.data.schedules || []);
            return;
        }

        setPreloading(true);
        try {
            // Lấy staff shifts của nhân viên
            const shiftsRes = await axiosClient.get(`/staff-shifts/staff/${staffId}`)
                .catch(err => {
                    console.warn('⚠️ Không thể lấy staff shifts:', err.response?.status);
                    return { data: [] };
                });

            console.log('📋 Staff shifts:', shiftsRes.data);

            // Lấy shift schedules (nếu có branch)
            let schedulesData = [];
            if (staffInfo?.branch?.id) {
                const schedulesRes = await axiosClient.get(`/shift-schedules/branch/${staffInfo.branch.id}`)
                    .catch(err => {
                        console.warn('⚠️ Không thể lấy schedules:', err.response?.status);
                        return { data: [] };
                    });
                schedulesData = schedulesRes.data;
                console.log('📅 Schedules:', schedulesData);
            }

            setAllMonthShifts(shiftsRes.data || []);
            setAllMonthSchedules(schedulesData || []);

            cacheRef.current[monthKey] = {
                data: { shifts: shiftsRes.data || [], schedules: schedulesData || [] },
                timestamp: Date.now()
            };
        } catch (err) {
            console.error('Lỗi preload:', err);
        } finally {
            setPreloading(false);
        }
    }, [staffId, staffInfo]);

    useEffect(() => {
        if (staffId) {
            preloadMonthData(new Date());
        }
    }, [staffId, preloadMonthData]);

    // Chọn ngày
    const handleDateSelect = useCallback((date) => {
        setSelectedDate(date);
        const dateStr = moment(date).format('YYYY-MM-DD');

        const dayShifts = allMonthShifts.filter(
            s => moment(s.workDay).format('YYYY-MM-DD') === dateStr
        );
        const daySchedules = allMonthSchedules.filter(
            s => moment(s.workDay).format('YYYY-MM-DD') === dateStr
        );

        setStaffShifts(dayShifts);
        setShiftSchedules(daySchedules);
        setShowRegisterModal(true);
    }, [allMonthShifts, allMonthSchedules]);

    // Fetch schedules theo ngày (fallback)
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

    // Thống kê tháng
    const fetchMonthlyStats = useCallback(async () => {
        if (!staffId) return;
        try {
            const res = await axiosClient.get(`/attendance/monthly/${staffId}`, {
                params: { month: selectedMonth, year: selectedYear }
            });
            console.log('📊 Monthly stats:', res.data);
            setMonthlyStats(res.data);
        } catch (err) {
            console.error('Lỗi lấy thống kê:', err);
        }
    }, [staffId, selectedMonth, selectedYear]);

    useEffect(() => {
        if (staffId) fetchMonthlyStats();
    }, [staffId, selectedMonth, selectedYear, fetchMonthlyStats]);

    // Đăng ký ca
    const handleRegisterShift = async (shiftId) => {
        if (!staffId) {
            showToast('error', 'Lỗi', 'Không tìm thấy thông tin nhân viên');
            return;
        }

        setRegisteringShiftId(shiftId);
        try {
            const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
            console.log('📝 Đăng ký ca:', { staffId, shiftId, workDay: formattedDate });

            await axiosClient.post('/staff-shifts', null, {
                params: { staffId, shiftId, workDay: formattedDate }
            });

            showToast('success', 'Thành công', '🎉 Đăng ký ca làm thành công!');
            setShowRegisterModal(false);
            await preloadMonthData(currentMonth);
        } catch (err) {
            console.error('Lỗi đăng ký ca:', err);
            const message = err.response?.data?.message || 'Không thể đăng ký ca';
            showToast('error', 'Lỗi', message);
        } finally {
            setRegisteringShiftId(null);
        }
    };

    // Hủy đăng ký
    const handleCancelRegistration = async (staffShiftId) => {
        if (!window.confirm('Bạn có chắc muốn hủy đăng ký ca này?')) return;

        setCancellingShiftId(staffShiftId);
        try {
            await axiosClient.delete(`/staff-shifts/${staffShiftId}`);
            showToast('success', 'Thành công', '✅ Đã hủy đăng ký ca');
            setShowDetailModal(false);
            await preloadMonthData(currentMonth);
            setStaffShifts(prev => prev.filter(s => s.id !== staffShiftId));
        } catch (err) {
            showToast('error', 'Lỗi', 'Không thể hủy đăng ký ca');
        } finally {
            setCancellingShiftId(null);
        }
    };

    // Calendar events
    const calendarEvents = useMemo(() => {
        return allMonthShifts.map(ss => {
            const shift = shifts.find(s => s.id === ss.shift?.id);
            return {
                id: ss.id,
                title: shift?.name || 'Ca làm',
                start: moment(`${ss.workDay} ${shift?.startTime || '00:00'}`).toDate(),
                end: moment(`${ss.workDay} ${shift?.endTime || '00:00'}`).toDate(),
                resource: ss,
                allDay: false
            };
        });
    }, [allMonthShifts, shifts]);

    const eventStyleGetter = useCallback((event) => {
        const shift = shifts.find(s => s.id === event.resource?.shift?.id);
        let bg = '#4361ee';
        if (shift?.name?.includes('Sáng')) bg = '#f59e0b';
        if (shift?.name?.includes('Chiều')) bg = '#06d6a0';
        if (shift?.name?.includes('Tối')) bg = '#7c3aed';
        return {
            style: { backgroundColor: bg, borderRadius: '6px', opacity: 0.9, color: 'white', border: 'none', padding: '2px 6px', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer' }
        };
    }, [shifts]);

    const isShiftRegistered = useCallback((shiftId) => {
        return staffShifts.some(ss => ss.shift?.id === shiftId);
    }, [staffShifts]);

    // ===== RENDER =====
    if (error) {
        return (
            <Container className="shift-registration py-4">
                <Alert variant="danger" className="fade-in-up">
                    <i className="ti ti-alert-triangle me-2"></i>{error}
                </Alert>
            </Container>
        );
    }

    if (!staffId) {
        return (
            <Container className="shift-registration py-4 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Đang tải thông tin...</p>
            </Container>
        );
    }

    return (
        <div className="shift-registration">
            <Container fluid className="py-4">
                {/* Header */}
                <div className="shift-registration-header fade-in-up">
                    <h2><i className="ti ti-calendar-time me-2"></i>Đăng ký ca làm việc</h2>
                </div>

                {/* Thống kê tháng */}
                {monthlyStats && (
                    <Row className="mb-4 g-3">
                        <Col xl={3} md={6}>
                            <StatCard icon="calendar-stats" label="Tổng số ngày" value={monthlyStats.totalDays} variant="primary" />
                        </Col>
                        <Col xl={3} md={6}>
                            <StatCard icon="check" label="Có mặt đúng giờ" value={monthlyStats.presentDays} variant="success" />
                        </Col>
                        <Col xl={3} md={6}>
                            <StatCard icon="clock-exclamation" label="Đi trễ" value={monthlyStats.lateDays} variant="warning" />
                        </Col>
                        <Col xl={3} md={6}>
                            <StatCard icon="calendar-off" label="Nghỉ phép" value={monthlyStats.leaveDays} variant="info" />
                        </Col>
                    </Row>
                )}

                {/* Chọn tháng */}
                <div className="month-selector fade-in-up">
                    <label><i className="ti ti-chart-bar me-2"></i>Xem thống kê tháng</label>
                    <Form.Select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} size="sm">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </Form.Select>
                    <Form.Select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} size="sm">
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </Form.Select>
                    {preloading && <Spinner animation="border" size="sm" className="ms-2" />}
                </div>

                {/* Tabs */}
                <Tabs activeKey={viewMode} onSelect={(k) => setViewMode(k)} className="shift-tabs mb-4 fade-in-up">
                    <Tab eventKey="calendar" title={<><i className="ti ti-calendar me-1"></i> Lịch</>}>
                        <Card className="calendar-card">
                            <Card.Body>
                                <Calendar
                                    localizer={localizer}
                                    events={calendarEvents}
                                    startAccessor="start"
                                    endAccessor="end"
                                    style={{ height: 550 }}
                                    selectable
                                    onSelectSlot={(slotInfo) => handleDateSelect(slotInfo.start)}
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
                                        today: 'Hôm nay', previous: 'Trước', next: 'Sau',
                                        month: 'Tháng', week: 'Tuần', day: 'Ngày',
                                        noEventsInRange: 'Không có ca làm nào'
                                    }}
                                />
                            </Card.Body>
                        </Card>
                    </Tab>

                    <Tab eventKey="list" title={<><i className="ti ti-list me-1"></i> Danh sách</>}>
                        <Card className="list-view-card">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Ca làm ngày {moment(selectedDate).format('DD/MM/YYYY')}</h5>
                                    <Form.Control type="date" className="date-picker"
                                        value={moment(selectedDate).format('YYYY-MM-DD')}
                                        onChange={(e) => handleDateSelect(e.target.value ? new Date(e.target.value) : new Date())}
                                        style={{ width: '160px' }} />
                                </div>

                                {staffShifts.length === 0 && shiftSchedules.length === 0 && (
                                    <Alert variant="light" className="empty-state-small">
                                        <i className="ti ti-info-circle me-2"></i>
                                        Không có ca làm nào cho ngày này
                                    </Alert>
                                )}

                                {/* Ca đã đăng ký */}
                                {staffShifts.length > 0 && (
                                    <>
                                        <div className="section-title">
                                            <i className="ti ti-clipboard-check me-2"></i>
                                            Ca đã đăng ký ({staffShifts.length})
                                        </div>
                                        <ListGroup className="mb-4 shift-list-group">
                                            {staffShifts.map((staffShift) => (
                                                <ListGroup.Item key={staffShift.id}
                                                    className="shift-list-item registered" action
                                                    onClick={() => { setSelectedStaffShift(staffShift); setShowDetailModal(true); }}>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <div className="shift-name">{staffShift.shift?.name || 'N/A'}</div>
                                                            <div className="shift-time">
                                                                <i className="ti ti-clock"></i>
                                                                {formatTime(staffShift.shift?.startTime)} - {formatTime(staffShift.shift?.endTime)}
                                                            </div>
                                                        </div>
                                                        <Badge className="badge-shift badge-registered">
                                                            <i className="ti ti-check me-1"></i>Đã đăng ký
                                                        </Badge>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    </>
                                )}

                                {/* Ca có sẵn */}
                                {shiftSchedules.length > 0 && (
                                    <>
                                        <div className="section-title">
                                            <i className="ti ti-plus-circle me-2"></i>
                                            Ca có sẵn ({shiftSchedules.length})
                                        </div>
                                        <ListGroup className="shift-list-group">
                                            {shiftSchedules.map((schedule) => {
                                                const shift = schedule.shift || {};
                                                const registered = isShiftRegistered(shift.id);
                                                const slotsLeft = (schedule.maxStaff || 0) - (schedule.requiredStaff || 0);
                                                return (
                                                    <ListGroup.Item key={schedule.id}
                                                        className={`shift-list-item ${registered ? 'registered' : ''}`}
                                                        disabled={registered}>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <div className="shift-name">{shift.name || 'N/A'}</div>
                                                                <div className="shift-time">
                                                                    <i className="ti ti-clock"></i>
                                                                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                                </div>
                                                                <div className="shift-meta">
                                                                    <Badge bg={slotsLeft > 0 ? 'success' : 'danger'} className="badge-shift me-2">
                                                                        {slotsLeft > 0 ? `Còn ${slotsLeft} slot` : 'Hết slot'}
                                                                    </Badge>
                                                                    {shift.shiftAllowance > 0 && (
                                                                        <Badge className="badge-shift badge-allowance">
                                                                            +{formatCurrency(shift.shiftAllowance)}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Button variant={registered ? "secondary" : "primary"} size="sm"
                                                                className="btn-register-shift"
                                                                disabled={registered || slotsLeft <= 0}
                                                                onClick={() => handleRegisterShift(shift.id)}>
                                                                {registeringShiftId === shift.id ? (
                                                                    <Spinner animation="border" size="sm" />
                                                                ) : registered ? 'Đã đăng ký' : 'Đăng ký'}
                                                            </Button>
                                                        </div>
                                                    </ListGroup.Item>
                                                );
                                            })}
                                        </ListGroup>
                                    </>
                                )}
                            </Card.Body>
                        </Card>
                    </Tab>
                </Tabs>

                {/* Modal đăng ký */}
                <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} centered size="lg" className="shift-modal">
                    <Modal.Header closeButton>
                        <Modal.Title><i className="ti ti-calendar-plus me-2"></i>Đăng ký ca làm</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="text-center mb-4">
                            <h5>{moment(selectedDate).format('dddd, DD/MM/YYYY')}</h5>
                        </div>
                        {shiftSchedules.length === 0 ? (
                            <div className="empty-state">
                                <i className="ti ti-calendar-off empty-icon"></i>
                                <p className="empty-text">Không có ca làm khả dụng</p>
                            </div>
                        ) : (
                            <ListGroup className="shift-list-group">
                                {shiftSchedules.map((schedule) => {
                                    const shift = schedule.shift || {};
                                    const registered = isShiftRegistered(shift.id);
                                    const slotsLeft = (schedule.maxStaff || 0) - (schedule.requiredStaff || 0);
                                    return (
                                        <ListGroup.Item key={schedule.id} className={`shift-list-item ${registered ? 'registered' : ''}`}>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <div className="shift-name">{shift.name || 'N/A'}</div>
                                                    <div className="shift-time">
                                                        <i className="ti ti-clock"></i>
                                                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant={registered ? "success" : "primary"} size="sm"
                                                    className="btn-register-shift"
                                                    disabled={registered || slotsLeft <= 0}
                                                    onClick={() => handleRegisterShift(shift.id)}>
                                                    {registeringShiftId === shift.id ? (
                                                        <Spinner animation="border" size="sm" />
                                                    ) : registered ? 'Đã đăng ký' : 'Đăng ký ngay'}
                                                </Button>
                                            </div>
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

                {/* Modal chi tiết */}
                <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered className="shift-modal">
                    <Modal.Header closeButton>
                        <Modal.Title><i className="ti ti-clipboard-check me-2"></i>Chi tiết ca đăng ký</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedStaffShift && (
                            <div className="shift-detail-grid">
                                <div className="shift-detail-item">
                                    <div className="label">Ngày làm việc</div>
                                    <div className="value">{moment(selectedStaffShift.workDay).format('DD/MM/YYYY')}</div>
                                </div>
                                <div className="shift-detail-item">
                                    <div className="label">Ca làm</div>
                                    <div className="value">{selectedStaffShift.shift?.name || 'N/A'}</div>
                                </div>
                                <div className="shift-detail-item">
                                    <div className="label">Giờ làm</div>
                                    <div className="value">
                                        {formatTime(selectedStaffShift.shift?.startTime)} - {formatTime(selectedStaffShift.shift?.endTime)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="d-flex justify-content-between">
                        <Button variant="danger" onClick={() => handleCancelRegistration(selectedStaffShift?.id)}
                            disabled={cancellingShiftId === selectedStaffShift?.id}>
                            {cancellingShiftId === selectedStaffShift?.id ? 'Đang hủy...' : 'Hủy đăng ký'}
                        </Button>
                        <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Đóng</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default ShiftRegistration;