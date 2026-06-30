// ChefLayout.js - ICON IMPORT + MÀU SẮC (KHÔNG EMOJI)
import React, { useState, useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import {
    ChefHat, LogOut, Bell, X, CheckCircle2, AlertTriangle,
    XCircle, Info, Calendar, Building2
} from "lucide-react";
import io from 'socket.io-client';

const CHEF_NOTIFICATIONS_KEY = 'chef_notifications';
const socket = io('/', { path: '/socket.io/' });

const ChefLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem(CHEF_NOTIFICATIONS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
            }
        } catch (e) { }
        return [];
    });

    const [showNotificationPanel, setShowNotificationPanel] = useState(false);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData?.id && userData?.branch?.id) {
            socket.emit("register-role", {
                role: "kitchen",
                userId: userData.id,
                branchId: userData.branch.id
            });
        }

        const handleKitchenReservation = (data) => {
            console.log("ChefLayout nhận thông báo:", data);
            const event = new CustomEvent('chef-notification', {
                detail: { message: data.message || `Chuẩn bị món cho khách ${data.customerName}`, type: 'warning' }
            });
            window.dispatchEvent(event);
            const newNotification = {
                id: Date.now() + Math.random(),
                message: data.message,
                type: 'warning',
                timestamp: new Date(),
                items: data.items || []
            };
            setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        };

        socket.on("kitchen-reservation-notification", handleKitchenReservation);
        return () => { socket.off("kitchen-reservation-notification", handleKitchenReservation); };
    }, []);

    useEffect(() => {
        try { localStorage.setItem(CHEF_NOTIFICATIONS_KEY, JSON.stringify(notifications)); } catch (e) { }
    }, [notifications]);

    useEffect(() => {
        const handleChefNotification = (event) => {
            const { message, type, timestamp } = event.detail;
            setNotifications(prev => [{
                id: Date.now() + Math.random(),
                message,
                type: type || 'info',
                timestamp: new Date(timestamp || Date.now())
            }, ...prev].slice(0, 50));
        };
        window.addEventListener('chef-notification', handleChefNotification);
        return () => window.removeEventListener('chef-notification', handleChefNotification);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showNotificationPanel &&
                !e.target.closest('#chef-notification-panel') &&
                !e.target.closest('#chef-notification-bell')) {
                setShowNotificationPanel(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showNotificationPanel]);

    const handleLogout = () => {
        localStorage.removeItem(CHEF_NOTIFICATIONS_KEY);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const clearAllNotifications = () => {
        setNotifications([]);
        localStorage.removeItem(CHEF_NOTIFICATIONS_KEY);
    };

    const getNotificationIcon = (type) => {
        const size = 18;
        switch (type) {
            case 'success': return <CheckCircle2 size={size} color="#10b981" />;
            case 'warning': return <AlertTriangle size={size} color="#f59e0b" />;
            case 'error': return <XCircle size={size} color="#ef4444" />;
            default: return <Info size={size} color="#3b82f6" />;
        }
    };

    const getNotificationBg = (type) => {
        switch (type) {
            case 'success': return '#f0fdf4';
            case 'warning': return '#fffbeb';
            case 'error': return '#fef2f2';
            default: return '#f9fafb';
        }
    };

    const getNotificationBorder = (type) => {
        switch (type) {
            case 'success': return '#10b981';
            case 'warning': return '#f59e0b';
            case 'error': return '#ef4444';
            default: return '#3b82f6';
        }
    };

    const menuItems = [
        { label: "Khu bếp", path: "/chef/dashboard", icon: <ChefHat size={18} /> },
        { label: "Ca làm", path: "/chef/shift", icon: <Calendar size={18} /> },
    ];

    const isActive = (path) => {
        if (path === '/chef/dashboard') return location.pathname === '/chef' || location.pathname === '/chef/dashboard';
        return location.pathname === path;
    };

    return (
        <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden', background: '#f1f5f9', boxSizing: 'border-box' }}>
            {/* HEADER */}
            <div style={{
                background: '#1e293b', color: 'white', padding: '12px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', position: 'relative', zIndex: 100
            }}>
                {/* Left */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                    <div style={{ background: '#f59e0b', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ChefHat size={24} color="#1e293b" />
                    </div>
                    <h2 style={{ margin: 0, fontSize: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                        Bếp
                    </h2>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>| {user.username || 'Đầu bếp'}</span>
                    {user.branch && (
                        <span style={{ fontSize: 12, background: '#334155', padding: '4px 12px', borderRadius: 20, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Building2 size={12} color="#94a3b8" /> {user.branch.name}
                        </span>
                    )}
                </div>

                {/* Center: Menu */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', overflowX: 'auto', maxWidth: '100%' }}>
                    {menuItems.map((item, index) => (
                        <button key={index} onClick={() => navigate(item.path)} style={{
                            padding: '8px 18px',
                            background: isActive(item.path) ? '#f59e0b' : 'transparent',
                            border: isActive(item.path) ? 'none' : '1px solid rgba(255,255,255,0.2)',
                            color: isActive(item.path) ? '#1e293b' : 'white',
                            borderRadius: 6, cursor: 'pointer', fontSize: 14,
                            fontWeight: isActive(item.path) ? 600 : 500,
                            transition: 'all 0.2s', whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: 6
                        }}
                            onMouseEnter={(e) => { if (!isActive(item.path)) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            onMouseLeave={(e) => { if (!isActive(item.path)) e.currentTarget.style.background = 'transparent'; }}
                        >
                            {React.cloneElement(item.icon, { color: isActive(item.path) ? '#1e293b' : 'white' })}
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div id="chef-notification-bell" onClick={() => setShowNotificationPanel(!showNotificationPanel)} style={{
                        position: 'relative', background: showNotificationPanel ? '#334155' : 'transparent',
                        width: 42, height: 42, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', border: '2px solid rgba(255,255,255,0.2)', transition: 'all 0.2s'
                    }}>
                        <Bell size={22} color="white" />
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 'bold',
                                minWidth: 20, height: 20, borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid #1e293b'
                            }}>{notifications.length > 99 ? '99+' : notifications.length}</span>
                        )}
                    </div>

                    <button onClick={handleLogout} style={{
                        padding: '8px 16px', background: 'rgba(239, 68, 68, 0.2)',
                        color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 14, transition: 'all 0.2s'
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#fca5a5'; }}
                    >
                        <LogOut size={16} /> Đăng xuất
                    </button>
                </div>
            </div>

            {/* NOTIFICATION PANEL */}
            {showNotificationPanel && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}>
                    <div id="chef-notification-panel" style={{
                        position: 'fixed', top: 70, right: 24, width: 420, maxHeight: 500,
                        background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        zIndex: 999, overflow: 'hidden'
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '16px 20px', background: '#1e293b', color: 'white', borderBottom: '2px solid #334155'
                        }}>
                            <h4 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Bell size={18} color="white" /> Thông báo ({notifications.length})
                            </h4>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {notifications.length > 0 && (
                                    <button onClick={clearAllNotifications} style={{
                                        background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 4
                                    }}><X size={14} /> Xóa tất cả</button>
                                )}
                                <button onClick={() => setShowNotificationPanel(false)} style={{
                                    background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18
                                }}><X size={18} /></button>
                            </div>
                        </div>
                        <div style={{ maxHeight: 420, overflowY: 'auto', padding: 8 }}>
                            {notifications.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                                    <Bell size={48} color="#9ca3af" style={{ marginBottom: 12 }} />
                                    <p>Chưa có thông báo nào</p>
                                </div>
                            ) : (
                                notifications.map(noti => (
                                    <div key={noti.id} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 12,
                                        padding: 12, borderRadius: 8, marginBottom: 6,
                                        background: getNotificationBg(noti.type),
                                        borderLeft: `4px solid ${getNotificationBorder(noti.type)}`
                                    }}>
                                        <span style={{ flexShrink: 0, marginTop: 2 }}>{getNotificationIcon(noti.type)}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                                {noti.message}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                                {noti.timestamp?.toLocaleTimeString('vi-VN')} - {noti.timestamp?.toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ padding: 24 }}>
                <Outlet />
            </div>
        </div>
    );
};

export default ChefLayout;