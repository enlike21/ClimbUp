import './bootstrap.js';
import React from "react";
import { createRoot } from "react-dom/client";
import ClimbingRoutes from "./ClimbingRoutes";

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("react-app");
    if (container) {
        const routes = JSON.parse(container.dataset.routes || "[]"); // Cargar datos desde Twig
        const root = createRoot(container);
        root.render(<ClimbingRoutes routes={routes} />);
    }
});
