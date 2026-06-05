import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Home, Users, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, PlusCircle, MapPin, Calendar } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import styles from "./TablesPage.module.css";
import { Utensils, Coffee } from "lucide-react";

const API = "http://localhost:8080";
const socket = io('http://localhost:3001');

const TablesPage = () => {
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState("Tất cả");
    const [loading, setLoading] = useState(true);
    const [showAreas, setShowAreas] = useState(true);
    const [activeTab, setActiveTab] = useState("tables");
    const [existingOrders, setExistingOrders] = useState({});
    const navigate = useNavigate();
    const [toasts, setToasts] = useState([]);
    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;

    // ==================== HELPER FUNCTIONS ====================
    const showToast = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, duration);
    };

    // Format datetime
    const formatDateTime = useCallback((dateTimeStr) => {
        if (!dateTimeStr) return "";
        const date = new Date(dateTimeStr);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    // Tính thời gian đã sử dụng (từ lúc tạo order đến hiện tại)
    const getElapsedTime = useCallback((startTime) => {
        if (!startTime) return null;
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        if (diffMs < 0) return null;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        if (diffHours > 0) {
            return `${diffHours} giờ ${diffMinutes} phút`;
        }
        if (diffMinutes > 0) {
            return `${diffMinutes} phút ${diffSeconds} giây`;
        }
        return `${diffSeconds} giây`;
    }, []);

    // Lấy thời gian bắt đầu từ order (createdAt - thời điểm tạo đơn hàng đầu tiên)
    const getTableStartTime = useCallback((entityId, type) => {
        const order = existingOrders[`${type}_${entityId}`];
        if (order) {
            return order.createdAt;
        }
        return null;
    }, [existingOrders]);

    // ==================== API FUNCTIONS (đúng thứ tự) ====================

    // 1. fetchTablesLegacy - API cũ để fallback (phải định nghĩa TRƯỚC fetchTablesWithReservations)
    const fetchTablesLegacy = useCallback(async () => {
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
            console.error("Lỗi tải bàn legacy:", err);
        }
    }, [branchId, selectedArea]);

    // 2. fetchRoomsLegacy - API cũ để fallback (phải định nghĩa TRƯỚC fetchRoomsWithReservations)
    const fetchRoomsLegacy = useCallback(async () => {
        try {
            const response = await fetch(`${API}/api/rooms/branch/${branchId}`);
            if (response.ok) {
                const data = await response.json();
                setRooms(data);
            }
        } catch (err) {
            console.error("Lỗi tải phòng legacy:", err);
        }
    }, [branchId]);

    // 3. fetchTablesWithReservations - Lấy danh sách bàn từ API /reservations/tables
    const fetchTablesWithReservations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API}/api/reservations/tables`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (selectedArea !== "Tất cả") {
                    setTables(data.filter(table => table.area === selectedArea));
                } else {
                    setTables(data);
                }
            } else {
                await fetchTablesLegacy();
            }
        } catch (err) {
            console.error("Lỗi tải bàn từ API reservations:", err);
            await fetchTablesLegacy();
        } finally {
            setLoading(false);
        }
    }, [selectedArea, fetchTablesLegacy]);

    // 4. fetchRoomsWithReservations - Lấy danh sách phòng từ API /reservations/rooms
    const fetchRoomsWithReservations = useCallback(async () => {
        try {
            // Gọi API /api/rooms/branch/{branchId} thay vì /api/reservations/rooms
            const response = await fetch(`${API}/api/rooms/branch/${branchId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("🏠 Rooms data from API:", data);
                console.log("💰 First room fee:", data[0]?.roomFee);
                setRooms(data);
            } else {
                await fetchRoomsLegacy();
            }
        } catch (err) {
            console.error("Lỗi tải phòng:", err);
            await fetchRoomsLegacy();
        }
    }, [branchId, fetchRoomsLegacy]);

    // 5. fetchAreas - Lấy danh sách khu vực
    const fetchAreas = useCallback(async () => {
        try {
            const response = await fetch(`${API}/api/tables/branch/${branchId}/areas`);
            if (response.ok) {
                const data = await response.json();
                setAreas(["Tất cả", ...data]);
            }
        } catch (err) {
            console.error("Lỗi tải khu vực:", err);
        }
    }, [branchId]);

    // 6. fetchExistingOrders - Lấy danh sách đơn hàng đang hoạt động
    const fetchExistingOrders = useCallback(async () => {
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
    }, []);

    // ==================== EFFECTS ====================

    // useEffect khởi tạo
    useEffect(() => {
        if (branchId) {
            fetchAreas();
            fetchExistingOrders();
            fetchTablesWithReservations();
            fetchRoomsWithReservations();
        }
    }, [branchId, fetchAreas, fetchExistingOrders, fetchTablesWithReservations, fetchRoomsWithReservations]);

    // Gọi API khi activeTab hoặc selectedArea thay đổi (Bàn)
    useEffect(() => {
        if (branchId && activeTab === "tables") {
            fetchTablesWithReservations();
        }
    }, [selectedArea, branchId, activeTab, fetchTablesWithReservations]);

    // Gọi API khi activeTab thay đổi (Phòng)
    useEffect(() => {
        if (branchId && activeTab === "rooms") {
            fetchRoomsWithReservations();
        }
    }, [branchId, activeTab, fetchRoomsWithReservations]);

    // Socket lắng nghe cập nhật bàn
    useEffect(() => {
        socket.on("update-tables", () => {
            console.log("🔄 Nhận tín hiệu cập nhật bàn từ server");
            if (activeTab === "tables") {
                fetchTablesWithReservations();
            } else {
                fetchRoomsWithReservations();
            }
            fetchExistingOrders();
        });

        return () => {
            socket.off("update-tables");
        };
    }, [activeTab, fetchTablesWithReservations, fetchRoomsWithReservations, fetchExistingOrders]);

    // Cập nhật thời gian realtime mỗi giây
    useEffect(() => {
        const interval = setInterval(() => {
            setExistingOrders(prev => ({ ...prev }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // ==================== HANDLERS ====================

    const handleTableClick = (table) => {
        const existingOrder = existingOrders[`table_${table.id}`];
        console.log(`🖱️ Click bàn ${table.number}, table.id=${table.id}, existingOrder:`, existingOrder);
        navigate(`/cashier/tables/${table.id}`, {
            state: { table: table, existingOrder: existingOrder || null }
        });
    };

    const handleRoomClick = (room) => {
        console.log("🏠 Room object:", room);
        console.log("💰 roomFee value:", room.roomFee);
        if (room.status === "MAINTENANCE") {
            showToast("Phòng đang bảo trì, không thể sử dụng!", "warning", 2000);
            return;
        }
        const existingOrder = existingOrders[`room_${room.id}`];
        console.log(`🖱️ Click phòng ${room.number}, order:`, existingOrder);
        navigate(`/cashier/rooms/${room.id}`, {
            state: { room: room, existingOrder: existingOrder || null }
        });
    };

    // ==================== UI HELPERS ====================

    const getStatusText = (status) => {
        if (status === "FREE") return "Trống";
        if (status === "RESERVED") return "Đã đặt";
        if (status === "OCCUPIED") return "Đã có khách";
        return status;
    };

    const getStatusColor = (status) => {
        if (status === "FREE") return "#10b981";
        if (status === "RESERVED") return "#f59e0b";
        if (status === "OCCUPIED") return "#ef4444";
        return "#6b7280";
    };

    const hasActiveOrder = (entityId, type) => {
        return !!existingOrders[`${type}_${entityId}`];
    };

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

    // ==================== RENDER ====================

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.headerTitle}>Quản lý bàn & phòng</h2>
                </div>
            </div>

            <div className={styles.tabContainer}>
                <button
                    onClick={() => {
                        setActiveTab("tables");
                        setSelectedArea("Tất cả");
                    }}
                    className={`${styles.tabButton} ${activeTab === "tables" ? styles.tabButtonActive : ""}`}
                >
                    <Table size={18} />
                    Bàn ăn ({tables.length})
                </button>
                <button
                    onClick={() => {
                        setActiveTab("rooms");
                        setSelectedArea("Tất cả");
                    }}
                    className={`${styles.tabButton} ${activeTab === "rooms" ? styles.tabButtonActive : ""}`}
                >
                    <Home size={18} />
                    Phòng VIP ({rooms.length})
                </button>
            </div>

            {activeTab === "tables" && areas.length > 0 && (
                <div className={styles.areaCard}>
                    <div className={styles.areaHeader} onClick={() => setShowAreas(!showAreas)}>
                        <span className={styles.areaTitle}>📍 Khu vực / Tầng</span>
                        {showAreas ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                    {showAreas && (
                        <div className={styles.areaContent}>
                            {areas.map(area => (
                                <button
                                    key={area}
                                    onClick={() => setSelectedArea(area)}
                                    className={`${styles.areaButton} ${selectedArea === area ? styles.areaButtonActive : ""}`}
                                >
                                    {area === "Tất cả" ? "🏠 Tất cả" : `📍 ${area}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "tables" && (
                <>
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                            <p className={styles.loadingText}>Đang tải dữ liệu...</p>
                        </div>
                    ) : tables.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyText}>Không có bàn nào trong khu vực này</p>
                        </div>
                    ) : (
                        <div className={styles.gridContainer}>
                            {tables.map((table) => {
                                const hasOrder = hasActiveOrder(table.id, 'table');
                                const orderStatus = getOrderStatusText(table.id, 'table');
                                const startTime = getTableStartTime(table.id, 'table');
                                const elapsedTime = getElapsedTime(startTime);
                                const hasReservation = table.hasUpcomingReservation === true;
                                const reservationCustomer = table.customerName;
                                const reservationTime = table.checkInTime;

                                let cardClass = styles.card;
                                if (table.status === "FREE") cardClass += ` ${styles.cardFree}`;
                                else if (table.status === "RESERVED") cardClass += ` ${styles.cardReserved}`;
                                else cardClass += ` ${styles.cardOccupied}`;

                                return (
                                    <div
                                        key={table.id}
                                        onClick={() => handleTableClick(table)}
                                        className={cardClass}
                                    >
                                        {table.status !== "FREE" && (
                                            <div className={styles.addButton}>
                                                <PlusCircle size={10} />
                                                Thêm món
                                            </div>
                                        )}

                                        <div className={styles.cardIcon}>
                                            {table.status === "FREE" ? <Utensils size={48} color="#10b981" /> :
                                                table.status === "RESERVED" ? <Calendar size={48} color="#f59e0b" /> :
                                                    <Coffee size={48} color="#ef4444" />}
                                        </div>
                                        <div className={styles.cardTitle}>Bàn {table.number}</div>

                                        <div className={styles.location}>
                                            <MapPin size={12} />
                                            <span>{table.area || "Khu vực chung"}</span>
                                        </div>

                                        {hasReservation && reservationCustomer && (
                                            <div className={styles.reservationInfo}>
                                                <div className={styles.reservationHeader}>
                                                    <Calendar size={10} />
                                                    <span>Đặt bàn bởi:</span>
                                                </div>
                                                <div className={styles.reservationCustomer}>
                                                    {reservationCustomer}
                                                </div>
                                                {reservationTime && (
                                                    <div className={styles.reservationTime}>
                                                        <Clock size={10} />
                                                        <span>{formatDateTime(reservationTime)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {hasOrder && orderStatus && (
                                            <div className={styles.orderStatus}>{orderStatus}</div>
                                        )}

                                        <div className={styles.tableStatus}>
                                            {table.status === "FREE" ? (
                                                <CheckCircle size={14} color="#10b981" />
                                            ) : table.status === "RESERVED" ? (
                                                <Clock size={14} color="#f59e0b" />
                                            ) : (
                                                <XCircle size={14} color="#ef4444" />
                                            )}
                                            <span className={styles.statusText} style={{ color: getStatusColor(table.status) }}>
                                                {getStatusText(table.status)}
                                            </span>
                                        </div>

                                        {table.status === "OCCUPIED" && (
                                            <div className={styles.timeInfo}>
                                                <Clock size={12} />
                                                {elapsedTime ? `Đã dùng: ${elapsedTime}` : 'Đang cập nhật...'}
                                            </div>
                                        )}

                                        <div className={styles.capacity}>
                                            Sức chứa: {table.capacity || 4} người
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {activeTab === "rooms" && (
                <div className={styles.gridContainer}>
                    {rooms.length === 0 ? (
                        <div className={`${styles.emptyState} ${styles.fullWidth}`}>
                            <p className={styles.emptyText}>Không có phòng nào</p>
                        </div>
                    ) : (
                        rooms.map((room) => {
                            const hasOrder = hasActiveOrder(room.id, 'room');
                            const orderStatus = getOrderStatusText(room.id, 'room');
                            const startTime = getTableStartTime(room.id, 'room');
                            const elapsedTime = getElapsedTime(startTime);
                            const hasReservation = room.hasUpcomingReservation === true;
                            const reservationCustomer = room.customerName;
                            const reservationTime = room.checkInTime;

                            let cardClass = styles.card;
                            if (room.status === "ACTIVE") {
                                cardClass += ` ${styles.cardFree}`;
                            } else if (room.status === "OCCUPIED") {
                                cardClass += ` ${styles.cardOccupied}`;
                            } else if (room.status === "MAINTENANCE") {
                                cardClass += ` ${styles.cardMaintenance}`;
                            }

                            const getRoomIcon = () => {
                                if (room.status === "ACTIVE") return "🏠";
                                if (room.status === "OCCUPIED") return "👥";
                                if (room.status === "MAINTENANCE") return "🔧";
                                return "🏠";
                            };

                            const getRoomStatusText = () => {
                                if (room.status === "ACTIVE") return "Trống";
                                if (room.status === "OCCUPIED") return "Đã có khách";
                                if (room.status === "MAINTENANCE") return "Bảo trì";
                                return room.status;
                            };

                            const getRoomStatusColor = () => {
                                if (room.status === "ACTIVE") return "#10b981";
                                if (room.status === "OCCUPIED") return "#ef4444";
                                if (room.status === "MAINTENANCE") return "#6b7280";
                                return "#6b7280";
                            };

                            const getRoomStatusIcon = () => {
                                if (room.status === "ACTIVE") return <CheckCircle size={14} color="#10b981" />;
                                if (room.status === "OCCUPIED") return <XCircle size={14} color="#ef4444" />;
                                if (room.status === "MAINTENANCE") return <XCircle size={14} color="#6b7280" />;
                                return null;
                            };

                            return (
                                <div
                                    key={room.id}
                                    onClick={() => handleRoomClick(room)}
                                    className={cardClass}
                                    style={room.status === "MAINTENANCE" ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                                >
                                    {room.status === "OCCUPIED" && (
                                        <div className={styles.addButton}>
                                            <PlusCircle size={10} />
                                            Thêm món
                                        </div>
                                    )}

                                    <div className={styles.cardIcon}>
                                        {getRoomIcon()}
                                    </div>

                                    <div className={styles.cardTitle}>Phòng {room.number}</div>

                                    <div className={styles.location}>
                                        <MapPin size={12} />
                                        <span>{room.area || "Khu vực VIP"}</span>
                                    </div>

                                    {hasReservation && reservationCustomer && (
                                        <div className={styles.reservationInfo}>
                                            <div className={styles.reservationHeader}>
                                                <Calendar size={10} />
                                                <span>Đặt phòng bởi:</span>
                                            </div>
                                            <div className={styles.reservationCustomer}>
                                                {reservationCustomer}
                                            </div>
                                            {reservationTime && (
                                                <div className={styles.reservationTime}>
                                                    <Clock size={10} />
                                                    <span>{formatDateTime(reservationTime)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {hasOrder && orderStatus && (
                                        <div className={styles.orderStatus}>{orderStatus}</div>
                                    )}

                                    <div className={styles.tableStatus}>
                                        {getRoomStatusIcon()}
                                        <span
                                            className={styles.statusText}
                                            style={{ color: getRoomStatusColor() }}
                                        >
                                            {getRoomStatusText()}
                                        </span>
                                    </div>

                                    {room.status === "OCCUPIED" && (
                                        <div className={styles.timeInfo}>
                                            <Clock size={12} />
                                            {elapsedTime ? `Đã dùng: ${elapsedTime}` : 'Đang cập nhật...'}
                                        </div>
                                    )}

                                    <div className={styles.capacity}>
                                        <Users size={12} /> Sức chứa: {room.capacity} người
                                    </div>
                                </div>
                            );
                        })
                    )}

                </div>
            )}
            <div className={styles.toastContainer}>
                {toasts.map((toast) => (
                    <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>

    );

};

export default TablesPage;