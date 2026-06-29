// BookingPage.jsx - FULL CODE ĐÃ SỬA (xóa emoji, dùng icon)
import React, { useState, useEffect, useCallback } from "react";
import {
    Table, Home, Users, Clock, CheckCircle,
    ChevronDown, ChevronUp, X, Calendar, Phone, User,
    AlertCircle, Bell, RefreshCw,
    MapPin, Clock3, AlertTriangle, Utensils, Coffee,
    Building, DollarSign, Mail, PenSquare, Lock,
    Edit, Trash2, AlertOctagon, UserX, CalendarClock,
    Eye, Info, Search, Filter, UserCircle, CreditCard, Plus
} from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import styles from "./BookingPage.module.css";

const socket = io('/', {
    path: '/socket.io/',
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
});

const BookingPage = () => {
    // State management
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState("Tất cả");
    const [loading, setLoading] = useState(true);
    const [showAreas, setShowAreas] = useState(true);
    const [activeTab, setActiveTab] = useState("tables");
    const [reservations, setReservations] = useState([]);

    // Search state
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    // Modal states
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [bookingForm, setBookingForm] = useState({
        date: "",
        time: "",
        checkoutDate: "",
        checkoutTime: "",
        customerName: "",
        phone: "",
        email: "",
        note: "",
        depositAmount: 0
    });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Status Update Modal
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusEntity] = useState(null);
    const [newStatus, setNewStatus] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Cancel No-Show Modal
    const [showNoShowModal, setShowNoShowModal] = useState(false);
    const [noShowEntity, setNoShowEntity] = useState(null);

    // Detail Modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailReservation, setDetailReservation] = useState(null);

    // Toast
    const [toast, setToast] = useState({ show: false, message: "", type: "" });

    // User data
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = userData.branch?.id;
    const branchName = userData.branch?.name;

    // ==================== SOCKET.IO SETUP ====================
    useEffect(() => {
        if (userData.id && branchId) {
            socket.emit("register-role", {
                role: "cashier",
                userId: userData.id,
                branchId: branchId
            });
        }

        socket.on("connect", () => {
            console.log("✅ Socket connected");
            if (userData.id && branchId) {
                socket.emit("register-role", {
                    role: "cashier",
                    userId: userData.id,
                    branchId: branchId
                });
            }
            refreshAllData();
        });

        socket.on("disconnect", () => {
            console.log("❌ Socket disconnected");
            showToast("Mất kết nối real-time!", "warning");
        });

        socket.on("staff-reservation-notification", (data) => {
            showToast(data.message, "info");
            refreshAllData();
        });

        socket.on("update-tables", () => refreshAllData());
        socket.on("new-reservation", () => {
            showToast("Có đặt bàn mới cần xác nhận!", "info");
            refreshAllData();
        });
        socket.on("reservation-updated", () => refreshAllData());

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("staff-reservation-notification");
            socket.off("update-tables");
            socket.off("new-reservation");
            socket.off("reservation-updated");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData.id, branchId]);

    // ==================== UTILITY FUNCTIONS ====================
    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return "";
        const date = new Date(dateTimeStr);
        return date.toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    const showToast = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
    }, []);

    // ==================== FILTERED RESERVATIONS ====================
    const getFilteredReservations = useCallback(() => {
        let filtered = [...reservations];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(res =>
                (res.customerName && res.customerName.toLowerCase().includes(term)) ||
                (res.phone && res.phone.includes(term)) ||
                (res.email && res.email.toLowerCase().includes(term)) ||
                (res.tableNumber && `ban ${res.tableNumber}`.includes(term)) ||
                (res.roomNumber && `phong ${res.roomNumber}`.includes(term)) ||
                (res.branchName && res.branchName.toLowerCase().includes(term))
            );
        }

        if (filterDate) {
            filtered = filtered.filter(res => {
                if (res.checkInTime) {
                    const checkInDate = new Date(res.checkInTime).toISOString().split('T')[0];
                    return checkInDate === filterDate;
                }
                return false;
            });
        }

        if (filterStatus === "table") {
            filtered = filtered.filter(res => res.tableNumber);
        } else if (filterStatus === "room") {
            filtered = filtered.filter(res => res.roomNumber);
        }

        return filtered;
    }, [reservations, searchTerm, filterDate, filterStatus]);

    const filteredReservations = getFilteredReservations();

    // ==================== API CALLS ====================
    const fetchAreas = useCallback(async () => {
        try {
            const res = await axiosClient.get(`/tables/branch/${branchId}/areas`);
            setAreas(["Tất cả", ...res.data]);
        } catch (err) { console.error("Lỗi tải khu vực:", err); }
    }, [branchId]);

    const fetchTables = useCallback(async () => {
        setLoading(true);
        try {
            const [areasRes, reservationsRes] = await Promise.all([
                axiosClient.get(`/tables/branch/${branchId}/areas`),
                axiosClient.get(`/reservations/tables`).catch(() => ({ data: [] }))
            ]);

            const reservationMap = {};
            reservationsRes.data.forEach(t => {
                reservationMap[t.id] = t;
            });

            const areaRequests = areasRes.data.map(area =>
                axiosClient.get(`/tables/branch/${branchId}/area/${area}`)
            );
            const areaResults = await Promise.all(areaRequests);

            let allTables = [];
            areaResults.forEach(res => {
                allTables = [...allTables, ...res.data];
            });

            const seen = new Set();
            allTables = allTables.filter(t => {
                if (seen.has(t.id)) return false;
                seen.add(t.id);
                return true;
            });

            let data = allTables.map(table => ({
                ...table,
                ...(reservationMap[table.id] ? {
                    customerName: reservationMap[table.id].customerName,
                    checkInTime: reservationMap[table.id].checkInTime,
                    hasUpcomingReservation: reservationMap[table.id].hasUpcomingReservation,
                } : {})
            }));

            if (selectedArea !== "Tất cả") {
                data = data.filter(t => t.area === selectedArea);
            }

            data.sort((a, b) => {
                const numA = parseInt(String(a.number).replace(/\D/g, '')) || 0;
                const numB = parseInt(String(b.number).replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            setTables(data);
        } catch (err) {
            console.error("Lỗi tải bàn:", err);
            setTables([]);
        } finally {
            setLoading(false);
        }
    }, [branchId, selectedArea]);

    const fetchRooms = useCallback(async () => {
        try {
            const [roomsRes, reservationsRes] = await Promise.all([
                axiosClient.get(`/rooms/branch/${branchId}`),
                axiosClient.get(`/reservations/rooms`).catch(() => ({ data: [] }))
            ]);

            const reservationMap = {};
            reservationsRes.data.forEach(r => {
                reservationMap[r.id] = r;
            });

            const data = roomsRes.data.map(room => ({
                ...room,
                ...(reservationMap[room.id] ? {
                    customerName: reservationMap[room.id].customerName,
                    checkInTime: reservationMap[room.id].checkInTime,
                    hasUpcomingReservation: reservationMap[room.id].hasUpcomingReservation,
                } : {})
            }));

            data.sort((a, b) => {
                const numA = parseInt(String(a.number).replace(/\D/g, '')) || 0;
                const numB = parseInt(String(b.number).replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            setRooms(data);
        } catch (err) {
            setRooms([]);
        }
    }, [branchId]);

    const fetchReservations = useCallback(async () => {
        try {
            const res = await axiosClient.get(`/reservations/status?status=CONFIRMED`);
            console.log("✅ Đã xác nhận:", res.data.length, "đơn");
            setReservations(res.data);
        } catch (err) {
            console.error("Lỗi tải danh sách đã xác nhận:", err);
            setReservations([]);
        }
    }, []);

    const refreshAllData = useCallback(() => {
        setLoading(true);
        Promise.all([fetchTables(), fetchRooms(), fetchReservations(), fetchAreas()])
            .finally(() => setLoading(false));
    }, [fetchTables, fetchRooms, fetchReservations, fetchAreas]);

    useEffect(() => { if (branchId) refreshAllData(); }, [branchId, refreshAllData]);

    // ==================== RESERVATION ACTIONS ====================
    const confirmReservation = async (reservationId) => {
        try {
            await axiosClient.put(`/reservations/${reservationId}/status?status=CONFIRMED`);
            showToast("Đã xác nhận đặt bàn!", "success");
            socket.emit("reservation-updated", { reservationId, status: "CONFIRMED" });
            refreshAllData();
        } catch (err) {
            showToast("Xác nhận thất bại!", "error");
        }
    };

    const cancelReservation = async (reservationId) => {
        if (!window.confirm("Hủy đặt bàn này?")) return;
        try {
            await axiosClient.put(`/reservations/${reservationId}/status?status=CANCELLED`);
            showToast("Đã hủy đặt bàn!", "success");
            socket.emit("reservation-updated", { reservationId, status: "CANCELLED" });
            refreshAllData();
        } catch (err) {
            showToast("Hủy thất bại!", "error");
        }
    };

    // ==================== STATUS MANAGEMENT ====================
    const updateTableStatus = async (tableId, status) => {
        await axiosClient.put(`/tables/${tableId}/status?status=${status}`);
    };

    const updateRoomStatus = async (roomId, status) => {
        await axiosClient.put(`/rooms/${roomId}/status?status=${status}`);
    };

    const handleUpdateStatus = async () => {
        if (newStatus === statusEntity.status) {
            setShowStatusModal(false);
            return;
        }
        setUpdatingStatus(true);
        try {
            if (statusEntity.type === "table") {
                await updateTableStatus(statusEntity.id, newStatus);
            } else {
                await updateRoomStatus(statusEntity.id, newStatus);
            }
            showToast(`Đã cập nhật thành ${getStatusText(newStatus)}`, "success");
            setShowStatusModal(false);
            refreshAllData();
            socket.emit("update-tables");
        } catch (err) {
            showToast("Cập nhật thất bại!", "error");
        } finally {
            setUpdatingStatus(false);
        }
    };

    // ==================== NO-SHOW ====================
    const handleNoShow = (entity, type, e) => {
        e.stopPropagation();
        setNoShowEntity({ ...entity, type });
        setShowNoShowModal(true);
    };

    const confirmNoShow = async () => {
        if (!noShowEntity) return;
        try {
            if (noShowEntity.type === "table") {
                await updateTableStatus(noShowEntity.id, "FREE");
            } else {
                await updateRoomStatus(noShowEntity.id, "ACTIVE");
            }
            const pending = reservations.find(r =>
                noShowEntity.type === "table" ? r.tableNumber === noShowEntity.number : r.roomNumber === noShowEntity.number
            );
            if (pending) await cancelReservation(pending.id);
            showToast("Đã hủy do khách chưa đến!", "success");
            setShowNoShowModal(false);
            refreshAllData();
        } catch (err) {
            showToast("Hủy thất bại!", "error");
        }
    };

    const handleCheckIn = async (entity, type, e) => {
        e.stopPropagation();
        try {
            const pending = reservations.find(r =>
                type === "table"
                    ? String(r.tableNumber) === String(entity.number)
                    : String(r.roomNumber) === String(entity.number)
            );
            if (!pending) {
                showToast("Không tìm thấy đơn đặt!", "error");
                return;
            }
            await axiosClient.put(`/reservations/${pending.id}/status?status=CHECKED_IN`);
            showToast(`Check-in ${type === "table" ? "bàn" : "phòng"} ${entity.number} thành công!`, "success");
            socket.emit("reservation-updated", { reservationId: pending.id, status: "CHECKED_IN" });
            refreshAllData();
        } catch (err) {
            showToast("Check-in thất bại!", "error");
        }
    };

    // ==================== DETAIL MODAL ====================
    const openDetailModal = (reservation) => {
        setDetailReservation(reservation);
        setShowDetailModal(true);
    };

    // ==================== BOOKING MODAL ====================
    const openBookingModal = (entity, type) => {
        if (entity.status === "OCCUPIED") {
            showToast(`${type === "table" ? "Bàn" : "Phòng"} này đã có khách!`, "error");
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        setSelectedEntity({ ...entity, type });
        setBookingForm({
            date: today,
            time: "",
            checkoutDate: today,
            checkoutTime: "",
            customerName: userData.fullName || "",
            phone: userData.phone || "",
            email: userData.email || "",
            note: "",
            depositAmount: 0
        });
        setErrors({});
        setShowBookingModal(true);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!bookingForm.date) newErrors.date = "Vui lòng chọn ngày nhận";
        if (!bookingForm.time) newErrors.time = "Vui lòng chọn giờ nhận";
        if (!bookingForm.checkoutDate) newErrors.checkoutDate = "Vui lòng chọn ngày trả";
        if (!bookingForm.checkoutTime) newErrors.checkoutTime = "Vui lòng chọn giờ trả";

        // Validate chọn bàn/phòng khi tạo mới (không có selectedEntity)
        if (!selectedEntity?.id) {
            if (bookingForm.entityType === "table" && !bookingForm.selectedTableId) {
                newErrors.selectedTableId = "Vui lòng chọn bàn";
            }
            if (bookingForm.entityType === "room" && !bookingForm.selectedRoomId) {
                newErrors.selectedRoomId = "Vui lòng chọn phòng";
            }
        }

        if (bookingForm.date && bookingForm.time && bookingForm.checkoutDate && bookingForm.checkoutTime) {
            const checkin = new Date(`${bookingForm.date}T${bookingForm.time}`);
            const checkout = new Date(`${bookingForm.checkoutDate}T${bookingForm.checkoutTime}`);
            if (checkin < new Date()) newErrors.time = "Thời gian nhận không được ở quá khứ";
            if (checkout <= checkin) newErrors.checkoutTime = "Thời gian trả phải sau thời gian nhận";
        }

        if (!bookingForm.customerName.trim()) newErrors.customerName = "Vui lòng nhập họ tên";
        if (!bookingForm.phone.trim()) {
            newErrors.phone = "Vui lòng nhập số điện thoại";
        } else if (!/^(0|\+84)[0-9]{9,10}$/.test(bookingForm.phone.replace(/\s/g, ''))) {
            newErrors.phone = "Số điện thoại không hợp lệ";
        }
        if (bookingForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingForm.email)) {
            newErrors.email = "Email không hợp lệ";
        }
        if (bookingForm.depositAmount < 0) newErrors.depositAmount = "Tiền cọc không hợp lệ";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitBooking = async () => {
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            const checkIn = `${bookingForm.date} ${bookingForm.time}`;
            const checkOut = `${bookingForm.checkoutDate} ${bookingForm.checkoutTime}`;

            const requestData = {
                userId: userData.id,
                branchId,
                checkInTime: checkIn,
                checkOutTime: checkOut,
                customerName: bookingForm.customerName.trim(),
                customerPhone: bookingForm.phone.replace(/\s/g, ''),
                customerEmail: bookingForm.email?.trim() || undefined,
                depositAmount: bookingForm.depositAmount || 0,
                items: []
            };

            // Xử lý theo 2 trường hợp: có selectedEntity (đặt từ card) hoặc tạo mới
            if (selectedEntity?.id) {
                // Đặt từ card bàn/phòng
                if (selectedEntity.type === "table") {
                    requestData.tableId = selectedEntity.id;
                } else {
                    requestData.roomId = selectedEntity.id;
                }
            } else {
                // Tạo mới - lấy từ dropdown
                if (bookingForm.entityType === "table") {
                    requestData.tableId = parseInt(bookingForm.selectedTableId);
                } else {
                    requestData.roomId = parseInt(bookingForm.selectedRoomId);
                }
            }

            Object.keys(requestData).forEach(k => {
                if (requestData[k] === undefined || requestData[k] === null || requestData[k] === '') {
                    delete requestData[k];
                }
            });

            const response = await axiosClient.post(`/reservations/full`, requestData);

            let entityName = "";
            if (selectedEntity?.id) {
                entityName = `${selectedEntity.type === "table" ? "bàn" : "phòng"} ${selectedEntity.number}`;
            } else {
                if (bookingForm.entityType === "table") {
                    const table = tables.find(t => t.id === parseInt(bookingForm.selectedTableId));
                    entityName = `bàn ${table?.number || ""}`;
                } else {
                    const room = rooms.find(r => r.id === parseInt(bookingForm.selectedRoomId));
                    entityName = `phòng ${room?.number || ""}`;
                }
            }

            showToast(`Đặt ${entityName} thành công!`, "success");
            setShowBookingModal(false);
            refreshAllData();
            socket.emit("new-reservation", response.data);
            socket.emit("update-tables");
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            showToast(`Lỗi: ${msg}`, "error");
        } finally {
            setSubmitting(false);
        }
    };

    // ==================== RENDER HELPERS ====================
    const getAvailableTimes = () => {
        const allTimes = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
        const today = new Date().toISOString().split('T')[0];
        if (!bookingForm.date || bookingForm.date !== today) return allTimes;
        const now = new Date();
        return allTimes.filter(t => {
            const [h, m] = t.split(':').map(Number);
            return h > now.getHours() || (h === now.getHours() && m > now.getMinutes());
        });
    };

    const getStatusColor = (s) => ({ FREE: "#10b981", RESERVED: "#f59e0b", OCCUPIED: "#ef4444", ACTIVE: "#10b981" }[s] || "#6b7280");
    const getStatusText = (s) => ({ FREE: "Trống", RESERVED: "Đã đặt trước", OCCUPIED: "Đã có khách", ACTIVE: "Trống" }[s] || s);
    const getStatusBadgeClass = (s) => {
        if (s === "FREE" || s === "ACTIVE") return styles.statusFree;
        if (s === "RESERVED") return styles.statusReserved;
        if (s === "OCCUPIED") return styles.statusOccupied;
        return "";
    };

    const handleOpenCreateBooking = () => {
        const today = new Date().toISOString().split('T')[0];

        setSelectedEntity(null);  // Đặt là null để biết đây là tạo mới

        setBookingForm({
            date: today,
            time: "",
            checkoutDate: today,
            checkoutTime: "",
            customerName: userData.fullName || "",
            phone: userData.phone || "",
            email: userData.email || "",
            note: "",
            depositAmount: 0,
            entityType: "table",  // Thêm field để biết đang chọn bàn hay phòng
            selectedTableId: "",
            selectedRoomId: ""
        });

        setErrors({});
        setShowBookingModal(true);
    };

    // ==================== RENDER ====================
    return (
        <div className={styles.bookingPage}>
            {/* Toast */}
            {toast.show && (
                <div className={`${styles.toast} ${styles[toast.type]}`}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> : toast.type === 'error' ? <AlertCircle size={20} /> : <Bell size={20} />}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast({ ...toast, show: false })} className={styles.toastClose}><X size={14} /></button>
                </div>
            )}

            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h2 className={styles.headerTitle}>Đặt bàn & Phòng</h2>
                    <div className={styles.headerMeta}>
                        <MapPin size={14} /><span>{branchName || "Nhà hàng"}</span>
                        <Clock3 size={14} /><span>{new Date().toLocaleTimeString('vi-VN')}</span>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button onClick={refreshAllData} className={styles.refreshButton} disabled={loading}>
                        <RefreshCw size={16} className={loading ? styles.spinning : ''} /> Làm mới
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabNavigation}>
                <button onClick={() => setActiveTab("tables")} className={`${styles.tabButton} ${activeTab === "tables" ? styles.activeTab : ""}`}>
                    <Table size={18} /> Bàn ăn <span className={styles.tabCount}>{tables.length}</span>
                </button>
                <button onClick={() => setActiveTab("rooms")} className={`${styles.tabButton} ${activeTab === "rooms" ? styles.activeTab : ""}`}>
                    <Home size={18} /> Phòng <span className={styles.tabCount}>{rooms.length}</span>
                </button>
                <button onClick={() => setActiveTab("reservations")} className={`${styles.tabButton} ${activeTab === "reservations" ? styles.activeTab : ""}`}>
                    <CheckCircle size={18} /> Đã xác nhận {reservations.length > 0 && <span className={styles.badge}>{reservations.length}</span>}
                </button>
                <button
                    onClick={handleOpenCreateBooking}
                    className={styles.addBookingButton}
                >
                    <Plus size={16} />
                    Thêm đặt
                </button>
            </div>

            {/* Area Filter */}
            {activeTab === "tables" && areas.length > 0 && (
                <div className={styles.areaFilter}>
                    <button onClick={() => setShowAreas(!showAreas)} className={styles.areaToggle}>
                        <MapPin size={16} /><span>Khu vực: {selectedArea}</span>
                        {showAreas ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showAreas && (
                        <div className={styles.areaList}>
                            {areas.map(area => (
                                <button key={area} onClick={() => setSelectedArea(area)} className={`${styles.areaButton} ${selectedArea === area ? styles.activeArea : ""}`}>
                                    {area === "Tất cả" ? <Building size={14} /> : <MapPin size={14} />}
                                    <span>{area}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tables Grid */}
            {activeTab === "tables" && (
                <div className={styles.contentArea}>
                    {loading ? (
                        <div className={styles.loadingState}><div className={styles.spinner}></div><p>Đang tải...</p></div>
                    ) : tables.length === 0 ? (
                        <div className={styles.emptyState}><Table size={48} /><p>Không có bàn nào</p></div>
                    ) : (
                        <div className={styles.grid}>
                            {tables.map(table => {
                                const isOcc = table.status === "OCCUPIED";
                                const isRes = table.status === "RESERVED";
                                const isFree = table.status === "FREE";
                                return (
                                    <div key={table.id} className={`${styles.card} ${isOcc ? styles.cardOccupied : isRes ? styles.cardReserved : styles.cardFree}`}>
                                        <div className={styles.statusIndicator} style={{ backgroundColor: getStatusColor(table.status) }} />
                                        {isRes && <button onClick={(e) => handleNoShow(table, "table", e)} className={styles.noShowButton} title="Khách chưa đến"><UserX size={16} /></button>}

                                        <div className={styles.cardContent}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.cardIcon}>{isFree ? <Utensils size={48} /> : isRes ? <Calendar size={48} /> : <Coffee size={48} />}</span>
                                                {table.hasUpcomingReservation && <span className={styles.upcomingBadge}><Clock size={10} /></span>}
                                            </div>
                                            <h3 className={styles.cardTitle}>Bàn {table.number}</h3>
                                            <div className={styles.cardStatus}><span className={`${styles.statusBadge} ${getStatusBadgeClass(table.status)}`}>{getStatusText(table.status)}</span></div>
                                            {table.capacity && <div className={styles.cardInfo}><Users size={12} /><span>{table.capacity} người</span></div>}
                                            {table.area && <div className={styles.cardInfo}><MapPin size={12} /><span>{table.area}</span></div>}
                                            {(isRes || table.hasUpcomingReservation) && table.customerName && (
                                                <div className={styles.upcomingInfo}>
                                                    <AlertTriangle size={12} />
                                                    <div><p className={styles.upcomingName}>{table.customerName}</p>
                                                        {table.checkInTime && <p className={styles.upcomingTime}>{formatDateTime(table.checkInTime)}</p>}</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.cardActions}>
                                            {isFree && !table.hasUpcomingReservation && (
                                                <button onClick={() => openBookingModal(table, "table")} className={styles.bookButton}>
                                                    <Calendar size={14} /> Đặt bàn
                                                </button>
                                            )}
                                            {(isRes || table.hasUpcomingReservation) && (
                                                <button onClick={(e) => handleCheckIn(table, "table", e)} className={styles.checkinButton}>
                                                    <CheckCircle size={14} /> Check-in
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Rooms Grid */}
            {activeTab === "rooms" && (
                <div className={styles.contentArea}>
                    {rooms.length === 0 ? (
                        <div className={styles.emptyState}><Home size={48} /><p>Không có phòng VIP</p></div>
                    ) : (
                        <div className={styles.grid}>
                            {rooms.map(room => {
                                const isOcc = room.status === "OCCUPIED";
                                const isRes = room.status === "RESERVED";
                                const isFree = room.status === "FREE" || room.status === "ACTIVE";
                                const hasReservation = room.hasUpcomingReservation === true;
                                const customerName = room.customerName;
                                const checkInTime = room.checkInTime;

                                return (
                                    <div key={room.id} className={`${styles.card} ${isOcc ? styles.cardOccupied : isRes ? styles.cardReserved : styles.cardFree}`}>
                                        <div className={styles.statusIndicator} style={{ backgroundColor: getStatusColor(room.status) }} />

                                        {isRes && (
                                            <button
                                                onClick={(e) => handleNoShow(room, "room", e)}
                                                className={styles.noShowButton}
                                                title="Hủy đặt phòng do khách chưa đến"
                                            >
                                                <UserX size={16} />
                                            </button>
                                        )}

                                        <div className={styles.cardContent}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.cardIcon}>
                                                    {isFree ? <Home size={48} /> : isRes ? <Calendar size={48} /> : <Lock size={48} />}
                                                </span>
                                                {hasReservation && <span className={styles.upcomingBadge}><Clock size={10} /></span>}
                                            </div>
                                            <h3 className={styles.cardTitle}>Phòng {room.number}</h3>
                                            <div className={styles.cardStatus}>
                                                <span className={`${styles.statusBadge} ${getStatusBadgeClass(room.status)}`}>
                                                    {getStatusText(room.status)}
                                                </span>
                                            </div>
                                            {room.area && <div className={styles.cardInfo}><MapPin size={12} /><span>{room.area}</span></div>}
                                            {(isRes || hasReservation) && customerName && (
                                                <div className={styles.upcomingInfo}>
                                                    <AlertTriangle size={12} />
                                                    <div>
                                                        <p className={styles.upcomingName}>{customerName}</p>
                                                        {checkInTime && <p className={styles.upcomingTime}>{formatDateTime(checkInTime)}</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.cardActions}>
                                            {isFree && !hasReservation && (
                                                <button onClick={() => openBookingModal(room, "room")} className={styles.bookButton}>
                                                    <Calendar size={14} /> Đặt phòng
                                                </button>
                                            )}
                                            {(isRes || hasReservation) && (  // ← bỏ room.hasUpcomingReservation, dùng biến local hasReservation
                                                <button onClick={(e) => handleCheckIn(room, "room", e)} className={styles.checkinButton}>
                                                    <CheckCircle size={14} /> Check-in
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ==================== RESERVATIONS TAB ==================== */}
            {activeTab === "reservations" && (
                <div className={styles.contentArea}>
                    {/* Search and Filter Section */}
                    <div className={styles.searchSection}>
                        <div className={styles.searchBox}>
                            <Search size={18} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Tìm theo tên, SĐT, email, bàn, phòng..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className={styles.clearSearch}
                                    title="Xóa tìm kiếm"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <div className={styles.filterGroup}>
                            <div className={styles.filterItem}>
                                <Filter size={14} />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className={styles.filterSelect}
                                >
                                    <option value="all">Tất cả loại</option>
                                    <option value="table">Bàn ăn</option>
                                    <option value="room">Phòng VIP</option>
                                </select>
                            </div>

                            <div className={styles.filterItem}>
                                <Calendar size={14} />
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className={styles.filterDateInput}
                                    placeholder="Lọc theo ngày"
                                />
                                {filterDate && (
                                    <button
                                        onClick={() => setFilterDate("")}
                                        className={styles.clearFilter}
                                        title="Xóa lọc ngày"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {(searchTerm || filterDate || filterStatus !== "all") && (
                        <div className={styles.activeFilters}>
                            <span className={styles.filterLabel}>Đang lọc:</span>
                            {searchTerm && (
                                <span className={styles.filterTag}>
                                    <Search size={12} /> "{searchTerm}"
                                    <button onClick={() => setSearchTerm("")}><X size={12} /></button>
                                </span>
                            )}
                            {filterDate && (
                                <span className={styles.filterTag}>
                                    <Calendar size={12} /> {new Date(filterDate).toLocaleDateString('vi-VN')}
                                    <button onClick={() => setFilterDate("")}><X size={12} /></button>
                                </span>
                            )}
                            {filterStatus !== "all" && (
                                <span className={styles.filterTag}>
                                    <Filter size={12} /> {filterStatus === "table" ? "Bàn ăn" : "Phòng VIP"}
                                    <button onClick={() => setFilterStatus("all")}><X size={12} /></button>
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setFilterDate("");
                                    setFilterStatus("all");
                                }}
                                className={styles.clearAllFilters}
                            >
                                Xóa tất cả
                            </button>
                        </div>
                    )}

                    {/* Reservations List */}
                    <div className={styles.reservationsSection}>
                        <div className={styles.sectionHeader}>
                            <h3><CheckCircle size={20} /> Danh sách đã xác nhận</h3>
                            <span className={styles.reservationCount}>
                                {filteredReservations.length} / {reservations.length} đơn
                            </span>
                        </div>

                        {reservations.length === 0 ? (
                            <div className={styles.emptyState}>
                                <CheckCircle size={48} color="#10b981" />
                                <p>Chưa có đơn nào được xác nhận</p>
                            </div>
                        ) : filteredReservations.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Search size={48} color="#9ca3af" />
                                <p>Không tìm thấy đơn nào phù hợp</p>
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setFilterDate("");
                                        setFilterStatus("all");
                                    }}
                                    className={styles.clearSearchButton}
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            <div className={styles.reservationsList}>
                                {filteredReservations.map(res => (
                                    <div key={res.id} className={styles.reservationCard} style={{ borderLeft: '4px solid #10b981' }}>
                                        <div className={styles.reservationHeader}>
                                            <div className={styles.reservationCustomer}>
                                                <h4><User size={16} />{res.customerName}</h4>
                                                <span className={styles.confirmedBadge}><CheckCircle size={12} /> Đã xác nhận</span>
                                            </div>
                                            <div className={styles.reservationActions}>
                                                <button onClick={() => openDetailModal(res)} className={styles.detailButton}>
                                                    <Eye size={14} /> Chi tiết
                                                </button>
                                            </div>
                                        </div>
                                        <div className={styles.reservationDetails}>
                                            <div className={styles.detailItem}><Phone size={14} /><span>{res.phone || "Không có"}</span></div>
                                            <div className={styles.detailItem}><Calendar size={14} /><span>{formatDateTime(res.checkInTime)}</span></div>
                                            <div className={styles.detailItem}>
                                                {res.tableNumber ? <><Table size={14} /><span>Bàn {res.tableNumber}</span></> :
                                                    res.roomNumber ? <><Home size={14} /><span>Phòng {res.roomNumber}</span></> :
                                                        <><MapPin size={14} /><span>{res.branchName}</span></>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== BOOKING MODAL ==================== */}
            {showBookingModal && (
                <div className={styles.modalOverlay} onClick={() => setShowBookingModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>
                                <Calendar size={18} />
                                {selectedEntity?.id
                                    ? `Đặt ${selectedEntity.type === "table" ? "bàn" : "phòng"} ${selectedEntity.number}`
                                    : "Đặt bàn/phòng mới"}
                            </h3>
                            <button onClick={() => setShowBookingModal(false)} className={styles.modalClose}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            {/* Nếu không có selectedEntity (thêm mới) thì hiển thị dropdown chọn bàn/phòng */}
                            {!selectedEntity?.id && (
                                <div className={styles.infoBox} style={{ marginBottom: 20 }}>
                                    <div className={styles.formGroup}>
                                        <label>Loại *</label>
                                        <div className={styles.typeSwitch}>
                                            <button
                                                type="button"
                                                onClick={() => setBookingForm(prev => ({ ...prev, entityType: "table", selectedTableId: "", selectedRoomId: "" }))}
                                                className={`${styles.typeButton} ${bookingForm.entityType === "table" ? styles.activeType : ""}`}
                                            >
                                                <Table size={16} /> Bàn ăn
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBookingForm(prev => ({ ...prev, entityType: "room", selectedTableId: "", selectedRoomId: "" }))}
                                                className={`${styles.typeButton} ${bookingForm.entityType === "room" ? styles.activeType : ""}`}
                                            >
                                                <Home size={16} /> Phòng VIP
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>
                                            {bookingForm.entityType === "table" ? <Table size={14} /> : <Home size={14} />}
                                            {bookingForm.entityType === "table" ? "Chọn bàn *" : "Chọn phòng *"}
                                        </label>
                                        <select
                                            value={bookingForm.entityType === "table" ? bookingForm.selectedTableId : bookingForm.selectedRoomId}
                                            onChange={(e) => {
                                                if (bookingForm.entityType === "table") {
                                                    setBookingForm({ ...bookingForm, selectedTableId: e.target.value });
                                                } else {
                                                    setBookingForm({ ...bookingForm, selectedRoomId: e.target.value });
                                                }
                                                setErrors({});
                                            }}
                                            className={errors.selectedTableId || errors.selectedRoomId ? styles.inputError : styles.select}
                                        >
                                            <option value="">-- Chọn {bookingForm.entityType === "table" ? "bàn" : "phòng"} --</option>
                                            {bookingForm.entityType === "table"
                                                ? tables.filter(t => t.status === "FREE").map(table => (
                                                    <option key={table.id} value={table.id}>Bàn {table.number} - {table.capacity} người - {table.area}</option>
                                                ))
                                                : rooms.filter(r => r.status === "FREE" || r.status === "ACTIVE").map(room => (
                                                    <option key={room.id} value={room.id}>Phòng {room.number} - {room.area}</option>
                                                ))
                                            }
                                        </select>
                                        {(errors.selectedTableId || errors.selectedRoomId) && (
                                            <span className={styles.errorMessage}>{errors.selectedTableId || errors.selectedRoomId}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Hiển thị thông tin bàn/phòng đã chọn (khi đặt từ card) */}
                            {selectedEntity?.id && (
                                <div className={styles.infoBox}>
                                    <div className={styles.infoItem}>
                                        <span>{selectedEntity.type === "table" ? <Utensils size={16} /> : <Home size={16} />}
                                            <strong>{selectedEntity.type === "table" ? "Bàn" : "Phòng"} {selectedEntity.number}</strong>
                                        </span>
                                        {selectedEntity.capacity && <span><Users size={14} />{selectedEntity.capacity} người</span>}
                                    </div>
                                    {selectedEntity.area && <div className={styles.infoItem}><MapPin size={14} /><span>{selectedEntity.area}</span></div>}
                                </div>
                            )}

                            <form onSubmit={(e) => { e.preventDefault(); handleSubmitBooking(); }}>
                                {/* CHECK-IN */}
                                <div style={{ marginBottom: 16, padding: 14, background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                                    <label style={{ fontWeight: 700, color: "#166534", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                                        <CalendarClock size={18} /> THỜI GIAN NHẬN
                                    </label>
                                    <div className={styles.formGrid}>
                                        <div className={styles.formGroup}>
                                            <label><Calendar size={14} /> Ngày *</label>
                                            <input
                                                type="date"
                                                value={bookingForm.date}
                                                onChange={(e) => { setBookingForm({ ...bookingForm, date: e.target.value, time: "" }); setErrors({}); }}
                                                min={new Date().toISOString().split('T')[0]}
                                                className={errors.date ? styles.inputError : styles.input}
                                            />
                                            {errors.date && <span className={styles.errorMessage}>{errors.date}</span>}
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label><Clock size={14} /> Giờ *</label>
                                            <select
                                                value={bookingForm.time}
                                                onChange={(e) => { setBookingForm({ ...bookingForm, time: e.target.value }); setErrors({}); }}
                                                disabled={!bookingForm.date}
                                                className={errors.time ? styles.inputError : styles.select}
                                            >
                                                <option value="">-- Chọn giờ --</option>
                                                {getAvailableTimes().map(time => <option key={time} value={time}>{time}</option>)}
                                            </select>
                                            {errors.time && <span className={styles.errorMessage}>{errors.time}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* CHECK-OUT */}
                                <div style={{ marginBottom: 16, padding: 14, background: "#fff7ed", borderRadius: 12, border: "1px solid #fed7aa" }}>
                                    <label style={{ fontWeight: 700, color: "#9a3412", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                                        <CalendarClock size={18} /> THỜI GIAN TRẢ
                                    </label>
                                    <div className={styles.formGrid}>
                                        <div className={styles.formGroup}>
                                            <label><Calendar size={14} /> Ngày *</label>
                                            <input
                                                type="date"
                                                value={bookingForm.checkoutDate}
                                                onChange={(e) => { setBookingForm({ ...bookingForm, checkoutDate: e.target.value, checkoutTime: "" }); setErrors({}); }}
                                                min={bookingForm.date || new Date().toISOString().split('T')[0]}
                                                className={errors.checkoutDate ? styles.inputError : styles.input}
                                            />
                                            {errors.checkoutDate && <span className={styles.errorMessage}>{errors.checkoutDate}</span>}
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label><Clock size={14} /> Giờ *</label>
                                            <select
                                                value={bookingForm.checkoutTime}
                                                onChange={(e) => { setBookingForm({ ...bookingForm, checkoutTime: e.target.value }); setErrors({}); }}
                                                disabled={!bookingForm.checkoutDate}
                                                className={errors.checkoutTime ? styles.inputError : styles.select}
                                            >
                                                <option value="">-- Chọn giờ --</option>
                                                {getAvailableTimes().map(time => <option key={time} value={time}>{time}</option>)}
                                            </select>
                                            {errors.checkoutTime && <span className={styles.errorMessage}>{errors.checkoutTime}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label><User size={14} /> Họ tên khách hàng *</label>
                                    <input
                                        type="text"
                                        value={bookingForm.customerName}
                                        onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                                        className={errors.customerName ? styles.inputError : styles.input}
                                        placeholder="Nhập họ tên"
                                    />
                                    {errors.customerName && <span className={styles.errorMessage}>{errors.customerName}</span>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label><Phone size={14} /> Số điện thoại *</label>
                                    <input
                                        type="tel"
                                        value={bookingForm.phone}
                                        onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                                        className={errors.phone ? styles.inputError : styles.input}
                                        placeholder="0987654321"
                                    />
                                    {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label><Mail size={14} /> Email</label>
                                    <input
                                        type="email"
                                        value={bookingForm.email}
                                        onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                                        className={errors.email ? styles.inputError : styles.input}
                                        placeholder="example@email.com"
                                    />
                                    {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label><DollarSign size={14} /> Tiền cọc (VNĐ)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="10000"
                                        value={bookingForm.depositAmount}
                                        onChange={(e) => setBookingForm({ ...bookingForm, depositAmount: parseInt(e.target.value) || 0 })}
                                        className={errors.depositAmount ? styles.inputError : styles.input}
                                        placeholder="0"
                                    />
                                    {errors.depositAmount && <span className={styles.errorMessage}>{errors.depositAmount}</span>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label><PenSquare size={14} /> Ghi chú</label>
                                    <textarea
                                        value={bookingForm.note}
                                        onChange={(e) => setBookingForm({ ...bookingForm, note: e.target.value })}
                                        className={styles.textarea}
                                        rows="2"
                                        placeholder="Ghi chú..."
                                    />
                                </div>

                                <div className={styles.notificationInfo}>
                                    <Bell size={14} />
                                    <span>Đặt bàn sẽ ở trạng thái chờ xác nhận.</span>
                                </div>
                            </form>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowBookingModal(false)} className={styles.cancelModalButton} disabled={submitting}>Hủy</button>
                            <button onClick={handleSubmitBooking} disabled={submitting} className={styles.submitModalButton}>
                                {submitting ? <><div className={styles.buttonSpinner}></div>Đang xử lý...</> : <><Calendar size={16} /> Xác nhận đặt</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {showStatusModal && statusEntity && (
                <div className={styles.modalOverlay} onClick={() => setShowStatusModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3><Edit size={18} /> Cập nhật trạng thái</h3>
                            <button onClick={() => setShowStatusModal(false)} className={styles.modalClose}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.infoBox}>
                                <div className={styles.infoItem}><span>{statusEntity.type === "table" ? <Utensils size={16} /> : <Home size={16} />}<strong>{statusEntity.type === "table" ? "Bàn" : "Phòng"} {statusEntity.number}</strong></span></div>
                                <div className={styles.infoItem}><span>Hiện tại: <strong>{getStatusText(statusEntity.status)}</strong></span></div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Chọn trạng thái mới:</label>
                                <div className={styles.statusOptions}>
                                    <button type="button" onClick={() => setNewStatus("FREE")} className={`${styles.statusOption} ${styles.freeOption} ${newStatus === "FREE" ? styles.activeOption : ""}`}><CheckCircle size={14} /><span>Trống</span></button>
                                    <button type="button" onClick={() => setNewStatus("RESERVED")} className={`${styles.statusOption} ${styles.reservedOption} ${newStatus === "RESERVED" ? styles.activeOption : ""}`}><Clock size={14} /><span>Đã đặt trước</span></button>
                                    <button type="button" onClick={() => setNewStatus("OCCUPIED")} className={`${styles.statusOption} ${styles.occupiedOption} ${newStatus === "OCCUPIED" ? styles.activeOption : ""}`}><User size={14} /><span>Đã có khách</span></button>
                                </div>
                            </div>
                            {newStatus !== statusEntity.status && (
                                <div className={styles.warningBox}><AlertTriangle size={14} /><span>Thay đổi từ <strong>{getStatusText(statusEntity.status)}</strong> sang <strong>{getStatusText(newStatus)}</strong>.</span></div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowStatusModal(false)} className={styles.cancelModalButton} disabled={updatingStatus}>Hủy</button>
                            <button onClick={handleUpdateStatus} disabled={updatingStatus || newStatus === statusEntity.status} className={styles.submitModalButton}>
                                {updatingStatus ? <><div className={styles.buttonSpinner}></div>Đang cập nhật...</> : <><Edit size={16} /> Cập nhật</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* No-Show Modal */}
            {showNoShowModal && noShowEntity && (
                <div className={styles.modalOverlay} onClick={() => setShowNoShowModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3><AlertOctagon size={18} /> Xác nhận hủy đặt</h3>
                            <button onClick={() => setShowNoShowModal(false)} className={styles.modalClose}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.warningBox} style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                <AlertTriangle size={20} color="#ef4444" />
                                <div>
                                    <p style={{ fontWeight: 600, color: '#991b1b', margin: 0 }}>Khách chưa đến - Hủy đặt {noShowEntity.type === "table" ? "bàn" : "phòng"}?</p>
                                    <p style={{ color: '#7f1d1d', margin: '8px 0 0 0', fontSize: 14 }}>
                                        {noShowEntity.type === "table" ? "Bàn" : "Phòng"} <strong>{noShowEntity.number}</strong> đang "Đã đặt trước" nhưng khách chưa đến.
                                    </p>
                                    {noShowEntity.customerName && <p style={{ color: '#7f1d1d', margin: '4px 0 0 0', fontSize: 14 }}>Khách: <strong>{noShowEntity.customerName}</strong></p>}
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowNoShowModal(false)} className={styles.cancelModalButton}>Giữ nguyên</button>
                            <button onClick={confirmNoShow} className={styles.dangerButton}><Trash2 size={16} /> Xác nhận hủy</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== DETAIL MODAL ==================== */}
            {showDetailModal && detailReservation && (
                <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3><Info size={18} /> Chi tiết đặt bàn</h3>
                            <button onClick={() => setShowDetailModal(false)} className={styles.modalClose}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.infoBox} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <div className={styles.infoItem}>
                                    <span>Trạng thái: <strong style={{ color: '#10b981' }}>Đã xác nhận</strong></span>
                                    <span className={styles.confirmedBadge}><CheckCircle size={14} /> CONFIRMED</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}><UserCircle size={14} /> Thông tin khách hàng</label>
                                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14 }}>
                                    <div className={styles.detailItem} style={{ marginBottom: 6 }}><User size={14} /><span><strong>{detailReservation.customerName}</strong></span></div>
                                    <div className={styles.detailItem} style={{ marginBottom: 6 }}><Phone size={14} /><span>{detailReservation.phone || "Không có"}</span></div>
                                    {detailReservation.email && <div className={styles.detailItem} style={{ marginBottom: 6 }}><Mail size={14} /><span>{detailReservation.email}</span></div>}
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}><Calendar size={14} /> Thông tin đặt bàn</label>
                                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14 }}>
                                    <div className={styles.detailItem} style={{ marginBottom: 6 }}>
                                        <Calendar size={14} />
                                        <span>Nhận: <strong>{formatDateTime(detailReservation.checkInTime)}</strong></span>
                                    </div>
                                    <div className={styles.detailItem} style={{ marginBottom: 6 }}>
                                        <Calendar size={14} />
                                        <span>Trả: <strong>{formatDateTime(detailReservation.checkOutTime)}</strong></span>
                                    </div>
                                    <div className={styles.detailItem} style={{ marginBottom: 6 }}>
                                        {detailReservation.tableNumber ? <Table size={14} /> : <Home size={14} />}
                                        <span>
                                            {detailReservation.tableNumber
                                                ? `Bàn ${detailReservation.tableNumber}`
                                                : `Phòng ${detailReservation.roomNumber}`}
                                        </span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <MapPin size={14} />
                                        <span>{detailReservation.branchName}</span>
                                    </div>
                                </div>
                            </div>

                            {detailReservation.remainingAmount > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}><CreditCard size={14} /> Thanh toán</label>
                                    <div style={{ background: '#fffbeb', borderRadius: 10, padding: 14, border: '1px solid #fde68a' }}>
                                        <div className={styles.detailItem}>
                                            <DollarSign size={14} />
                                            <span>Còn lại: <strong style={{ color: '#f59e0b' }}>{formatCurrency(detailReservation.remainingAmount)}</strong></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowDetailModal(false)} className={styles.cancelModalButton}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingPage;