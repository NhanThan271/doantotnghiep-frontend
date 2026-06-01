import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
const CASHIER_NOTIFICATIONS_KEY = 'cashier_notifications';
const WAITER_NOTIFICATIONS_KEY = 'waiter_notifications';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const entityId = searchParams.get('entityId');
    const isRoom = searchParams.get('isRoom') === 'true';
    const returnTo = searchParams.get('returnTo') || '/waiter/orders';

    useEffect(() => {
        const handlePaymentSuccess = async () => {
            try {
                console.log('🔍 [PaymentSuccess] Params:', { orderId, entityId, isRoom });

                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const branchId = user?.branch?.id;

                const savedPayment = sessionStorage.getItem('tempCashierPayment');
                let paymentData = null;
                let amountText = '';
                let entityNumber = entityId || '';

                if (savedPayment) {
                    try {
                        paymentData = JSON.parse(savedPayment);
                        entityNumber = paymentData.entityNumber || entityId || '';
                        if (paymentData.totalAmount) {
                            amountText = ` - ${paymentData.totalAmount.toLocaleString('vi-VN')}đ`;
                        }
                    } catch (e) { }
                }

                // 1. Thanh toán đơn hàng
                if (orderId) {
                    await axiosClient.put(`/customer/orders/${orderId}/pay?paymentMethod=MOBILE`);
                    console.log('✅ Đã thanh toán đơn hàng:', orderId);
                }

                // 2. Cập nhật trạng thái bàn/phòng
                // ✅ SỬA: Phòng về ACTIVE, Bàn về FREE
                if (entityId) {
                    const newStatus = isRoom ? 'ACTIVE' : 'FREE';
                    const url = isRoom
                        ? `/rooms/${entityId}/status`
                        : `/tables/${entityId}/status`;

                    await axiosClient.put(url, null, {
                        params: { status: newStatus }
                    });

                    console.log(`✅ ${isRoom ? 'Phòng' : 'Bàn'} đã ${newStatus}`);
                    socket.emit("update-tables");
                }

                const entityType = isRoom ? 'Phòng' : 'Bàn';

                // 3. GỬI NOTIFICATION QUA SOCKET
                const paymentDataForSocket = {
                    entityType: entityType,
                    entityNumber: entityNumber,
                    amount: amountText,
                    branchId: branchId,
                    orderId: orderId,
                    timestamp: new Date().toISOString()
                };

                console.log('📡 Emit payment-success qua socket:', paymentDataForSocket);
                socket.emit("payment-success", paymentDataForSocket);

                // 4. Gửi notification cho CASHIER (local)
                const cashierNotification = {
                    id: Date.now() + Math.random(),
                    message: `💰 ${entityType} ${entityNumber} thanh toán PayOS thành công${amountText}`,
                    type: 'success',
                    timestamp: new Date().toISOString()
                };

                const savedCashier = localStorage.getItem(CASHIER_NOTIFICATIONS_KEY);
                const currentCashierNotifications = savedCashier ? JSON.parse(savedCashier) : [];
                currentCashierNotifications.unshift(cashierNotification);
                localStorage.setItem(CASHIER_NOTIFICATIONS_KEY, JSON.stringify(currentCashierNotifications.slice(0, 50)));

                window.dispatchEvent(new CustomEvent('cashier-notification', {
                    detail: cashierNotification
                }));

                // 5. Gửi notification cho WAITER (local)
                const waiterNotification = {
                    id: Date.now() + Math.random(),
                    message: `💰 ${entityType} ${entityNumber} đã thanh toán thành công${amountText}`,
                    type: 'success',
                    timestamp: new Date().toISOString()
                };

                const savedWaiter = localStorage.getItem(WAITER_NOTIFICATIONS_KEY);
                const currentWaiterNotifications = savedWaiter ? JSON.parse(savedWaiter) : [];
                currentWaiterNotifications.unshift(waiterNotification);
                localStorage.setItem(WAITER_NOTIFICATIONS_KEY, JSON.stringify(currentWaiterNotifications.slice(0, 50)));

                window.dispatchEvent(new CustomEvent('waiter-notification', {
                    detail: waiterNotification
                }));

                console.log('📢 Đã gửi notification cho cả Cashier và Waiter (local + socket)');

                // 6. Xóa dữ liệu tạm
                sessionStorage.removeItem('tempCashierPayment');
                sessionStorage.removeItem('lastEntity');

                // 7. Redirect
                setTimeout(() => navigate(returnTo, { replace: true }), 2000);

            } catch (err) {
                console.error("❌ Lỗi:", err);
                setTimeout(() => navigate(returnTo, { replace: true }), 2000);
            }
        };

        handlePaymentSuccess();
    }, [orderId, entityId, isRoom, returnTo, navigate]);

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
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                maxWidth: '400px',
                width: '90%'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ color: '#10b981', marginBottom: '8px' }}>Thanh toán thành công!</h2>
                <p style={{ color: '#64748b', marginBottom: '16px' }}>
                    {isRoom ? 'Phòng VIP' : 'Bàn'} đã được giải phóng.
                </p>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Đang chuyển hướng...</p>
                <div style={{
                    marginTop: '20px', height: '4px',
                    background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%', width: '100%',
                        background: '#10b981', borderRadius: '2px',
                        animation: 'shrink 2s linear forwards'
                    }} />
                </div>
            </div>
            <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
        </div>
    );
};

export default PaymentSuccess;