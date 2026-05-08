import React from 'react';
import { useLocation } from 'react-router-dom';
import PriceSection from '../pages/client/DrinkSection';
import AboutSection from '../pages/client/AboutSection';
import BrandsSection from '../pages/client/BrandsSection';
import AppDownload from '../pages/client/OpeningHours';
import PhoneFloatButton from '../pages/client/booking/PhoneFloatButton';
import FoodGallerySlider from '../pages/client/FoodGallerySlider';

const Home = () => {
    // Lấy tên chi nhánh được chọn từ HeroLanding (nếu cần dùng)
    const { state } = useLocation();
    const selectedBranch = state?.branch || null;

    return (
        <>
            <FoodGallerySlider />

            {/* About Section */}
            <AboutSection />


            {/* Brands Section */}
            <section className="brands-section py-0">
                <div className="container-fluid px-0">
                    <BrandsSection />
                </div>
            </section>

            {/* Price Section */}
            <PriceSection branch={selectedBranch} />


            {/* App Download Section */}
            <section className="app-download-section py-0">
                <div className="container-fluid py-0">
                    <AppDownload />
                </div>
            </section>

            <PhoneFloatButton phoneNumber="0283456789" />

            {/* Floating Phone Button */}
            <PhoneFloatButton phoneNumber="0283456789" />
        </>
    );
};

export default Home;