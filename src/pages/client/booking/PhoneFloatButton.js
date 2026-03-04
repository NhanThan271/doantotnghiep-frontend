import React from 'react';
import { Phone } from 'lucide-react';
import './PhoneFloatButton.css';

const PhoneFloatButton = ({ phoneNumber = '0283456789' }) => {
    return (
        <a href={`tel:${phoneNumber}`} className="phone-float" aria-label="Gọi điện thoại">
            <Phone size={28} color="white" />
        </a>
    );
};

export default PhoneFloatButton;