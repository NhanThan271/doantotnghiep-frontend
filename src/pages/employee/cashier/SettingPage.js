// pages/employee/cashier/SettingPage.js
import React, { useState, useEffect } from "react";
import { User, Lock, Bell, Palette, Save } from "lucide-react";
import styles from "./SettingPage.module.css";

const SettingPage = () => {
    const [user, setUser] = useState({});
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [notifications, setNotifications] = useState({ email: true, sound: true, desktop: false });
    const [theme, setTheme] = useState('light');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);
    }, []);

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/cashier/update-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fullName: user.fullName, phone: user.phone })
            });
            if (response.ok) {
                setMessage('Cập nhật thành công!');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            setMessage('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage('Mật khẩu mới không khớp');
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/cashier/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword: passwordData.oldPassword, newPassword: passwordData.newPassword })
            });
            if (response.ok) {
                setMessage('Đổi mật khẩu thành công!');
                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setMessage('Mật khẩu cũ không đúng');
            }
        } catch (error) {
            setMessage('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Cài đặt</h2>
            </div>

            {message && <div className={styles.message}>{message}</div>}

            <div className={styles.settingsGrid}>
                {/* Profile */}
                <div className={styles.settingCard}>
                    <div className={styles.cardHeader}><User size={20} /><h3>Thông tin cá nhân</h3></div>
                    <div className={styles.formGroup}>
                        <label>Họ tên</label>
                        <input type="text" value={user.fullName || ''} onChange={(e) => setUser({ ...user, fullName: e.target.value })} className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Email</label>
                        <input type="email" value={user.email || ''} disabled className={styles.inputDisabled} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Số điện thoại</label>
                        <input type="tel" value={user.phone || ''} onChange={(e) => setUser({ ...user, phone: e.target.value })} className={styles.input} />
                    </div>
                    <button onClick={handleUpdateProfile} disabled={loading} className={styles.saveBtn}><Save size={16} /> Lưu thay đổi</button>
                </div>

                {/* Change Password */}
                <div className={styles.settingCard}>
                    <div className={styles.cardHeader}><Lock size={20} /><h3>Đổi mật khẩu</h3></div>
                    <div className={styles.formGroup}>
                        <label>Mật khẩu hiện tại</label>
                        <input type="password" value={passwordData.oldPassword} onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })} className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Mật khẩu mới</label>
                        <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Xác nhận mật khẩu</label>
                        <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className={styles.input} />
                    </div>
                    <button onClick={handleChangePassword} disabled={loading} className={styles.changePasswordBtn}><Lock size={16} /> Đổi mật khẩu</button>
                </div>

                {/* Notifications */}
                <div className={styles.settingCard}>
                    <div className={styles.cardHeader}><Bell size={20} /><h3>Thông báo</h3></div>
                    <div className={styles.toggleGroup}>
                        <label>🔔 Thông báo email</label>
                        <input type="checkbox" checked={notifications.email} onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })} className={styles.toggle} />
                    </div>
                    <div className={styles.toggleGroup}>
                        <label>🔊 Âm thanh</label>
                        <input type="checkbox" checked={notifications.sound} onChange={(e) => setNotifications({ ...notifications, sound: e.target.checked })} className={styles.toggle} />
                    </div>
                    <div className={styles.toggleGroup}>
                        <label>💻 Thông báo desktop</label>
                        <input type="checkbox" checked={notifications.desktop} onChange={(e) => setNotifications({ ...notifications, desktop: e.target.checked })} className={styles.toggle} />
                    </div>
                </div>

                {/* Theme */}
                <div className={styles.settingCard}>
                    <div className={styles.cardHeader}><Palette size={20} /><h3>Giao diện</h3></div>
                    <div className={styles.themeOptions}>
                        <button className={theme === 'light' ? styles.themeActive : styles.themeBtn} onClick={() => setTheme('light')}>☀️ Sáng</button>
                        <button className={theme === 'dark' ? styles.themeActive : styles.themeBtn} onClick={() => setTheme('dark')}>🌙 Tối</button>
                        <button className={theme === 'system' ? styles.themeActive : styles.themeBtn} onClick={() => setTheme('system')}>🖥️ Hệ thống</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingPage;