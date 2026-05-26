// WaiterLayout.js
import React, { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
const API = "http://localhost:8080";

const WaiterLayout = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;

    const [unreadCount, setUnreadCount] = useState(0);

    const menuItems = [
        { label: "🍽️ Gọi món", path: "/waiter/orders" },
        { label: "📋 Yêu cầu thanh toán", path: "/waiter/payment-requests" },
        { label: "👨‍🍳 Theo dõi bếp", path: "/waiter/kitchen" }
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    // Lấy số lượng đơn hàng đang xử lý để hiển thị badge
    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/customer/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const branchOrders = data.filter(o => o.branch?.id === branchId);
                const activeOrders = branchOrders.filter(o =>
                    o.status === "PENDING" || o.status === "PREPARING"
                );
                setUnreadCount(activeOrders.length);
            }
        } catch (err) {
            console.error("Lỗi tải đơn bếp:", err);
        }
    };

    // Lắng nghe socket events từ bếp
    useEffect(() => {
        if (branchId) {
            fetchUnreadCount();

            socket.on("new-order", (data) => {
                if (data.branchId === branchId) {
                    console.log("📢 Có đơn hàng mới từ bếp:", data);
                    fetchUnreadCount();
                }
            });

            socket.on("order-updated", (data) => {
                if (data.branchId === branchId) {
                    console.log("🔄 Cập nhật trạng thái đơn:", data);
                    fetchUnreadCount();
                }
            });

            socket.on("item-completed", (data) => {
                if (data.branchId === branchId) {
                    console.log("✅ Món đã hoàn thành:", data);
                    fetchUnreadCount();
                }
            });
        }

        return () => {
            socket.off("new-order");
            socket.off("order-updated");
            socket.off("item-completed");
        };
    }, [branchId]);

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
            {/* Header */}
            <div style={{
                background: '#1e293b',
                color: 'white',
                padding: '12px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>🍽️ Waiter</h2>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>| {user.username || 'Nhân viên phục vụ'}</span>
                    {user.branch && (
                        <span style={{
                            fontSize: 12,
                            background: '#334155',
                            padding: '4px 12px',
                            borderRadius: 20,
                            color: '#94a3b8'
                        }}>
                            🏢 {user.branch.name}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '6px 16px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer'
                    }}
                >
                    🚪 Đăng xuất
                </button>
            </div>

            {/* Menu ngang */}
            <div style={{
                background: 'white',
                padding: '8px 24px',
                display: 'flex',
                gap: 8,
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => navigate(item.path)}
                        style={{
                            position: 'relative',
                            padding: '8px 20px',
                            background: window.location.pathname === item.path ? '#f1f5f9' : 'transparent',
                            border: 'none',
                            color: '#1e293b',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: window.location.pathname === item.path ? 600 : 500
                        }}
                        onMouseEnter={(e) => {
                            if (window.location.pathname !== item.path) {
                                e.target.style.background = '#f1f5f9';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (window.location.pathname !== item.path) {
                                e.target.style.background = 'transparent';
                            }
                        }}
                    >
                        {item.label}
                        {item.path === "/waiter/kitchen" && unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                background: '#ef4444',
                                color: 'white',
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 10,
                                minWidth: 16,
                                textAlign: 'center'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Nội dung */}
            <div style={{ padding: 24 }}>
                <Outlet />
            </div>
        </div>
    );
};

export default WaiterLayout;