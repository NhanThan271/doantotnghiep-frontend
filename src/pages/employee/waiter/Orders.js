// Orders.js - Sử dụng dữ liệu từ API tables/rooms (đã có customerName, checkInTime)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ClipboardList, RefreshCw, Clock, CheckCircle, XCircle,
    MapPin, Users, Table, Home, PlusCircle, Calendar
} from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import { showToast } from "../../../hooks/useToast";

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

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;

    // ========== HELPER FUNCTIONS ==========

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

    const getStartTime = useCallback((entityId, type) => {
        const order = existingOrders[`${type}_${entityId}`];
        if (order) {
            return order.createdAt;
        }
        return null;
    }, [existingOrders]);

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return "";
        const date = new Date(dateTimeStr);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ========== UPDATE ENTITY STATUS ==========
    const updateEntityStatus = async (entityId, type, newStatus) => {
        try {
            const updateUrl = type === 'room'
                ? `http://localhost:8080/api/rooms/${entityId}/status?status=${newStatus}`
                : `http://localhost:8080/api/tables/${entityId}/status?status=${newStatus}`;

            const token = localStorage.getItem('token');
            const response = await fetch(updateUrl, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                console.log(`✅ Đã cập nhật ${type === 'room' ? 'phòng' : 'bàn'} ${entityId} thành ${newStatus}`);
                return true;
            }
            return false;
        } catch (err) {
            console.error(`Lỗi cập nhật trạng thái:`, err);
            return false;
        }
    };

    // ========== API CALLS ==========

    // Lấy danh sách đơn hàng đang hoạt động
    const fetchExistingOrders = useCallback(async () => {
        try {
            const response = await axiosClient.get('/customer/orders');
            const data = response.data;

            const branchOrders = data.filter(o => o.branch?.id === branchId);
            const activeOrders = branchOrders.filter(
                o => o.status !== "PAID" && o.status !== "CANCELED"
            );

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
            showToast('error', 'Lỗi', 'Không thể tải danh sách đơn hàng');
        }
    }, [branchId]);

    // 👉 SỬA: Dùng API /reservations/tables và /reservations/rooms (đã có sẵn customerName, checkInTime)
    const fetchTablesWithReservations = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Gọi API lấy bàn + thông tin đặt bàn (đã có customerName, checkInTime, hasUpcomingReservation)
            const response = await axiosClient.get('/reservations/tables');
            const data = response.data || [];

            // Lọc theo khu vực
            if (selectedArea !== "Tất cả") {
                setTables(data.filter(table => table.area === selectedArea));
            } else {
                setTables(data);
            }
        } catch (err) {
            console.error("Lỗi tải bàn:", err);
            setError("Không thể tải danh sách bàn");
            showToast('error', 'Lỗi', 'Không thể tải danh sách bàn');
        } finally {
            setLoading(false);
        }
    }, [selectedArea]);

    const fetchRoomsWithReservations = useCallback(async () => {
        try {
            // Gọi API lấy phòng + thông tin đặt bàn
            const response = await axiosClient.get('/reservations/rooms');
            const data = response.data || [];
            setRooms(data);
        } catch (err) {
            console.error("Lỗi tải phòng:", err);
            showToast('error', 'Lỗi', 'Không thể tải danh sách phòng');
        }
    }, []);

    // Lấy danh sách khu vực
    const fetchAreas = useCallback(async () => {
        try {
            const response = await axiosClient.get(`/tables/branch/${branchId}/areas`);
            setAreas(["Tất cả", ...response.data]);
        } catch (err) {
            console.error("Lỗi tải khu vực:", err);
            showToast('error', 'Lỗi', 'Không thể tải danh sách khu vực');
        }
    }, [branchId]);

    // ========== EFFECTS ==========

    // Initial load
    useEffect(() => {
        if (!branchId) {
            setError("Không tìm thấy thông tin chi nhánh. Vui lòng đăng nhập lại.");
            return;
        }

        fetchAreas();
        fetchRoomsWithReservations();
        fetchExistingOrders();
        fetchTablesWithReservations();
    }, [branchId, fetchAreas, fetchRoomsWithReservations, fetchExistingOrders, fetchTablesWithReservations]);

    // Refetch khi đổi khu vực
    useEffect(() => {
        if (branchId && activeTab === "tables") {
            fetchTablesWithReservations();
        }
    }, [selectedArea, branchId, activeTab, fetchTablesWithReservations]);

    // Cập nhật thời gian realtime mỗi giây
    useEffect(() => {
        const interval = setInterval(() => {
            setExistingOrders(prev => ({ ...prev }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // ========== EVENT HANDLERS ==========

    const handleRefresh = () => {
        fetchTablesWithReservations();
        fetchRoomsWithReservations();
        fetchExistingOrders();
        showToast('success', 'Thành công', 'Đã làm mới dữ liệu');
    };

    const handleTableClick = async (table) => {
        let existingOrder = existingOrders[`table_${table.id}`];
        let currentTable = table;

        if (table.status === "FREE" && !existingOrder) {
            await updateEntityStatus(table.id, 'table', 'OCCUPIED');
            await fetchTablesWithReservations();
            await fetchExistingOrders();

            const updatedTable = tables.find(t => t.id === table.id);
            if (updatedTable) currentTable = updatedTable;
            existingOrder = existingOrders[`table_${table.id}`];
        }

        navigate(`/waiter/orders/${currentTable.id}`, {
            state: {
                table: { ...currentTable, status: "OCCUPIED" },
                existingOrder: existingOrder || null
            }
        });
    };

    const handleRoomClick = async (room) => {
        let existingOrder = existingOrders[`room_${room.id}`];
        let currentRoom = room;

        if (room.status === "ACTIVE" && !existingOrder) {
            await updateEntityStatus(room.id, 'room', 'OCCUPIED');
            await fetchRoomsWithReservations();
            await fetchExistingOrders();

            const updatedRoom = rooms.find(r => r.id === room.id);
            if (updatedRoom) currentRoom = updatedRoom;
            existingOrder = existingOrders[`room_${room.id}`];
        }

        navigate(`/waiter/orders/${currentRoom.id}`, {
            state: {
                room: { ...currentRoom, status: "OCCUPIED" },
                existingOrder: existingOrder || null
            }
        });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSelectedArea("Tất cả");
        if (tab === "tables") {
            fetchTablesWithReservations();
        }
    };

    // ========== STATUS HELPERS ==========

    const getStatusColor = (status, type = 'table') => {
        if (type === 'room') {
            const colors = {
                ACTIVE: "#10b981",
                OCCUPIED: "#ef4444",
                MAINTENANCE: "#6b7280",
                RESERVED: "#f59e0b"
            };
            return colors[status] || "#6b7280";
        }
        const colors = {
            FREE: "#10b981",
            RESERVED: "#f59e0b",
            OCCUPIED: "#ef4444"
        };
        return colors[status] || "#6b7280";
    };

    const getStatusText = (status, type = 'table') => {
        if (type === 'room') {
            const texts = {
                ACTIVE: "Trống",
                OCCUPIED: "Đã có khách",
                MAINTENANCE: "Bảo trì",
                RESERVED: "Đã đặt"
            };
            return texts[status] || status;
        }
        const texts = {
            FREE: "Trống",
            RESERVED: "Đã đặt",
            OCCUPIED: "Đã có khách"
        };
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

    // ========== RENDER HELPERS ==========

    const renderEntityCard = (entity, type) => {
        const entityId = entity.id;
        const hasOrder = !!existingOrders[`${type}_${entityId}`];
        const orderStatus = getOrderStatusText(entityId, type);
        const startTime = getStartTime(entityId, type);
        const elapsedTime = getElapsedTime(startTime);
        const label = type === 'table' ? 'Bàn' : 'Phòng';

        // 👈 DÙNG DỮ LIỆU CÓ SẴN TỪ API (entity.customerName, entity.checkInTime)
        const hasReservation = entity.hasUpcomingReservation === true;
        const reservationCustomer = entity.customerName;
        const reservationTime = entity.checkInTime;

        const isOccupied = (type === 'table' && entity.status === "OCCUPIED") ||
            (type === 'room' && entity.status === "OCCUPIED");

        const isReserved = entity.status === "RESERVED" || hasReservation;

        const canOrder = (type === 'table' && entity.status === "FREE" && !hasOrder) ||
            (type === 'room' && entity.status === "ACTIVE" && !hasOrder);

        const statusIcons = {
            FREE: '🍽️',
            RESERVED: '📅',
            OCCUPIED: '🍜',
            ACTIVE: '🏠'
        };

        const displayStatus = type === 'room'
            ? (entity.status === "ACTIVE" ? "FREE" : entity.status)
            : entity.status;

        return (
            <div
                key={`${type}_${entity.id}`}
                onClick={() => type === 'table' ? handleTableClick(entity) : handleRoomClick(entity)}
                style={{
                    position: "relative",
                    background: isOccupied
                        ? "#fff3e0"
                        : canOrder
                            ? "linear-gradient(135deg, #ffffff, #f8faf5)"
                            : isReserved
                                ? "#fff8e7"
                                : "#fffbeb",
                    borderRadius: "16px",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    border: `2px solid ${getStatusColor(entity.status, type)}`,
                    textAlign: "center"
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                }}
            >
                {/* Badge "Thêm món" / "Gọi món" */}
                {(isOccupied || canOrder) && (
                    <div style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "#10b981",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "20px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                    }}>
                        <PlusCircle size={10} />
                        {isOccupied ? "Thêm món" : "Gọi món"}
                    </div>
                )}

                {/* Icon trạng thái */}
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                    {statusIcons[displayStatus] || (type === 'room' ? '🏠' : '🍽️')}
                </div>

                {/* Tên bàn/phòng */}
                <div style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#2c3e2f"
                }}>
                    {label} {entity.number}
                </div>

                {/* Khu vực */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "#8a9b8c"
                }}>
                    <MapPin size={12} />
                    <span>{entity.area || "Khu vực chung"}</span>
                </div>

                {/* 👈 THÔNG TIN ĐẶT BÀN (từ dữ liệu API có sẵn) */}
                {hasReservation && reservationCustomer && (
                    <div style={{
                        marginTop: "8px",
                        padding: "6px 10px",
                        background: "#fef3c7",
                        borderRadius: "8px",
                        borderLeft: "3px solid #f59e0b",
                        textAlign: "left"
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            color: "#92400e",
                            marginBottom: "2px"
                        }}>
                            <Calendar size={10} />
                            <span style={{ fontWeight: "bold" }}>Đặt bàn bởi:</span>
                        </div>
                        <div style={{
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "#78350f"
                        }}>
                            {reservationCustomer}
                        </div>
                        {reservationTime && (
                            <div style={{
                                fontSize: "10px",
                                color: "#b45309",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                marginTop: "2px"
                            }}>
                                <Clock size={10} />
                                <span>{formatDateTime(reservationTime)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Trạng thái đơn hàng */}
                {hasOrder && orderStatus && (
                    <div style={{
                        fontSize: "11px",
                        color: "#f59e0b",
                        marginTop: "4px",
                        fontWeight: "500"
                    }}>
                        {orderStatus}
                    </div>
                )}

                {/* Trạng thái bàn/phòng */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    marginTop: "8px",
                    fontSize: "13px",
                    color: getStatusColor(entity.status, type)
                }}>
                    {getStatusIcon(entity.status, type)}
                    <span>{getStatusText(entity.status, type)}</span>
                </div>

                {/* Thời gian đã sử dụng */}
                {isOccupied && (
                    <div style={{
                        fontSize: "11px",
                        color: "#8a9b8c",
                        marginTop: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px"
                    }}>
                        <Clock size={12} />
                        {elapsedTime ? `Đã dùng: ${elapsedTime}` : 'Đang cập nhật...'}
                    </div>
                )}

                {/* Sức chứa */}
                <div style={{
                    fontSize: "11px",
                    color: "#8a9b8c",
                    marginTop: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                }}>
                    <Users size={12} />
                    Sức chứa: {entity.capacity || 4} người
                </div>
            </div>
        );
    };

    // ========== MAIN RENDER ==========

    if (error) {
        return (
            <div style={{
                padding: "20px",
                minHeight: "100vh",
                background: "linear-gradient(135deg, #f8faf5 0%, #f0f4ec 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <div style={{
                    background: "white",
                    borderRadius: "16px",
                    padding: "40px",
                    textAlign: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
                    <h3 style={{ color: "#ef4444", marginBottom: "8px" }}>Lỗi</h3>
                    <p style={{ color: "#6b7280", marginBottom: "20px" }}>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: "10px 24px",
                            background: "#d32f2f",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            padding: "20px",
            minHeight: "100vh",
            background: "linear-gradient(135deg, #f8faf5 0%, #f0f4ec 100%)"
        }}>
            {/* Header */}
            <div style={{
                background: "white",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
                <div>
                    <h2 style={{ margin: 0, color: "#2c3e2f", display: "flex", alignItems: "center", gap: "8px" }}>
                        <ClipboardList size={24} /> Quản lý bàn & phòng
                    </h2>
                </div>
                <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
                    <button
                        onClick={handleRefresh}
                        style={{
                            padding: "8px 16px",
                            background: "#f1f3ee",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8e0"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#f1f3ee"}
                    >
                        <RefreshCw size={14} /> Làm mới
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: "flex",
                gap: "12px",
                marginBottom: "20px"
            }}>
                <button
                    onClick={() => handleTabChange("tables")}
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
                        transition: "all 0.2s",
                        boxShadow: activeTab === "tables" ? "0 4px 12px rgba(211, 47, 47, 0.3)" : "0 2px 8px rgba(0,0,0,0.05)"
                    }}
                >
                    <Table size={18} />
                    Bàn ăn ({tables.length})
                </button>
                <button
                    onClick={() => handleTabChange("rooms")}
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
                        transition: "all 0.2s",
                        boxShadow: activeTab === "rooms" ? "0 4px 12px rgba(211, 47, 47, 0.3)" : "0 2px 8px rgba(0,0,0,0.05)"
                    }}
                >
                    <Home size={18} />
                    Phòng VIP ({rooms.length})
                </button>
            </div>

            {/* Area Filter - Chỉ hiển thị cho bàn */}
            {activeTab === "tables" && areas.length > 0 && (
                <div style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}>
                    <div
                        onClick={() => setShowAreas(!showAreas)}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            userSelect: "none"
                        }}
                    >
                        <span style={{ fontWeight: "bold", color: "#2c3e2f", display: "flex", alignItems: "center", gap: "8px" }}>
                            📍 Khu vực / Tầng
                        </span>
                        <span style={{ transition: "transform 0.2s", transform: showAreas ? "rotate(180deg)" : "rotate(0)" }}>
                            ▼
                        </span>
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
                                        fontWeight: "500",
                                        transition: "all 0.2s",
                                        boxShadow: selectedArea === area ? "0 2px 8px rgba(211, 47, 47, 0.3)" : "none"
                                    }}
                                >
                                    {area === "Tất cả" ? "🏠 Tất cả" : `📍 ${area}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            {activeTab === "tables" ? (
                <>
                    {loading ? (
                        <div style={{
                            textAlign: "center",
                            padding: "60px",
                            background: "white",
                            borderRadius: "16px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                        }}>
                            <div style={{
                                width: "48px",
                                height: "48px",
                                border: "4px solid #e2e8e0",
                                borderTopColor: "#d32f2f",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                                margin: "0 auto 20px"
                            }}></div>
                            <p style={{ color: "#8a9b8c" }}>Đang tải dữ liệu...</p>
                        </div>
                    ) : tables.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "60px",
                            background: "white",
                            borderRadius: "16px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                        }}>
                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍽️</div>
                            <p style={{ color: "#8a9b8c", fontSize: "16px" }}>Không có bàn nào trong khu vực này</p>
                        </div>
                    ) : (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                            gap: "16px"
                        }}>
                            {tables.map(table => renderEntityCard(table, 'table'))}
                        </div>
                    )}
                </>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "16px"
                }}>
                    {loading ? (
                        <div style={{
                            textAlign: "center",
                            padding: "60px",
                            background: "white",
                            borderRadius: "16px",
                            gridColumn: "1/-1",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                        }}>
                            <div style={{
                                width: "48px",
                                height: "48px",
                                border: "4px solid #e2e8e0",
                                borderTopColor: "#d32f2f",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                                margin: "0 auto 20px"
                            }}></div>
                            <p style={{ color: "#8a9b8c" }}>Đang tải dữ liệu...</p>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "60px",
                            background: "white",
                            borderRadius: "16px",
                            gridColumn: "1/-1",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                        }}>
                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏠</div>
                            <p style={{ color: "#8a9b8c", fontSize: "16px" }}>Không có phòng nào</p>
                        </div>
                    ) : (
                        rooms.map(room => renderEntityCard(room, 'room'))
                    )}
                </div>
            )}

            {/* Keyframes for spinner */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Orders;