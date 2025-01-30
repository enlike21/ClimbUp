console.log("✅ Cargando app.js...");

import React from "react";
import { createRoot } from "react-dom/client";
import ClimbingRoutes from "./ClimbingRoutes.js";

const container = document.getElementById("react-app");

if (container) {
    console.log("✅ Se encontró el contenedor #react-app en el DOM");
    const routes = JSON.parse(container.dataset.routes || "[]");
    console.log("🚀 Datos de rutas recibidos en React:", routes);

    const root = createRoot(container);
    root.render(<ClimbingRoutes routes={routes} />);
} else {
    console.error("❌ No se encontró el contenedor de React");
}
