import React from "react";
import styles from "./KitchenLayout.module.css";
import { ChefHat, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const KitchenLayout = ({ children }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    return (
        <div className={styles.wrapper}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <ChefHat size={32} className={styles.logo} />
                    <div>
                        <h1 className={styles.title}>Bếp - Kitchen</h1>
                        <p className={styles.subtitle}>
                            {user.branch?.name || 'Chi nhánh'}
                        </p>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.fullName || 'Bếp'}</span>
                        <span className={styles.userRole}>Nhân viên bếp</span>
                    </div>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        <LogOut size={18} />
                        Đăng xuất
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.content}>
                {children}
            </main>
        </div>
    );
};

export default KitchenLayout;