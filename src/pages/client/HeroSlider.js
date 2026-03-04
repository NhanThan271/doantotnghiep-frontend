import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './HeroSlider.css';

const HeroSlider = () => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const heroSlides = [
        {
            id: 1,
            image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=1400&h=700&fit=crop',
            alt: 'Seoul BBQ Menu'
        },
        {
            id: 2,
            image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=1400&h=700&fit=crop',
            alt: 'BBQ Promotion'
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [heroSlides.length]);

    const handlePrevSlide = () => {
        setCurrentSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length);
    };

    const handleNextSlide = () => {
        setCurrentSlide((currentSlide + 1) % heroSlides.length);
    };

    return (
        <div className="hero-slider">
            {heroSlides.map((slide, index) => (
                <div key={slide.id} className={`slide ${index === currentSlide ? 'active' : ''}`}>
                    <img src={slide.image} alt={slide.alt} />
                    <div className="slide-overlay" />
                </div>
            ))}

            <button className="slider-btn prev" onClick={handlePrevSlide}>
                <ChevronLeft size={32} color="white" />
            </button>
            <button className="slider-btn next" onClick={handleNextSlide}>
                <ChevronRight size={32} color="white" />
            </button>

            <div className="slider-dots">
                {heroSlides.map((_, index) => (
                    <button
                        key={index}
                        className={`slider-dot ${index === currentSlide ? 'active' : ''}`}
                        onClick={() => setCurrentSlide(index)}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroSlider;