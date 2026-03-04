import React from "react";
import styles from "./CafeCusSystem.module.css";

const MenuSection = ({ products, addToCart }) => {
    return (
        <div className={styles.menuSection}>
            <div className={styles.productGrid}>
                {products.map((p) => (
                    <div key={p.id} className={styles.productCard} onClick={() => addToCart(p)}>
                        <img src={p.image} alt={p.name} className={styles.productImg} />
                        <h3 className={styles.productName}>{p.name}</h3>
                        <p className={styles.productPrice}>{p.price.toLocaleString("vi-VN")}đ</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MenuSection;
