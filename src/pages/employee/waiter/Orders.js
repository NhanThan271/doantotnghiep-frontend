// pages/employee/waiter/Orders.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { branchFoodAPI, orderAPI, categoryAPI, foodAPI, roomAPI, tableAPI } from '../../../services/api';
import { wsService } from '../../../services/websocket';

const Orders = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [cart, setCart] = useState([]);
    const [menu, setMenu] = useState([]);
    const [filteredMenu, setFilteredMenu] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [tableInfo, setTableInfo] = useState(null);
    const [selectedRoomType, setSelectedRoomType] = useState('normal');
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [selectedTableNumber, setSelectedTableNumber] = useState('');
    const [selectedTableId, setSelectedTableId] = useState('');
    const [generalNote, setGeneralNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [existingOrderId, setExistingOrderId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMenu, setLoadingMenu] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(null);

    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [tables, setTables] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [loadingTables, setLoadingTables] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.branch) {
            setCurrentBranch(user.branch);
            fetchRooms(user.branch.id);
            fetchAreas(user.branch.id);
        }
        fetchCategories();
        fetchParams();
    }, []);

    // Load menu khi chọn category
    useEffect(() => {
        if (currentBranch?.id) {
            fetchMenuByCategory(selectedCategory);
        }
    }, [currentBranch, selectedCategory]);

    const fetchCategories = async () => {
        try {
            const response = await categoryAPI.getAll();
            setCategories(response.data || []);
        } catch (error) {
            console.error('Lỗi khi lấy danh mục:', error);
        }
    };

    const fetchMenuByCategory = async (categoryId) => {
        setLoadingMenu(true);
        try {
            const branchId = currentBranch?.id;
            if (!branchId) return;

            // Dùng fetch trực tiếp hoặc axios
            const token = localStorage.getItem('token');
            const API_BASE_URL = 'http://localhost:8080';

            let url = `${API_BASE_URL}/api/branch-foods/branch/${branchId}/with-promotions`;
            if (categoryId !== 'all') {
                url += `?categoryId=${parseInt(categoryId)}`;
            }

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const foods = await response.json();
            console.log('Foods from API:', foods);

            const menuData = foods.map(item => {
                // Xử lý image URL giống TableDetail
                let imageUrl = null;
                if (item.imageUrl) {
                    if (item.imageUrl.startsWith('http')) {
                        imageUrl = item.imageUrl;
                    } else {
                        imageUrl = `${API_BASE_URL}/${item.imageUrl}`;
                    }
                }

                return {
                    id: item.id,
                    name: item.name,
                    category: item.categoryName?.toLowerCase() || 'main',
                    categoryId: item.categoryId,
                    categoryName: item.categoryName,
                    price: Number(item.finalPrice) || Number(item.branchPrice) || 0,
                    originalPrice: Number(item.originalPrice) || Number(item.branchPrice) || 0,
                    discount: item.discountPercentage || 0,
                    image: imageUrl,
                    isActive: item.isActive !== false
                };
            });

            // Chỉ hiển thị món đang active
            const activeMenu = menuData.filter(item => item.isActive !== false);
            console.log('Active menu data:', activeMenu);
            setMenu(activeMenu);

            if (searchTerm) {
                const searched = activeMenu.filter(item =>
                    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                setFilteredMenu(searched);
            } else {
                setFilteredMenu(activeMenu);
            }
        } catch (error) {
            console.error('Error fetching menu:', error);
        } finally {
            setLoadingMenu(false);
        }
    };

    // Lọc theo search term
    useEffect(() => {
        if (searchTerm) {
            const searched = menu.filter(item =>
                item.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredMenu(searched);
        } else {
            setFilteredMenu(menu);
        }
    }, [searchTerm, menu]);

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

    const fetchAreas = async (branchId) => {
        try {
            const response = await tableAPI.getAreasByBranch(branchId);
            setAreas(response.data || []);
        } catch (error) {
            console.error('Error fetching areas:', error);
        }
    };

    const fetchTablesByArea = async (branchId, area) => {
        if (!area) {
            setTables([]);
            return;
        }
        setLoadingTables(true);
        try {
            const response = await tableAPI.getByBranchAndArea(branchId, area);
            setTables(response.data || []);
        } catch (error) {
            console.error('Error fetching tables:', error);
            setTables([]);
        } finally {
            setLoadingTables(false);
        }
    };

    useEffect(() => {
        if (currentBranch?.id && selectedRoomType === 'normal' && selectedArea) {
            fetchTablesByArea(currentBranch.id, selectedArea);
        } else {
            setTables([]);
        }
    }, [selectedArea, selectedRoomType, currentBranch]);

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

    const fetchExistingOrder = async (orderId) => {
        setLoading(true);
        try {
            const response = await orderAPI.getById(orderId);
            const order = response.data;

            setSelectedRoomType(order.roomType || 'normal');

            if (order.roomType === 'vip') {
                setSelectedRoomId(order.roomId?.toString() || '');
                setSelectedArea('');
                setSelectedTableId('');
                setSelectedTableNumber('');
            } else {
                setSelectedArea(order.areaName || order.room || '');
                setSelectedTableId(order.tableId?.toString() || '');
                setSelectedTableNumber(order.tableNumber?.toString() || '');
                setSelectedRoomId('');
            }

            setGeneralNote(order.note || '');

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
    const calculateTotal = () => calculateSubtotal();

    const getLocationName = () => {
        if (selectedRoomType === 'vip') {
            const room = rooms.find(r => r.id === parseInt(selectedRoomId));
            return `Phòng VIP - ${room?.area || 'Không xác định'}`;
        } else {
            return `Khu ${selectedArea} - Bàn ${selectedTableNumber}`;
        }
    };

    const handleSubmitOrder = async () => {
        if (cart.length === 0) {
            alert('Vui lòng chọn món!');
            return;
        }

        if (selectedRoomType === 'vip') {
            if (!selectedRoomId) {
                alert('Vui lòng chọn phòng VIP!');
                return;
            }
        } else {
            if (!selectedArea) {
                alert('Vui lòng chọn khu vực!');
                return;
            }
            if (!selectedTableId || !selectedTableNumber) {
                alert('Vui lòng chọn bàn!');
                return;
            }
        }

        setSubmitting(true);
        try {
            if (existingOrderId) {
                const itemsToAdd = cart.map(item => ({
                    foodId: item.id,
                    quantity: item.quantity,
                    note: item.note
                }));
                await orderAPI.addItems(existingOrderId, itemsToAdd);

                if (wsService.connected) {
                    wsService.emit('order-status-changed', {
                        orderId: existingOrderId,
                        tableNumber: selectedTableNumber,
                        oldStatus: 'UPDATED',
                        newStatus: 'PENDING',
                        message: 'Thêm món mới'
                    });
                }

                alert(`Đã thêm món mới vào đơn hàng ${existingOrderId}!`);
            } else {
                const orderData = {
                    branch: { id: currentBranch?.id },
                    roomType: selectedRoomType,
                    ...(selectedRoomType === 'vip' && selectedRoomId && {
                        room: { id: parseInt(selectedRoomId) }
                    }),
                    ...(selectedRoomType === 'normal' && {
                        table: { id: parseInt(selectedTableId) },
                        areaName: selectedArea,
                        tableNumber: parseInt(selectedTableNumber)
                    }),
                    locationDetail: getLocationName(),
                    notes: generalNote,
                    customerName: "Khách lẻ",
                    items: cart.map(item => ({
                        food: { id: item.id },
                        quantity: item.quantity,
                        price: item.price,
                        note: item.note
                    })),
                    totalAmount: calculateTotal(),
                    status: 'PENDING'
                };

                console.log('📤 Sending order:', orderData);

                const response = await orderAPI.create(orderData);
                console.log('✅ Order created:', response.data);

                if (wsService.connected) {
                    const socketOrderData = {
                        id: response.data.id,
                        roomType: selectedRoomType,
                        ...(selectedRoomType === 'vip' && {
                            room: rooms.find(r => r.id === parseInt(selectedRoomId))?.area,
                            roomId: selectedRoomId
                        }),
                        ...(selectedRoomType === 'normal' && {
                            tableNumber: selectedTableNumber,
                            tableId: selectedTableId,
                            area: selectedArea
                        }),
                        location: getLocationName(),
                        items: cart.map(item => ({
                            id: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            note: item.note
                        })),
                        totalAmount: calculateTotal(),
                        customerName: "Khách lẻ",
                        note: generalNote,
                        createdAt: new Date().toISOString()
                    };

                    console.log('📡 Sending order via socket:', socketOrderData);
                    wsService.emit('place-order', socketOrderData);
                } else {
                    console.warn('⚠️ Socket not connected, order saved but not sent realtime');
                }

                alert(`Đơn hàng #${response.data.id} đã được gửi đến bếp!`);
            }
            navigate('/waiter');
        } catch (error) {
            console.error('Error submitting order:', error);
            alert('Có lỗi xảy ra: ' + (error.response?.data?.message || 'Vui lòng thử lại'));
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryIcon = (category) => {
        const icons = {
            soup: '🍜',
            appetizer: '🍢',
            rice: '🍚',
            main: '🍛',
            hotpot: '🍲',
            beverage: '🥤',
            drink: '🥤',
            food: '🍽️'
        };
        return icons[category?.toLowerCase()] || '🍽️';
    };

    const handleRoomTypeChange = (type) => {
        setSelectedRoomType(type);
        setSelectedArea('');
        setSelectedRoomId('');
        setSelectedTableId('');
        setSelectedTableNumber('');
        setTables([]);
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

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', overflowX: 'auto' }}>
                        <button
                            onClick={() => setSelectedCategory('all')}
                            style={{
                                padding: '8px 16px',
                                background: selectedCategory === 'all' ? '#3b82f6' : '#f1f5f9',
                                color: selectedCategory === 'all' ? 'white' : '#1e293b',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: selectedCategory === 'all' ? '600' : '400',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            🍽️ Tất cả
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id.toString())}
                                style={{
                                    padding: '8px 16px',
                                    background: selectedCategory === cat.id.toString() ? '#3b82f6' : '#f1f5f9',
                                    color: selectedCategory === cat.id.toString() ? 'white' : '#1e293b',
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: selectedCategory === cat.id.toString() ? '600' : '400',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {getCategoryIcon(cat.name)} {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {loadingMenu ? (
                    <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px' }}>
                        <p>Đang tải thực đơn...</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                        {filteredMenu.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px', gridColumn: '1/-1' }}>
                                <p>Không tìm thấy món ăn nào</p>
                            </div>
                        ) : (
                            filteredMenu.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        padding: '15px',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        position: 'relative',
                                        ':hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }
                                    }}
                                >
                                    {item.discount > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            background: '#ef4444',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            zIndex: 1
                                        }}>
                                            -{item.discount}%
                                        </div>
                                    )}

                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            style={{
                                                width: '100%',
                                                height: '130px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                marginBottom: '10px',
                                                backgroundColor: '#f1f5f9'
                                            }}
                                            onError={(e) => {
                                                console.log('Image failed to load:', item.image);
                                                e.target.style.display = 'none';
                                                if (e.target.nextSibling) {
                                                    e.target.nextSibling.style.display = 'flex';
                                                }
                                            }}
                                        />
                                    ) : null}

                                    <div style={{
                                        fontSize: '48px',
                                        marginBottom: '10px',
                                        display: item.image ? 'none' : 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: '130px',
                                        backgroundColor: '#f1f5f9',
                                        borderRadius: '8px'
                                    }}>
                                        {getCategoryIcon(item.categoryName)}
                                    </div>

                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', textAlign: 'center' }}>
                                        {item.name}
                                    </h4>

                                    <div style={{ textAlign: 'center' }}>
                                        {item.discount > 0 ? (
                                            <>
                                                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '16px' }}>
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
                                            <p style={{ margin: 0, color: '#10b981', fontWeight: 'bold', fontSize: '16px' }}>
                                                {item.price?.toLocaleString('vi-VN')}đ
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Cart Section - giữ nguyên */}
            <div style={{ flex: 1 }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', position: 'sticky', top: '20px' }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>🛒 Giỏ hàng ({cart.length} món)</h3>

                    <div style={{ marginBottom: '15px', padding: '10px', background: '#f1f5f9', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>🏠 Loại phòng</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleRoomTypeChange('normal')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: selectedRoomType === 'normal' ? '#3b82f6' : '#e2e8f0',
                                        color: selectedRoomType === 'normal' ? 'white' : '#1e293b',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🪑 Phòng thường
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRoomTypeChange('vip')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: selectedRoomType === 'vip' ? '#8b5cf6' : '#e2e8f0',
                                        color: selectedRoomType === 'vip' ? 'white' : '#1e293b',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    👑 Phòng VIP
                                </button>
                            </div>
                        </div>

                        {selectedRoomType === 'vip' ? (
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>🏛️ Chọn phòng VIP</label>
                                <select
                                    value={selectedRoomId}
                                    onChange={(e) => {
                                        const roomId = e.target.value;
                                        setSelectedRoomId(roomId);
                                        setSelectedArea('');
                                        setSelectedTableId('');
                                        setSelectedTableNumber('');
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
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>🏘️ Chọn khu vực</label>
                                    <select
                                        value={selectedArea}
                                        onChange={(e) => {
                                            setSelectedArea(e.target.value);
                                            setSelectedTableId('');
                                            setSelectedTableNumber('');
                                        }}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    >
                                        <option value="">Chọn khu vực</option>
                                        {areas.map(area => (
                                            <option key={area} value={area}>Khu {area}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedArea && (
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
                                                    Bàn {table.number} (Sức chứa: {table.capacity} người) - {table.status === 'OCCUPIED' ? '🔴 Đã có khách' : '🟢 Trống'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        {((selectedRoomType === 'vip' && selectedRoomId) ||
                            (selectedRoomType === 'normal' && selectedArea && selectedTableId)) && (
                                <div style={{ marginTop: '10px', padding: '8px', background: '#dbeafe', borderRadius: '6px' }}>
                                    <span style={{ fontSize: '12px', color: '#1e40af' }}>
                                        📍 Vị trí: {getLocationName()}
                                    </span>
                                </div>
                            )}
                    </div>

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
                                    <input
                                        type="text"
                                        placeholder="📝 Ghi chú món..."
                                        value={item.note}
                                        onChange={(e) => updateItemNote(item.id, e.target.value)}
                                        style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '8px', fontSize: '12px' }}
                                    />
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '15px', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Tạm tính:</span>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{calculateSubtotal().toLocaleString('vi-VN')}đ</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 'bold' }}>Tổng thanh toán:</span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{calculateTotal().toLocaleString('vi-VN')}đ</span>
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