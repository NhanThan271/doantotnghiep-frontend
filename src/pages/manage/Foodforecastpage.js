import React, { useState, useEffect } from 'react';
import {
    TrendingUp, TrendingDown, Minus, BarChart2,
    RefreshCw, Search, Store, ChevronDown, ChevronUp,
    UtensilsCrossed, Calendar, Hash
} from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';
import { showToast } from '../../hooks/useToast';

const API = '/api/food-forecast';

const TREND_CONFIG = {
    UP: { icon: TrendingUp, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', label: 'Tăng' },
    DOWN: { icon: TrendingDown, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', label: 'Giảm' },
    STABLE: { icon: Minus, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: 'Ổn định' },
};

// Mini bar chart SVG
function MiniBar({ data = [] }) {
    if (!data.length) return <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>;
    const max = Math.max(...data, 1);
    const W = 88, H = 28, gap = 2;
    const bw = (W - gap * (data.length - 1)) / data.length;
    return (
        <svg width={W} height={H}>
            {data.map((v, i) => {
                const h = Math.max(3, (v / max) * H);
                return (
                    <rect key={i}
                        x={i * (bw + gap)} y={H - h}
                        width={bw} height={h}
                        fill="#93c5fd" rx={2} />
                );
            })}
        </svg>
    );
}

export default function FoodForecastPage({ branches = [] }) {
    const [mode, setMode] = useState('WEEK');
    const [branchId, setBranchId] = useState('');
    const [topN, setTopN] = useState(10);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const token = () => localStorage.getItem('token');

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ mode, topN });
            if (branchId) params.set('branchId', branchId);
            const res = await fetch(`${API}?${params}`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            if (!res.ok) throw new Error();
            setData(await res.json());
        } catch {
            showToast('error', 'Lỗi', 'Không thể tải dữ liệu dự báo. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [mode, branchId, topN]);

    const filtered = data.filter(row =>
        row.foodName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalForecast = data.reduce((s, r) => s + (r.forecastNextPeriod || 0), 0);
    const upCount = data.filter(r => r.trend === 'UP').length;
    const downCount = data.filter(r => r.trend === 'DOWN').length;
    const periodLabel = mode === 'WEEK' ? 'tuần tới' : 'tháng tới';

    const selectedBranchName = branches.find(b => String(b.id) === String(branchId))?.name || 'Tất cả chi nhánh';

    return (
        <div className={styles.pageContainer}>

            {/* ── HEADER ── */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>Dự báo món bán chạy</h2>
                        <p className={styles.branchInfo}>
                            <Store size={16} />
                            <span className={styles.branchName}>{selectedBranchName}</span>
                            <span className={styles.branchAddress}>
                                • {mode === 'WEEK' ? 'Dự báo theo tuần' : 'Dự báo theo tháng'}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)',
                            background: 'transparent', cursor: 'pointer', fontSize: 13,
                            color: 'var(--color-text-secondary)', fontWeight: 600
                        }}
                    >
                        <RefreshCw size={15} className={loading ? styles.spinIcon : ''} />
                        Làm mới
                    </button>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}><UtensilsCrossed size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{data.length}</div>
                            <div className={styles.statLabel}>Tổng món theo dõi</div>
                        </div>
                    </div>
                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}><TrendingUp size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{upCount}</div>
                            <div className={styles.statLabel}>Xu hướng tăng</div>
                        </div>
                    </div>
                    <div className={styles.statCardDanger}>
                        <div className={styles.statIcon}><TrendingDown size={24} /></div>
                        <div>
                            <div className={styles.statValue}>{downCount}</div>
                            <div className={styles.statLabel}>Xu hướng giảm</div>
                        </div>
                    </div>
                </div>

                {/* Filter bar */}
                <div className={styles.filterBar}>
                    {/* Search */}
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên món..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    {/* Mode toggle tabs */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[
                            { value: 'WEEK', label: 'Theo tuần', icon: Calendar },
                            { value: 'MONTH', label: 'Theo tháng', icon: Calendar },
                        ].map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={() => setMode(value)}
                                className={mode === value ? styles.tabActive : styles.tabInactive}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <Icon size={15} /> {label}
                            </button>
                        ))}
                    </div>

                    {/* Branch select */}
                    {branches.length > 0 && (
                        <select
                            value={branchId}
                            onChange={e => setBranchId(e.target.value)}
                            style={{
                                padding: '8px 12px', borderRadius: 8,
                                border: '1px solid var(--color-border)',
                                fontSize: 14, background: 'var(--color-bg)',
                                color: 'var(--color-text-secondary)', cursor: 'pointer'
                            }}
                        >
                            <option value="">Tất cả chi nhánh</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    )}

                    {/* TopN select */}
                    <select
                        value={topN}
                        onChange={e => setTopN(Number(e.target.value))}
                        style={{
                            padding: '8px 12px', borderRadius: 8,
                            border: '1px solid var(--color-border)',
                            fontSize: 14, background: 'var(--color-bg)',
                            color: 'var(--color-text-secondary)', cursor: 'pointer'
                        }}
                    >
                        {[5, 10, 20].map(n => (
                            <option key={n} value={n}>Top {n}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── DANH SÁCH ── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    <RefreshCw size={32} className={styles.spinIcon} />
                    <p style={{ marginTop: 12 }}>Đang tải dữ liệu dự báo...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                    <BarChart2 size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 16 }}>Không có dữ liệu dự báo</p>
                </div>
            ) : (
                filtered.map((row, idx) => {
                    const isExpanded = expandedId === row.foodId;
                    const T = TREND_CONFIG[row.trend] || TREND_CONFIG.STABLE;
                    const Icon = T.icon;

                    return (
                        <div key={row.foodId} className={styles.tableCard} style={{ marginBottom: 12 }}>

                            {/* Card header */}
                            <div
                                onClick={() => setExpandedId(isExpanded ? null : row.foodId)}
                                style={{
                                    padding: '16px 20px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none'
                                }}
                            >
                                {/* Rank badge */}
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                    background: idx < 3
                                        ? 'linear-gradient(135deg, #E07B39, #B85C1E)'
                                        : 'linear-gradient(135deg, #4361ee, #3a0ca3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 16, color: '#fff'
                                }}>
                                    {idx + 1}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                                            {row.foodName}
                                        </span>

                                        {/* Trend badge */}
                                        <span style={{
                                            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                            background: T.bg, color: T.color, border: `1px solid ${T.border}`,
                                            display: 'inline-flex', alignItems: 'center', gap: 4
                                        }}>
                                            <Icon size={12} /> {T.label}
                                        </span>

                                        {/* Forecast badge */}
                                        <span style={{
                                            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                            background: 'rgba(37,99,235,0.08)', color: '#2563eb',
                                            border: '1px solid rgba(37,99,235,0.2)'
                                        }}>
                                            Dự báo {periodLabel}: <strong>{row.forecastNextPeriod}</strong>
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                            <Hash size={13} /> Đã bán: {row.totalPast}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                            <BarChart2 size={13} /> TB/kỳ: {row.avgPerPeriod?.toFixed(1)}
                                        </span>
                                    </div>
                                </div>

                                {/* Mini sparkline preview */}
                                <div style={{ flexShrink: 0, opacity: 0.7 }}>
                                    <MiniBar data={row.history} />
                                </div>

                                <div style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                                <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.02)' }}>

                                    {/* Stat grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                                            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Tổng đã bán</div>
                                            <div style={{ fontWeight: 700, fontSize: 18, color: '#1f2937' }}>{row.totalPast}</div>
                                        </div>
                                        <div style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 8, padding: '10px 14px' }}>
                                            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Dự báo {periodLabel}</div>
                                            <div style={{ fontWeight: 700, fontSize: 18, color: '#2563eb' }}>{row.forecastNextPeriod}</div>
                                        </div>
                                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                                            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Trung bình / kỳ</div>
                                            <div style={{ fontWeight: 700, fontSize: 18, color: '#1f2937' }}>{row.avgPerPeriod?.toFixed(1)}</div>
                                        </div>
                                    </div>

                                    {/* History sparkline larger */}
                                    {row.history?.length > 0 && (
                                        <div style={{
                                            padding: '12px 14px', borderRadius: 8,
                                            background: 'rgba(37,99,235,0.04)',
                                            border: '1px solid rgba(37,99,235,0.12)',
                                            marginBottom: 12
                                        }}>
                                            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Lịch sử bán theo kỳ</div>
                                            <LargeBar data={row.history} mode={mode} />
                                        </div>
                                    )}

                                    {/* Trend indicator */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <span style={{
                                            padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                            background: T.bg, color: T.color, border: `1px solid ${T.border}`,
                                            display: 'inline-flex', alignItems: 'center', gap: 6
                                        }}>
                                            <Icon size={15} /> Xu hướng: {T.label}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* Footer summary */}
            {!loading && filtered.length > 0 && (
                <div style={{
                    marginTop: 8, padding: '12px 20px', borderRadius: 12,
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

// Larger bar chart with labels
function LargeBar({ data = [], mode }) {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const W = '100%';
    const H = 60;
    const gap = 4;
    const count = data.length;

    return (
        <svg width={W} height={H} style={{ display: 'block' }} viewBox={`0 0 ${count * 32} ${H}`} preserveAspectRatio="none">
            {data.map((v, i) => {
                const bw = 28;
                const x = i * 32;
                const h = Math.max(4, (v / max) * (H - 16));
                return (
                    <g key={i}>
                        <rect x={x} y={H - h - 16} width={bw} height={h} fill="#93c5fd" rx={3} />
                        <text x={x + bw / 2} y={H - 2} textAnchor="middle"
                            fontSize={9} fill="#9ca3af">
                            {mode === 'WEEK' ? `T${i + 1}` : `Th${i + 1}`}
                        </text>
                        <text x={x + bw / 2} y={H - h - 20} textAnchor="middle"
                            fontSize={9} fill="#6b7280" fontWeight="600">
                            {v}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}