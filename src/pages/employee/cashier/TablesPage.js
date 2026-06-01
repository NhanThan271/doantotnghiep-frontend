import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Home, Users, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, PlusCircle, MapPin } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import styles from "./TablesPage.module.css";

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

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;

    // Tính thời gian đã sử dụng (từ lúc tạo order đến hiện tại)
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

    // Lấy thời gian bắt đầu từ order (createdAt - thời điểm tạo đơn hàng đầu tiên)
    const getTableStartTime = (entityId, type) => {
        const order = existingOrders[`${type}_${entityId}`];
        if (order) {
            // Luôn lấy createdAt - thời điểm mở bàn
            return order.createdAt;
        }
        return null;
    };

    // Lấy danh sách đơn hàng đang hoạt động
    const fetchExistingOrders = async () => {
        try {
            const res = await axiosClient.get("/customer/orders");
            const activeOrders = res.data.filter(o => o.status !== "PAID" && o.status !== "CANCELED");

            console.log("📋 Đơn hàng đang hoạt động:", activeOrders);

            const orderMap = {};
            activeOrders.forEach(order => {
                if (order.table) {
                    orderMap[`table_${order.table.id}`] = order;
                    console.log(`✅ Map bàn ${order.table.id} -> order #${order.id} (${order.status}) - tạo lúc: ${order.createdAt}`);
                } else if (order.room) {
                    orderMap[`room_${order.room.id}`] = order;
                    console.log(`✅ Map phòng ${order.room.id} -> order #${order.id} (${order.status}) - tạo lúc: ${order.createdAt}`);
                }
            });
            setExistingOrders(orderMap);
        } catch (err) {
            console.error("Lỗi tải đơn hàng:", err);
        }
    };

    useEffect(() => {
        if (branchId) {
            fetchAreas();
            fetchTables();
            fetchRooms();
            fetchExistingOrders();
        }
    }, [branchId]);

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

    useEffect(() => {
        if (branchId && selectedArea !== "Tất cả") {
            fetchTables();
        } else if (branchId && selectedArea === "Tất cả" && activeTab === "tables") {
            fetchTables();
        }
    }, [selectedArea, branchId, activeTab]);

    // Cập nhật thời gian realtime mỗi giây
    useEffect(() => {
        const interval = setInterval(() => {
            // Force re-render để cập nhật thời gian
            setExistingOrders(prev => ({ ...prev }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleTableClick = (table) => {
        const existingOrder = existingOrders[`table_${table.id}`];
        console.log(`🖱️ Click bàn ${table.number}, table.id=${table.id}, existingOrder:`, existingOrder);
        navigate(`/cashier/tables/${table.id}`, {
            state: { table: table, existingOrder: existingOrder || null }
        });
    };

    const handleRoomClick = (room) => {
        const existingOrder = existingOrders[`room_${room.id}`];
        console.log(`🖱️ Click phòng ${room.number}, order:`, existingOrder);
        navigate(`/cashier/rooms/${room.id}`, {
            state: { room: room, existingOrder: existingOrder || null }
        });
    };

    const getStatusText = (status) => {
        if (status === "FREE") return "Trống";
        if (status === "RESERVED") return "Đã đặt";
        return "Đã có khách";
    };

    const getStatusColor = (status) => {
        if (status === "FREE") return "#10b981";
        if (status === "RESERVED") return "#f59e0b";
        return "#ef4444";
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
                                            {table.status === "FREE" ? "🍽️" : table.status === "RESERVED" ? "📅" : "🍜"}
                                        </div>
                                        <div className={styles.cardTitle}>Bàn {table.number}</div>

                                        <div className={styles.location}>
                                            <MapPin size={12} />
                                            <span>{table.area || "Khu vực chung"}</span>
                                        </div>

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

                                        {/* Hiển thị thời gian đã sử dụng từ lúc mở bàn */}
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

                            // Xác định class CSS dựa trên RoomStatus
                            let cardClass = styles.card;
                            if (room.status === "ACTIVE") {
                                cardClass += ` ${styles.cardFree}`;
                            } else if (room.status === "OCCUPIED") {
                                cardClass += ` ${styles.cardOccupied}`;
                            } else if (room.status === "MAINTENANCE") {
                                cardClass += ` ${styles.cardMaintenance}`;
                            }

                            // Xác định icon cho từng trạng thái
                            const getRoomIcon = () => {
                                if (room.status === "ACTIVE") return "🏠";
                                if (room.status === "OCCUPIED") return "👥";
                                if (room.status === "MAINTENANCE") return "🔧";
                                return "🏠";
                            };

                            // Xác định text trạng thái
                            const getRoomStatusText = () => {
                                if (room.status === "ACTIVE") return "Trống";
                                if (room.status === "OCCUPIED") return "Đã có khách";
                                if (room.status === "MAINTENANCE") return "Bảo trì";
                                return room.status;
                            };

                            // Xác định màu sắc trạng thái
                            const getRoomStatusColor = () => {
                                if (room.status === "ACTIVE") return "#10b981";
                                if (room.status === "OCCUPIED") return "#ef4444";
                                if (room.status === "MAINTENANCE") return "#6b7280";
                                return "#6b7280";
                            };

                            // Xác định icon trạng thái
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
                                >
                                    {/* Chỉ hiển thị nút "Thêm món" khi phòng đang có khách */}
                                    {room.status === "OCCUPIED" && (
                                        <div className={styles.addButton}>
                                            <PlusCircle size={10} />
                                            Thêm món
                                        </div>
                                    )}

                                    {/* Icon chính của phòng */}
                                    <div className={styles.cardIcon}>
                                        {getRoomIcon()}
                                    </div>

                                    {/* Tên phòng */}
                                    <div className={styles.cardTitle}>Phòng {room.number}</div>

                                    {/* Khu vực */}
                                    <div className={styles.location}>
                                        <MapPin size={12} />
                                        <span>{room.area || "Khu vực VIP"}</span>
                                    </div>

                                    {/* Trạng thái đơn hàng (chờ bếp, đang chuẩn bị, hoàn thành) */}
                                    {hasOrder && orderStatus && (
                                        <div className={styles.orderStatus}>{orderStatus}</div>
                                    )}

                                    {/* Trạng thái phòng */}
                                    <div className={styles.tableStatus}>
                                        {getRoomStatusIcon()}
                                        <span
                                            className={styles.statusText}
                                            style={{ color: getRoomStatusColor() }}
                                        >
                                            {getRoomStatusText()}
                                        </span>
                                    </div>

                                    {/* Hiển thị thời gian đã sử dụng (chỉ khi phòng có khách) */}
                                    {room.status === "OCCUPIED" && (
                                        <div className={styles.timeInfo}>
                                            <Clock size={12} />
                                            {elapsedTime ? `Đã dùng: ${elapsedTime}` : 'Đang cập nhật...'}
                                        </div>
                                    )}

                                    {/* Sức chứa */}
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

export default TablesPage;