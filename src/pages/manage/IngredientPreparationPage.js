import { useState, useEffect } from 'react';
import {
    FlaskConical, Search, Calendar, AlertTriangle, CheckCircle,
    RefreshCw, ChevronDown, ChevronUp, Package, Layers, Store
} from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';
import { showToast } from '../../hooks/useToast';

export default function IngredientPreparationPage() {
    const [branchId, setBranchId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('all');
    const [expandedIngredient, setExpandedIngredient] = useState(null);
    const [currentBranch, setCurrentBranch] = useState(null);

    const API_BASE_URL = '';
    const token = () => localStorage.getItem('token');

    useEffect(() => { fetchCurrentBranch(); }, []);
    useEffect(() => {
        if (!currentBranch) return;
        setBranchId(currentBranch.id);
    }, [currentBranch]);

    useEffect(() => {
        const now = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 7);
        const fmt = d => d.toISOString().slice(0, 10);
        setFrom(fmt(now));
        setTo(fmt(end));
    }, []);

    useEffect(() => {
        if (!data || !branchId || !from || !to) return;
        const interval = setInterval(() => {
            fetchData(branchId, from, to);
        }, 5000);
        return () => clearInterval(interval);
    }, [data, branchId, from, to]);

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
                const data = await res.json();
                branchId = data.branch?.id;
                if (branchId) {
                    localStorage.setItem('user', JSON.stringify({ ...user, branchId, branch: data.branch }));
                }
            }

            if (!branchId) {
                showToast('error', 'Lỗi', 'Tài khoản chưa được gán chi nhánh.');
                return;
            }

            const res = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            if (res.ok) setCurrentBranch(await res.json());
        } catch {
            showToast('error', 'Lỗi', 'Không thể tải thông tin chi nhánh.');
        }
    };

    const fetchData = async (bId, f, t) => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/ingredient-preparation?branchId=${bId}&from=${f}T00:00:00&to=${t}T23:59:59`,
                { headers: { Authorization: `Bearer ${token()}` } }
            );
            if (!res.ok) throw new Error();
            setData(await res.json());
        } catch {

        }
    };

    // ── Tính toán ──
    const handleCalculate = async () => {
        if (!branchId || !from || !to) {
            showToast('warning', 'Thiếu thông tin', 'Vui lòng chọn chi nhánh và khoảng thời gian.');
            return;
        }
        setLoading(true);
        setData(null);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/ingredient-preparation?branchId=${branchId}&from=${from}T00:00:00&to=${to}T23:59:59`,
                { headers: { Authorization: `Bearer ${token()}` } }
            );
            if (!res.ok) throw new Error();
            setData(await res.json());
            setSearchTerm('');
            setFilterMode('all');
        } catch {
            showToast('error', 'Lỗi', 'Không thể tính toán nguyên liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // ── Lọc kết quả ──
    const filteredIngredients = data?.ingredients?.filter(ing => {
        const matchSearch = ing.ingredientName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchFilter =
            filterMode === 'all' ? true :
                filterMode === 'shortage' ? ing.shortage > 0 :
                    ing.shortage === 0;
        return matchSearch && matchFilter;
    }) ?? [];

    const shortageCount = data?.ingredients?.filter(i => i.shortage > 0).length ?? 0;
    const okCount = data?.ingredients?.filter(i => i.shortage === 0).length ?? 0;

    if (!currentBranch) return (
        <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
            <RefreshCw size={36} className={styles.spinIcon} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15 }}>Đang tải thông tin chi nhánh...</p>
        </div>
    );

    return (
        <div className={styles.pageContainer}>

            {/* ── HEADER ── */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>Nguyên liệu cần chuẩn bị</h2>
                        <p className={styles.branchInfo}>
                            <FlaskConical size={16} />
                            <span className={styles.branchName}>
                                Tính từ món ăn đặt trước theo chi nhánh
                            </span>
                        </p>
                    </div>
                </div>

                {/* Stats — chỉ hiện sau khi có kết quả */}
                {data && (
                    <div className={styles.statsGrid}>
                        <div className={styles.statCardPrimary}>
                            <div className={styles.statIcon}><Calendar size={24} /></div>
                            <div>
                                <div className={styles.statValue}>{data.totalReservations}</div>
                                <div className={styles.statLabel}>Đơn đặt trước</div>
                            </div>
                        </div>
                        <div className={styles.statCardSuccess}>
                            <div className={styles.statIcon}><CheckCircle size={24} /></div>
                            <div>
                                <div className={styles.statValue}>{okCount}</div>
                                <div className={styles.statLabel}>Đủ nguyên liệu</div>
                            </div>
                        </div>
                        <div className={styles.statCardDanger}>
                            <div className={styles.statIcon}><AlertTriangle size={24} /></div>
                            <div>
                                <div className={styles.statValue}>{shortageCount}</div>
                                <div className={styles.statLabel}>Thiếu nguyên liệu</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Bộ lọc ── */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '9px 14px', borderRadius: 10,
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        fontSize: 14, color: 'var(--color-text-secondary)'
                    }}>
                        <Store size={15} />
                        <span style={{ fontWeight: 600 }}>{currentBranch.name}</span>
                    </div>
                    {/* Từ ngày */}
                    <div style={{ position: 'relative' }}>
                        <Calendar size={15} style={{
                            position: 'absolute', left: 10, top: '50%',
                            transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', pointerEvents: 'none'
                        }} />
                        <input
                            type="date"
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                            style={{
                                paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                                border: '1px solid var(--color-border)', borderRadius: 10,
                                fontSize: 14, color: 'var(--color-text-secondary)',
                                background: 'var(--color-card)'
                            }}
                        />
                    </div>

                    {/* Đến ngày */}
                    <div style={{ position: 'relative' }}>
                        <Calendar size={15} style={{
                            position: 'absolute', left: 10, top: '50%',
                            transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', pointerEvents: 'none'
                        }} />
                        <input
                            type="date"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            style={{
                                paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                                border: '1px solid var(--color-border)', borderRadius: 10,
                                fontSize: 14, color: 'var(--color-text-secondary)',
                                background: 'var(--color-card)'
                            }}
                        />
                    </div>

                    {/* Nút tính */}
                    <button
                        onClick={handleCalculate}
                        disabled={loading}
                        className={styles.primaryButton}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        {loading
                            ? <><RefreshCw size={16} className={styles.spinIcon} /> Đang tính...</>
                            : <><FlaskConical size={16} /> Tính toán</>}
                    </button>
                </div>

                {/* ── Search + filter tab — chỉ hiện khi có data ── */}
                {data && (
                    <>
                        <div className={styles.filterBar} style={{ marginTop: 14 }}>
                            <div className={styles.searchBox}>
                                <Search size={20} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="Tìm nguyên liệu..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className={styles.searchInput}
                                />
                            </div>
                        </div>

                        <div className={styles.filterBar} style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => setFilterMode('all')}
                                    className={filterMode === 'all' ? styles.tabActive : styles.tabInactive}
                                >
                                    <Layers size={15} />
                                    Tất cả
                                    <span style={{
                                        marginLeft: 6, background: '#6B7280', color: '#fff',
                                        borderRadius: '50%', width: 20, height: 20,
                                        display: 'inline-flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: 11, fontWeight: 700
                                    }}>
                                        {data.ingredients.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setFilterMode('shortage')}
                                    className={filterMode === 'shortage' ? styles.tabActive : styles.tabInactive}
                                >
                                    <AlertTriangle size={15} />
                                    Thiếu hàng
                                    {shortageCount > 0 && (
                                        <span style={{
                                            marginLeft: 6, background: '#EF4444', color: '#fff',
                                            borderRadius: '50%', width: 20, height: 20,
                                            display: 'inline-flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: 11, fontWeight: 700
                                        }}>
                                            {shortageCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setFilterMode('ok')}
                                    className={filterMode === 'ok' ? styles.tabActive : styles.tabInactive}
                                >
                                    <CheckCircle size={15} />
                                    Đủ hàng
                                    {okCount > 0 && (
                                        <span style={{
                                            marginLeft: 6, background: '#10B981', color: '#fff',
                                            borderRadius: '50%', width: 20, height: 20,
                                            display: 'inline-flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: 11, fontWeight: 700
                                        }}>
                                            {okCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── LOADING ── */}
            {loading && (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                    <RefreshCw size={36} className={styles.spinIcon} style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 15 }}>Đang tính toán nguyên liệu...</p>
                </div>
            )}

            {/* ── EMPTY STATE chưa tính ── */}
            {!loading && !data && (
                <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
                    <FlaskConical size={52} style={{ opacity: 0.25, marginBottom: 14 }} />
                    <p style={{ fontSize: 16, marginBottom: 6 }}>Chọn chi nhánh và khoảng thời gian</p>
                    <p style={{ fontSize: 13 }}>rồi nhấn <strong>Tính toán</strong> để xem nguyên liệu cần chuẩn bị.</p>
                </div>
            )}

            {/* ── EMPTY kết quả lọc ── */}
            {!loading && data && filteredIngredients.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                    <CheckCircle size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 16 }}>Không tìm thấy nguyên liệu phù hợp</p>
                </div>
            )}

            {/* ── DANH SÁCH NGUYÊN LIỆU ── */}
            {!loading && data && filteredIngredients.map(ing => {
                const isExpanded = expandedIngredient === ing.ingredientId;
                const hasShortage = ing.shortage > 0;

                return (
                    <div
                        key={ing.ingredientId}
                        className={styles.tableCard}
                        style={{
                            marginBottom: 12,
                            borderLeft: `4px solid ${hasShortage ? '#EF4444' : '#10B981'}`
                        }}
                    >
                        {/* ── Header dòng ── */}
                        <div
                            onClick={() => setExpandedIngredient(isExpanded ? null : ing.ingredientId)}
                            style={{
                                padding: '14px 20px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 14,
                                borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none'
                            }}
                        >
                            {/* Avatar icon */}
                            <div style={{
                                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                                background: hasShortage
                                    ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                                    : 'linear-gradient(135deg, #10B981, #059669)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <FlaskConical size={20} color="#fff" />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                                        {ing.ingredientName}
                                    </span>
                                    <span style={{
                                        padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                        background: hasShortage ? '#FEE2E2' : 'rgba(16,185,129,0.1)',
                                        color: hasShortage ? '#DC2626' : '#10B981',
                                        border: `1px solid ${hasShortage ? '#FECACA' : 'rgba(16,185,129,0.3)'}`
                                    }}>
                                        {hasShortage ? `Thiếu ${ing.shortage.toFixed(2)} ${ing.unit}` : 'Đủ hàng'}
                                    </span>
                                </div>

                                {/* Thông tin tóm tắt */}
                                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                        <Package size={13} />
                                        Cần: <strong style={{ marginLeft: 3 }}>{ing.totalRequired.toFixed(2)} {ing.unit}</strong>
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                        <Layers size={13} />
                                        Tồn kho: <strong style={{ marginLeft: 3 }}>{ing.currentStock.toFixed(2)} {ing.unit}</strong>
                                    </span>
                                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                        {ing.batches.length} lô còn hàng
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar tồn kho / cần dùng */}
                            <div style={{ width: 100, flexShrink: 0 }}>
                                <div style={{ height: 6, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (ing.currentStock / ing.totalRequired) * 100)}%`,
                                        background: hasShortage
                                            ? 'linear-gradient(90deg, #EF4444, #F87171)'
                                            : 'linear-gradient(90deg, #10B981, #34D399)',
                                        borderRadius: 4,
                                        transition: 'width 0.4s'
                                    }} />
                                </div>
                                <div style={{ fontSize: 11, textAlign: 'right', marginTop: 3, color: '#9ca3af' }}>
                                    {ing.totalRequired > 0
                                        ? `${Math.round((ing.currentStock / ing.totalRequired) * 100)}%`
                                        : '—'}
                                </div>
                            </div>

                            <div style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                        </div>

                        {/* ── Expanded: chi tiết lô ── */}
                        {isExpanded && (
                            <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.02)' }}>

                                {/* Cards tóm tắt số liệu */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                                    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Tổng cần dùng</div>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-secondary)' }}>
                                            {ing.totalRequired.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400 }}>{ing.unit}</span>
                                        </div>
                                    </div>
                                    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Tồn kho hiện tại</div>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-secondary)' }}>
                                            {ing.currentStock.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400 }}>{ing.unit}</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        background: hasShortage ? '#FEF2F2' : 'rgba(16,185,129,0.06)',
                                        borderRadius: 8, padding: '10px 14px'
                                    }}>
                                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>
                                            {hasShortage ? 'Cần nhập thêm' : 'Dư ra'}
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: hasShortage ? '#DC2626' : '#10B981' }}>
                                            {hasShortage
                                                ? `${ing.shortage.toFixed(2)} ${ing.unit}`
                                                : `${(ing.currentStock - ing.totalRequired).toFixed(2)} ${ing.unit}`}
                                        </div>
                                    </div>
                                </div>

                                {/* Bảng lô hàng */}
                                {ing.batches.length > 0 ? (
                                    <>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                                            Chi tiết lô hàng
                                        </div>
                                        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead>
                                                    <tr style={{ background: '#f3f4f6' }}>
                                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Mã lô</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>Còn lại</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>Ngày nhập</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>HSD</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ing.batches.map((b, idx) => {
                                                        const isNearExpiry = b.expiryDate && (() => {
                                                            const diff = (new Date(b.expiryDate) - new Date()) / 86400000;
                                                            return diff <= 7;
                                                        })();
                                                        return (
                                                            <tr key={b.batchId}
                                                                style={{ borderTop: '1px solid var(--color-border)', background: idx % 2 === 1 ? 'rgba(0,0,0,0.01)' : 'transparent' }}>
                                                                <td style={{ padding: '8px 12px', color: '#6b7280' }}>
                                                                    #{String(b.batchId).padStart(4, '0')}
                                                                </td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                                                    {b.remainingQuantity.toFixed(2)} {ing.unit}
                                                                </td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#9ca3af' }}>
                                                                    {b.importedAt
                                                                        ? new Date(b.importedAt).toLocaleDateString('vi-VN')
                                                                        : '—'}
                                                                </td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                    {b.expiryDate ? (
                                                                        <span style={{
                                                                            padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                                                            background: isNearExpiry ? '#FEF3C7' : 'rgba(16,185,129,0.1)',
                                                                            color: isNearExpiry ? '#D97706' : '#10B981',
                                                                            border: `1px solid ${isNearExpiry ? '#FCD34D' : 'rgba(16,185,129,0.3)'}`
                                                                        }}>
                                                                            {new Date(b.expiryDate).toLocaleDateString('vi-VN')}
                                                                        </span>
                                                                    ) : '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{
                                        padding: '14px 16px', borderRadius: 8,
                                        background: 'rgba(239,68,68,0.06)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        fontSize: 13, color: '#DC2626',
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                        <AlertTriangle size={15} />
                                        Không có lô hàng nào còn hàng trong kho.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}