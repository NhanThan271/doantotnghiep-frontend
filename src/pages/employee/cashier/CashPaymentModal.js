import React, { useState } from "react";
import styles from "./TableDetail.module.css";

const CashPaymentModal = ({ show, onClose, onConfirm, totalAmount }) => {
    const [cashReceived, setCashReceived] = useState("");

    if (!show) return null;

    const total = totalAmount || 0;
    const received = parseFloat(cashReceived) || 0;
    const change = received - total;
    const isValid = received >= total;

    const handleConfirm = () => {
        if (isValid) {
            onConfirm();
            onClose();
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>💵 Thanh toán tiền mặt</h3>
                    <button onClick={onClose} className={styles.modalClose}>✕</button>
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                        <span>Tổng tiền:</span>
                        <strong style={{ color: "#d32f2f", fontSize: "20px" }}>
                            {total.toLocaleString('vi-VN')}đ
                        </strong>
                    </div>

                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                        Tiền khách đưa:
                    </label>
                    <input
                        type="number"
                        className={styles.searchInput}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="Nhập số tiền khách đưa"
                        style={{ fontSize: "16px", marginBottom: "10px" }}
                    />

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                        {[20000, 50000, 100000, 200000, 500000].map(amount => (
                            <button
                                key={amount}
                                onClick={() => setCashReceived(amount.toString())}
                                style={{
                                    padding: "8px 12px",
                                    background: "#f1f3ee",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer"
                                }}
                            >
                                {amount.toLocaleString('vi-VN')}đ
                            </button>
                        ))}
                        <button
                            onClick={() => setCashReceived(total.toString())}
                            style={{
                                padding: "8px 12px",
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer"
                            }}
                        >
                            Vừa đủ
                        </button>
                    </div>

                    {cashReceived && (
                        <div style={{
                            padding: "10px",
                            borderRadius: "8px",
                            background: isValid ? "#d4edda" : "#f8d7da",
                            color: isValid ? "#155724" : "#721c24",
                            marginTop: "10px"
                        }}>
                            {isValid ? (
                                <>💰 Tiền thừa: <strong>{change.toLocaleString('vi-VN')}đ</strong></>
                            ) : (
                                <>⚠️ Còn thiếu: <strong>{(total - received).toLocaleString('vi-VN')}đ</strong></>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={onClose} className={styles.printBtn} style={{ flex: 1, background: "#6c757d" }}>
                        Hủy
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid}
                        className={styles.orderBtn}
                        style={{ flex: 1, background: "#10b981", opacity: isValid ? 1 : 0.5 }}
                    >
                        Xác nhận thanh toán
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CashPaymentModal;