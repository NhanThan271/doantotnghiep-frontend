import React from "react";
import styles from "./CafeStaffSystem.module.css";

const PaymentMethodModal = ({ show, onClose, onSelect }) => {
    if (!show) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent2}>
                <h2>Chọn phương thức thanh toán</h2>

                <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
                    <button onClick={() => onSelect("cash")} className={styles.confirmBtn}>
                        Tiền mặt
                    </button>
                    <button onClick={() => onSelect("momo")} className={styles.confirmBtn}>
                        Momo
                    </button>
                    <button onClick={() => onSelect("transfer")} className={styles.confirmBtn}>
                        Chuyển khoản
                    </button>
                    <button onClick={() => onSelect("card")} className={styles.confirmBtn}>
                        Thẻ
                    </button>
                </div>

                <button onClick={onClose} className={styles.cancelBtn} style={{ marginTop: "16px" }}>
                    Hủy
                </button>
            </div>
        </div>
    );
};

export default PaymentMethodModal;
