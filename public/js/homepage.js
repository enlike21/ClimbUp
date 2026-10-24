(function () {
    'use strict';

    // ============================================
    // GUARD: Require GSAP + ScrollTrigger
    // ============================================
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        document.querySelectorAll('.hero-eyebrow, .hero-title, .hero-subtitle, .hero-cta, .feature-row, .section-eyebrow, .section-title, .stat-item, .coming-soon-card, .cta-content').forEach(function (el) {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isMobile = window.innerWidth < 768;

    if (prefersReducedMotion) {
        gsap.set('.hero-eyebrow, .hero-title, .hero-subtitle, .hero-cta', { opacity: 1, y: 0 });
        gsap.set('.feature-row', { opacity: 1, y: 0 });
        gsap.set('.section-eyebrow, .section-title', { opacity: 1, y: 0 });
        gsap.set('.stat-item', { opacity: 1, y: 0 });
        gsap.set('.coming-soon-card', { opacity: 1, y: 0 });
        gsap.set('.cta-content', { opacity: 1, y: 0 });
        initStatsCounter();
        return;
    }

    // ============================================
    // STATS COUNTER
    // ============================================
    var statsHasAnimated = false;

    function animateCounter(element, target, duration) {
        duration = duration || 2000;
        var increment = target / (duration / 16);
        var current = 0;

        var timer = setInterval(function () {
            current += increment;
            if (current >= target) {
                element.textContent = target.toLocaleString();
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
        }, 16);
    }

    function triggerStatsCounter() {
        if (statsHasAnimated) return;
        statsHasAnimated = true;

        document.querySelectorAll('.stat-number').forEach(function (stat) {
            var target = parseInt(stat.getAttribute('data-count'));
            if (!isNaN(target)) {
                animateCounter(stat, target);
            }
        });
    }

    function initStatsCounter() {
        var statsSection = document.querySelector('.stats-bar');
        if (!statsSection) return;

        ScrollTrigger.create({
            trigger: statsSection,
            start: 'top 80%',
            onEnter: triggerStatsCounter,
            once: true,
        });
    }

    // ============================================
    // 1. HERO ENTRANCE
    // ============================================
    function initHeroEntrance() {
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.to('.hero-eyebrow', {
            opacity: 1,
            y: 0,
            duration: 0.8,
        })
        .to('.hero-title', {
            opacity: 1,
            y: 0,
            duration: 1,
        }, '-=0.5')
        .to('.hero-subtitle', {
            opacity: 1,
            y: 0,
            duration: 0.8,
        }, '-=0.5')
        .to('.hero-cta', {
            opacity: 1,
            y: 0,
            duration: 0.8,
        }, '-=0.3');
    }

    // ============================================
    // 2. HERO SCROLL EFFECTS
    // ============================================
    function initHeroScrollEffects() {
        if (isMobile) {
            gsap.fromTo('.hero-content',
                { y: 0, opacity: 1 },
                {
                    y: -80,
                    opacity: 0,
                    scrollTrigger: {
                        trigger: '.hero-section',
                        start: 'top top',
                        end: 'bottom top',
                        scrub: 0.5,
                    },
                }
            );
            return;
        }

        var heroTl = gsap.timeline({
            scrollTrigger: {
                trigger: '.hero-section',
                start: 'top top',
                end: '+=50%',
                pin: true,
                scrub: 0.8,
                pinSpacing: true,
                anticipatePin: 1,
            }
        });

        heroTl.fromTo('.hero-bg-image',
            { scale: 1 },
            { scale: 1.2, duration: 1, ease: 'none' },
        0);

        heroTl.fromTo('.hero-eyebrow',
            { y: 0, opacity: 1 },
            { y: -40, opacity: 0, duration: 0.5, ease: 'power2.in' },
        0.1);

        heroTl.fromTo('.hero-title',
            { y: 0, opacity: 1 },
            { y: -60, opacity: 0, duration: 0.6, ease: 'power2.in' },
        0.2);

        heroTl.fromTo('.hero-subtitle',
            { y: 0, opacity: 1 },
            { y: -50, opacity: 0, duration: 0.6, ease: 'power2.in' },
        0.3);

        heroTl.fromTo('.hero-cta',
            { y: 0, opacity: 1 },
            { y: -30, opacity: 0, duration: 0.6, ease: 'power2.in' },
        0.4);

        heroTl.fromTo('.hero-scroll-hint',
            { opacity: 1 },
            { opacity: 0, duration: 0.3 },
        0);
    }

    // ============================================
    // 3. STATS BAR REVEAL
    // ============================================
    function initStatsReveal() {
        var statItems = gsap.utils.toArray('.stats-bar .stat-item');

        statItems.forEach(function (item, index) {
            gsap.to(item, {
                scrollTrigger: {
                    trigger: '.stats-bar',
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
                opacity: 1,
                y: 0,
                duration: 0.6,
                delay: index * 0.15,
                ease: 'power2.out',
            });
        });
    }

    // ============================================
    // 4. SECTION HEADERS REVEAL
    // ============================================
    function initSectionHeaders() {
        document.querySelectorAll('.section-header').forEach(function (header) {
            var eyebrow = header.querySelector('.section-eyebrow');
            var title = header.querySelector('.section-title');

            if (eyebrow) {
                gsap.to(eyebrow, {
                    scrollTrigger: {
                        trigger: header,
                        start: 'top 85%',
                        end: 'top 60%',
                        scrub: isMobile ? false : 0.5,
                        toggleActions: isMobile ? 'play none none none' : undefined,
                    },
                    opacity: 1,
                    y: 0,
                    duration: isMobile ? 0.6 : undefined,
                    ease: isMobile ? 'power2.out' : 'none',
                });
            }

            if (title) {
                gsap.to(title, {
                    scrollTrigger: {
                        trigger: header,
                        start: 'top 80%',
                        end: 'top 55%',
                        scrub: isMobile ? false : 0.5,
                        toggleActions: isMobile ? 'play none none none' : undefined,
                    },
                    opacity: 1,
                    y: 0,
                    duration: isMobile ? 0.6 : undefined,
                    delay: isMobile ? 0.1 : undefined,
                    ease: isMobile ? 'power2.out' : 'none',
                });
            }
        });
    }

    // ============================================
    // 5. FEATURE ROWS
    // ============================================
    function initFeatureRows() {
        var rows = gsap.utils.toArray('.feature-row');

        rows.forEach(function (row) {
            gsap.to(row, {
                scrollTrigger: {
                    trigger: row,
                    start: 'top 80%',
                    end: 'top 40%',
                    scrub: isMobile ? false : 0.5,
                    toggleActions: isMobile ? 'play none none none' : undefined,
                    onLeave: function () {
                        if (!isMobile) {
                            gsap.set(row, { clearProps: 'transform' });
                            row.style.opacity = '1';
                        }
                    },
                },
                opacity: 1,
                y: 0,
                duration: isMobile ? 0.8 : undefined,
                ease: isMobile ? 'power2.out' : 'none',
            });
        });

        // Image zoom on scroll (desktop only)
        if (!isMobile) {
            var images = gsap.utils.toArray('.feature-image-wrap img');
            images.forEach(function (img) {
                gsap.fromTo(img,
                    { scale: 1.05 },
                    {
                        scale: 1,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: img.closest('.feature-row'),
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: 0.3,
                        },
                    }
                );
            });
        }
    }

    // ============================================
    // 6. COMING SOON CARDS
    // ============================================
    function initComingSoon() {
        var cards = gsap.utils.toArray('.coming-soon-card');

        cards.forEach(function (card, index) {
            gsap.to(card, {
                scrollTrigger: {
                    trigger: '.coming-soon-grid',
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
                opacity: 1,
                y: 0,
                duration: 0.6,
                delay: index * 0.15,
                ease: 'power2.out',
            });
        });
    }

    // ============================================
    // 7. CTA EFFECTS
    // ============================================
    function initCTAEffects() {
        var ctaBgImg = document.querySelector('.cta-background img');
        var ctaContent = document.querySelector('.cta-content');

        if (!ctaContent) return;

        if (isMobile) {
            gsap.to(ctaContent, {
                scrollTrigger: {
                    trigger: '.cta-section',
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power2.out',
            });
            return;
        }

        if (ctaBgImg) {
            gsap.fromTo(ctaBgImg,
                { yPercent: -10 },
                {
                    yPercent: 10,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: '.cta-section',
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 0.3,
                    },
                }
            );
        }

        gsap.to(ctaContent, {
            scrollTrigger: {
                trigger: '.cta-section',
                start: 'top 65%',
                end: 'top 30%',
                scrub: 0.5,
            },
            opacity: 1,
            y: 0,
            ease: 'none',
        });
    }

    // ============================================
    // REFRESH & RESIZE
    // ============================================
    function initRefreshOnImagesLoaded() {
        var images = document.querySelectorAll('.feature-image-wrap img, .cta-background img, .hero-bg-image');
        var loaded = 0;
        var total = images.length;

        if (total === 0) return;

        images.forEach(function (img) {
            if (img.complete) {
                loaded++;
            } else {
                img.addEventListener('load', function () {
                    loaded++;
                    if (loaded === total) ScrollTrigger.refresh();
                });
            }
        });

        setTimeout(function () { ScrollTrigger.refresh(); }, 3000);
    }

    function initResizeHandler() {
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 250);
        });
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        initHeroEntrance();
        initHeroScrollEffects();
        initStatsReveal();
        initStatsCounter();
        initSectionHeaders();
        initFeatureRows();
        initComingSoon();
        initCTAEffects();
        initRefreshOnImagesLoaded();
        initResizeHandler();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
