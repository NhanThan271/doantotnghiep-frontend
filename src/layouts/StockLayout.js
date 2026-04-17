// layouts/StockLayout.js
import React from "react";
import { useNavigate } from "react-router-dom";

const StockLayout = ({ children }) => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const menuItems = [
        { label: "🏠 Tổng quan", path: "/employee/stock" },
        { label: "📦 Quản lý kho", path: "/employee/stock/inventory" },
        { label: "📥 Nhập hàng", path: "/employee/stock/import" },
        { label: "📤 Xuất hàng", path: "/employee/stock/export" },
        { label: "✅ Kiểm kho", path: "/employee/stock/check" },
        { label: "⚠️ Hàng sắp hết", path: "/employee/stock/low-stock" },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <div style={{ width: 260, background: '#2d3748', color: 'white', position: 'fixed', height: '100vh' }}>
                <div style={{ padding: 24, borderBottom: '1px solid #4a5568' }}>
                    <h2 style={{ margin: 0 }}>📦 Stock</h2>
                    <p style={{ margin: '5px 0 0', fontSize: 12, color: '#a0aec0' }}>Quản lý kho</p>
                </div>

                <div style={{ padding: 20 }}>
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => navigate(item.path)}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: 12,
                                marginBottom: 8,
                                background: 'transparent',
                                border: 'none',
                                color: '#cbd5e1',
                                borderRadius: 8,
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: 14
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#4a5568'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: 20, borderTop: '1px solid #4a5568', position: 'absolute', bottom: 0, width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 8
                        }}>
                            {user.fullName?.charAt(0) || 'NK'}
                        </div>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{user.fullName || 'Nhân viên kho'}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Quản lý kho</p>
                        <p style={{ margin: '5px 0 0', fontSize: 11, color: '#64748b' }}>{user.branch?.name || 'Chi nhánh'}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: 10,
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer'
                        }}
                    >
                        🚪 Đăng xuất
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, marginLeft: 260, background: '#f7fafc', minHeight: '100vh' }}>
                <div style={{ padding: 30 }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default StockLayout;