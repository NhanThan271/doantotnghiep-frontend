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
    Bell,
    ChevronLeft
} from "lucide-react";
import io from 'socket.io-client';
import styles from "./CashierLayout.module.css";

const socket = io('http://localhost:3001');
const CASHIER_NOTIFICATIONS_KEY = 'cashier_notifications';

const CashierLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        return sessionStorage.getItem('cashier_sidebar') !== 'closed';
    });
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

        if (userData?.id && userData?.branch?.id) {
            socket.emit("register-role", {
                role: "cashier",
                userId: userData.id,
                branchId: userData.branch.id
            });
        }

        // ← CHỈ thêm trực tiếp, KHÔNG dispatch custom event
        const handleStaffReservation = (data) => {
            console.log("📢 Cashier nhận thông báo đặt bàn:", data);

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

    useEffect(() => {
        try {
            localStorage.setItem(CASHIER_NOTIFICATIONS_KEY, JSON.stringify(notifications));
        } catch (e) {
            console.error("Lỗi lưu cashier notifications:", e);
        }
    }, [notifications]);

    // ← ĐÃ XÓA TOÀN BỘ useEffect cashier-notification listener

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

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === CASHIER_NOTIFICATIONS_KEY && e.newValue) {
                try {
                    const newNotifications = JSON.parse(e.newValue);
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
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

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

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [location.pathname]);

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => {
            const newState = !prev;
            sessionStorage.setItem('cashier_sidebar', newState ? 'open' : 'closed');
            return newState;
        });
    };

    const handleLogout = () => {
        sessionStorage.removeItem('cashier_sidebar');
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

    const handleNavigation = (path, closeSidebar = false) => {
        navigate(path);
        if (closeSidebar) {
            setIsSidebarOpen(false);
            sessionStorage.setItem('cashier_sidebar', 'closed');
        }
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    };

    return (
        <div className={styles.layout}>
            <div className={`${styles.sidebar} ${!isSidebarOpen ? styles.closed : ''}`}>
                <div className={styles.sidebarHeader}>QUẢN LÝ CA</div>
                <div className={styles.sidebarMenu}>
                    <div onClick={() => handleNavigation("/cashier/dashboard")} className={`${styles.sidebarMenuItem} ${location.pathname === "/cashier/dashboard" ? styles.active : ''}`}><LayoutDashboard size={18} /><span>Dashboard</span></div>
                    <div onClick={() => handleNavigation("/cashier/bill")} className={`${styles.sidebarMenuItem} ${location.pathname === "/cashier/bill" ? styles.active : ''}`}><Receipt size={18} /><span>Đơn hàng</span></div>
                    <div onClick={() => handleNavigation("/cashier/report")} className={`${styles.sidebarMenuItem} ${location.pathname === "/cashier/report" ? styles.active : ''}`}><BarChart3 size={18} /><span>Báo cáo</span></div>
                    <div onClick={() => handleNavigation("/cashier/shift")} className={`${styles.sidebarMenuItem} ${location.pathname === "/cashier/shift" ? styles.active : ''}`}><Calendar size={18} /><span>Ca làm việc</span></div>
                    <div onClick={() => handleNavigation("/cashier/setting")} className={`${styles.sidebarMenuItem} ${location.pathname === "/cashier/setting" ? styles.active : ''}`}><Settings size={18} /><span>Cài đặt</span></div>
                </div>
                <div className={styles.sidebarFooter}>
                    <div className={styles.sidebarInfoLabel}><Store size={12} /><span>Chi nhánh</span></div>
                    <div className={styles.sidebarInfoValue}>{user.branch?.name || "Đang tải..."}</div>
                    <div className={styles.sidebarInfoLabel}><User size={12} /><span>Nhân viên</span></div>
                    <div className={`${styles.sidebarInfoValue} ${styles.light}`}>{user.fullName || "Nhân viên"}</div>
                    <button onClick={handleLogout} className={styles.logoutButton}><LogOut size={16} /><span>Đăng xuất</span></button>
                </div>
            </div>

            <div className={styles.mainContent}>
                <div className={styles.topbar}>
                    <div onClick={toggleSidebar} className={styles.menuIcon}>{isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}</div>
                    <div onClick={() => handleNavigation("/cashier/tables", true)} className={styles.topbarNavItem}><Table size={16} /><span>Tất cả bàn</span></div>
                    <div onClick={() => handleNavigation("/cashier/booking", true)} className={styles.topbarNavItem}><Calendar size={16} /><span>Đặt bàn</span></div>
                    <div className={styles.spacer} />
                    <div id="cashier-notification-bell" onClick={() => setShowNotificationPanel(!showNotificationPanel)} className={`${styles.notificationBell} ${showNotificationPanel ? styles.active : ''}`}>
                        <Bell size={20} />
                        {notifications.length > 0 && <span className={styles.notificationBadge}>{notifications.length > 99 ? '99+' : notifications.length}</span>}
                    </div>
                </div>

                {showNotificationPanel && (
                    <div className={styles.notificationOverlay}>
                        <div id="cashier-notification-panel" className={styles.notificationPanel}>
                            <div className={styles.notificationHeader}>
                                <h4>🔔 Thông báo ({notifications.length})</h4>
                                <div className={styles.notificationHeaderActions}>
                                    {notifications.length > 0 && <button onClick={clearAllNotifications} className={styles.clearAllBtn}>✕ Xóa tất cả</button>}
                                    <button onClick={() => setShowNotificationPanel(false)} className={styles.closePanelBtn}>✕</button>
                                </div>
                            </div>
                            <div className={styles.notificationBody}>
                                {notifications.length === 0 ? (
                                    <div className={styles.notificationEmpty}><div className={styles.notificationEmptyIcon}>🔔</div><p>Chưa có thông báo nào</p></div>
                                ) : (
                                    notifications.map(noti => (
                                        <div key={noti.id} className={`${styles.notificationItem} ${styles[noti.type]}`}>
                                            <span className={styles.notificationIcon}>{getNotificationIcon(noti.type)}</span>
                                            <div className={styles.notificationContent}>
                                                <div className={styles.notificationMessage}>{noti.message}</div>
                                                <div className={styles.notificationTime}>{noti.timestamp?.toLocaleTimeString('vi-VN')} - {noti.timestamp?.toLocaleDateString('vi-VN')}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={contentRef} className={styles.contentArea}><Outlet /></div>
            </div>
        </div>
    );
};

export default CashierLayout;