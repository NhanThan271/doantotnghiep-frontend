// pages/employee/waiter/PaymentRequest.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PaymentRequest = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (orderId) fetchOrderDetails();
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            const mockOrder = {
                id: orderId || 'ORD001',
                table: 'Bàn 5',
                tableId: 5,
                customer: 'Nguyễn Văn A',
                phone: '0901234567',
                items: [
                    { id: 1, name: 'Phở bò', quantity: 2, price: 55000, total: 110000 },
                    { id: 2, name: 'Nem rán', quantity: 1, price: 45000, total: 45000 },
                    { id: 3, name: 'Bia Hà Nội', quantity: 3, price: 20000, total: 60000 },
                ],
                subtotal: 215000,
                serviceCharge: 21500,
                vat: 21500,
                total: 258000,
                createdAt: '2024-01-20 18:30:00'
            };
            setOrder(mockOrder);
        } catch (error) { console.error('Error fetching order:', error); alert('Có lỗi khi tải thông tin đơn hàng'); }
        finally { setLoading(false); }
    };

    const handleSendPaymentRequest = async () => {
        setSubmitting(true);
        try {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const paymentRequestData = {
                id: `REQ${Date.now()}`,
                orderId: order.id,
                tableId: order.tableId,
                tableName: order.table,
                customerName: order.customer,
                customerPhone: order.phone,
                totalAmount: order.total,
                items: order.items,
                requestedBy: currentUser.fullName || 'Waiter',
                requestedAt: new Date().toISOString(),
                status: 'pending'
            };
            console.log('Sending payment request to Cashier:', paymentRequestData);
            // await fetch('/api/payment-requests', { method: 'POST', body: JSON.stringify(paymentRequestData) });
            alert('Đã gửi yêu cầu thanh toán đến thu ngân!');
            navigate('/employee/waiter');
        } catch (error) { console.error('Error:', error); alert('Có lỗi xảy ra!'); }
        finally { setSubmitting(false); }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>;
    if (!order) return <div style={{ textAlign: 'center', padding: '50px' }}>Không tìm thấy đơn hàng</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px' }}>← Quay lại</button>
            <h1 style={{ marginBottom: '10px' }}>Yêu cầu thanh toán</h1>
            <p style={{ marginBottom: '30px', color: '#64748b' }}>Vui lòng kiểm tra lại thông tin đơn hàng trước khi gửi yêu cầu.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3>Chi tiết đơn hàng #{order.id}</h3>
                    <div style={{ margin: '15px 0', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <p><strong>🪑 Bàn:</strong> {order.table}</p>
                        <p><strong>👤 Khách:</strong> {order.customer}</p>
                        <p><strong>📞 ĐT:</strong> {order.phone}</p>
                        <p><strong>⏰ Giờ:</strong> {order.createdAt}</p>
                    </div>
                    <table style={{ width: '100%' }}>
                        <thead><tr><th style={{ textAlign: 'left' }}>Món</th><th>SL</th><th style={{ textAlign: 'right' }}>Đơn giá</th><th style={{ textAlign: 'right' }}>TT</th></tr></thead>
                        <tbody>{order.items.map((item, idx) => (<tr key={idx}><td>{item.name}</td><td style={{ textAlign: 'center' }}>{item.quantity}</td><td style={{ textAlign: 'right' }}>{item.price.toLocaleString('vi-VN')}đ</td><td style={{ textAlign: 'right' }}>{item.total.toLocaleString('vi-VN')}đ</td></tr>))}</tbody>
                    </table>
                </div>

                <div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: '20px' }}>
                        <h3>Tổng cộng</h3>
                        <div style={{ margin: '15px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tạm tính</span><span>{order.subtotal.toLocaleString('vi-VN')}đ</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Phí phục vụ (10%)</span><span>{order.serviceCharge.toLocaleString('vi-VN')}đ</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>VAT (10%)</span><span>{order.vat.toLocaleString('vi-VN')}đ</span></div>
                            <div style={{ borderTop: '2px solid #e2e8f0', marginTop: '10px', paddingTop: '10px' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px' }}><span>Tổng thanh toán</span><span style={{ color: '#10b981' }}>{order.total.toLocaleString('vi-VN')}đ</span></div></div>
                        </div>
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}><p style={{ margin: 0 }}>⚠️ Vui lòng xác nhận khách đã dùng xong tất cả món ăn.</p></div>
                        <button onClick={handleSendPaymentRequest} disabled={submitting} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Đang gửi...' : '📤 Gửi yêu cầu thanh toán'}</button>
                        <p style={{ marginTop: '15px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>Sau khi gửi, thu ngân sẽ xử lý thanh toán</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentRequest;