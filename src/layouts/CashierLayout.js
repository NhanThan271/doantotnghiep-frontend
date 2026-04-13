import React, { useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";

const CashierLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();

    const toggleSidebar = () => {
        const newState = !isSidebarOpen;
        setIsSidebarOpen(newState);

        // 👉 mở sidebar → đi tới trang kết ca
        if (newState) {
            navigate("/employee/cashier/shift");
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>

            {/* SIDEBAR */}
            <div style={{
                width: isSidebarOpen ? 230 : 0,
                background: "#0b3c5d",
                color: "white",
                overflow: "hidden",
                transition: "all 0.3s ease"
            }}>
                <div style={{ padding: 15, fontWeight: "bold" }}>
                    QUẢN LÝ CA
                </div>

                <div
                    onClick={() => navigate("/employee/cashier/shift")}
                    style={{ padding: "10px 15px", cursor: "pointer" }}
                >
                    Ca làm việc
                </div>

                <div style={{ padding: "10px 15px" }}>Lịch sử</div>
                <div style={{ padding: "10px 15px" }}>Rút tiền</div>
            </div>

            {/* MAIN */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

                {/* TOPBAR */}
                <div style={{
                    height: 50,
                    background: "#1e40af",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 15px",
                    gap: 20
                }}>
                    {/* ☰ */}
                    <div
                        onClick={toggleSidebar}
                        style={{ fontSize: 20, cursor: "pointer" }}
                    >
                        ☰
                    </div>

                    {/* 👉 TẤT CẢ BÀN */}
                    <span
                        onClick={() => {
                            navigate("/employee/cashier/tables");
                            setIsSidebarOpen(false); // ẩn sidebar
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        Tất cả bàn
                    </span>

                    <span
                        onClick={() => {
                            navigate("/employee/cashier/booking");
                            setIsSidebarOpen(false);
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        Đặt bàn
                    </span>
                </div>

                {/* CONTENT */}
                <div style={{
                    flex: 1,
                    background: "linear-gradient(135deg,#1e3a8a,#2563eb)",
                    padding: 20
                }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default CashierLayout;