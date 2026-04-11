// pages/employee/cashier/PaymentPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PaymentPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState(0);
    const [discountCode, setDiscountCode] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        setLoading(true);
        try {
            // API call to get order details
            // Mock data
            setOrder({
                id: orderId,
                table: 'Bàn 5',
                customer: 'Nguyễn Văn A',
                phone: '0901234567',
                items: [
                    { name: 'Phở bò', quantity: 2, price: 55000, total: 110000 },
                    { name: 'Nem rán', quantity: 1, price: 45000, total: 45000 },
                    { name: 'Bia Hà Nội', quantity: 3, price: 20000, total: 60000 },
                ],
                subtotal: 215000,
                serviceCharge: 21500,
                vat: 21500,
                total: 258000,
                createdAt: '2024-01-15 18:30:00'
            });
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const lookupCustomer = async () => {
        if (!customerPhone) return;
        // API call to lookup customer by phone
        setCustomer({
            name: 'Nguyễn Văn A',
            phone: customerPhone,
            points: 1250,
            tier: 'Gold'
        });
    };

    const applyDiscount = async () => {
        // API call to validate discount code
        if (discountCode === 'SALE10') {
            setDiscount(order.subtotal * 0.1);
        } else if (discountCode === 'SALE20') {
            setDiscount(order.subtotal * 0.2);
        }
    };

    const calculateTotal = () => {
        let total = order.subtotal + order.serviceCharge + order.vat;
        total -= discount;
        return total;
    };

    const handlePayment = async () => {
        setLoading(true);
        try {
            const paymentData = {
                orderId: order.id,
                method: paymentMethod,
                amount: calculateTotal(),
                discount: discount,
                customerPhone: customerPhone,
                discountCode: discountCode
            };

            // API call to process payment
            console.log('Processing payment:', paymentData);

            // Show success message
            alert('Thanh toán thành công!');

            // Redirect to success page or dashboard
            navigate('/employee/cashier');
        } catch (error) {
            console.error('Payment error:', error);
            alert('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !order) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>;
    }

    if (!order) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Không tìm thấy đơn hàng</div>;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px' }}>Thanh toán đơn hàng #{order.id}</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
                {/* Left Column - Order Details */}
                <div>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>Thông tin đơn hàng</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <p><strong>Bàn:</strong> {order.table}</p>
                            <p><strong>Thời gian:</strong> {order.createdAt}</p>
                            <p><strong>Nhân viên:</strong> Nguyễn Thị Thu Ngân</p>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Món</th>
                                    <th style={{ textAlign: 'center', padding: '8px' }}>SL</th>
                                    <th style={{ textAlign: 'right', padding: '8px' }}>Đơn giá</th>
                                    <th style={{ textAlign: 'right', padding: '8px' }}>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px' }}>{item.name}</td>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right', padding: '8px' }}>{item.price.toLocaleString('vi-VN')}đ</td>
                                        <td style={{ textAlign: 'right', padding: '8px' }}>{item.total.toLocaleString('vi-VN')}đ</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Customer Lookup */}
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>Khách hàng thân thiết</h3>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="tel"
                                placeholder="Số điện thoại khách hàng"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px'
                                }}
                            />
                            <button
                                onClick={lookupCustomer}
                                style={{
                                    padding: '10px 20px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Tra cứu
                            </button>
                        </div>
                        {customer && (
                            <div style={{
                                padding: '10px',
                                background: '#f0fdf4',
                                borderRadius: '8px'
                            }}>
                                <p><strong>{customer.name}</strong></p>
                                <p>Điểm tích lũy: {customer.points} | Hạng: {customer.tier}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Payment Summary */}
                <div>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        position: 'sticky',
                        top: '20px'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>Tổng cộng</h3>

                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Tạm tính</span>
                                <span>{order.subtotal.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Phí phục vụ (10%)</span>
                                <span>{order.serviceCharge.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>VAT (10%)</span>
                                <span>{order.vat.toLocaleString('vi-VN')}đ</span>
                            </div>
                            {discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#10b981' }}>
                                    <span>Giảm giá</span>
                                    <span>-{discount.toLocaleString('vi-VN')}đ</span>
                                </div>
                            )}
                            <div style={{ borderTop: '2px solid #e2e8f0', margin: '10px 0', paddingTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' }}>
                                    <span>Tổng thanh toán</span>
                                    <span style={{ color: '#10b981' }}>{calculateTotal().toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </div>

                        {/* Discount Code */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                                Mã giảm giá
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Nhập mã giảm giá"
                                    value={discountCode}
                                    onChange={(e) => setDiscountCode(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px'
                                    }}
                                />
                                <button
                                    onClick={applyDiscount}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                                Phương thức thanh toán
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    style={{
                                        padding: '12px',
                                        background: paymentMethod === 'cash' ? '#10b981' : 'white',
                                        color: paymentMethod === 'cash' ? 'white' : '#1e293b',
                                        border: `1px solid ${paymentMethod === 'cash' ? '#10b981' : '#cbd5e1'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    💵 Tiền mặt
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('bank')}
                                    style={{
                                        padding: '12px',
                                        background: paymentMethod === 'bank' ? '#3b82f6' : 'white',
                                        color: paymentMethod === 'bank' ? 'white' : '#1e293b',
                                        border: `1px solid ${paymentMethod === 'bank' ? '#3b82f6' : '#cbd5e1'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🏦 Chuyển khoản
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('momo')}
                                    style={{
                                        padding: '12px',
                                        background: paymentMethod === 'momo' ? '#8b5cf6' : 'white',
                                        color: paymentMethod === 'momo' ? 'white' : '#1e293b',
                                        border: `1px solid ${paymentMethod === 'momo' ? '#8b5cf6' : '#cbd5e1'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📱 Momo
                                </button>
                            </div>
                        </div>

                        {/* Payment Button */}
                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '15px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                        </button>

                        {/* Print Invoice Button */}
                        <button
                            onClick={() => window.print()}
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginTop: '10px',
                                background: 'white',
                                color: '#64748b',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            🖨️ In hóa đơn
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;