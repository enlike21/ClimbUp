/**
 * Map - ClimbUp
 * Interactive map with location markers and clustering
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        DEFAULT_CENTER: [37.5, -4.5],
        DEFAULT_ZOOM: 7,
        MAX_ZOOM: 18,
        MIN_ZOOM: 6,
        CLUSTER_MAX_ZOOM: 12,
        ANIMATION_DURATION: 500,
    };

    // ============================================
    // STATE
    // ============================================
    let map = null;
    let markersLayer = null;
    let userLocationMarker = null;

    // ============================================
    // MAP INITIALIZATION
    // ============================================

    /**
     * Initialize the map
     */
    function initMap() {
        // Create map
        map = L.map('map', {
            center: CONFIG.DEFAULT_CENTER,
            zoom: CONFIG.DEFAULT_ZOOM,
            maxZoom: CONFIG.MAX_ZOOM,
            minZoom: CONFIG.MIN_ZOOM,
            zoomControl: false,
        });

        // Add zoom control to bottom right
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: CONFIG.MAX_ZOOM,
        }).addTo(map);

        // Initialize marker cluster group
        markersLayer = L.markerClusterGroup({
            maxClusterRadius: 80,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: createClusterIcon,
        });

        map.addLayer(markersLayer);

        // Add map event listeners
        map.on('zoomend', handleZoomChange);
        map.on('moveend', handleMoveEnd);

        return map;
    }

    /**
     * Create custom cluster icon
     */
    function createClusterIcon(cluster) {
        const count = cluster.getChildCount();
        let size = 'small';

        if (count > 10) {
            size = 'large';
        } else if (count > 5) {
            size = 'medium';
        }

        return L.divIcon({
            html: `<div><span>${count}</span></div>`,
            className: `marker-cluster marker-cluster-${size}`,
            iconSize: L.point(40, 40),
        });
    }

    /**
     * Create custom marker icon
     */
    function createMarkerIcon() {
        return L.divIcon({
            html: '',
            className: 'custom-marker-icon',
            iconSize: [35, 35],
            iconAnchor: [17, 35],
            popupAnchor: [0, -35],
        });
    }

    // ============================================
    // LOAD LOCATIONS
    // ============================================

    /**
     * Load and display locations
     */
    async function loadLocations() {
        const loadingOverlay = document.getElementById('mapLoading');

        try {
            const response = await fetch(window.MAP_CONFIG.apiLocationsUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const locations = await response.json();

            // Clear existing markers
            markersLayer.clearLayers();

            // Add markers for each location
            locations.forEach(location => {
                addLocationMarker(location);
            });

            // Update counter
            updateLocationCount(locations.length);

            // Fit bounds if there are locations
            if (locations.length > 0) {
                const group = L.featureGroup(markersLayer.getLayers());
                map.fitBounds(group.getBounds().pad(0.1));
            }

            // Hide loading overlay
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
            }, CONFIG.ANIMATION_DURATION);

        } catch (error) {
            console.error('Error loading locations:', error);
            loadingOverlay.innerHTML = `
                <div class="loading-error">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                    <p>Error al cargar las ubicaciones</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i>
                        <span>Reintentar</span>
                    </button>
                </div>
            `;
        }
    }

    /**
     * Add marker for a location
     */
    function addLocationMarker(location) {
        const marker = L.marker([location.latitude, location.longitude], {
            icon: createMarkerIcon(),
            title: location.name,
        });

        // Create popup content
        const popupContent = createPopupContent(location);

        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup',
            closeButton: false,
        });

        // Add click animation
        marker.on('click', function() {
            this.bounce();
        });

        // Add to markers layer
        markersLayer.addLayer(marker);
    }

    /**
     * Create popup content HTML
     */
    function createPopupContent(location) {
        const routesUrl = window.MAP_CONFIG.locationRoutesUrl.replace('__ID__', location.id);
        const routeCount = parseInt(location.route_count) || 0;
        const sportCount = parseInt(location.sport_count) || 0;
        const tradCount = parseInt(location.trad_count) || 0;
        const boulderCount = parseInt(location.boulder_count) || 0;
        const otherCount = parseInt(location.other_count) || 0;

        let typeBreakdown = '';
        const types = [];
        if (sportCount > 0) types.push(`<span class="popup-type popup-type-sport">${sportCount} Sport</span>`);
        if (tradCount > 0) types.push(`<span class="popup-type popup-type-trad">${tradCount} Trad</span>`);
        if (boulderCount > 0) types.push(`<span class="popup-type popup-type-boulder">${boulderCount} Boulder</span>`);
        if (otherCount > 0) types.push(`<span class="popup-type popup-type-other">${otherCount} Otras</span>`);

        if (types.length > 0) {
            typeBreakdown = `<div class="popup-types">${types.join('')}</div>`;
        }

        const regionHtml = location.region
            ? `<div class="popup-info-item"><i class="fas fa-mountain"></i><span>${location.region}</span></div>`
            : '';

        return `
            <div class="custom-popup-content">
                <h3 class="popup-title">${location.name}</h3>
                <div class="popup-info">
                    ${regionHtml}
                    <div class="popup-info-item">
                        <i class="fas fa-route"></i>
                        <span>${routeCount} ruta${routeCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="popup-info-item">
                        <i class="fas fa-map-pin"></i>
                        <span>${parseFloat(location.latitude).toFixed(4)}, ${parseFloat(location.longitude).toFixed(4)}</span>
                    </div>
                </div>
                ${typeBreakdown}
                <a href="${routesUrl}" class="popup-btn">
                    <i class="fas fa-route"></i>
                    <span>Ver Rutas</span>
                </a>
            </div>
        `;
    }

    // ============================================
    // MAP CONTROLS
    // ============================================

    /**
     * Reset map to default view
     */
    function resetMap() {
        map.setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM, {
            animate: true,
            duration: CONFIG.ANIMATION_DURATION / 1000,
        });
    }

    /**
     * Locate user
     */
    function locateUser() {
        if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización');
            return;
        }

        const locateBtn = document.getElementById('locateBtn');
        const originalHTML = locateBtn.innerHTML;

        locateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Ubicando...</span>';
        locateBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Remove previous user marker
                if (userLocationMarker) {
                    map.removeLayer(userLocationMarker);
                }

                // Add user marker
                userLocationMarker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        html: '<i class="fas fa-dot-circle"></i>',
                        className: 'user-location-marker',
                        iconSize: [30, 30],
                    }),
                });

                userLocationMarker.addTo(map);
                userLocationMarker.bindPopup('Tu ubicación').openPopup();

                // Pan to user location
                map.setView([lat, lng], 10, {
                    animate: true,
                });

                locateBtn.innerHTML = originalHTML;
                locateBtn.disabled = false;
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('No se pudo obtener tu ubicación');
                locateBtn.innerHTML = originalHTML;
                locateBtn.disabled = false;
            }
        );
    }


    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Update location counter
     */
    function updateLocationCount(count) {
        const counter = document.getElementById('locationCount');
        if (counter) {
            counter.textContent = count;
            counter.style.animation = 'none';
            setTimeout(() => {
                counter.style.animation = '';
            }, 10);
        }
    }

    /**
     * Handle zoom change
     */
    function handleZoomChange() {
        const zoom = map.getZoom();
        // Could add zoom-based logic here
    }

    /**
     * Handle map move end
     */
    function handleMoveEnd() {
        // Could add bounds-based logic here
    }

    /**
     * Add bounce animation to marker
     */
    L.Marker.prototype.bounce = function() {
        const marker = this;
        const icon = marker._icon;

        if (icon) {
            icon.style.animation = 'none';
            setTimeout(() => {
                icon.style.animation = 'markerBounce 0.5s ease-out';
            }, 10);
        }
    };

    // ============================================
    // MODAL FUNCTIONS
    // ============================================

    /**
     * Close location modal
     */
    window.closeLocationModal = function() {
        const modal = document.getElementById('locationModal');
        if (modal) {
            modal.classList.remove('show');
        }
    };

    // ============================================
    // EVENT LISTENERS
    // ============================================

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        // Reset map button
        const resetBtn = document.getElementById('resetMapBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetMap);
        }

        // Locate user button
        const locateBtn = document.getElementById('locateBtn');
        if (locateBtn) {
            locateBtn.addEventListener('click', locateUser);
        }

        // Close modal on outside click
        const modal = document.getElementById('locationModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeLocationModal();
                }
            });
        }

        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
                closeLocationModal();
            }
        });

    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize everything
     */
    function init() {
        // Initialize map
        initMap();

        // Load locations
        loadLocations();

        // Initialize event listeners
        initEventListeners();

        // Add loaded class
        document.body.classList.add('map-loaded');
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================
    // CSS ANIMATIONS (injected)
    // ============================================
    const style = document.createElement('style');
    style.textContent = `
        @keyframes markerBounce {
            0%, 100% {
                transform: translateY(0);
            }
            25% {
                transform: translateY(-15px);
            }
            50% {
                transform: translateY(-7px);
            }
            75% {
                transform: translateY(-12px);
            }
        }

        .user-location-marker {
            background: var(--gradient-primary);
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.2rem;
            box-shadow: 0 4px 15px rgba(212, 168, 83, 0.5);
            border: 3px solid white;
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 4px 15px rgba(212, 168, 83, 0.5);
            }
            50% {
                box-shadow: 0 4px 25px rgba(212, 168, 83, 0.8);
            }
        }
    `;
    document.head.appendChild(style);

})();