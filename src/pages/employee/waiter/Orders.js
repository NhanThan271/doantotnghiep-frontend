import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ClipboardList, Clock, CheckCircle, XCircle,
    MapPin, Users, Table, Home, PlusCircle, Calendar,
    ChefHat, Timer, AlertCircle, Utensils, Coffee
} from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import { showToast } from "../../../hooks/useToast";
import io from 'socket.io-client';
import styles from "./Orders.module.css";

const socket = io('/', {
    path: '/socket.io/',
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
});

const Orders = () => {
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("tables");
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState("Tất cả");
    const [showAreas, setShowAreas] = useState(true);
    const [existingOrders, setExistingOrders] = useState({});
    const [error, setError] = useState(null);
    const [toasts, setToasts] = useState([]);

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;

    // ========== HELPER FUNCTIONS ==========
    const showToastMessage = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, duration);
    };

    const getElapsedTime = useCallback((startTime) => {
        if (!startTime) return null;
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        if (diffMs < 0) return null;

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        if (diffHours > 0) return `${diffHours} giờ ${diffMinutes} phút`;
        if (diffMinutes > 0) return `${diffMinutes} phút ${diffSeconds} giây`;
        return `${diffSeconds} giây`;
    }, []);

    const getStartTime = useCallback((entityId, type) => {
        const order = existingOrders[`${type}_${entityId}`];
        return order?.createdAt || null;
    }, [existingOrders]);

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return "";
        const date = new Date(dateTimeStr);
        return date.toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    // ========== API CALLS (đã sửa hết sang axiosClient) ==========

    // 1. fetchTablesLegacy - API cũ để fallback
    const fetchTablesLegacy = useCallback(async () => {
        try {
            if (selectedArea !== "Tất cả") {
                const response = await axiosClient.get(`/tables/branch/${branchId}/area/${selectedArea}`);
                setTables(response.data);
            } else {
                const areasRes = await axiosClient.get(`/tables/branch/${branchId}/areas`);
                let allTables = [];
                for (const area of areasRes.data) {
                    const res = await axiosClient.get(`/tables/branch/${branchId}/area/${area}`);
                    allTables = [...allTables, ...res.data];
                }
                setTables(allTables);
            }
        } catch (err) {
            console.error("Lỗi tải bàn legacy:", err);
        }
    }, [branchId, selectedArea]);

    // 2. fetchRoomsLegacy - API cũ để fallback
    const fetchRoomsLegacy = useCallback(async () => {
        try {
            const response = await axiosClient.get(`/rooms/branch/${branchId}`);
            setRooms(response.data);
        } catch (err) {
            console.error("Lỗi tải phòng legacy:", err);
        }
    }, [branchId]);

    // 3. fetchTablesWithReservations
    const fetchTablesWithReservations = useCallback(async () => {
        setLoading(true);
        try {
            const [tablesRes, reservationsRes] = await Promise.all([
                axiosClient.get(`/tables/branch/${branchId}`),
                axiosClient.get(`/reservations/tables`).catch(() => ({ data: [] }))
            ]);

            const reservationMap = {};
            reservationsRes.data.forEach(t => {
                reservationMap[t.id] = t;
            });

            let data = tablesRes.data.map(table => ({
                ...table,
                ...(reservationMap[table.id] ? {
                    hasUpcomingReservation: true,
                    customerName: reservationMap[table.id].customerName,
                    checkInTime: reservationMap[table.id].checkInTime,
                } : {})
            }));

            if (selectedArea !== "Tất cả") {
                data = data.filter(table => table.area === selectedArea);
            }

            data.sort((a, b) => {
                const areaCompare = (a.area || "").localeCompare(b.area || "");
                if (areaCompare !== 0) return areaCompare;
                return (a.number || 0) - (b.number || 0);
            });

            setTables(data);
        } catch (err) {
            console.error("Lỗi tải bàn:", err);
            await fetchTablesLegacy();
        } finally {
            setLoading(false);
        }
    }, [branchId, selectedArea, fetchTablesLegacy]);

    // 4. fetchRoomsWithReservations
    const fetchRoomsWithReservations = useCallback(async () => {
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
                    hasUpcomingReservation: true,
                    customerName: reservationMap[room.id].customerName,
                    checkInTime: reservationMap[room.id].checkInTime,
                } : {})
            }));

            data.sort((a, b) => {
                const numA = parseInt(String(a.number).replace(/\D/g, '')) || 0;
                const numB = parseInt(String(b.number).replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            setRooms(data);
        } catch (err) {
            console.error("Lỗi tải phòng:", err);
            await fetchRoomsLegacy();
        }
    }, [branchId, fetchRoomsLegacy]);

    // 5. fetchAreas
    const fetchAreas = useCallback(async () => {
        try {
            const response = await axiosClient.get(`/tables/branch/${branchId}/areas`);
            setAreas(["Tất cả", ...response.data]);
        } catch (err) {
            console.error("Lỗi tải khu vực:", err);
        }
    }, [branchId]);

    // 6. fetchExistingOrders
    const fetchExistingOrders = useCallback(async () => {
        try {
            const response = await axiosClient.get('/customer/orders');
            const data = response.data;
            const branchOrders = data.filter(o => o.branch?.id === branchId);
            const activeOrders = branchOrders.filter(o => o.status !== "PAID" && o.status !== "CANCELED");

            const orderMap = {};
            activeOrders.forEach(order => {
                if (order.table) orderMap[`table_${order.table.id}`] = order;
                else if (order.room) orderMap[`room_${order.room.id}`] = order;
            });
            setExistingOrders(orderMap);
        } catch (err) {
            console.error("Lỗi tải đơn hàng:", err);
        }
    }, [branchId]);

    // ========== EFFECTS ==========
    useEffect(() => {
        if (!branchId) {
            setError("Không tìm thấy thông tin chi nhánh. Vui lòng đăng nhập lại.");
            return;
        }
        fetchAreas();
        fetchExistingOrders();
        fetchTablesWithReservations();
        fetchRoomsWithReservations();
    }, [branchId, fetchAreas, fetchExistingOrders, fetchTablesWithReservations, fetchRoomsWithReservations]);

    useEffect(() => {
        if (branchId && activeTab === "tables") fetchTablesWithReservations();
    }, [selectedArea, branchId, activeTab, fetchTablesWithReservations]);

    useEffect(() => {
        if (branchId && activeTab === "rooms") fetchRoomsWithReservations();
    }, [branchId, activeTab, fetchRoomsWithReservations]);

    // Socket lắng nghe cập nhật
    useEffect(() => {
        socket.on("update-tables", () => {
            console.log("🔄 Nhận tín hiệu cập nhật từ server");
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

    useEffect(() => {
        const interval = setInterval(() => setExistingOrders(prev => ({ ...prev })), 1000);
        return () => clearInterval(interval);
    }, []);

    // ========== HANDLERS ==========
    const handleTableClick = (table) => {
        const existingOrder = existingOrders[`table_${table.id}`];
        navigate(`/waiter/orders/${table.id}`, {
            state: {
                table: table,
                existingOrder: existingOrder || null
            }
        });
    };

    const handleRoomClick = (room) => {
        if (room.status === "MAINTENANCE") {
            showToastMessage("Phòng đang bảo trì, không thể sử dụng!", "warning", 2000);
            return;
        }
        const existingOrder = existingOrders[`room_${room.id}`];
        navigate(`/waiter/orders/${room.id}`, {
            state: {
                room: room,
                existingOrder: existingOrder || null
            }
        });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSelectedArea("Tất cả");
    };

    // ========== STATUS HELPERS ==========
    const getStatusColor = (status, type = 'table') => {
        if (type === 'room') {
            const colors = { ACTIVE: "#10b981", OCCUPIED: "#ef4444", MAINTENANCE: "#6b7280", RESERVED: "#f59e0b" };
            return colors[status] || "#6b7280";
        }
        const colors = { FREE: "#10b981", RESERVED: "#f59e0b", OCCUPIED: "#ef4444" };
        return colors[status] || "#6b7280";
    };

    const getStatusText = (status, type = 'table') => {
        if (type === 'room') {
            const texts = { ACTIVE: "Trống", OCCUPIED: "Đã có khách", MAINTENANCE: "Bảo trì", RESERVED: "Đã đặt" };
            return texts[status] || status;
        }
        const texts = { FREE: "Trống", RESERVED: "Đã đặt", OCCUPIED: "Đã có khách" };
        return texts[status] || status;
    };

    const getStatusIcon = (status, type = 'table') => {
        if (type === 'room') {
            switch (status) {
                case "ACTIVE": return <CheckCircle size={14} color="#10b981" />;
                case "OCCUPIED": return <XCircle size={14} color="#ef4444" />;
                case "MAINTENANCE": return <XCircle size={14} color="#6b7280" />;
                case "RESERVED": return <Clock size={14} color="#f59e0b" />;
                default: return null;
            }
        }
        switch (status) {
            case "FREE": return <CheckCircle size={14} color="#10b981" />;
            case "RESERVED": return <Clock size={14} color="#f59e0b" />;
            case "OCCUPIED": return <XCircle size={14} color="#ef4444" />;
            default: return null;
        }
    };

    const getOrderStatusText = (entityId, type) => {
        const order = existingOrders[`${type}_${entityId}`];
        if (!order) return null;
        const statusMap = {
            'PENDING': '⏳ Đang chờ bếp',
            'PREPARING': '🔪 Đang chuẩn bị',
            'COMPLETED': '✅ Đã hoàn thành',
            'SERVED': '🍽️ Đã phục vụ'
        };
        return statusMap[order.status] || order.status;
    };

    const getOrderStatusColor = (entityId, type) => {
        const order = existingOrders[`${type}_${entityId}`];
        if (!order) return null;
        const colors = {
            'PENDING': '#f59e0b',
            'PREPARING': '#3b82f6',
            'COMPLETED': '#10b981',
            'SERVED': '#8b5cf6'
        };
        return colors[order.status] || '#6b7280';
    };

    // ========== RENDER ==========
    if (error) {
        return (
            <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
                    <h3 style={{ color: "#ef4444", marginBottom: 8 }}>Lỗi</h3>
                    <p style={{ color: "#6b7280", marginBottom: 20 }}>{error}</p>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Toast Container */}
            <div className={styles.toastContainer}>
                {toasts.map((toast) => (
                    <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className={styles.header}>
                <h2 className={styles.headerTitle}>
                    <ClipboardList size={24} /> Quản lý bàn & phòng
                </h2>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabContainer}>
                <button onClick={() => handleTabChange("tables")} className={`${styles.tabButton} ${activeTab === "tables" ? styles.tabButtonActive : ""}`}>
                    <Table size={18} /> Bàn ăn ({tables.length})
                </button>
                <button onClick={() => handleTabChange("rooms")} className={`${styles.tabButton} ${activeTab === "rooms" ? styles.tabButtonActive : ""}`}>
                    <Home size={18} /> Phòng VIP ({rooms.length})
                </button>
            </div>

            {/* Area Filter */}
            {activeTab === "tables" && areas.length > 0 && (
                <div className={styles.areaCard}>
                    <div className={styles.areaHeader} onClick={() => setShowAreas(!showAreas)}>
                        <span className={styles.areaTitle}>📍 Khu vực / Tầng</span>
                        <span style={{ transform: showAreas ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
                    </div>
                    {showAreas && (
                        <div className={styles.areaContent}>
                            {areas.map(area => (
                                <button key={area} onClick={() => setSelectedArea(area)} className={`${styles.areaButton} ${selectedArea === area ? styles.areaButtonActive : ""}`}>
                                    {area === "Tất cả" ? "🏠 Tất cả" : `📍 ${area}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Content - Tables */}
            {activeTab === "tables" ? (
                loading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p className={styles.loadingText}>Đang tải dữ liệu...</p>
                    </div>
                ) : tables.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Utensils size={48} color="#cbd5e1" />
                        <p className={styles.emptyText}>Không có bàn nào trong khu vực này</p>
                    </div>
                ) : (
                    <div className={styles.gridContainer}>
                        {tables.map(table => {
                            const hasOrder = !!existingOrders[`table_${table.id}`];
                            const orderStatus = getOrderStatusText(table.id, 'table');
                            const orderColor = getOrderStatusColor(table.id, 'table');
                            const startTime = getStartTime(table.id, 'table');
                            const elapsedTime = getElapsedTime(startTime);
                            const hasReservation = table.hasUpcomingReservation === true;
                            const reservationCustomer = table.customerName;
                            const reservationTime = table.checkInTime;
                            const isOccupied = table.status === "OCCUPIED";
                            const isReserved = table.status === "RESERVED";
                            const isFree = table.status === "FREE";

                            let cardClass = styles.card;
                            if (isFree) cardClass += ` ${styles.cardFree}`;
                            else if (isReserved) cardClass += ` ${styles.cardReserved}`;
                            else cardClass += ` ${styles.cardOccupied}`;

                            return (
                                <div key={table.id} onClick={() => handleTableClick(table)} className={cardClass}>
                                    {!isFree && (
                                        <div className={styles.addButton}>
                                            <PlusCircle size={10} /> Thêm món
                                        </div>
                                    )}
                                    {hasOrder && orderStatus && (
                                        <div className={styles.addButton} style={{ background: `linear-gradient(135deg, ${orderColor}, ${orderColor}dd)` }}>
                                            <PlusCircle size={10} /> Thêm món
                                        </div>
                                    )}

                                    <div className={styles.cardIcon}>
                                        {isFree ? <Utensils size={48} color="#10b981" /> :
                                            isReserved ? <Calendar size={48} color="#f59e0b" /> :
                                                <Coffee size={48} color="#ef4444" />}
                                    </div>
                                    <div className={styles.cardTitle}>Bàn {table.number}</div>

                                    <div className={styles.location}>
                                        <MapPin size={12} /> <span>{table.area || "Khu vực chung"}</span>
                                    </div>

                                    {hasReservation && reservationCustomer && (
                                        <div className={styles.reservationInfo}>
                                            <div className={styles.reservationHeader}>
                                                <Calendar size={10} /> <span>Đặt bàn bởi:</span>
                                            </div>
                                            <div className={styles.reservationCustomer}>{reservationCustomer}</div>
                                            {reservationTime && (
                                                <div className={styles.reservationTime}>
                                                    <Clock size={10} /> <span>{formatDateTime(reservationTime)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {hasOrder && orderStatus && (
                                        <div className={styles.orderStatus} style={{ background: `${orderColor}20`, color: orderColor }}>
                                            {orderStatus}
                                        </div>
                                    )}

                                    <div className={styles.tableStatus}>
                                        {getStatusIcon(table.status, 'table')}
                                        <span className={styles.statusText} style={{ color: getStatusColor(table.status) }}>{getStatusText(table.status)}</span>
                                    </div>

                                    {isOccupied && (
                                        <div className={styles.timeInfo}>
                                            <Timer size={12} /> {elapsedTime ? `Đã dùng: ${elapsedTime}` : 'Đang cập nhật...'}
                                        </div>
                                    )}

                                    <div className={styles.capacity}>
                                        <Users size={12} /> Sức chứa: {table.capacity || 4} người
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                /* Content - Rooms */
                <div className={styles.gridContainer}>
                    {rooms.length === 0 ? (
                        <div className={`${styles.emptyState} ${styles.fullWidth}`}>
                            <Home size={48} color="#cbd5e1" />
                            <p className={styles.emptyText}>Không có phòng nào</p>
                        </div>
                    ) : (
                        rooms.map(room => {
                            const hasOrder = !!existingOrders[`room_${room.id}`];
                            const orderStatus = getOrderStatusText(room.id, 'room');
                            const orderColor = getOrderStatusColor(room.id, 'room');
                            const startTime = getStartTime(room.id, 'room');
                            const elapsedTime = getElapsedTime(startTime);
                            const hasReservation = room.hasUpcomingReservation === true;
                            const reservationCustomer = room.customerName;
                            const reservationTime = room.checkInTime;
                            const isOccupied = room.status === "OCCUPIED";
                            const isActive = room.status === "ACTIVE";
                            const isReserved = room.status === "RESERVED";
                            const isMaintenance = room.status === "MAINTENANCE";

                            let cardClass = styles.card;
                            if (isActive) cardClass += ` ${styles.cardFree}`;
                            else if (isOccupied) cardClass += ` ${styles.cardOccupied}`;
                            else if (isReserved) cardClass += ` ${styles.cardReserved}`;
                            else if (isMaintenance) cardClass += ` ${styles.cardMaintenance}`;

                            const getRoomIcon = () => {
                                if (isActive) return <Home size={48} color="#10b981" />;
                                if (isOccupied) return <Users size={48} color="#ef4444" />;
                                if (isMaintenance) return <AlertCircle size={48} color="#6b7280" />;
                                return <Home size={48} color="#f59e0b" />;
                            };

                            return (
                                <div
                                    key={room.id}
                                    onClick={() => handleRoomClick(room)}
                                    className={cardClass}
                                    style={isMaintenance ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                                >
                                    {isOccupied && (
                                        <div className={styles.addButton}>
                                            <PlusCircle size={10} /> Thêm món
                                        </div>
                                    )}
                                    {hasOrder && orderStatus && (
                                        <div className={styles.addButton} style={{ background: `linear-gradient(135deg, ${orderColor}, ${orderColor}dd)` }}>
                                            <PlusCircle size={10} /> Thêm món
                                        </div>
                                    )}

                                    <div className={styles.cardIcon}>
                                        {getRoomIcon()}
                                    </div>
                                    <div className={styles.cardTitle}>Phòng {room.number}</div>

                                    <div className={styles.location}>
                                        <MapPin size={12} /> <span>{room.area || "Khu vực VIP"}</span>
                                    </div>

                                    {hasReservation && reservationCustomer && (
                                        <div className={styles.reservationInfo}>
                                            <div className={styles.reservationHeader}>
                                                <Calendar size={10} /> <span>Đặt phòng bởi:</span>
                                            </div>
                                            <div className={styles.reservationCustomer}>{reservationCustomer}</div>
                                            {reservationTime && (
                                                <div className={styles.reservationTime}>
                                                    <Clock size={10} /> <span>{formatDateTime(reservationTime)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {hasOrder && orderStatus && (
                                        <div className={styles.orderStatus} style={{ background: `${orderColor}20`, color: orderColor }}>
                                            {orderStatus}
                                        </div>
                                    )}

                                    <div className={styles.tableStatus}>
                                        {getStatusIcon(room.status, 'room')}
                                        <span className={styles.statusText} style={{ color: getStatusColor(room.status, 'room') }}>
                                            {getStatusText(room.status, 'room')}
                                        </span>
                                    </div>

                                    {isOccupied && (
                                        <div className={styles.timeInfo}>
                                            <Timer size={12} /> {elapsedTime ? `Đã dùng: ${elapsedTime}` : 'Đang cập nhật...'}
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
        </div>
    );
};

export default Orders;