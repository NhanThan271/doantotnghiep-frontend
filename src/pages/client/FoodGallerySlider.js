import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FoodGallerySlider.css';

const slides = [
    {
        id: 1,
        category: 'Không Gian',
        tag: 'INTERIOR',
        title: 'Tối Giản & Sang Trọng',
        subtitle: 'Không gian được thiết kế tinh tế, kết hợp ánh sáng ấm và vật liệu cao cấp mang lại cảm giác thư thái.',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop',
        accent: 'Hơn 200 chỗ ngồi — Phòng riêng theo yêu cầu',
    },
    {
        id: 2,
        category: 'Đặc Sản',
        tag: 'SIGNATURE',
        title: 'Nghệ Thuật Trên Đĩa',
        subtitle: 'Mỗi món ăn là sự kết hợp hoàn hảo giữa nguyên liệu tươi ngon và kỹ thuật chế biến đỉnh cao.',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&h=900&fit=crop',
        accent: 'Hơn 250 món — Thực đơn theo mùa',
    },
    {
        id: 3,
        category: 'Trình Bày',
        tag: 'PLATING',
        title: 'Tinh Tế Từng Chi Tiết',
        subtitle: 'Từ màu sắc đến hương vị, mỗi đĩa ăn đều được chăm chút tỉ mỉ bởi đội ngũ bếp trưởng giàu kinh nghiệm.',
        image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1600&h=900&fit=crop',
        accent: 'Chefs Table — Trải nghiệm độc quyền',
    },
    {
        id: 4,
        category: 'Bữa Tối',
        tag: 'DINING',
        title: 'Khoảnh Khắc Đáng Nhớ',
        subtitle: 'Không gian ấm cúng với ánh nến và âm nhạc nhẹ nhàng — lý tưởng cho những buổi tối đặc biệt.',
        image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&h=900&fit=crop',
        accent: 'Đặt bàn riêng tư — Phục vụ tận tâm',
    },
    {
        id: 5,
        category: 'Chef Special',
        tag: 'CHEF S PICK',
        title: 'Bếp Trưởng Đề Xuất',
        subtitle: 'Thực đơn độc quyền thay đổi theo mùa, luôn mang đến sự bất ngờ và trải nghiệm ẩm thực mới mẻ.',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&h=900&fit=crop',
        accent: 'Cập nhật hàng tháng — Nguyên liệu theo mùa',
    },
];

const INTERVAL = 5500;

const FoodGallerySlider = () => {
    const [current, setCurrent] = useState(0);
    const [prev, setPrev] = useState(null);
    const [direction, setDirection] = useState('next');
    const [animating, setAnimating] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef(null);
    const progressRef = useRef(null);
    const startTimeRef = useRef(null);

    const goTo = useCallback((index, dir = 'next') => {
        if (animating) return;
        setDirection(dir);
        setPrev(current);
        setAnimating(true);
        setCurrent(index);
        setProgress(0);
        startTimeRef.current = performance.now();

        setTimeout(() => {
            setPrev(null);
            setAnimating(false);
        }, 900);
    }, [animating, current]);

    const next = useCallback(() => {
        goTo((current + 1) % slides.length, 'next');
    }, [current, goTo]);

    const goIndex = useCallback((i) => {
        if (i === current) return;
        goTo(i, i > current ? 'next' : 'prev');
    }, [current, goTo]);

    // Auto progress bar
    useEffect(() => {
        setProgress(0);
        startTimeRef.current = performance.now();

        const tick = (now) => {
            const elapsed = now - startTimeRef.current;
            const pct = Math.min((elapsed / INTERVAL) * 100, 100);
            setProgress(pct);
            if (pct < 100) {
                progressRef.current = requestAnimationFrame(tick);
            }
        };
        progressRef.current = requestAnimationFrame(tick);

        timerRef.current = setTimeout(next, INTERVAL);

        return () => {
            clearTimeout(timerRef.current);
            cancelAnimationFrame(progressRef.current);
        };
    }, [current]);

    const slide = slides[current];
    const prevSlide = prev !== null ? slides[prev] : null;

    return (
        <section className="fgs" aria-label="Giới thiệu nhà hàng">
            {/* Background images */}
            {prevSlide && (
                <div
                    key={`prev-${prevSlide.id}`}
                    className={`fgs__bg fgs__bg--exit fgs__bg--${direction}`}
                    style={{ backgroundImage: `url(${prevSlide.image})` }}
                />
            )}
            <div
                key={`curr-${slide.id}`}
                className={`fgs__bg fgs__bg--enter fgs__bg--${direction} ${animating ? 'fgs__bg--active' : 'fgs__bg--settled'}`}
                style={{ backgroundImage: `url(${slide.image})` }}
            />

            {/* Dark overlay */}
            <div className="fgs__overlay" />

            {/* Decorative vertical lines */}
            <div className="fgs__lines" aria-hidden="true">
                <div className="fgs__line" />
                <div className="fgs__line" />
                <div className="fgs__line" />
            </div>

            {/* Content */}
            <div className="fgs__content" key={slide.id}>
                <div className="fgs__meta">
                    <span className="fgs__tag">{slide.tag}</span>
                    <span className="fgs__cat">{slide.category}</span>
                </div>
                <h2 className="fgs__title">{slide.title}</h2>
                <p className="fgs__subtitle">{slide.subtitle}</p>
                <div className="fgs__accent">
                    <span className="fgs__accent-line" />
                    <span className="fgs__accent-text">{slide.accent}</span>
                </div>
            </div>

            {/* Navigation dots + counter */}
            <div className="fgs__nav">
                <div className="fgs__counter">
                    <span className="fgs__counter-cur">{String(current + 1).padStart(2, '0')}</span>
                    <span className="fgs__counter-sep" />
                    <span className="fgs__counter-total">{String(slides.length).padStart(2, '0')}</span>
                </div>
                <div className="fgs__dots">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            className={`fgs__dot ${i === current ? 'fgs__dot--active' : ''}`}
                            onClick={() => goIndex(i)}
                            aria-label={`Slide ${i + 1}`}
                        >
                            {i === current && (
                                <span
                                    className="fgs__dot-fill"
                                    style={{ width: `${progress}%` }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Arrow buttons */}
            <button
                className="fgs__arr fgs__arr--prev"
                onClick={() => goTo((current - 1 + slides.length) % slides.length, 'prev')}
                aria-label="Slide trước"
            >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            <button
                className="fgs__arr fgs__arr--next"
                onClick={() => goTo((current + 1) % slides.length, 'next')}
                aria-label="Slide tiếp theo"
            >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Gold bottom bar */}
            <div className="fgs__gold-bar" aria-hidden="true" />
        </section>
    );
};

export default FoodGallerySlider;