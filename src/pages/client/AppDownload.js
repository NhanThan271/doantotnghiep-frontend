import React from 'react';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import './AppDownload.css';

const AppDownload = () => {
    const socialLinks = [
        { id: 1, icon: Facebook, url: '#', name: 'Facebook' },
        { id: 2, icon: Instagram, url: '#', name: 'Instagram' },
        { id: 3, icon: Youtube, url: '#', name: 'Youtube' }
    ];

    return (
        <div className="app-download">
            <h3 className="app-title">Tải App NOIR Plus</h3>
            <p className="app-text">
                NOIR Plus - Ứng dụng đặt bàn & giao đồ ăn thông minh. Tải ngay để nhận ưu đãi độc quyền!
            </p>
            <div className="app-buttons">
                <a href="#">Tải trên App Store</a>
                <a href="#">Tải trên Google Play</a>
            </div>
            <div className="social-links">
                {socialLinks.map((social) => {
                    const Icon = social.icon;
                    return (
                        <a
                            key={social.id}
                            href={social.url}
                            className="social-link"
                            aria-label={social.name}
                        >
                            <Icon size={24} />
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

export default AppDownload;