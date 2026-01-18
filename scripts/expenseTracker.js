const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

const existent_plan = document.querySelector("#mydashboard")
const new_plan = document.querySelector("#mydashboard")
const config = document.querySelector('#settings')
const logout_b = document.getElementById('logout_btn')

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)

existent_plan.onclick = () => {
    window.location.href = "viewer.hmtl"
}

new_plan.onclick = () => {
    window.location.href = "create.html"
}

logout_b.onclick = async () => {
    console.log("szs")
    await sb.auth.signOut()
}

async function  updateUI() {
    const { data: { user } } = await sb.auth.getUser()

    if (user) {
        document.querySelector("#username").innerHTML = user.email;
        console.log(user.email)
    } else {
        console.log("nanay")
        window.location.href = "index.html"
    }
}

// Listen for auth changes
sb.auth.onAuthStateChange(() => {
    updateUI()
    console.log(event, session?.user?.email)
})

// Initial check
updateUI()