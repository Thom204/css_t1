const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

const existent_plan = document.querySelector("#mydashboard")
const new_plan = document.querySelector("#newdashboard")
const expenses = document.querySelector('#expenses')
const logout_b = document.getElementById('logout_btn')
let hasPlan = false

const PRIVILEGED_EMAILS = ["dperezgu@unal.edu.co", "perezdaren008@gmail.com", "thom191104@gmail.com"]

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)

function applyUserTheme(user) {

    if (PRIVILEGED_EMAILS.includes(user.email)) {
        document.body.classList.add("privileged-theme")
    }else{
        document.body.style.backgroundImage = "url('')"
    }
}

existent_plan.onclick = () => {
    if(!hasPlan) {
        alert("Este usuario No tiene un plan activo, puede crear uno con el boton 'Nuevo Plan'")
        return
    }

    window.location.href = "viewer.html"
}

new_plan.onclick = () => {
    window.location.href = "create.html"
}

expenses.onclick = () => {
    if (!hasPlan) {
        alert("Este usuario No tiene un plan activo, puede crear uno con el boton 'Nuevo Plan'")
        return
    }
    
    window.location.href = "expenseAdder.html" 
}

logout_b.onclick = async () => {
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

    applyUserTheme(user)    

    const { data: plan, error } = await sb
        .from('plans')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (error) {
        alert(error.message)
        return
    }

    if (plan) {
        hasPlan = true
        new_plan.innerHTML = "Mi plan"
    }
    else hasPlan=false
}

// Listen for auth changes
sb.auth.onAuthStateChange(() => {
    updateUI()
})

// Initial check
updateUI()