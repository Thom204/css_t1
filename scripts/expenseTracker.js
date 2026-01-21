const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

const existent_plan = document.querySelector("#mydashboard")
const new_plan = document.querySelector("#newdashboard")
const expenses = document.querySelector('#expenses')
const logout_b = document.getElementById('logout_btn')

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)

existent_plan.onclick = () => {
    window.location.href = "viewer.hmtl"
}

new_plan.onclick = async () => {
    const {data: { user }} = await sb.auth.getUser()

    if (!user) {
        alert("Usuario no autenticado")
        return
    }

    const { data: plan, error } = await sb
        .from('plans')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (error) {
        alert(error.message)
        return
    }

    if (!plan) {
        window.location.href = "create.html"
    } else {
        alert("Este usuario ya tiene un plan activo, puede verlo en 'mi plan'")
    }
}

expenses.onclick = async () => {
    const {data : { user }} = await sb.auth.getUser()

    if (!user) {
        alert("Usuario no autenticado")
        return
    }

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
        window.location.href = "expenseAdder.html" 
    } else {
        alert("Este usuario No tiene un plan activo, puede crear uno con el boton 'Nuevo Plan'")
    }
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
}

// Listen for auth changes
sb.auth.onAuthStateChange(() => {
    updateUI()
})

// Initial check
updateUI()