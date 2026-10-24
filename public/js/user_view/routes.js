(function() {
    'use strict';

    const CONFIG = {
        TOAST_DURATION: 3000,
        ANIMATION_DELAY: 50,
    };

    let currentPage = 1;

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    async function fetchData(url, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (method !== 'GET') {
            headers['X-CSRF-TOKEN'] = getCsrfToken();
        }

        const options = {
            method,
            headers,
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('successToast');
        if (!toast) return;

        const messageElement = toast.querySelector('.toast-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        const iconElement = toast.querySelector('.toast-icon i');
        if (iconElement) {
            iconElement.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        }

        toast.classList.add('show');

        setTimeout(() => {
            closeToast('successToast');
        }, CONFIG.TOAST_DURATION);
    }

    window.closeToast = function(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.classList.remove('show');
        }
    };

    function updateButtonState(button, state, text, icon) {
        button.classList.remove('saved', 'completed');

        if (state) {
            button.classList.add(state);
        }

        button.innerHTML = `<i class="${icon}"></i><span>${text}</span>`;

        if (state === 'saved' || state === 'completed') {
            button.disabled = true;
        }
    }

    function animateButton(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 100);
    }

    async function initializeRouteButtons(urls) {
        const buttons = document.querySelectorAll('.save-route-btn');

        if (buttons.length === 0) {
            return;
        }

        try {
            const { completedRoutes = [] } = await fetchData(urls.checkCompleted);

            const buttonPromises = Array.from(buttons).map(async (button, index) => {
                button.style.animationDelay = `${index * CONFIG.ANIMATION_DELAY}ms`;
                const routeId = parseInt(button.dataset.routeId);

                if (completedRoutes.includes(routeId)) {
                    updateButtonState(
                        button,
                        'completed',
                        'Completada',
                        'fas fa-check-circle'
                    );
                    return;
                }

                try {
                    const { saved } = await fetchData(urls.checkSaved, 'POST', { id: routeId });

                    if (saved) {
                        updateButtonState(
                            button,
                            'saved',
                            'Guardada',
                            'fas fa-check'
                        );
                    } else {
                        button.addEventListener('click', async function(e) {
                            e.preventDefault();
                            await handleSaveRoute(button, routeId, urls.saveRoute);
                        });
                    }
                } catch (error) {
                    console.error(`Error checking saved status for route ${routeId}:`, error);
                }
            });

            await Promise.all(buttonPromises);
        } catch (error) {
            console.error('Error initializing route buttons:', error);
        }
    }

    async function handleSaveRoute(button, routeId, saveUrl) {
        if (button.disabled) return;

        animateButton(button);
        button.disabled = true;

        try {
            const { success, message } = await fetchData(saveUrl, 'POST', { id: routeId });

            if (success) {
                updateButtonState(
                    button,
                    'saved',
                    'Guardada',
                    'fas fa-check'
                );

                showToast(message || 'Ruta guardada correctamente');

                const card = button.closest('.route-card');
                if (card) {
                    card.style.animation = 'pulse 0.5s ease';
                    setTimeout(() => {
                        card.style.animation = '';
                    }, 500);
                }
            } else {
                button.disabled = false;
                showToast(message || 'Error al guardar la ruta', 'error');
            }
        } catch (error) {
            console.error('Error saving route:', error);
            button.disabled = false;
            showToast('Error al guardar la ruta', 'error');
        }
    }

    function initScrollAnimations() {
        const cards = document.querySelectorAll('.route-card');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        cards.forEach(card => {
            observer.observe(card);
        });
    }

    // --- AJAX Filter System ---

    function getFilterParams(page) {
        const nameInput = document.querySelector('.filter-input[name="name"]');
        const routeTypeInput = document.getElementById('routeTypeInput');
        const difficultyInput = document.getElementById('difficultyInput');
        const sortInput = document.getElementById('sortInput');
        const regionSelect = document.getElementById('regionSelect');
        const locationSelect = document.getElementById('locationSelect');

        const params = new URLSearchParams();

        const name = nameInput ? nameInput.value.trim() : '';
        if (name) params.set('name', name);

        const routeType = routeTypeInput ? routeTypeInput.value : '';
        if (routeType) params.set('route_type', routeType);

        const difficulty = difficultyInput ? difficultyInput.value.trim() : '';
        if (difficulty) params.set('difficulty', difficulty);

        const sort = sortInput ? sortInput.value : 'rating_desc';
        if (sort) params.set('sort', sort);

        const region = regionSelect ? regionSelect.value : '';
        if (region) params.set('region', region);

        const location = locationSelect ? locationSelect.value : '';
        if (location) params.set('location', location);

        if (page && page > 1) params.set('page', page);

        return params;
    }

    async function loadFilteredRoutes(page) {
        const container = document.getElementById('routesResultsContainer');
        if (!container) return;

        currentPage = page || 1;

        const params = getFilterParams(currentPage);

        // Update browser URL without reload
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        history.replaceState(null, '', newUrl);

        // Show loading state
        container.style.opacity = '0.5';
        container.style.pointerEvents = 'none';

        try {
            const response = await fetch(window.location.pathname + '?' + params.toString(), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();
            container.innerHTML = html;

            // Re-init sort chips and pagination inside new content
            initSortChips();
            initPaginationLinks();
            initScrollAnimations();

            // Re-init save/completed buttons
            const routesData = document.getElementById('routes-data');
            if (routesData) {
                const urls = {
                    checkCompleted: routesData.dataset.checkCompleted,
                    checkSaved: routesData.dataset.checkSaved,
                    saveRoute: routesData.dataset.saveRoute,
                };
                if (urls.checkCompleted && urls.checkSaved && urls.saveRoute) {
                    await initializeRouteButtons(urls);
                }
            }

            // Update clear button visibility
            updateClearButton();
        } catch (error) {
            console.error('Error loading routes:', error);
            showToast('Error al cargar las rutas', 'error');
        } finally {
            container.style.opacity = '';
            container.style.pointerEvents = '';
        }
    }

    function initChipFilters() {
        // Type chips — single select
        const typeChipsContainer = document.getElementById('typeChips');
        const routeTypeInput = document.getElementById('routeTypeInput');

        if (typeChipsContainer && routeTypeInput) {
            typeChipsContainer.addEventListener('click', function(e) {
                const chip = e.target.closest('.filter-chip');
                if (!chip) return;

                typeChipsContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                routeTypeInput.value = chip.dataset.value;

                loadFilteredRoutes(1);
            });
        }

        // Difficulty chips (multi-select) — debounced
        const difficultyInput = document.getElementById('difficultyInput');
        const diffChips = document.querySelectorAll('.diff-chip');
        let diffDebounce;

        if (difficultyInput && diffChips.length > 0) {
            diffChips.forEach(chip => {
                chip.addEventListener('click', function() {
                    this.classList.toggle('active');

                    const activeValues = Array.from(document.querySelectorAll('.diff-chip.active'))
                        .map(c => c.dataset.value);

                    difficultyInput.value = activeValues.join(',');

                    clearTimeout(diffDebounce);
                    diffDebounce = setTimeout(function() {
                        loadFilteredRoutes(1);
                    }, 800);
                });
            });
        }
    }

    function hasActiveFilters() {
        const nameInput = document.querySelector('.filter-input[name="name"]');
        const routeTypeInput = document.getElementById('routeTypeInput');
        const difficultyInput = document.getElementById('difficultyInput');
        const regionSelect = document.getElementById('regionSelect');
        const locationSelect = document.getElementById('locationSelect');

        return (nameInput && nameInput.value.trim()) ||
               (routeTypeInput && routeTypeInput.value) ||
               (difficultyInput && difficultyInput.value.trim()) ||
               (regionSelect && regionSelect.value) ||
               (locationSelect && locationSelect.value);
    }

    function updateClearButton() {
        const btn = document.getElementById('clearFiltersBtn');
        if (btn) {
            btn.style.display = hasActiveFilters() ? '' : 'none';
        }
    }

    function initFormSubmit() {
        const form = document.querySelector('.filter-form');
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            loadFilteredRoutes(1);
        });

        // "Limpiar filtros" button
        const clearBtn = document.getElementById('clearFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                const nameInput = form.querySelector('.filter-input[name="name"]');
                if (nameInput) nameInput.value = '';

                const routeTypeInput = document.getElementById('routeTypeInput');
                if (routeTypeInput) routeTypeInput.value = '';

                const difficultyInput = document.getElementById('difficultyInput');
                if (difficultyInput) difficultyInput.value = '';

                const regionSelect = document.getElementById('regionSelect');
                if (regionSelect) regionSelect.value = '';

                const locationSelect = document.getElementById('locationSelect');
                if (locationSelect) locationSelect.value = '';

                // Reset chip visuals
                form.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                const allChip = form.querySelector('.filter-chip[data-value=""]');
                if (allChip) allChip.classList.add('active');

                form.querySelectorAll('.diff-chip').forEach(c => c.classList.remove('active'));

                // Trigger location filter reset
                if (regionSelect) regionSelect.dispatchEvent(new Event('change'));

                loadFilteredRoutes(1);
            });
        }

        // Show clear button on initial load if filters are active
        updateClearButton();
    }

    function initSortChips() {
        const container = document.getElementById('sortChips');
        const sortInput = document.getElementById('sortInput');
        if (!container) return;

        container.addEventListener('click', function(e) {
            const chip = e.target.closest('.sort-chip');
            if (!chip) return;

            container.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            if (sortInput) sortInput.value = chip.dataset.sort;
            loadFilteredRoutes(1);
        });
    }

    function initPaginationLinks() {
        const container = document.getElementById('routesResultsContainer');
        if (!container) return;

        container.querySelectorAll('.page-link[data-page]').forEach(link => {
            link.style.cursor = 'pointer';
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.dataset.page);
                if (page) loadFilteredRoutes(page);
            });
        });
    }

    function initLocationFilter() {
        const regionSelect = document.getElementById('regionSelect');
        const locationSelect = document.getElementById('locationSelect');
        if (!regionSelect || !locationSelect) return;

        const allOptions = Array.from(locationSelect.querySelectorAll('option'));

        regionSelect.addEventListener('change', function() {
            const selectedRegion = this.value;
            const currentValue = locationSelect.value;
            locationSelect.innerHTML = '';

            allOptions.forEach(opt => {
                if (!selectedRegion || opt.value === '' || opt.dataset.region === selectedRegion) {
                    locationSelect.appendChild(opt.cloneNode(true));
                }
            });

            const still = locationSelect.querySelector(`option[value="${currentValue}"]`);
            if (still) {
                still.selected = true;
            } else {
                locationSelect.value = '';
            }
        });

        if (regionSelect.value) {
            regionSelect.dispatchEvent(new Event('change'));
        }
    }

    async function init() {
        initScrollAnimations();
        initChipFilters();
        initFormSubmit();
        initSortChips();
        initPaginationLinks();
        initLocationFilter();

        const routesData = document.getElementById('routes-data');

        if (!routesData) {
            return;
        }

        const urls = {
            checkCompleted: routesData.dataset.checkCompleted,
            checkSaved: routesData.dataset.checkSaved,
            saveRoute: routesData.dataset.saveRoute
        };

        if (!urls.checkCompleted || !urls.checkSaved || !urls.saveRoute) {
            return;
        }

        await initializeRouteButtons(urls);
        document.body.classList.add('routes-loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.02);
            }
        }
    `;
    document.head.appendChild(style);

})();
