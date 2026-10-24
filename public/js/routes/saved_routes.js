/**
 * Saved Routes - ClimbUp
 * Handles route completion, deletion, and user interactions
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        TOAST_DURATION: 3000,
        ANIMATION_DURATION: 500,
        MODAL_AUTO_CLOSE: 5000,
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Fetch data from API
     */
    async function fetchData(url, method = 'POST', body = null) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };

            if (method !== 'GET') {
                headers['X-CSRF-TOKEN'] = getCsrfToken();
            }

            const options = { method, headers };
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

    /**
     * Show success modal
     */
    function showSuccessModal(routeData) {
        const modal = document.getElementById('successModal');
        const routeInfo = document.getElementById('modalRouteInfo');

        if (!modal || !routeInfo) return;

        const attemptRow = routeData.attemptTypeLabel
            ? `<div class="modal-route-info-item"><i class="fas fa-check-double"></i><span>${escapeHtml(routeData.attemptTypeLabel)}</span></div>`
            : '';

        // Build route info HTML
        routeInfo.innerHTML = `
            <div class="modal-route-info-item">
                <i class="fas fa-route"></i>
                <span>${escapeHtml(routeData.name)}</span>
            </div>
            <div class="modal-route-info-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>${escapeHtml(routeData.location)}</span>
            </div>
            <div class="modal-route-info-item">
                <i class="fas fa-mountain"></i>
                <span>${escapeHtml(routeData.type)}</span>
            </div>
            <div class="modal-route-info-item">
                <i class="fas fa-calendar-check"></i>
                <span>${escapeHtml(routeData.date)}</span>
            </div>
            ${attemptRow}
        `;

        modal.classList.add('show');

        // Auto-close after delay
        setTimeout(() => {
            closeSuccessModal();
        }, CONFIG.MODAL_AUTO_CLOSE);
    }

    /**
     * Close success modal
     */
    window.closeSuccessModal = function() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.remove('show');
        }
    };

    /**
     * Update counter
     */
    function updateCounter(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            element.style.animation = 'none';
            setTimeout(() => {
                element.style.animation = '';
            }, 10);
        }
    }

    /**
     * Animate element removal
     */
    function animateRemoval(element, callback) {
        element.classList.add('fade-out');
        setTimeout(() => {
            element.remove();
            if (callback) callback();
        }, CONFIG.ANIMATION_DURATION);
    }

    /**
     * Create completed route card
     */
    function createCompletedCard(routeData) {
        const card = document.createElement('div');
        card.className = 'route-card route-card-completed glass-card';
        card.id = `completed-${routeData.id}`;
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';

        const attemptBadge = routeData.attempt_type_label
            ? `<span class="attempt-type-badge"><i class="fas fa-check-double"></i> ${escapeHtml(routeData.attempt_type_label)}</span>`
            : '';

        const stars = routeData.personal_rating
            ? `<span class="rating-stars">${'<i class="fas fa-star"></i>'.repeat(routeData.personal_rating)}${'<i class="far fa-star"></i>'.repeat(5 - routeData.personal_rating)}</span>`
            : '';

        const metaRow = (attemptBadge || stars)
            ? `<div class="completed-meta">${attemptBadge}${stars}</div>`
            : '';

        const notesRow = routeData.notes
            ? `<p class="completed-notes">"${escapeHtml(routeData.notes)}"</p>`
            : '';

        card.innerHTML = `
            <div class="completed-badge">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="route-card-header">
                <h3 class="route-name">${escapeHtml(routeData.route_name)}</h3>
                <span class="route-type-badge route-type-${escapeHtml(routeData.route_type.toLowerCase())}">
                    ${escapeHtml(routeData.route_type)}
                </span>
            </div>
            <div class="route-card-body">
                <div class="route-info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${escapeHtml(routeData.route_location)}</span>
                </div>
                <div class="route-info-item">
                    <i class="fas fa-calendar-check"></i>
                    <span>${escapeHtml(routeData.completed_date)}</span>
                </div>
            </div>
            ${metaRow}
            ${notesRow}
        `;

        return card;
    }

    /**
     * Check if section is empty and show empty state
     */
    function checkEmptyState(containerId, emptyMessage) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const cards = container.querySelectorAll('.route-card:not(.empty-state)');

        if (cards.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state glass-card';
            emptyState.innerHTML = `
                <div class="empty-state-icon">
                    <i class="fas ${containerId === 'todo-routes' ? 'fa-bookmark' : 'fa-trophy'}"></i>
                </div>
                <h3 class="empty-state-title">${emptyMessage.title}</h3>
                <p class="empty-state-text">${emptyMessage.text}</p>
                ${emptyMessage.button || ''}
            `;
            container.appendChild(emptyState);
        }
    }

    // ============================================
    // DELETE ROUTE
    // ============================================

    /**
     * Handle route deletion
     */
    async function handleDeleteRoute(button) {
        const routeId = button.dataset.routeId;
        const routeCard = document.getElementById(`route-${routeId}`);

        if (!routeCard) return;

        // Confirm deletion with custom modal
        if (typeof window.showConfirmModal === 'function') {
            window.showConfirmModal('¿Estás seguro de que quieres eliminar esta ruta guardada?', function() {
                executeDeleteRoute(button, routeId, routeCard);
            });
            return;
        }

        executeDeleteRoute(button, routeId, routeCard);
    }

    async function executeDeleteRoute(button, routeId, routeCard) {
        // Disable button
        button.disabled = true;

        try {
            const data = await fetchData(`/mis-rutas/eliminar/${routeId}`, 'POST');

            if (data.success) {
                // Animate removal
                animateRemoval(routeCard, () => {
                    // Update counter
                    const todoCount = document.querySelectorAll('#todo-routes .route-card:not(.empty-state)').length;
                    updateCounter('todoCount', todoCount);

                    // Check if empty
                    checkEmptyState('todo-routes', {
                        title: 'No tienes rutas guardadas',
                        text: 'Explora rutas y guarda las que quieras hacer',
                        button: '<a href="/user_routes" class="btn btn-primary"><i class="fas fa-search"></i><span>Explorar Rutas</span></a>'
                    });
                });

                showToast(data.message || 'Ruta eliminada correctamente');
            }
        } catch (error) {
            console.error('Error deleting route:', error);
            button.disabled = false;
            showToast('Error al eliminar la ruta');
        }
    }

    // ============================================
    // COMPLETE ROUTE
    // ============================================

    let pendingCompleteButton = null;
    let selectedAttemptType = null;
    let selectedRating = 0;

    /**
     * Handle route completion: open the ascent-logging modal first
     */
    function handleCompleteRoute(button) {
        const routeCard = document.getElementById(`route-${button.dataset.routeId}`);
        if (!routeCard) return;

        pendingCompleteButton = button;
        selectedAttemptType = null;
        selectedRating = 0;

        const modal = document.getElementById('completeAscentModal');
        if (!modal) {
            executeCompleteRoute(button, routeCard, {});
            return;
        }

        modal.querySelectorAll('.attempt-type-btn').forEach(btn => btn.classList.remove('active'));
        modal.querySelectorAll('.star-rating .star').forEach(star => {
            star.classList.remove('active', 'fas');
            star.classList.add('far');
        });
        const notesField = document.getElementById('ascentNotes');
        if (notesField) notesField.value = '';

        modal.classList.add('show');
    }

    /**
     * Submit the ascent-logging modal and complete the route
     */
    async function submitCompleteAscent() {
        const modal = document.getElementById('completeAscentModal');
        if (modal) modal.classList.remove('show');

        if (!pendingCompleteButton) return;

        const button = pendingCompleteButton;
        const routeCard = document.getElementById(`route-${button.dataset.routeId}`);
        pendingCompleteButton = null;

        if (!routeCard) return;

        const notesField = document.getElementById('ascentNotes');

        await executeCompleteRoute(button, routeCard, {
            attemptType: selectedAttemptType,
            personalRating: selectedRating || null,
            notes: notesField ? notesField.value.trim() : null,
        });
    }

    /**
     * Perform the completion request
     */
    async function executeCompleteRoute(button, routeCard, ascentData) {
        const routeId = button.dataset.routeId;
        const routeName = button.dataset.routeName;
        const routeLocation = button.dataset.routeLocation;
        const routeType = button.dataset.routeType;

        // Disable button
        button.disabled = true;

        try {
            const data = await fetchData(`/mis-rutas/completar/${routeId}`, 'POST', ascentData);

            if (data.success) {
                // Show success modal
                showSuccessModal({
                    name: routeName,
                    location: routeLocation,
                    type: routeType,
                    date: data.completed_date,
                    attemptTypeLabel: data.attempt_type_label
                });

                animateRemoval(routeCard, () => {
                    const completedContainer = document.getElementById('completed-routes');

                    if (completedContainer) {
                        const emptyState = completedContainer.querySelector('.empty-state');
                        if (emptyState) {
                            emptyState.remove();
                        }

                        const newCard = createCompletedCard({
                            id: routeId,
                            ...data
                        });

                        completedContainer.insertBefore(newCard, completedContainer.firstChild);

                        // Trigger animation
                        setTimeout(() => {
                            newCard.style.opacity = '1';
                            newCard.style.transform = 'scale(1)';
                            newCard.style.transition = 'all 0.5s ease-out';
                        }, 50);
                    }

                    // Update counters
                    const todoCount = document.querySelectorAll('#todo-routes .route-card:not(.empty-state)').length;
                    const completedCount = document.querySelectorAll('#completed-routes .route-card:not(.empty-state)').length;

                    updateCounter('todoCount', todoCount);
                    updateCounter('completedCount', completedCount);

                    checkEmptyState('todo-routes', {
                        title: 'No tienes rutas guardadas',
                        text: 'Explora rutas y guarda las que quieras hacer',
                        button: '<a href="/user_routes" class="btn btn-primary"><i class="fas fa-search"></i><span>Explorar Rutas</span></a>'
                    });
                });

                // Confetti effect (optional)
                triggerConfetti();
            }
        } catch (error) {
            console.error('Error completing route:', error);
            button.disabled = false;
            showToast('Error al completar la ruta');
        }
    }

    // ============================================
    // CONFETTI EFFECT (Optional bonus!)
    // ============================================

    /**
     * Trigger confetti animation
     */
    function triggerConfetti() {
        // Simple confetti effect
        const colors = ['#667EEA', '#764BA2', '#F093FB', '#4FACFE', '#10B981'];
        const confettiCount = 50;

        for (let i = 0; i < confettiCount; i++) {
            createConfetti(colors[Math.floor(Math.random() * colors.length)]);
        }
    }

    /**
     * Create single confetti piece
     */
    function createConfetti(color) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = color;
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-20px';
        confetti.style.opacity = '1';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '10001';
        confetti.style.borderRadius = '50%';

        document.body.appendChild(confetti);

        const duration = Math.random() * 3 + 2;
        const rotation = Math.random() * 360;

        confetti.animate([
            {
                transform: `translateY(0) rotate(0deg)`,
                opacity: 1
            },
            {
                transform: `translateY(${window.innerHeight + 20}px) rotate(${rotation}deg)`,
                opacity: 0
            }
        ], {
            duration: duration * 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });

        setTimeout(() => {
            confetti.remove();
        }, duration * 1000);
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                handleDeleteRoute(this);
            });
        });

        // Complete buttons
        document.querySelectorAll('.complete-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                handleCompleteRoute(this);
            });
        });

        // Close modal when clicking outside
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeSuccessModal();
                }
            });
        }

        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
                closeSuccessModal();
            }
        });

        initCompleteAscentModal();
    }

    /**
     * Wire up the ascent-logging modal (attempt type, star rating, form submit/cancel)
     */
    function initCompleteAscentModal() {
        const modal = document.getElementById('completeAscentModal');
        if (!modal) return;

        const closeAscentModal = function() {
            modal.classList.remove('show');
            pendingCompleteButton = null;
        };

        modal.querySelectorAll('.attempt-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const wasActive = this.classList.contains('active');
                modal.querySelectorAll('.attempt-type-btn').forEach(b => b.classList.remove('active'));
                if (!wasActive) {
                    this.classList.add('active');
                    selectedAttemptType = this.dataset.value;
                } else {
                    selectedAttemptType = null;
                }
            });
        });

        const stars = Array.from(modal.querySelectorAll('.star-rating .star'));
        const paintStars = (value) => {
            stars.forEach(star => {
                const active = parseInt(star.dataset.value, 10) <= value;
                star.classList.toggle('active', active);
                star.classList.toggle('fas', active);
                star.classList.toggle('far', !active);
            });
        };
        stars.forEach(star => {
            star.addEventListener('mouseenter', () => paintStars(parseInt(star.dataset.value, 10)));
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.value, 10);
                paintStars(selectedRating);
            });
            star.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectedRating = parseInt(star.dataset.value, 10);
                    paintStars(selectedRating);
                }
            });
        });
        const starRatingEl = document.getElementById('starRating');
        if (starRatingEl) {
            starRatingEl.addEventListener('mouseleave', () => paintStars(selectedRating));
        }

        const form = document.getElementById('completeAscentForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                submitCompleteAscent();
            });
        }

        const cancelBtn = document.getElementById('cancelCompleteBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeAscentModal);
        }

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeAscentModal();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeAscentModal();
            }
        });
    }

    // ============================================
    // SCROLL ANIMATIONS
    // ============================================

    /**
     * Initialize scroll animations
     */
    function initScrollAnimations() {
        const cards = document.querySelectorAll('.route-card, .stat-card');

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

        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s ease-out';
            observer.observe(card);
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize progress ring animation
     */
    function initProgressRing() {
        const container = document.querySelector('.progress-ring-container');
        if (!container) return;

        const progress = parseInt(container.dataset.progress) || 0;
        const circle = container.querySelector('.progress-ring-fill');
        const valueEl = document.getElementById('progressValue');

        if (!circle || !valueEl) return;

        const circumference = 2 * Math.PI * 42; // r=42
        const offset = circumference - (progress / 100) * circumference;

        // Animate after a short delay
        setTimeout(() => {
            circle.style.strokeDashoffset = offset;

            // Animate the number counting up
            let current = 0;
            const duration = 1500;
            const step = progress / (duration / 16);
            const counter = setInterval(() => {
                current += step;
                if (current >= progress) {
                    current = progress;
                    clearInterval(counter);
                }
                valueEl.textContent = Math.round(current);
            }, 16);
        }, 300);
    }

    /**
     * Animate stat bars when they become visible
     */
    function initStatBars() {
        const bars = document.querySelectorAll('.stat-bar-fill');
        if (bars.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const fills = entry.target.querySelectorAll('.stat-bar-fill');
                    fills.forEach((fill, i) => {
                        setTimeout(() => {
                            fill.style.width = fill.dataset.width + '%';
                        }, i * 60);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        document.querySelectorAll('.stats-bars').forEach(container => {
            observer.observe(container);
        });
    }

    /**
     * Initialize everything
     */
    function init() {
        initEventListeners();
        initScrollAnimations();
        initProgressRing();
        initStatBars();

        // Add loaded class
        document.body.classList.add('saved-routes-loaded');
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();