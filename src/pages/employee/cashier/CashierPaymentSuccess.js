import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';

const socket = io('/', { path: '/socket.io/' });
const CASHIER_NOTIFICATIONS_KEY = 'cashier_notifications';

const CashierPaymentSuccess = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const processPayment = async () => {
            try {
                const tempPaymentData = sessionStorage.getItem('tempCashierPayment');
                if (!tempPaymentData) {
                    console.warn('⚠️ Không tìm thấy dữ liệu thanh toán tạm');
                    setTimeout(() => navigate('/cashier/tables'), 2000);
                    return;
                }

                const paymentData = JSON.parse(tempPaymentData);
                console.log("💰 Payment success for order:", paymentData);

                // 1. Thanh toán đơn hàng
                await axiosClient.put(`/customer/orders/${paymentData.orderId}/pay?paymentMethod=MOBILE`);
                console.log('✅ Đã thanh toán đơn hàng:', paymentData.orderId);

                // 2. Cập nhật trạng thái bàn/phòng thành FREE
                if (paymentData.entityId) {
                    const updateUrl = paymentData.isRoom
                        ? `/rooms/${paymentData.entityId}/status?status=FREE`
                        : `/tables/${paymentData.entityId}/status?status=FREE`;

                    await axiosClient.put(updateUrl);
                    console.log(`✅ Đã cập nhật ${paymentData.entityType} ${paymentData.entityNumber} thành FREE`);

                    // Emit socket để cập nhật giao diện realtime
                    socket.emit("update-tables");
                }

                // 3. Gửi notification lên CashierLayout bell
                const locationName = paymentData.isRoom
                    ? `Phòng ${paymentData.entityNumber}`
                    : `Bàn ${paymentData.entityNumber}`;
                const amountFormatted = paymentData.totalAmount?.toLocaleString('vi-VN') + 'đ' || '';

                const newNotification = {
                    id: Date.now() + Math.random(),
                    message: `💰 ${locationName} thanh toán PayOS thành công${amountFormatted ? ' - ' + amountFormatted : ''}`,
                    type: 'success',
                    timestamp: new Date().toISOString()
                };

                // Lưu vào localStorage
                const saved = localStorage.getItem(CASHIER_NOTIFICATIONS_KEY);
                const currentNotifications = saved ? JSON.parse(saved) : [];
                currentNotifications.unshift(newNotification);
                localStorage.setItem(CASHIER_NOTIFICATIONS_KEY, JSON.stringify(currentNotifications.slice(0, 50)));

                // Dispatch custom event để CashierLayout cập nhật ngay
                window.dispatchEvent(new CustomEvent('cashier-notification', {
                    detail: newNotification
                }));

                console.log('📤 CashierPaymentSuccess → Bell notification:', newNotification.message);

                // 4. Xóa dữ liệu tạm
                sessionStorage.removeItem('tempCashierPayment');
                sessionStorage.removeItem('lastEntity');

                // 5. Chuyển hướng sau 2 giây
                setTimeout(() => {
                    navigate('/cashier/tables', { replace: true });
                }, 2000);

            } catch (error) {
                console.error("❌ Error processing payment:", error);

                // Gửi thông báo lỗi
                const newNotification = {
                    id: Date.now() + Math.random(),
                    message: `❌ Lỗi thanh toán: ${error.message || 'Không xác định'}`,
                    type: 'error',
                    timestamp: new Date().toISOString()
                };

                const saved = localStorage.getItem(CASHIER_NOTIFICATIONS_KEY);
                const currentNotifications = saved ? JSON.parse(saved) : [];
                currentNotifications.unshift(newNotification);
                localStorage.setItem(CASHIER_NOTIFICATIONS_KEY, JSON.stringify(currentNotifications.slice(0, 50)));

                window.dispatchEvent(new CustomEvent('cashier-notification', {
                    detail: newNotification
                }));

                setTimeout(() => navigate('/cashier/tables', { replace: true }), 2000);
            }
        };

        processPayment();
    }, [navigate]);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}>
            <div style={{
                background: "white",
                padding: "40px 60px",
                borderRadius: "16px",
                textAlign: "center",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                maxWidth: "450px",
                width: "90%"
            }}>
                <div style={{ fontSize: "72px", marginBottom: "16px" }}>✅</div>
                <h1 style={{ color: "#28a745", marginBottom: "8px", fontSize: "24px" }}>
                    Thanh toán thành công!
                </h1>
                <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "16px" }}>
                    Bàn/Phòng đã được giải phóng và đơn hàng đã được thanh toán.
                </p>
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                    Đang chuyển về trang quản lý bàn...
                </p>

                {/* Loading bar */}
                <div style={{
                    marginTop: '20px',
                    height: '4px',
                    background: '#e2e8f0',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: '100%',
                        background: '#28a745',
                        borderRadius: '2px',
                        animation: 'shrink 2s linear forwards'
                    }} />
                </div>
            </div>

            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
};

export default CashierPaymentSuccess;