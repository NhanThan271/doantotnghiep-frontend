import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const returnTo = searchParams.get('returnTo') || '/waiter/orders';

    useEffect(() => {
        const handlePaymentSuccess = async () => {
            try {
                if (orderId) {
                    await axiosClient.put(`/customer/orders/${orderId}/pay?paymentMethod=BANKING`);
                }
                setTimeout(() => {
                    navigate(returnTo);
                }, 2000);
            } catch (err) {
                console.error("Lỗi xử lý thanh toán:", err);
                setTimeout(() => {
                    navigate(returnTo);
                }, 2000);
            }
        };
        handlePaymentSuccess();
    }, [orderId, returnTo, navigate]);

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
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ color: '#10b981', marginBottom: '8px' }}>Thanh toán thành công!</h2>
                <p style={{ color: '#64748b' }}>Đang chuyển hướng về trang quản lý bàn...</p>
            </div>
        </div>
    );
};

export default PaymentSuccess;