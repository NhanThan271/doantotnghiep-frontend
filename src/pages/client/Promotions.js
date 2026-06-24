import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PhoneFloatButton from './booking/PhoneFloatButton';

const API_BASE = "/api";

const Promotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [foods, setFoods] = useState({});
    const [branches, setBranches] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            let currentBranchId = null;
            try {
                const cb = JSON.parse(sessionStorage.getItem("currentBranch") || "{}");
                currentBranchId = cb?.id || parseInt(localStorage.getItem('selectedBranchId'));
            } catch { }

            const [promoRes, foodRes, branchRes] = await Promise.all([
                axios.get(`${API_BASE}/promotions`),
                axios.get(`${API_BASE}/foods`),
                axios.get(`${API_BASE}/branches`),
            ]);
            const filteredPromos = currentBranchId
                ? promoRes.data.filter(p =>
                    !p.branchIds?.length || p.branchIds.includes(currentBranchId)
                )
                : promoRes.data;

            const foodMap = {};
            promoRes.data.forEach(p => {
                if (p.foodIds) {
                    p.foodIds.forEach(fid => {
                        const food = foodRes.data.find(f => f.id === fid);
                        if (food) foodMap[fid] = food;
                    });
                }
            });

            const branchMap = {};
            branchRes.data.forEach(b => { branchMap[b.id] = b; });

            setFoods(foodMap);
            setBranches(branchMap);
            setPromotions(promoRes.data);
            setPromotions(filteredPromos);
        } catch (err) {
            console.error("Lỗi tải dữ liệu:", err);
        } finally {
            setLoading(false);
        }
    };

    const calcDiscountedPrice = (food, promo) => {
        if (!food) return null;
        const original = parseFloat(food.price);
        if (promo.discountPercentage) {
            return original * (1 - parseFloat(promo.discountPercentage) / 100);
        }
        if (promo.discountAmount) {
            return Math.max(0, original - parseFloat(promo.discountAmount));
        }
        return original;
    };

    const formatPrice = (price) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('vi-VN');
    };

    const getDiscountLabel = (promo) => {
        if (promo.discountPercentage) return `-${promo.discountPercentage}%`;
        if (promo.discountAmount) return `-${formatPrice(promo.discountAmount)}`;
        return '';
    };

    const handleOrderNow = (food, fid) => {

        let branchId = null;
        try {
            const cb = JSON.parse(sessionStorage.getItem("currentBranch") || "{}");
            branchId = cb?.id || parseInt(localStorage.getItem('selectedBranchId'));
        } catch { }

        sessionStorage.setItem('promoSelectedFood', JSON.stringify({
            foodId: fid,
            name: food.name,
            price: food.price,
            imageUrl: food.imageUrl,
            quantity: 1,
            branchId,
        }));
        navigate('/dat-ban-chi-tiet');
    };

    const cards = promotions.flatMap(promo =>
        (promo.foodIds || []).map(fid => ({
            promo,
            food: foods[fid],
            fid
        })).filter(c => c.food)
    );

    const featured = cards[0];

    return (
        <div style={styles.page}>
            {/* ── HERO BANNER ── */}
            {featured && (
                <div style={styles.hero}>
                    <div style={styles.heroOverlay} />
                    <div style={styles.heroContent}>
                        <span style={styles.heroBadge}>🔥 ƯU ĐÃI HOT</span>
                        <h1 style={styles.heroTitle}>{featured.promo.name}</h1>
                        <p style={styles.heroSub}>
                            {featured.promo.description || `Giảm ${getDiscountLabel(featured.promo)} cho ${featured.food?.name}`}
                        </p>
                        <div style={styles.heroMeta}>
                            <span style={styles.heroDates}>
                                {formatDate(featured.promo.startDate)} → {formatDate(featured.promo.endDate)}
                            </span>
                        </div>
                        <a href="#deals" style={styles.heroBtn}>Khám phá ngay ↓</a>
                    </div>
                    {featured.food?.imageUrl && (
                        <img src={featured.food.imageUrl} alt={featured.food.name} style={styles.heroImg} />
                    )}
                </div>
            )}

            {/* ── SECTION HEADER ── */}
            <div id="deals" style={styles.sectionHeader}>
                <div style={styles.sectionTitleWrap}>
                    <span style={styles.sectionTag}>KHUYẾN MÃI</span>
                    <h2 style={styles.sectionTitle}>Món đang giảm giá</h2>
                    <p style={styles.sectionSub}>Những món ăn tuyệt vời với giá ưu đãi có thời hạn</p>
                </div>
            </div>

            {/* ── CARDS GRID ── */}
            {loading ? (
                <div style={styles.loading}>
                    <div style={styles.spinner} />
                    <p>Đang tải ưu đãi...</p>
                </div>
            ) : cards.length === 0 ? (
                <div style={styles.empty}>
                    <p>Hiện chưa có chương trình khuyến mãi nào.</p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {cards.map(({ promo, food, fid }, idx) => {
                        const originalPrice = parseFloat(food.price);
                        const newPrice = calcDiscountedPrice(food, promo);
                        const discountLabel = getDiscountLabel(promo);
                        const branchNames = (promo.branchIds || [])
                            .map(bid => branches[bid]?.name)
                            .filter(Boolean)
                            .join(', ');

                        return (
                            <div key={`${promo.id}-${fid}-${idx}`} style={styles.card}>
                                {/* Badge giảm giá */}
                                <div style={styles.discountBadge}>{discountLabel}</div>

                                {/* Ảnh món */}
                                <div style={styles.imgWrap}>
                                    {food.imageUrl ? (
                                        <img src={food.imageUrl} alt={food.name} style={styles.img} />
                                    ) : (
                                        <div style={styles.imgPlaceholder}>🍜</div>
                                    )}
                                </div>

                                {/* Nội dung */}
                                <div style={styles.cardBody}>
                                    {/* Tên chương trình */}
                                    <span style={styles.promoLabel}>{promo.name}</span>

                                    {/* Tên món */}
                                    <h3 style={styles.foodName}>{food.name}</h3>

                                    {/* Giá */}
                                    <div style={styles.priceRow}>
                                        <span style={styles.oldPrice}>{formatPrice(originalPrice)}</span>
                                        <span style={styles.newPrice}>{formatPrice(newPrice)}</span>
                                    </div>

                                    {/* Thời gian */}
                                    <div style={styles.metaRow}>
                                        <span style={styles.metaItem}>
                                            {formatDate(promo.startDate)} – {formatDate(promo.endDate)}
                                        </span>
                                    </div>

                                    {/* Chi nhánh */}
                                    {branchNames && (
                                        <div style={styles.metaRow}>
                                            <span style={styles.metaItem}> {branchNames}</span>
                                        </div>
                                    )}

                                    {/* Nút đặt món */}
                                    <button
                                        style={styles.orderBtn}
                                        onMouseEnter={e => e.target.style.background = '#c0392b'}
                                        onMouseLeave={e => e.target.style.background = '#e74c3c'}
                                        onClick={() => handleOrderNow(food, fid, promo)}
                                    >
                                        Đặt món ngay →
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <PhoneFloatButton phoneNumber="0283456789" />
        </div>
    );
};

const styles = {
    page: {
        background: '#faf8f5',
        minHeight: '100vh',
        fontFamily: "'Georgia', serif",
    },

    // ── HERO ──
    hero: {
        position: 'relative',
        background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #6b2d00 100%)',
        minHeight: 420,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        padding: '60px 5%',
    },
    heroOverlay: {
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 50%, rgba(231,76,60,0.15) 0%, transparent 60%)',
        pointerEvents: 'none',
    },
    heroContent: {
        position: 'relative', zIndex: 2,
        maxWidth: 560,
    },
    heroBadge: {
        display: 'inline-block',
        background: '#e74c3c',
        color: '#fff',
        fontSize: 12,
        fontFamily: 'sans-serif',
        fontWeight: 700,
        letterSpacing: 2,
        padding: '4px 14px',
        borderRadius: 20,
        marginBottom: 18,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 'clamp(28px, 4vw, 48px)',
        fontWeight: 700,
        lineHeight: 1.2,
        marginBottom: 14,
    },
    heroSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        lineHeight: 1.6,
        marginBottom: 20,
        fontFamily: 'sans-serif',
    },
    heroMeta: { marginBottom: 28 },
    heroDates: {
        color: '#f39c12',
        fontSize: 14,
        fontFamily: 'sans-serif',
    },
    heroBtn: {
        display: 'inline-block',
        background: '#e74c3c',
        color: '#fff',
        padding: '14px 32px',
        borderRadius: 4,
        textDecoration: 'none',
        fontFamily: 'sans-serif',
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 0.5,
        transition: 'background 0.2s',
    },
    heroImg: {
        position: 'absolute', right: '5%', top: '50%',
        transform: 'translateY(-50%)',
        width: 'clamp(180px, 28vw, 360px)',
        height: 'clamp(180px, 28vw, 360px)',
        objectFit: 'cover',
        borderRadius: '50%',
        opacity: 0.35,
        filter: 'saturate(1.2)',
    },

    // ── SECTION HEADER ──
    sectionHeader: {
        textAlign: 'center',
        padding: '60px 5% 32px',
    },
    sectionTitleWrap: {},
    sectionTag: {
        display: 'inline-block',
        color: '#e74c3c',
        fontFamily: 'sans-serif',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 3,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 'clamp(24px, 3vw, 36px)',
        color: '#1a0a00',
        fontWeight: 700,
        marginBottom: 10,
    },
    sectionSub: {
        color: '#888',
        fontFamily: 'sans-serif',
        fontSize: 15,
    },

    // ── GRID ──
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 24,
        padding: '0 5% 80px',
        maxWidth: 1280,
        margin: '0 auto',
    },

    // ── CARD ──
    card: {
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
    },
    discountBadge: {
        position: 'absolute', top: 14, right: 14, zIndex: 3,
        background: '#e74c3c',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontWeight: 700,
        fontSize: 13,
        padding: '4px 10px',
        borderRadius: 20,
        boxShadow: '0 2px 8px rgba(231,76,60,0.4)',
    },
    imgWrap: {
        width: '100%', height: 200,
        overflow: 'hidden',
        background: '#f0ebe3',
    },
    img: {
        width: '100%', height: '100%',
        objectFit: 'cover',
        transition: 'transform 0.4s',
    },
    imgPlaceholder: {
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 56,
        background: 'linear-gradient(135deg, #f5ede0, #ffe8d6)',
    },
    cardBody: {
        padding: '18px 20px 22px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
    },
    promoLabel: {
        fontFamily: 'sans-serif',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.5,
        color: '#e74c3c',
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    foodName: {
        fontSize: 20,
        fontWeight: 700,
        color: '#1a0a00',
        marginBottom: 12,
        lineHeight: 1.3,
    },
    priceRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    oldPrice: {
        fontFamily: 'sans-serif',
        fontSize: 14,
        color: '#aaa',
        textDecoration: 'line-through',
    },
    newPrice: {
        fontFamily: 'sans-serif',
        fontSize: 22,
        fontWeight: 700,
        color: '#e74c3c',
    },
    metaRow: {
        marginBottom: 6,
    },
    metaItem: {
        fontFamily: 'sans-serif',
        fontSize: 12,
        color: '#777',
    },
    orderBtn: {
        display: 'block',
        background: '#e74c3c',
        border: '1px solid #c0392b',
        color: '#fff',
        textAlign: 'center',
        padding: '12px',
        borderRadius: 6,
        textDecoration: 'none',
        fontFamily: 'sans-serif',
        fontWeight: 700,
        fontSize: 14,
        marginTop: 'auto',
        paddingTop: 18,
        transition: 'background 0.2s',
    },

    // ── STATES ──
    loading: {
        textAlign: 'center', padding: '80px 0',
        fontFamily: 'sans-serif', color: '#888',
    },
    spinner: {
        width: 36, height: 36,
        border: '3px solid #eee',
        borderTop: '3px solid #e74c3c',
        borderRadius: '50%',
        margin: '0 auto 16px',
        animation: 'spin 0.8s linear infinite',
    },
    empty: {
        textAlign: 'center', padding: '80px 0',
        fontFamily: 'sans-serif', color: '#888',
    },
};

export default Promotions;