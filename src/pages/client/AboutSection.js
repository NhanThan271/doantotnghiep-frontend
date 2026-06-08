import React, { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import './AboutSection.css';
import { Link } from "react-router-dom";
const images = [
    {
        id: 1,
        src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&h=500&fit=crop',
        alt: 'Không gian nhà hàng La Costa 1',
    },
    {
        id: 2,
        src: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&h=500&fit=crop',
        alt: 'Không gian nhà hàng La Costa 2',
    },
    {
        id: 3,
        src: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=700&h=500&fit=crop',
        alt: 'Không gian nhà hàng La Costa 3',
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
        <section className="abt" ref={sectionRef} aria-label="Về La Costa Restaurant">
            {/* Top gold rule */}
            <div className="abt__rule abt-reveal" />

            {/* Header */}
            <div className="abt__header abt-reveal" style={{ '--delay': '0.05s' }}>
                <p className="abt__welcome">Chào mừng đến với</p>
                <h2 className="abt__title">La Costa — Ẩm Thực Đương Đại</h2>
                <span className="abt__title-bar" />
            </div>

            {/* Body text */}
            <div className="abt__body abt-reveal" style={{ '--delay': '0.15s' }}>
                <p>
                    Đánh thức mọi giác quan tại La Costa, nơi sự sang trọng không chỉ hiện hữu trong không gian
                    kiến trúc tinh tế mà còn gói trọn trong từng tầng hương vị độc bản. Chúng tôi tự hào mang
                    đến một thực đơn thượng lưu, được chắt lọc từ những nguồn nguyên liệu quý hiếm bậc nhất —
                    từ những lát bò Wagyu với vân mỡ hoàn hảo cho đến các loại hải sản cao cấp được tuyển chọn
                    và đánh bắt trong ngày.
                </p>
                <p>
                    Dưới bàn tay tài hoa của đội ngũ đầu bếp nghệ nhân, mỗi món ăn tại La Costa không chỉ đơn
                    thuần là ẩm thực, mà là một tác phẩm nghệ thuật đương đại đầy tâm huyết. Hãy cùng chúng
                    tôi bước vào một hành trình mỹ vị xa hoa, nơi những cảm xúc thăng hoa sẽ dẫn dắt bạn
                    khám phá đỉnh cao của sự tinh tế và đẳng cấp.{' '}
                    
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
<div
    className="abt__cta-wrap abt-reveal"
    style={{ '--delay': '0.45s' }}
>
    <Link
        to="/thuc-don"
        className="abt__cta"
        onClick={() => window.scrollTo(0, 0)}
    >
        Khám phá thực đơn
        <ChevronRight size={16} />
    </Link>
</div>

        </section>
    );
};

export default AboutSection;