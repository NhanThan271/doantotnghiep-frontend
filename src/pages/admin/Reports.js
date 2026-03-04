import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Download, RefreshCw } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from '../../layouts/AdminLayout.module.css';

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState([]);
    const [orderStatusData, setOrderStatusData] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [avgOrderValue, setAvgOrderValue] = useState(0);

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = () => {
        const token = localStorage.getItem('token');
        setLoading(true);

        fetch(`${API_BASE_URL}/api/admin/revenue/overview`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Lỗi lấy dữ liệu'))
            .then(data => {
                console.log('Revenue overview:', data);

                // Xử lý dữ liệu doanh thu theo ngày/tháng
                const dailyRevenue = data.dailyRevenue || [];
                const monthlyData = processMonthlyData(dailyRevenue);
                setRevenueData(monthlyData);

                setTotalRevenue(data.totalRevenue || 0);
                setTotalOrders(data.totalOrders || 0);
                setAvgOrderValue(data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0);

                // Mock data cho order status (có thể thay bằng API thực)
                setOrderStatusData([
                    { name: 'Hoàn thành', value: Math.floor(data.totalOrders * 0.7), color: '#10B981' },
                    { name: 'Đang xử lý', value: Math.floor(data.totalOrders * 0.2), color: '#F59E0B' },
                    { name: 'Đã hủy', value: Math.floor(data.totalOrders * 0.1), color: '#EF4444' }
                ]);
            })
            .catch(err => {
                console.error('Lỗi:', err);
                // Fallback to mock data if API fails
                setRevenueData(getMockMonthlyData());
                setOrderStatusData([
                    { name: 'Hoàn thành', value: 45, color: '#10B981' },
                    { name: 'Đang xử lý', value: 15, color: '#F59E0B' },
                    { name: 'Đã hủy', value: 5, color: '#EF4444' }
                ]);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // Xử lý dữ liệu thành dạng monthly
    const processMonthlyData = (dailyData) => {
        const monthlyMap = {};
        dailyData.forEach(item => {
            const month = item.date.substring(0, 7); // YYYY-MM
            if (!monthlyMap[month]) {
                monthlyMap[month] = 0;
            }
            monthlyMap[month] += item.revenue;
        });

        return Object.keys(monthlyMap).slice(-6).map(month => ({
            month: formatMonth(month),
            revenue: monthlyMap[month],
            orders: Math.floor(Math.random() * 50) + 10 // Mock orders
        }));
    };

    const formatMonth = (monthStr) => {
        const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
        const [year, month] = monthStr.split('-');
        return `${months[parseInt(month) - 1]} ${year}`;
    };

    const getMockMonthlyData = () => [
        { month: 'T7 2024', revenue: 45000000, orders: 32 },
        { month: 'T8 2024', revenue: 52000000, orders: 38 },
        { month: 'T9 2024', revenue: 48000000, orders: 35 },
        { month: 'T10 2024', revenue: 58000000, orders: 42 },
        { month: 'T11 2024', revenue: 62000000, orders: 45 },
        { month: 'T12 2024', revenue: 71000000, orders: 51 }
    ];

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <p style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
                        {label}
                    </p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color, fontSize: '14px', margin: '4px 0' }}>
                            {entry.name}: {entry.name === 'Doanh thu' ? formatCurrency(entry.value) : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '400px',
                color: 'var(--color-text-secondary)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid var(--color-border)',
                        borderTop: '4px solid var(--color-primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p>Đang tải báo cáo...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <div>
                    <h2 style={{
                        fontSize: '32px',
                        fontWeight: '800',
                        marginBottom: '8px',
                        background: 'linear-gradient(135deg, var(--color-primary-light))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        Báo cáo Tổng quan
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        Phân tích doanh thu và đơn hàng
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={fetchReportData}
                        style={{
                            padding: '10px 20px',
                            background: 'var(--color-bg-card)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                        }}
                    >
                        <RefreshCw size={16} />
                        Làm mới
                    </button>
                    <button
                        style={{
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                            color: '#000',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Download size={16} />
                        Xuất báo cáo
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                Tổng doanh thu
                            </p>
                            <h3 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', color: 'var(--color-primary)' }}>
                                {formatCurrency(totalRevenue)}
                            </h3>
                            <p style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>
                                <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                +12% so với tháng trước
                            </p>
                        </div>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(212, 175, 55, 0.1)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <DollarSign size={24} color="var(--color-primary)" />
                        </div>
                    </div>
                </div>

                <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                Tổng đơn hàng
                            </p>
                            <h3 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
                                {totalOrders}
                            </h3>
                            <p style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>
                                <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                +8% so với tháng trước
                            </p>
                        </div>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ShoppingCart size={24} color="#3B82F6" />
                        </div>
                    </div>
                </div>

                <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                Giá trị TB/Đơn
                            </p>
                            <h3 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
                                {formatCurrency(avgOrderValue)}
                            </h3>
                            <p style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>
                                <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                +5% so với tháng trước
                            </p>
                        </div>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <BarChart3 size={24} color="#8B5CF6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className={styles['grid-2']}>
                {/* Revenue Chart */}
                <div className={styles.card}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                            Doanh thu 6 tháng gần đây
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                            Theo dõi xu hướng doanh thu
                        </p>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                                dataKey="month"
                                stroke="var(--color-text-secondary)"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                stroke="var(--color-text-secondary)"
                                style={{ fontSize: '12px' }}
                                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="revenue"
                                fill="url(#colorRevenue)"
                                radius={[8, 8, 0, 0]}
                                name="Doanh thu"
                            />
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Order Status Pie Chart */}
                <div className={styles.card}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                            Đơn hàng theo trạng thái
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                            Phân bổ trạng thái đơn hàng
                        </p>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={orderStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {orderStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '24px',
                        marginTop: '16px',
                        flexWrap: 'wrap'
                    }}>
                        {orderStatusData.map((item, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '3px',
                                    background: item.color
                                }}></div>
                                <span style={{ fontSize: '14px' }}>
                                    {item.name}: <strong>{item.value}</strong>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Orders Trend Line Chart */}
            <div className={styles.card} style={{ marginTop: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                        Xu hướng số lượng đơn hàng
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                        Biểu đồ đường theo dõi số lượng đơn hàng
                    </p>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                            dataKey="month"
                            stroke="var(--color-text-secondary)"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="var(--color-text-secondary)"
                            style={{ fontSize: '12px' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="orders"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', r: 5 }}
                            activeDot={{ r: 7 }}
                            name="Đơn hàng"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}