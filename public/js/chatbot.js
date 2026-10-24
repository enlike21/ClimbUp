(function() {
    'use strict';

    var API_URL = '/api/chat';
    var CLEAR_URL = '/api/chat/clear';

    // Detect context: widget or dedicated page
    var isPage = !!document.getElementById('chatbotPageMessages');

    var els = {
        form: document.getElementById(isPage ? 'chatbotPageForm' : 'chatbotForm'),
        input: document.getElementById(isPage ? 'chatbotPageInput' : 'chatbotInput'),
        messages: document.getElementById(isPage ? 'chatbotPageMessages' : 'chatbotMessages'),
        typing: document.getElementById(isPage ? 'chatbotPageTyping' : 'chatbotTyping'),
        toggle: document.getElementById('chatbotToggle'),
        widget: document.getElementById('chatbotWidget'),
        clearBtn: document.getElementById('chatbotClearBtn')
    };

    var isOpen = isPage;
    var isLoading = false;

    // Typewriter speed (ms per character)
    var TYPE_SPEED = 15;
    var BOT_ICON = 'fas fa-robot';

    // Widget toggle
    if (els.toggle && els.widget) {
        els.toggle.addEventListener('click', function() {
            isOpen = !isOpen;
            els.widget.classList.toggle('open', isOpen);
            if (isOpen && els.input) {
                els.input.focus();
                scrollToBottom();
            }
        });
    }

    // Send message
    if (els.form) {
        els.form.addEventListener('submit', function(e) {
            e.preventDefault();
            var message = els.input.value.trim();
            if (!message || isLoading) return;

            appendMessage('user', message);
            els.input.value = '';
            showTyping(true);
            isLoading = true;

            fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ message: message })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                showTyping(false);
                if (data.success) {
                    appendMessage('bot', data.message, data.routes || [], true);
                } else {
                    appendMessage('bot', data.message || 'Error al procesar tu consulta.', [], true);
                }
            })
            .catch(function() {
                showTyping(false);
                appendMessage('bot', 'Error de conexión. Inténtalo de nuevo.', [], true);
            });
        });
    }

    // Suggestion buttons
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.chatbot-suggestion');
        if (!btn) return;
        var msg = btn.getAttribute('data-message');
        if (msg && els.input && els.form) {
            els.input.value = msg;
            els.form.dispatchEvent(new Event('submit'));
        }
    });

    // Clear history
    if (els.clearBtn) {
        els.clearBtn.addEventListener('click', function() {
            fetch(CLEAR_URL, {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (els.messages) {
                var welcome = els.messages.querySelector('.chatbot-message');
                var firstMsg = welcome ? welcome.outerHTML : '';
                els.messages.innerHTML = firstMsg;
            }
        });
    }

    function appendMessage(role, text, routes, animate) {
        routes = routes || [];
        animate = animate || false;
        if (!els.messages) return;

        var div = document.createElement('div');
        div.className = 'chatbot-message chatbot-message-' + role;

        if (role === 'bot') {
            var avatarDiv = document.createElement('div');
            avatarDiv.className = 'chatbot-msg-avatar';
            avatarDiv.innerHTML = '<i class="' + BOT_ICON + '"></i>';

            var contentDiv = document.createElement('div');
            contentDiv.className = 'chatbot-msg-content';

            div.appendChild(avatarDiv);
            div.appendChild(contentDiv);
            els.messages.appendChild(div);

            if (animate) {
                typewriterEffect(contentDiv, text, routes);
            } else {
                contentDiv.innerHTML = '<p>' + formatText(text) + '</p>' +
                    (routes.length > 0 ? renderRouteCards(routes) : '');
            }
        } else {
            div.innerHTML =
                '<div class="chatbot-msg-content"><p>' + escapeHtml(text) + '</p></div>' +
                '<div class="chatbot-msg-avatar"><i class="fas fa-user"></i></div>';
            els.messages.appendChild(div);
        }

        scrollToBottom();
    }

    function typewriterEffect(container, text, routes) {
        var p = document.createElement('p');
        container.appendChild(p);

        // Use textContent to avoid HTML parsing issues
        var plainText = text;
        var index = 0;

        function typeNext() {
            if (index < plainText.length) {
                // Variable batch size for natural rhythm
                var batchSize;
                if (Math.random() < 0.08) {
                    batchSize = 1;
                } else if (Math.random() < 0.3) {
                    batchSize = 2;
                } else {
                    batchSize = 3;
                }

                var end = Math.min(index + batchSize, plainText.length);
                index = end;
                p.textContent = plainText.substring(0, index);
                scrollToBottom();

                // Variable delay for natural feel
                var delay = TYPE_SPEED;
                var lastChar = plainText.charAt(index - 1);
                if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
                    delay = TYPE_SPEED * 6;
                } else if (lastChar === ',') {
                    delay = TYPE_SPEED * 3;
                } else if (lastChar === ':') {
                    delay = TYPE_SPEED * 3;
                } else if (lastChar === '\n') {
                    delay = TYPE_SPEED * 4;
                }

                setTimeout(typeNext, delay);
            } else {
                // Typing done: swap to formatted HTML
                p.innerHTML = formatText(text);

                // Show route cards with staggered animation
                if (routes.length > 0) {
                    showRouteCards(container, routes);
                }

                isLoading = false;
            }
        }

        typeNext();
    }

    function showRouteCards(container, routes) {
        var wrapper = document.createElement('div');
        wrapper.className = 'chatbot-routes';
        container.appendChild(wrapper);

        routes.forEach(function(r, i) {
            setTimeout(function() {
                var rating = r.rating ? parseFloat(r.rating).toFixed(1) + '/4' : '';
                var card = document.createElement('a');
                card.href = r.url;
                card.className = 'chatbot-route-card';
                card.style.opacity = '0';
                card.style.transform = 'translateY(8px)';
                card.innerHTML =
                    '<div class="chatbot-route-top">' +
                        '<span class="chatbot-route-name">' + escapeHtml(r.name) + '</span>' +
                        '<span class="chatbot-route-badge">' + escapeHtml(r.routeType) + '</span>' +
                    '</div>' +
                    '<div class="chatbot-route-info">' +
                        '<span><i class="fas fa-signal"></i> ' + escapeHtml(r.difficulty) + '</span>' +
                        '<span><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(r.location) + '</span>' +
                        (rating ? '<span><i class="fas fa-star"></i> ' + rating + '</span>' : '') +
                    '</div>';
                wrapper.appendChild(card);
                scrollToBottom();

                // Trigger animation
                requestAnimationFrame(function() {
                    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
            }, i * 150);
        });
    }

    function renderRouteCards(routes) {
        var html = '<div class="chatbot-routes">';
        for (var i = 0; i < routes.length; i++) {
            var r = routes[i];
            var rating = r.rating ? parseFloat(r.rating).toFixed(1) + '/4' : '';
            html +=
                '<a href="' + r.url + '" class="chatbot-route-card">' +
                    '<div class="chatbot-route-top">' +
                        '<span class="chatbot-route-name">' + escapeHtml(r.name) + '</span>' +
                        '<span class="chatbot-route-badge">' + escapeHtml(r.routeType) + '</span>' +
                    '</div>' +
                    '<div class="chatbot-route-info">' +
                        '<span><i class="fas fa-signal"></i> ' + escapeHtml(r.difficulty) + '</span>' +
                        '<span><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(r.location) + '</span>' +
                        (rating ? '<span><i class="fas fa-star"></i> ' + rating + '</span>' : '') +
                    '</div>' +
                '</a>';
        }
        html += '</div>';
        return html;
    }

    function formatText(text) {
        text = escapeHtml(text);
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\n/g, '<br>');
        return text;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function scrollToBottom() {
        if (els.messages) {
            setTimeout(function() {
                els.messages.scrollTop = els.messages.scrollHeight;
            }, 50);
        }
    }

    function showTyping(show) {
        if (els.typing) {
            els.typing.style.display = show ? 'flex' : 'none';
        }
        if (show) scrollToBottom();
    }
})();
