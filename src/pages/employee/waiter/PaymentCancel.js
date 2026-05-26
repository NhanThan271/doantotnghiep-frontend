import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentCancel = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnTo = searchParams.get('returnTo') || '/waiter/orders';

    useEffect(() => {
        setTimeout(() => {
            navigate(returnTo);
        }, 2000);
    }, [returnTo, navigate]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8faf5 0%, #f0f4ec 100%)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
                <h2 style={{ color: '#ef4444', marginBottom: '8px' }}>Thanh toán thất bại</h2>
                <p style={{ color: '#64748b' }}>Vui lòng thử lại sau!</p>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '16px' }}>Đang chuyển hướng về trang quản lý bàn...</p>
            </div>
        </div>
    );
};

export default PaymentCancel;