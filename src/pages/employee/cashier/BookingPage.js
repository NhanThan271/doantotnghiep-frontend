import React from "react";

const BookingPage = () => {
    return (
        <div style={{
            background: "white",
            borderRadius: 10,
            padding: 20
        }}>
            <h2>📅 Đặt bàn</h2>

            <div style={{ marginBottom: 10 }}>
                <label>Tên khách</label>
                <input style={inputStyle} placeholder="Nhập tên..." />
            </div>

            <div style={{ marginBottom: 10 }}>
                <label>Số điện thoại</label>
                <input style={inputStyle} placeholder="Nhập SĐT..." />
            </div>

            <div style={{ marginBottom: 10 }}>
                <label>Thời gian</label>
                <input type="datetime-local" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 10 }}>
                <label>Số người</label>
                <input type="number" style={inputStyle} />
            </div>

            <button style={btnStyle}>
                Đặt bàn
            </button>
        </div>
    );
};

const inputStyle = {
    width: "100%",
    padding: 8,
    marginTop: 5,
    borderRadius: 5,
    border: "1px solid #ccc"
};

const btnStyle = {
    padding: 10,
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: 5,
    marginTop: 10
};

export default BookingPage;