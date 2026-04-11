// pages/employee/waiter/OrderDetail.js - Đã bỏ chọn tầng và sơ đồ bàn
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const OrderDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderDetail();
        // Poll for updates every 5 seconds
        const interval = setInterval(fetchOrderDetail, 5000);
        return () => clearInterval(interval);
    }, [id]);

    const fetchOrderDetail = async () => {
        try {
            // Mock data - replace with API call
            const mockOrder = {
                id: id || 'ORD001',
                tableId: 5,
                tableName: 'Bàn 5',
                floor: 2,
                room: 'Khu A',
                customerName: 'Nguyễn Văn A',
                customerPhone: '0901234567',
                status: 'preparing',
                createdAt: '2024-01-20 18:30:00',
                items: [
                    { id: 1, name: 'Phở bò', quantity: 2, price: 55000, total: 110000, note: 'không hành', status: 'preparing' },
                    { id: 2, name: 'Nem rán', quantity: 1, price: 45000, total: 45000, note: '', status: 'completed' },
                    { id: 3, name: 'Bia Hà Nội', quantity: 3, price: 20000, total: 60000, note: 'lạnh', status: 'served' },
                ],
                subtotal: 215000,
                serviceCharge: 21500,
                vat: 21500,
                total: 258000,
                note: 'Khách yêu cầu phục vụ nhanh'
            };
            setOrder(mockOrder);
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { color: '#64748b', text: 'Chờ xử lý', icon: '⏳' },
            preparing: { color: '#f59e0b', text: 'Đang chuẩn bị', icon: '🍳' },
            served: { color: '#3b82f6', text: 'Đã phục vụ', icon: '🍽️' },
            completed: { color: '#10b981', text: 'Hoàn thành', icon: '✅' }
        };
        const badge = badges[status] || badges.pending;
        return <span style={{ padding: '4px 8px', borderRadius: '6px', background: `${badge.color}20`, color: badge.color, fontSize: '12px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{badge.icon} {badge.text}</span>;
    };

    const getItemStatusBadge = (status) => {
        const badges = { pending: { color: '#64748b', text: 'Chờ' }, preparing: { color: '#f59e0b', text: 'Đang nấu' }, completed: { color: '#10b981', text: 'Xong' }, served: { color: '#3b82f6', text: 'Đã phục vụ' } };
        const badge = badges[status] || badges.pending;
        return <span style={{ padding: '2px 6px', borderRadius: '4px', background: `${badge.color}20`, color: badge.color, fontSize: '11px' }}>{badge.text}</span>;
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>;
    if (!order) return <div style={{ textAlign: 'center', padding: '50px' }}>Không tìm thấy đơn hàng</div>;

    return (
        <div>
            <div style={{ marginBottom: '30px' }}>
                <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '15px' }}>← Quay lại</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Đơn hàng #{order.id}</h1>
                        <p style={{ margin: '5px 0 0', color: '#64748b' }}>
                            {order.tableName} - {order.customerName}
                            {order.room && <span style={{ marginLeft: '10px', padding: '2px 8px', background: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }}>📍 {order.room} - Tầng {order.floor}</span>}
                        </p>
                    </div>
                    {getStatusBadge(order.status)}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
                {/* Order Items */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>Chi tiết món ăn</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ textAlign: 'left', padding: '10px' }}>Món</th>
                                <th style={{ textAlign: 'center', padding: '10px' }}>SL</th>
                                <th style={{ textAlign: 'right', padding: '10px' }}>Đơn giá</th>
                                <th style={{ textAlign: 'right', padding: '10px' }}>Thành tiền</th>
                                <th style={{ textAlign: 'center', padding: '10px' }}>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px' }}>
                                        {item.name}
                                        {item.note && <div style={{ fontSize: '11px', color: '#f59e0b' }}>📝 {item.note}</div>}
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '10px' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right', padding: '10px' }}>{item.price.toLocaleString('vi-VN')}đ</td>
                                    <td style={{ textAlign: 'right', padding: '10px' }}>{item.total.toLocaleString('vi-VN')}đ</td>
                                    <td style={{ textAlign: 'center', padding: '10px' }}>{getItemStatusBadge(item.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {order.note && (
                        <div style={{ marginTop: '15px', padding: '10px', background: '#fef3c7', borderRadius: '8px' }}>
                            <p style={{ margin: 0, fontSize: '13px' }}><strong>📝 Ghi chú:</strong> {order.note}</p>
                        </div>
                    )}
                </div>

                {/* Order Summary */}
                <div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>Tổng cộng</h3>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Tạm tính</span>
                                <span>{order.subtotal.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Phí phục vụ (10%)</span>
                                <span>{order.serviceCharge.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>VAT (10%)</span>
                                <span>{order.vat.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ borderTop: '2px solid #e2e8f0', marginTop: '8px', paddingTop: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' }}>
                                    <span>Tổng thanh toán</span>
                                    <span style={{ color: '#10b981' }}>{order.total.toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Thông tin bàn hiện tại */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>📍 Thông tin bàn hiện tại</h3>
                        <p><strong>Bàn:</strong> {order.tableName}</p>
                        <p><strong>Khu vực:</strong> {order.room || 'Không có'}</p>
                        <p><strong>Tầng:</strong> {order.floor}</p>
                        <p><strong>Khách hàng:</strong> {order.customerName}</p>
                        <p><strong>SĐT:</strong> {order.customerPhone}</p>
                        <p><strong>Thời gian:</strong> {order.createdAt}</p>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => navigate(`/employee/waiter/payment-request/${order.id}`)}
                            style={{ flex: 1, padding: '12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            📤 Yêu cầu thanh toán
                        </button>
                        <button
                            onClick={() => navigate(`/employee/waiter/orders/new?tableId=${order.tableId}&tableName=${order.tableName}&orderId=${order.id}`)}
                            style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            ➕ Gọi thêm món
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;