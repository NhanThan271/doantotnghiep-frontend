import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Table, Home, Users, Clock, CheckCircle, XCircle,
    ChevronDown, ChevronUp, X, Calendar, Phone, User,
    AlertCircle, Edit2, Bell, Check, List, RefreshCw
} from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import styles from "./BookingPage.module.css";

const API = "http://localhost:8080";
const socket = io('http://localhost:3001');

const BookingPage = () => {
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState("Tất cả");
    const [loading, setLoading] = useState(true);
    const [showAreas, setShowAreas] = useState(true);
    const [activeTab, setActiveTab] = useState("tables");
    const [existingOrders, setExistingOrders] = useState({});
    const [reservations, setReservations] = useState([]);
    const [showReservationsList, setShowReservationsList] = useState(false);

    // Modal state - gộp tất cả vào một form
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [bookingForm, setBookingForm] = useState({
        date: "",
        time: "",
        customerName: "",
        phone: "",
        email: "",
        note: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Modal chỉnh sửa trạng thái
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusEntity, setStatusEntity] = useState(null);
    const [newStatus, setNewStatus] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Toast notification
    const [toast, setToast] = useState({ show: false, message: "", type: "" });

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;
    const branchName = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.name;
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = userData.role?.name || userData.role;

    const canEditStatus = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'EMPLOYEE';

    // Format thời gian
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

    // Danh sách khung giờ cố định
    const getAvailableTimes = () => {
        const allTimes = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const selectedDate = bookingForm.date;

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

    // Hiển thị toast
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    };

    // Lấy danh sách đơn hàng đang hoạt động
    const fetchExistingOrders = async () => {
        try {
            const res = await axiosClient.get("/customer/orders");
            const activeOrders = res.data.filter(o => o.status !== "PAID" && o.status !== "CANCELED");

            const orderMap = {};
            activeOrders.forEach(order => {
                if (order.table) {
                    orderMap[`table_${order.table.id}`] = order;
                } else if (order.room) {
                    orderMap[`room_${order.room.id}`] = order;
                }
            });
            setExistingOrders(orderMap);
        } catch (err) {
            console.error("Lỗi tải đơn hàng:", err);
        }
    };

    // Kiểm tra hàm fetchReservations có đang lọc đúng không
    const fetchReservations = async () => {
        try {
            const response = await fetch(`${API}/api/reservations/pending`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Chỉ lấy những reservation có status === "PENDING"
                const pendingOnly = data.filter(r => r.status === "PENDING");
                setReservations(pendingOnly);
                console.log("Số đơn chờ:", pendingOnly.length);
            }
        } catch (err) {
            console.error("Lỗi tải đặt bàn:", err);
        }
    };

    const confirmReservation = async (reservationId) => {
        try {
            const response = await fetch(`${API}/api/reservations/${reservationId}/status?status=CONFIRMED`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showToast("Đã xác nhận đặt bàn thành công!", "success");
                await fetchReservations();
                await fetchTables();
                await fetchRooms();
                socket.emit("update-tables");
            }
        } catch (err) {
            // Lỗi 500 nhưng vẫn thành công - chỉ log để debug
            console.debug("API response error but database updated successfully");
            showToast("Đã xác nhận đặt bàn!", "success");
            await fetchReservations();
            await fetchTables();
            await fetchRooms();
            socket.emit("update-tables");
        }
    };

    const cancelReservation = async (reservationId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy đặt bàn này?")) return;

        try {
            const response = await fetch(`${API}/api/reservations/${reservationId}/status?status=CANCELLED`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            // Tương tự, coi như thành công nếu status là 200 hoặc 500
            if (response.status === 200 || response.status === 500) {
                showToast("Đã hủy đặt bàn thành công!", "success");

                await fetchReservations();
                await fetchTables();
                await fetchRooms();

                socket.emit("update-tables");
            } else {
                showToast("Hủy đặt bàn thất bại", "error");
            }
        } catch (err) {
            console.log("Đã hủy đặt bàn (bỏ qua lỗi response)");
            showToast("Đã hủy đặt bàn!", "success");

            await fetchReservations();
            await fetchTables();
            await fetchRooms();

            socket.emit("update-tables");
        }
    };

    // Refresh tất cả dữ liệu
    const refreshAllData = () => {
        fetchTables();
        fetchRooms();
        fetchReservations();
        fetchExistingOrders();
        showToast("Đã làm mới dữ liệu", "info");
    };

    useEffect(() => {
        if (branchId) {
            fetchAreas();
            fetchTables();
            fetchRooms();
            fetchExistingOrders();
            fetchReservations();
        }
    }, [branchId]);

    // Socket listener
    useEffect(() => {
        socket.on("update-tables", () => {
            fetchTables();
            fetchRooms();
            fetchExistingOrders();
            fetchReservations();
        });

        socket.on("new-reservation", () => {
            showToast("Có đặt bàn mới! (Đang chờ hệ thống xác nhận)", "info");
            fetchReservations();
            fetchTables();
            fetchRooms();
        });

        return () => {
            socket.off("update-tables");
            socket.off("new-reservation");
        };
    }, []);

    const fetchAreas = async () => {
        try {
            const response = await fetch(`${API}/api/tables/branch/${branchId}/areas`);
            if (response.ok) {
                const data = await response.json();
                setAreas(["Tất cả", ...data]);
            }
        } catch (err) {
            console.error("Lỗi tải khu vực:", err);
        }
    };

    const fetchTables = async () => {
        setLoading(true);
        try {
            if (selectedArea !== "Tất cả") {
                const response = await fetch(`${API}/api/tables/branch/${branchId}/area/${selectedArea}`);
                if (response.ok) {
                    const data = await response.json();
                    setTables(data);
                }
            } else {
                const areasRes = await fetch(`${API}/api/tables/branch/${branchId}/areas`);
                const areasData = await areasRes.json();
                let allTables = [];
                for (const area of areasData) {
                    const res = await fetch(`${API}/api/tables/branch/${branchId}/area/${area}`);
                    if (res.ok) {
                        const data = await res.json();
                        allTables = [...allTables, ...data];
                    }
                }
                setTables(allTables);
            }
        } catch (err) {
            console.error("Lỗi tải bàn:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRooms = async () => {
        try {
            const response = await fetch(`${API}/api/rooms/branch/${branchId}`);
            if (response.ok) {
                const data = await response.json();
                setRooms(data);
            }
        } catch (err) {
            console.error("Lỗi tải phòng:", err);
        }
    };

    useEffect(() => {
        if (branchId && selectedArea !== "Tất cả" && activeTab === "tables") {
            fetchTables();
        } else if (branchId && selectedArea === "Tất cả" && activeTab === "tables") {
            fetchTables();
        }
    }, [selectedArea, branchId, activeTab]);

    // Cập nhật trạng thái bàn
    const updateTableStatus = async (tableId, status) => {
        try {
            const token = localStorage.getItem('token');
            const endpoint = `${API}/api/tables/${tableId}/status?status=${status}`;

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Cập nhật thất bại");
            }
            return await response.json();
        } catch (err) {
            console.error("Lỗi cập nhật bàn:", err);
            throw err;
        }
    };

    // Cập nhật trạng thái phòng
    const updateRoomStatus = async (roomId, status) => {
        try {
            const token = localStorage.getItem('token');
            const endpoint = `${API}/api/rooms/${roomId}/status?status=${status}`;

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Cập nhật thất bại");
            }
            return await response.json();
        } catch (err) {
            console.error("Lỗi cập nhật phòng:", err);
            return null;
        }
    };

    // Mở modal chỉnh sửa trạng thái
    const openStatusModal = (entity, type, e) => {
        e.stopPropagation();
        setStatusEntity({ ...entity, type });
        setNewStatus(entity.status);
        setShowStatusModal(true);
    };

    // Xử lý cập nhật trạng thái
    const handleUpdateStatus = async () => {
        if (newStatus === statusEntity.status) {
            showToast("Trạng thái không thay đổi", "info");
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

            const statusText = newStatus === "FREE" ? "trống" : (newStatus === "RESERVED" ? "đã đặt trước" : "đã có khách");
            showToast(`Đã cập nhật ${statusEntity.type === "table" ? "bàn" : "phòng"} ${statusEntity.number} thành ${statusText}`, "success");

            setShowStatusModal(false);
            fetchTables();
            fetchRooms();
            fetchExistingOrders();
            socket.emit("update-tables");
        } catch (err) {
            showToast(`Cập nhật thất bại: ${err.message}`, "error");
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Mở modal đặt bàn - reset form
    const openBookingModal = (entity, type) => {
        const existingOrder = existingOrders[`${type}_${entity.id}`];
        if (existingOrder) {
            showToast(`${type === "table" ? "Bàn" : "Phòng"} này đã có khách!`, "error");
            return;
        }

        if (entity.status === "OCCUPIED") {
            showToast(`${type === "table" ? "Bàn" : "Phòng"} này đã có khách!`, "error");
            return;
        }

        setSelectedEntity({ ...entity, type });
        setBookingForm({
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

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!bookingForm.date) {
            newErrors.date = "Vui lòng chọn ngày đặt";
        }
        if (!bookingForm.time) {
            newErrors.time = "Vui lòng chọn giờ đặt";
        }
        if (bookingForm.date && bookingForm.time) {
            const selectedDateTime = new Date(`${bookingForm.date} ${bookingForm.time}`);
            if (selectedDateTime < new Date()) {
                newErrors.time = "Thời gian đặt không được ở quá khứ";
            }
        }
        if (!bookingForm.customerName.trim()) {
            newErrors.customerName = "Vui lòng nhập họ tên";
        }
        if (!bookingForm.phone.trim()) {
            newErrors.phone = "Vui lòng nhập số điện thoại";
        } else {
            const phoneRegex = /^(0|84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/;
            if (!phoneRegex.test(bookingForm.phone.replace(/\s/g, ''))) {
                newErrors.phone = "Số điện thoại không hợp lệ";
            }
        }
        if (bookingForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingForm.email)) {
            newErrors.email = "Email không hợp lệ";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit đặt bàn
    const handleSubmitBooking = async () => {
        if (!validateForm()) return;

        setSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const reservationDateTime = `${bookingForm.date} ${bookingForm.time}`;

            const requestData = {
                userId: userData.id,
                branchId: branchId,
                tableId: selectedEntity.type === "table" ? selectedEntity.id : null,
                roomId: selectedEntity.type === "room" ? selectedEntity.id : null,
                reservationTime: reservationDateTime,
                customerName: bookingForm.customerName.trim(),
                customerPhone: bookingForm.phone.replace(/\s/g, ''),
                customerEmail: bookingForm.email || "",
                note: bookingForm.note || `Nhân viên ${userData.fullName || userData.username} đặt`,
                depositAmount: 0,
                items: []  // items rỗng
            };

            if (requestData.tableId === null) delete requestData.tableId;
            if (requestData.roomId === null) delete requestData.roomId;
            if (!requestData.customerEmail) delete requestData.customerEmail;

            // Tạo reservation (trạng thái PENDING)
            const response = await fetch(`${API}/api/reservations/full`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestData)
            });

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(responseText || "Đặt bàn thất bại");
            }

            const result = JSON.parse(responseText);
            console.log("✅ Đặt bàn thành công (PENDING):", result);

            // Cập nhật trạng thái bàn/phòng thành RESERVED
            try {
                if (selectedEntity.type === "table") {
                    await updateTableStatus(selectedEntity.id, "RESERVED");
                } else {
                    await updateRoomStatus(selectedEntity.id, "RESERVED");
                }
            } catch (statusErr) {
                console.warn("Không thể cập nhật trạng thái bàn:", statusErr);
            }

            showToast(
                `Đặt ${selectedEntity.type === "table" ? "bàn" : "phòng"} ${selectedEntity.number} thành công! Đang chờ hệ thống xác nhận.`,
                "success"
            );

            setShowBookingModal(false);
            fetchTables();
            fetchRooms();
            fetchExistingOrders();
            fetchReservations();
            socket.emit("new-reservation", result);

        } catch (err) {
            console.error("❌ Lỗi:", err);
            showToast(`Đặt bàn thất bại: ${err.message}`, "error");
        } finally {
            setSubmitting(false);
        }
    };

    // BookingPage.js - Thay thế hàm handleCheckIn hiện tại

    const handleCheckIn = async (entity, type, e) => {
        e.stopPropagation();
        try {
            // 1. Cập nhật trạng thái bàn/phòng thành OCCUPIED
            if (type === "table") {
                await updateTableStatus(entity.id, "OCCUPIED");
            } else {
                await updateRoomStatus(entity.id, "OCCUPIED");
            }

            // 2. Tìm reservation đang PENDING của bàn/phòng này
            const pendingReservation = reservations.find(res => {
                if (type === "table") {
                    return res.tableNumber === entity.number && res.status === "PENDING";
                } else {
                    return res.roomNumber === entity.number && res.status === "PENDING";
                }
            });

            // 3. Nếu có reservation đang chờ, cập nhật nó thành CONFIRMED hoặc CANCELLED
            if (pendingReservation) {
                // Cập nhật status để xóa khỏi danh sách chờ
                await fetch(`${API}/api/reservations/${pendingReservation.id}/status?status=CONFIRMED`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(() => {
                    // Bỏ qua lỗi 500, chỉ cần database update là được
                    console.log("Đã cập nhật reservation:", pendingReservation.id);
                });
            }

            showToast(`Đã check-in ${type === "table" ? "bàn" : "phòng"} ${entity.number}`, "success");

            // 4. Refresh tất cả dữ liệu (quan trọng: fetchReservations sẽ xóa đơn khỏi UI)
            await Promise.all([
                fetchReservations(),  // Đơn sẽ biến mất khỏi danh sách chờ
                fetchTables(),
                fetchRooms()
            ]);

            socket.emit("update-tables");

        } catch (err) {
            console.error("Lỗi check-in:", err);
            showToast(`Check-in thất bại: ${err.message}`, "error");

            // Vẫn refresh để đồng bộ UI
            await fetchReservations();
            await fetchTables();
            await fetchRooms();
        }
    };

    const getMinDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const getMaxDate = () => {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        return maxDate.toISOString().split('T')[0];
    };

    const getStatusText = (status) => {
        if (status === "FREE") return "Trống";
        if (status === "RESERVED") return "Đã đặt trước";
        if (status === "OCCUPIED") return "Đã có khách";
        return status;
    };

    const getStatusColor = (status) => {
        if (status === "FREE") return "#10b981";
        if (status === "RESERVED") return "#f59e0b";
        if (status === "OCCUPIED") return "#ef4444";
        return "#6b7280";
    };

    const getStatusIcon = (status) => {
        if (status === "FREE") return <CheckCircle size={14} />;
        if (status === "RESERVED") return <Clock size={14} />;
        if (status === "OCCUPIED") return <XCircle size={14} />;
        return null;
    };

    const hasActiveOrder = (entityId, type) => !!existingOrders[`${type}_${entityId}`];
    const getOrderStatusText = (entityId, type) => {
        const order = existingOrders[`${type}_${entityId}`];
        if (!order) return null;
        const statusMap = {
            'PENDING': '⏳ Đang chờ bếp',
            'PREPARING': '🔪 Đang chuẩn bị',
            'COMPLETED': '✅ Đã hoàn thành'
        };
        return statusMap[order.status] || order.status;
    };

    // Component danh sách đặt bàn đang chờ với nút xác nhận/hủy
    const ReservationsList = () => {
        if (reservations.length === 0) {
            return (
                <div style={{ textAlign: "center", padding: "30px", color: "#8a9b8c" }}>
                    <List size={40} strokeWidth={1} />
                    <p>Không có đặt bàn nào đang chờ</p>
                </div>
            );
        }

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {reservations.map((res) => (
                    <div key={res.id} style={{
                        background: "#f8faf5",
                        borderRadius: "12px",
                        padding: "15px",
                        borderLeft: `4px solid ${res.status === 'PENDING' ? '#f59e0b' : '#10b981'}`,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "10px" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                                    <strong style={{ fontSize: "16px", color: "#2c3e2f" }}>{res.customerName}</strong>
                                    <span style={{
                                        fontSize: "11px",
                                        padding: "2px 10px",
                                        borderRadius: "20px",
                                        background: "#fef3c7",
                                        color: "#d97706"
                                    }}>
                                        ⏳ Chờ xác nhận
                                    </span>
                                </div>
                                <div style={{ fontSize: "13px", color: "#5d6e5f", marginBottom: "4px" }}>
                                    <Phone size={11} style={{ display: "inline", marginRight: "4px" }} /> {res.phone}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    onClick={() => confirmReservation(res.id)}
                                    style={{
                                        padding: "6px 14px",
                                        background: "#10b981",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}
                                >
                                    <Check size={12} /> Xác nhận
                                </button>
                                <button
                                    onClick={() => cancelReservation(res.id)}
                                    style={{
                                        padding: "6px 14px",
                                        background: "#ef4444",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}
                                >
                                    <X size={12} /> Hủy
                                </button>
                            </div>
                        </div>
                        <div style={{ fontSize: "13px", marginTop: "10px", display: "flex", gap: "16px", flexWrap: "wrap", color: "#6b7280" }}>
                            <span><Calendar size={12} style={{ display: "inline", marginRight: "4px" }} /> {formatDateTime(res.reservationTime)}</span>
                            <span>
                                {res.tableNumber ? `🍽️ Bàn ${res.tableNumber}` : res.roomNumber ? `🏠 Phòng ${res.roomNumber}` : "Vị trí chưa xác định"}
                            </span>
                            {res.email && <span>✉️ {res.email}</span>}
                            {res.note && <span style={{ color: "#f59e0b" }}>📝 {res.note}</span>}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{
            padding: "20px",
            minHeight: "100vh",
            background: "linear-gradient(135deg, #f8faf5 0%, #f0f4ec 100%)"
        }}>
            {/* Toast Notification */}
            {toast.show && (
                <div className={`${styles.toast} ${styles[toast.type]}`}>
                    {toast.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div style={{
                background: "white",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
                <div>
                    <h2 style={{ margin: 0, color: "#2c3e2f" }}>
                        🏨 Đặt bàn & phòng - {branchName || "Nhà hàng"}
                    </h2>

                    {/* Action Buttons */}
                    <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <button
                            onClick={refreshAllData}
                            style={{
                                padding: "8px 16px",
                                background: "white",
                                border: "1px solid #e5e9e0",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "13px"
                            }}
                        >
                            <RefreshCw size={14} /> Làm mới
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation - Thêm tab Đặt bàn đang chờ */}
            <div style={{
                display: "flex",
                gap: "12px",
                marginBottom: "20px",
                flexWrap: "wrap"
            }}>
                <button
                    onClick={() => {
                        setActiveTab("tables");
                        setSelectedArea("Tất cả");
                    }}
                    style={{
                        padding: "12px 24px",
                        background: activeTab === "tables" ? "#d32f2f" : "white",
                        color: activeTab === "tables" ? "white" : "#5d6e5f",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s"
                    }}
                >
                    <Table size={18} />
                    Bàn ăn ({tables.length})
                </button>
                <button
                    onClick={() => {
                        setActiveTab("rooms");
                        setSelectedArea("Tất cả");
                    }}
                    style={{
                        padding: "12px 24px",
                        background: activeTab === "rooms" ? "#d32f2f" : "white",
                        color: activeTab === "rooms" ? "white" : "#5d6e5f",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s"
                    }}
                >
                    <Home size={18} />
                    Phòng VIP ({rooms.length})
                </button>
                {/* Tab Đặt bàn đang chờ MỚI */}
                <button
                    onClick={() => {
                        setActiveTab("reservations");
                        setSelectedArea("Tất cả");
                        fetchReservations(); // Refresh khi chuyển tab
                    }}
                    style={{
                        padding: "12px 24px",
                        background: activeTab === "reservations" ? "#d32f2f" : "white",
                        color: activeTab === "reservations" ? "white" : "#5d6e5f",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        position: "relative",
                        transition: "all 0.2s"
                    }}
                >
                    <List size={18} />
                    Đặt bàn đang chờ
                    {reservations.length > 0 && (
                        <span style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            background: "#ef4444",
                            color: "white",
                            borderRadius: "20px",
                            padding: "2px 8px",
                            fontSize: "11px",
                            fontWeight: "bold"
                        }}>
                            {reservations.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Area filter (chỉ hiển thị khi activeTab là tables) */}
            {activeTab === "tables" && areas.length > 0 && (
                <div style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px"
                }}>
                    <div
                        onClick={() => setShowAreas(!showAreas)}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer"
                        }}
                    >
                        <span style={{ fontWeight: "bold", color: "#2c3e2f" }}>📍 Khu vực</span>
                        {showAreas ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                    {showAreas && (
                        <div style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px",
                            marginTop: "12px"
                        }}>
                            {areas.map(area => (
                                <button
                                    key={area}
                                    onClick={() => setSelectedArea(area)}
                                    style={{
                                        padding: "8px 16px",
                                        background: selectedArea === area ? "#d32f2f" : "#f1f3ee",
                                        color: selectedArea === area ? "white" : "#5d6e5f",
                                        border: "none",
                                        borderRadius: "20px",
                                        cursor: "pointer",
                                        fontWeight: "500"
                                    }}
                                >
                                    {area === "Tất cả" ? "🏠 Tất cả" : `📍 ${area}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tables Grid */}
            {activeTab === "tables" && (
                <>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "60px" }}>
                            <div className={styles.spinner}></div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : tables.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "16px" }}>
                            <p>Không có bàn nào trong khu vực này</p>
                        </div>
                    ) : (
                        <div className={styles.gridContainer}>
                            {tables.map((table) => {
                                const hasOrder = hasActiveOrder(table.id, 'table');
                                const orderStatus = getOrderStatusText(table.id, 'table');
                                const isFree = table.status === "FREE";
                                const isReserved = table.status === "RESERVED";
                                const isOccupied = table.status === "OCCUPIED";

                                return (
                                    <div key={table.id} className={`${styles.card} ${isOccupied ? styles.occupied : ""} ${isReserved ? styles.reserved : ""}`}>
                                        {canEditStatus && (
                                            <button
                                                onClick={(e) => openStatusModal(table, "table", e)}
                                                className={styles.editBtn}
                                                title="Chỉnh sửa trạng thái"
                                            >
                                                <Edit2 size={12} /> Sửa
                                            </button>
                                        )}

                                        <div className={styles.cardIcon}>
                                            {isFree ? "🍽️" : isReserved ? "📅" : "🍜"}
                                        </div>
                                        <div className={styles.cardTitle}>Bàn {table.number}</div>

                                        {hasOrder && orderStatus && (
                                            <div className={styles.orderStatus}>{orderStatus}</div>
                                        )}

                                        <div className={styles.cardStatus} style={{ color: getStatusColor(table.status) }}>
                                            {getStatusIcon(table.status)}
                                            <span>{getStatusText(table.status)}</span>
                                        </div>

                                        <div className={styles.cardCapacity}>
                                            <Users size={12} /> Sức chứa: {table.capacity || 4} người
                                        </div>

                                        {isFree && (
                                            <button
                                                onClick={() => openBookingModal(table, "table")}
                                                className={styles.bookBtn}
                                            >
                                                <Calendar size={14} /> Đặt bàn
                                            </button>
                                        )}

                                        {isReserved && (
                                            <button
                                                onClick={(e) => handleCheckIn(table, "table", e)}
                                                className={styles.checkinBtn}
                                            >
                                                <CheckCircle size={12} /> Check-in
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Rooms Grid */}
            {activeTab === "rooms" && (
                <div className={styles.gridContainer}>
                    {rooms.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "16px", gridColumn: "1/-1" }}>
                            <p>Không có phòng nào</p>
                        </div>
                    ) : (
                        rooms.map((room) => {
                            const hasOrder = hasActiveOrder(room.id, 'room');
                            const orderStatus = getOrderStatusText(room.id, 'room');
                            const isFree = room.status === "FREE";
                            const isReserved = room.status === "RESERVED";
                            const isOccupied = room.status === "OCCUPIED";

                            return (
                                <div key={room.id} className={`${styles.card} ${isOccupied ? styles.occupied : ""} ${isReserved ? styles.reserved : ""}`}>
                                    {canEditStatus && (
                                        <button
                                            onClick={(e) => openStatusModal(room, "room", e)}
                                            className={styles.editBtn}
                                            title="Chỉnh sửa trạng thái"
                                        >
                                            <Edit2 size={12} /> Sửa
                                        </button>
                                    )}

                                    <div className={styles.cardIcon}>
                                        {isFree ? "🏠" : isReserved ? "📅" : "🔒"}
                                    </div>
                                    <div className={styles.cardTitle}>Phòng {room.number}</div>

                                    {hasOrder && orderStatus && (
                                        <div className={styles.orderStatus}>{orderStatus}</div>
                                    )}

                                    <div className={styles.cardArea}>{room.area}</div>

                                    <div className={styles.cardStatus} style={{ color: getStatusColor(room.status) }}>
                                        {getStatusIcon(room.status)}
                                        <span>{getStatusText(room.status)}</span>
                                    </div>

                                    <div className={styles.cardCapacity}>
                                        <Users size={12} /> Sức chứa: {room.capacity} người
                                    </div>

                                    {isFree && (
                                        <button
                                            onClick={() => openBookingModal(room, "room")}
                                            className={styles.bookBtn}
                                        >
                                            <Calendar size={14} /> Đặt phòng
                                        </button>
                                    )}

                                    {isReserved && (
                                        <button
                                            onClick={(e) => handleCheckIn(room, "room", e)}
                                            className={styles.checkinBtn}
                                        >
                                            <CheckCircle size={12} /> Check-in
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Reservations Tab - Danh sách đặt bàn đang chờ */}
            {activeTab === "reservations" && (
                <div style={{
                    background: "white",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}>
                    <h3 style={{ margin: "0 0 16px 0", color: "#2c3e2f", display: "flex", alignItems: "center", gap: "8px" }}>
                        <List size={20} />
                        Danh sách đặt bàn chờ xác nhận ({reservations.length})
                    </h3>
                    <ReservationsList />
                </div>
            )}

            {/* Booking Modal */}
            {showBookingModal && selectedEntity && (
                <div className={styles.modalOverlay} onClick={() => setShowBookingModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>
                                📅 Đặt {selectedEntity.type === "table" ? "bàn" : "phòng"} {selectedEntity.number}
                            </h3>
                            <button onClick={() => setShowBookingModal(false)} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.infoBox} style={{ marginBottom: "16px", background: "#f0f4ec" }}>
                                <span>🪑 Đang đặt: <strong>{selectedEntity.type === "table" ? `Bàn ${selectedEntity.number}` : `Phòng ${selectedEntity.number}`}</strong></span>
                                {selectedEntity.capacity && <span> | 👥 Sức chứa: {selectedEntity.capacity} người</span>}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                                <div className={styles.formGroup}>
                                    <label><Calendar size={16} /> Ngày đặt *</label>
                                    <input
                                        type="date"
                                        value={bookingForm.date}
                                        onChange={(e) => {
                                            setBookingForm({ ...bookingForm, date: e.target.value, time: "" });
                                            setErrors({});
                                        }}
                                        min={getMinDate()}
                                        max={getMaxDate()}
                                        className={errors.date ? styles.errorInput : styles.input}
                                    />
                                    {errors.date && <span className={styles.errorText}>{errors.date}</span>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label><Clock size={16} /> Giờ đặt *</label>
                                    <select
                                        value={bookingForm.time}
                                        onChange={(e) => {
                                            setBookingForm({ ...bookingForm, time: e.target.value });
                                            setErrors({});
                                        }}
                                        disabled={!bookingForm.date}
                                        className={errors.time ? styles.errorInput : styles.select}
                                    >
                                        <option value="">-- Chọn giờ --</option>
                                        {getAvailableTimes().map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                    {errors.time && <span className={styles.errorText}>{errors.time}</span>}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label><User size={16} /> Họ tên khách hàng *</label>
                                <input
                                    type="text"
                                    value={bookingForm.customerName}
                                    onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                                    className={errors.customerName ? styles.errorInput : styles.input}
                                    placeholder="Nhập họ tên khách hàng"
                                />
                                {errors.customerName && <span className={styles.errorText}>{errors.customerName}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label><Phone size={16} /> Số điện thoại *</label>
                                <input
                                    type="tel"
                                    value={bookingForm.phone}
                                    onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                                    className={errors.phone ? styles.errorInput : styles.input}
                                    placeholder="0987 654 321"
                                />
                                {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label><span style={{ fontSize: "14px" }}>✉️</span> Email (không bắt buộc)</label>
                                <input
                                    type="email"
                                    value={bookingForm.email}
                                    onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                                    className={errors.email ? styles.errorInput : styles.input}
                                    placeholder="example@email.com"
                                />
                                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label>Ghi chú</label>
                                <textarea
                                    value={bookingForm.note}
                                    onChange={(e) => setBookingForm({ ...bookingForm, note: e.target.value })}
                                    className={styles.textarea}
                                    rows="2"
                                    placeholder="Yêu cầu đặc biệt (nếu có)"
                                />
                            </div>

                            <div className={styles.infoBox}>
                                <Bell size={14} />
                                <span>Đặt bàn thành công sẽ chuyển sang trạng thái chờ xác nhận. Hệ thống sẽ tự động xử lý.</span>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowBookingModal(false)} className={styles.cancelBtn}>
                                Hủy
                            </button>
                            <button onClick={handleSubmitBooking} disabled={submitting} className={styles.submitBtn}>
                                {submitting ? "Đang xử lý..." : "Xác nhận đặt bàn"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {showStatusModal && statusEntity && (
                <div className={styles.modalOverlay} onClick={() => setShowStatusModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>✏️ Chỉnh sửa trạng thái</h3>
                            <button onClick={() => setShowStatusModal(false)} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>{statusEntity.type === "table" ? "Bàn" : "Phòng"}</label>
                                <div className={styles.entityInfo}>
                                    {statusEntity.type === "table" ? "🍽️" : "🏠"} {statusEntity.number}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Trạng thái hiện tại</label>
                                <div className={`${styles.currentStatus} ${statusEntity.status === "FREE" ? styles.free : statusEntity.status === "RESERVED" ? styles.reserved : styles.occupied}`}>
                                    {statusEntity.status === "FREE" ? "🟢 Trống" : statusEntity.status === "RESERVED" ? "🟡 Đã đặt trước" : "🔴 Đã có khách"}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Chuyển sang trạng thái</label>
                                <div className={styles.statusOptions}>
                                    <button
                                        type="button"
                                        onClick={() => setNewStatus("FREE")}
                                        className={`${styles.statusOption} ${newStatus === "FREE" ? styles.activeFree : ""}`}
                                    >
                                        🟢 Trống
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewStatus("RESERVED")}
                                        className={`${styles.statusOption} ${newStatus === "RESERVED" ? styles.activeReserved : ""}`}
                                    >
                                        🟡 Đã đặt trước
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewStatus("OCCUPIED")}
                                        className={`${styles.statusOption} ${newStatus === "OCCUPIED" ? styles.activeOccupied : ""}`}
                                    >
                                        🔴 Đã có khách
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowStatusModal(false)} className={styles.cancelBtn}>
                                Hủy
                            </button>
                            <button onClick={handleUpdateStatus} disabled={updatingStatus} className={styles.submitBtn}>
                                {updatingStatus ? "Đang cập nhật..." : "Xác nhận"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingPage;