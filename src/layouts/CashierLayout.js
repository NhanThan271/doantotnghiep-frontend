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
    Calendar,
    Bell
} from "lucide-react";
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
const CASHIER_NOTIFICATIONS_KEY = 'cashier_notifications';

const CashierLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState({});
    const navigate = useNavigate();
    const location = useLocation();
    const contentRef = useRef(null);
    const branchId = user?.branch?.id;

    // ===== NOTIFICATIONS STATE =====
    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem(CASHIER_NOTIFICATIONS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
            }
        } catch (e) {
            console.error("Lỗi đọc cashier notifications:", e);
        }
        return [];
    });

    const [showNotificationPanel, setShowNotificationPanel] = useState(false);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);

        // Đăng ký role cashier
        if (userData?.id && userData?.branch?.id) {
            socket.emit("register-role", {
                role: "cashier",
                userId: userData.id,
                branchId: userData.branch.id
            });
        }

        // 👇 THÊM LISTENER NÀY
        const handleStaffReservation = (data) => {
            console.log("📢 Cashier nhận thông báo đặt bàn:", data);

            // Hiển thị toast
            const event = new CustomEvent('cashier-notification', {
                detail: {
                    message: data.message || `📅 Khách ${data.customerName} sẽ đến lúc ${new Date(data.checkInTime).toLocaleTimeString('vi-VN')}`,
                    type: 'info'
                }
            });
            window.dispatchEvent(event);

            // Thêm vào notification panel
            const newNotification = {
                id: Date.now() + Math.random(),
                message: data.message,
                type: 'info',
                timestamp: new Date()
            };
            setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        };

        socket.on("staff-reservation-notification", handleStaffReservation);

        return () => {
            socket.off("staff-reservation-notification", handleStaffReservation);
        };
    }, []);

    // ===== LƯU NOTIFICATIONS VÀO LOCALSTORAGE =====
    useEffect(() => {
        try {
            localStorage.setItem(CASHIER_NOTIFICATIONS_KEY, JSON.stringify(notifications));
        } catch (e) {
            console.error("Lỗi lưu cashier notifications:", e);
        }
    }, [notifications]);

    // ===== NHẬN NOTIFICATIONS TỪ CÁC COMPONENT CON (CÙNG TAB) =====
    useEffect(() => {
        const handleCashierNotification = (event) => {
            const { message, type, timestamp } = event.detail;
            const id = Date.now() + Math.random();

            console.log('🔔 CashierLayout nhận notification:', { message, type });

            setNotifications(prev => [{
                id,
                message,
                type: type || 'info',
                timestamp: new Date(timestamp || Date.now())
            }, ...prev].slice(0, 50));
        };

        window.addEventListener('cashier-notification', handleCashierNotification);

        return () => {
            window.removeEventListener('cashier-notification', handleCashierNotification);
        };
    }, []);

    // ===== LẮNG NGHE PAYMENT SUCCESS QUA SOCKET (GIỮA CÁC TAB/TRÌNH DUYỆT) =====
    useEffect(() => {
        if (!branchId) return;

        const handlePaymentSuccess = (data) => {
            if (data.branchId === branchId || data.branchId === user?.branch?.id) {
                console.log('💰 [Cashier] Nhận payment success qua socket:', data);

                const newNotification = {
                    id: Date.now() + Math.random(),
                    message: `💰 ${data.entityType} ${data.entityNumber} thanh toán PayOS thành công${data.amount || ''}`,
                    type: 'success',
                    timestamp: new Date()
                };

                setNotifications(prev => [newNotification, ...prev].slice(0, 50));

                // Lưu vào localStorage
                const saved = localStorage.getItem(CASHIER_NOTIFICATIONS_KEY);
                const current = saved ? JSON.parse(saved) : [];
                current.unshift({ ...newNotification, timestamp: newNotification.timestamp.toISOString() });
                localStorage.setItem(CASHIER_NOTIFICATIONS_KEY, JSON.stringify(current.slice(0, 50)));
            }
        };

        socket.on("payment-success", handlePaymentSuccess);

        return () => {
            socket.off("payment-success", handlePaymentSuccess);
        };
    }, [branchId, user?.branch?.id]);

    // ===== LẮNG NGHE THAY ĐỔI LOCALSTORAGE TỪ TAB KHÁC (DỰ PHÒNG) =====
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === CASHIER_NOTIFICATIONS_KEY && e.newValue) {
                try {
                    const newNotifications = JSON.parse(e.newValue);
                    console.log('📦 [Cashier] Nhận notification từ storage change:', newNotifications);
                    setNotifications(newNotifications.map(n => ({
                        ...n,
                        timestamp: new Date(n.timestamp)
                    })));
                } catch (err) {
                    console.error("Lỗi parse storage data:", err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // ===== CLICK OUTSIDE ĐỂ ĐÓNG PANEL =====
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showNotificationPanel &&
                !e.target.closest('#cashier-notification-panel') &&
                !e.target.closest('#cashier-notification-bell')) {
                setShowNotificationPanel(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showNotificationPanel]);

    // Scroll lên đầu khi route thay đổi
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }, [location.pathname]);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };
    const handleLogout = () => {
        localStorage.removeItem(CASHIER_NOTIFICATIONS_KEY);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const clearAllNotifications = () => {
        setNotifications([]);
        localStorage.removeItem(CASHIER_NOTIFICATIONS_KEY);
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'order': return '🆕';
            case 'payment': return '💰';
            default: return '🔔';
        }
    };

    // Hàm xử lý navigation với scroll
    const handleNavigation = (path) => {
        setIsSidebarOpen(true);
        navigate(path);
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
                    <Calendar size={18} color={location.pathname === "/cashier/shift" ? "#D4AF37" : "#ffffff"} />
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

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* ===== NOTIFICATION BELL ===== */}
                    <div
                        id="cashier-notification-bell"
                        onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                        style={{
                            position: 'relative',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: showNotificationPanel ? 'rgba(255,255,255,0.2)' : 'transparent',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!showNotificationPanel) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!showNotificationPanel) {
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        <Bell size={20} color="#D4AF37" />
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: -2,
                                right: -2,
                                background: '#ef4444',
                                color: 'white',
                                fontSize: 10,
                                fontWeight: 'bold',
                                minWidth: 18,
                                height: 18,
                                borderRadius: 9,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                border: '2px solid #1e40af'
                            }}>
                                {notifications.length > 99 ? '99+' : notifications.length}
                            </span>
                        )}
                    </div>
                </div>

                {/* ===== NOTIFICATION PANEL ===== */}
                {showNotificationPanel && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}>
                        <div id="cashier-notification-panel" style={{
                            position: 'fixed',
                            top: 55,
                            right: 24,
                            width: 400,
                            maxHeight: 450,
                            background: 'white',
                            borderRadius: 12,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            zIndex: 999,
                            overflow: 'hidden'
                        }}>
                            {/* Panel Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px 20px',
                                background: '#0b3c5d',
                                color: 'white',
                                borderBottom: '2px solid #1e40af'
                            }}>
                                <h4 style={{ margin: 0, fontSize: 16 }}>
                                    🔔 Thông báo ({notifications.length})
                                </h4>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {notifications.length > 0 && (
                                        <button onClick={clearAllNotifications} style={{
                                            background: 'rgba(255,255,255,0.2)',
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            color: 'white', padding: '4px 12px',
                                            borderRadius: 6, fontSize: 12, cursor: 'pointer'
                                        }}>
                                            ✕ Xóa tất cả
                                        </button>
                                    )}
                                    <button onClick={() => setShowNotificationPanel(false)} style={{
                                        background: 'transparent', border: 'none',
                                        color: 'white', cursor: 'pointer', fontSize: 18
                                    }}>
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Panel Body */}
                            <div style={{ maxHeight: 380, overflowY: 'auto', padding: 8 }}>
                                {notifications.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                                        <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
                                        <p>Chưa có thông báo nào</p>
                                    </div>
                                ) : (
                                    notifications.map(noti => (
                                        <div key={noti.id} style={{
                                            display: 'flex', alignItems: 'flex-start', gap: 12,
                                            padding: 12, borderRadius: 8, marginBottom: 6,
                                            background: noti.type === 'success' ? '#f0fdf4' :
                                                noti.type === 'warning' ? '#fffbeb' :
                                                    noti.type === 'error' ? '#fef2f2' : '#f9fafb',
                                            borderLeft: `4px solid ${noti.type === 'success' ? '#10b981' :
                                                noti.type === 'warning' ? '#f59e0b' :
                                                    noti.type === 'error' ? '#ef4444' : '#3b82f6'
                                                }`
                                        }}>
                                            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                                                {getNotificationIcon(noti.type)}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: 13, color: '#1f2937',
                                                    lineHeight: 1.5, wordBreak: 'break-word'
                                                }}>
                                                    {noti.message}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                                    {noti.timestamp?.toLocaleTimeString('vi-VN')} - {' '}
                                                    {noti.timestamp?.toLocaleDateString('vi-VN')}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CONTENT */}
                <div
                    ref={contentRef}
                    style={{
                        flex: 1,
                        background: "linear-gradient(135deg,#1e3a8a,#2563eb)",
                        padding: 20,
                        overflowY: "auto",
                        overflowX: "hidden",
                        maxWidth: "100%",
                    }}
                >
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default CashierLayout;