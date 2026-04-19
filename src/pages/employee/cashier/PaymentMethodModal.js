import React from "react";
import styles from "./TableDetail.module.css";

const PaymentMethodModal = ({ show, onClose, onSelect }) => {
    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Chọn phương thức thanh toán</h3>
                    <button onClick={onClose} className={styles.modalClose}>
                        ✕
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                    <button
                        onClick={() => onSelect("cash")}
                        className={styles.orderBtn}
                        style={{ background: "#10b981" }}
                    >
                        💵 Tiền mặt
                    </button>

                    <button
                        onClick={() => onSelect("momo")}
                        className={styles.orderBtn}
                        style={{ background: "#a50064" }}
                    >
                        🟣 Momo
                    </button>

                    <button
                        onClick={() => onSelect("transfer")}
                        className={styles.orderBtn}
                        style={{ background: "#0d6efd" }}
                    >
                        🏦 Chuyển khoản
                    </button>

                    <button
                        onClick={() => onSelect("card")}
                        className={styles.orderBtn}
                        style={{ background: "#6c757d" }}
                    >
                        💳 Thẻ
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className={styles.printBtn}
                    style={{ marginTop: "16px", background: "#6c757d" }}
                >
                    Hủy
                </button>
            </div>
        </div>
    );
};

export default PaymentMethodModal;