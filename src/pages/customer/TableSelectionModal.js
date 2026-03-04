import React, { useState, useEffect } from "react";
import styles from "./CafeCusSystem.module.css";
import { Grid3x3, ArrowLeft, MapPin, Building2 } from "lucide-react";

const TableSelectionModal = ({
    show = true,
    selectTable = () => { },
    onClose = () => { }
}) => {
    const [step, setStep] = useState("branches"); // "branches" → "areas" → "tables"
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);

    const API_BASE_URL = 'http://localhost:8080';

    // ✅ Fetch branches khi mở modal
    useEffect(() => {
        if (show) {
            fetchBranches();
        }
    }, [show]);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                alert("Vui lòng đăng nhập để chọn bàn!");
                onClose();
                // Chuyển hướng về trang login
                window.location.href = '/login';
                return;
            }

            const res = await fetch(`${API_BASE_URL}/api/branches`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Không thể tải chi nhánh');
            }

            const data = await res.json();
            console.log("🏢 Branches:", data);
            setBranches(data || []);
        } catch (err) {
            console.error("❌ Lỗi khi lấy chi nhánh:", err);
            alert("Không thể tải danh sách chi nhánh!");
        } finally {
            setLoading(false);
        }
    };

    const fetchAreas = async (branchId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await fetch(
                `${API_BASE_URL}/api/customer/tables/branch/${branchId}/areas`,
                { headers }
            );

            if (!res.ok) throw new Error('Không thể tải khu vực');

            const data = await res.json();
            console.log("📍 Areas:", data);
            setAreas(data || []);
            setStep("areas");
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
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await fetch(
                `${API_BASE_URL}/api/customer/tables/branch/${selectedBranch.id}/area/${encodeURIComponent(area)}`,
                { headers }
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

    const handleSelectBranch = (branch) => {
        console.log("🏢 Selected branch:", branch);
        setSelectedBranch(branch);
        fetchAreas(branch.id);
    };

    const handleSelectArea = (area) => {
        console.log("📍 Selected area:", area);
        setSelectedArea(area);
        fetchTablesByArea(area);
    };

    const handleSelectTable = (table) => {
        console.log("🏓 Selected table:", table);
        selectTable({
            id: table.id,
            number: table.number,
            branchId: selectedBranch.id,
            branchName: selectedBranch.name,
            area: selectedArea
        });
        onClose();
    };

    const handleBack = () => {
        if (step === "tables") {
            setStep("areas");
            setSelectedArea(null);
            setTables([]);
        } else if (step === "areas") {
            setStep("branches");
            setSelectedBranch(null);
            setAreas([]);
        }
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.modalBox}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '900px', minHeight: '500px' }}
            >
                {/* HEADER */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '24px'
                }}>
                    {step !== "branches" && (
                        <button
                            onClick={handleBack}
                            style={{
                                padding: '8px',
                                background: 'rgba(212, 175, 55, 0.1)',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                borderRadius: '8px',
                                color: '#D4AF37',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <h2 style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: '700',
                        color: '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        {step === "branches" && (
                            <>
                                <Building2 size={28} /> Chọn Chi Nhánh
                            </>
                        )}
                        {step === "areas" && (
                            <>
                                <MapPin size={28} /> Chọn Khu Vực
                                <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: '400' }}>
                                    ({selectedBranch?.name})
                                </span>
                            </>
                        )}
                        {step === "tables" && (
                            <>
                                <Grid3x3 size={28} /> Chọn Bàn
                                <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: '400' }}>
                                    ({selectedArea})
                                </span>
                            </>
                        )}
                    </h2>
                </div>

                {/* LOADING */}
                {loading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '80px 20px',
                        color: '#9ca3af'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            border: '5px solid rgba(212, 175, 55, 0.2)',
                            borderTopColor: '#D4AF37',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            margin: '0 auto 20px'
                        }}></div>
                        <p style={{ fontSize: '16px', fontWeight: '500' }}>Đang tải...</p>
                    </div>
                )}

                {/* CONTENT */}
                {!loading && (
                    <>
                        {/* BƯỚC 1: CHỌN CHI NHÁNH */}
                        {step === "branches" && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '20px',
                                padding: '10px 0'
                            }}>
                                {branches.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '60px 20px',
                                        gridColumn: '1 / -1',
                                        color: '#9ca3af'
                                    }}>
                                        <Building2 size={64} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
                                        <p style={{ fontSize: '16px' }}>Không có chi nhánh nào</p>
                                    </div>
                                ) : (
                                    branches.map((branch) => (
                                        <div
                                            key={branch.id}
                                            onClick={() => handleSelectBranch(branch)}
                                            style={{
                                                padding: '28px',
                                                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))',
                                                border: '2px solid rgba(212, 175, 55, 0.3)',
                                                borderRadius: '16px',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-6px)';
                                                e.currentTarget.style.boxShadow = '0 12px 32px rgba(212, 175, 55, 0.4)';
                                                e.currentTarget.style.borderColor = '#D4AF37';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                                            }}
                                        >
                                            <div style={{
                                                width: '70px',
                                                height: '70px',
                                                background: 'linear-gradient(135deg, #D4AF37, #B8941E)',
                                                borderRadius: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto 20px',
                                                boxShadow: '0 6px 16px rgba(212, 175, 55, 0.5)'
                                            }}>
                                                <Building2 size={36} color="#fff" strokeWidth={2.5} />
                                            </div>

                                            <h3 style={{
                                                fontSize: '20px',
                                                fontWeight: '700',
                                                color: '#e5e7eb',
                                                marginBottom: '10px',
                                                textAlign: 'center'
                                            }}>
                                                {branch.name}
                                            </h3>

                                            {branch.address && (
                                                <p style={{
                                                    fontSize: '14px',
                                                    color: '#9ca3af',
                                                    textAlign: 'center',
                                                    margin: 0,
                                                    lineHeight: '1.5'
                                                }}>
                                                    📍 {branch.address}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* BƯỚC 2: CHỌN KHU VỰC */}
                        {step === "areas" && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: '18px',
                                padding: '10px 0'
                            }}>
                                {areas.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '60px 20px',
                                        gridColumn: '1 / -1',
                                        color: '#9ca3af'
                                    }}>
                                        <MapPin size={64} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
                                        <p style={{ fontSize: '16px' }}>Không có khu vực nào</p>
                                    </div>
                                ) : (
                                    areas.map((area) => (
                                        <div
                                            key={area}
                                            onClick={() => handleSelectArea(area)}
                                            style={{
                                                padding: '26px',
                                                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(212, 175, 55, 0.04))',
                                                border: '2px solid rgba(212, 175, 55, 0.3)',
                                                borderRadius: '14px',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-5px)';
                                                e.currentTarget.style.boxShadow = '0 10px 28px rgba(212, 175, 55, 0.35)';
                                                e.currentTarget.style.borderColor = '#D4AF37';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                                            }}
                                        >
                                            <div style={{
                                                width: '65px',
                                                height: '65px',
                                                background: 'linear-gradient(135deg, #D4AF37, #B8941E)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto 18px',
                                                boxShadow: '0 5px 14px rgba(212, 175, 55, 0.45)'
                                            }}>
                                                <MapPin size={34} color="#fff" strokeWidth={2.5} />
                                            </div>

                                            <h3 style={{
                                                fontSize: '19px',
                                                fontWeight: '700',
                                                color: '#e5e7eb',
                                                marginBottom: 0
                                            }}>
                                                {area}
                                            </h3>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* BƯỚC 3: CHỌN BÀN */}
                        {step === "tables" && (
                            <>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                    gap: '18px',
                                    padding: '10px 0'
                                }}>
                                    {tables.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '60px 20px',
                                            gridColumn: '1 / -1',
                                            color: '#9ca3af'
                                        }}>
                                            <Grid3x3 size={64} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
                                            <p style={{ fontSize: '16px' }}>Không có bàn nào trong khu vực này</p>
                                        </div>
                                    ) : (
                                        tables.map((t) => (
                                            <div
                                                key={t.id}
                                                onClick={() => t.status === "available" && handleSelectTable(t)}
                                                style={{
                                                    padding: '24px 16px',
                                                    background: t.status === "available"
                                                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.05))'
                                                        : 'rgba(75, 85, 99, 0.15)',
                                                    border: t.status === "available"
                                                        ? '2px solid rgba(16, 185, 129, 0.4)'
                                                        : '2px solid rgba(75, 85, 99, 0.3)',
                                                    borderRadius: '14px',
                                                    textAlign: 'center',
                                                    cursor: t.status === "available" ? 'pointer' : 'not-allowed',
                                                    opacity: t.status === "available" ? 1 : 0.5,
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (t.status === "available") {
                                                        e.currentTarget.style.transform = 'translateY(-5px)';
                                                        e.currentTarget.style.boxShadow = '0 10px 28px rgba(16, 185, 129, 0.35)';
                                                        e.currentTarget.style.borderColor = '#10b981';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (t.status === "available") {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                                                    }
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: '36px',
                                                    marginBottom: '10px',
                                                    color: t.status === "available" ? '#10b981' : '#6b7280'
                                                }}>
                                                    {t.status === "available" ? "✓" : "✗"}
                                                </div>
                                                <div style={{
                                                    fontSize: '17px',
                                                    fontWeight: '700',
                                                    color: '#e5e7eb',
                                                    marginBottom: '6px'
                                                }}>
                                                    Bàn {t.number}
                                                </div>
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: t.status === "available" ? '#10b981' : '#9ca3af',
                                                    fontWeight: '500'
                                                }}>
                                                    {t.status === "available" ? "Trống" : "Đang phục vụ"}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* LEGEND */}
                                <div style={{
                                    display: 'flex',
                                    gap: 24,
                                    justifyContent: 'center',
                                    marginTop: 28,
                                    padding: '16px',
                                    background: 'rgba(31, 41, 55, 0.5)',
                                    borderRadius: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                                            border: '2px solid #10b981',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            color: '#10b981'
                                        }}>
                                            ✓
                                        </div>
                                        <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '500' }}>
                                            Bàn trống
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            background: 'rgba(75, 85, 99, 0.2)',
                                            border: '2px solid #6b7280',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            color: '#6b7280'
                                        }}>
                                            ✗
                                        </div>
                                        <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '500' }}>
                                            Đang phục vụ
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* CLOSE BUTTON */}
                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        marginTop: 24,
                        padding: '14px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '2px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        color: '#ef4444',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                    }}
                >
                    Đóng
                </button>
            </div>
        </div>
    );
};

export default TableSelectionModal;