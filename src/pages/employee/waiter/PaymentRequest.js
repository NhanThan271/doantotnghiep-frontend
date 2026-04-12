// pages/employee/waiter/PaymentRequest.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../../services/api';

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
            const response = await orderAPI.getById(orderId);
            setOrder(response.data);
        } catch (error) {
            console.error('Error fetching order:', error);
            alert('Có lỗi khi tải thông tin đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    const handleSendPaymentRequest = async () => {
        setSubmitting(true);
        try {
            // Gửi yêu cầu thanh toán đến Cashier qua WebSocket hoặc API
            // Hiện tại chỉ chuyển sang trang thanh toán
            navigate(`/cashier/payment/${orderId}`);
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra!');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>;
    if (!order) return <div style={{ textAlign: 'center', padding: '50px' }}>Không tìm thấy đơn hàng</div>;

    const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    const vat = subtotal * 0.1;
    const total = subtotal + vat;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px' }}>← Quay lại</button>
            <h1 style={{ marginBottom: '10px' }}>Yêu cầu thanh toán</h1>
            <p style={{ marginBottom: '30px', color: '#64748b' }}>Vui lòng kiểm tra lại thông tin đơn hàng trước khi gửi yêu cầu.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3>Chi tiết đơn hàng #{order.id}</h3>
                    <div style={{ margin: '15px 0', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <p><strong>📍 Vị trí:</strong> {order.location || 'Chưa có'}</p>
                        <p><strong>⏰ Giờ tạo:</strong> {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Món</th>
                                <th>SL</th>
                                <th style={{ textAlign: 'right' }}>Đơn giá</th>
                                <th style={{ textAlign: 'right' }}>TT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items?.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ padding: '8px 0' }}>
                                        {item.food?.name || item.branchFood?.food?.name}
                                        {item.note && <div style={{ fontSize: '11px', color: '#f59e0b' }}>📝 {item.note}</div>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>{item.price?.toLocaleString('vi-VN')}đ</td>
                                    <td style={{ textAlign: 'right' }}>{(item.price * item.quantity).toLocaleString('vi-VN')}đ</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {order.note && (
                        <div style={{ marginTop: '15px', padding: '10px', background: '#fef3c7', borderRadius: '8px' }}>
                            <p style={{ margin: 0, fontSize: '13px' }}><strong>📝 Ghi chú đơn hàng:</strong> {order.note}</p>
                        </div>
                    )}
                </div>

                <div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: '20px' }}>
                        <h3>Tổng cộng</h3>
                        <div style={{ margin: '15px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Tạm tính</span>
                                <span>{subtotal.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>VAT (10%)</span>
                                <span>{vat.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ borderTop: '2px solid #e2e8f0', marginTop: '10px', paddingTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px' }}>
                                    <span>Tổng thanh toán</span>
                                    <span style={{ color: '#10b981' }}>{total.toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                            <p style={{ margin: 0 }}>⚠️ Vui lòng xác nhận khách đã dùng xong tất cả món ăn.</p>
                        </div>
                        <button onClick={handleSendPaymentRequest} disabled={submitting} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                            {submitting ? 'Đang gửi...' : '📤 Gửi yêu cầu thanh toán'}
                        </button>
                        <p style={{ marginTop: '15px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>Sau khi gửi, thu ngân sẽ xử lý thanh toán</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentRequest;