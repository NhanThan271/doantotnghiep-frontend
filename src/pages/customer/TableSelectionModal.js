import React, { useState, useEffect } from "react";
import { ArrowLeft, Home, Table, Users } from "lucide-react";
import styles from "./TableSelectionModal.module.css";

const TableSelectionModal = ({
    show = false,
    onClose = () => { },
    selectTable = () => { },
    branchId,
    date,
    time
}) => {
    const [step, setStep] = useState("type"); // type, areas, tables, rooms
    const [areas, setAreas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bookingType, setBookingType] = useState(null); // 'table' hoặc 'room'

    const API = "http://localhost:8080";

    // Reset state khi mở modal
    useEffect(() => {
        if (show) {
            setStep("type");
            setBookingType(null);
            setSelectedArea(null);
            setTables([]);
            setRooms([]);
        }
    }, [show]);

    // Fetch danh sách phòng
    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/rooms/branch/${branchId}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            console.log("📋 Rooms loaded:", data);

            const mappedRooms = data.map(room => ({
                id: room.id,
                number: room.number,
                capacity: room.capacity,
                area: room.area,
                status: room.status === "FREE" ? "available" : "occupied"
            }));

            setRooms(mappedRooms);
            setStep("rooms");
        } catch (err) {
            console.error("❌ Lỗi load phòng:", err);
            alert("Không thể tải danh sách phòng!");
        } finally {
            setLoading(false);
        }
    };

    // Fetch danh sách khu vực (cho bàn)
    const fetchAreas = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/tables/branch/${branchId}/areas`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            console.log("📋 Areas loaded:", data);
            setAreas(data || []);
            setStep("areas");
        } catch (err) {
            console.error("❌ Lỗi load khu vực:", err);
            alert("Không thể tải khu vực!");
        } finally {
            setLoading(false);
        }
    };

    // Fetch bàn theo khu vực
    const fetchTables = async (area) => {
        setLoading(true);
        try {
            const res = await fetch(
                `${API}/api/tables/branch/${branchId}/area/${encodeURIComponent(area)}`
            );

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            console.log("📋 Tables loaded:", data);

            const mapped = data.map(t => ({
                id: t.id,
                number: t.number,
                status: t.status === "FREE" ? "available" : "occupied",
                capacity: t.capacity
            }));

            setTables(mapped);
            setStep("tables");
        } catch (err) {
            console.error("❌ Lỗi load bàn:", err);
            alert("Không thể tải bàn!");
        } finally {
            setLoading(false);
        }
    };

    // Xử lý chọn loại hình (Phòng hoặc Bàn)
    const handleSelectType = (type) => {
        setBookingType(type);
        if (type === "room") {
            fetchRooms();
        } else {
            fetchAreas();
        }
    };

    // Xử lý chọn khu vực (bàn)
    const handleSelectArea = (area) => {
        setSelectedArea(area);
        fetchTables(area);
    };

    // Xử lý chọn bàn
    const handleSelectTable = (table) => {
        if (table.status !== "available") {
            alert("❌ Bàn này không khả dụng!");
            return;
        }

        selectTable({
            type: "table",
            id: table.id,
            number: table.number,
            branchId,
            area: selectedArea,
            capacity: table.capacity
        });

        onClose();
    };

    // Xử lý chọn phòng
    const handleSelectRoom = (room) => {
        if (room.status !== "available") {
            alert("❌ Phòng này đã có khách!");
            return;
        }

        selectTable({
            type: "room",
            id: room.id,
            number: room.number,
            branchId,
            area: room.area,
            capacity: room.capacity
        });

        onClose();
    };

    const handleBack = () => {
        if (step === "tables") {
            setStep("areas");
            setTables([]);
            setSelectedArea(null);
        } else if (step === "areas") {
            setStep("type");
            setBookingType(null);
            setAreas([]);
        } else if (step === "rooms") {
            setStep("type");
            setBookingType(null);
            setRooms([]);
        }
    };

    const handleClose = () => {
        setStep("type");
        setBookingType(null);
        setSelectedArea(null);
        setTables([]);
        setRooms([]);
        onClose();
    };

    if (!show) return null;

    // Màn hình chọn loại hình (Phòng hoặc Bàn)
    const renderTypeSelection = () => (
        <div className={styles.typeGrid}>
            <div className={styles.typeCard} onClick={() => handleSelectType("room")}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏠</div>
                <h3 style={{ color: "#e5e7eb", marginBottom: "8px" }}>Đặt phòng</h3>
                <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                    Phòng riêng, không gian riêng tư
                </p>
                <div style={{ marginTop: "16px", fontSize: "12px", color: "#D4AF37" }}>
                    Phù hợp cho nhóm từ 4-10 người
                </div>
            </div>

            <div className={styles.typeCard} onClick={() => handleSelectType("table")}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍽️</div>
                <h3 style={{ color: "#e5e7eb", marginBottom: "8px" }}>Đặt bàn</h3>
                <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                    Bàn trong khu vực chung
                </p>
                <div style={{ marginTop: "16px", fontSize: "12px", color: "#D4AF37" }}>
                    Phù hợp cho nhóm từ 2-6 người
                </div>
            </div>
        </div>
    );

    // Render danh sách phòng
    const renderRooms = () => (
        <>
            <div className={styles.grid}>
                {rooms.length === 0 ? (
                    <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#9ca3af" }}>
                        ❌ Không có phòng trống
                    </p>
                ) : (
                    rooms.map((room) => (
                        <div
                            key={room.id}
                            className={`
                                ${styles.roomCard}
                                ${room.status === "occupied" ? styles.disabled : ""}
                            `}
                            onClick={() => handleSelectRoom(room)}
                        >
                            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                                {room.status === "available" ? "🏠" : "🔒"}
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                                Phòng {room.number}
                            </div>
                            <div style={{ fontSize: "14px", marginTop: "8px" }}>
                                <Users size={14} style={{ display: "inline", marginRight: "4px" }} />
                                {room.capacity} người
                            </div>
                            {room.area && (
                                <div style={{ fontSize: "12px", marginTop: "4px", color: "#9ca3af" }}>
                                    📍 {room.area}
                                </div>
                            )}
                            <small style={{
                                display: "block",
                                marginTop: "8px",
                                color: room.status === "available" ? "#10b981" : "#ef4444"
                            }}>
                                {room.status === "available" ? "🟢 Trống" : "🔴 Đã có khách"}
                            </small>
                        </div>
                    ))
                )}
            </div>

            <div style={{
                display: "flex",
                gap: "24px",
                justifyContent: "center",
                marginTop: "20px",
                padding: "12px",
                background: "rgba(31,41,55,0.5)",
                borderRadius: "8px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "24px", height: "24px", background: "#10b981", borderRadius: "4px" }}></div>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>Phòng trống</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "24px", height: "24px", background: "#ef4444", borderRadius: "4px" }}></div>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>Phòng đã đặt</span>
                </div>
            </div>
        </>
    );

    // Render danh sách khu vực (bàn)
    const renderAreas = () => (
        <div className={styles.grid}>
            {areas.length === 0 ? (
                <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#9ca3af" }}>
                    Không có khu vực nào
                </p>
            ) : (
                areas.map((area) => (
                    <div
                        key={area}
                        className={styles.card}
                        onClick={() => handleSelectArea(area)}
                    >
                        <div style={{ fontSize: "32px", marginBottom: "8px" }}>📍</div>
                        <div style={{ fontWeight: "bold", fontSize: "18px" }}>{area}</div>
                        <div style={{ fontSize: "12px", marginTop: "4px", color: "#9ca3af" }}>
                            Khu vực
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    // Render danh sách bàn
    const renderTables = () => (
        <>
            <div className={styles.grid}>
                {tables.length === 0 ? (
                    <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#9ca3af" }}>
                        ❌ Không có bàn trống trong khu vực này
                    </p>
                ) : (
                    tables.map((t) => (
                        <div
                            key={t.id}
                            className={`
                                ${styles.table}
                                ${t.status === "occupied" ? styles.disabled : ""}
                            `}
                            onClick={() => handleSelectTable(t)}
                        >
                            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                                {t.status === "available" ? "🍽️" : "🔒"}
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                                Bàn {t.number}
                            </div>
                            <div style={{ fontSize: "12px", marginTop: "4px" }}>
                                {t.capacity} người
                            </div>
                            <small style={{
                                display: "block",
                                marginTop: "8px",
                                color: t.status === "available" ? "#10b981" : "#ef4444"
                            }}>
                                {t.status === "available" ? "🟢 Trống" : "🔴 Đã có khách"}
                            </small>
                        </div>
                    ))
                )}
            </div>

            <div style={{
                display: "flex",
                gap: "24px",
                justifyContent: "center",
                marginTop: "20px",
                padding: "12px",
                background: "rgba(31,41,55,0.5)",
                borderRadius: "8px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "24px", height: "24px", background: "#10b981", borderRadius: "4px" }}></div>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>Bàn trống</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "24px", height: "24px", background: "#ef4444", borderRadius: "4px" }}></div>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>Bàn đã có khách</span>
                </div>
            </div>
        </>
    );

    // Xác định title dựa trên step
    const getTitle = () => {
        if (step === "type") return "Chọn hình thức đặt chỗ";
        if (step === "rooms") return "🏠 Danh sách phòng";
        if (step === "areas") return "📍 Chọn khu vực";
        if (step === "tables") return `🪑 Chọn bàn (${selectedArea})`;
        return "";
    };

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div
                className={styles.modalBox}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    {step !== "type" && (
                        <button
                            onClick={handleBack}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <ArrowLeft size={20} color="#D4AF37" />
                        </button>
                    )}
                    <h2 style={{ color: "#e5e7eb", margin: 0 }}>
                        {getTitle()}
                    </h2>
                </div>

                {date && time && (
                    <div style={{
                        background: 'rgba(212, 175, 55, 0.1)',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        color: '#D4AF37'
                    }}>
                        📅 Ngày đặt: {new Date(date).toLocaleDateString('vi-VN')} - {time}
                    </div>
                )}

                {loading && (
                    <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
                        <div style={{
                            width: "48px",
                            height: "48px",
                            border: "4px solid rgba(212,175,55,0.2)",
                            borderTopColor: "#D4AF37",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                            margin: "0 auto 20px"
                        }}></div>
                        <p>Đang tải...</p>
                    </div>
                )}

                {!loading && (
                    <>
                        {step === "type" && renderTypeSelection()}
                        {step === "rooms" && renderRooms()}
                        {step === "areas" && renderAreas()}
                        {step === "tables" && renderTables()}
                    </>
                )}

                <button onClick={handleClose} className={styles.closeBtn}>
                    Đóng
                </button>

                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default TableSelectionModal;