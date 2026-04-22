import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PaymentCancel = () => {
    const navigate = useNavigate();

    useEffect(() => {
        sessionStorage.setItem('paymentCancelled', 'true');
        const lastBranch = sessionStorage.getItem('lastBranch');
        console.log("Thanh toán bị hủy, đang khôi phục dữ liệu...");
        navigate('/dat-ban-chi-tiet', {
            state: { cancelled: true, branch: lastBranch ? JSON.parse(lastBranch) : null, restoreFromCancel: true },
            replace: true
        });
    }, [navigate]);

    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100vh", fontFamily: "Arial, sans-serif", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
        }}>
            <div style={{ background: "white", padding: "40px 60px", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", textAlign: "center" }}>
                <div style={{ fontSize: "72px", marginBottom: "20px" }}>❌</div>
                <h1 style={{ color: "#dc3545", marginBottom: "10px", fontSize: "28px" }}>Thanh toán đã bị hủy</h1>
                <p style={{ color: "#6c757d", fontSize: "16px", marginTop: "10px" }}>Bạn có thể thử lại hoặc liên hệ nhà hàng để được hỗ trợ.</p>
                <p style={{ color: "#6c757d", fontSize: "14px", marginTop: "10px" }}>Đang quay lại trang đặt bàn...</p>
            </div>
        </div>
    );
};

export default PaymentCancel;