
(function() {
    'use strict';

    window.togglePasswordVisibility = function(inputId, button) {
        const input = document.getElementById(inputId);
        const icon = button.querySelector('i');

        if (!input || !icon) {
            console.error('Password toggle failed: input or icon not found');
            return;
        }

        const isPassword = input.type === 'password';

        input.type = isPassword ? 'text' : 'password';

        icon.classList.remove(isPassword ? 'fa-eye' : 'fa-eye-slash');
        icon.classList.add(isPassword ? 'fa-eye-slash' : 'fa-eye');

        button.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
    };

    document.addEventListener('DOMContentLoaded', function() {
        initInputFocusStates();
        initAlertAutoDismiss();
        initPasswordStrength();
        initFormLoadingState();
    });

    function initInputFocusStates() {
        const formControls = document.querySelectorAll('.form-control');

        formControls.forEach(function(input) {
            input.addEventListener('focus', function() {
                const wrapper = this.closest('.input-wrapper');
                if (wrapper) {
                    wrapper.classList.add('focused');
                }
            });

            input.addEventListener('blur', function() {
                const wrapper = this.closest('.input-wrapper');
                if (wrapper) {
                    wrapper.classList.remove('focused');
                }
            });
        });
    }

    function initAlertAutoDismiss(duration = 5000) {
        const alerts = document.querySelectorAll('.alert');

        alerts.forEach(function(alert) {
            setTimeout(function() {
                dismissAlert(alert);
            }, duration);
        });
    }

    function dismissAlert(alert) {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100px)';

        setTimeout(function() {
            alert.style.display = 'none';
            alert.remove();
        }, 300);
    }

    window.closeAlert = function(button) {
        const alert = button.closest('.alert');
        if (alert) {
            dismissAlert(alert);
        }
    };

    function initPasswordStrength() {
        const passwordInput = document.getElementById('registration_form_plainPassword_first');
        const fill = document.getElementById('strengthFill');
        const text = document.getElementById('strengthText');

        if (!passwordInput || !fill || !text) return;

        passwordInput.addEventListener('input', function() {
            const val = this.value;
            let score = 0;

            if (val.length >= 8) score++;
            if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
            if (/\d/.test(val)) score++;
            if (/[^a-zA-Z0-9]/.test(val)) score++;

            fill.className = 'strength-fill';
            text.className = 'strength-text';

            if (val.length === 0) {
                text.textContent = '';
                fill.style.width = '0';
                return;
            }

            if (score <= 1) {
                fill.classList.add('weak');
                text.classList.add('weak');
                text.textContent = 'Débil';
            } else if (score <= 2) {
                fill.classList.add('medium');
                text.classList.add('medium');
                text.textContent = 'Media';
            } else {
                fill.classList.add('strong');
                text.classList.add('strong');
                text.textContent = 'Fuerte';
            }
        });
    }

    function initFormLoadingState() {
        document.querySelectorAll('form').forEach(function(form) {
            form.addEventListener('submit', function() {
                const btn = form.querySelector('.btn-submit');
                if (btn && !btn.classList.contains('btn-loading')) {
                    btn.classList.add('btn-loading');
                }
            });
        });
    }

})();