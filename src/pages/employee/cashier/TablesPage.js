import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Home, Users, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

const API = "http://localhost:8080";

const TablesPage = () => {
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState("Tất cả");
    const [loading, setLoading] = useState(true);
    const [showAreas, setShowAreas] = useState(true);
    const [activeTab, setActiveTab] = useState("tables"); // 'tables' or 'rooms'
    const navigate = useNavigate();

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;

    useEffect(() => {
        if (branchId) {
            fetchAreas();
            fetchTables();
            fetchRooms();
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
        try {
            let url = `${API}/api/tables/branch/${branchId}/areas`;
            if (selectedArea !== "Tất cả") {
                url = `${API}/api/tables/branch/${branchId}/area/${selectedArea}`;
            } else {
                // Lấy tất cả bàn từ các khu vực
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
                setLoading(false);
                return;
            }
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setTables(data);
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
        if (branchId && selectedArea !== "Tất cả") {
            fetchTables();
        } else if (branchId && selectedArea === "Tất cả" && activeTab === "tables") {
            fetchTables();
        }
    }, [selectedArea, branchId, activeTab]);

    const handleTableClick = (table) => {
        if (table.status === "FREE") {
            navigate(`/employee/cashier/tables/${table.id}`, { state: { table } });
        }
    };

    const handleRoomClick = (room) => {
        if (room.status === "FREE") {
            navigate(`/employee/cashier/rooms/${room.id}`, { state: { room } });
        }
    };

    const getStatusText = (status) => {
        return status === "FREE" ? "Trống" : "Đã có khách";
    };

    const getStatusColor = (status) => {
        return status === "FREE" ? "#10b981" : "#ef4444";
    };

    const formatTime = () => {
        const now = new Date();
        return now.toLocaleTimeString('vi-VN');
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
                <h2 style={{ margin: 0, color: "#2c3e2f" }}>Quản lý bàn & phòng</h2>
                <p style={{ margin: "8px 0 0", color: "#8a9b8c", fontSize: "14px" }}>
                    Quản lý trạng thái bàn và phòng theo khu vực
                </p>
            </div>

            {/* Tabs */}
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

            {/* Khu vực filter - chỉ hiển thị khi chọn bàn */}
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
                        <span style={{ fontWeight: "bold", color: "#2c3e2f" }}>
                            📍 Khu vực
                        </span>
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

            {/* Hiển thị bàn */}
            {activeTab === "tables" && (
                <>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "60px" }}>
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
                            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                            gap: "16px"
                        }}>
                            {tables.map((table) => (
                                <div
                                    key={table.id}
                                    onClick={() => handleTableClick(table)}
                                    style={{
                                        background: table.status === "FREE"
                                            ? "linear-gradient(135deg, #ffffff, #f8faf5)"
                                            : "#fee2e2",
                                        borderRadius: "16px",
                                        padding: "20px",
                                        cursor: table.status === "FREE" ? "pointer" : "not-allowed",
                                        opacity: table.status === "FREE" ? 1 : 0.7,
                                        transition: "all 0.2s",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                        border: `2px solid ${getStatusColor(table.status)}`,
                                        textAlign: "center"
                                    }}
                                    onMouseEnter={(e) => {
                                        if (table.status === "FREE") {
                                            e.currentTarget.style.transform = "translateY(-4px)";
                                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                                    }}
                                >
                                    <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                                        🍽️
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
                                        gap: "8px",
                                        marginTop: "8px",
                                        fontSize: "13px",
                                        color: getStatusColor(table.status)
                                    }}>
                                        {table.status === "FREE" ? (
                                            <CheckCircle size={14} />
                                        ) : (
                                            <XCircle size={14} />
                                        )}
                                        <span>{getStatusText(table.status)}</span>
                                    </div>
                                    {table.status !== "FREE" && (
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
                                            {formatTime()}
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
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Hiển thị phòng */}
            {activeTab === "rooms" && (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "16px"
                }}>
                    {rooms.length === 0 ? (
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
                        rooms.map((room) => (
                            <div
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                style={{
                                    background: room.status === "FREE"
                                        ? "linear-gradient(135deg, #ffffff, #f8faf5)"
                                        : "#fee2e2",
                                    borderRadius: "16px",
                                    padding: "20px",
                                    cursor: room.status === "FREE" ? "pointer" : "not-allowed",
                                    opacity: room.status === "FREE" ? 1 : 0.7,
                                    transition: "all 0.2s",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                    border: `2px solid ${room.status === "FREE" ? "#10b981" : "#ef4444"}`,
                                    textAlign: "center"
                                }}
                                onMouseEnter={(e) => {
                                    if (room.status === "FREE") {
                                        e.currentTarget.style.transform = "translateY(-4px)";
                                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                                }}
                            >
                                <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                                    🏠
                                </div>
                                <div style={{
                                    fontSize: "18px",
                                    fontWeight: "bold",
                                    color: "#2c3e2f"
                                }}>
                                    Phòng {room.number}
                                </div>
                                <div style={{
                                    fontSize: "13px",
                                    color: "#8a9b8c",
                                    marginTop: "4px"
                                }}>
                                    {room.area}
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    marginTop: "8px",
                                    fontSize: "13px",
                                    color: room.status === "FREE" ? "#10b981" : "#ef4444"
                                }}>
                                    {room.status === "FREE" ? (
                                        <CheckCircle size={14} />
                                    ) : (
                                        <XCircle size={14} />
                                    )}
                                    <span>{room.status === "FREE" ? "Trống" : "Đã có khách"}</span>
                                </div>
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
                        ))
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

export default TablesPage;