// pages/employee/cashier/CashierDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CashierDashboard = () => {
    const navigate = useNavigate();
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [dateRange, setDateRange] = useState('today');
    const [stats, setStats] = useState({
        todayRevenue: 0,
        todayOrders: 0,
        pendingPayments: 0,
        completedOrders: 0,
        cashRevenue: 0,
        bankRevenue: 0,
        momoRevenue: 0
    });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBranches();
        fetchDashboardData();
    }, [selectedBranch, dateRange]);

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            // API call to get branches
            // const response = await fetch('/api/branches', {
            //     headers: { 'Authorization': `Bearer ${token}` }
            // });
            // const data = await response.json();

            // Mock data
            setBranches([
                { id: 1, name: 'Chi nhánh Quận 1' },
                { id: 2, name: 'Chi nhánh Quận 7' },
                { id: 3, name: 'Chi nhánh Bình Thạnh' },
            ]);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // API calls with filters
            // const response = await fetch(`/api/cashier/dashboard?branch=${selectedBranch}&range=${dateRange}`, {
            //     headers: { 'Authorization': `Bearer ${token}` }
            // });
            // const data = await response.json();

            // Mock data based on filters
            const mockStats = {
                todayRevenue: 12500000 + (selectedBranch === 1 ? 5000000 : selectedBranch === 2 ? 3000000 : 0),
                todayOrders: 45,
                pendingPayments: 8,
                completedOrders: 37,
                cashRevenue: 5200000,
                bankRevenue: 4800000,
                momoRevenue: 2500000
            };
            setStats(mockStats);

            setRecentTransactions([
                { id: 1, orderId: 'ORD001', customer: 'Nguyễn Văn A', amount: 450000, time: '10:30', status: 'completed', method: 'cash', branch: 'Quận 1' },
                { id: 2, orderId: 'ORD002', customer: 'Trần Thị B', amount: 780000, time: '10:15', status: 'completed', method: 'bank', branch: 'Quận 7' },
                { id: 3, orderId: 'ORD003', customer: 'Lê Văn C', amount: 350000, time: '09:45', status: 'pending', method: 'momo', branch: 'Quận 1' },
                { id: 4, orderId: 'ORD004', customer: 'Phạm Thị D', amount: 920000, time: '09:20', status: 'completed', method: 'cash', branch: 'Bình Thạnh' },
                { id: 5, orderId: 'ORD005', customer: 'Hoàng Văn E', amount: 210000, time: '08:50', status: 'pending', method: 'cash', branch: 'Quận 7' },
            ]);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon, color, subtitle }) => (
        <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${color}`,
            transition: 'transform 0.2s',
            cursor: 'pointer'
        }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{title}</p>
                    <h3 style={{ margin: '10px 0 0', fontSize: '28px', fontWeight: 'bold' }}>
                        {typeof value === 'number' && title.includes('Doanh thu')
                            ? `${value.toLocaleString('vi-VN')}đ`
                            : value.toLocaleString('vi-VN')}
                    </h3>
                    {subtitle && <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#64748b' }}>{subtitle}</p>}
                </div>
                <div style={{ fontSize: '32px' }}>{icon}</div>
            </div>
        </div>
    );

    const getPaymentMethodIcon = (method) => {
        const icons = {
            cash: '💵',
            bank: '🏦',
            momo: '📱'
        };
        return icons[method] || '💰';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('vi-VN');
    };

    const exportReport = () => {
        // Export to Excel/PDF
        console.log('Exporting report...');
    };

    return (
        <div>
            {/* Header with filters */}
            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Tổng quan thu ngân</h1>
                        <p style={{ margin: '5px 0 0', color: '#64748b' }}>Quản lý doanh thu và giao dịch</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={exportReport}
                            style={{
                                padding: '8px 16px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            📊 Xuất báo cáo
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            background: 'white'
                        }}
                    >
                        <option value="all">Tất cả chi nhánh</option>
                        {branches.map(branch => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                    </select>

                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            background: 'white'
                        }}
                    >
                        <option value="today">Hôm nay</option>
                        <option value="yesterday">Hôm qua</option>
                        <option value="week">Tuần này</option>
                        <option value="month">Tháng này</option>
                        <option value="custom">Tuỳ chỉnh</option>
                    </select>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <StatCard title="Doanh thu hôm nay" value={stats.todayRevenue} icon="💰" color="#10b981" />
                <StatCard title="Tổng đơn hàng" value={stats.todayOrders} icon="📋" color="#3b82f6" />
                <StatCard title="Chờ thanh toán" value={stats.pendingPayments} icon="⏳" color="#f59e0b" />
                <StatCard title="Đã hoàn thành" value={stats.completedOrders} icon="✅" color="#8b5cf6" />
            </div>

            {/* Revenue by Payment Method */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>Doanh thu theo phương thức</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>💵 Tiền mặt</span>
                                <span style={{ fontWeight: 'bold' }}>{stats.cashRevenue.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ background: '#e2e8f0', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.cashRevenue / stats.todayRevenue) * 100}%`, background: '#10b981', height: '100%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>🏦 Chuyển khoản</span>
                                <span style={{ fontWeight: 'bold' }}>{stats.bankRevenue.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ background: '#e2e8f0', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.bankRevenue / stats.todayRevenue) * 100}%`, background: '#3b82f6', height: '100%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>📱 Momo</span>
                                <span style={{ fontWeight: 'bold' }}>{stats.momoRevenue.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ background: '#e2e8f0', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.momoRevenue / stats.todayRevenue) * 100}%`, background: '#8b5cf6', height: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'white'
                }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>Thông tin nhanh</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Đơn trung bình</p>
                            <p style={{ margin: '5px 0 0', fontSize: '20px', fontWeight: 'bold' }}>
                                {(stats.todayRevenue / stats.todayOrders || 0).toLocaleString('vi-VN')}đ
                            </p>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Khách/ngày</p>
                            <p style={{ margin: '5px 0 0', fontSize: '20px', fontWeight: 'bold' }}>
                                {Math.floor(stats.todayOrders * 2.5)}
                            </p>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Giờ cao điểm</p>
                            <p style={{ margin: '5px 0 0', fontSize: '20px', fontWeight: 'bold' }}>18:00 - 20:00</p>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Món bán chạy</p>
                            <p style={{ margin: '5px 0 0', fontSize: '20px', fontWeight: 'bold' }}>Phở bò</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Giao dịch gần đây</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                width: '200px'
                            }}
                        />
                        <button
                            onClick={() => navigate('/employee/cashier/transactions')}
                            style={{
                                padding: '8px 16px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Xem tất cả
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ textAlign: 'left', padding: '12px', color: '#64748b' }}>Mã đơn</th>
                                    <th style={{ textAlign: 'left', padding: '12px', color: '#64748b' }}>Khách hàng</th>
                                    <th style={{ textAlign: 'left', padding: '12px', color: '#64748b' }}>Chi nhánh</th>
                                    <th style={{ textAlign: 'right', padding: '12px', color: '#64748b' }}>Số tiền</th>
                                    <th style={{ textAlign: 'center', padding: '12px', color: '#64748b' }}>Thanh toán</th>
                                    <th style={{ textAlign: 'center', padding: '12px', color: '#64748b' }}>Thời gian</th>
                                    <th style={{ textAlign: 'center', padding: '12px', color: '#64748b' }}>Trạng thái</th>
                                    <th style={{ textAlign: 'center', padding: '12px', color: '#64748b' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((transaction) => (
                                    <tr key={transaction.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>{transaction.orderId}</td>
                                        <td style={{ padding: '12px' }}>{transaction.customer}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>{transaction.branch}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500', color: '#10b981' }}>
                                            {transaction.amount.toLocaleString('vi-VN')}đ
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '18px' }}>{getPaymentMethodIcon(transaction.method)}</span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                                            {transaction.time}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: transaction.status === 'completed' ? '#10b98120' : '#f59e0b20',
                                                color: transaction.status === 'completed' ? '#10b981' : '#f59e0b',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}>
                                                {transaction.status === 'completed' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => navigate(`/employee/cashier/payment/${transaction.orderId}`)}
                                                style={{
                                                    padding: '4px 12px',
                                                    background: transaction.status === 'completed' ? '#cbd5e1' : '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: transaction.status === 'completed' ? 'not-allowed' : 'pointer',
                                                    fontSize: '12px'
                                                }}
                                                disabled={transaction.status === 'completed'}
                                            >
                                                {transaction.status === 'completed' ? 'Đã TT' : 'Thanh toán'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '15px',
                marginTop: '30px'
            }}>
                <button
                    onClick={() => navigate('/employee/cashier/payment')}
                    style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    💳 Thanh toán nhanh
                </button>
                <button
                    onClick={() => navigate('/employee/cashier/history')}
                    style={{
                        padding: '16px',
                        background: 'white',
                        color: '#3b82f6',
                        border: '1px solid #3b82f6',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}
                >
                    📜 Lịch sử giao dịch
                </button>
                <button
                    onClick={() => navigate('/employee/cashier/revenue')}
                    style={{
                        padding: '16px',
                        background: 'white',
                        color: '#10b981',
                        border: '1px solid #10b981',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}
                >
                    📊 Báo cáo chi tiết
                </button>
                <button
                    onClick={() => window.print()}
                    style={{
                        padding: '16px',
                        background: 'white',
                        color: '#f59e0b',
                        border: '1px solid #f59e0b',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}
                >
                    🖨️ In báo cáo ngày
                </button>
            </div>
        </div>
    );
};

export default CashierDashboard;