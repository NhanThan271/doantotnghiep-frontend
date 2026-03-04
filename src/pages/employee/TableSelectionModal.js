import React, { useState, useEffect } from "react";
import styles from "./CafeStaffSystem.module.css";
import { Grid3x3, ArrowLeft, MapPin } from "lucide-react";

const TableSelectionModal = ({
    show = true,
    selectTable = () => { },
    onClose = () => { },
    branchId = null
}) => {
    const [step, setStep] = useState("areas"); // "areas" hoặc "tables"
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);

    const API_BASE_URL = 'http://localhost:8080';

    // Fetch areas khi mở modal
    useEffect(() => {
        if (show && branchId) {
            fetchAreas();
        }
    }, [show, branchId]);

    const fetchAreas = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/api/customer/tables/branch/${branchId}/areas`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (!res.ok) throw new Error('Không thể tải khu vực');

            const data = await res.json();
            console.log("📍 Areas:", data);
            setAreas(data || []);
        } catch (err) {
            console.error("❌ Lỗi khi lấy khu vực:", err);
            alert("Không thể tải danh sách khu vực!");
        } finally {
            setLoading(false);
        }
    };

    const fetchTablesByArea = async (area) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/api/customer/tables/branch/${branchId}/area/${encodeURIComponent(area)}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (!res.ok) throw new Error('Không thể tải bàn');

            const data = await res.json();
            console.log("🏓 Tables:", data);

            const mappedTables = data.map((t) => ({
                id: t.id,
                number: t.number,
                status: t.status === "FREE" ? "available" : "occupied",
            }));

            setTables(mappedTables);
            setStep("tables");
        } catch (err) {
            console.error("❌ Lỗi khi lấy bàn:", err);
            alert("Không thể tải danh sách bàn!");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectArea = (area) => {
        setSelectedArea(area);
        fetchTablesByArea(area);
    };

    const handleSelectTable = (table) => {
        selectTable({
            id: table.id,
            number: table.number
        });
        onClose();
    };

    const handleBack = () => {
        setStep("areas");
        setSelectedArea(null);
        setTables([]);
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.modalBox}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '800px', minHeight: '500px' }}
            >
                {/* HEADER */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '24px'
                }}>
                    {step === "tables" && (
                        <button
                            onClick={handleBack}
                            style={{
                                padding: '8px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '8px',
                                color: '#3B82F6',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <h2 className={styles.modalTitle} style={{ margin: 0 }}>
                        {step === "areas" ? (
                            <>
                                <MapPin size={24} /> Chọn Khu Vực
                            </>
                        ) : (
                            <>
                                <Grid3x3 size={24} /> Chọn Bàn - {selectedArea}
                            </>
                        )}
                    </h2>
                </div>

                {/* LOADING */}
                {loading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#9ca3af'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid #e5e7eb',
                            borderTopColor: '#3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 16px'
                        }}></div>
                        Đang tải...
                    </div>
                )}

                {/* CONTENT */}
                {!loading && (
                    <>
                        {/* BƯỚC 1: CHỌN KHU VỰC */}
                        {step === "areas" && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '16px',
                                padding: '10px'
                            }}>
                                {areas.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '40px',
                                        gridColumn: '1 / -1',
                                        color: '#9ca3af'
                                    }}>
                                        Không có khu vực nào
                                    </div>
                                ) : (
                                    areas.map((area) => (
                                        <div
                                            key={area}
                                            onClick={() => handleSelectArea(area)}
                                            style={{
                                                padding: '24px',
                                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                                                border: '2px solid rgba(59, 130, 246, 0.3)',
                                                borderRadius: '16px',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.3s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3)';
                                                e.currentTarget.style.borderColor = '#3B82F6';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                            }}
                                        >
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto 16px',
                                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
                                            }}>
                                                <MapPin size={32} color="#fff" />
                                            </div>

                                            <h3 style={{
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                color: 'var(--color-text-primary)',
                                                marginBottom: 0
                                            }}>
                                                {area}
                                            </h3>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* BƯỚC 2: CHỌN BÀN */}
                        {step === "tables" && (
                            <>
                                <div className={styles.tableGrid}>
                                    {tables.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '40px',
                                            gridColumn: '1 / -1',
                                            color: '#9ca3af'
                                        }}>
                                            Không có bàn nào trong khu vực này
                                        </div>
                                    ) : (
                                        tables.map((t) => (
                                            <div
                                                key={t.id}
                                                className={`${styles.tableCard} ${t.status === "available"
                                                    ? styles.tableAvailable
                                                    : styles.tableBusy
                                                    }`}
                                                onClick={() => t.status === "available" && handleSelectTable(t)}
                                            >
                                                <div className={styles.tableIcon}>
                                                    {t.status === "available" ? "✓" : "✗"}
                                                </div>
                                                <div className={styles.tableName}>Bàn {t.number}</div>
                                                <div className={styles.tableSub}>
                                                    {t.status === "available" ? "Trống" : "Đang phục vụ"}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                                    <div style={{ flex: 1, textAlign: "center" }}>
                                        <div className={styles.legendBoxAvailable}></div>
                                        <div className={styles.legendTxt}>Bàn trống</div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: "center" }}>
                                        <div className={styles.legendBoxBusy}></div>
                                        <div className={styles.legendTxt}>Đang phục vụ</div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* CLOSE BUTTON */}
                <button
                    className={styles.closeBtnModal}
                    onClick={onClose}
                    style={{ marginTop: 16 }}
                >
                    Đóng
                </button>
            </div>
        </div>
    );
};

export default TableSelectionModal;