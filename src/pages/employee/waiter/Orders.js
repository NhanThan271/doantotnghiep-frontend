// Orders.js - Sử dụng axiosClient, có hiển thị thời gian đã dùng
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ClipboardList, RefreshCw, Clock, CheckCircle, XCircle,
    MapPin, Users, Table, Home, PlusCircle
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

    // Tính thời gian đã sử dụng
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

    // Lấy thời gian bắt đầu từ order
    const getStartTime = useCallback((entityId, type) => {
        const order = existingOrders[`${type}_${entityId}`];
        if (order) {
            return order.createdAt;
        }
        return null;
    }, [existingOrders]);

    // ========== API CALLS ==========

    // Lấy danh sách đơn hàng đang hoạt động
    const fetchExistingOrders = useCallback(async () => {
        try {
            const response = await axiosClient.get('/customer/orders');
            const data = response.data;

            // Lọc đơn hàng theo chi nhánh và trạng thái active
            const branchOrders = data.filter(o => o.branch?.id === branchId);
            const activeOrders = branchOrders.filter(
                o => o.status !== "PAID" && o.status !== "CANCELED"
            );

            // Tạo map để truy xuất nhanh
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

    // Lấy danh sách bàn
    const fetchTables = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (selectedArea !== "Tất cả") {
                const response = await axiosClient.get(
                    `/tables/branch/${branchId}/area/${selectedArea}`
                );
                setTables(response.data);
            } else {
                // Lấy tất cả bàn từ tất cả khu vực
                const areasRes = await axiosClient.get(`/tables/branch/${branchId}/areas`);
                const areasData = areasRes.data;

                // Fetch song song để tăng tốc
                const tablePromises = areasData.map(area =>
                    axiosClient.get(`/tables/branch/${branchId}/area/${area}`)
                        .then(res => res.data)
                        .catch(() => [])
                );

                const allTablesArrays = await Promise.all(tablePromises);
                const allTables = allTablesArrays.flat();
                setTables(allTables);
            }
        } catch (err) {
            console.error("Lỗi tải bàn:", err);
            setError("Không thể tải danh sách bàn");
            showToast('error', 'Lỗi', 'Không thể tải danh sách bàn');
        } finally {
            setLoading(false);
        }
    }, [branchId, selectedArea]);

    // Lấy danh sách phòng
    const fetchRooms = useCallback(async () => {
        try {
            const response = await axiosClient.get(`/rooms/branch/${branchId}`);
            setRooms(response.data);
        } catch (err) {
            console.error("Lỗi tải phòng:", err);
            showToast('error', 'Lỗi', 'Không thể tải danh sách phòng');
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
        fetchRooms();
        fetchExistingOrders();
    }, [branchId, fetchAreas, fetchRooms, fetchExistingOrders]);

    // Refetch khi đổi khu vực
    useEffect(() => {
        if (branchId && activeTab === "tables") {
            fetchTables();
        }
    }, [selectedArea, branchId, activeTab, fetchTables]);

    // WebSocket listener (nếu có)
    useEffect(() => {
        // Có thể tích hợp WebSocket ở đây
        const interval = setInterval(() => {
            fetchExistingOrders();
        }, 30000); // Polling mỗi 30 giây

        return () => clearInterval(interval);
    }, [fetchExistingOrders]);

    // Cập nhật thời gian realtime mỗi giây
    useEffect(() => {
        const interval = setInterval(() => {
            setExistingOrders(prev => ({ ...prev }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // ========== EVENT HANDLERS ==========

    const handleRefresh = () => {
        fetchTables();
        fetchRooms();
        fetchExistingOrders();
        showToast('success', 'Thành công', 'Đã làm mới dữ liệu');
    };

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
        if (tab === "tables") {
            fetchTables();
        }
    };

    // ========== STATUS HELPERS ==========

    const getStatusColor = (status) => {
        const colors = {
            FREE: "#10b981",
            RESERVED: "#f59e0b",
            OCCUPIED: "#ef4444"
        };
        return colors[status] || "#6b7280";
    };

    const getStatusText = (status) => {
        const texts = {
            FREE: "Trống",
            RESERVED: "Đã đặt",
            OCCUPIED: "Đã có khách"
        };
        return texts[status] || status;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "FREE": return <CheckCircle size={14} />;
            case "RESERVED": return <Clock size={14} />;
            case "OCCUPIED": return <XCircle size={14} />;
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
        const icon = type === 'table' ? '🍽️' : '🏠';
        const label = type === 'table' ? 'Bàn' : 'Phòng';

        const statusIcons = {
            FREE: '🍽️',
            RESERVED: '📅',
            OCCUPIED: '🍜'
        };

        return (
            <div
                key={`${type}_${entity.id}`}
                onClick={() => type === 'table' ? handleTableClick(entity) : handleRoomClick(entity)}
                style={{
                    position: "relative",
                    background: entity.status === "FREE"
                        ? "linear-gradient(135deg, #ffffff, #f8faf5)"
                        : entity.status === "RESERVED"
                            ? "#fffbeb"
                            : "#fff3e0",
                    borderRadius: "16px",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    border: `2px solid ${getStatusColor(entity.status)}`,
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
                {/* Badge "Thêm món" cho bàn/phòng đang có khách */}
                {entity.status !== "FREE" && (
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
                        Thêm món
                    </div>
                )}

                {/* Icon trạng thái */}
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                    {statusIcons[entity.status] || icon}
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
                    color: getStatusColor(entity.status)
                }}>
                    {getStatusIcon(entity.status)}
                    <span>{getStatusText(entity.status)}</span>
                </div>

                {/* Thời gian đã sử dụng */}
                {entity.status === "OCCUPIED" && (
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
                    <p style={{ margin: "8px 0 0", color: "#8a9b8c", fontSize: "14px" }}>
                        Nhấp vào bàn/phòng để xem chi tiết hoặc thêm món
                    </p>
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

            {/* Area Filter */}
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
                            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                            gap: "16px"
                        }}>
                            {tables.map(table => renderEntityCard(table, 'table'))}
                        </div>
                    )}
                </>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
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