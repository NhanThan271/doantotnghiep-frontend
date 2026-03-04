import React from "react";
import styles from "./EmployeeLayout.module.css";

const CustomerLayout = ({ children }) => {
    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>{children}</div>
        </div>
    );
};

export default CustomerLayout;
