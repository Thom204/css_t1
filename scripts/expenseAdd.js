const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)

const startDate = document.getElementById("init_date")
const endDate = document.getElementById("end_date")


// Local state
let currentPlanId = null
let currentFilters = {
    start: null,
    end: null
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

    if (startDate.value) query = query.gte("occurred_at", startDate)
    if (endDate.value) query = query.lte("occurred_at", endDate)

    const { data, error } = await query

    if (error) {
        console.error(error)
        return
    }

    renderExpenses(data)
    console.log(data)
}

function renderExpenses(expenses) {
    const container = document.getElementById("expenses")
    container.innerHTML = ""

    if (expenses.length === 0) {
        container.textContent = "No movements found"
        return
    }

    expenses.forEach(exp => {
    const row = document.createElement("div")
    row.className = "expense-row"

    row.innerHTML = `
        <span>${exp.occurred_at}</span>
        <span>${exp.kind}</span>
        <span>${exp.categories?.name ?? "Unassigned"}</span>
        <span>${exp.amount}</span>
        <span>${exp.description ?? ""}</span>
        `

    container.appendChild(row)
    })
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadActivePlan()

    const today = new Date().toISOString().split("T")[0]
    startDate.value = today
    endDate.value = today
    await fetchExpenses(today, today)
})


window.addEventListener("message", async (event) => {
    if (!event.data || event.data.type !== "FILTER_EXPENSES") return

    const { start, end } = event.data.payload

    currentFilters.start = start
    currentFilters.end = end

    await fetchExpenses(start, end)
})

