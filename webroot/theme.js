// theme.js — PISTA shared theme utility
// Handles dark/light mode persistence and logo variant swapping.
// Must be loaded with <script src="theme.js"></script> (non-module, non-deferred)
// so it can run synchronously in <head> to prevent FOUC.

(function () {
    const STORAGE_KEY = 'pista_theme'
    const DARK = 'dark'
    const LIGHT = 'light'

    // Logo path map
    const LOGO_SRCS = {
        'simplified-h': {
            light: 'pictures/logos/simplified-h-light.svg',
            dark:  'pictures/logos/simplified-h-dark.svg',
        },
        'horizontal': {
            light: 'pictures/logos/horizontal-light.svg',
            dark:  'pictures/logos/horizontal-dark.svg',
        },
        'favicon': {
            light: 'pictures/logos/favicon-light.svg',
            dark:  'pictures/logos/favicon-dark.svg',
        },
    };

    // Apply theme to <html> and update all logo images
    function applyTheme(theme) {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);

        // Update favicon dynamically
        const faviconEl = document.getElementById('pista-favicon');
        if (faviconEl) {
            faviconEl.href = LOGO_SRCS['favicon'][theme];
        }

        // Swap all logo images tagged with data-pista-logo
        document.querySelectorAll('[data-pista-logo]').forEach(function (img) {
            const variant = img.getAttribute('data-pista-logo');
            if (LOGO_SRCS[variant]) {
                img.src = LOGO_SRCS[variant][theme];
            }
        });

        // Update toggle button icons if present (sun = light, moon = dark)
        document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
            const icon = btn.querySelector('md-icon') || btn.querySelector('.theme-toggle-icon');
            if (icon) {
                icon.textContent = theme === DARK ? 'light_mode' : 'dark_mode';
            }
            btn.setAttribute('aria-label', theme === DARK ? 'Switch to light mode' : 'Switch to dark mode');
        });
    }

    // Toggle between themes and persist
    window.pistaToggleTheme = function () {
        const current = document.documentElement.getAttribute('data-theme') || LIGHT;
        const next = current === DARK ? LIGHT : DARK;
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
    };

    // Read saved preference (or system preference as fallback)
    function getInitialTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === DARK || saved === LIGHT) return saved;
        // Respect OS preference if no stored choice
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return DARK;
        }
        return LIGHT;
    }

    // Flash of Unstyled Content (FOUC) prevention: apply synchronously before first paint
    // This block runs immediately when the script is parsed in <head>.
    const initialTheme = getInitialTheme();
    document.documentElement.setAttribute('data-theme', initialTheme);

    // After DOM is ready: swap logos and set toggle icon states
    // We use DOMContentLoaded because logo <img> elements don't exist yet at
    // script parse time. The data-theme attribute is already set above (no FOUC).
    document.addEventListener('DOMContentLoaded', function () {
        const theme = document.documentElement.getAttribute('data-theme') || LIGHT;
        applyTheme(theme);

        // Wire up any toggle buttons in this page
        document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
            btn.addEventListener('click', window.pistaToggleTheme);
        });
    });
})();