// Orders.js - Chỉ hiển thị Bàn và Phòng (có hiển thị thời gian đã dùng)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, RefreshCw, Clock, CheckCircle, XCircle, MapPin, Users, Table, Home, PlusCircle } from "lucide-react";
import io from 'socket.io-client';

const API = "http://localhost:8080";
const socket = io('http://localhost:3001');

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

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;

    // Tính thời gian đã sử dụng
    const getElapsedTime = (startTime) => {
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
    };

    // Lấy thời gian bắt đầu từ order
    const getStartTime = (entityId, type) => {
        const order = existingOrders[`${type}_${entityId}`];
        if (order) {
            // Luôn lấy createdAt - thời điểm tạo đơn hàng đầu tiên
            return order.createdAt;
        }
        return null;
    };

    // Lấy danh sách đơn hàng đang hoạt động
    const fetchExistingOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/customer/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const branchOrders = data.filter(o => o.branch?.id === branchId);
                const activeOrders = branchOrders.filter(o => o.status !== "PAID" && o.status !== "CANCELED");
                const orderMap = {};
                activeOrders.forEach(order => {
                    if (order.table) {
                        orderMap[`table_${order.table.id}`] = order;
                    } else if (order.room) {
                        orderMap[`room_${order.room.id}`] = order;
                    }
                });
                setExistingOrders(orderMap);
            }
        } catch (err) {
            console.error("Lỗi tải đơn hàng:", err);
        }
    };

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
        if (branchId) {
            fetchAreas();
            fetchRooms();
            fetchExistingOrders();
        }
    }, [branchId]);

    useEffect(() => {
        if (branchId && selectedArea !== "Tất cả") {
            fetchTables();
        } else if (branchId && selectedArea === "Tất cả" && activeTab === "tables") {
            fetchTables();
        }
    }, [selectedArea, branchId, activeTab]);

    useEffect(() => {
        socket.on("update-tables", () => {
            console.log("🔄 Nhận tín hiệu cập nhật bàn từ server");
            fetchTables();
            fetchRooms();
            fetchExistingOrders();
        });
        return () => {
            socket.off("update-tables");
        };
    }, []);

    // Cập nhật thời gian realtime mỗi giây
    useEffect(() => {
        const interval = setInterval(() => {
            setExistingOrders(prev => ({ ...prev }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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

    const getStatusColor = (status) => {
        if (status === "FREE") return "#10b981";
        if (status === "RESERVED") return "#f59e0b";
        return "#ef4444";
    };

    const getStatusText = (status) => {
        if (status === "FREE") return "Trống";
        if (status === "RESERVED") return "Đã đặt";
        return "Đã có khách";
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
                        onClick={() => {
                            fetchTables();
                            fetchRooms();
                            fetchExistingOrders();
                        }}
                        style={{
                            padding: "8px 16px",
                            background: "#f1f3ee",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px"
                        }}
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
            </div>

            {/* Area Filter */}
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
                        <span style={{ fontWeight: "bold", color: "#2c3e2f" }}>📍 Khu vực / Tầng</span>
                        <span>{showAreas ? "▲" : "▼"}</span>
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
                                        transition: "all 0.2s"
                                    }}
                                >
                                    {area === "Tất cả" ? "🏠 Tất cả" : `📍 ${area}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab Tables */}
            {activeTab === "tables" && (
                <>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "16px" }}>
                            <div style={{
                                width: "48px",
                                height: "48px",
                                border: "4px solid #e2e8e0",
                                borderTopColor: "#d32f2f",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                                margin: "0 auto 20px"
                            }}></div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : tables.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "60px",
                            background: "white",
                            borderRadius: "16px"
                        }}>
                            <p>Không có bàn nào trong khu vực này</p>
                        </div>
                    ) : (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                            gap: "16px"
                        }}>
                            {tables.map((table) => {
                                const hasOrder = !!existingOrders[`table_${table.id}`];
                                const orderStatus = getOrderStatusText(table.id, 'table');
                                const startTime = getStartTime(table.id, 'table');
                                const elapsedTime = getElapsedTime(startTime);

                                return (
                                    <div
                                        key={table.id}
                                        onClick={() => handleTableClick(table)}
                                        style={{
                                            position: "relative",
                                            background: table.status === "FREE"
                                                ? "linear-gradient(135deg, #ffffff, #f8faf5)"
                                                : table.status === "RESERVED"
                                                    ? "#fffbeb"
                                                    : "#fff3e0",
                                            borderRadius: "16px",
                                            padding: "20px",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                            border: `2px solid ${getStatusColor(table.status)}`,
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
                                        {table.status !== "FREE" && (
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

                                        <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                                            {table.status === "FREE" ? "🍽️" : table.status === "RESERVED" ? "📅" : "🍜"}
                                        </div>
                                        <div style={{
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            color: "#2c3e2f"
                                        }}>
                                            Bàn {table.number}
                                        </div>

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
                                            <span>{table.area || "Khu vực chung"}</span>
                                        </div>

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

                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            marginTop: "8px",
                                            fontSize: "13px",
                                            color: getStatusColor(table.status)
                                        }}>
                                            {table.status === "FREE" ? (
                                                <CheckCircle size={14} />
                                            ) : table.status === "RESERVED" ? (
                                                <Clock size={14} />
                                            ) : (
                                                <XCircle size={14} />
                                            )}
                                            <span>{getStatusText(table.status)}</span>
                                        </div>

                                        {/* Hiển thị thời gian đã sử dụng */}
                                        {table.status === "OCCUPIED" && (
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

                                        <div style={{
                                            fontSize: "11px",
                                            color: "#8a9b8c",
                                            marginTop: "8px"
                                        }}>
                                            Sức chứa: {table.capacity || 4} người
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Tab Rooms */}
            {activeTab === "rooms" && (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "16px"
                }}>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "16px", gridColumn: "1/-1" }}>
                            <div style={{
                                width: "48px",
                                height: "48px",
                                border: "4px solid #e2e8e0",
                                borderTopColor: "#d32f2f",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                                margin: "0 auto 20px"
                            }}></div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "60px",
                            background: "white",
                            borderRadius: "16px",
                            gridColumn: "1/-1"
                        }}>
                            <p>Không có phòng nào</p>
                        </div>
                    ) : (
                        rooms.map((room) => {
                            const hasOrder = !!existingOrders[`room_${room.id}`];
                            const orderStatus = getOrderStatusText(room.id, 'room');
                            const startTime = getStartTime(room.id, 'room');
                            const elapsedTime = getElapsedTime(startTime);

                            return (
                                <div
                                    key={room.id}
                                    onClick={() => handleRoomClick(room)}
                                    style={{
                                        position: "relative",
                                        background: room.status === "FREE"
                                            ? "linear-gradient(135deg, #ffffff, #f8faf5)"
                                            : room.status === "RESERVED"
                                                ? "#fffbeb"
                                                : "#fff3e0",
                                        borderRadius: "16px",
                                        padding: "20px",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                        border: `2px solid ${room.status === "FREE" ? "#10b981" : room.status === "RESERVED" ? "#f59e0b" : "#ef4444"}`,
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
                                    {room.status !== "FREE" && (
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

                                    <div style={{ fontSize: "40px", marginBottom: "8px" }}>🏠</div>
                                    <div style={{
                                        fontSize: "18px",
                                        fontWeight: "bold",
                                        color: "#2c3e2f"
                                    }}>
                                        Phòng {room.number}
                                    </div>

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
                                        <span>{room.area || "Khu vực VIP"}</span>
                                    </div>

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

                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        marginTop: "8px",
                                        fontSize: "13px",
                                        color: room.status === "FREE" ? "#10b981" : room.status === "RESERVED" ? "#f59e0b" : "#ef4444"
                                    }}>
                                        {room.status === "FREE" ? (
                                            <CheckCircle size={14} />
                                        ) : room.status === "RESERVED" ? (
                                            <Clock size={14} />
                                        ) : (
                                            <XCircle size={14} />
                                        )}
                                        <span>{room.status === "FREE" ? "Trống" : room.status === "RESERVED" ? "Đã đặt" : "Đã có khách"}</span>
                                    </div>

                                    {/* Hiển thị thời gian đã sử dụng cho phòng */}
                                    {room.status === "OCCUPIED" && (
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
                                        Sức chứa: {room.capacity} người
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Orders;