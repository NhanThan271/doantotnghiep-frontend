// frontend/src/pages/client/booking/PaymentSuccess.js
import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API = "http://localhost:8080";

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderCode = searchParams.get('orderCode');

    useEffect(() => {
        const createReservationAfterPayment = async () => {
            try {
                const tempBookingData = sessionStorage.getItem('tempBooking');

                if (!tempBookingData) {
                    console.error("Không tìm thấy dữ liệu đặt bàn");
                    setTimeout(() => navigate("/dat-ban-chi-tiet"), 2000);
                    return;
                }

                const bookingData = JSON.parse(tempBookingData);

                if (bookingData.orderCode !== parseInt(orderCode)) {
                    console.error("OrderCode không khớp");
                    setTimeout(() => navigate("/dat-ban-chi-tiet"), 2000);
                    return;
                }

                const token = localStorage.getItem('token');
                const response = await fetch(`${API}/api/reservations/full`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(bookingData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Tạo đặt bàn thất bại");
                }

                console.log("✅ Reservation created:", result);

                sessionStorage.removeItem('tempBooking');

                alert(`🎉 Đặt bàn thành công!\nMã đặt bàn: ${result.id}\nSố tiền: ${bookingData.depositAmount?.toLocaleString()}đ`);

            } catch (error) {
                console.error("Lỗi tạo reservation:", error);
                alert("Thanh toán thành công nhưng đặt bàn thất bại. Vui lòng liên hệ nhà hàng!");
            } finally {
                setTimeout(() => {
                    navigate("/dat-ban-chi-tiet");
                }, 2000);
            }
        };

        createReservationAfterPayment();
    }, [navigate, orderCode]);

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
                <h1 style={{ color: "#28a745", marginBottom: "10px", fontSize: "28px" }}>
                    Thanh toán thành công!
                </h1>
                <p style={{ color: "#6c757d", fontSize: "16px", marginTop: "10px" }}>
                    Đang xử lý đặt bàn của bạn...
                </p>
                <p style={{ color: "#6c757d", fontSize: "14px", marginTop: "10px" }}>
                    Bạn sẽ được chuyển về trang đặt bàn sau vài giây.
                </p>
                <div style={{ marginTop: "20px", display: "flex", gap: "8px", justifyContent: "center" }}>
                    <div style={{ width: "8px", height: "8px", background: "#28a745", borderRadius: "50%", animation: "pulse 1s infinite" }}></div>
                    <div style={{ width: "8px", height: "8px", background: "#28a745", borderRadius: "50%", animation: "pulse 1s infinite 0.2s" }}></div>
                    <div style={{ width: "8px", height: "8px", background: "#28a745", borderRadius: "50%", animation: "pulse 1s infinite 0.4s" }}></div>
                </div>
                <button
                    onClick={() => navigate("/dat-ban-chi-tiet")}
                    style={{
                        marginTop: "20px",
                        padding: "10px 24px",
                        background: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                    }}
                >
                    Về trang đặt bàn
                </button>
            </div>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
};

export default PaymentSuccess;