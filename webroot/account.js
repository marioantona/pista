import { safeUrl } from "./escape.js?v=20260922a"

//helper function to read cookies
function getCookie(name) {
    const cookies = document.cookie.split('; ')
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=')
        if (key === name) return decodeURIComponent(value)
    }
    return null
}

//load user profile & preferences
async function loadUserProfile() {
    try {
        const res = await fetch('get_profile.php')
        const json = await res.json()

        let firstName = ''

        if (json.success) {
            const details = json.data.details
            const prefs = json.data.preferences
            const picUrl = json.data.profile_picture_url

            //pre-fill personal details
            if (details) {
                document.getElementById('first_name').value = details.first_name || '';
                document.getElementById('middle_name').value = details.middle_name || '';
                document.getElementById('last_name').value = details.last_name || '';
                document.getElementById('date_of_birth').value = details.date_of_birth || '';
                document.getElementById('lang').value = details.lang || 'en';

                firstName = details.first_name
            }

            //pre-fill preferences
            if (prefs) {
                document.getElementById('region-select').value = prefs.region || 'uk';
                document.getElementById('distance-select').value = prefs.unit || 'km';
                document.getElementById('currency-select').value = prefs.currency || 'gbp';
            }

            // Avatar rendering logic
            const avatarContainer = document.querySelector(".avatar-container")
            if (avatarContainer) {
                if (safeUrl(picUrl)) {
                    // OAuth user with a real profile picture. The URL comes from the
                    // provider and lands in a src attribute, so it goes through
                    // safeUrl() -- escaping alone would still admit javascript:.
                    avatarContainer.innerHTML = `<img src="${safeUrl(picUrl)}" alt="Profile picture"
                        style="width:100%; height:100%; object-fit:cover; border-radius:50%;"
                        onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>person</span>'">`
                } else {
                    const userIdCookie = getCookie("user_id")
                    const userId = userIdCookie ? parseInt(userIdCookie) : 0
                    const avatarIndex = userId % 6
                    avatarContainer.innerHTML = `<img src="pictures/avatars/avatar_${avatarIndex}.svg"
                        alt="Avatar"
                        style="width:100%; height:100%; object-fit:cover; border-radius:50%;"
                        onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>person</span>'">`
                }
            }
        }
            
        const greetingEl = document.getElementById('greeting')

        //calc. time of day
        const hour = new Date().getHours()
        const timeOfDay = ( hour < 12) ? 'morning' : ( hour < 18) ? 'afternoon' : 'evening'

        const greetingPrefix = window.translations[window.currentLang][`greet-${timeOfDay}`]

        //fallback - if details table is empty - grap first name from signup cookie
        if (!firstName) {
            const fullNameCookie = getCookie('fullName')
            if (fullNameCookie) {
                firstName = fullNameCookie.split(' ')[0]
            } else {
                firstName = window.translations[window.currentLang]["greet-guest"]
            }
        }

        greetingEl.textContent = `${greetingPrefix}, ${firstName}!`
    } catch (err) {
        console.error("Failed to load profile", err)
    }
 }

document.addEventListener("DOMContentLoaded", loadUserProfile)

// Enter Key Submission Handler
// Fires the correct form's submit button when Enter is pressed inside
document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return

    const tag = e.target.tagName.toLowerCase()
    if (tag !== "md-filled-text-field" && tag !== "md-outlined-text-field" && tag !== "md-outlined-select") return

    // Walk up the DOM to find the containing <form> and click its submit button
    const form = e.target.closest("form")
    if (form) {
        const submitBtn = form.querySelector("md-filled-button[type='submit']")
        if (submitBtn && !submitBtn.disabled) submitBtn.click()
    }
})