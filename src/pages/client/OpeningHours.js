import React, { useEffect, useRef } from 'react';
import './OpeningHours.css';

const OpeningHours = () => {
    const revealRefs = useRef([]);

    useEffect(() => {
        revealRefs.current = revealRefs.current.filter(Boolean);
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting)
                        entry.target.classList.add('oh-reveal--visible');
                });
            },
            { threshold: 0.1 }
        );
        revealRefs.current.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const addReveal = (el, delay = 0) => {
        if (el && !revealRefs.current.includes(el)) {
            el.style.setProperty('--delay', `${delay}s`);
            revealRefs.current.push(el);
        }
    };

    const schedule = [
        { day: 'Thứ Hai', dayEn: 'Monday', time: 'ĐÓNG CỬA', status: 'closed' },
        { day: 'Thứ Ba', dayEn: 'Tuesday', time: '19:00 – 23:00', note: 'Chỉ phục vụ tối' },
        { day: 'Thứ Tư', dayEn: 'Wednesday', time: '19:00 – 23:00', note: 'Chỉ phục vụ tối' },
        { day: 'Thứ Năm', dayEn: 'Thursday', time: '19:00 – 23:00', note: 'Chỉ phục vụ tối' },
        { day: 'Thứ Sáu', dayEn: 'Friday', time: '18:30 – 23:30', note: 'Nhận khách cuối 21:30' },
        { day: 'Thứ Bảy', dayEn: 'Saturday', time: '18:30 – 23:30', note: 'Nhận khách cuối 21:30' },
        { day: 'Chủ Nhật', dayEn: 'Sunday', time: 'ĐÓNG CỬA', status: 'closed' },
    ];

    return (
        <section className="oh-section">
            <div className="oh-container">
                {/* Left Side: Title & Icon */}
                <div className="oh-left bms-reveal" ref={(el) => addReveal(el, 0)}>
                    <div className="oh-header">
                        <p className="oh-eyebrow">OPENING HOURS</p>
                        <div className="oh-icon-wrap">
                            <svg className="oh-clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <p className="oh-recommend">Vui lòng đặt bàn trước để có trải nghiệm tốt nhất</p>
                    </div>
                </div>

                {/* Right Side: Schedule List */}
                <div className="oh-right">
                    {schedule.map((item, index) => (
                        <div
                            key={index}
                            className={`oh-row oh-reveal ${item.status === 'closed' ? 'oh-row--closed' : ''}`}
                            ref={(el) => addReveal(el, 0.1 + index * 0.05)}
                        >
                            <div className="oh-day-box">
                                <span className="oh-dot"></span>
                                <div>
                                    <h4 className="oh-day-vn">{item.day}</h4>
                                    <span className="oh-day-en">{item.dayEn}</span>
                                </div>
                            </div>

                            <div className="oh-time-box">
                                {item.note && <span className="oh-note">{item.note}</span>}
                                <span className="oh-time-val">{item.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default OpeningHours;