// pages/employee/waiter/WaiterPaymentRequests.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../../../services/api';

const WaiterPaymentRequests = () => {
    const navigate = useNavigate();
    const [paidOrders, setPaidOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPaidOrders();
        const interval = setInterval(fetchPaidOrders, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchPaidOrders = async () => {
        try {
            const response = await orderAPI.getAll();
            const orders = response.data || [];
            // Lọc các đơn đã thanh toán do nhân viên này tạo
            const paid = orders.filter(order => order.status === 'PAID');
            setPaidOrders(paid);
        } catch (error) {
            console.error('Error fetching paid orders:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>;

    return (
        <div>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Đơn hàng đã thanh toán</h1>
                <p style={{ margin: '5px 0 0', color: '#64748b' }}>Danh sách các đơn hàng đã được thanh toán</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {paidOrders.map(order => {
                    const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
                    const total = subtotal * 1.1;

                    return (
                        <div key={order.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 'bold' }}>#{order.id}</span>
                                    <span>{order.location || 'Chưa có vị trí'}</span>
                                    <span style={{ padding: '2px 8px', background: '#d1fae5', color: '#10b981', borderRadius: '12px', fontSize: '12px' }}>✓ Đã thanh toán</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>
                                    Ngày tạo: {new Date(order.createdAt).toLocaleString('vi-VN')}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                                    {total.toLocaleString('vi-VN')}đ
                                </div>
                                <button
                                    onClick={() => navigate(`/employee/waiter/orders/${order.id}`)}
                                    style={{ marginTop: '8px', padding: '6px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Xem chi tiết
                                </button>
                            </div>
                        </div>
                    );
                })}
                {paidOrders.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', color: '#64748b' }}>
                        Chưa có đơn hàng nào được thanh toán
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaiterPaymentRequests;