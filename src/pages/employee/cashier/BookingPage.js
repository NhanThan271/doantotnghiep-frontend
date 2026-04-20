import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Table, Home, Users, Clock, CheckCircle, XCircle,
    ChevronDown, ChevronUp, X, Calendar, Phone, User,
    AlertCircle, Edit2, Bell, Check
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

    // Các step cho đặt bàn
    const [bookingStep, setBookingStep] = useState(1);
    const [tempBookingData, setTempBookingData] = useState({
        date: "",
        time: "",
        tableId: null,
        roomId: null,
        selectedType: null,
        selectedNumber: null
    });

    // Modal state
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [bookingData, setBookingData] = useState({
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

    // Danh sách khung giờ cố định
    const getAvailableTimes = () => {
        const allTimes = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const selectedDate = tempBookingData.date;

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

    // Lấy danh sách đặt bàn
    const fetchReservations = async () => {
        try {
            const response = await fetch(`${API}/api/reservations/pending`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setReservations(data);
            }
        } catch (err) {
            console.error("Lỗi tải đặt bàn:", err);
        }
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
            showToast("Có đặt bàn mới!", "info");
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

    // Cập nhật trạng thái bàn - Dùng API /status mới
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

    // Cập nhật trạng thái phòng (nếu có API tương tự)
    const updateRoomStatus = async (roomId, status) => {
        try {
            const token = localStorage.getItem('token');
            // Nếu có API cho room thì dùng, nếu không thì comment lại
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
            // Nếu chưa có API cho room, bỏ qua lỗi
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

    // Mở modal đặt bàn
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
        setBookingStep(1);
        setTempBookingData({
            date: "",
            time: "",
            tableId: type === "table" ? entity.id : null,
            roomId: type === "room" ? entity.id : null,
            selectedType: type,
            selectedNumber: entity.number
        });
        setBookingData({
            customerName: userData.fullName || userData.username || "",
            phone: userData.phone || "",
            email: userData.email || "",
            note: ""
        });
        setErrors({});
        setShowBookingModal(true);
    };

    // Next step
    const nextStep = () => {
        if (bookingStep === 1) {
            if (!tempBookingData.date) {
                setErrors({ date: "Vui lòng chọn ngày đặt" });
                return;
            }
            if (!tempBookingData.time) {
                setErrors({ time: "Vui lòng chọn giờ đặt" });
                return;
            }
            // Kiểm tra thời gian không được ở quá khứ
            const selectedDateTime = new Date(`${tempBookingData.date} ${tempBookingData.time}`);
            if (selectedDateTime < new Date()) {
                setErrors({ time: "Thời gian đặt không được ở quá khứ" });
                return;
            }
            setErrors({});
            setBookingStep(2);
        } else if (bookingStep === 2) {
            setBookingStep(3);
        }
    };

    // Previous step
    const prevStep = () => {
        setBookingStep(bookingStep - 1);
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!bookingData.customerName.trim()) {
            newErrors.customerName = "Vui lòng nhập họ tên";
        }
        if (!bookingData.phone.trim()) {
            newErrors.phone = "Vui lòng nhập số điện thoại";
        } else {
            const phoneRegex = /^(0|84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/;
            if (!phoneRegex.test(bookingData.phone.replace(/\s/g, ''))) {
                newErrors.phone = "Số điện thoại không hợp lệ";
            }
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
            const reservationDateTime = `${tempBookingData.date} ${tempBookingData.time}`;

            const requestData = {
                userId: userData.id,
                branchId: branchId,
                tableId: selectedEntity.type === "table" ? selectedEntity.id : null,
                roomId: selectedEntity.type === "room" ? selectedEntity.id : null,
                reservationTime: reservationDateTime,
                customerName: bookingData.customerName.trim(),
                customerPhone: bookingData.phone.replace(/\s/g, ''),
                customerEmail: bookingData.email || "",
                note: bookingData.note || `Nhân viên ${userData.fullName || userData.username} đặt`,
                depositAmount: 0,
                items: []
            };

            if (requestData.tableId === null) delete requestData.tableId;
            if (requestData.roomId === null) delete requestData.roomId;
            if (!requestData.customerEmail) delete requestData.customerEmail;

            console.log("📤 Nhân viên đặt bàn:", requestData);

            // 1. Tạo reservation
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
            console.log("✅ Đặt bàn thành công:", result);

            // 2. Cập nhật trạng thái bàn/phòng thành RESERVED
            try {
                if (selectedEntity.type === "table") {
                    await updateTableStatus(selectedEntity.id, "RESERVED");
                } else {
                    await updateRoomStatus(selectedEntity.id, "RESERVED");
                }
            } catch (statusErr) {
                console.warn("Không thể cập nhật trạng thái bàn:", statusErr);
                // Không throw lỗi, vẫn coi như đặt bàn thành công
            }

            showToast(`Đặt ${selectedEntity.type === "table" ? "bàn" : "phòng"} ${selectedEntity.number} thành công!`, "success");

            setShowBookingModal(false);
            fetchTables();
            fetchRooms();
            fetchExistingOrders();
            fetchReservations();
            socket.emit("new-reservation", result);
            socket.emit("update-tables");

        } catch (err) {
            console.error("❌ Lỗi:", err);
            showToast(`Đặt bàn thất bại: ${err.message}`, "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Check-in: chuyển từ RESERVED sang OCCUPIED
    const handleCheckIn = async (entity, type, e) => {
        e.stopPropagation();
        try {
            if (type === "table") {
                await updateTableStatus(entity.id, "OCCUPIED");
            } else {
                await updateRoomStatus(entity.id, "OCCUPIED");
            }
            showToast(`Đã check-in ${type === "table" ? "bàn" : "phòng"} ${entity.number}`, "success");
            fetchTables();
            fetchRooms();
            socket.emit("update-tables");
        } catch (err) {
            showToast(`Check-in thất bại: ${err.message}`, "error");
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

    // Hàm hiển thị trạng thái với 3 màu
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
                    <p style={{ margin: "8px 0 0", color: "#8a9b8c", fontSize: "14px" }}>
                        Nhân viên: {userData.fullName || userData.username} |
                        Chọn bàn/phòng và nhấn "Đặt bàn" để đặt chỗ cho khách
                        {canEditStatus && " | Có thể chỉnh sửa trạng thái bàn/phòng"}
                    </p>
                </div>
            </div>

            {/* Tab buttons */}
            <div style={{
                display: "flex",
                gap: "12px",
                marginBottom: "20px"
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
                        gap: "8px"
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
                        gap: "8px"
                    }}
                >
                    <Home size={18} />
                    Phòng VIP ({rooms.length})
                </button>
            </div>

            {/* Area filter */}
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
                            {/* Step 1: Chọn ngày và giờ */}
                            {bookingStep === 1 && (
                                <div>
                                    <div className={styles.formGroup}>
                                        <label><Calendar size={16} /> Chọn ngày *</label>
                                        <input
                                            type="date"
                                            value={tempBookingData.date}
                                            onChange={(e) => {
                                                setTempBookingData({ ...tempBookingData, date: e.target.value, time: "" });
                                                setErrors({});
                                            }}
                                            min={getMinDate()}
                                            max={getMaxDate()}
                                            className={errors.date ? styles.errorInput : styles.input}
                                        />
                                        {errors.date && <span className={styles.errorText}>{errors.date}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label><Clock size={16} /> Chọn giờ *</label>
                                        <select
                                            value={tempBookingData.time}
                                            onChange={(e) => {
                                                setTempBookingData({ ...tempBookingData, time: e.target.value });
                                                setErrors({});
                                            }}
                                            disabled={!tempBookingData.date}
                                            className={errors.time ? styles.errorInput : styles.select}
                                        >
                                            <option value="">-- Chọn giờ --</option>
                                            {getAvailableTimes().map(time => (
                                                <option key={time} value={time}>{time}</option>
                                            ))}
                                        </select>
                                        {errors.time && <span className={styles.errorText}>{errors.time}</span>}
                                        {tempBookingData.date === new Date().toISOString().split('T')[0] && (
                                            <p className={styles.dateWarning}>⏰ Chỉ hiển thị giờ trong tương lai</p>
                                        )}
                                    </div>

                                    <div className={styles.infoBox}>
                                        <Bell size={14} />
                                        <span>Đặt bàn thành công, bàn sẽ được chuyển sang trạng thái "Đã đặt trước"</span>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Thông tin khách hàng */}
                            {bookingStep === 2 && (
                                <div>
                                    <div className={styles.formGroup}>
                                        <label><User size={16} /> Họ tên khách hàng *</label>
                                        <input
                                            type="text"
                                            value={bookingData.customerName}
                                            onChange={(e) => setBookingData({ ...bookingData, customerName: e.target.value })}
                                            className={errors.customerName ? styles.errorInput : styles.input}
                                            placeholder="Nhập họ tên khách hàng"
                                        />
                                        {errors.customerName && <span className={styles.errorText}>{errors.customerName}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label><Phone size={16} /> Số điện thoại *</label>
                                        <input
                                            type="tel"
                                            value={bookingData.phone}
                                            onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                                            className={errors.phone ? styles.errorInput : styles.input}
                                            placeholder="0987 654 321"
                                        />
                                        {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Email (không bắt buộc)</label>
                                        <input
                                            type="email"
                                            value={bookingData.email}
                                            onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                                            className={styles.input}
                                            placeholder="example@email.com"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Ghi chú (không bắt buộc)</label>
                                        <textarea
                                            value={bookingData.note}
                                            onChange={(e) => setBookingData({ ...bookingData, note: e.target.value })}
                                            className={styles.textarea}
                                            rows="3"
                                            placeholder="Yêu cầu đặc biệt (nếu có)"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Xác nhận */}
                            {bookingStep === 3 && (
                                <div>
                                    <div className={styles.confirmInfo}>
                                        <div className={styles.confirmItem}>
                                            <span className={styles.confirmIcon}>📍</span>
                                            <div>
                                                <strong>Chi nhánh</strong>
                                                <p>{branchName || "Nhà hàng"}</p>
                                            </div>
                                        </div>

                                        <div className={styles.confirmItem}>
                                            <span className={styles.confirmIcon}>📅</span>
                                            <div>
                                                <strong>Thời gian</strong>
                                                <p>{tempBookingData.date} - {tempBookingData.time}</p>
                                            </div>
                                        </div>

                                        <div className={styles.confirmItem}>
                                            <span className={styles.confirmIcon}>🪑</span>
                                            <div>
                                                <strong>{selectedEntity.type === "table" ? "Bàn" : "Phòng"}</strong>
                                                <p>{selectedEntity.type === "table" ? `Bàn ${selectedEntity.number}` : `Phòng ${selectedEntity.number}`}</p>
                                            </div>
                                        </div>

                                        <div className={styles.confirmItem}>
                                            <span className={styles.confirmIcon}>👤</span>
                                            <div>
                                                <strong>Khách hàng</strong>
                                                <p>{bookingData.customerName}</p>
                                                <p className={styles.confirmSub}>{bookingData.phone}</p>
                                                {bookingData.email && <p className={styles.confirmSub}>{bookingData.email}</p>}
                                            </div>
                                        </div>

                                        {bookingData.note && (
                                            <div className={styles.confirmItem}>
                                                <span className={styles.confirmIcon}>📝</span>
                                                <div>
                                                    <strong>Ghi chú</strong>
                                                    <p>{bookingData.note}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.modalFooter}>
                            {bookingStep > 1 && (
                                <button onClick={prevStep} className={styles.backBtn}>
                                    ← Quay lại
                                </button>
                            )}
                            {bookingStep < 3 ? (
                                <button onClick={nextStep} className={styles.submitBtn}>
                                    Tiếp tục →
                                </button>
                            ) : (
                                <button onClick={handleSubmitBooking} disabled={submitting} className={styles.submitBtn}>
                                    {submitting ? "Đang xử lý..." : "Xác nhận đặt bàn"}
                                </button>
                            )}
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