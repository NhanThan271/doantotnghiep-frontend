import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Briefcase, Wallet, Utensils, ChefHat, User } from 'lucide-react';

const ROLES = [
    {
        key: 'admin',
        label: 'Admin',
        icon: ShieldCheck,
        color: '#7c3aed',
        username: 'truongnhan',
        password: '12345',
    },
    {
        key: 'manager',
        label: 'Quản lý',
        icon: Briefcase,
        color: '#2563eb',
        username: 'manager1',
        password: '123456',
    },
    {
        key: 'cashier',
        label: 'Thu ngân',
        icon: Wallet,
        color: '#16a34a',
        username: 'thungan1',
        password: '123456',
    },
    {
        key: 'waiter',
        label: 'Phục vụ',
        icon: Utensils,
        color: '#d97706',
        username: 'nhanvien1',
        password: '123456',
    },
    {
        key: 'chef',
        label: 'Đầu bếp',
        icon: ChefHat,
        color: '#dc2626',
        username: 'bep1',
        password: '123456',
    },
    {
        key: 'customer',
        label: 'Khách hàng',
        icon: User,
        color: '#0891b2',
    },
];

export default function RoleSelectPage() {
    const navigate = useNavigate();

    const handleSelect = (role) => {
        if (role.key === 'customer') {
            navigate('/');
            return;
        }
        navigate('/login', {
            state: {
                username: role.username,
                password: role.password,
            },
        });
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                padding: 24,
            }}
        >
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 28 }}>
                Chọn vai trò đăng nhập
            </h1>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 20,
                    maxWidth: 640,
                    width: '100%',
                }}
            >
                {ROLES.map((role) => {
                    const Icon = role.icon;
                    return (
                        <button
                            key={role.key}
                            onClick={() => handleSelect(role)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                padding: '28px 16px',
                                borderRadius: 16,
                                border: '1px solid #e5e7eb',
                                background: '#fff',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 8px 18px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                            }}
                        >
                            <div
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 14,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: `${role.color}1A`,
                                    color: role.color,
                                }}
                            >
                                <Icon size={26} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                                {role.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}