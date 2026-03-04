import React from "react";
import styles from "./CafeStaffSystem.module.css";
import { DollarSign, Check } from "lucide-react";

const PaymentModal = ({ show = false, selectedOrder = null, cashReceived = "", setCashReceived = () => { }, calculateChange = () => 0, completePayment = () => { }, onClose = () => { } }) => {
    if (!show || !selectedOrder) return null;

    const total = selectedOrder.total;
    const received = parseFloat(cashReceived || 0);
    const change = calculateChange();

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalBoxSmall} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.modalTitle}><DollarSign size={24} /> Thanh Toán Tiền Mặt</h2>

                <div className={styles.orderSummary}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Bàn:</span><strong>Bàn {selectedOrder.table}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Khách:</span><strong>{selectedOrder.customer}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                        <span>Tổng tiền:</span><strong style={{ color: "#e5e7eb" }}>{total.toLocaleString("vi-VN")}đ</strong>
                    </div>
                </div>

                <label>Tiền khách đưa:</label>
                <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className={styles.cashInput} />

                <div className={styles.quickButtons}>
                    {[20000, 50000, 100000, 200000, 500000].map(a => (
                        <button key={a} className={styles.quickBtn} onClick={() => setCashReceived(a.toString())}>{a.toLocaleString("vi-VN")}đ</button>
                    ))}
                    <button className={`${styles.quickBtn} ${styles.exactBtn}`} onClick={() => setCashReceived(total.toString())}>Vừa đủ</button>
                </div>

                {cashReceived && received >= total && (
                    <div className={styles.changeBox}>
                        Tiền thừa: <strong>{change.toLocaleString("vi-VN")}đ</strong>
                    </div>
                )}
                {cashReceived && received < total && (
                    <div className={styles.lackBox}>
                        Thiếu: <strong>{(total - received).toLocaleString("vi-VN")}đ</strong>
                    </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className={styles.cancelBtn} onClick={onClose}>Hủy</button>
                    <button className={styles.confirmBtn} disabled={received < total} onClick={() => completePayment(selectedOrder.id)}>
                        <Check size={16} /> Xác Nhận Thanh Toán
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
