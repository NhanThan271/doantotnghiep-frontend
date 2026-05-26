import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    X, Calendar, Phone, AlertCircle, Check, List,
    Edit2, Check as CheckIcon, X as XIcon, LogIn
} from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import styles from "./BookingPage.module.css";

const API = "http://localhost:8080";
const socket = io('http://localhost:3001');

const BookingPage = () => {
    const navigate = useNavigate();

    const [reservations, setReservations] = useState([]);
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState("");
    const [selectedType, setSelectedType] = useState("table");
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingTables, setLoadingTables] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [tableError, setTableError] = useState("");
    const [roomError, setRoomError] = useState("");

    const [bookingData, setBookingData] = useState({
        date: "",
        time: "",
        customerName: "",
        phone: "",
        email: "",
        note: ""
    });

    const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
    const [updatingReservation, setUpdatingReservation] = useState(null);
    const [newReservationStatus, setNewReservationStatus] = useState("");
    const [updatingReservationStatus, setUpdatingReservationStatus] = useState(false);

    const [toast, setToast] = useState({ show: false, message: "", type: "" });

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;
    const branchName = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.name;
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = userData.role?.name || userData.role;
    const canEditStatus = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'EMPLOYEE';

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return "";
        const date = new Date(dateTimeStr);
        return date.toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    };

    const fetchAreas = async () => {
        try {
            const response = await fetch(`${API}/api/tables/branch/${branchId}/areas`);
            if (response.ok) {
                const data = await response.json();
                setAreas(data);
                if (data.length > 0) setSelectedArea(data[0]);
            }
        } catch (err) {
            console.error("Lỗi tải khu vực:", err);
        }
    };

    const fetchTablesByArea = async (area) => {
        if (!area) return;
        setLoadingTables(true);
        setTableError("");
        try {
            const response = await fetch(`${API}/api/tables/branch/${branchId}/area/${encodeURIComponent(area)}`);
            if (response.ok) {
                let tablesData = await response.json();
                if (tablesData.data) tablesData = tablesData.data;
                if (!Array.isArray(tablesData)) tablesData = [];
                setTables(tablesData);
            } else {
                setTableError(`Lỗi tải bàn: ${response.status}`);
            }
        } catch (err) {
            console.error("Lỗi tải bàn:", err);
            setTableError("Không thể tải danh sách bàn");
        } finally {
            setLoadingTables(false);
        }
    };

    const fetchRooms = async () => {
        setLoadingRooms(true);
        setRoomError("");
        try {
            const response = await fetch(`${API}/api/rooms/branch/${branchId}`);
            if (response.ok) {
                let roomsData = await response.json();
                if (roomsData.data) roomsData = roomsData.data;
                if (!Array.isArray(roomsData)) roomsData = [];
                setRooms(roomsData);
            } else {
                setRoomError(`Lỗi tải phòng: ${response.status}`);
            }
        } catch (err) {
            console.error("Lỗi tải phòng:", err);
            setRoomError("Không thể tải danh sách phòng");
        } finally {
            setLoadingRooms(false);
        }
    };

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API}/api/reservations/pending`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setReservations(data);
            }
        } catch (err) {
            console.error("Lỗi tải đặt bàn:", err);
        } finally {
            setLoading(false);
        }
    };

    const updateReservationStatus = async (reservationId, status) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/reservations/${reservationId}/status?status=${status}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error("Cập nhật thất bại");
            return await response.json();
        } catch (err) {
            console.error("Lỗi cập nhật đặt bàn:", err);
            throw err;
        }
    };

    const updateTableStatus = async (tableId, status) => {
        try {
            const token = localStorage.getItem('token');
            const endpoint = `${API}/api/tables/${tableId}/status?status=${status}`;
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error("Cập nhật thất bại");
            return await response.json();
        } catch (err) {
            console.error("Lỗi cập nhật bàn:", err);
            throw err;
        }
    };

    const updateRoomStatus = async (roomId, status) => {
        try {
            const token = localStorage.getItem('token');
            const endpoint = `${API}/api/rooms/${roomId}/status?status=${status}`;
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error("Cập nhật thất bại");
            return await response.json();
        } catch (err) {
            console.error("Lỗi cập nhật phòng:", err);
            throw err;
        }
    };

    // Sửa lại hàm handleCheckIn trong frontend BookingPage.js
    const handleCheckIn = async (reservation, e) => {
        e.stopPropagation();

        if (!window.confirm(`Xác nhận check-in cho khách hàng ${reservation.customerName}?`)) {
            return;
        }

        try {
            // Chỉ cập nhật trạng thái bàn/phòng thành OCCUPIED
            if (reservation.tableNumber) {
                // Tìm tableId từ số bàn
                let table = tables.find(t => t.number === reservation.tableNumber);

                // Nếu không tìm thấy trong state, gọi API lấy danh sách bàn
                if (!table) {
                    const tablesRes = await fetch(`${API}/api/tables/branch/${branchId}`);
                    let allTables = await tablesRes.json();
                    if (allTables.data) allTables = allTables.data;
                    table = allTables.find(t => t.number === reservation.tableNumber);
                }

                if (table) {
                    await updateTableStatus(table.id, "OCCUPIED");
                    console.log(`Đã cập nhật bàn ${table.number} thành OCCUPIED`);
                } else {
                    console.warn("Không tìm thấy bàn:", reservation.tableNumber);
                }
            } else if (reservation.roomNumber) {
                let room = rooms.find(r => r.number === reservation.roomNumber);

                if (!room) {
                    const roomsRes = await fetch(`${API}/api/rooms/branch/${branchId}`);
                    let allRooms = await roomsRes.json();
                    if (allRooms.data) allRooms = allRooms.data;
                    room = allRooms.find(r => r.number === reservation.roomNumber);
                }

                if (room) {
                    await updateRoomStatus(room.id, "OCCUPIED");
                }
            }

            // Xóa reservation khỏi danh sách hiển thị (vì đã check-in)
            setReservations(prev => prev.filter(r => r.id !== reservation.id));

            showToast(`Check-in thành công cho ${reservation.customerName}`, "success");

            // Refresh dữ liệu
            fetchReservations();
            if (selectedArea) fetchTablesByArea(selectedArea);
            fetchRooms();
            socket.emit("update-tables");

        } catch (err) {
            console.error("Lỗi check-in:", err);
            showToast(`Check-in thất bại: ${err.message}`, "error");
        }
    };
    useEffect(() => {
        if (branchId) {
            fetchAreas();
            fetchRooms();
            fetchReservations();
        }
    }, [branchId]);

    useEffect(() => {
        if (selectedArea && selectedType === 'table') {
            fetchTablesByArea(selectedArea);
        }
    }, [selectedArea, selectedType]);

    useEffect(() => {
        if (selectedType === 'room') {
            fetchRooms();
        }
    }, [selectedType]);

    useEffect(() => {
        socket.on("update-tables", () => {
            fetchReservations();
            if (selectedArea) fetchTablesByArea(selectedArea);
            fetchRooms();
        });
        socket.on("new-reservation", () => {
            showToast("Có đặt bàn mới!", "info");
            fetchReservations();
            if (selectedArea) fetchTablesByArea(selectedArea);
            fetchRooms();
        });
        return () => {
            socket.off("update-tables");
            socket.off("new-reservation");
        };
    }, [selectedArea]);

    const getAvailableTimes = () => {
        const allTimes = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const selectedDate = bookingData.date;

        if (!selectedDate || selectedDate !== new Date().toISOString().split('T')[0]) {
            return allTimes;
        }
        return allTimes.filter(time => {
            const [hour, minute] = time.split(':').map(Number);
            if (hour > currentHour) return true;
            if (hour === currentHour && minute > currentMinute) return true;
            return false;
        });
    };

    const getMinDate = () => new Date().toISOString().split('T')[0];
    const getMaxDate = () => {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        return maxDate.toISOString().split('T')[0];
    };

    const validateForm = () => {
        const newErrors = {};
        if (!bookingData.date) newErrors.date = "Vui lòng chọn ngày đặt";
        if (!bookingData.time) newErrors.time = "Vui lòng chọn giờ đặt";
        if (bookingData.date && bookingData.time) {
            const selectedDateTime = new Date(`${bookingData.date} ${bookingData.time}`);
            if (selectedDateTime < new Date()) {
                newErrors.time = "Thời gian đặt không được ở quá khứ";
            }
        }
        if (!bookingData.customerName.trim()) newErrors.customerName = "Vui lòng nhập họ tên";
        if (!bookingData.phone.trim()) {
            newErrors.phone = "Vui lòng nhập số điện thoại";
        } else {
            const phoneRegex = /^(0|84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/;
            if (!phoneRegex.test(bookingData.phone.replace(/\s/g, ''))) {
                newErrors.phone = "Số điện thoại không hợp lệ";
            }
        }
        if (bookingData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.email)) {
            newErrors.email = "Email không hợp lệ";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openBookingModal = () => {
        setSelectedEntity(null);
        setSelectedType("table");
        setBookingData({
            date: "",
            time: "",
            customerName: userData.fullName || userData.username || "",
            phone: userData.phone || "",
            email: userData.email || "",
            note: ""
        });
        setErrors({});
        setShowBookingModal(true);
    };

    const handleSubmitBooking = async () => {
        if (!validateForm()) return;
        if (!selectedEntity) {
            showToast("Vui lòng chọn bàn hoặc phòng", "error");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const reservationDateTime = `${bookingData.date} ${bookingData.time}`;

            const requestData = {
                userId: userData.id,
                branchId: branchId,
                tableId: selectedType === "table" ? selectedEntity.id : null,
                roomId: selectedType === "room" ? selectedEntity.id : null,
                reservationTime: reservationDateTime,
                customerName: bookingData.customerName.trim(),
                customerPhone: bookingData.phone.replace(/\s/g, ''),
                customerEmail: bookingData.email || "",
                note: bookingData.note || `Nhân viên ${userData.fullName || userData.username} đặt`,
                depositAmount: 0,
                items: []
            };
            if (!requestData.customerEmail) delete requestData.customerEmail;
            if (requestData.tableId === null) delete requestData.tableId;
            if (requestData.roomId === null) delete requestData.roomId;

            const response = await fetch(`${API}/api/reservations/full`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(requestData)
            });

            const responseText = await response.text();
            if (!response.ok) throw new Error(responseText || "Đặt bàn thất bại");

            if (selectedType === "table") {
                await updateTableStatus(selectedEntity.id, "RESERVED");
            } else {
                await updateRoomStatus(selectedEntity.id, "RESERVED");
            }

            showToast(`Đặt ${selectedType === "table" ? "bàn" : "phòng"} ${selectedEntity.number} thành công!`, "success");
            setShowBookingModal(false);
            fetchReservations();
            if (selectedArea) fetchTablesByArea(selectedArea);
            fetchRooms();
            socket.emit("new-reservation");

        } catch (err) {
            console.error("❌ Lỗi:", err);
            showToast(`Đặt thất bại: ${err.message}`, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const openUpdateStatusModal = (reservation, e) => {
        e.stopPropagation();
        setUpdatingReservation(reservation);
        setNewReservationStatus(reservation.status);
        setShowUpdateStatusModal(true);
    };

    const handleUpdateReservationStatus = async () => {
        if (newReservationStatus === updatingReservation.status) {
            showToast("Trạng thái không thay đổi", "info");
            setShowUpdateStatusModal(false);
            return;
        }

        setUpdatingReservationStatus(true);
        try {
            await updateReservationStatus(updatingReservation.id, newReservationStatus);
            const statusText = newReservationStatus === 'CONFIRMED' ? 'đã xác nhận' : 'đã hủy';
            showToast(`Đã ${statusText} đặt bàn của ${updatingReservation.customerName}`, "success");
            setShowUpdateStatusModal(false);
            fetchReservations();
            if (selectedArea) fetchTablesByArea(selectedArea);
            fetchRooms();
        } catch (err) {
            showToast(`Cập nhật thất bại: ${err.message}`, "error");
        } finally {
            setUpdatingReservationStatus(false);
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'FREE': return { text: 'Trống', color: '#10b981', bg: '#d1fae5' };
            case 'RESERVED': return { text: 'Đã đặt', color: '#f59e0b', bg: '#fef3c7' };
            case 'OCCUPIED': return { text: 'Có khách', color: '#ef4444', bg: '#fee2e2' };
            default: return { text: status, color: '#8a9b8c', bg: '#f1f3ee' };
        }
    };

    const TablesList = () => {
        if (loadingTables) {
            return (
                <div style={{ textAlign: "center", padding: "40px", color: "#8a9b8c" }}>
                    <div className={styles.spinner}></div>
                    <p>Đang tải danh sách bàn...</p>
                </div>
            );
        }

        if (tableError) {
            return (
                <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>
                    <AlertCircle size={40} />
                    <p>{tableError}</p>
                </div>
            );
        }

        if (tables.length === 0) {
            return (
                <div style={{ textAlign: "center", padding: "40px", color: "#8a9b8c" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍽️</div>
                    <p>Không có bàn nào trong khu vực này</p>
                </div>
            );
        }

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {tables.map(table => {
                    const statusInfo = getStatusInfo(table.status);
                    const isFree = table.status === 'FREE';
                    const isSelected = selectedEntity?.id === table.id;

                    return (
                        <div
                            key={table.id}
                            onClick={() => isFree && setSelectedEntity(table)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px",
                                background: isSelected ? "#d32f2f" : "white",
                                color: isSelected ? "white" : "#5d6e5f",
                                border: isSelected ? "2px solid #d32f2f" : "1px solid #e5e9e0",
                                borderRadius: "12px",
                                cursor: isFree ? "pointer" : "not-allowed",
                                opacity: isFree ? 1 : 0.6,
                                transition: "all 0.3s"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ fontSize: "32px" }}>🍽️</div>
                                <div style={{ textAlign: "left" }}>
                                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>Bàn {table.number}</div>
                                    <div style={{ fontSize: "12px" }}>{table.capacity} người</div>
                                    {table.area && <div style={{ fontSize: "11px", marginTop: "2px" }}>📍 {table.area}</div>}
                                </div>
                            </div>
                            <div style={{
                                fontSize: "12px",
                                padding: "4px 12px",
                                borderRadius: "20px",
                                background: isSelected ? "rgba(255,255,255,0.2)" : statusInfo.bg,
                                color: isSelected ? "white" : statusInfo.color
                            }}>
                                {statusInfo.text}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const RoomsList = () => {
        if (loadingRooms) {
            return (
                <div style={{ textAlign: "center", padding: "40px", color: "#8a9b8c" }}>
                    <div className={styles.spinner}></div>
                    <p>Đang tải danh sách phòng...</p>
                </div>
            );
        }

        if (roomError) {
            return (
                <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>
                    <AlertCircle size={40} />
                    <p>{roomError}</p>
                    <button
                        onClick={() => fetchRooms()}
                        style={{ marginTop: "12px", padding: "8px 16px", background: "#d32f2f", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
                    >
                        Thử lại
                    </button>
                </div>
            );
        }

        if (rooms.length === 0) {
            return (
                <div style={{ textAlign: "center", padding: "40px", color: "#8a9b8c" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏠</div>
                    <p>Không có phòng VIP nào</p>
                </div>
            );
        }

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {rooms.map(room => {
                    const statusInfo = getStatusInfo(room.status);
                    const isFree = room.status === 'FREE';
                    const isSelected = selectedEntity?.id === room.id;

                    return (
                        <div
                            key={room.id}
                            onClick={() => isFree && setSelectedEntity(room)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px",
                                background: isSelected ? "#d32f2f" : "white",
                                color: isSelected ? "white" : "#5d6e5f",
                                border: isSelected ? "2px solid #d32f2f" : "1px solid #e5e9e0",
                                borderRadius: "12px",
                                cursor: isFree ? "pointer" : "not-allowed",
                                opacity: isFree ? 1 : 0.6,
                                transition: "all 0.3s"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ fontSize: "32px" }}>🏠</div>
                                <div style={{ textAlign: "left" }}>
                                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>Phòng {room.number}</div>
                                    <div style={{ fontSize: "12px" }}>{room.capacity} người</div>
                                    {room.area && <div style={{ fontSize: "11px", marginTop: "2px" }}>📍 {room.area}</div>}
                                </div>
                            </div>
                            <div style={{
                                fontSize: "12px",
                                padding: "4px 12px",
                                borderRadius: "20px",
                                background: isSelected ? "rgba(255,255,255,0.2)" : statusInfo.bg,
                                color: isSelected ? "white" : statusInfo.color
                            }}>
                                {statusInfo.text}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const ReservationsList = () => {
        if (loading) {
            return (
                <div style={{ textAlign: "center", padding: "40px", color: "#8a9b8c" }}>
                    <div className={styles.spinner}></div>
                    <p>Đang tải...</p>
                </div>
            );
        }
        if (reservations.length === 0) {
            return (
                <div style={{ textAlign: "center", padding: "40px", color: "#8a9b8c" }}>
                    <List size={40} strokeWidth={1} />
                    <p>Chưa có đặt bàn nào</p>
                </div>
            );
        }
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {reservations.map((res) => (
                    <div key={res.id}
                        onClick={() => setSelectedReservation(res)}
                        style={{
                            background: "white",
                            borderRadius: "12px",
                            padding: "16px",
                            borderLeft: `4px solid ${res.status === 'PENDING' ? '#f59e0b' : '#10b981'}`,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            cursor: "pointer"
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                            <div>
                                <h4 style={{ margin: 0, color: "#2c3e2f", fontSize: "16px" }}>
                                    {res.customerName}
                                </h4>
                                <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>⏳ Chờ</div>
                            </div>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <div style={{ fontSize: "11px", color: "#8a9b8c", background: "#f1f3ee", padding: "4px 8px", borderRadius: "8px" }}>
                                    #{res.id}
                                </div>
                                {/* Nút Check-in */}
                                <button
                                    onClick={(e) => handleCheckIn(res, e)}
                                    style={{
                                        background: "#10b981",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        color: "white",
                                        fontSize: "11px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}
                                    title="Check-in"
                                >
                                    <LogIn size={12} /> Check-in
                                </button>
                                {/* Nút sửa trạng thái */}
                                {canEditStatus && res.status === 'PENDING' && (
                                    <button
                                        onClick={(e) => openUpdateStatusModal(res, e)}
                                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#3b82f6" }}
                                        title="Sửa trạng thái"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "#5d6e5f" }}>
                            <span><Phone size={14} /> {res.phone}</span>
                            <span><Calendar size={14} /> {formatDateTime(res.reservationTime)}</span>
                            <span>{res.tableNumber ? `🍽️ Bàn ${res.tableNumber}` : `🏠 Phòng ${res.roomNumber}`}</span>
                        </div>
                        {res.email && <div style={{ fontSize: "12px", color: "#8a9b8c", marginTop: "8px" }}>✉️ {res.email}</div>}
                    </div>
                ))}
            </div>
        );
    };

    const ReservationDetailModal = () => {
        if (!selectedReservation) return null;
        return (
            <div className={styles.modalOverlay} onClick={() => setSelectedReservation(null)}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
                    <div className={styles.modalHeader}>
                        <h3>📋 Chi tiết đặt bàn</h3>
                        <button onClick={() => setSelectedReservation(null)} className={styles.closeBtn}><X size={20} /></button>
                    </div>
                    <div className={styles.modalBody}>
                        <div><strong>Mã:</strong> #{selectedReservation.id}</div>
                        <div><strong>Khách hàng:</strong> {selectedReservation.customerName}</div>
                        <div><strong>SĐT:</strong> {selectedReservation.phone}</div>
                        {selectedReservation.email && <div><strong>Email:</strong> {selectedReservation.email}</div>}
                        <div><strong>Thời gian:</strong> {formatDateTime(selectedReservation.reservationTime)}</div>
                        <div><strong>Địa điểm:</strong> {selectedReservation.tableNumber ? `Bàn ${selectedReservation.tableNumber}` : `Phòng ${selectedReservation.roomNumber}`}</div>
                        <div><strong>Trạng thái:</strong> ⏳ Chờ xác nhận</div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button
                            className={styles.submitBtn}
                            onClick={(e) => handleCheckIn(selectedReservation, e)}
                            style={{ background: "#10b981" }}
                        >
                            <LogIn size={14} /> Check-in
                        </button>
                        {canEditStatus && selectedReservation.status === 'PENDING' && (
                            <button
                                className={styles.submitBtn}
                                onClick={() => {
                                    setSelectedReservation(null);
                                    openUpdateStatusModal(selectedReservation, { stopPropagation: () => { } });
                                }}
                            >
                                <Edit2 size={14} /> Sửa trạng thái
                            </button>
                        )}
                        <button onClick={() => setSelectedReservation(null)} className={styles.cancelBtn}>Đóng</button>
                    </div>
                </div>
            </div>
        );
    };

    const UpdateStatusModal = () => {
        if (!showUpdateStatusModal || !updatingReservation) return null;
        return (
            <div className={styles.modalOverlay} onClick={() => setShowUpdateStatusModal(false)}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
                    <div className={styles.modalHeader}>
                        <h3>✏️ Cập nhật trạng thái đặt bàn</h3>
                        <button onClick={() => setShowUpdateStatusModal(false)} className={styles.closeBtn}><X size={20} /></button>
                    </div>
                    <div className={styles.modalBody}>
                        <div style={{ marginBottom: "16px", padding: "12px", background: "#f8faf5", borderRadius: "8px" }}>
                            <div><strong>Khách hàng:</strong> {updatingReservation.customerName}</div>
                            <div><strong>SĐT:</strong> {updatingReservation.phone}</div>
                            <div><strong>Thời gian:</strong> {formatDateTime(updatingReservation.reservationTime)}</div>
                            <div><strong>Bàn:</strong> {updatingReservation.tableNumber || updatingReservation.roomNumber}</div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Chọn trạng thái mới</label>
                            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                                <button
                                    onClick={() => setNewReservationStatus("CONFIRMED")}
                                    style={{
                                        flex: 1,
                                        padding: "10px",
                                        background: newReservationStatus === "CONFIRMED" ? "#10b981" : "#f1f3ee",
                                        color: newReservationStatus === "CONFIRMED" ? "white" : "#5d6e5f",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "6px"
                                    }}
                                >
                                    <CheckIcon size={16} /> Xác nhận
                                </button>
                                <button
                                    onClick={() => setNewReservationStatus("CANCELLED")}
                                    style={{
                                        flex: 1,
                                        padding: "10px",
                                        background: newReservationStatus === "CANCELLED" ? "#ef4444" : "#f1f3ee",
                                        color: newReservationStatus === "CANCELLED" ? "white" : "#5d6e5f",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "6px"
                                    }}
                                >
                                    <XIcon size={16} /> Hủy đặt bàn
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button onClick={() => setShowUpdateStatusModal(false)} className={styles.cancelBtn}>Hủy</button>
                        <button onClick={handleUpdateReservationStatus} disabled={updatingReservationStatus} className={styles.submitBtn}>
                            {updatingReservationStatus ? "Đang cập nhật..." : "Xác nhận"}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.bookingPage}>
            {toast.show && (
                <div className={`${styles.toast} ${styles[toast.type]}`}>
                    {toast.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
                    <span>{toast.message}</span>
                </div>
            )}

            <div className={styles.header}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <h2>🏨 Đặt bàn & phòng - {branchName || "Nhà hàng"}</h2>
                        <p>Nhân viên: {userData.fullName || userData.username}</p>
                    </div>
                    <button
                        onClick={openBookingModal}
                        style={{
                            padding: "10px 24px",
                            background: "#d32f2f",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "14px",
                            fontWeight: "bold"
                        }}
                    >
                        <Calendar size={16} />
                        Đặt bàn mới
                    </button>
                </div>
            </div>

            <div className={styles.recentReservations}>
                <div className={styles.recentTitle}>📋 Danh sách đặt bàn ({reservations.length})</div>
                <ReservationsList />
            </div>

            {/* Modal đặt bàn 3 cột */}
            {showBookingModal && (
                <div className={styles.modalOverlay} onClick={() => setShowBookingModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1100px", maxHeight: "90vh", overflowY: "auto" }}>
                        <div className={styles.modalHeader}>
                            <h3>📅 Đặt bàn / phòng mới</h3>
                            <button onClick={() => setShowBookingModal(false)} className={styles.closeBtn}><X size={20} /></button>
                        </div>

                        <div className={styles.modalBody}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
                                {/* Cột 1 - Thông tin đặt bàn */}
                                <div>
                                    <h4 style={{ marginBottom: "16px", color: "#2c3e2f" }}>Thông tin đặt bàn</h4>

                                    <div className={styles.formGroup}>
                                        <label>Loại *</label>
                                        <div style={{ display: "flex", gap: "12px" }}>
                                            <button
                                                onClick={() => {
                                                    setSelectedType("table");
                                                    setSelectedEntity(null);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: "10px",
                                                    background: selectedType === "table" ? "#d32f2f" : "#f1f3ee",
                                                    color: selectedType === "table" ? "white" : "#5d6e5f",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                🍽️ Bàn ăn
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedType("room");
                                                    setSelectedEntity(null);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: "10px",
                                                    background: selectedType === "room" ? "#d32f2f" : "#f1f3ee",
                                                    color: selectedType === "room" ? "white" : "#5d6e5f",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                🏠 Phòng VIP
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Họ và tên *</label>
                                        <input type="text" placeholder="Nguyễn Văn A"
                                            value={bookingData.customerName}
                                            onChange={e => setBookingData({ ...bookingData, customerName: e.target.value })} />
                                        {errors.customerName && <span className={styles.errMsg}>{errors.customerName}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Số điện thoại *</label>
                                        <input type="tel" placeholder="0912 345 678"
                                            value={bookingData.phone}
                                            onChange={e => setBookingData({ ...bookingData, phone: e.target.value })} />
                                        {errors.phone && <span className={styles.errMsg}>{errors.phone}</span>}
                                    </div>

                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label>Ngày</label>
                                            <input type="date" value={bookingData.date} min={getMinDate()} max={getMaxDate()}
                                                onChange={e => setBookingData({ ...bookingData, date: e.target.value, time: "" })} />
                                            {errors.date && <span className={styles.errMsg}>{errors.date}</span>}
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Giờ</label>
                                            <select value={bookingData.time} onChange={e => setBookingData({ ...bookingData, time: e.target.value })} disabled={!bookingData.date}>
                                                <option value="">--:--</option>
                                                {getAvailableTimes().map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            {errors.time && <span className={styles.errMsg}>{errors.time}</span>}
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Email</label>
                                        <input type="email" placeholder="example@email.com"
                                            value={bookingData.email}
                                            onChange={e => setBookingData({ ...bookingData, email: e.target.value })} />
                                        {errors.email && <span className={styles.errMsg}>{errors.email}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Ghi chú</label>
                                        <textarea rows="3" placeholder="Yêu cầu đặc biệt..."
                                            value={bookingData.note}
                                            onChange={e => setBookingData({ ...bookingData, note: e.target.value })} />
                                    </div>
                                </div>

                                {/* Cột 2 - Sơ đồ bàn/phòng */}
                                <div>
                                    <h4 style={{ marginBottom: "16px", color: "#2c3e2f" }}>
                                        {selectedType === "table" ? "Sơ đồ bàn" : "Danh sách phòng VIP"}
                                    </h4>

                                    {selectedType === "table" && areas.length > 0 && (
                                        <div className={styles.formGroup}>
                                            <label>Khu vực</label>
                                            <select
                                                value={selectedArea}
                                                onChange={(e) => setSelectedArea(e.target.value)}
                                                style={{
                                                    width: "100%",
                                                    padding: "10px",
                                                    border: "1px solid #e5e9e0",
                                                    borderRadius: "8px",
                                                    marginBottom: "16px",
                                                    background: "white"
                                                }}
                                            >
                                                {areas.map(area => (
                                                    <option key={area} value={area}>{area}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div style={{ maxHeight: "450px", overflowY: "auto" }}>
                                        {selectedType === "table" ? <TablesList /> : <RoomsList />}
                                    </div>
                                </div>

                                {/* Cột 3 - Xác nhận */}
                                <div>
                                    <h4 style={{ marginBottom: "16px", color: "#2c3e2f" }}>Xác nhận đặt bàn</h4>
                                    <div className={styles.bookingSummary}>
                                        <div className={styles.summaryItem}>
                                            <span>👤 Khách hàng:</span>
                                            <span>{bookingData.customerName || "Chưa nhập"}</span>
                                        </div>
                                        <div className={styles.summaryItem}>
                                            <span>📞 SĐT:</span>
                                            <span>{bookingData.phone || "Chưa nhập"}</span>
                                        </div>
                                        <div className={styles.summaryItem}>
                                            <span>📅 Ngày giờ:</span>
                                            <span>{bookingData.date && bookingData.time ? `${bookingData.date} ${bookingData.time}` : "Chưa chọn"}</span>
                                        </div>
                                        <div className={styles.summaryItem}>
                                            <span>🪑 {selectedType === "table" ? "Bàn" : "Phòng"}:</span>
                                            <span>{selectedEntity ? `${selectedType === "table" ? "Bàn" : "Phòng"} ${selectedEntity.number} (${selectedEntity.capacity} người)` : "Chưa chọn"}</span>
                                        </div>
                                        {bookingData.note && (
                                            <div className={styles.summaryItem}>
                                                <span>📝 Ghi chú:</span>
                                                <span>{bookingData.note}</span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        className={styles.confirmBtnRight}
                                        disabled={!bookingData.customerName || !bookingData.phone || !bookingData.date || !bookingData.time || !selectedEntity || submitting}
                                        onClick={handleSubmitBooking}
                                        style={{ marginTop: "20px", width: "100%" }}
                                    >
                                        {submitting ? "Đang xử lý..." : "Xác nhận đặt →"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <UpdateStatusModal />
            <ReservationDetailModal />
        </div>
    );
};

export default BookingPage;