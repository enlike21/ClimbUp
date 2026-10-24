/**
 * Route Details - ClimbUp
 * Handles save route functionality and share feature
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        TOAST_DURATION: 3000,
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    /**
     * Fetch data from API
     */
    async function fetchData(url, method = 'POST', body = null) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };

            if (method !== 'GET') {
                headers['X-CSRF-TOKEN'] = getCsrfToken();
            }

            const options = {
                method,
                headers
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

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

    /**
     * Show toast notification
     */
    function showToast(message) {
        const toast = document.getElementById('successToast');
        const toastMessage = document.getElementById('toastMessage');

        if (!toast || !toastMessage) return;

        toastMessage.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            closeToast();
        }, CONFIG.TOAST_DURATION);
    }

    /**
     * Close toast notification
     */
    window.closeToast = function() {
        const toast = document.getElementById('successToast');
        if (toast) {
            toast.classList.remove('show');
        }
    };

    // ============================================
    // SAVE ROUTE FUNCTIONALITY
    // ============================================

    /**
     * Initialize save route button
     */
    async function initSaveButton() {
        const saveBtn = document.getElementById('saveRouteBtn');

        if (!saveBtn) return;

        const routeData = document.getElementById('route-data');

        if (!routeData) {
            console.error('Route data element not found');
            return;
        }

        const routeId = parseInt(routeData.dataset.routeId);
        const checkSavedUrl = routeData.dataset.checkSaved;
        const saveRouteUrl = routeData.dataset.saveRoute;

        // Check if route is already saved
        try {
            const { saved } = await fetchData(checkSavedUrl, 'POST', { id: routeId });

            if (saved) {
                updateSaveButton(saveBtn, true);
            } else {
                // Add click handler
                saveBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    await handleSaveRoute(saveBtn, routeId, saveRouteUrl);
                });
            }
        } catch (error) {
            console.error('Error checking saved status:', error);
        }
    }

    /**
     * Handle save route action
     */
    async function handleSaveRoute(button, routeId, saveUrl) {
        if (button.disabled) return;

        // Disable button
        button.disabled = true;

        // Animate button
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 100);

        try {
            const { success, message } = await fetchData(saveUrl, 'POST', { id: routeId });

            if (success) {
                updateSaveButton(button, true);
                showToast(message || 'Ruta guardada correctamente');

                // Add celebration animation
                celebrateSuccess(button);
            } else {
                button.disabled = false;
                showToast(message || 'Error al guardar la ruta');
            }
        } catch (error) {
            console.error('Error saving route:', error);
            button.disabled = false;
            showToast('Error al guardar la ruta');
        }
    }

    /**
     * Update save button state
     */
    function updateSaveButton(button, saved) {
        if (saved) {
            button.classList.add('saved');
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.disabled = true;
            button.title = 'Ruta guardada';
        } else {
            button.classList.remove('saved');
            button.innerHTML = '<i class="fas fa-bookmark"></i>';
            button.disabled = false;
            button.title = 'Guardar ruta';
        }
    }

    /**
     * Celebration animation
     */
    function celebrateSuccess(element) {
        const colors = ['#667EEA', '#764BA2', '#F093FB', '#4FACFE', '#10B981'];
        const confettiCount = 20;

        for (let i = 0; i < confettiCount; i++) {
            createConfetti(
                element.getBoundingClientRect(),
                colors[Math.floor(Math.random() * colors.length)]
            );
        }
    }

    /**
     * Create confetti particle
     */
    function createConfetti(rect, color) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '8px';
        confetti.style.height = '8px';
        confetti.style.backgroundColor = color;
        confetti.style.left = rect.left + rect.width / 2 + 'px';
        confetti.style.top = rect.top + rect.height / 2 + 'px';
        confetti.style.opacity = '1';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '10001';
        confetti.style.borderRadius = '50%';

        document.body.appendChild(confetti);

        const angle = Math.random() * Math.PI * 2;
        const velocity = 2 + Math.random() * 2;
        const rotation = Math.random() * 360;

        confetti.animate([
            {
                transform: `translate(0, 0) rotate(0deg)`,
                opacity: 1
            },
            {
                transform: `translate(${Math.cos(angle) * 100}px, ${Math.sin(angle) * 100}px) rotate(${rotation}deg)`,
                opacity: 0
            }
        ], {
            duration: 1000 + Math.random() * 500,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });

        setTimeout(() => {
            confetti.remove();
        }, 1500);
    }

    // ============================================
    // SHARE FUNCTIONALITY
    // ============================================

    /**
     * Initialize share button
     */
    function initShareButton() {
        const shareBtn = document.getElementById('shareRouteBtn');

        if (!shareBtn) return;

        shareBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleShare();
        });
    }

    /**
     * Handle share action
     */
    async function handleShare() {
        const routeTitle = document.querySelector('.route-title').textContent;
        const routeUrl = window.location.href;

        // Check if Web Share API is available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: routeTitle,
                    text: `¡Mira esta ruta de escalada en ClimbUp!`,
                    url: routeUrl
                });
                showToast('¡Compartido exitosamente!');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    fallbackShare(routeUrl);
                }
            }
        } else {
            fallbackShare(routeUrl);
        }
    }

    /**
     * Fallback share (copy to clipboard)
     */
    function fallbackShare(url) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url)
                .then(() => {
                    showToast('¡Enlace copiado al portapapeles!');
                })
                .catch(err => {
                    console.error('Error copying to clipboard:', err);
                    showToast('No se pudo copiar el enlace');
                });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                showToast('¡Enlace copiado al portapapeles!');
            } catch (err) {
                console.error('Fallback copy failed:', err);
                showToast('No se pudo copiar el enlace');
            }

            document.body.removeChild(textArea);
        }
    }

    // ============================================
    // SCROLL ANIMATIONS
    // ============================================

    /**
     * Initialize scroll animations
     */
    function initScrollAnimations() {
        const elements = document.querySelectorAll('.glass-card, .breadcrumbs');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        elements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'all 0.6s ease-out';
            observer.observe(element);
        });
    }

    // ============================================
    // HOVER EFFECTS
    // ============================================

    /**
     * Add enhanced hover effects
     */
    function initHoverEffects() {
        const cards = document.querySelectorAll('.info-item, .stat-item');

        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transition = 'all 0.3s ease';
            });
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize everything
     */
    async function init() {
        // Initialize save button
        await initSaveButton();

        // Initialize share button
        initShareButton();

        // Initialize scroll animations
        initScrollAnimations();

        // Initialize hover effects
        initHoverEffects();

        // Add loaded class
        document.body.classList.add('route-detail-loaded');
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();