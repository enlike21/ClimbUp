document.addEventListener("DOMContentLoaded", async function () {
    let routesData = document.getElementById("routes-data");
    if (!routesData) {
        console.error("Error: No se encontró el elemento #routes-data");
        return;
    }

    const checkCompletedUrl = routesData.dataset.checkCompleted;
    const checkSavedUrl = routesData.dataset.checkSaved;
    const saveRouteUrl = routesData.dataset.saveRoute;

    const fetchData = async (url, method = "GET", body = null) => {
        const options = {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: body ? JSON.stringify(body) : null
        };
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    };

    let perPage = window.innerWidth <= 768 ? 15 : 30;
    let urlParams = new URLSearchParams(window.location.search);

    if (!urlParams.has('per_page') || urlParams.get('per_page') !== perPage.toString()) {
        urlParams.set('per_page', perPage);
        window.location.href = window.location.pathname + '?' + urlParams.toString();
    }

    try {
        const { completedRoutes = [] } = await fetchData(checkCompletedUrl);

        const buttons = document.querySelectorAll(".save-route-btn");
        const buttonPromises = Array.from(buttons).map(async (button) => {
            let routeId = parseInt(button.dataset.routeId);

            if (completedRoutes.includes(routeId)) {
                button.classList.add("completed");
                button.innerHTML = '<i class="fas fa-check-circle"></i> Completada';
                button.disabled = true;
            } else {
                try {
                    const { saved } = await fetchData(checkSavedUrl, "POST", { id: routeId });

                    if (saved) {
                        button.classList.add("saved");
                        button.innerHTML = '<i class="fas fa-check"></i> Guardada';
                        button.disabled = true;
                    } else {
                        button.addEventListener("click", async function () {
                            try {
                                const { success } = await fetchData(saveRouteUrl, "POST", { id: routeId });

                                if (success) {
                                    let messageBox = document.createElement("div");
                                    messageBox.className = "success-message";
                                    messageBox.innerHTML = '<i class="fas fa-check-circle"></i> ¡Ruta guardada en Por Hacer!';
                                    button.parentElement.appendChild(messageBox);
                                    messageBox.style.display = "block";

                                    setTimeout(() => {
                                        messageBox.style.display = "none";
                                        messageBox.remove();
                                    }, 3000);

                                    button.classList.add("saved");
                                    button.innerHTML = '<i class="fas fa-check"></i> Guardada';
                                    button.disabled = true;
                                }
                            } catch (error) {
                                console.error("Error al guardar la ruta:", error);
                            }
                        });
                    }
                } catch (error) {
                    console.error("Error al verificar si está guardada:", error);
                }
            }
        });

        await Promise.all(buttonPromises);
    } catch (error) {
        console.error("Error al obtener rutas completadas:", error);
    }
});
