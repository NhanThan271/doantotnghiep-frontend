import React from "react";

const ShiftPage = () => {
    return (
        <div style={{
            background: "white",
            borderRadius: 10,
            padding: 20
        }}>
            <h2>Ca làm việc</h2>
            <p>Tiền đầu ca</p>
            <p>Thu tiền</p>
            <p>Chi tiền</p>
            <p>Doanh thu</p>

            <button style={{
                marginTop: 20,
                padding: 10,
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 5
            }}>
                Kết ca làm việc
            </button>
        </div>
    );
};

export default ShiftPage;