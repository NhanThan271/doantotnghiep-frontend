// pages/employee/stock/StockDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StockDashboard = () => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [categories, setCategories] = useState([]);
    const [recentImports, setRecentImports] = useState([]);
    const [recentExports, setRecentExports] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [totalValue, setTotalValue] = useState(0);
    const [lowStockCount, setLowStockCount] = useState(0);
    const [outOfStockCount, setOutOfStockCount] = useState(0);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Mock inventory data with categories
            const inventoryData = [
                { id: 1, name: 'Thịt bò Mỹ', category: 'meat', quantity: 15, unit: 'kg', price: 250000, threshold: 5, expiryDate: '2024-02-15', location: 'Kho lạnh A' },
                { id: 2, name: 'Thịt gà ta', category: 'meat', quantity: 20, unit: 'kg', price: 120000, threshold: 8, expiryDate: '2024-02-10', location: 'Kho lạnh A' },
                { id: 3, name: 'Tôm sú', category: 'seafood', quantity: 3, unit: 'kg', price: 350000, threshold: 5, expiryDate: '2024-02-08', location: 'Kho lạnh B' },
                { id: 4, name: 'Mực tươi', category: 'seafood', quantity: 2, unit: 'kg', price: 280000, threshold: 4, expiryDate: '2024-02-07', location: 'Kho lạnh B' },
                { id: 5, name: 'Rau cải', category: 'vegetable', quantity: 5, unit: 'kg', price: 30000, threshold: 5, expiryDate: '2024-02-05', location: 'Kho mát' },
                { id: 6, name: 'Rau thơm', category: 'vegetable', quantity: 0.5, unit: 'kg', price: 50000, threshold: 2, expiryDate: '2024-02-04', location: 'Kho mát' },
                { id: 7, name: 'Gạo ST25', category: 'dry', quantity: 100, unit: 'kg', price: 25000, threshold: 20, expiryDate: '2024-06-30', location: 'Kho khô' },
                { id: 8, name: 'Dầu ăn', category: 'oil', quantity: 8, unit: 'lít', price: 35000, threshold: 5, expiryDate: '2024-05-15', location: 'Kho khô' },
                { id: 9, name: 'Trứng gà', category: 'egg', quantity: 25, unit: 'quả', price: 4000, threshold: 50, expiryDate: '2024-02-10', location: 'Kho mát' },
                { id: 10, name: 'Gia vị các loại', category: 'spice', quantity: 15, unit: 'gói', price: 15000, threshold: 10, expiryDate: '2024-04-30', location: 'Kho khô' },
            ];
            setInventory(inventoryData);

            // Calculate stats
            const total = inventoryData.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            setTotalValue(total);

            const lowStock = inventoryData.filter(item => item.quantity <= item.threshold && item.quantity > 0).length;
            setLowStockCount(lowStock);

            const outOfStock = inventoryData.filter(item => item.quantity === 0).length;
            setOutOfStockCount(outOfStock);

            // Categories
            const uniqueCategories = [...new Set(inventoryData.map(item => item.category))];
            setCategories(uniqueCategories);

            setRecentImports([
                { id: 'IMP001', supplier: 'Công ty Thực phẩm X', items: 5, total: 2500000, date: '2024-01-15', status: 'completed', receivedBy: 'Nguyễn Văn A' },
                { id: 'IMP002', supplier: 'Công ty Rau sạch Y', items: 8, total: 1200000, date: '2024-01-14', status: 'completed', receivedBy: 'Trần Thị B' },
                { id: 'IMP003', supplier: 'Công ty Hải sản Z', items: 3, total: 3500000, date: '2024-01-13', status: 'pending', receivedBy: '-' },
            ]);

            setRecentExports([
                { id: 'EXP001', to: 'Bếp chính', items: 12, total: 1500000, date: '2024-01-15', status: 'completed', requestedBy: 'Đầu bếp Đức' },
                { id: 'EXP002', to: 'Bếp phụ', items: 8, total: 800000, date: '2024-01-14', status: 'completed', requestedBy: 'Đầu bếp Minh' },
            ]);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const getStockStatus = (quantity, threshold) => {
        if (quantity === 0) {
            return { color: '#ef4444', text: 'Hết hàng', icon: '❌', bg: '#fee2e2' };
        } else if (quantity <= threshold) {
            return { color: '#f59e0b', text: 'Sắp hết', icon: '⚠️', bg: '#fef3c7' };
        } else if (quantity <= threshold * 2) {
            return { color: '#3b82f6', text: 'Còn ít', icon: '📦', bg: '#dbeafe' };
        }
        return { color: '#10b981', text: 'Tốt', icon: '✅', bg: '#d1fae5' };
    };

    const getCategoryIcon = (category) => {
        const icons = {
            meat: '🥩',
            seafood: '🦐',
            vegetable: '🥬',
            dry: '🍚',
            oil: '🫒',
            egg: '🥚',
            spice: '🧂'
        };
        return icons[category] || '📦';
    };

    const getExpiryStatus = (expiryDate) => {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: '#ef4444', text: 'Hết hạn' };
        if (diffDays <= 3) return { color: '#ef4444', text: `Sắp hết hạn (${diffDays} ngày)` };
        if (diffDays <= 7) return { color: '#f59e0b', text: `${diffDays} ngày` };
        return { color: '#10b981', text: 'Còn hạn' };
    };

    const StatCard = ({ title, value, icon, color, bgColor }) => (
        <div style={{
            background: bgColor || 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${color}`,
            transition: 'transform 0.2s'
        }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{title}</p>
                    <h3 style={{ margin: '10px 0 0', fontSize: '28px', fontWeight: 'bold' }}>
                        {typeof value === 'number' && title.includes('Giá trị')
                            ? `${value.toLocaleString('vi-VN')}đ`
                            : value.toLocaleString('vi-VN')}
                    </h3>
                </div>
                <div style={{ fontSize: '32px' }}>{icon}</div>
            </div>
        </div>
    );

    const filteredInventory = inventory.filter(item => {
        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    return (
        <div>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Quản lý kho</h1>
                <p style={{ margin: '5px 0 0', color: '#64748b' }}>Theo dõi nguyên liệu, nhập xuất và tồn kho</p>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <StatCard title="Tổng giá trị kho" value={totalValue} icon="💰" color="#10b981" />
                <StatCard title="Mặt hàng đang có" value={inventory.length} icon="📦" color="#3b82f6" />
                <StatCard title="Sắp hết" value={lowStockCount} icon="⚠️" color="#f59e0b" bgColor="#fef3c7" />
                <StatCard title="Hết hàng" value={outOfStockCount} icon="❌" color="#ef4444" bgColor="#fee2e2" />
            </div>

            {/* Category Filter & Search */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '15px'
            }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setSelectedCategory('all')}
                        style={{
                            padding: '8px 16px',
                            background: selectedCategory === 'all' ? '#3b82f6' : 'white',
                            color: selectedCategory === 'all' ? 'white' : '#1e293b',
                            border: `1px solid ${selectedCategory === 'all' ? '#3b82f6' : '#cbd5e1'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        📦 Tất cả
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            style={{
                                padding: '8px 16px',
                                background: selectedCategory === cat ? '#3b82f6' : 'white',
                                color: selectedCategory === cat ? 'white' : '#1e293b',
                                border: `1px solid ${selectedCategory === cat ? '#3b82f6' : '#cbd5e1'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="🔍 Tìm nguyên liệu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            width: '200px'
                        }}
                    />
                    <button
                        onClick={() => navigate('/employee/stock/import')}
                        style={{
                            padding: '8px 16px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        + Nhập hàng
                    </button>
                </div>
            </div>

            {/* Inventory Table */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '30px',
                overflowX: 'auto'
            }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Danh sách tồn kho</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ textAlign: 'left', padding: '12px' }}>Nguyên liệu</th>
                            <th style={{ textAlign: 'left', padding: '12px' }}>Danh mục</th>
                            <th style={{ textAlign: 'right', padding: '12px' }}>Tồn kho</th>
                            <th style={{ textAlign: 'right', padding: '12px' }}>Đơn giá</th>
                            <th style={{ textAlign: 'right', padding: '12px' }}>Thành tiền</th>
                            <th style={{ textAlign: 'center', padding: '12px' }}>Hạn sử dụng</th>
                            <th style={{ textAlign: 'center', padding: '12px' }}>Vị trí</th>
                            <th style={{ textAlign: 'center', padding: '12px' }}>Trạng thái</th>
                            <th style={{ textAlign: 'center', padding: '12px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInventory.map(item => {
                            const status = getStockStatus(item.quantity, item.threshold);
                            const expiry = getExpiryStatus(item.expiryDate);
                            return (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: status.bg }}>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{item.name}</td>
                                    <td style={{ padding: '12px' }}>
                                        {getCategoryIcon(item.category)} {item.category}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                        {item.price.toLocaleString('vi-VN')}đ
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: '#10b981' }}>
                                        {(item.quantity * item.price).toLocaleString('vi-VN')}đ
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{ color: expiry.color, fontSize: '12px' }}>
                                            {expiry.text}
                                        </span>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                            {item.expiryDate}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                                        {item.location}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: `${status.color}20`,
                                            color: status.color,
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            {status.icon} {status.text}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => navigate(`/employee/stock/inventory/${item.id}`)}
                                            style={{
                                                padding: '4px 8px',
                                                background: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '11px'
                                            }}
                                        >
                                            Cập nhật
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '20px'
            }}>
                {/* Recent Imports */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0 }}>📥 Nhập hàng gần đây</h3>
                        <button
                            onClick={() => navigate('/employee/stock/import/history')}
                            style={{
                                padding: '6px 12px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Xem lịch sử
                        </button>
                    </div>
                    {recentImports.map(imp => (
                        <div
                            key={imp.id}
                            style={{
                                padding: '12px',
                                borderBottom: '1px solid #f1f5f9',
                                marginBottom: '10px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold' }}>{imp.id}</span>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: imp.status === 'completed' ? '#10b98120' : '#f59e0b20',
                                    color: imp.status === 'completed' ? '#10b981' : '#f59e0b',
                                    fontSize: '11px'
                                }}>
                                    {imp.status === 'completed' ? '✓ Đã nhập' : '⏳ Đang chờ'}
                                </span>
                            </div>
                            <p style={{ margin: '0 0 5px', fontSize: '13px', fontWeight: '500' }}>{imp.supplier}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                                <span>{imp.items} mặt hàng</span>
                                <span style={{ fontWeight: '500', color: '#10b981' }}>
                                    {imp.total.toLocaleString('vi-VN')}đ
                                </span>
                                <span>{imp.date}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>
                                Người nhập: {imp.receivedBy}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Exports */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0 }}>📤 Xuất hàng gần đây</h3>
                        <button
                            onClick={() => navigate('/employee/stock/export/history')}
                            style={{
                                padding: '6px 12px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Xem lịch sử
                        </button>
                    </div>
                    {recentExports.map(exp => (
                        <div
                            key={exp.id}
                            style={{
                                padding: '12px',
                                borderBottom: '1px solid #f1f5f9',
                                marginBottom: '10px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold' }}>{exp.id}</span>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: '#10b98120',
                                    color: '#10b981',
                                    fontSize: '11px'
                                }}>
                                    ✓ Hoàn thành
                                </span>
                            </div>
                            <p style={{ margin: '0 0 5px', fontSize: '13px', fontWeight: '500' }}>Xuất cho: {exp.to}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                                <span>{exp.items} mặt hàng</span>
                                <span style={{ fontWeight: '500', color: '#ef4444' }}>
                                    {exp.total.toLocaleString('vi-VN')}đ
                                </span>
                                <span>{exp.date}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>
                                Yêu cầu: {exp.requestedBy}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginTop: '30px'
            }}>
                <button
                    onClick={() => navigate('/employee/stock/check')}
                    style={{
                        padding: '14px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    ✅ Kiểm kho định kỳ
                </button>
                <button
                    onClick={() => navigate('/employee/stock/low-stock')}
                    style={{
                        padding: '14px',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    📋 Danh sách hàng sắp hết
                </button>
                <button
                    onClick={() => navigate('/employee/stock/export')}
                    style={{
                        padding: '14px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    📤 Xuất hàng cho bếp
                </button>
                <button
                    onClick={() => window.print()}
                    style={{
                        padding: '14px',
                        background: '#1e293b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    🖨️ In báo cáo kho
                </button>
            </div>
        </div>
    );
};

export default StockDashboard;