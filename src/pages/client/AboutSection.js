import React, { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import './AboutSection.css';

const images = [
    {
        id: 1,
        src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&h=500&fit=crop',
        alt: 'Không gian nhà hàng Noir 1',
    },
    {
        id: 2,
        src: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&h=500&fit=crop',
        alt: 'Không gian nhà hàng Noir 2',
    },
    {
        id: 3,
        src: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=700&h=500&fit=crop',
        alt: 'Không gian nhà hàng Noir 3',
    },
];

const AboutSection = () => {
    const sectionRef = useRef(null);

    useEffect(() => {
        const targets = sectionRef.current?.querySelectorAll('.abt-reveal');
        if (!targets) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('abt-reveal--visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        targets.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <section className="abt" ref={sectionRef} aria-label="Về Noir Restaurant">
            {/* Top gold rule */}
            <div className="abt__rule abt-reveal" />

            {/* Header */}
            <div className="abt__header abt-reveal" style={{ '--delay': '0.05s' }}>
                <p className="abt__welcome">Chào mừng đến với</p>
                <h2 className="abt__title">NOIR — Ẩm Thực Đương Đại</h2>
                <span className="abt__title-bar" />
            </div>

            {/* Body text */}
            <div className="abt__body abt-reveal" style={{ '--delay': '0.15s' }}>
                <p>
                    Đánh thức mọi giác quan tại NOIR, nơi sự sang trọng không chỉ hiện hữu trong không gian
                    kiến trúc tinh tế mà còn gói trọn trong từng tầng hương vị độc bản. Chúng tôi tự hào mang
                    đến một thực đơn thượng lưu, được chắt lọc từ những nguồn nguyên liệu quý hiếm bậc nhất —
                    từ những lát bò Wagyu với vân mỡ hoàn hảo cho đến các loại hải sản cao cấp được tuyển chọn
                    và đánh bắt trong ngày.
                </p>
                <p>
                    Dưới bàn tay tài hoa của đội ngũ đầu bếp nghệ nhân, mỗi món ăn tại NOIR không chỉ đơn
                    thuần là ẩm thực, mà là một tác phẩm nghệ thuật đương đại đầy tâm huyết. Hãy cùng chúng
                    tôi bước vào một hành trình mỹ vị xa hoa, nơi những cảm xúc thăng hoa sẽ dẫn dắt bạn
                    khám phá đỉnh cao của sự tinh tế và đẳng cấp.{' '}
                    <button className="abt__read-more">Xem thêm…</button>
                </p>
            </div>

            {/* Images row */}
            <div className="abt__gallery">
                {images.map((img, i) => (
                    <div
                        key={img.id}
                        className="abt__img-wrap abt-reveal"
                        style={{ '--delay': `${0.1 + i * 0.12}s` }}
                    >
                        <img src={img.src} alt={img.alt} loading="lazy" />
                        <div className="abt__img-frame" />
                    </div>
                ))}
            </div>

            {/* CTA */}
            <div className="abt__cta-wrap abt-reveal" style={{ '--delay': '0.45s' }}>
                <button className="abt__cta">
                    Khám phá thực đơn <ChevronRight size={16} />
                </button>
            </div>

            {/* Badge — Restaurant Guru */}
            <div className="abt__badge abt-reveal" style={{ '--delay': '0.5s' }} aria-label="Restaurant Guru 2024 Recommended">
                <div className="abt__badge-inner">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill="#C9A84C" />
                    </svg>
                    <span className="abt__badge-year">Restaurant Guru 2024</span>
                    <span className="abt__badge-rec">RECOMMENDED</span>
                    <span className="abt__badge-name">Noir Restaurant</span>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;