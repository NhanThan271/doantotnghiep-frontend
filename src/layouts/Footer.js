import React from 'react';
import '../assets/css/style.css';

// Footer Component
const Footer = () => (
    <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <h3 className="text-white font-bold text-lg mb-4">CÔNG TY CỔ PHẦN TẬP ĐOÀN GOLDEN NOIR</h3>
                    <p className="text-sm mb-2">Trụ sở chính: Số 69 Phố Giang Văn Minh, Phường Đội Cấn, Quận Ba Đình, Thành phố Hà Nội, Việt Nam</p>
                    <p className="text-sm mb-2">VPGD: Tầng 9, Tòa nhà Toyota, Số 319 Trường Chinh, P.Khương Mai, Q.Thanh Xuân, TP.Hà Nội, Việt Nam.</p>
                    <p className="text-sm mb-2">Chịu trách nhiệm nội dung: (Ông) </p>
                    <p className="text-sm mb-2">GPĐK: 0102721191 cấp ngày 09/04/2008</p>
                    <p className="text-sm">ĐT: 043 219 7939 Email: support.nr@gnr.com.vn</p>
                </div>

                <div>
                    <h3 className="text-white font-bold text-lg mb-4">HỖ TRỢ KHÁCH HÀNG</h3>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#" className="hover:text-white transition">Điều khoản sử dụng</a></li>
                        <li><a href="#" className="hover:text-white transition">Chính sách thanh viên</a></li>
                        <li><a href="#" className="hover:text-white transition">Chính sách bảo mật</a></li>
                    </ul>
                </div>

                <div className="text-right">
                    <p className="text-sm">© 2011 Golden Noir., JSC. All rights reserved</p>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
