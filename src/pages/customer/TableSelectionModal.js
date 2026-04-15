import React, { useState, useEffect } from "react";
import { ArrowLeft, Home, Table, Users, Calendar, X } from "lucide-react";
import styles from "./TableSelectionModal.module.css";

const TableSelectionModal = ({
    show = false,
    onClose = () => { },
    selectTable = () => { },
    branchId,
    date,
    time
}) => {
    const [step, setStep] = useState("type");
    const [areas, setAreas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bookingType, setBookingType] = useState(null);

    const API = "http://localhost:8080";

    useEffect(() => {
        if (show) {
            setStep("type");
            setBookingType(null);
            setSelectedArea(null);
            setTables([]);
            setRooms([]);
        }
    }, [show]);

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

    const handleSelectType = (type) => {
        setBookingType(type);
        if (type === "room") {
            fetchRooms();
        } else {
            fetchAreas();
        }
    };

    const handleSelectArea = (area) => {
        setSelectedArea(area);
        fetchTables(area);
    };

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

    const getTitle = () => {
        if (step === "type") return "Chọn hình thức đặt chỗ";
        if (step === "rooms") return "Danh sách phòng";
        if (step === "areas") return "Chọn khu vực";
        if (step === "tables") return `Chọn bàn tại ${selectedArea}`;
        return "";
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    {step !== "type" && (
                        <button onClick={handleBack} className={styles.backButton}>
                            <ArrowLeft size={24} color="#D4AF37" />
                        </button>
                    )}
                    <h2 className={styles.modalTitle}>{getTitle()}</h2>
                </div>

                {date && time && (
                    <div className={styles.dateInfo}>
                        <Calendar size={16} />
                        <span>
                            Ngày đặt: {new Date(date).toLocaleDateString('vi-VN')} - {time}
                        </span>
                    </div>
                )}

                {loading ? (
                    <div className={styles.spinnerContainer}>
                        <div className={styles.spinner}></div>
                        <p>Đang tải...</p>
                    </div>
                ) : (
                    <>
                        {step === "type" && (
                            <div className={styles.typeGrid}>
                                <div className={styles.typeCard} onClick={() => handleSelectType("room")}>
                                    <div>🏠</div>
                                    <h3>Đặt phòng</h3>
                                    <p>Phòng riêng, không gian riêng tư</p>
                                    <div style={{ marginTop: "12px", fontSize: "12px", color: "#D4AF37" }}>
                                        Phù hợp cho nhóm từ 4-10 người
                                    </div>
                                </div>

                                <div className={styles.typeCard} onClick={() => handleSelectType("table")}>
                                    <div>🍽️</div>
                                    <h3>Đặt bàn</h3>
                                    <p>Bàn trong khu vực chung</p>
                                    <div style={{ marginTop: "12px", fontSize: "12px", color: "#D4AF37" }}>
                                        Phù hợp cho nhóm từ 2-6 người
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === "rooms" && (
                            <>
                                <div className={styles.grid}>
                                    {rooms.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <p>❌ Không có phòng trống</p>
                                        </div>
                                    ) : (
                                        rooms.map((room) => (
                                            <div
                                                key={room.id}
                                                className={`${styles.roomCard} ${room.status === "occupied" ? styles.disabled : ""}`}
                                                onClick={() => handleSelectRoom(room)}
                                            >
                                                <div>{room.status === "available" ? "🏠" : "🔒"}</div>
                                                <div>Phòng {room.number}</div>
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

                                <div className={styles.legend}>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendColor} ${styles.available}`}></div>
                                        <span className={styles.legendText}>Phòng trống</span>
                                    </div>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendColor} ${styles.occupied}`}></div>
                                        <span className={styles.legendText}>Phòng đã đặt</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === "areas" && (
                            <div className={styles.grid}>
                                {areas.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <p>Không có khu vực nào</p>
                                    </div>
                                ) : (
                                    areas.map((area) => (
                                        <div
                                            key={area}
                                            className={styles.card}
                                            onClick={() => handleSelectArea(area)}
                                        >
                                            <div>📍</div>
                                            <div>{area}</div>
                                            <div style={{ fontSize: "12px", marginTop: "4px", color: "#9ca3af" }}>
                                                Khu vực
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {step === "tables" && (
                            <>
                                <div className={styles.grid}>
                                    {tables.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <p>❌ Không có bàn trống trong khu vực này</p>
                                        </div>
                                    ) : (
                                        tables.map((t) => (
                                            <div
                                                key={t.id}
                                                className={`${styles.table} ${t.status === "occupied" ? styles.disabled : ""}`}
                                                onClick={() => handleSelectTable(t)}
                                            >
                                                <div>{t.status === "available" ? "🍽️" : "🔒"}</div>
                                                <div>Bàn {t.number}</div>
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

                                <div className={styles.legend}>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendColor} ${styles.available}`}></div>
                                        <span className={styles.legendText}>Bàn trống</span>
                                    </div>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendColor} ${styles.occupied}`}></div>
                                        <span className={styles.legendText}>Bàn đã có khách</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                <button onClick={handleClose} className={styles.closeBtn}>
                    Đóng
                </button>
            </div>
        </div>
    );
};

export default TableSelectionModal;