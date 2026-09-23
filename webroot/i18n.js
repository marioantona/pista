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
        "faq-sect-about": "About PISTA",
        "faq-sect-search": "Planning a trip",
        "faq-sect-credits": "Credits",
        "faq-sect-trips": "Saved trips and booking",
        "faq-sect-account": "Your account",
        "faq-q-what": "What is PISTA?",
        "faq-a-what": "PISTA plans multi-city round trips. Tell it where you start, how many places you want to visit and how long to stay in each, and it searches for the cheapest order to fly them in before bringing you home. It is a free portfolio project, built and run by one independent developer.",
        "faq-q-tickets": "Does PISTA sell tickets or take payment?",
        "faq-a-tickets": "No. PISTA never takes payment and never issues tickets. Each flight in the itinerary you choose links to Aviasales, where you book and pay. PISTA may earn a commission from Aviasales on bookings made through those links, at no extra cost to you.",
        "faq-q-prices": "Where do the prices come from?",
        "faq-a-prices": "From Google Flights, looked up live at the moment you search. Fares change constantly, so the price you see when you book may differ from the one PISTA showed you.",
        "faq-q-how": "How do I plan a trip?",
        "faq-a-how": "Enter the airport you start and finish at, your departure date, how many destinations you want (1 to 10), how many days to spend in each (1 to 20) and who is travelling (up to 9 passengers). You can also pick a travel region. The cost in credits is shown before you search.",
        "faq-q-constraints": "Can I choose places to include or avoid?",
        "faq-a-constraints": "Yes. Under the advanced options you can list desired destinations, which every result will include, and countries to avoid, which no result will visit. You can also avoid the country you start from.",
        "faq-q-horizon": "How far ahead can I search?",
        "faq-a-horizon": "Your last flight must be no more than 330 days away, because airlines have not published fares beyond that. The form tells you if a trip runs past that point.",
        "faq-q-noresults": "Why did my search find no routes?",
        "faq-a-noresults": "Usually because the constraints are too tight: many desired destinations, many countries avoided, or a region with few flights on your dates. Try fewer destinations, another date or a wider region. If the flight data provider itself is not answering, PISTA tells you that instead.",
        "faq-q-credits": "What are credits?",
        "faq-a-credits": "Every search looks up live prices from a paid flight data provider, and credits cover that. A basic search costs 2 credits; bigger searches, or ones with desired destinations, check many more routes and cost up to 10. Checking the price of a saved trip costs 1. The cost is always shown before you search. Credits are free and cannot be bought.",
        "faq-q-allowance": "How many credits do I get?",
        "faq-a-allowance": "Registered accounts get 10 credits a month, topped up on the 1st. Guests get a smaller allowance per internet connection, which also resets every month.",
        "faq-q-refund": "Do I pay for a search that fails?",
        "faq-a-refund": "No. When a search fails, its credits are returned automatically, up to 3 refunds per calendar month.",
        "faq-q-save": "How do I save a trip?",
        "faq-a-save": "Press the heart button on a result. With an account the trip is stored in your account and listed under Itineraries. As a guest it is kept in this browser only, and moved to your account the next time you sign in here.",
        "faq-q-verify": "Can I check whether a saved trip's price has changed?",
        "faq-a-verify": "Yes, with an account. The price check button on a saved trip looks up every flight again for 1 credit, and an arrow shows whether the total went up or down.",
        "faq-q-book": "How do I book, and who handles changes or cancellations?",
        "faq-a-book": "Each flight in the itinerary you choose opens on Aviasales, where you book it. Your booking is with the airline or travel agent you buy from there, so changes, cancellations, refunds and delays are handled by them. PISTA never sees what you booked.",
        "faq-q-signin": "How do I sign in?",
        "faq-a-signin": "With an email address and password, or with a Google or Microsoft account. You can also continue as a guest without signing in.",
        "faq-q-remember": "What does Remember Me do?",
        "faq-a-remember": "It keeps you signed in on this device for as long as you come back at least once every 30 days. Without it you are signed out after 30 minutes of inactivity, even if your browser restores its tabs.",
        "faq-q-reset": "How do I reset my password?",
        "faq-a-reset": "Choose Forgot Password? in the sign-in window and enter your email address. If it belongs to an account, you will receive a link that works once and expires after 30 minutes. Resetting your password signs you out on every other device.",
        "faq-q-delete": "How do I delete my account?",
        "faq-a-delete": "Open My Account, go to Privacy & Security and choose Delete Account. You confirm with your password, or by signing in again with Google or Microsoft. Deletion is immediate and permanent, and removes your saved trips.",
        "faq-q-settings": "Can I change the language, currency or theme?",
        "faq-a-settings": "With an account, choose your language under My Account, and your currency and search region under Unit & Currency. Guests get their browser's language and the default currency. The theme button switches between light and dark mode.",
        "search-no-results": "No questions match your search.",
        "contact-title": "Still need help?",
        "contact-body": "Email us and we will get back to you.",
        "contact-email-btn": "Email support",
        "link-privacy": "Privacy Policy",
        "link-terms": "Terms of Use",

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
        "faq-sect-about": "Sobre PISTA",
        "faq-sect-search": "Planificar un viaje",
        "faq-sect-credits": "Créditos",
        "faq-sect-trips": "Viajes guardados y reservas",
        "faq-sect-account": "Tu cuenta",
        "faq-q-what": "¿Qué es PISTA?",
        "faq-a-what": "PISTA planifica viajes de ida y vuelta por varias ciudades. Indica desde dónde sales, cuántos lugares quieres visitar y cuánto tiempo quieres pasar en cada uno, y busca el orden más barato para recorrerlos antes de volver a casa. Es un proyecto de portfolio gratuito, creado y mantenido por un desarrollador independiente.",
        "faq-q-tickets": "¿PISTA vende billetes o acepta pagos?",
        "faq-a-tickets": "No. PISTA nunca cobra ni emite billetes. Cada vuelo del itinerario que elijas enlaza con Aviasales, donde reservas y pagas. PISTA puede recibir una comisión de Aviasales por las reservas hechas a través de esos enlaces, sin ningún coste adicional para ti.",
        "faq-q-prices": "¿De dónde salen los precios?",
        "faq-a-prices": "De Google Flights, consultados en directo en el momento de la búsqueda. Las tarifas cambian constantemente, así que el precio al reservar puede ser distinto del que te mostró PISTA.",
        "faq-q-how": "¿Cómo planifico un viaje?",
        "faq-a-how": "Indica el aeropuerto de salida y llegada, la fecha de salida, cuántos destinos quieres (de 1 a 10), cuántos días pasar en cada uno (de 1 a 20) y quién viaja (hasta 9 pasajeros). También puedes elegir una región de viaje. El coste en créditos se muestra antes de buscar.",
        "faq-q-constraints": "¿Puedo elegir lugares que incluir o evitar?",
        "faq-a-constraints": "Sí. En las opciones avanzadas puedes indicar destinos deseados, que aparecerán en todos los resultados, y países a evitar, que ningún resultado visitará. También puedes evitar el país desde el que sales.",
        "faq-q-horizon": "¿Con cuánta antelación puedo buscar?",
        "faq-a-horizon": "Tu último vuelo no puede ser dentro de más de 330 días, porque las aerolíneas aún no han publicado tarifas más allá. El formulario te avisa si un viaje supera ese límite.",
        "faq-q-noresults": "¿Por qué mi búsqueda no encontró rutas?",
        "faq-a-noresults": "Normalmente porque las condiciones son demasiado estrictas: muchos destinos deseados, muchos países evitados o una región con pocos vuelos en tus fechas. Prueba con menos destinos, otra fecha o una región más amplia. Si lo que falla es el proveedor de datos de vuelos, PISTA te lo indica.",
        "faq-q-credits": "¿Qué son los créditos?",
        "faq-a-credits": "Cada búsqueda consulta precios en directo a un proveedor de datos de vuelos de pago, y los créditos cubren ese coste. Una búsqueda básica cuesta 2 créditos; las búsquedas más grandes, o con destinos deseados, revisan muchas más rutas y cuestan hasta 10. Comprobar el precio de un viaje guardado cuesta 1. El coste siempre se muestra antes de buscar. Los créditos son gratuitos y no se pueden comprar.",
        "faq-q-allowance": "¿Cuántos créditos recibo?",
        "faq-a-allowance": "Las cuentas registradas reciben 10 créditos al mes, que se renuevan el día 1. Los invitados reciben una cantidad menor por conexión a internet, que también se renueva cada mes.",
        "faq-q-refund": "¿Pago por una búsqueda que falla?",
        "faq-a-refund": "No. Cuando una búsqueda falla, sus créditos se devuelven automáticamente, hasta 3 devoluciones por mes natural.",
        "faq-q-save": "¿Cómo guardo un viaje?",
        "faq-a-save": "Pulsa el botón del corazón en un resultado. Con una cuenta, el viaje se guarda en tu cuenta y aparece en Itinerarios. Como invitado se guarda solo en este navegador, y pasa a tu cuenta la próxima vez que inicies sesión aquí.",
        "faq-q-verify": "¿Puedo comprobar si ha cambiado el precio de un viaje guardado?",
        "faq-a-verify": "Sí, con una cuenta. El botón de comprobar precio de un viaje guardado vuelve a consultar cada vuelo por 1 crédito, y una flecha indica si el total ha subido o bajado.",
        "faq-q-book": "¿Cómo reservo, y quién gestiona cambios o cancelaciones?",
        "faq-a-book": "Cada vuelo del itinerario que elijas se abre en Aviasales, donde lo reservas. Tu reserva es con la aerolínea o la agencia a la que compres allí, así que los cambios, cancelaciones, reembolsos y retrasos los gestionan ellos. PISTA nunca ve lo que has reservado.",
        "faq-q-signin": "¿Cómo inicio sesión?",
        "faq-a-signin": "Con un correo electrónico y una contraseña, o con una cuenta de Google o Microsoft. También puedes continuar como invitado sin iniciar sesión.",
        "faq-q-remember": "¿Qué hace Recuérdame?",
        "faq-a-remember": "Mantiene tu sesión abierta en este dispositivo mientras vuelvas al menos una vez cada 30 días. Sin esta opción, la sesión se cierra tras 30 minutos de inactividad, aunque el navegador restaure sus pestañas.",
        "faq-q-reset": "¿Cómo restablezco mi contraseña?",
        "faq-a-reset": "Elige ¿Olvidaste tu contraseña? en la ventana de inicio de sesión e introduce tu correo. Si pertenece a una cuenta, recibirás un enlace que solo funciona una vez y caduca a los 30 minutos. Restablecer la contraseña cierra tu sesión en todos los demás dispositivos.",
        "faq-q-delete": "¿Cómo elimino mi cuenta?",
        "faq-a-delete": "Abre Mi Cuenta, ve a Privacidad y Seguridad y elige Eliminar Cuenta. Lo confirmas con tu contraseña, o volviendo a iniciar sesión con Google o Microsoft. La eliminación es inmediata y permanente, y borra tus viajes guardados.",
        "faq-q-settings": "¿Puedo cambiar el idioma, la moneda o el tema?",
        "faq-a-settings": "Con una cuenta, elige tu idioma en Mi Cuenta, y tu moneda y región de búsqueda en Unidad y Moneda. Los invitados usan el idioma de su navegador y la moneda por defecto. El botón de tema cambia entre modo claro y oscuro.",
        "search-no-results": "Ninguna pregunta coincide con tu búsqueda.",
        "contact-title": "¿Necesitas más ayuda?",
        "contact-body": "Escríbenos y te responderemos.",
        "contact-email-btn": "Escribir a soporte",
        "link-privacy": "Política de privacidad",
        "link-terms": "Condiciones de uso",

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
        "faq-sect-about": "Sobre PISTA",
        "faq-sect-search": "Planificar un viatge",
        "faq-sect-credits": "Crèdits",
        "faq-sect-trips": "Viatges desats i reserves",
        "faq-sect-account": "El teu compte",
        "faq-q-what": "Què és PISTA?",
        "faq-a-what": "PISTA planifica viatges d'anada i tornada per diverses ciutats. Indica d'on surts, quants llocs vols visitar i quant de temps vols passar a cadascun, i cerca l'ordre més barat per recórrer-los abans de tornar a casa. És un projecte de portfoli gratuït, creat i mantingut per un desenvolupador independent.",
        "faq-q-tickets": "PISTA ven bitllets o accepta pagaments?",
        "faq-a-tickets": "No. PISTA mai no cobra ni emet bitllets. Cada vol de l'itinerari que triïs enllaça amb Aviasales, on reserves i pagues. PISTA pot rebre una comissió d'Aviasales per les reserves fetes a través d'aquests enllaços, sense cap cost addicional per a tu.",
        "faq-q-prices": "D'on surten els preus?",
        "faq-a-prices": "De Google Flights, consultats en directe en el moment de la cerca. Les tarifes canvien constantment, així que el preu en reservar pot ser diferent del que et va mostrar PISTA.",
        "faq-q-how": "Com planifico un viatge?",
        "faq-a-how": "Indica l'aeroport de sortida i arribada, la data de sortida, quantes destinacions vols (d'1 a 10), quants dies passar a cadascuna (d'1 a 20) i qui viatja (fins a 9 passatgers). També pots triar una regió de viatge. El cost en crèdits es mostra abans de cercar.",
        "faq-q-constraints": "Puc triar llocs per incloure o evitar?",
        "faq-a-constraints": "Sí. A les opcions avançades pots indicar destinacions desitjades, que apareixeran a tots els resultats, i països a evitar, que cap resultat no visitarà. També pots evitar el país des del qual surts.",
        "faq-q-horizon": "Amb quanta antelació puc cercar?",
        "faq-a-horizon": "El teu últim vol no pot ser d'aquí a més de 330 dies, perquè les aerolínies encara no han publicat tarifes més enllà. El formulari t'avisa si un viatge supera aquest límit.",
        "faq-q-noresults": "Per què la meva cerca no ha trobat rutes?",
        "faq-a-noresults": "Normalment perquè les condicions són massa estrictes: moltes destinacions desitjades, molts països evitats o una regió amb pocs vols en les teves dates. Prova amb menys destinacions, una altra data o una regió més àmplia. Si el que falla és el proveïdor de dades de vols, PISTA t'ho indica.",
        "faq-q-credits": "Què són els crèdits?",
        "faq-a-credits": "Cada cerca consulta preus en directe a un proveïdor de dades de vols de pagament, i els crèdits cobreixen aquest cost. Una cerca bàsica costa 2 crèdits; les cerques més grans, o amb destinacions desitjades, revisen moltes més rutes i costen fins a 10. Comprovar el preu d'un viatge desat costa 1. El cost sempre es mostra abans de cercar. Els crèdits són gratuïts i no es poden comprar.",
        "faq-q-allowance": "Quants crèdits rebo?",
        "faq-a-allowance": "Els comptes registrats reben 10 crèdits al mes, que es renoven l'1. Els convidats reben una quantitat menor per connexió a internet, que també es renova cada mes.",
        "faq-q-refund": "Pago per una cerca que falla?",
        "faq-a-refund": "No. Quan una cerca falla, els seus crèdits es retornen automàticament, fins a 3 devolucions per mes natural.",
        "faq-q-save": "Com deso un viatge?",
        "faq-a-save": "Prem el botó del cor en un resultat. Amb un compte, el viatge es desa al teu compte i apareix a Itineraris. Com a convidat es desa només en aquest navegador, i passa al teu compte la propera vegada que hi iniciïs sessió.",
        "faq-q-verify": "Puc comprovar si ha canviat el preu d'un viatge desat?",
        "faq-a-verify": "Sí, amb un compte. El botó de comprovar el preu d'un viatge desat torna a consultar cada vol per 1 crèdit, i una fletxa indica si el total ha pujat o baixat.",
        "faq-q-book": "Com reservo, i qui gestiona canvis o cancel·lacions?",
        "faq-a-book": "Cada vol de l'itinerari que triïs s'obre a Aviasales, on el reserves. La teva reserva és amb l'aerolínia o l'agència a qui compris allà, així que els canvis, cancel·lacions, reemborsaments i retards els gestionen ells. PISTA mai no veu el que has reservat.",
        "faq-q-signin": "Com inicio sessió?",
        "faq-a-signin": "Amb un correu electrònic i una contrasenya, o amb un compte de Google o Microsoft. També pots continuar com a convidat sense iniciar sessió.",
        "faq-q-remember": "Què fa Recorda'm?",
        "faq-a-remember": "Manté la sessió oberta en aquest dispositiu mentre hi tornis almenys una vegada cada 30 dies. Sense aquesta opció, la sessió es tanca després de 30 minuts d'inactivitat, encara que el navegador restauri les pestanyes.",
        "faq-q-reset": "Com restableixo la contrasenya?",
        "faq-a-reset": "Tria Has oblidat la contrasenya? a la finestra d'inici de sessió i introdueix el teu correu. Si pertany a un compte, rebràs un enllaç que només funciona una vegada i caduca als 30 minuts. Restablir la contrasenya tanca la sessió a tots els altres dispositius.",
        "faq-q-delete": "Com elimino el meu compte?",
        "faq-a-delete": "Obre El Meu Compte, ves a Privacitat i Seguretat i tria Eliminar Compte. Ho confirmes amb la contrasenya, o tornant a iniciar sessió amb Google o Microsoft. L'eliminació és immediata i permanent, i esborra els teus viatges desats.",
        "faq-q-settings": "Puc canviar l'idioma, la moneda o el tema?",
        "faq-a-settings": "Amb un compte, tria l'idioma a El Meu Compte, i la moneda i la regió de cerca a Unitat i Moneda. Els convidats fan servir l'idioma del navegador i la moneda per defecte. El botó de tema canvia entre el mode clar i el fosc.",
        "search-no-results": "Cap pregunta no coincideix amb la teva cerca.",
        "contact-title": "Necessites més ajuda?",
        "contact-body": "Escriu-nos i et respondrem.",
        "contact-email-btn": "Escriure al suport",
        "link-privacy": "Política de privacitat",
        "link-terms": "Condicions d'ús",

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