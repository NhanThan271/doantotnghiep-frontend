import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";

const CashierLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState({});
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);
    }, []);

    const toggleSidebar = () => {
        const newState = !isSidebarOpen;
        setIsSidebarOpen(newState);

        // 👉 mở sidebar → đi tới trang kết ca
        if (newState) {
            navigate("/cashier/dashboard");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>

            {/* SIDEBAR */}
            <div style={{
                width: isSidebarOpen ? 230 : 0,
                background: "#0b3c5d",
                color: "white",
                overflow: "hidden",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column"
            }}>
                {/* Header QUẢN LÝ CA */}
                <div style={{ padding: "15px 15px 0 15px", fontWeight: "bold" }}>
                    QUẢN LÝ CA
                </div>

                {/* Menu items */}
                <div
                    onClick={() => navigate("/cashier/dashboard")}
                    style={{
                        padding: "10px 15px",
                        cursor: "pointer",
                        marginTop: 10,
                        background: location.pathname === "/cashier/dashboard" ? "rgba(212,175,55,0.2)" : "transparent",
                        borderLeft: location.pathname === "/cashier/dashboard" ? "3px solid #D4AF37" : "3px solid transparent"
                    }}
                >
                    📊 Dashboard
                </div>

                <div
                    onClick={() => navigate("/cashier/bill")}
                    style={{
                        padding: "10px 15px",
                        cursor: "pointer",
                        background: location.pathname === "/cashier/bill" ? "rgba(212,175,55,0.2)" : "transparent",
                        borderLeft: location.pathname === "/cashier/bill" ? "3px solid #D4AF37" : "3px solid transparent"
                    }}
                >
                    🧾 Đơn hàng
                </div>

                <div
                    onClick={() => navigate("/cashier/report")}
                    style={{
                        padding: "10px 15px",
                        cursor: "pointer",
                        background: location.pathname === "/cashier/report" ? "rgba(212,175,55,0.2)" : "transparent",
                        borderLeft: location.pathname === "/cashier/report" ? "3px solid #D4AF37" : "3px solid transparent"
                    }}
                >
                    📈 Báo cáo
                </div>

                <div
                    onClick={() => navigate("/cashier/setting")}
                    style={{
                        padding: "10px 15px",
                        cursor: "pointer",
                        background: location.pathname === "/cashier/setting" ? "rgba(212,175,55,0.2)" : "transparent",
                        borderLeft: location.pathname === "/cashier/setting" ? "3px solid #D4AF37" : "3px solid transparent"
                    }}
                >
                    ⚙️ Cài đặt
                </div>

                {/* Phần thông tin và đăng xuất ở cuối sidebar */}
                <div style={{
                    marginTop: "auto",
                    padding: "15px",
                    borderTop: "1px solid rgba(255,255,255,0.2)"
                }}>
                    {/* Chi nhánh */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Chi nhánh</div>
                        <div style={{ fontWeight: "bold", fontSize: 13, color: "#D4AF37" }}>
                            {user.branch?.name || "Đang tải..."}
                        </div>
                    </div>

                    {/* Nhân viên */}
                    <div style={{ marginBottom: 15 }}>
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Nhân viên</div>
                        <div style={{ fontWeight: "bold", fontSize: 13 }}>
                            {user.fullName || "Nhân viên"}
                        </div>
                    </div>

                    {/* Nút đăng xuất */}
                    <button
                        onClick={handleLogout}
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            background: "rgba(220,38,38,0.3)",
                            border: "1px solid rgba(220,38,38,0.5)",
                            borderRadius: "6px",
                            color: "#fca5a5",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: "bold",
                            textAlign: "center",
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(220,38,38,0.5)";
                            e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(220,38,38,0.3)";
                            e.currentTarget.style.color = "#fca5a5";
                        }}
                    >
                        🔓 Đăng xuất
                    </button>
                </div>
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
                            navigate("/cashier/tables");
                            setIsSidebarOpen(false);
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        Tất cả bàn
                    </span>

                    <span
                        onClick={() => {
                            navigate("/cashier/booking");
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
                    padding: 20,
                    overflowY: "auto"
                }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default CashierLayout;