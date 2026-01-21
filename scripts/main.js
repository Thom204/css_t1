const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)

const loginBtn = document.getElementById('login')
const inviteBtn = document.getElementById('invite')
const userText = document.getElementById('user')


// Login
loginBtn.onclick = async () => {
    await sb.auth.signInWithOAuth({
        provider: 'google',
        options : {
            redirectTo : "https://thom204.github.io/css_t1/index.html"
        }
    })
}

// Logout
inviteBtn.onclick = async () => {
    return
}

// Update UI based on auth state
async function updateUI() {
    const { data: { user } } = await sb.auth.getUser()

    if (user) {
        console.log(user)
        window.location.href = "app.html"
    } else {
        userText.textContent = ''
        loginBtn.style.display = 'inline'
        logoutBtn.style.display = 'none'
    }
}

// Listen for auth changes
sb.auth.onAuthStateChange(() => {
    updateUI()
    console.log(event, session?.user?.email)
})

// Initial check
updateUI()
