import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
    Menu,
    LayoutDashboard,
    Receipt,
    BarChart3,
    Settings,
    LogOut,
    Store,
    User,
    Table,
    Calendar
} from "lucide-react";

const CashierLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState({});
    const navigate = useNavigate();
    const location = useLocation();
    const contentRef = useRef(null);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);
    }, []);

    // Scroll lên đầu khi route thay đổi
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTo({
                top: 0,
                behavior: 'smooth' // Cuộn mượt mà
            });
        }
    }, [location.pathname]);

    const toggleSidebar = () => {
        const newState = !isSidebarOpen;
        setIsSidebarOpen(newState);

        if (newState) {
            navigate("/cashier/dashboard");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    // Hàm xử lý navigation với scroll
    const handleNavigation = (path) => {
        navigate(path);
        // Scroll lên đầu ngay lập tức
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>

            {/* SIDEBAR */}
            <div style={{
                width: isSidebarOpen ? 260 : 0,
                background: "#0b3c5d",
                color: "white",
                overflow: "hidden",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column"
            }}>
                {/* Header QUẢN LÝ CA */}
                <div style={{ padding: "20px 16px 10px 16px", fontWeight: "bold", fontSize: "14px", opacity: 0.8 }}>
                    QUẢN LÝ CA
                </div>

                {/* Menu items */}
                <div
                    onClick={() => handleNavigation("/cashier/dashboard")}
                    style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginTop: 10,
                        background: location.pathname === "/cashier/dashboard" ? "rgba(212,175,55,0.2)" : "transparent",
                        borderLeft: location.pathname === "/cashier/dashboard" ? "3px solid #D4AF37" : "3px solid transparent"
                    }}
                >
                    <LayoutDashboard size={18} color={location.pathname === "/cashier/dashboard" ? "#D4AF37" : "#ffffff"} />
                    <span>Dashboard</span>
                </div>

                <div
                    onClick={() => handleNavigation("/cashier/bill")}
                    style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: location.pathname === "/cashier/bill" ? "rgba(212,175,55,0.2)" : "transparent",
                        borderLeft: location.pathname === "/cashier/bill" ? "3px solid #D4AF37" : "3px solid transparent"
                    }}
                >
                    <Receipt size={18} color={location.pathname === "/cashier/bill" ? "#D4AF37" : "#ffffff"} />
                    <span>Đơn hàng</span>
                </div>

                <div
                    onClick={() => handleNavigation("/cashier/report")}
                    style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: location.pathname === "/cashier/report" ? "rgba(212,175,55,0.2)" : "transparent",
                        borderLeft: location.pathname === "/cashier/report" ? "3px solid #D4AF37" : "3px solid transparent"
                    }}
                >
                    <BarChart3 size={18} color={location.pathname === "/cashier/report" ? "#D4AF37" : "#ffffff"} />
                    <span>Báo cáo</span>
                </div>

                <div
                    onClick={() => handleNavigation("/cashier/shift")}
                    style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: location.pathname === "/cashier/shift" ? "rgba(212,175,55,0.2)" : "transparent",
                        borderLeft: location.pathname === "/cashier/shift" ? "3px solid #D4AF37" : "3px solid transparent"
                    }}
                >
                    <BarChart3 size={18} color={location.pathname === "/cashier/shift" ? "#D4AF37" : "#ffffff"} />
                    <span>Ca làm việc</span>
                </div>

                <div
                    onClick={() => handleNavigation("/cashier/setting")}
                    style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: location.pathname === "/cashier/setting" ? "rgba(212,175,55,0.2)" : "transparent",
                        borderLeft: location.pathname === "/cashier/setting" ? "3px solid #D4AF37" : "3px solid transparent"
                    }}
                >
                    <Settings size={18} color={location.pathname === "/cashier/setting" ? "#D4AF37" : "#ffffff"} />
                    <span>Cài đặt</span>
                </div>

                {/* Phần thông tin và đăng xuất ở cuối sidebar */}
                <div style={{
                    marginTop: "auto",
                    padding: "16px",
                    borderTop: "1px solid rgba(255,255,255,0.2)"
                }}>
                    {/* Chi nhánh */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, display: "flex", alignItems: "center", gap: "6px" }}>
                            <Store size={12} color="#D4AF37" />
                            <span>Chi nhánh</span>
                        </div>
                        <div style={{ fontWeight: "bold", fontSize: 13, color: "#D4AF37" }}>
                            {user.branch?.name || "Đang tải..."}
                        </div>
                    </div>

                    {/* Nhân viên */}
                    <div style={{ marginBottom: 15 }}>
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, display: "flex", alignItems: "center", gap: "6px" }}>
                            <User size={12} color="#D4AF37" />
                            <span>Nhân viên</span>
                        </div>
                        <div style={{ fontWeight: "bold", fontSize: 13 }}>
                            {user.fullName || "Nhân viên"}
                        </div>
                    </div>

                    {/* Nút đăng xuất */}
                    <button
                        onClick={handleLogout}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "rgba(220,38,38,0.3)",
                            border: "1px solid rgba(220,38,38,0.5)",
                            borderRadius: "8px",
                            color: "#fca5a5",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: "bold",
                            textAlign: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
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
                        <LogOut size={16} color="#fca5a5" />
                        <span>Đăng xuất</span>
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
                    padding: "0 20px",
                    gap: 24
                }}>
                    {/* Menu icon */}
                    <div
                        onClick={toggleSidebar}
                        style={{ fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                        <Menu size={20} color="#ffffff" />
                    </div>

                    {/* Tất cả bàn */}
                    <div
                        onClick={() => {
                            handleNavigation("/cashier/tables");
                            setIsSidebarOpen(false);
                        }}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        <Table size={16} color="#D4AF37" />
                        <span>Tất cả bàn</span>
                    </div>

                    {/* Đặt bàn */}
                    <div
                        onClick={() => {
                            handleNavigation("/cashier/booking");
                            setIsSidebarOpen(false);
                        }}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        <Calendar size={16} color="#D4AF37" />
                        <span>Đặt bàn</span>
                    </div>
                </div>

                {/* CONTENT - Thêm ref vào đây */}
                <div
                    ref={contentRef}
                    style={{
                        flex: 1,
                        background: "linear-gradient(135deg,#1e3a8a,#2563eb)",
                        padding: 20,
                        overflowY: "auto"
                    }}
                >
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default CashierLayout;