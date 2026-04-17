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
            setAreas([]);
        }
    }, [show]);

    // 🔥 Lấy danh sách khu vực cho phòng (dùng API /rooms/branch/{branchId}/areas)
    const fetchRoomAreas = async () => {
        setLoading(true);
        try {
            // Lấy tất cả phòng để lấy danh sách khu vực
            const res = await fetch(`${API}/api/rooms/branch/${branchId}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            // Lấy unique areas từ danh sách phòng
            const uniqueAreas = [...new Set(data.map(room => room.area).filter(area => area))];
            console.log("📋 Room Areas loaded:", uniqueAreas);
            setAreas(uniqueAreas);
            setStep("roomAreas");
        } catch (err) {
            console.error("❌ Lỗi load khu vực phòng:", err);
            alert("Không thể tải khu vực phòng!");
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Lấy danh sách khu vực cho bàn
    const fetchTableAreas = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/tables/branch/${branchId}/areas`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            console.log("📋 Table Areas loaded:", data);
            setAreas(data || []);
            setStep("tableAreas");
        } catch (err) {
            console.error("❌ Lỗi load khu vực bàn:", err);
            alert("Không thể tải khu vực bàn!");
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Lấy danh sách phòng theo khu vực
    const fetchRoomsByArea = async (area) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/rooms/branch/${branchId}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            // Lọc phòng theo khu vực
            const filteredRooms = data.filter(room => room.area === area);
            console.log("📋 Rooms loaded for area", area, ":", filteredRooms);

            const mappedRooms = filteredRooms.map(room => ({
                id: room.id,
                number: room.number,
                capacity: room.capacity,
                area: room.area,
                status: room.status === "FREE" ? "available" : "occupied"
            }));

            setRooms(mappedRooms);
            setStep("rooms");
        } catch (err) {
            console.error("❌ Lỗi load phòng theo khu vực:", err);
            alert("Không thể tải danh sách phòng!");
        } finally {
            setLoading(false);
        }
    };

    // Lấy danh sách bàn theo khu vực
    const fetchTablesByArea = async (area) => {
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
            fetchRoomAreas(); // 🔥 Đi đến chọn khu vực phòng
        } else {
            fetchTableAreas(); // 🔥 Đi đến chọn khu vực bàn
        }
    };

    // Xử lý chọn khu vực phòng
    const handleSelectRoomArea = (area) => {
        setSelectedArea(area);
        fetchRoomsByArea(area);
    };

    // Xử lý chọn khu vực bàn
    const handleSelectTableArea = (area) => {
        setSelectedArea(area);
        fetchTablesByArea(area);
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
            capacity: table.capacity,
            tableId: table.id,   // 🔥 Thêm tableId
            roomId: null         // 🔥 Thêm roomId = null
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
            area: selectedArea,
            capacity: room.capacity,
            roomId: room.id,     // 🔥 Thêm roomId
            tableId: null        // 🔥 Thêm tableId = null
        });

        onClose();
    };

    const handleBack = () => {
        if (step === "tables") {
            setStep("tableAreas");
            setTables([]);
            setSelectedArea(null);
        } else if (step === "tableAreas") {
            setStep("type");
            setBookingType(null);
            setAreas([]);
        } else if (step === "rooms") {
            setStep("roomAreas");
            setRooms([]);
            setSelectedArea(null);
        } else if (step === "roomAreas") {
            setStep("type");
            setBookingType(null);
            setAreas([]);
        }
    };

    const handleClose = () => {
        setStep("type");
        setBookingType(null);
        setSelectedArea(null);
        setTables([]);
        setRooms([]);
        setAreas([]);
        onClose();
    };

    const getTitle = () => {
        if (step === "type") return "Chọn hình thức đặt chỗ";
        if (step === "roomAreas") return "📍 Chọn khu vực phòng";
        if (step === "tableAreas") return "📍 Chọn khu vực bàn";
        if (step === "rooms") return `🏠 Chọn phòng tại ${selectedArea}`;
        if (step === "tables") return `🍽️ Chọn bàn tại ${selectedArea}`;
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
                        {/* Màn hình chọn loại hình: Phòng hoặc Bàn */}
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

                        {/* Màn hình chọn khu vực phòng */}
                        {step === "roomAreas" && (
                            <div className={styles.grid}>
                                {areas.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <p>❌ Không có khu vực phòng nào</p>
                                    </div>
                                ) : (
                                    areas.map((area) => (
                                        <div
                                            key={area}
                                            className={styles.card}
                                            onClick={() => handleSelectRoomArea(area)}
                                        >
                                            <div>📍</div>
                                            <div>{area}</div>
                                            <div style={{ fontSize: "12px", marginTop: "4px", color: "#9ca3af" }}>
                                                Khu vực phòng
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Màn hình chọn khu vực bàn */}
                        {step === "tableAreas" && (
                            <div className={styles.grid}>
                                {areas.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <p>❌ Không có khu vực bàn nào</p>
                                    </div>
                                ) : (
                                    areas.map((area) => (
                                        <div
                                            key={area}
                                            className={styles.card}
                                            onClick={() => handleSelectTableArea(area)}
                                        >
                                            <div>📍</div>
                                            <div>{area}</div>
                                            <div style={{ fontSize: "12px", marginTop: "4px", color: "#9ca3af" }}>
                                                Khu vực bàn
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Màn hình danh sách phòng theo khu vực */}
                        {step === "rooms" && (
                            <>
                                <div className={styles.grid}>
                                    {rooms.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <p>❌ Không có phòng trống trong khu vực {selectedArea}</p>
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

                        {/* Màn hình danh sách bàn theo khu vực */}
                        {step === "tables" && (
                            <>
                                <div className={styles.grid}>
                                    {tables.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <p>❌ Không có bàn trống trong khu vực {selectedArea}</p>
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