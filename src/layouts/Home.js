import React from 'react';
import HeroSlider from './../pages/client/HeroSlider';
import PriceSection from '../pages/client/PriceSection';
import AboutSection from '../pages/client/AboutSection';
import BrandsSection from '../pages/client/BrandsSection';
import AppDownload from '../pages/client/AppDownload';
import PhoneFloatButton from '../pages/client/booking/PhoneFloatButton';

const Home = () => {
    return (
        <>
            {/* Hero Slider */}
            <HeroSlider />

            {/* Price Section */}
            <PriceSection />

            {/* About Section */}
            <AboutSection />

            {/* Brands & App Download Section */}
            <div className="brands-section">
                <div className="container">
                    <div className="row">
                        <div className="col-12 col-lg-8">
                            <BrandsSection />
                        </div>
                        <div className="col-12 col-lg-4">
                            <AppDownload />
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Phone Button */}
            <PhoneFloatButton phoneNumber="0283456789" />
        </>
    );
};

export default Home;