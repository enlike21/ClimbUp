(function() {
    'use strict';

    function initBackToTop() {
        const btn = document.getElementById('backToTop');
        if (!btn) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        });

        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    function initNavbar() {
        const navbar = document.querySelector('.navbar');
        const toggler = document.getElementById('navbarToggler');
        const menu = document.getElementById('navbarMenu');
        const overlay = document.getElementById('menuOverlay');
        const menuClose = document.getElementById('menuClose');
        const navbarLogo = document.querySelector('.navbar-brand .logo');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        if (toggler && menu && overlay) {
            const toggleMenu = () => {
                toggler.classList.toggle('active');
                menu.classList.toggle('active');
                overlay.classList.toggle('active');
                document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
                toggler.setAttribute('aria-expanded', menu.classList.contains('active'));

                if (navbarLogo) {
                    if (menu.classList.contains('active')) {
                        navbarLogo.style.opacity = '0';
                    } else {
                        navbarLogo.style.opacity = '1';
                    }
                }
            };

            toggler.addEventListener('click', toggleMenu);
            overlay.addEventListener('click', toggleMenu);

            if (menuClose) {
                menuClose.addEventListener('click', toggleMenu);
            }

            const navLinks = menu.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (menu.classList.contains('active')) {
                        toggleMenu();
                    }
                });
            });
        }
    }

    function initScrollReveal() {
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

        document.querySelectorAll('.glass-card').forEach(el => {
            // Skip elements managed by GSAP on the homepage
            if (el.closest('.features-section') && typeof gsap !== 'undefined') return;

            el.style.opacity = '1';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.6s ease-out';
            observer.observe(el);
        });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }

    function initFormLoading() {
        document.querySelectorAll('form').forEach(function(form) {
            form.addEventListener('submit', function() {
                var btn = form.querySelector('.btn-submit');
                if (btn && !btn.classList.contains('btn-loading')) {
                    btn.classList.add('btn-loading');
                }
            });
        });
    }

    function initConfirmModal() {
        document.querySelectorAll('[data-confirm]').forEach(function(el) {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                var message = this.getAttribute('data-confirm');
                var form = this.closest('form');
                showConfirmModal(message, function() {
                    if (form) form.submit();
                });
            });
        });
    }

    window.showConfirmModal = function(message, onConfirm) {
        var existing = document.querySelector('.confirm-modal-overlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay';
        overlay.innerHTML =
            '<div class="confirm-modal">' +
                '<div class="confirm-modal-icon"><i class="fas fa-exclamation-triangle"></i></div>' +
                '<h3 class="confirm-modal-title">Confirmar acción</h3>' +
                '<p class="confirm-modal-message">' + message + '</p>' +
                '<div class="confirm-modal-actions">' +
                    '<button class="btn btn-secondary" id="confirmCancel">Cancelar</button>' +
                    '<button class="btn btn-danger" id="confirmOk">Eliminar</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        requestAnimationFrame(function() { overlay.classList.add('active'); });

        overlay.querySelector('#confirmCancel').addEventListener('click', function() {
            overlay.classList.remove('active');
            setTimeout(function() { overlay.remove(); }, 300);
        });

        overlay.querySelector('#confirmOk').addEventListener('click', function() {
            overlay.classList.remove('active');
            setTimeout(function() { overlay.remove(); }, 300);
            if (onConfirm) onConfirm();
        });

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                setTimeout(function() { overlay.remove(); }, 300);
            }
        });

        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') {
                overlay.classList.remove('active');
                setTimeout(function() { overlay.remove(); }, 300);
                document.removeEventListener('keydown', handler);
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initNavbar();
            initScrollReveal();
            initSmoothScroll();
            initBackToTop();
            initFormLoading();
            initConfirmModal();
        });
    } else {
        initNavbar();
        initScrollReveal();
        initSmoothScroll();
        initBackToTop();
        initFormLoading();
        initConfirmModal();
    }
})();