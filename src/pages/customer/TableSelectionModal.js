import React, { useState, useEffect } from "react";
import { Grid3x3, ArrowLeft, MapPin } from "lucide-react";
import styles from "./TableSelectionModal.module.css";

const TableSelectionModal = ({
    show = false,
    onClose = () => { },
    selectTable = () => { },
    branchId,
    date,
    time
}) => {
    const [step, setStep] = useState("areas");
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);

    const API = "http://localhost:8080";

    useEffect(() => {
        console.log("🔥 branchId FE gửi:", branchId);
        if (show && branchId) {
            fetchAreas();
        }
    }, [show, branchId]);

    const fetchAreas = async () => {
        setLoading(true);
        try {
            // ✅ SỬA: đúng URL
            const res = await fetch(
                `${API}/api/tables/branch/${branchId}/areas`
            );

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
            // ✅ SỬA: đúng URL, không có khoảng trắng
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
            id: table.id,
            number: table.number,
            branchId,
            area: selectedArea,
            capacity: table.capacity
        });

        onClose();
    };

    const handleBack = () => {
        if (step === "tables") {
            setStep("areas");
            setTables([]);
            setSelectedArea(null);
        }
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.modalBox}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "800px", minHeight: "500px" }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    {step === "tables" && (
                        <button
                            onClick={handleBack}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px'
                            }}
                        >
                            <ArrowLeft size={20} color="#D4AF37" />
                        </button>
                    )}
                    <h2 style={{ color: "#e5e7eb", margin: 0 }}>
                        {step === "areas" && "📍 Chọn khu vực"}
                        {step === "tables" && `🪑 Chọn bàn (${selectedArea})`}
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
                        📅 Đặt bàn ngày: {new Date(date).toLocaleDateString('vi-VN')} - {time}
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
                        {step === "areas" && (
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
                                            {area}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {step === "tables" && (
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
                                        <span style={{ fontSize: "12px", color: "#9ca3af" }}>Trống</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{ width: "24px", height: "24px", background: "#ef4444", borderRadius: "4px" }}></div>
                                        <span style={{ fontSize: "12px", color: "#9ca3af" }}>Đã có khách</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                <button onClick={onClose} className={styles.closeBtn}>
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