// frontend/src/pages/client/booking/PaymentCancel.js
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PaymentCancel = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // 🔥 Xóa dữ liệu tạm thời nếu có
        const tempBookingData = sessionStorage.getItem('tempBooking');
        if (tempBookingData) {
            sessionStorage.removeItem('tempBooking');
            console.log("🗑️ Đã xóa dữ liệu đặt bàn tạm thời");
        }

        // Hiển thị thông báo
        alert("Thanh toán đã bị hủy! Vui lòng thử lại.");

        // 🔥 Chuyển về trang đặt bàn chi tiết sau 1.5 giây
        setTimeout(() => {
            navigate("/dat-ban-chi-tiet");
        }, 1500);
    }, [navigate]);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "Arial, sans-serif",
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
        }}>
            <div style={{
                background: "white",
                padding: "40px 60px",
                borderRadius: "16px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                textAlign: "center"
            }}>
                <div style={{ fontSize: "72px", marginBottom: "20px" }}>❌</div>
                <h1 style={{
                    color: "#dc3545",
                    marginBottom: "10px",
                    fontSize: "28px"
                }}>
                    Thanh toán đã bị hủy
                </h1>
                <p style={{
                    color: "#6c757d",
                    fontSize: "16px",
                    marginTop: "10px"
                }}>
                    Bạn có thể thử lại hoặc liên hệ nhà hàng để được hỗ trợ.
                </p>
                <p style={{
                    color: "#6c757d",
                    fontSize: "14px",
                    marginTop: "10px"
                }}>
                    Đang chuyển về trang đặt bàn...
                </p>
                <button
                    onClick={() => navigate("/dat-ban-chi-tiet")}
                    style={{
                        marginTop: "20px",
                        padding: "10px 24px",
                        background: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                    }}
                >
                    Quay lại đặt bàn
                </button>
            </div>
        </div>
    );
};

export default PaymentCancel;