import React, { useState, useEffect } from 'react';
import {
    TrendingUp, TrendingDown, Minus, BarChart2,
    RefreshCw, Search, Store, UtensilsCrossed, ChevronRight
} from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';
import { showToast } from '../../hooks/useToast';

const API_BASE_URL = '';

const TREND_CONFIG = {
    UP: { icon: TrendingUp, color: '#16a34a', bg: 'rgba(22,163,74,0.1)', border: 'rgba(22,163,74,0.25)', label: 'Tăng' },
    DOWN: { icon: TrendingDown, color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)', label: 'Giảm' },
    STABLE: { icon: Minus, color: '#d97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.25)', label: 'Ổn định' },
};

export default function FoodForecastPage() {
    const [currentBranch, setCurrentBranch] = useState(null);
    const [mode, setMode] = useState('WEEK');
    const [topN, setTopN] = useState(10);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState('totalPast');
    const [sortAsc, setSortAsc] = useState(false);
    const [expandedFoodId, setExpandedFoodId] = useState(null);
    const [recipeCache, setRecipeCache] = useState({});
    const [recipeLoading, setRecipeLoading] = useState(false);

    const token = () => localStorage.getItem('token');
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

    const fetchCurrentBranch = async () => {
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            let branchId = user?.branch?.id || user?.branchId;
            if (!branchId) {
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token()}` }
                });
                if (!res.ok) throw new Error();
                const d = await res.json();
                branchId = d.branch?.id;
                if (branchId) localStorage.setItem('user', JSON.stringify({ ...user, branchId, branch: d.branch }));
            }
            if (!branchId) { alert('Tài khoản chưa được gán chi nhánh.'); return; }
            const res = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            if (res.ok) setCurrentBranch(await res.json());
        } catch {
            showToast('error', 'Lỗi', 'Không thể tải thông tin chi nhánh. Vui lòng thử lại.');
        }
    };

    const fetchData = async () => {
        if (!currentBranch?.id) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                mode, topN,
                branchId: currentBranch.id,
                from: dateFrom,
                to: dateTo
            });
            const res = await fetch(`${API_BASE_URL}/api/food-forecast?${params}`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            if (!res.ok) throw new Error();
            const json = await res.json();

            console.table(json.map(r => ({
                tên: r.foodName,
                trend: r.trend,
                'số kỳ': r.history?.length,
                history: JSON.stringify(r.history),
            })));

            setData(json);

        } catch {
            showToast('error', 'Lỗi', 'Không thể tải dữ liệu dự báo. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRecipe = async (foodId) => {
        if (recipeCache[foodId]) return;
        setRecipeLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/recipes/food/${foodId}`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            if (!res.ok) throw new Error();
            const json = await res.json();
            setRecipeCache(prev => ({ ...prev, [foodId]: json }));
        } catch {
            showToast('error', 'Lỗi', 'Không thể tải công thức món ăn.');
            setRecipeCache(prev => ({ ...prev, [foodId]: [] }));
        } finally {
            setRecipeLoading(false);
        }
    };

    const handleRowClick = (foodId) => {
        if (expandedFoodId === foodId) {
            setExpandedFoodId(null);
        } else {
            setExpandedFoodId(foodId);
            fetchRecipe(foodId);
        }
    };

    useEffect(() => { fetchCurrentBranch(); }, []);
    useEffect(() => { fetchData(); }, [currentBranch, mode, topN, dateFrom, dateTo]);

    const handleSort = (key) => {
        if (sortKey === key) setSortAsc(a => !a);
        else { setSortKey(key); setSortAsc(false); }
    };

    const filtered = data
        .filter(row => row.foodName?.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
            return sortAsc ? va - vb : vb - va;
        });

    const totalForecast = data.reduce((s, r) => s + (r.forecastNextPeriod || 0), 0);
    const periodLabel = mode === 'WEEK' ? 'tuần tới' : 'tháng tới';

    const SortIcon = ({ k }) => {
        if (sortKey !== k) return <span style={{ opacity: 0.3, fontSize: 11 }}>⇅</span>;
        return <span style={{ fontSize: 11, color: '#2563eb' }}>{sortAsc ? '↑' : '↓'}</span>;
    };

    const thStyle = (k) => ({
        padding: '10px 14px',
        fontSize: 12,
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        borderBottom: '2px solid var(--color-border)',
        background: 'var(--color-bg-secondary, #f9fafb)',
        textAlign: k === 'foodName' ? 'left' : 'center',
    });

    if (!currentBranch) return (
        <div className={styles.loadingContainer}>
            <RefreshCw size={48} className={styles.spinIcon} />
            <p className={styles.loadingText}>Đang tải thông tin chi nhánh...</p>
        </div>
    );


    return (
        <div className={styles.pageContainer}>

            {/* ── HEADER ── */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>Dự báo món bán chạy</h2>
                        <p className={styles.branchInfo}>
                            <Store size={15} />
                            <span className={styles.branchName}>{currentBranch.name}</span>
                            {currentBranch.address && (
                                <span className={styles.branchAddress}>• {currentBranch.address}</span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 8,
                            border: '1px solid var(--color-border)',
                            background: 'transparent', cursor: 'pointer',
                            fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600
                        }}
                    >
                        <RefreshCw size={14} className={loading ? styles.spinIcon : ''} />
                        Làm mới
                    </button>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}><UtensilsCrossed size={22} /></div>
                        <div>
                            <div className={styles.statValue}>{data.length}</div>
                            <div className={styles.statLabel}>Tổng món theo dõi</div>
                        </div>
                    </div>
                </div>

                {/* Filter bar */}
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên món..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            style={{
                                padding: '8px 10px', borderRadius: 8,
                                border: '1px solid var(--color-border)',
                                fontSize: 13, background: 'var(--color-bg)',
                                color: 'var(--color-text-secondary)'
                            }}
                        />
                        <span style={{ color: '#9ca3af' }}>→</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            style={{
                                padding: '8px 10px', borderRadius: 8,
                                border: '1px solid var(--color-border)',
                                fontSize: 13, background: 'var(--color-bg)',
                                color: 'var(--color-text-secondary)'
                            }}
                        />
                    </div>

                    <select
                        value={topN}
                        onChange={e => setTopN(Number(e.target.value))}
                        style={{
                            padding: '8px 12px', borderRadius: 8,
                            border: '1px solid var(--color-border)',
                            fontSize: 13, background: 'var(--color-bg)',
                            color: 'var(--color-text-secondary)', cursor: 'pointer'
                        }}
                    >
                        {[5, 10, 20].map(n => <option key={n} value={n}>Top {n}</option>)}
                    </select>
                </div>
            </div>

            {/* ── TABLE ── */}
            <div className={styles.tableCard} style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                        <RefreshCw size={28} className={styles.spinIcon} />
                        <p style={{ marginTop: 10, fontSize: 14 }}>Đang tải dữ liệu...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                        <BarChart2 size={40} style={{ opacity: 0.25, marginBottom: 10 }} />
                        <p style={{ fontSize: 15 }}>Không có dữ liệu dự báo</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr>
                                    <th style={{ ...thStyle('rank'), width: 52, textAlign: 'center' }}>#</th>
                                    <th style={thStyle('foodName')} onClick={() => handleSort('foodName')}>
                                        Tên món <SortIcon k="foodName" />
                                    </th>
                                    <th style={thStyle('totalPast')} onClick={() => handleSort('totalPast')}>
                                        Đã bán <SortIcon k="totalPast" />
                                    </th>
                                    <th style={thStyle('avgPerPeriod')} onClick={() => handleSort('avgPerPeriod')}>
                                        TB/kỳ <SortIcon k="avgPerPeriod" />
                                    </th>
                                    <th style={thStyle('forecastNextPeriod')} onClick={() => handleSort('forecastNextPeriod')}>
                                        Dự báo {periodLabel} <SortIcon k="forecastNextPeriod" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((row, idx) => {
                                    const T = TREND_CONFIG[row.trend] || TREND_CONFIG.STABLE;
                                    const isTop3 = idx < 3;
                                    const isExpanded = expandedFoodId === row.foodId;
                                    const recipe = recipeCache[row.foodId];

                                    return (
                                        <React.Fragment key={row.foodId}>
                                            <tr
                                                style={{
                                                    borderBottom: '1px solid var(--color-border)',
                                                    background: isExpanded
                                                        ? 'rgba(37,99,235,0.06)'
                                                        : (idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)'),
                                                    transition: 'background 0.15s',
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() => handleRowClick(row.foodId)}
                                                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(37,99,235,0.04)'; }}
                                                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)'; }}
                                            >
                                                {/* Rank */}
                                                <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: '50%', margin: '0 auto',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 700, fontSize: 13, color: '#fff',
                                                        background: isTop3
                                                            ? 'linear-gradient(135deg, #E07B39, #B85C1E)'
                                                            : 'linear-gradient(135deg, #4361ee, #3a0ca3)',
                                                    }}>
                                                        {idx + 1}
                                                    </div>
                                                </td>

                                                {/* Tên món */}
                                                <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <ChevronRight
                                                            size={14}
                                                            style={{
                                                                color: '#9ca3af',
                                                                transition: 'transform 0.15s',
                                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                        {row.foodName}
                                                    </span>
                                                </td>

                                                {/* Đã bán */}
                                                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>
                                                    {row.totalPast?.toLocaleString()}
                                                </td>

                                                {/* TB/kỳ */}
                                                <td style={{ textAlign: 'center', padding: '10px 14px', color: '#6b7280' }}>
                                                    {row.avgPerPeriod?.toFixed(1)}
                                                </td>

                                                {/* Dự báo */}
                                                <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '3px 12px', borderRadius: 20,
                                                        background: 'rgba(37,99,235,0.08)',
                                                        color: '#2563eb', fontWeight: 700, fontSize: 13,
                                                        border: '1px solid rgba(37,99,235,0.2)',
                                                    }}>
                                                        {row.forecastNextPeriod}
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Hàng công thức mở rộng */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} style={{ padding: 0, background: 'rgba(37,99,235,0.03)' }}>
                                                        <div style={{ padding: '14px 20px 18px 52px' }}>
                                                            {recipeLoading && !recipe ? (
                                                                <div style={{ fontSize: 13, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <RefreshCw size={14} className={styles.spinIcon} />
                                                                    Đang tải công thức...
                                                                </div>
                                                            ) : !recipe || recipe.length === 0 ? (
                                                                <div style={{ fontSize: 13, color: '#9ca3af' }}>
                                                                    Chưa có công thức cho món này.
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                        Nguyên liệu cần cho 1 phần
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                                        {recipe.map(r => (
                                                                            <div
                                                                                key={r.id}
                                                                                style={{
                                                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                                                    padding: '6px 12px', borderRadius: 8,
                                                                                    background: '#fff',
                                                                                    border: '1px solid var(--color-border)',
                                                                                    fontSize: 13,
                                                                                }}
                                                                            >
                                                                                <span style={{ fontWeight: 600, color: '#374151' }}>
                                                                                    {r.ingredient?.name}
                                                                                </span>
                                                                                <span style={{ color: '#2563eb', fontWeight: 700 }}>
                                                                                    {r.quantityRequired}
                                                                                </span>
                                                                                <span style={{ color: '#9ca3af' }}>
                                                                                    {r.ingredient?.unit}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── FOOTER ── */}
            {!loading && filtered.length > 0 && (
                <div style={{
                    marginTop: 8, padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.12)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 13, color: 'var(--color-text-secondary)'
                }}>
                    <span>Hiển thị <strong>{filtered.length}</strong> / {data.length} món</span>
                    <span>Tổng dự báo {periodLabel}: <strong style={{ color: '#2563eb', fontSize: 15 }}>{totalForecast}</strong></span>
                </div>
            )}
        </div>
    );
}