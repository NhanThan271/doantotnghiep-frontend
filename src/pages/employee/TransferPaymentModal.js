import React from "react";
import axiosClient from "../../api/axiosClient";  // đường dẫn tùy bạn để
import styles from "./CafeStaffSystem.module.css";

const TransferPaymentModal = ({ show, onClose, totalAmount, orderId }) => {
    if (!show) return null;

    const handleMomoPayment = async () => {
        try {
            const res = await axiosClient.post("/momo/create-payment", {
                orderId: orderId,
                amount: totalAmount,
                orderInfo: `Thanh toan don hang ${orderId}`
            });

            console.log("MoMo resp:", res.data);

            if (res.data?.payUrl) {
                window.location.href = res.data.payUrl;
            } else {
                alert("Không nhận được payUrl từ MoMo!");
            }
        } catch (err) {
            console.error("MoMo error:", err);
            alert("Tạo thanh toán MoMo thất bại!");
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>

                <h2 style={{ color: "black", fontSize: "20px", fontWeight: "bold" }}>
                    Thanh toán MoMo
                </h2>

                <p>Mã đơn: {orderId}</p>

                <p>
                    Tổng tiền:{" "}
                    <strong>{(totalAmount || 0).toLocaleString("vi-VN")}đ</strong>
                </p>

                <img
                    src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                    alt="MoMo"
                    style={{
                        width: 120,
                        height: 120,
                        margin: "12px auto",
                        display: "block",
                        borderRadius: 12
                    }}
                />

                <button
                    onClick={handleMomoPayment}
                    className={styles.confirmBtn}
                    style={{
                        backgroundColor: "#a50064",
                        border: "none",
                        color: "white",
                        fontWeight: "bold"
                    }}
                >
                    Thanh toán bằng MoMo
                </button>

                <button
                    onClick={() => onClose(false)}
                    className={styles.confirmBtn}
                    style={{ marginTop: 10, backgroundColor: "#ccc", color: "black" }}
                >
                    Hủy
                </button>
            </div>
        </div>
    );
};

export default TransferPaymentModal;
