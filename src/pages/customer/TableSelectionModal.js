import React, { useState, useEffect } from "react";
import { ArrowLeft, Users, Calendar, X } from "lucide-react";
import styles from "./TableSelectionModal.module.css";

const TableSelectionModal = ({ show = false, onClose = () => { }, selectTable = () => { }, branchId, date, time }) => {
    const [step, setStep] = useState("type");
    const [areas, setAreas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);

    const API = "http://localhost:8080";

    const getStatusInfo = (status) => {
        switch (status) {
            case "FREE": return { text: "Trống", icon: "🟢", color: "#10b981", class: "available" };
            case "RESERVED": return { text: "Đã đặt", icon: "📅", color: "#f59e0b", class: "reserved" };
            case "OCCUPIED": return { text: "Đã có khách", icon: "🔴", color: "#ef4444", class: "occupied" };
            default: return { text: "Không xác định", icon: "⚪", color: "#6b7280", class: "unknown" };
        }
    };

    useEffect(() => {
        if (show) {
            if (!branchId) {
                console.error("❌ TableSelectionModal: Không có branchId!");
                alert("Không tìm thấy thông tin chi nhánh. Vui lòng chọn lại nhà hàng!");
                onClose();
                return;
            }
            setStep("type");
            setSelectedArea(null);
            setTables([]);
            setRooms([]);
            setAreas([]);
        }
    }, [show, branchId, onClose]);

    const fetchRoomAreas = async () => {
        if (!branchId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/rooms/branch/${branchId}`);
            const data = await res.json();
            const uniqueAreas = [...new Set(data.map(room => room.area).filter(area => area))];
            setAreas(uniqueAreas);
            setStep("roomAreas");
        } catch (err) {
            console.error("❌ Lỗi load khu vực phòng:", err);
            alert("Không thể tải khu vực phòng!");
        } finally {
            setLoading(false);
        }
    };

    const fetchTableAreas = async () => {
        if (!branchId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/tables/branch/${branchId}/areas`);
            const data = await res.json();
            setAreas(data || []);
            setStep("tableAreas");
        } catch (err) {
            console.error("❌ Lỗi load khu vực bàn:", err);
            alert("Không thể tải khu vực bàn!");
        } finally {
            setLoading(false);
        }
    };

    const fetchRoomsByArea = async (area) => {
        if (!branchId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/rooms/branch/${branchId}`);
            const data = await res.json();
            const filteredRooms = data.filter(room => room.area === area);
            setRooms(filteredRooms.map(room => ({ id: room.id, number: room.number, capacity: room.capacity, area: room.area, status: room.status })));
            setStep("rooms");
        } catch (err) {
            console.error("❌ Lỗi load phòng:", err);
            alert("Không thể tải danh sách phòng!");
        } finally {
            setLoading(false);
        }
    };

    const fetchTablesByArea = async (area) => {
        if (!branchId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/tables/branch/${branchId}/area/${encodeURIComponent(area)}`);
            const data = await res.json();
            setTables(data.map(t => ({ id: t.id, number: t.number, status: t.status, capacity: t.capacity })));
            setStep("tables");
        } catch (err) {
            console.error("❌ Lỗi load bàn:", err);
            alert("Không thể tải bàn!");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectType = (type) => {
        if (type === "room") fetchRoomAreas();
        else fetchTableAreas();
    };

    const handleSelectRoomArea = (area) => {
        setSelectedArea(area);
        fetchRoomsByArea(area);
    };

    const handleSelectTableArea = (area) => {
        setSelectedArea(area);
        fetchTablesByArea(area);
    };

    const handleSelectTable = (table) => {
        if (table.status !== "FREE") {
            alert(`❌ Bàn này đã ${table.status === "RESERVED" ? "được đặt trước" : "có khách"}!`);
            return;
        }
        selectTable({ type: "table", id: table.id, number: table.number, branchId, area: selectedArea, capacity: table.capacity, tableId: table.id, roomId: null });
        onClose();
    };

    const handleSelectRoom = (room) => {
        if (room.status !== "FREE") {
            alert(`❌ Phòng này đã ${room.status === "RESERVED" ? "được đặt trước" : "có khách"}!`);
            return;
        }
        selectTable({ type: "room", id: room.id, number: room.number, branchId, area: selectedArea, capacity: room.capacity, roomId: room.id, tableId: null });
        onClose();
    };

    const handleBack = () => {
        if (step === "tables") { setStep("tableAreas"); setTables([]); setSelectedArea(null); }
        else if (step === "tableAreas") { setStep("type"); setAreas([]); }
        else if (step === "rooms") { setStep("roomAreas"); setRooms([]); setSelectedArea(null); }
        else if (step === "roomAreas") { setStep("type"); setAreas([]); }
    };

    const handleClose = () => {
        setStep("type");
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

    const StatusCard = ({ item, type, onSelect }) => {
        const statusInfo = getStatusInfo(item.status);
        const isAvailable = item.status === "FREE";
        return (
            <div className={`${styles.card} ${!isAvailable ? styles.disabled : ""}`} onClick={() => isAvailable && onSelect(item)}>
                <div className={styles.cardIcon}>{type === "table" ? (isAvailable ? "🍽️" : "🔒") : (isAvailable ? "🏠" : "🔒")}</div>
                <div className={styles.cardName}>{type === "table" ? `Bàn ${item.number}` : `Phòng ${item.number}`}</div>
                <div className={styles.cardCapacity}><Users size={14} /><span>{item.capacity} người</span></div>
                <div className={`${styles.cardStatus} ${styles[statusInfo.class]}`} style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}>
                    <span>{statusInfo.icon}</span><span>{statusInfo.text}</span>
                </div>
                {!isAvailable && <div className={styles.cardOverlay}>{item.status === "RESERVED" ? "Đã đặt" : "Đã có khách"}</div>}
            </div>
        );
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    {step !== "type" && <button onClick={handleBack} className={styles.backButton}><ArrowLeft size={24} color="#D4AF37" /></button>}
                    <h2 className={styles.modalTitle}>{getTitle()}</h2>
                    <button onClick={handleClose} className={styles.closeButton}><X size={24} /></button>
                </div>

                {date && time && (
                    <div className={styles.dateInfo}>
                        <Calendar size={16} />
                        <span>Ngày đặt: {new Date(date).toLocaleDateString('vi-VN')} - {time}</span>
                    </div>
                )}

                {loading ? (
                    <div className={styles.spinnerContainer}><div className={styles.spinner}></div><p>Đang tải...</p></div>
                ) : (
                    <>
                        {step === "type" && (
                            <div className={styles.typeGrid}>
                                <div className={styles.typeCard} onClick={() => handleSelectType("room")}>
                                    <div className={styles.typeIcon}>🏠</div><h3>Đặt phòng</h3><p>Phòng riêng, không gian riêng tư</p>
                                    <div className={styles.typeHint}>Phù hợp cho nhóm từ 4-10 người</div>
                                </div>
                                <div className={styles.typeCard} onClick={() => handleSelectType("table")}>
                                    <div className={styles.typeIcon}>🍽️</div><h3>Đặt bàn</h3><p>Bàn trong khu vực chung</p>
                                    <div className={styles.typeHint}>Phù hợp cho nhóm từ 2-6 người</div>
                                </div>
                            </div>
                        )}

                        {(step === "roomAreas" || step === "tableAreas") && (
                            <div className={styles.grid}>
                                {areas.length === 0 ? <div className={styles.emptyState}><p>❌ Không có khu vực nào</p></div> :
                                    areas.map(area => (
                                        <div key={area} className={styles.areaCard} onClick={() => step === "roomAreas" ? handleSelectRoomArea(area) : handleSelectTableArea(area)}>
                                            <div className={styles.areaIcon}>📍</div><div className={styles.areaName}>{area}</div>
                                            <div className={styles.areaType}>{step === "roomAreas" ? "Khu vực phòng" : "Khu vực bàn"}</div>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {step === "rooms" && (
                            <>
                                <div className={styles.grid}>{rooms.map(room => <StatusCard key={room.id} item={room} type="room" onSelect={handleSelectRoom} />)}</div>
                                <div className={styles.legend}>
                                    <div className={styles.legendItem}><div className={`${styles.legendColor} ${styles.available}`}></div><span>Phòng trống</span></div>
                                    <div className={styles.legendItem}><div className={`${styles.legendColor} ${styles.reserved}`}></div><span>Đã đặt</span></div>
                                    <div className={styles.legendItem}><div className={`${styles.legendColor} ${styles.occupied}`}></div><span>Đã có khách</span></div>
                                </div>
                            </>
                        )}

                        {step === "tables" && (
                            <>
                                <div className={styles.grid}>{tables.map(table => <StatusCard key={table.id} item={table} type="table" onSelect={handleSelectTable} />)}</div>
                                <div className={styles.legend}>
                                    <div className={styles.legendItem}><div className={`${styles.legendColor} ${styles.available}`}></div><span>Bàn trống</span></div>
                                    <div className={styles.legendItem}><div className={`${styles.legendColor} ${styles.reserved}`}></div><span>Đã đặt</span></div>
                                    <div className={styles.legendItem}><div className={`${styles.legendColor} ${styles.occupied}`}></div><span>Đã có khách</span></div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default TableSelectionModal;