// layouts/CashierLayout.js
import React from "react";
import { useNavigate } from "react-router-dom";

const CashierLayout = ({ children }) => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const menuItems = [
        { label: "🏠 Tổng quan", path: "/employee/cashier" },
        { label: "🧾 Hóa đơn", path: "/employee/cashier/invoices" },
        { label: "💳 Thanh toán", path: "/employee/cashier/payment" },
        { label: "📊 Giao dịch", path: "/employee/cashier/transactions" },
        { label: "📜 Lịch sử", path: "/employee/cashier/history" },
        { label: "📈 Doanh thu", path: "/employee/cashier/revenue" },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <div style={{ width: 260, background: '#0f172a', color: 'white', position: 'fixed', height: '100vh' }}>
                <div style={{ padding: 24, borderBottom: '1px solid #1e293b' }}>
                    <h2 style={{ margin: 0 }}>💰 Cashier</h2>
                    <p style={{ margin: '5px 0 0', fontSize: 12, color: '#94a3b8' }}>Thu ngân</p>
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
                            onMouseEnter={(e) => e.target.style.background = '#1e293b'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: 20, borderTop: '1px solid #1e293b', position: 'absolute', bottom: 0, width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 8
                        }}>
                            {user.fullName?.charAt(0) || 'TN'}
                        </div>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{user.fullName || 'Thu ngân'}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Thu ngân</p>
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

            <div style={{ flex: 1, marginLeft: 260, background: '#f1f5f9', minHeight: '100vh' }}>
                <div style={{ padding: 30 }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default CashierLayout;