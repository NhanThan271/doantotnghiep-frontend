// BookingPage.jsx - Giao diện đặt bàn cho Thu ngân
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Table, Home, Users, Clock, CheckCircle, XCircle,
    ChevronDown, ChevronUp, X, Calendar, Phone, User,
    AlertCircle, Edit2, Bell, Check, List, RefreshCw,
    MapPin, Clock3, AlertTriangle
} from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import styles from "./BookingPage.module.css";

const API_BASE_URL = "http://localhost:8080";
const SOCKET_URL = "http://localhost:3001";
const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
});

const BookingPage = () => {
    const navigate = useNavigate();

    // State management
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState("Tất cả");
    const [loading, setLoading] = useState(true);
    const [showAreas, setShowAreas] = useState(true);
    const [activeTab, setActiveTab] = useState("tables");
    const [reservations, setReservations] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [isSocketConnected, setIsSocketConnected] = useState(true);

    // Modal states
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [bookingForm, setBookingForm] = useState({
        date: "",
        time: "",
        customerName: "",
        phone: "",
        email: "",
        note: "",
        depositAmount: 0
    });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Status modal
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusEntity, setStatusEntity] = useState(null);
    const [newStatus, setNewStatus] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Reservation detail modal
    const [showReservationDetail, setShowReservationDetail] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);

    // Toast
    const [toast, setToast] = useState({ show: false, message: "", type: "" });

    // User data
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = userData.branch?.id;
    const branchName = userData.branch?.name;
    const userRole = userData.role?.name || userData.role;
    const token = localStorage.getItem('token');

    const canEditStatus = ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(userRole);

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
            setIsSocketConnected(true);
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
            setIsSocketConnected(false);
            showToast("Mất kết nối real-time, đang thử kết nối lại...", "warning");
        });

        socket.on("staff-reservation-notification", (data) => {
            console.log("📢 Nhận thông báo đặt bàn:", data);
            showToast(data.message, "info");
            setNotifications(prev => [data, ...prev]);
            fetchReservations();
            fetchTables();
            fetchRooms();
        });

        socket.on("update-tables", () => {
            console.log("🔄 Nhận lệnh cập nhật bàn từ socket");
            fetchTables();
            fetchRooms();
            fetchReservations();
        });

        socket.on("new-reservation", (data) => {
            console.log("🆕 Đặt bàn mới:", data);
            showToast("Có đặt bàn mới cần xác nhận!", "info");
            fetchReservations();
            fetchTables();
            fetchRooms();
        });

        socket.on("reservation-updated", (data) => {
            console.log("🔄 Reservation updated:", data);
            refreshAllData();
        });

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("staff-reservation-notification");
            socket.off("update-tables");
            socket.off("new-reservation");
            socket.off("reservation-updated");
        };
    }, [userData.id, branchId]);

    // ==================== UTILITY FUNCTIONS ====================
    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return "";
        const date = new Date(dateTimeStr);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount || 0);
    };

    const showToast = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: "", type: "" });
        }, 4000);
    }, []);

    // ==================== API CALLS ====================
    const fetchAreas = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tables/branch/${branchId}/areas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAreas(["Tất cả", ...data]);
            }
        } catch (err) {
            console.error("Lỗi tải khu vực:", err);
        }
    };

    // 👉 QUAN TRỌNG: Dùng API /reservations/tables (đã có sẵn customerName, checkInTime)
    const fetchTables = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/reservations/tables`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                let data = await response.json();
                console.log("✅ API /reservations/tables trả về:", data.length, "bàn");
                console.log("📋 Dữ liệu bàn mẫu:", data[0]); // Kiểm tra xem có customerName không

                // Lọc theo khu vực
                if (selectedArea !== "Tất cả") {
                    data = data.filter(table => table.area === selectedArea);
                }

                setTables(data);
            } else {
                console.error("API /reservations/tables lỗi:", response.status);
                setTables([]);
            }
        } catch (err) {
            console.error("Lỗi tải bàn:", err);
            setTables([]);
        } finally {
            setLoading(false);
        }
    }, [selectedArea, token]);

    const fetchRooms = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/reservations/rooms`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRooms(data);
            }
        } catch (err) {
            console.error("Lỗi tải phòng:", err);
        }
    }, [token]);

    const fetchReservations = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/reservations/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const pendingOnly = data.filter(r => r.status === "PENDING");
                setReservations(pendingOnly);
            }
        } catch (err) {
            console.error("Lỗi tải đặt bàn:", err);
        }
    }, [token]);

    const refreshAllData = useCallback(() => {
        setLoading(true);
        Promise.all([
            fetchTables(),
            fetchRooms(),
            fetchReservations(),
            fetchAreas()
        ]).finally(() => {
            setLoading(false);
            showToast("Đã làm mới dữ liệu", "info");
        });
    }, [fetchTables, fetchRooms, fetchReservations, showToast]);

    useEffect(() => {
        if (branchId) {
            refreshAllData();
        }
    }, [branchId, refreshAllData]);

    // ==================== RESERVATION ACTIONS ====================
    const confirmReservation = async (reservationId) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/reservations/${reservationId}/status?status=CONFIRMED`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok || response.status === 500) {
                const result = await response.json();
                showToast("✅ Đã xác nhận đặt bàn thành công!", "success");
                socket.emit("reservation-confirmed", result);

                await Promise.all([
                    fetchReservations(),
                    fetchTables(),
                    fetchRooms()
                ]);

                socket.emit("update-tables");
                socket.emit("reservation-updated", {
                    reservationId,
                    status: "CONFIRMED"
                });
            }
        } catch (err) {
            console.error("Lỗi xác nhận:", err);
            showToast("❌ Xác nhận thất bại: " + err.message, "error");
        }
    };

    const cancelReservation = async (reservationId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy đặt bàn này?")) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/reservations/${reservationId}/status?status=CANCELLED`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok || response.status === 500) {
                showToast("🗑️ Đã hủy đặt bàn thành công!", "success");

                await Promise.all([
                    fetchReservations(),
                    fetchTables(),
                    fetchRooms()
                ]);

                socket.emit("update-tables");
                socket.emit("reservation-updated", {
                    reservationId,
                    status: "CANCELLED"
                });
            }
        } catch (err) {
            console.error("Lỗi hủy đặt bàn:", err);
            showToast("❌ Hủy thất bại: " + err.message, "error");
        }
    };

    // ==================== BOOKING MODAL ====================
    const openBookingModal = (entity, type) => {
        if (entity.status === "OCCUPIED") {
            showToast(`${type === "table" ? "Bàn" : "Phòng"} này đã có khách!`, "error");
            return;
        }

        setSelectedEntity({ ...entity, type });
        setBookingForm({
            date: new Date().toISOString().split('T')[0],
            time: "",
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

        if (!bookingForm.date) newErrors.date = "Vui lòng chọn ngày đặt";
        if (!bookingForm.time) newErrors.time = "Vui lòng chọn giờ đặt";

        if (bookingForm.date && bookingForm.time) {
            const selectedDateTime = new Date(`${bookingForm.date}T${bookingForm.time}`);
            if (selectedDateTime < new Date()) {
                newErrors.time = "Thời gian đặt không được ở quá khứ";
            }
        }

        if (!bookingForm.customerName.trim()) {
            newErrors.customerName = "Vui lòng nhập họ tên khách hàng";
        }

        if (!bookingForm.phone.trim()) {
            newErrors.phone = "Vui lòng nhập số điện thoại";
        } else if (!/^(0|\+84)[0-9]{9,10}$/.test(bookingForm.phone.replace(/\s/g, ''))) {
            newErrors.phone = "Số điện thoại không hợp lệ";
        }

        if (bookingForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingForm.email)) {
            newErrors.email = "Email không hợp lệ";
        }

        if (bookingForm.depositAmount < 0) {
            newErrors.depositAmount = "Tiền cọc không hợp lệ";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitBooking = async () => {
        if (!validateForm()) return;

        setSubmitting(true);

        try {
            const reservationDateTime = `${bookingForm.date}T${bookingForm.time}:00`;

            const requestData = {
                userId: userData.id,
                branchId: branchId,
                tableId: selectedEntity.type === "table" ? selectedEntity.id : null,
                roomId: selectedEntity.type === "room" ? selectedEntity.id : null,
                checkInTime: reservationDateTime,
                checkOutTime: getDefaultCheckOutTime(reservationDateTime),
                customerName: bookingForm.customerName.trim(),
                customerPhone: bookingForm.phone.replace(/\s/g, ''),
                customerEmail: bookingForm.email || null,
                depositAmount: bookingForm.depositAmount || 0,
                items: []
            };

            Object.keys(requestData).forEach(key => {
                if (requestData[key] === null || requestData[key] === undefined) {
                    delete requestData[key];
                }
            });

            const response = await fetch(`${API_BASE_URL}/api/reservations/full`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Đặt bàn thất bại");
            }

            const result = await response.json();

            showToast(
                `✅ Đặt ${selectedEntity.type === "table" ? "bàn" : "phòng"} ${selectedEntity.number} thành công! Đang chờ xác nhận.`,
                "success"
            );

            setShowBookingModal(false);

            await Promise.all([
                fetchReservations(),
                fetchTables(),
                fetchRooms()
            ]);

            socket.emit("new-reservation", result);
            socket.emit("update-tables");

        } catch (err) {
            console.error("❌ Lỗi đặt bàn:", err);
            showToast(`Đặt bàn thất bại: ${err.message}`, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const getDefaultCheckOutTime = (checkInTime) => {
        const date = new Date(checkInTime);
        date.setHours(date.getHours() + 3);
        return date.toISOString().replace('T', ' ').substring(0, 19);
    };

    // ==================== STATUS MANAGEMENT ====================
    const handleCheckIn = async (entity, type, e) => {
        e.stopPropagation();

        try {
            const pendingReservation = reservations.find(res => {
                if (type === "table") {
                    return res.tableNumber === entity.number;
                } else {
                    return res.roomNumber === entity.number;
                }
            });

            if (pendingReservation) {
                await confirmReservation(pendingReservation.id);
                await updateReservationStatus(pendingReservation.id, "CHECKED_IN");
            }

            showToast(`✅ Check-in ${type === "table" ? "bàn" : "phòng"} ${entity.number} thành công!`, "success");

            await Promise.all([
                fetchReservations(),
                fetchTables(),
                fetchRooms()
            ]);

            socket.emit("update-tables");

        } catch (err) {
            console.error("Lỗi check-in:", err);
            showToast(`Check-in thất bại: ${err.message}`, "error");
        }
    };

    const updateReservationStatus = async (reservationId, status) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/reservations/${reservationId}/status?status=${status}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok && response.status !== 500) {
                throw new Error("Cập nhật trạng thái thất bại");
            }

            return true;
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái:", err);
            throw err;
        }
    };

    // ==================== RENDER FUNCTIONS ====================
    const getAvailableTimes = () => {
        const allTimes = [
            "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
            "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
            "20:00", "20:30", "21:00", "21:30", "22:00"
        ];

        const selectedDate = bookingForm.date;
        const today = new Date().toISOString().split('T')[0];

        if (!selectedDate || selectedDate !== today) {
            return allTimes;
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        return allTimes.filter(time => {
            const [hour, minute] = time.split(':').map(Number);
            return hour > currentHour || (hour === currentHour && minute > currentMinute);
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            FREE: "#10b981",
            RESERVED: "#f59e0b",
            OCCUPIED: "#ef4444",
            ACTIVE: "#10b981"
        };
        return colors[status] || "#6b7280";
    };

    const getStatusText = (status) => {
        const texts = {
            FREE: "Trống",
            RESERVED: "Đã đặt trước",
            OCCUPIED: "Đã có khách",
            ACTIVE: "Trống"
        };
        return texts[status] || status;
    };

    // ==================== RENDER ====================
    return (
        <div className={styles.bookingPage}>
            {!isSocketConnected && (
                <div className={styles.warningBanner}>
                    <AlertCircle size={16} color="#fbbf24" />
                    <span>Đang mất kết nối real-time. Dữ liệu có thể không được cập nhật ngay!</span>
                </div>
            )}

            {toast.show && (
                <div className={`${styles.toast} ${styles[toast.type]}`}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> :
                        toast.type === 'error' ? <AlertCircle size={20} /> :
                            <Bell size={20} />}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast({ ...toast, show: false })} className={styles.toastClose}><X size={14} /></button>
                </div>
            )}

            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h2 className={styles.headerTitle}>🏨 Đặt bàn & Phòng</h2>
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

            <div className={styles.tabNavigation}>
                <button onClick={() => setActiveTab("tables")} className={`${styles.tabButton} ${activeTab === "tables" ? styles.activeTab : ""}`}>
                    <Table size={18} /> Bàn ăn <span className={styles.tabCount}>{tables.length}</span>
                </button>
                <button onClick={() => setActiveTab("rooms")} className={`${styles.tabButton} ${activeTab === "rooms" ? styles.activeTab : ""}`}>
                    <Home size={18} /> Phòng VIP <span className={styles.tabCount}>{rooms.length}</span>
                </button>
                <button onClick={() => setActiveTab("reservations")} className={`${styles.tabButton} ${activeTab === "reservations" ? styles.activeTab : ""}`}>
                    <List size={18} /> Chờ xác nhận {reservations.length > 0 && <span className={styles.badge}>{reservations.length}</span>}
                </button>
            </div>

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
                                    {area === "Tất cả" ? "🏠 Tất cả" : `📍 ${area}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "tables" && (
                <div className={styles.contentArea}>
                    {loading ? (
                        <div className={styles.loadingState}><div className={styles.spinner}></div><p>Đang tải danh sách bàn...</p></div>
                    ) : tables.length === 0 ? (
                        <div className={styles.emptyState}><Table size={48} /><p>Không có bàn nào trong khu vực này</p></div>
                    ) : (
                        <div className={styles.grid}>
                            {tables.map((table) => {
                                const isOccupied = table.status === "OCCUPIED";
                                const isReserved = table.status === "RESERVED";
                                const isFree = table.status === "FREE";
                                // 👉 Dùng dữ liệu có sẵn từ API
                                const hasReservation = table.hasUpcomingReservation === true;
                                const customerName = table.customerName;
                                const checkInTime = table.checkInTime;

                                return (
                                    <div key={table.id} className={`${styles.card} ${isOccupied ? styles.cardOccupied : isReserved ? styles.cardReserved : styles.cardFree}`}>
                                        <div className={styles.statusIndicator} style={{ backgroundColor: getStatusColor(table.status) }} />
                                        <div className={styles.cardContent}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.cardIcon}>{isFree ? "🍽️" : isReserved ? "📅" : "🍜"}</span>
                                                {hasReservation && <span className={styles.upcomingBadge} title="Có đặt bàn sắp tới"><Clock size={10} /></span>}
                                            </div>
                                            <h3 className={styles.cardTitle}>Bàn {table.number}</h3>
                                            <div className={styles.cardStatus}><span style={{ color: getStatusColor(table.status) }}>{getStatusText(table.status)}</span></div>
                                            {table.capacity && <div className={styles.cardInfo}><Users size={12} /><span>{table.capacity} người</span></div>}
                                            {table.area && <div className={styles.cardInfo}><MapPin size={12} /><span>{table.area}</span></div>}
                                            {/* 👉 HIỂN THỊ THÔNG TIN KHÁCH ĐẶT BÀN */}
                                            {(isReserved || hasReservation) && customerName && (
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
                                            {isFree && <button onClick={() => openBookingModal(table, "table")} className={styles.bookButton}><Calendar size={14} /> Đặt bàn</button>}
                                            {isReserved && <button onClick={(e) => handleCheckIn(table, "table", e)} className={styles.checkinButton}><CheckCircle size={14} /> Check-in</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "rooms" && (
                <div className={styles.contentArea}>
                    {rooms.length === 0 ? (
                        <div className={styles.emptyState}><Home size={48} /><p>Không có phòng VIP nào</p></div>
                    ) : (
                        <div className={styles.grid}>
                            {rooms.map((room) => {
                                const isOccupied = room.status === "OCCUPIED";
                                const isReserved = room.status === "RESERVED";
                                const isFree = room.status === "FREE" || room.status === "ACTIVE";
                                const hasReservation = room.hasUpcomingReservation === true;
                                const customerName = room.customerName;
                                const checkInTime = room.checkInTime;

                                return (
                                    <div key={room.id} className={`${styles.card} ${isOccupied ? styles.cardOccupied : isReserved ? styles.cardReserved : styles.cardFree}`}>
                                        <div className={styles.statusIndicator} style={{ backgroundColor: getStatusColor(room.status) }} />
                                        <div className={styles.cardContent}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.cardIcon}>{isFree ? "🏠" : isReserved ? "📅" : "🔒"}</span>
                                                {hasReservation && <span className={styles.upcomingBadge}><Clock size={10} /></span>}
                                            </div>
                                            <h3 className={styles.cardTitle}>Phòng {room.number}</h3>
                                            <div className={styles.cardStatus}><span style={{ color: getStatusColor(room.status) }}>{getStatusText(room.status)}</span></div>
                                            {room.area && <div className={styles.cardInfo}><MapPin size={12} /><span>{room.area}</span></div>}
                                            {(isReserved || hasReservation) && customerName && (
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
                                            {isFree && <button onClick={() => openBookingModal(room, "room")} className={styles.bookButton}><Calendar size={14} /> Đặt phòng</button>}
                                            {isReserved && <button onClick={(e) => handleCheckIn(room, "room", e)} className={styles.checkinButton}><CheckCircle size={14} /> Check-in</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "reservations" && (
                <div className={styles.contentArea}>
                    <div className={styles.reservationsSection}>
                        <div className={styles.sectionHeader}>
                            <h3><List size={20} /> Danh sách đặt bàn chờ xác nhận</h3>
                            <span className={styles.reservationCount}>{reservations.length} đơn</span>
                        </div>
                        {reservations.length === 0 ? (
                            <div className={styles.emptyState}><CheckCircle size={48} color="#10b981" /><p>Tất cả đặt bàn đã được xử lý</p></div>
                        ) : (
                            <div className={styles.reservationsList}>
                                {reservations.map((res) => (
                                    <div key={res.id} className={styles.reservationCard}>
                                        <div className={styles.reservationHeader}>
                                            <div className={styles.reservationCustomer}>
                                                <h4><User size={16} />{res.customerName}</h4>
                                                <span className={styles.pendingBadge}><Clock size={12} /> Chờ xác nhận</span>
                                            </div>
                                            <div className={styles.reservationActions}>
                                                <button onClick={() => confirmReservation(res.id)} className={styles.confirmButton}><Check size={14} /> Xác nhận</button>
                                                <button onClick={() => cancelReservation(res.id)} className={styles.cancelButton}><X size={14} /> Hủy</button>
                                            </div>
                                        </div>
                                        <div className={styles.reservationDetails}>
                                            <div className={styles.detailItem}><Phone size={14} /><span>{res.phone || "Không có"}</span></div>
                                            <div className={styles.detailItem}><Calendar size={14} /><span>{formatDateTime(res.checkInTime)}</span></div>
                                            <div className={styles.detailItem}>
                                                {res.tableNumber ? <><Table size={14} /><span>Bàn {res.tableNumber}</span></> : res.roomNumber ? <><Home size={14} /><span>Phòng {res.roomNumber}</span></> : <><MapPin size={14} /><span>{res.branchName}</span></>}
                                            </div>
                                            {res.remainingAmount > 0 && <div className={styles.detailItem}><span className={styles.amount}>Còn lại: {formatCurrency(res.remainingAmount)}</span></div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            {showBookingModal && selectedEntity && (
                <div className={styles.modalOverlay} onClick={() => setShowBookingModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>📅 Đặt {selectedEntity.type === "table" ? "bàn" : "phòng"} {selectedEntity.number}</h3>
                            <button onClick={() => setShowBookingModal(false)} className={styles.modalClose}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.infoBox}>
                                <div className={styles.infoItem}>
                                    <span>{selectedEntity.type === "table" ? "🍽️" : "🏠"}<strong>{selectedEntity.type === "table" ? "Bàn" : "Phòng"} {selectedEntity.number}</strong></span>
                                    {selectedEntity.capacity && <span><Users size={14} />{selectedEntity.capacity} người</span>}
                                </div>
                                {selectedEntity.area && <div className={styles.infoItem}><MapPin size={14} /><span>{selectedEntity.area}</span></div>}
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); handleSubmitBooking(); }}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label><Calendar size={14} /> Ngày đặt *</label>
                                        <input type="date" value={bookingForm.date} onChange={(e) => { setBookingForm({ ...bookingForm, date: e.target.value, time: "" }); setErrors({}); }} min={new Date().toISOString().split('T')[0]} max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} className={errors.date ? styles.inputError : styles.input} />
                                        {errors.date && <span className={styles.errorMessage}>{errors.date}</span>}
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label><Clock size={14} /> Giờ đặt *</label>
                                        <select value={bookingForm.time} onChange={(e) => { setBookingForm({ ...bookingForm, time: e.target.value }); setErrors({}); }} disabled={!bookingForm.date} className={errors.time ? styles.inputError : styles.select}>
                                            <option value="">-- Chọn giờ --</option>
                                            {getAvailableTimes().map(time => <option key={time} value={time}>{time}</option>)}
                                        </select>
                                        {errors.time && <span className={styles.errorMessage}>{errors.time}</span>}
                                    </div>
                                </div>
                                <div className={styles.formGroup}><label><User size={14} /> Họ tên khách hàng *</label><input type="text" value={bookingForm.customerName} onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })} className={errors.customerName ? styles.inputError : styles.input} placeholder="Nhập họ tên khách hàng" />{errors.customerName && <span className={styles.errorMessage}>{errors.customerName}</span>}</div>
                                <div className={styles.formGroup}><label><Phone size={14} /> Số điện thoại *</label><input type="tel" value={bookingForm.phone} onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })} className={errors.phone ? styles.inputError : styles.input} placeholder="0987 654 321" />{errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}</div>
                                <div className={styles.formGroup}><label>✉️ Email (không bắt buộc)</label><input type="email" value={bookingForm.email} onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })} className={errors.email ? styles.inputError : styles.input} placeholder="example@email.com" />{errors.email && <span className={styles.errorMessage}>{errors.email}</span>}</div>
                                <div className={styles.formGroup}><label>💰 Tiền cọc (VNĐ)</label><input type="number" min="0" step="10000" value={bookingForm.depositAmount} onChange={(e) => setBookingForm({ ...bookingForm, depositAmount: parseInt(e.target.value) || 0 })} className={errors.depositAmount ? styles.inputError : styles.input} placeholder="0" />{errors.depositAmount && <span className={styles.errorMessage}>{errors.depositAmount}</span>}</div>
                                <div className={styles.formGroup}><label>📝 Ghi chú</label><textarea value={bookingForm.note} onChange={(e) => setBookingForm({ ...bookingForm, note: e.target.value })} className={styles.textarea} rows="3" placeholder="Yêu cầu đặc biệt của khách hàng..." /></div>
                                <div className={styles.notificationInfo}><Bell size={14} /><span>Đặt bàn sẽ ở trạng thái chờ xác nhận. Hệ thống sẽ gửi thông báo cho phục vụ và bếp.</span></div>
                            </form>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowBookingModal(false)} className={styles.cancelModalButton} disabled={submitting}>Hủy bỏ</button>
                            <button onClick={handleSubmitBooking} disabled={submitting} className={styles.submitModalButton}>{submitting ? (<><div className={styles.buttonSpinner}></div>Đang xử lý...</>) : (<><Calendar size={16} /> Xác nhận đặt bàn</>)}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingPage;