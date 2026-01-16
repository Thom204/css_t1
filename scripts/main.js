const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

const loginBtn = document.getElementById('login')
const logoutBtn = document.getElementById('logout')
const userText = document.getElementById('user')

// Login
loginBtn.onclick = async () => {
  await sb.auth.signInWithOAuth({
    provider: 'google',
  })
}

// Logout
logoutBtn.onclick = async () => {
  await sb.auth.signOut()
}

// Update UI based on auth state
async function updateUI() {
  const { data: { user } } = await sb.auth.getUser()

  if (user) {
    window.location.href = "neighborhood.html"
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
