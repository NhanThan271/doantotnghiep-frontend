import React, { useState, useEffect, useRef } from "react";
import axiosClient from "../../../api/axiosClient";
import styles from "./TableDetail.module.css";

const TransferPaymentPayOs = ({ show, onClose, totalAmount, orderId }) => {
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState("pending");
    const pollingInterval = useRef(null);

    useEffect(() => {
        if (show) {
            setQrData(null);
            setPaymentStatus("pending");
            setLoading(false);
        }
    }, [show]);

    useEffect(() => {
        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, []);

    const checkPaymentStatus = async (orderCode) => {
        try {
            const res = await axiosClient.get(`/payos/check-status/${orderCode}`);
            console.log("💳 Payment status:", res.data);

            if (res.data && res.data.code === "00" && res.data.data) {
                const status = res.data.data.status;

                if (status === "PAID") {
                    setPaymentStatus("success");
                    clearInterval(pollingInterval.current);

                    try {
                        await axiosClient.put(
                            `/customer/orders/${orderId}/pay?paymentMethod=MOBILE`
                        );
                        console.log("✅ Order status updated to PAID");
                    } catch (err) {
                        console.error("Error updating order status:", err);
                    }
                } else if (status === "CANCELLED") {
                    setPaymentStatus("cancelled");
                    clearInterval(pollingInterval.current);
                }
            }
        } catch (err) {
            console.error("Error checking payment status:", err);
        }
    };

    const handlePayOSPayment = async () => {
        try {
            setLoading(true);

            const uniqueOrderCode = Number(Date.now().toString().slice(-9));
            localStorage.setItem('currentOrderId', orderId);

            const payload = {
                orderCode: uniqueOrderCode,
                amount: Number(totalAmount),
                description: `Thanh toán đơn hàng ${orderId}`,
                returnUrl: `${window.location.origin}/payment-success?orderId=${orderId}`,
                cancelUrl: `${window.location.origin}/payment-cancel?orderId=${orderId}`,
                items: [
                    {
                        name: `Đơn hàng ${orderId}`,
                        quantity: 1,
                        price: Number(totalAmount)
                    }
                ]
            };

            console.log("Creating payment with orderCode:", uniqueOrderCode);

            const res = await axiosClient.post("/payos/create", payload);

            if (res.data && res.data.code === "00" && res.data.data) {
                setQrData({
                    checkoutUrl: res.data.data.checkoutUrl,
                    orderCode: uniqueOrderCode,
                    accountName: res.data.data.accountName
                });

                pollingInterval.current = setInterval(() => {
                    checkPaymentStatus(uniqueOrderCode);
                }, 3000);
            } else {
                throw new Error(res.data?.desc || "Không thể tạo mã thanh toán");
            }
        } catch (err) {
            console.error("PayOS error:", err);
            alert(err.response?.data?.desc || "Tạo mã thanh toán PayOS thất bại!");
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>Thanh toán PayOS</h3>
                    <button onClick={() => onClose(false)} className={styles.modalClose}>✕</button>
                </div>

                <p>Mã đơn: <strong>{orderId}</strong></p>
                <p>Tổng tiền: <strong>{Number(totalAmount || 0).toLocaleString("vi-VN")}đ</strong></p>

                <div style={{
                    textAlign: "center",
                    margin: "12px auto",
                    padding: "8px 16px",
                    backgroundColor: "#0088ff",
                    borderRadius: "8px",
                    display: "inline-block",
                    width: "fit-content",
                    marginLeft: "auto",
                    marginRight: "auto"
                }}>
                    <span style={{ color: "white", fontWeight: "bold", fontSize: "24px" }}>
                        Pay<span style={{ color: "#ffd700" }}>OS</span>
                    </span>
                </div>

                {paymentStatus === "success" && (
                    <div style={{
                        backgroundColor: "#d4edda",
                        color: "#155724",
                        padding: "10px",
                        borderRadius: "5px",
                        textAlign: "center",
                        marginBottom: "10px"
                    }}>
                        ✅ Thanh toán thành công!
                    </div>
                )}

                {!qrData && (
                    <button
                        onClick={handlePayOSPayment}
                        className={styles.orderBtn}
                        style={{
                            backgroundColor: "#0d6efd",
                            marginTop: "16px"
                        }}
                        disabled={loading}
                    >
                        {loading ? "Đang tạo..." : "Tạo mã thanh toán PayOS"}
                    </button>
                )}

                {qrData && paymentStatus === "pending" && (
                    <>
                        <div style={{
                            textAlign: "center",
                            margin: "20px 0",
                            padding: "15px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px"
                        }}>
                            <p style={{ fontSize: "14px", color: "#666" }}>
                                Chủ tài khoản: <strong>{qrData.accountName}</strong>
                            </p>
                        </div>

                        <button
                            onClick={() => window.open(qrData.checkoutUrl, '_blank')}
                            className={styles.orderBtn}
                            style={{
                                backgroundColor: "#198754",
                                marginTop: "8px"
                            }}
                        >
                            Mở trang thanh toán PayOS
                        </button>
                    </>
                )}

                <button
                    onClick={() => {
                        if (pollingInterval.current) {
                            clearInterval(pollingInterval.current);
                        }
                        const isPaid = paymentStatus === "success";
                        onClose(isPaid);
                    }}
                    className={styles.printBtn}
                    style={{
                        marginTop: "16px",
                        background: paymentStatus === "success" ? "#28a745" : "#6c757d"
                    }}
                >
                    {paymentStatus === "success" ? "✅ Hoàn tất" : "Đóng"}
                </button>
            </div>
        </div>
    );
};

export default TransferPaymentPayOs;