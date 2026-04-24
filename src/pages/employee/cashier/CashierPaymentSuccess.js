import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";

const API = "http://localhost:8080";

const CashierPaymentSuccess = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const processPayment = async () => {
            try {
                const tempPaymentData = sessionStorage.getItem('tempCashierPayment');
                if (!tempPaymentData) {
                    setTimeout(() => navigate('/cashier/tables'), 2000);
                    return;
                }

                const paymentData = JSON.parse(tempPaymentData);
                console.log("💰 Payment success for order:", paymentData);

                // Thanh toán đơn hàng
                await axiosClient.put(`/customer/orders/${paymentData.orderId}/pay?paymentMethod=MOBILE`);

                // Cập nhật trạng thái bàn/phòng
                const updateUrl = paymentData.entityType === "Phòng"
                    ? `${API}/api/rooms/${paymentData.entityNumber}/status?status=FREE`
                    : `${API}/api/tables/${paymentData.entityNumber}/status?status=FREE`;

                const token = localStorage.getItem("token");
                await fetch(updateUrl, {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
                });

                sessionStorage.removeItem('tempCashierPayment');

                setTimeout(() => {
                    navigate('/cashier/tables');
                }, 2000);
            } catch (error) {
                console.error("Error processing payment:", error);
                setTimeout(() => navigate('/cashier/tables'), 2000);
            }
        };

        processPayment();
    }, [navigate]);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}>
            <div style={{
                background: "white",
                padding: "40px 60px",
                borderRadius: "16px",
                textAlign: "center"
            }}>
                <div style={{ fontSize: "72px" }}>✅</div>
                <h1 style={{ color: "#28a745" }}>Thanh toán thành công!</h1>
                <p>Đang chuyển về trang quản lý bàn...</p>
            </div>
        </div>
    );
};

export default CashierPaymentSuccess;