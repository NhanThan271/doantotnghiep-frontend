import React from "react";
import styles from "./EmployeeLayout.module.css";

const EmployeeLayout = ({ children }) => {
    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>{children}</div>
        </div>
    );
};

export default EmployeeLayout;
