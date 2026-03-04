import React from 'react';
import { ChevronRight } from 'lucide-react';
import './AboutSection.css';

const AboutSection = () => {
    const images = [
        {
            id: 1,
            src: 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=400&h=400&fit=crop',
            alt: 'Korean BBQ 1'
        },
        {
            id: 2,
            src: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=400&fit=crop',
            alt: 'Korean BBQ 2'
        }
    ];

    return (
        <div className="about-section">
            <div className="container">
                <div className="row align-items-center">
                    <div className="col-12 col-lg-6 mb-4 mb-lg-0">
                        <h2 className="about-title">NOIR - Ẩm Thực Đương Đại</h2>
                        <p className="about-text">
                            NOIR - Điểm đến lý tưởng cho những tín đồ ẩm thực Hàn Quốc. Chúng tôi tự hào mang đến trải nghiệm nướng BBQ đích thực như tại Seoul, với những miếng thịt bò Úc thượng hạng, sườn non Mỹ tươi ngon, được ướp với công thức bí truyền truyền thống Hàn Quốc. Mỗi miếng thịt khi nướng lên đều tỏa hương thơm quyến rũ, tan chảy trong miệng tạo nên hương vị khó quên.
                        </p>
                        <p className="about-text">
                            Đặc biệt, NOIR còn phục vụ các món ăn đặc sắc như Bibimbap , mỳ lạnh Naengmyeon, canh Kim chi chuẩn vị và nhiều loại lẩu hấp dẫn. Hãy đến và trải nghiệm văn hóa ẩm thực Hàn Quốc đậm đà nhất!
                        </p>
                        <button className="btn-view-menu">
                            Khám phá thực đơn <ChevronRight size={20} />
                        </button>
                    </div>
                    <div className="col-12 col-lg-6">
                        <div className="row about-images">
                            {images.map((image) => (
                                <div key={image.id} className="col-6 mb-3">
                                    <img src={image.src} alt={image.alt} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutSection;