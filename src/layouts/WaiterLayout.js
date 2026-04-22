import React from "react";
import { useNavigate, Outlet } from "react-router-dom";

const WaiterLayout = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const menuItems = [
        { label: "🍽️ Gọi món", path: "/waiter/orders" },
        { label: "📋 Yêu cầu thanh toán", path: "/employee/waiter/payment-requests" },
    ];

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
                            padding: '8px 20px',
                            background: 'transparent',
                            border: 'none',
                            color: '#1e293b',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 500
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        {item.label}
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