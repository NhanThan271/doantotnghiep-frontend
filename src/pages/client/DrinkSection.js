import React, { useEffect, useState, useRef } from 'react';
import './DrinkSection.css';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8080';

const PriceSection = () => {
    const [drinks, setDrinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const revealRefs = useRef([]);

    const getAuthToken = () => localStorage.getItem('token');

    /* ── fetch categories → tìm "Đồ uống" → fetch products ── */
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const token = getAuthToken();
                const headers = {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                };

                /* 1. lấy categories */
                const catRes = await fetch(`${API_BASE_URL}/api/categories`, { headers });
                const cats = catRes.ok ? await catRes.json() : [];

                /* tìm category đồ uống (tên chứa "uống" hoặc "drink") */
                const drinkCat = cats.find(
                    (c) =>
                        c.name?.toLowerCase().includes('uống') ||
                        c.name?.toLowerCase().includes('drink') ||
                        c.name?.toLowerCase().includes('nước')
                );

                /* 2. lấy products theo branch */
                const branchId = localStorage.getItem('selectedBranchId') || '1';
                const prodRes = await fetch(
                    `${API_BASE_URL}/api/branch-foods/branch/${branchId}`,
                    { headers }
                );
                if (!prodRes.ok) throw new Error();
                const data = await prodRes.json();

                const all = data
                    .filter((item) => item.isActive === true)
                    .map((item) => ({
                        id: item.id,
                        name: item.food?.name || item.name || '',
                        description: item.food?.description || '',
                        price: item.customPrice || item.food?.price || 0,
                        categoryId: item.food?.category?.id,
                        categoryName: item.food?.category?.name || '',
                    }));

                /* lọc đồ uống */
                let result = drinkCat
                    ? all.filter((p) => p.categoryId === drinkCat.id)
                    : all.filter(
                        (p) =>
                            p.categoryName.toLowerCase().includes('uống') ||
                            p.categoryName.toLowerCase().includes('drink') ||
                            p.categoryName.toLowerCase().includes('nước')
                    );

                /* fallback: lấy tối đa 8 món đầu nếu không tìm được */
                if (result.length === 0) result = all.slice(0, 8);

                setDrinks(result.slice(0, 8));
            } catch {
                setDrinks([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    /* ── scroll reveal ── */
    useEffect(() => {
        revealRefs.current = revealRefs.current.filter(Boolean);
        const observer = new IntersectionObserver(
            (entries) =>
                entries.forEach((e) => {
                    if (e.isIntersecting) e.target.classList.add('prs-reveal--visible');
                }),
            { threshold: 0.1 }
        );
        revealRefs.current.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [drinks]);

    const addReveal = (el, delay = 0) => {
        if (el && !revealRefs.current.includes(el)) {
            el.style.setProperty('--delay', `${delay}s`);
            revealRefs.current.push(el);
        }
    };

    const formatPrice = (price) => {
        if (!price) return '—';
        return price.toLocaleString('vi-VN') + 'đ';
    };

    return (
        <section className="prs">
            {/* gold rule top */}
            <div className="prs__rule prs-reveal" ref={(el) => addReveal(el, 0)} />

            <div className="prs__inner">

                {/* ── LEFT: intro ── */}
                <div className="prs__left prs-reveal" ref={(el) => addReveal(el, 0.08)}>
                    <p className="prs__eyebrow">ĐỒ UỐNG</p>
                    <h2 className="prs__title">
                        Thức Uống<br />
                        <em>Tinh Tuyển.</em>
                    </h2>
                    <p className="prs__body">
                        Danh sách thức uống của chúng tôi được chọn lọc kỹ lưỡng từ những
                        nguyên liệu tươi ngon nhất, kết hợp hài hòa giữa hương vị truyền
                        thống và phong cách hiện đại.
                    </p>
                    <p className="prs__body">
                        Đội ngũ pha chế của La Costa luôn sẵn sàng tư vấn và mang đến trải
                        nghiệm thưởng thức độc đáo cho từng thực khách.
                    </p>
                    <Link to="/thuc-don" className="prs__cta" onClick={() => window.scrollTo(0, 0)}>
                        XEM THỰC ĐƠN ĐẦY ĐỦ
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                {/* ── RIGHT: drink list ── */}
                <div className="prs__right">
                    {loading ? (
                        <div className="prs__loading">
                            <span className="prs__spinner" />
                        </div>
                    ) : drinks.length === 0 ? (
                        <p className="prs__empty">Chưa có dữ liệu đồ uống.</p>
                    ) : (
                        <ul className="prs__list">
                            {drinks.map((item, i) => (
                                <li
                                    key={item.id}
                                    className="prs__item prs-reveal"
                                    ref={(el) => addReveal(el, 0.06 + i * 0.07)}
                                >
                                    <div className="prs__item-info">
                                        <span className="prs__item-name">{item.name}</span>
                                        {item.description && (
                                            <span className="prs__item-desc">
                                                {item.description}
                                            </span>
                                        )}
                                    </div>
                                    <span className="prs__item-price">
                                        {formatPrice(item.price)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className="prs__footer-note prs-reveal" ref={(el) => addReveal(el, 0.7)}>
                        GIÁ ĐÃ BAO GỒM THUẾ · DỊCH VỤ CHƯA BAO GỒM
                    </p>
                </div>
            </div>

            {/* gold rule bottom */}
            <div className="prs__rule prs__rule--bottom prs-reveal" ref={(el) => addReveal(el, 0.75)} />
        </section>
    );
};

export default PriceSection;