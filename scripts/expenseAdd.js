const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)

const startDate = document.getElementById("init_date")
const endDate = document.getElementById("end_date")
const iframe = document.getElementById('expenses')

let currentPlanId = null

async function insertExpense({ amount, kind, categoryId, date, description }) {
    const { error } = await sb.from("expenses").insert({
        plan_id: currentPlanId,
        category_id: categoryId,
        amount,
        kind,
        occurred_at: date,
        description
    })

    if (error) {
        alert(error.message)
        return
    } else {
        alert("insertado exitosamente")
    }

    // Refresh viewer automatically
    await fetchExpenses(startDate.value, endDate.value)
}

async function loadActivePlan() {
    const { data: { user }} = await sb.auth.getUser()

    if (!user) {
        console.log(user)
        console.error("Not authenticated")
        return
    }

    const { data, error } = await sb.from("plans")
                                    .select("id")
                                    .eq("user_id", user.id)
                                    .limit(1)
                                    .single()

    if (error) {
        console.error(error)
        return
    }

    currentPlanId = data.id
    fetchCategories(currentPlanId)
}

async function fetchExpenses(startDate, endDate) {
    if (!currentPlanId) return

    let query = sb.from("expenses")
                  .select(`
                    id,
                    amount,
                    kind,
                    occurred_at,
                    description,
                    categories ( name )
                    `)
                  .eq("plan_id", currentPlanId)
                  .order("occurred_at", { ascending: false })

    if (startDate) query = query.gte("occurred_at", startDate)
    if (endDate) query = query.lte("occurred_at", endDate)

    const { data, error } = await query

    if (error) {
        console.error(error)
        return
    }

    console.log(data)
    
    iframe.contentWindow.postMessage({
        type: "FILTER_EXPENSES",
        payload: {
            expenses : data
        }
    }, "*")
}

async function fetchCategories(planId) {
    const {data : { user }} = await sb.auth.getUser()

    if (!user) {
        console.log(user)
        console.error("Not authenticated")
        return
    }

    const {data , error} = await sb.from("categories")
                                    .select(`id, name`)
                                    .eq("plan_id", planId)

    if (error) {
        console.error(error)
        return
    }

    renderCat(data)
}

function renderCat(categories) {
    const container = document.getElementById("mov_cat")

    container.innerHTML = ""

    const placeholder = document.createElement("option")
    placeholder.value = ""
    placeholder.innerText = "Seleccione una categoría"
    placeholder.disabled = true
    placeholder.selected = true
    container.appendChild(placeholder)
    
    if(categories.length === 0) {
        alert("No categories available for User Fatal error")
        window.location.href = "app.html"
        return
    }

    categories.forEach( cat => {
        const dbcatrow = document.createElement("option")

        dbcatrow.value = cat.id
        dbcatrow.innerText = cat.name
        container.appendChild(dbcatrow)
    })
}

window.addEventListener("message", async event => {
    if (!event.data || event.data.type !== "DELETE_EXPENSE") return

    const { id } = event.data.payload

    const { error } = await sb.from("expenses")
                              .delete()
                              .eq("id", id)

    if (error) {
        alert(error.message)
        return
    } else {
        alert("Movimiento eliminado correctamente")
    }

    // Refresh view
    await fetchExpenses(startDate.value, endDate.value)
})

document.addEventListener("DOMContentLoaded", async () => {
    await loadActivePlan()

    const today = new Date().toISOString().split("T")[0]
    startDate.value = today
    endDate.value = today
    await fetchExpenses(today, today)
})

document.getElementById('query_form').addEventListener('input', () =>{
    console.log("changed filters")
    iframe.style.opacity = "0.5"
})

document.getElementById('query_form').addEventListener('submit', e => {
    iframe.style.opacity = "1.0"
    e.preventDefault()
    console.log("queried")
    fetchExpenses(startDate.value, endDate.value)
})

document.getElementById("create_mov").addEventListener("click", async (e) => {
    e.preventDefault()
    const amount = Number(document.getElementById("mov_amount").value)
    const kind = document.getElementById("mov_kind").value
    const categoryId = document.getElementById("mov_cat").value
    const date = document.getElementById("mov_date").value
    const description = document.getElementById("mov_desc").value

    if (!amount || amount <= 0 || !kind || !date || !categoryId) {
        alert("Datos inválidos")
        return
    }

    await insertExpense({
        amount,
        kind,
        categoryId,
        date,
        description
    })
})
