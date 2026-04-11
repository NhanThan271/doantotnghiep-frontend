// pages/employee/waiter/WaiterPaymentRequests.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WaiterPaymentRequests = () => {
    const navigate = useNavigate();
    const [paymentRequests, setPaymentRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyPaymentRequests();
        const interval = setInterval(fetchMyPaymentRequests, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchMyPaymentRequests = async () => {
        try {
            const mockRequests = [
                { id: 'REQ001', orderId: 'ORD005', table: 'Bàn 2', total: 450000, requestedAt: '2024-01-20 18:45:00', status: 'pending', customer: 'Nguyễn Văn A' },
                { id: 'REQ002', orderId: 'ORD006', table: 'Bàn 3', total: 780000, requestedAt: '2024-01-20 18:50:00', status: 'completed', customer: 'Trần Thị B', completedAt: '2024-01-20 19:15:00', cashier: 'Thu ngân A' },
            ];
            setPaymentRequests(mockRequests);
        } catch (error) { console.error('Error fetching payment requests:', error); }
        finally { setLoading(false); }
    };

    const getStatusBadge = (status) => {
        if (status === 'pending') {
            return <span style={{ padding: '4px 8px', background: '#fef3c7', color: '#f59e0b', borderRadius: '6px', fontSize: '12px' }}>⏳ Chờ xử lý</span>;
        }
        return <span style={{ padding: '4px 8px', background: '#d1fae5', color: '#10b981', borderRadius: '6px', fontSize: '12px' }}>✓ Đã thanh toán</span>;
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>;

    return (
        <div>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Yêu cầu thanh toán</h1>
                <p style={{ margin: '5px 0 0', color: '#64748b' }}>Theo dõi trạng thái các yêu cầu đã gửi</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {paymentRequests.map(request => (
                    <div key={request.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold' }}>{request.orderId}</span>
                                <span>{request.table}</span>
                                <span>{request.customer}</span>
                                {getStatusBadge(request.status)}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>Gửi lúc: {request.requestedAt}</div>
                            {request.status === 'completed' && (
                                <div style={{ fontSize: '13px', color: '#10b981', marginTop: '5px' }}>
                                    Đã thanh toán bởi: {request.cashier} lúc {request.completedAt}
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                                {request.total.toLocaleString('vi-VN')}đ
                            </div>
                            <button
                                onClick={() => navigate(`/employee/waiter/orders/${request.orderId}`)}
                                style={{ marginTop: '8px', padding: '6px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Xem đơn hàng
                            </button>
                        </div>
                    </div>
                ))}
                {paymentRequests.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', color: '#64748b' }}>
                        Bạn chưa gửi yêu cầu thanh toán nào
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaiterPaymentRequests;