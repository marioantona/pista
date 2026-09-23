// Behaviour shared by the info pages: help.html, privacy.html, terms.html.
// Loaded with `defer` AFTER i18n.js, so window.currentLang is already set and
// the data-i18n strings have already been translated when this runs.

// --- Back ------------------------------------------------------------------
// history.back() only when the visitor came from this site. Someone arriving
// from a search result or a link preview has nothing on this site to go back
// to -- back() would take them off it, or do nothing at all.
;(function () {
    const back = document.getElementById("back-btn")
    if (!back) return
    back.addEventListener("click", () => {
        let sameOrigin = false
        try {
            sameOrigin = document.referrer !== "" &&
                new URL(document.referrer).origin === window.location.origin
        } catch (e) { /* malformed referrer: treat as external */ }

        if (sameOrigin && window.history.length > 1) {
            window.history.back()
        } else {
            window.location.href = "index.html"
        }
    })
})()

// --- Legal pages: one <article data-legal-lang> per language ----------------
// The legal text lives in the page rather than in i18n.js: it is long, every
// page downloads i18n.js, and translatePage() writes innerText, which would
// flatten the lists and links. English is the block visible without JS.
;(function () {
    const blocks = document.querySelectorAll("[data-legal-lang]")
    if (blocks.length === 0) return
    const lang = window.currentLang || "en"
    const match = document.querySelector(`[data-legal-lang="${lang}"]`)
    if (!match) return
    blocks.forEach(b => { b.hidden = b !== match })
    document.documentElement.lang = lang
})()

// --- Help: filter the FAQ -----------------------------------------------------
// Hides questions whose text does not match. It does not open matches: the
// items share name="faq", which lets only one be open at a time.
;(function () {
    const input = document.getElementById("search-input")
    if (!input) return
    const empty = document.getElementById("search-empty")

    input.addEventListener("input", () => {
        const term = (input.value || "").trim().toLowerCase()
        let shown = 0

        document.querySelectorAll(".faq-section").forEach(section => {
            let sectionShown = 0
            section.querySelectorAll(".faq-item").forEach(item => {
                const hit = term === "" || item.textContent.toLowerCase().includes(term)
                item.hidden = !hit
                if (hit) sectionShown++
            })
            section.hidden = sectionShown === 0
            shown += sectionShown
        })

        if (empty) empty.hidden = shown > 0
    })
})()
