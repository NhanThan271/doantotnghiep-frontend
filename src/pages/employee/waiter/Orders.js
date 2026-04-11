// pages/employee/waiter/Orders.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { branchFoodAPI, orderAPI, categoryAPI, foodAPI, roomAPI, tableAPI } from '../../../services/api';

const Orders = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [cart, setCart] = useState([]);
    const [menu, setMenu] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [tableInfo, setTableInfo] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState('');
    const [selectedRoomType, setSelectedRoomType] = useState('normal');
    const [selectedRoom, setSelectedRoom] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [selectedTableNumber, setSelectedTableNumber] = useState('');
    const [selectedTableId, setSelectedTableId] = useState('');
    const [generalNote, setGeneralNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [existingOrderId, setExistingOrderId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(null);

    // Dữ liệu từ backend
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [tables, setTables] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [loadingTables, setLoadingTables] = useState(false);

    const floors = [1, 2, 3, 4, 5];

    // Lấy thông tin chi nhánh từ user đăng nhập
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.branch) {
            setCurrentBranch(user.branch);
            fetchRooms(user.branch.id);
            fetchAreas(user.branch.id);
        }
        fetchMenu();
        fetchParams();
    }, []);

    // Lấy danh sách phòng từ backend
    const fetchRooms = async (branchId) => {
        setLoadingRooms(true);
        try {
            const response = await roomAPI.getByBranch(branchId);
            setRooms(response.data || []);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    };

    // Lấy danh sách khu vực từ backend
    const fetchAreas = async (branchId) => {
        try {
            const response = await tableAPI.getAreasByBranch(branchId);
            setAreas(response.data || []);
        } catch (error) {
            console.error('Error fetching areas:', error);
        }
    };

    // Lấy danh sách bàn theo khu vực
    const fetchTablesByArea = async (branchId, area) => {
        setLoadingTables(true);
        try {
            const response = await tableAPI.getByBranchAndArea(branchId, area);
            setTables(response.data || []);
        } catch (error) {
            console.error('Error fetching tables:', error);
        } finally {
            setLoadingTables(false);
        }
    };

    // Khi chọn khu vực, lấy danh sách bàn
    useEffect(() => {
        if (currentBranch?.id && selectedRoom && selectedRoomType === 'normal') {
            fetchTablesByArea(currentBranch.id, selectedRoom);
        }
    }, [selectedRoom, selectedRoomType, currentBranch]);

    const fetchParams = async () => {
        const params = new URLSearchParams(location.search);
        const tableId = params.get('tableId');
        const tableName = params.get('tableName');
        const orderId = params.get('orderId');

        if (tableId) setTableInfo({ id: tableId, name: tableName || `Bàn ${tableId}` });
        if (orderId) {
            setExistingOrderId(orderId);
            await fetchExistingOrder(orderId);
        }
    };

    // Lấy đơn hàng cũ từ backend
    const fetchExistingOrder = async (orderId) => {
        setLoading(true);
        try {
            const response = await orderAPI.getById(orderId);
            const order = response.data;

            setSelectedFloor(order.floor?.toString() || '');
            setSelectedRoomType(order.roomType || 'normal');
            setSelectedRoom(order.room || '');
            setSelectedRoomId(order.roomId || '');
            setSelectedTableNumber(order.tableNumber?.toString() || '');
            setSelectedTableId(order.tableId || '');
            setGeneralNote(order.note || '');

            // Nếu là phòng thường và có tableId, lấy thông tin bàn
            if (order.roomType === 'normal' && order.tableId) {
                try {
                    const tableRes = await tableAPI.getById(order.tableId);
                    setSelectedTableNumber(tableRes.data?.number?.toString() || '');
                } catch (err) {
                    console.error('Error fetching table:', err);
                }
            }

            // Chuyển đổi order items sang cart format
            const existingCart = (order.items || []).map(item => ({
                id: item.food?.id || item.branchFood?.food?.id,
                name: item.food?.name || item.branchFood?.food?.name,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                note: item.note || ''
            }));
            setCart(existingCart);
        } catch (error) {
            console.error('Error fetching existing order:', error);
        } finally {
            setLoading(false);
        }
    };

    // Lấy menu từ backend theo chi nhánh
    const fetchMenu = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const branchId = user.branch?.id;

            let foods = [];

            if (branchId) {
                const response = await branchFoodAPI.getWithPromotions(branchId);
                foods = response.data || [];
            } else {
                const response = await foodAPI.getAll();
                foods = response.data || [];
            }
            console.log("MENU:", menu);
            const menuData = foods.map(item => ({
                id: item.id,
                name: item.name,
                category: item.categoryName?.toLowerCase() || 'main', // fix category
                price: Number(item.branchPrice) || 0,                // ✅ FIX GIÁ
                originalPrice: Number(item.branchPrice) || 0,
                discount: 0,
                image: item.imageUrl || item.image || null           // ✅ FIX ẢNH
            }));

            setMenu(menuData);

        } catch (error) {
            console.error('Error fetching menu:', error);
        }
    };

    const addToCart = (item) => {
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            setCart(cart.map(cartItem =>
                cartItem.id === item.id
                    ? { ...cartItem, quantity: cartItem.quantity + 1, total: (cartItem.quantity + 1) * cartItem.price }
                    : cartItem
            ));
        } else {
            setCart([...cart, { ...item, quantity: 1, total: item.price, note: '' }]);
        }
    };

    const updateQuantity = (id, delta) => {
        const item = cart.find(cartItem => cartItem.id === id);
        if (item) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) {
                setCart(cart.filter(cartItem => cartItem.id !== id));
            } else {
                setCart(cart.map(cartItem =>
                    cartItem.id === id
                        ? { ...cartItem, quantity: newQuantity, total: newQuantity * cartItem.price }
                        : cartItem
                ));
            }
        }
    };

    const updateItemNote = (id, note) => {
        setCart(cart.map(cartItem =>
            cartItem.id === id ? { ...cartItem, note } : cartItem
        ));
    };

    const calculateSubtotal = () => cart.reduce((sum, item) => sum + item.total, 0);
    const calculateTotal = () => calculateSubtotal() * 1.2;

    const getLocationName = () => {
        if (!selectedFloor) return 'Chưa chọn';
        if (selectedRoomType === 'vip') {
            const room = rooms.find(r => r.id === parseInt(selectedRoomId));
            return `Tầng ${selectedFloor} - ${room?.area || selectedRoom}`;
        } else {
            return `Tầng ${selectedFloor} - Khu ${selectedRoom} - Bàn ${selectedTableNumber}`;
        }
    };

    const handleSubmitOrder = async () => {
        if (cart.length === 0) { alert('Vui lòng chọn món!'); return; }
        if (!tableInfo) { alert('Vui lòng chọn bàn!'); return; }
        if (!selectedRoom) { alert('Vui lòng chọn phòng/khu vực!'); return; }
        if (selectedRoomType === 'normal' && !selectedTableNumber) { alert('Vui lòng chọn số bàn!'); return; }

        setSubmitting(true);
        try {
            if (existingOrderId) {
                const itemsToAdd = cart.map(item => ({
                    foodId: item.id,
                    quantity: item.quantity,
                    note: item.note
                }));
                await orderAPI.addItems(existingOrderId, itemsToAdd);
                alert(`Đã thêm món mới vào đơn hàng ${existingOrderId}!`);
            } else {
                const orderData = {
                    tableId: selectedRoomType === 'normal' ? parseInt(selectedTableId) : null,
                    roomId: selectedRoomType === 'vip' ? parseInt(selectedRoomId) : null,
                    tableName: tableInfo.name,
                    floor: parseInt(selectedFloor),
                    roomType: selectedRoomType,
                    room: selectedRoom,
                    tableNumber: selectedRoomType === 'normal' ? parseInt(selectedTableNumber) : null,
                    location: getLocationName(),
                    note: generalNote,
                    branchId: currentBranch?.id,
                    items: cart.map(item => ({
                        foodId: item.id,
                        quantity: item.quantity,
                        price: item.price,
                        note: item.note
                    })),
                    totalAmount: calculateTotal(),
                    status: 'PENDING'
                };

                const response = await orderAPI.create(orderData);
                alert(`Đơn hàng #${response.data.id} đã được gửi đến bếp!`);
            }
            navigate('/employee/waiter');
        } catch (error) {
            console.error('Error submitting order:', error);
            alert('Có lỗi xảy ra: ' + (error.response?.data?.message || 'Vui lòng thử lại'));
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryIcon = (category) => {
        const icons = { soup: '🍜', appetizer: '🍢', rice: '🍚', main: '🍛', hotpot: '🍲', beverage: '🥤' };
        return icons[category] || '🍽️';
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải đơn hàng...</div>;
    }

    return (
        <div style={{ display: 'flex', gap: '20px', minHeight: 'calc(100vh - 100px)' }}>
            {/* Menu Section */}
            <div style={{ flex: 2 }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                    <h2 style={{ margin: '0 0 15px 0' }}>
                        {existingOrderId ? '🍽️ Gọi thêm món' : '🍽️ Tạo đơn hàng mới'}
                    </h2>
                    {existingOrderId && (
                        <p style={{ margin: '0 0 15px 0', color: '#3b82f6' }}>
                            Đang thêm món cho đơn hàng #{existingOrderId}
                        </p>
                    )}
                    {currentBranch && (
                        <p style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '13px' }}>
                            🏢 Chi nhánh: {currentBranch.name}
                        </p>
                    )}

                    <input
                        type="text"
                        placeholder="🔍 Tìm món..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '15px' }}
                    />

                    {/* Category Tabs */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', overflowX: 'auto' }}>
                        <button
                            onClick={() => setSelectedCategory('all')}
                            style={{
                                padding: '6px 12px',
                                background: selectedCategory === 'all' ? '#3b82f6' : '#f1f5f9',
                                color: selectedCategory === 'all' ? 'white' : '#1e293b',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Tất cả
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name?.toLowerCase() || cat.id)}
                                style={{
                                    padding: '6px 12px',
                                    background: selectedCategory === (cat.name?.toLowerCase() || cat.id) ? '#3b82f6' : '#f1f5f9',
                                    color: selectedCategory === (cat.name?.toLowerCase() || cat.id) ? 'white' : '#1e293b',
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                {getCategoryIcon(cat.name?.toLowerCase())} {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Menu Items Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                    {menu
                        .filter(item => {
                            if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
                            if (searchTerm && !item.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                            return true;
                        })
                        .map(item => (
                            <div
                                key={item.id}
                                onClick={() => addToCart(item)}
                                style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '15px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {item.discount > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        background: '#ef4444',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 'bold'
                                    }}>
                                        -{item.discount}%
                                    </div>
                                )}
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}>
                                    {getCategoryIcon(item.category)}
                                </div>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{item.name}</h4>
                                <div>
                                    {item.discount > 0 ? (
                                        <>
                                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                                {item.price?.toLocaleString('vi-VN')}đ
                                            </span>
                                            <span style={{
                                                marginLeft: '8px',
                                                fontSize: '12px',
                                                color: '#94a3b8',
                                                textDecoration: 'line-through'
                                            }}>
                                                {item.originalPrice?.toLocaleString('vi-VN')}đ
                                            </span>
                                        </>
                                    ) : (
                                        <p style={{ margin: 0, color: '#10b981', fontWeight: 'bold' }}>
                                            {item.price?.toLocaleString('vi-VN')}đ
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Cart Section */}
            <div style={{ flex: 1 }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', position: 'sticky', top: '20px' }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>🛒 Giỏ hàng</h3>

                    <div style={{ marginBottom: '15px', padding: '10px', background: '#f1f5f9', borderRadius: '8px' }}>
                        {tableInfo && <p style={{ margin: '0 0 10px 0' }}><strong>🪑 Mã bàn:</strong> {tableInfo.name}</p>}

                        {/* Loại phòng */}
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>🏠 Loại phòng</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => { setSelectedRoomType('normal'); setSelectedRoom(''); setSelectedRoomId(''); setSelectedTableNumber(''); setSelectedTableId(''); }} style={{ flex: 1, padding: '8px', background: selectedRoomType === 'normal' ? '#3b82f6' : '#e2e8f0', color: selectedRoomType === 'normal' ? 'white' : '#1e293b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🪑 Phòng thường</button>
                                <button type="button" onClick={() => { setSelectedRoomType('vip'); setSelectedRoom(''); setSelectedRoomId(''); setSelectedTableNumber(''); setSelectedTableId(''); }} style={{ flex: 1, padding: '8px', background: selectedRoomType === 'vip' ? '#8b5cf6' : '#e2e8f0', color: selectedRoomType === 'vip' ? 'white' : '#1e293b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>👑 Phòng VIP</button>
                            </div>
                        </div>

                        {/* Chọn phòng/khu vực */}
                        {selectedRoomType === 'vip' ? (
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>🏛️ Chọn phòng VIP</label>
                                <select
                                    value={selectedRoomId}
                                    onChange={(e) => {
                                        const roomId = e.target.value;
                                        const room = rooms.find(r => r.id === parseInt(roomId));
                                        setSelectedRoomId(roomId);
                                        setSelectedRoom(room?.area || '');
                                    }}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    disabled={loadingRooms}
                                >
                                    <option value="">Chọn phòng VIP</option>
                                    {rooms.map(room => (
                                        <option key={room.id} value={room.id}>
                                            {room.area} (Sức chứa: {room.capacity} người)
                                        </option>
                                    ))}
                                </select>
                                {loadingRooms && <span style={{ fontSize: '12px', color: '#64748b' }}>Đang tải...</span>}
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>🏘️ Chọn khu vực</label>
                                    <select
                                        value={selectedRoom}
                                        onChange={(e) => {
                                            setSelectedRoom(e.target.value);
                                            setSelectedTableNumber('');
                                            setSelectedTableId('');
                                        }}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    >
                                        <option value="">Chọn khu vực</option>
                                        {areas.map(area => (
                                            <option key={area} value={area}>Khu {area}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Chọn bàn */}
                                {selectedRoom && (
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>🪑 Chọn bàn</label>
                                        <select
                                            value={selectedTableId}
                                            onChange={(e) => {
                                                const tableId = e.target.value;
                                                const table = tables.find(t => t.id === parseInt(tableId));
                                                setSelectedTableId(tableId);
                                                setSelectedTableNumber(table?.number?.toString() || '');
                                            }}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                            disabled={loadingTables}
                                        >
                                            <option value="">Chọn bàn</option>
                                            {tables.map(table => (
                                                <option key={table.id} value={table.id}>
                                                    Bàn {table.number} (Sức chứa: {table.capacity} người)
                                                </option>
                                            ))}
                                        </select>
                                        {loadingTables && <span style={{ fontSize: '12px', color: '#64748b' }}>Đang tải...</span>}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Hiển thị vị trí đã chọn */}
                        {selectedFloor && selectedRoom && (selectedRoomType === 'vip' ? selectedRoomId : selectedTableId) && (
                            <div style={{ marginTop: '10px', padding: '8px', background: '#dbeafe', borderRadius: '6px' }}>
                                <span style={{ fontSize: '12px', color: '#1e40af' }}>📍 Vị trí: {getLocationName()}</span>
                            </div>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
                        {cart.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Chưa có món nào</p>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '10px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: '500' }}>{item.name}</p>
                                            <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#64748b' }}>{item.price?.toLocaleString('vi-VN')}đ</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button onClick={() => updateQuantity(item.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>+</button>
                                        </div>
                                    </div>
                                    <input type="text" placeholder="📝 Ghi chú món..." value={item.note} onChange={(e) => updateItemNote(item.id, e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '8px', fontSize: '12px' }} />
                                </div>
                            ))
                        )}
                    </div>

                    {/* Total */}
                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '15px', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Tạm tính:</span>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{calculateSubtotal().toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginTop: '5px' }}>
                            <span>Phí phục vụ (10%)</span>
                            <span>{(calculateSubtotal() * 0.1).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                            <span>VAT (10%)</span>
                            <span>{(calculateSubtotal() * 0.1).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 'bold' }}>Tổng thanh toán:</span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{(calculateSubtotal() * 1.2).toLocaleString('vi-VN')}đ</span>
                        </div>
                    </div>

                    <textarea
                        placeholder="📝 Ghi chú chung cho bếp..."
                        value={generalNote}
                        onChange={(e) => setGeneralNote(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '15px', minHeight: '60px', fontSize: '13px' }}
                    />

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => navigate(-1)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Hủy</button>
                        <button onClick={handleSubmitOrder} disabled={submitting} style={{ flex: 2, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {submitting ? 'Đang xử lý...' : (existingOrderId ? '📤 Thêm món' : '📤 Tạo đơn hàng')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Orders;