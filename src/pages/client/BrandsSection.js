import React, { useEffect, useState, useRef } from 'react';
import './BrandsSection.css';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8080';

const BrandsSection = () => {
    const [categories, setCategories] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [loading, setLoading] = useState(true);
    const revealRefs = useRef([]);

    const getAuthToken = () => localStorage.getItem('token');

    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/categories`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            if (data?.length > 0) {
                setCategories(data);
                setActiveTab(data[0].id);
            }
        } catch {
            const mock = [
                { id: 1, name: 'Món Khai Vị' },
                { id: 2, name: 'Món Chính' },
                { id: 3, name: 'Đồ Uống' },
                { id: 4, name: 'Tráng Miệng' },
            ];
            setCategories(mock);
            setActiveTab(mock[0].id);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const savedBranchId = localStorage.getItem('selectedBranchId') || '1';
            const token = getAuthToken();
            const res = await fetch(
                `${API_BASE_URL}/api/branch-foods/branch/${savedBranchId}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { Authorization: `Bearer ${token}` }),
                    },
                }
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            const transformed = data
                .filter((item) => item.isActive === true)
                .map((item) => ({
                    id: item.id,
                    name: item.food?.name || item.name,
                    description: item.food?.description || '',
                    price: item.customPrice || item.food?.price || 0,
                    imageUrl: item.food?.imageUrl,
                    categoryId: item.food?.category?.id,
                }));
            setAllProducts(transformed);
        } catch {
            /* keep empty */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchProducts();
    }, []);

    /* scroll reveal — re-observe whenever content changes */
    useEffect(() => {
        revealRefs.current = revealRefs.current.filter(Boolean);
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting)
                        entry.target.classList.add('bms-reveal--visible');
                });
            },
            { threshold: 0.1 }
        );
        revealRefs.current.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [categories, allProducts, activeTab]);

    const addReveal = (el, delay = 0) => {
        if (el && !revealRefs.current.includes(el)) {
            el.style.setProperty('--delay', `${delay}s`);
            revealRefs.current.push(el);
        }
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http')) return imageUrl;
        if (imageUrl.startsWith('/uploads/')) return `${API_BASE_URL}${imageUrl}`;
        return `${API_BASE_URL}/uploads/${imageUrl}`;
    };

    const formatPrice = (price) => {
        if (!price) return '0đ';
        return price.toLocaleString('vi-VN') + 'đ';
    };

    const featured = allProducts
        .filter((p) => p.categoryId === activeTab)
        .slice(0, 4);

    const activeCategory = categories.find((c) => c.id === activeTab);

    return (
        <section className="bms">

            {/* gold rule top */}
            <div className="bms__rule bms-reveal" ref={(el) => addReveal(el, 0)} />

            {/* header */}
            <div className="bms__header bms-reveal" ref={(el) => addReveal(el, 0.08)}>
                <p className="bms__eyebrow">THỰC ĐƠN NỔI BẬT</p>
                <h2 className="bms__title">
                    Những Món Ăn Tinh Hoa
                </h2>
                <span className="bms__title-bar" />
                <p className="bms__subtitle">
                    Được chế biến từ nguyên liệu tươi ngon nhất · Theo mùa · Có thể thay đổi
                </p>
            </div>

            {/* tabs */}
            <div className="bms__tabs bms-reveal" ref={(el) => addReveal(el, 0.16)}>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        className={`bms__tab${activeTab === cat.id ? ' bms__tab--active' : ''}`}
                        onClick={() => setActiveTab(cat.id)}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
            <div className="bms__tab-rule" />

            {/* section sub-label */}
            {activeCategory && (
                <p
                    className="bms__section-label bms-reveal"
                    ref={(el) => addReveal(el, 0.2)}
                >
                    {activeCategory.name.toUpperCase()}
                </p>
            )}

            {/* products */}
            {loading ? (
                <div className="bms__loading">
                    <span className="bms__spinner" />
                </div>
            ) : featured.length === 0 ? (
                <p className="bms__empty">Chưa có món ăn trong danh mục này.</p>
            ) : (
                <div className="bms__grid">
                    {featured.map((product, i) => (
                        <div
                            key={product.id}
                            className="bms__card bms-reveal"
                            ref={(el) => addReveal(el, 0.08 + i * 0.09)}
                        >
                            <div className="bms__card-img">
                                {getImageUrl(product.imageUrl) ? (
                                    <img
                                        src={getImageUrl(product.imageUrl)}
                                        alt={product.name}
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.classList.add(
                                                'bms__card-img--fallback'
                                            );
                                        }}
                                    />
                                ) : (
                                    <div className="bms__card-img--fallback" />
                                )}
                                <div className="bms__card-frame" />
                            </div>

                            <div className="bms__card-body">
                                <h3 className="bms__card-name">{product.name}</h3>
                                {product.description && (
                                    <p className="bms__card-desc">{product.description}</p>
                                )}
                                <span className="bms__card-price">
                                    {formatPrice(product.price)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bms__cta-wrap bms-reveal" ref={(el) => addReveal(el, 0.44)}>
                <Link to="/thuc-don" className="bms__cta" onClick={() => window.scrollTo(0, 0)}>
                    XEM TOÀN BỘ THỰC ĐƠN
                    <svg
                        width="15"
                        height="15"
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
            {/* gold rule bottom */}
            <div
                className="bms__rule bms__rule--bottom bms-reveal"
                ref={(el) => addReveal(el, 0.5)}
            />
        </section>
    );
};

export default BrandsSection;