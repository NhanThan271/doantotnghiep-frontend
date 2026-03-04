import React, { useEffect } from "react";
import axiosClient from "../../api/axiosClient";

const PaymentSuccess = () => {
    useEffect(() => {
        const updateOrderStatus = async () => {
            try {
                // Lấy orderId từ URL params hoặc localStorage
                const urlParams = new URLSearchParams(window.location.search);
                const orderId = urlParams.get('orderId') || localStorage.getItem('currentOrderId');

                if (!orderId) {
                    console.error("Không tìm thấy orderId");
                    closeWindow();
                    return;
                }

                console.log("Đang cập nhật trạng thái đơn #" + orderId);

                // GỌI API CẬP NHẬT TRẠNG THÁI
                await axiosClient.put(
                    `/customer/orders/${orderId}/pay?paymentMethod=MOBILE`
                );

                console.log("Đã cập nhật trạng thái đơn hàng thành công!");

                // Thông báo cho window cha
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'PAYMENT_SUCCESS',
                        orderId: orderId,
                        message: 'Thanh toán thành công!',
                        shouldUpdateTables: true
                    }, '*');
                }

                // Đóng tab sau 1.5 giây
                setTimeout(() => {
                    closeWindow();
                }, 1500);

            } catch (error) {
                console.error("Lỗi khi cập nhật trạng thái:", error);

                // Vẫn đóng tab nhưng báo lỗi
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'PAYMENT_ERROR',
                        message: 'Thanh toán thành công nhưng không thể cập nhật trạng thái!'
                    }, '*');
                }

                setTimeout(() => {
                    closeWindow();
                }, 2000);
            }
        };

        const closeWindow = () => {
            if (window.opener) {
                window.close();
            } else {
                window.location.href = "/employee";
            }
        };

        updateOrderStatus();
    }, []);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "Arial, sans-serif",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}>
            <div style={{
                background: "white",
                padding: "40px 60px",
                borderRadius: "16px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                textAlign: "center"
            }}>
                <div style={{ fontSize: "72px", marginBottom: "20px" }}>✅</div>
                <h1 style={{
                    color: "#28a745",
                    marginBottom: "10px",
                    fontSize: "28px"
                }}>
                    Thanh toán thành công!
                </h1>
                <p style={{
                    color: "#6c757d",
                    fontSize: "16px",
                    marginTop: "10px"
                }}>
                    Đang cập nhật đơn hàng...
                </p>
                <div style={{
                    marginTop: "20px",
                    display: "flex",
                    gap: "8px",
                    justifyContent: "center"
                }}>
                    <div style={{
                        width: "8px",
                        height: "8px",
                        background: "#28a745",
                        borderRadius: "50%",
                        animation: "pulse 1s infinite"
                    }}></div>
                    <div style={{
                        width: "8px",
                        height: "8px",
                        background: "#28a745",
                        borderRadius: "50%",
                        animation: "pulse 1s infinite 0.2s"
                    }}></div>
                    <div style={{
                        width: "8px",
                        height: "8px",
                        background: "#28a745",
                        borderRadius: "50%",
                        animation: "pulse 1s infinite 0.4s"
                    }}></div>
                </div>
            </div>
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 0.3; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.2); }
                    }
                `}
            </style>
        </div>
    );
};

export default PaymentSuccess;