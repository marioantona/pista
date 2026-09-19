// i18n.js - The Translation Dictionary

window.translations = {
    en: {
        // Index / Langing Page
        "index-title": "Welcome to PISTA",
        "index-subtitle": "Discover flights, optimized routes, avoid unwanted countries, and build better itineraries with PISTA.",
        "btn-login-signup": "Login / Sign Up",
        "btn-guest": "Continue as Guest",
        "btn-help": "Help & Support",
        "cookie-title": "We use cookies",
        "cookie-desc": "PISTA uses cookies to improve your experience and remember preferences.",
        "btn-accept-all": "Accept All",
        "btn-reject-all": "Reject All",

        // Auth Pages (Login / Signup / Forgot Password)
        "auth-subtitle": "Passenger Itinerary Self Ticketing Algorithm",
        "tab-login": "Login",
        "tab-signup": "Sign Up",
        "email-label": "Email",
        "password-label": "Password",
        "remember-me": "Remember Me",
        "btn-login": "Login",
        "forgot-pass-link": "Forgot Password?",
        "fullname-label": "Full Name",
        "confirm-pass-label": "Confirm Password",
        "btn-create-acct": "Create Account",
        "reset-msg": "Enter your email",
        "btn-next": "Next",
        "new-pass-msg": "Enter your new password",
        "btn-reset-pass": "Reset Password",

        // Help Page
        "help-title": "Help & Support",
        "help-subtitle": "Find answers to frequently asked questions about PISTA",
        "search-help-label": "Search for help",
        "faq-sect-1": "Getting Started",
        "faq-sect-2": "Booking Flights",
        "faq-sect-3": "Managing Bookings",
        "faq-sect-4": "Account & Security",

        // Navigation
        "nav-flights": "Flights",
        "nav-itineraries": "Itineraries",
        "nav-back": "Back",
        "nav-account": "My Account",
        "nav-details": "Personal Details",
        "nav-security": "Privacy & Security",
        "nav-unit": "Unit & Currency",
        "nav-toggle-theme": "Toggle Theme",

        // Main Search Page
        "search-header": "Search Flight",
        "advanced-options-toggle": "Advanced Options",
        "start-dest-label": "Start / End Destination*",
        "desired-dest-label": "Desired Destinations",
        "avoid-countries-label": "Avoid Countries",
        "travel-region-label": "Travel Region",
        "num-dest-label": "Destinations*",
        "days-per-dest-label": "Days / Leg*",
        "date-label": "Date*",
        "adult-label": "Adult",
        "child-label": "Child",
        "avoid-origin-label": "Avoid Origin Country",
        "search-btn": "Search",
        "step2-header": "Best Matches",
        "step2-btn": "Book Itinerary",
        "step3-header": "Confirmation",
        "step3-btn": "Confirm",
        "step4-header": "Redirecting",
        "step4-msg1": "Thank you for booking with us today!",
        "step4-msg2": "You will be redirected in 3s...",
        "step4-msg3": "Not Redirected? Click here.",

        // Account Page
        "account-next-header": "What to do next?",
        "explore-headline": "Explore",
        "explore-subline": "A new destination is waiting for you.",
        "visa-headline": "Visa Check",
        "visa-subline": "Check if you need a visa.",
        "man-headline": "Manchester Airport (MAN)",
        "man-subline": "Hear from the airport",
        "btn-explore": "Explore",
        "btn-check": "Check",
        "btn-go": "Go",
        "btn-faq": "FAQ",
        "btn-logout": "Log Out",

        "greet-morning": "Good morning",
        "greet-afternoon": "Good afternoon",
        "greet-evening": "Good evening",
        "greet-guest": "Traveler",

        "saved-trips-header": "Saved Itineraries",
        "saved-trips-desc": "Review and manage your upcoming trips.",
        "no-trips-title": "No saved trips yet",
        "no-trips-desc": "Head over to the search page to start planning your next adventure.",

        "details-header": "Personal Details",
        "first-name-label": "First Name",
        "middle-name-label": "Middle Name",
        "last-name-label": "Last Name",
        "dob-label": "Date of Birth",
        "lang-label": "Language",
        "btn-update-profile": "Update Profile",

        "security-header": "Privacy & Security",
        "acct-mgmt-header": "Account Management",
        "acct-mgmt-desc": "Deleting your account will permanently remove all your data, including travel history and preferences. This action cannot be undone.",
        "btn-delete-acct": "Delete Account",

        "unit-header": "Unit & Currency",
        "region-label": "Region",
        "dist-unit-label": "Distance Unit",
        "currency-label": "Currency",
        "btn-save-prefs": "Save Preferences",

        // JavaScript Dynamic Strings (index.js & account.js)
        "js-fill-fields": "Please fill in all required fields (marked with *) before searching.",
        "js-past-date": "Start date cannot be in the past.",
        "js-validating": "Validating arguments...",
        "js-invalid-origin": "Origin Airport Code was not found in our database. Please use a valid 3-letter IATA code.",
        "js-invalid-dest": "Desired Destination Code was not found. Please use valid 3-letter IATA codes.",
        "js-searching": "Searching for the best routes",
        "js-quota-verifying": "Verifying Quota...",
        "js-quota-error": "Error verifying account status. Please try again.",
        "js-no-routes": "No Routes Found matching your criteria.",
        "js-select-flight": "Please select a flight before proceeding.",
        "js-delete-confirm": "Are you sure you want to delete this trip?",
        "js-bad-destinations": "Destinations must be a whole number from 1 to 10.",
        "js-bad-days": "Days per leg must be a whole number from 1 to 20.",
        "js-bad-passengers": "Passengers: 1–9 adults and 0–8 children, with no more than 9 in total.",
        "js-too-many-includes": "You cannot have more desired destinations than destinations.",
        "credit-cost-unknown": "Pricing this search…",
        "js-oauth-failed": "Sign-in failed. Please try again, or sign in with your email and password.",
        "credit-cost": "This search costs {credits} credits",
        "credit-balance": "you have {remaining}",
        "credit-explainer-title": "How credits work",
        "js-past-horizon": "The last flight would be more than {days} days away. Airlines have not released those flights yet, so try an earlier start date, fewer destinations or shorter legs.",
        "credit-explainer-body": "Every search asks a flight data provider for live prices, which is what a credit pays for. A basic search costs 2 credits, and checking the price of a saved trip costs 1. Searches with more destinations, or with destinations you insist on visiting, have to check far more routes, so they cost more — the price is always shown above before you search. Registered accounts get 10 credits a month, which reset on the 1st.",
    },
    es: {
        // Index / Landing Page
        "index-title": "Bienvenido a PISTA",
        "index-subtitle": "Descubre vuelos, rutas optimizadas, evita países no deseados y construye mejores itinerarios con PISTA.",
        "btn-login-signup": "Iniciar sesión / Registrarse",
        "btn-guest": "Continuar como invitado",
        "btn-help": "Ayuda y Soporte",
        "cookie-title": "Usamos cookies",
        "cookie-desc": "PISTA usa cookies para mejorar tu experiencia y recordar tus preferencias.",
        "btn-accept-all": "Aceptar todo",
        "btn-reject-all": "Rechazar todo",

        // Auth Pages
        "auth-subtitle": "Algoritmo de Autogestión de Itinerarios de Pasajeros",
        "tab-login": "Entrar",
        "tab-signup": "Registro",
        "email-label": "Correo electrónico",
        "password-label": "Contraseña",
        "remember-me": "Recuérdame",
        "btn-login": "Iniciar sesión",
        "forgot-pass-link": "¿Olvidaste tu contraseña?",
        "fullname-label": "Nombre completo",
        "confirm-pass-label": "Confirmar contraseña",
        "btn-create-acct": "Crear cuenta",
        "reset-msg": "Introduce tu correo",
        "btn-next": "Siguiente",
        "new-pass-msg": "Introduce tu nueva contraseña",
        "btn-reset-pass": "Restablecer contraseña",

        // Help Page
        "help-title": "Ayuda y Soporte",
        "help-subtitle": "Encuentra respuestas a preguntas frecuentes sobre PISTA",
        "search-help-label": "Buscar ayuda",
        "faq-sect-1": "Empezando",
        "faq-sect-2": "Reserva de vuelos",
        "faq-sect-3": "Gestión de reservas",
        "faq-sect-4": "Cuenta y Seguridad",

        // Navigation
        "nav-flights": "Vuelos",
        "nav-itineraries": "Itinerarios",
        "nav-back": "Atrás",
        "nav-account": "Mi Cuenta",
        "nav-details": "Detalles Personales",
        "nav-security": "Privacidad y Seguridad",
        "nav-unit": "Unidad y Moneda",
        "nav-toggle-theme": "Cambiar tema",

        // Main Search Page
        "search-header": "Buscar Vuelo",
        "advanced-options-toggle": "Opciones avanzadas",
        "start-dest-label": "Destino de inicio / final*",
        "desired-dest-label": "Destinos deseados",
        "avoid-countries-label": "Evitar países",
        "travel-region-label": "Región de viaje",
        "num-dest-label": "Destinos*",
        "days-per-dest-label": "Días por destino*",
        "date-label": "Fecha*",
        "adult-label": "Adulto",
        "child-label": "Niño",
        "avoid-origin-label": "Evitar país de origen",
        "search-btn": "Buscar",
        "step2-header": "Mejores Resultados",
        "step2-btn": "Reservar Itinerario",
        "step3-header": "Confirmación",
        "step3-btn": "Confirmar",
        "step4-header": "Redirigiendo",
        "step4-msg1": "¡Gracias por reservar con nosotros hoy!",
        "step4-msg2": "Serás redirigido en 3s...",
        "step4-msg3": "¿No redirigido? Haz clic aquí.",

        // Account Page
        "account-next-header": "¿Qué hacer a continuación?",
        "explore-headline": "Explorar",
        "explore-subline": "Un nuevo destino te espera.",
        "visa-headline": "Verificación de Visa",
        "visa-subline": "Comprueba si necesitas visa.",
        "man-headline": "Aeropuerto de Manchester (MAN)",
        "man-subline": "Noticias del aeropuerto",
        "btn-explore": "Explorar",
        "btn-check": "Comprobar",
        "btn-go": "Ir",
        "btn-faq": "Preguntas Frecuentes",
        "btn-logout": "Cerrar Sesión",

        "greet-morning": "Buenos días",
        "greet-afternoon": "Buenas tardes",
        "greet-evening": "Buenas noches",
        "greet-guest": "Viajero",

        "saved-trips-header": "Itinerarios Guardados",
        "saved-trips-desc": "Revisa y gestiona tus próximos viajes.",
        "no-trips-title": "Aún no hay viajes guardados",
        "no-trips-desc": "Dirígete a la página de búsqueda para empezar a planear tu próxima aventura.",

        "details-header": "Detalles Personales",
        "first-name-label": "Nombre",
        "middle-name-label": "Segundo Nombre",
        "last-name-label": "Apellido",
        "dob-label": "Fecha de Nacimiento",
        "lang-label": "Idioma",
        "btn-update-profile": "Actualizar Perfil",

        "security-header": "Privacidad y Seguridad",
        "acct-mgmt-header": "Gestión de Cuenta",
        "acct-mgmt-desc": "Eliminar tu cuenta borrará permanentemente todos tus datos, incluyendo historial de viajes y preferencias. Esta acción no se puede deshacer.",
        "btn-delete-acct": "Eliminar Cuenta",

        "unit-header": "Unidad y Moneda",
        "region-label": "Región",
        "dist-unit-label": "Unidad de Distancia",
        "currency-label": "Moneda",
        "btn-save-prefs": "Guardar Preferencias",

        // JavaScript Dynamic Strings
        "js-fill-fields": "Por favor, completa todos los campos obligatorios (*) antes de buscar.",
        "js-past-date": "La fecha de inicio no puede ser en el pasado.",
        "js-validating": "Validando argumentos...",
        "js-invalid-origin": "El código de aeropuerto de origen no se encontró. Usa un código IATA válido de 3 letras.",
        "js-invalid-dest": "El código de destino deseado no se encontró. Usa códigos IATA válidos.",
        "js-searching": "Buscando las mejores rutas",
        "js-quota-verifying": "Verificando cuota...",
        "js-quota-error": "Error al verificar el estado de la cuenta. Inténtalo de nuevo.",
        "js-no-routes": "No se encontraron rutas que coincidan con tus criterios.",
        "js-select-flight": "Por favor, selecciona un vuelo antes de continuar.",
        "js-delete-confirm": "¿Estás seguro de que quieres eliminar este viaje?",
        "js-bad-destinations": "El número de destinos debe ser un número entero entre 1 y 10.",
        "js-bad-days": "Los días por destino deben ser un número entero entre 1 y 20.",
        "js-bad-passengers": "Pasajeros: de 1 a 9 adultos y de 0 a 8 niños, con un máximo de 9 en total.",
        "js-too-many-includes": "No puedes tener más destinos deseados que destinos.",
        "credit-cost-unknown": "Calculando el coste…",
        "js-oauth-failed": "No se ha podido iniciar sesión. Inténtalo de nuevo o entra con tu correo y contraseña.",
        "credit-cost": "Esta búsqueda cuesta {credits} créditos",
        "credit-balance": "tienes {remaining}",
        "credit-explainer-title": "Cómo funcionan los créditos",
        "js-past-horizon": "El último vuelo sería dentro de más de {days} días. Las aerolíneas aún no han publicado esos vuelos: prueba con una fecha anterior, menos destinos o etapas más cortas.",
        "credit-explainer-body": "Cada búsqueda consulta precios en directo a un proveedor de datos de vuelos, y eso es lo que paga un crédito. Una búsqueda básica cuesta 2 créditos y comprobar el precio de un viaje guardado cuesta 1. Las búsquedas con más destinos, o con destinos que quieres visitar sí o sí, tienen que revisar muchas más rutas, así que cuestan más: el precio siempre aparece arriba antes de buscar. Las cuentas registradas reciben 10 créditos al mes, que se renuevan el día 1."
    },
    ca: {
        // Index / Landing Page
        "index-title": "Benvingut a PISTA",
        "index-subtitle": "Descobreix vols, rutes optimitzades, evita països no desitjats i construeix millors itineraris amb PISTA.",
        "btn-login-signup": "Iniciar sessió / Registrar-se",
        "btn-guest": "Continuar com a convidat",
        "btn-help": "Ajuda i Suport",
        "cookie-title": "Utilitzem cookies",
        "cookie-desc": "PISTA utilitza cookies per millorar la teva experiència i recordar les teves preferències.",
        "btn-accept-all": "Acceptar tot",
        "btn-reject-all": "Rebutjar tot",

        // Auth Pages
        "auth-subtitle": "Algorisme d'Autogestió d'Itineraris de Passatgers",
        "tab-login": "Entrar",
        "tab-signup": "Registre",
        "email-label": "Correu electrònic",
        "password-label": "Contrasenya",
        "remember-me": "Recorda'm",
        "btn-login": "Iniciar sessió",
        "forgot-pass-link": "Has oblidat la contrasenya?",
        "fullname-label": "Nom complet",
        "confirm-pass-label": "Confirmar contrasenya",
        "btn-create-acct": "Crear compte",
        "reset-msg": "Introdueix el teu correu",
        "btn-next": "Següent",
        "new-pass-msg": "Introdueix la teva nova contrasenya",
        "btn-reset-pass": "Restablir contrasenya",

        // Help Page
        "help-title": "Ajuda i Suport",
        "help-subtitle": "Troba respostes a preguntes freqüents sobre PISTA",
        "search-help-label": "Cercar ajuda",
        "faq-sect-1": "Començant",
        "faq-sect-2": "Reserva de vols",
        "faq-sect-3": "Gestió de reserves",
        "faq-sect-4": "Compte i Seguretat",

        // Navigation
        "nav-flights": "Vols",
        "nav-itineraries": "Itineraris",
        "nav-back": "Enrere",
        "nav-account": "El Meu Compte",
        "nav-details": "Detalls Personals",
        "nav-security": "Privacitat i Seguretat",
        "nav-unit": "Unitat i Moneda",
        "nav-toggle-theme": "Canviar tema",

        // Main Search Page
        "search-header": "Cercar Vol",
        "advanced-options-toggle": "Opcions avançades",
        "start-dest-label": "Destinació d'inici / final*",
        "desired-dest-label": "Destinacions desitjades",
        "avoid-countries-label": "Evitar països",
        "travel-region-label": "Regió de viatge",
        "num-dest-label": "Destinacions*",
        "days-per-dest-label": "Dies per destinació*",
        "date-label": "Data*",
        "adult-label": "Adult",
        "child-label": "Nen",
        "avoid-origin-label": "Evitar país d'origen",
        "search-btn": "Cerca",
        "step2-header": "Millors Resultats",
        "step2-btn": "Reservar Itinerari",
        "step3-header": "Confirmació",
        "step3-btn": "Confirmar",
        "step4-header": "Redirigint",
        "step4-msg1": "Gràcies per reservar amb nosaltres avui!",
        "step4-msg2": "Seràs redirigit en 3s...",
        "step4-msg3": "No redirigit? Fes clic aquí.",

        // Account Page
        "account-next-header": "Què fer a continuació?",
        "explore-headline": "Explorar",
        "explore-subline": "Una nova destinació t'espera.",
        "visa-headline": "Verificació de Visa",
        "visa-subline": "Comprova si necessites visa.",
        "man-headline": "Aeroport de Manchester (MAN)",
        "man-subline": "Notícies de l'aeroport",
        "btn-explore": "Explorar",
        "btn-check": "Comprovar",
        "btn-go": "Anar",
        "btn-faq": "Preguntes Freqüents",
        "btn-logout": "Tancar Sessió",

        "greet-morning": "Bon dia",
        "greet-afternoon": "Bona tarda",
        "greet-evening": "Bona nit",
        "greet-guest": "Viatger",

        "saved-trips-header": "Itineraris Desats",
        "saved-trips-desc": "Revisa i gestiona els teus propers viatges.",
        "no-trips-title": "Encara no hi ha viatges desats",
        "no-trips-desc": "Dirigeix-te a la pàgina de cerca per començar a planejar la teva propera aventura.",

        "details-header": "Detalls Personals",
        "first-name-label": "Nom",
        "middle-name-label": "Segon Nom",
        "last-name-label": "Cognom",
        "dob-label": "Data de Naixement",
        "lang-label": "Idioma",
        "btn-update-profile": "Actualitzar Perfil",

        "security-header": "Privacitat i Seguretat",
        "acct-mgmt-header": "Gestió de Compte",
        "acct-mgmt-desc": "Eliminar el teu compte esborrarà permanentment totes les teves dades, incloent-hi l'historial de viatges i les preferències. Aquesta acció no es pot desfer.",
        "btn-delete-acct": "Eliminar Compte",

        "unit-header": "Unitat i Moneda",
        "region-label": "Regió",
        "dist-unit-label": "Unitat de Distància",
        "currency-label": "Moneda",
        "btn-save-prefs": "Desar Preferències",

        // JavaScript Dynamic Strings
        "js-fill-fields": "Si us plau, completa tots els camps obligatoris (*) abans de cercar.",
        "js-past-date": "La data d'inici no pot ser en el passat.",
        "js-validating": "Validant arguments...",
        "js-invalid-origin": "El codi d'aeroport d'origen no s'ha trobat. Utilitza un codi IATA vàlid.",
        "js-invalid-dest": "El codi de destinació no s'ha trobat. Utilitza codis IATA vàlids.",
        "js-searching": "Buscant les millors rutes",
        "js-quota-verifying": "Verificant quota...",
        "js-quota-error": "Error al verificar l'estat del compte. Torna-ho a provar.",
        "js-no-routes": "No s'han trobat rutes que coincideixin amb els teus criteris.",
        "js-select-flight": "Si us plau, selecciona un vol abans de continuar.",
        "js-delete-confirm": "Estàs segur que vols eliminar aquest viatge?",
        "js-bad-destinations": "El nombre de destinacions ha de ser un nombre enter entre 1 i 10.",
        "js-bad-days": "Els dies per destinació han de ser un nombre enter entre 1 i 20.",
        "js-bad-passengers": "Passatgers: d'1 a 9 adults i de 0 a 8 nens, amb un màxim de 9 en total.",
        "js-too-many-includes": "No pots tenir més destinacions desitjades que destinacions.",
        "credit-cost-unknown": "Calculant el cost…",
        "js-oauth-failed": "No s'ha pogut iniciar la sessió. Torna-ho a provar o entra amb el teu correu i contrasenya.",
        "credit-cost": "Aquesta cerca costa {credits} crèdits",
        "credit-balance": "tens {remaining}",
        "credit-explainer-title": "Com funcionen els crèdits",
        "js-past-horizon": "L'últim vol seria d'aquí a més de {days} dies. Les aerolínies encara no han publicat aquests vols: prova una data anterior, menys destinacions o etapes més curtes.",
        "credit-explainer-body": "Cada cerca consulta preus en directe a un proveïdor de dades de vols, i això és el que paga un crèdit. Una cerca bàsica costa 2 crèdits i comprovar el preu d'un viatge desat en costa 1. Les cerques amb més destinacions, o amb destinacions que vols visitar sí o sí, han de revisar moltes més rutes, així que costen més: el preu sempre es mostra a dalt abans de cercar. Els comptes registrats reben 10 crèdits al mes, que es renoven l'1."
    }
};

// Helper function to read a cookie
function getI18nCookie(name) {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=');
        if (key === name) return decodeURIComponent(value);
    }
    return null;
}

// 1. Determine the language
window.currentLang = 'en'; // Default

// Check if they have a saved language in their account preferences
const savedLang = getI18nCookie('lang');

if (savedLang && window.translations[savedLang]) {
    window.currentLang = savedLang;
} else {
    // If no account preference, check their browser's native language!
    const browserLang = navigator.language.slice(0, 2).toLowerCase(); // Turns "es-ES" into "es"
    if (window.translations[browserLang]) {
        window.currentLang = browserLang;
    }
}

// 2. The Translator Function
function translatePage() {
    // Find every HTML element that has a 'data-i18n' attribute
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (window.translations[window.currentLang] && window.translations[window.currentLang][key]) {
            // Check if it's Material Web Text Field or Select
            if (el.tagName.toLowerCase() === 'md-outlined-text-field' || 
                el.tagName.toLowerCase() === 'md-filled-text-field' || 
                el.tagName.toLowerCase().includes('md-outlined-select')) {
                el.setAttribute('label', window.translations[window.currentLang][key]);
            }   //check if it's a label el. attached to a checkbox / radio
            else if (el.tagName.toLocaleLowerCase() === 'label') {
                el.innerText = window.translations[window.currentLang][key]
            }   // For standard elements / buttons, we update the inner text
            else {
                // If it's a button with an icon, we only want to change the text node, not the SVG
                if (el.childNodes.length > 1) {
                    // This finds the text node inside the button and updates it
                    for (let node of el.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== '') {
                            node.nodeValue = window.translations[window.currentLang][key];
                            break;
                        }
                    }
                } else {
                    el.innerText = window.translations[window.currentLang][key];
                }
            }
        }
    });
}

// Ensure DOM is fully parsed before translating elements injected by scripts or material web
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', translatePage);
} else {
    translatePage();
}