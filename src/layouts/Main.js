import React from "react";
import { Route, Routes } from "react-router-dom";
import HeroLanding from "../pages/client/HeroLanding";
import Home from "./Home";

const Main = () => (
    <main>
        <Routes>
            <Route path="/" element={<HeroLanding />} />

        </Routes>
    </main>
);

export default Main;
