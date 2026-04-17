// pages/employee/chef/ChefDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { kitchenAPI } from '../../../services/api';

const socket = io('http://localhost:3001', {
    transports: ['websocket'],
    reconnection: true
});

const ChefDashboard = () => {
    const navigate = useNavigate();
    const [pendingOrders, setPendingOrders] = useState([]);
    const [cookingOrders, setCookingOrders] = useState([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    // Lấy dữ liệu từ API
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Gọi API /api/kitchen/queue
            const response = await kitchenAPI.getQueue();
            console.log('📦 Queue data from API:', response.data);

            const orderItems = response.data || [];

            if (orderItems.length > 0) {
                const pending = [];
                const cooking = [];

                orderItems.forEach(item => {
                    // Lấy thông tin từ OrderItem
                    const foodName = item.food?.name || 'Món ăn';
                    const tableNumber = item.order?.table?.number || item.order?.tableNumber || '?';
                    const kitchenStatus = item.kitchenStatus || item.status || 'WAITING';

                    const orderData = {
                        id: item.order?.id || item.id,
                        table: `Bàn ${tableNumber}`,
                        items: [{
                            name: foodName,
                            quantity: item.quantity || 1,
                            note: item.note || ''
                        }],
                        time: new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        priority: item.priority === 1 ? 'high' : 'normal',
                        itemId: item.id,
                        kitchenStatus: kitchenStatus
                    };

                    if (kitchenStatus === 'WAITING' || kitchenStatus === 'NEW') {
                        pending.push(orderData);
                    } else if (kitchenStatus === 'COOKING' || kitchenStatus === 'PREPARING') {
                        cooking.push(orderData);
                    }
                });

                setPendingOrders(pending);
                setCookingOrders(cooking);
                console.log(`✅ Loaded: ${pending.length} pending, ${cooking.length} cooking`);
            } else {
                console.log('No orders in queue');
                setPendingOrders([]);
                setCookingOrders([]);
            }
        } catch (error) {
            console.error('Error fetching queue:', error);
            // Nếu lỗi, dùng mock data
            loadMockData();
        } finally {
            setLoading(false);
        }
    };

    // Mock data fallback
    const loadMockData = () => {
        setPendingOrders([
            { id: 1, table: 'Bàn 5', items: [{ name: 'Phở bò', quantity: 2, note: 'không hành' }], time: '18:30', priority: 'normal', itemId: 1 },
            { id: 2, table: 'Bàn 2', items: [{ name: 'Cơm rang', quantity: 1, note: '' }], time: '18:25', priority: 'high', itemId: 2 },
        ]);
        setCookingOrders([
            { id: 3, table: 'Bàn 3', items: [{ name: 'Bún chả', quantity: 2, note: '' }], startedAt: '18:15', estimatedTime: '5 phút', itemId: 3 }
        ]);
    };

    // Cập nhật trạng thái món
    const updateItemStatus = async (itemId, newStatus) => {
        try {
            await kitchenAPI.updateItemStatus(itemId, newStatus);
            console.log(`✅ Item ${itemId} status updated to ${newStatus}`);
            fetchDashboardData(); // Refresh danh sách

            // Gửi socket thông báo
            socket.emit('update-order-item-status', {
                itemId: itemId,
                status: newStatus,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleStartCooking = (order) => {
        if (order.itemId) {
            updateItemStatus(order.itemId, 'COOKING');
        } else {
            setPendingOrders(pendingOrders.filter(o => o.id !== order.id));
            setCookingOrders([...cookingOrders, { ...order, startedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), estimatedTime: '10 phút' }]);
        }
    };

    const handleCompleteOrder = (order) => {
        if (order.itemId) {
            updateItemStatus(order.itemId, 'DONE');
        } else {
            setCookingOrders(cookingOrders.filter(o => o.id !== order.id));
        }
    };

    useEffect(() => {
        // Socket events
        socket.on('connect', () => {
            console.log('✅ Chef connected to socket');
            setSocketConnected(true);
            socket.emit('register-role', 'kitchen');
        });

        socket.on('disconnect', () => {
            console.log('❌ Chef disconnected');
            setSocketConnected(false);
        });

        socket.on('order-for-staff', (orderData) => {
            console.log('🆕 New order received:', orderData);
            fetchDashboardData(); // Refresh khi có đơn mới
        });

        socket.on('order-item-updated', (itemData) => {
            console.log('🍳 Item updated:', itemData);
            fetchDashboardData(); // Refresh khi có cập nhật
        });

        // Lấy dữ liệu ban đầu
        fetchDashboardData();

        // Refresh mỗi 10 giây
        const interval = setInterval(fetchDashboardData, 10000);

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('order-for-staff');
            socket.off('order-item-updated');
            clearInterval(interval);
        };
    }, []);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải dữ liệu...</div>;
    }

    return (
        <div>
            {/* Socket Status */}
            <div style={{
                position: 'fixed', top: '20px', right: '20px', padding: '4px 12px', borderRadius: '20px',
                fontSize: '12px', fontWeight: '500', zIndex: 1000,
                background: socketConnected ? '#10b98120' : '#ef444420',
                color: socketConnected ? '#10b981' : '#ef4444'
            }}>
                {socketConnected ? '● Realtime' : '○ Offline'}
            </div>

            {/* Refresh button */}
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                <button onClick={fetchDashboardData} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    🔄 Làm mới
                </button>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Tổng quan bếp</h1>
                <p style={{ margin: '5px 0 0', color: '#64748b' }}>Quản lý đơn hàng và nguyên liệu</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                {/* Pending Orders */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>🍳 Món chờ nấu ({pendingOrders.length})</h3>
                    {pendingOrders.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>🎉 Không có món chờ nấu</p>
                    ) : (
                        pendingOrders.map(order => (
                            <div key={order.id} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', background: order.priority === 'high' ? '#fef2f2' : 'white', borderRadius: '8px', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <strong>Đơn #{order.id}</strong>
                                    <span>{order.table} - {order.time}</span>
                                </div>
                                {order.items.map((item, idx) => (
                                    <div key={idx} style={{ fontSize: '13px', marginBottom: '4px' }}>
                                        • {item.quantity}x {item.name}
                                        {item.note && <span style={{ color: '#f59e0b' }}> ({item.note})</span>}
                                    </div>
                                ))}
                                <button onClick={() => handleStartCooking(order)} style={{ width: '100%', padding: '8px', marginTop: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                    Bắt đầu nấu
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Cooking Orders */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>🔥 Đang nấu ({cookingOrders.length})</h3>
                    {cookingOrders.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>🍳 Không có món đang nấu</p>
                    ) : (
                        cookingOrders.map(order => (
                            <div key={order.id} style={{ padding: '15px', background: '#fef3c7', borderRadius: '8px', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <strong>Đơn #{order.id}</strong>
                                    <span>{order.table} - ⏱️ {order.estimatedTime || 'Đang nấu'}</span>
                                </div>
                                {order.items.map((item, idx) => (
                                    <div key={idx} style={{ fontSize: '13px', marginBottom: '4px' }}>• {item.quantity}x {item.name}</div>
                                ))}
                                {order.startedAt && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>Bắt đầu: {order.startedAt}</div>}
                                <button onClick={() => handleCompleteOrder(order)} style={{ width: '100%', padding: '8px', marginTop: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                    Hoàn thành
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChefDashboard;