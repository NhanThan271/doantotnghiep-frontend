import React, { useEffect } from "react";

const PaymentCancel = () => {
    useEffect(() => {
        // Hiển thị thông báo ngắn
        alert("Thanh toán đã bị hủy!");

        // Đóng tab hiện tại
        window.close();

        // Nếu không đóng được (do browser security), redirect về trang chính
        setTimeout(() => {
            if (window.opener) {
                // Nếu mở từ window.open, reload trang cha
                window.opener.location.reload();
                window.close();
            } else {
                // Nếu không, redirect về trang chính
                window.location.href = "/employee";
            }
        }, 1000);
    }, []);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "Arial, sans-serif"
        }}>
            <h1 style={{ color: "#dc3545" }}>❌ Thanh toán đã bị hủy</h1>
            <p>Đang đóng cửa sổ...</p>
        </div>
    );
};

export default PaymentCancel;