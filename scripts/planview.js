const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

const displayDuration = document.getElementById("nmonths")
let cachedPlan = null
let cachedMonths = null
let cachedAgg = null
let cachedCategories = null

const PRIVILEGED_EMAILS = ["dperezgu@unal.edu.co", "perezdaren008@gmail.com", "thom191104@gmail.com"]

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)

async function oneQueryToRuleThemAll(force = false) {

    if (!force && cachedPlan && cachedAgg && cachedMonths && cachedCategories) {
        console.log("Using cached dashboard data")
        return {
            plan: cachedPlan,
            months: cachedMonths,
            agg: cachedAgg,
            categories: cachedCategories
        }
    }


    const {data : {user} } = await sb.auth.getUser()

    if (!user) {
        alert("Session Error, User not found")
        window.location.href = "index.html"
        return
    }

    applyUserTheme(user)

    const { data: plan , error : planError} = await sb
    .from("plans")
    .select('id, duration, total_budget, saving_goal, monthly_budget, start_date')
    .eq("user_id", user.id)
    .single()
    
    if (!plan) {
        alert("El usuario no tiene un plan existente")
        window.location.href = "app.html"
        return
    }

    displayDuration.value = plan.duration

    const { data : categories, error : catError} = await sb.
    from("categories")
    .select("id, name, amount")
    .eq("plan_id", plan.id)

    const { data: expenses, error : expError } = await sb
    .from("expenses")
    .select("amount, occurred_at, category_id")
    .eq("plan_id", plan.id)

    if (expenses.length === 0) {
        alert("El usuario notiene gastos registrados, considere añadir gastos")
    }
    if (expError || catError || expError) {
        alert(error.message)
        return
    }

    const months = getPlanMonths(plan.start_date, displayDuration.value)
    const agg = aggregateExpenses(expenses, categories, months)

    cachedPlan = plan
    cachedCategories = categories
    cachedMonths = months
    cachedAgg = agg

    return { plan, months, agg, categories }
}

function applyUserTheme(user) {
    if (PRIVILEGED_EMAILS.includes(user.email)) {
        document.body.classList.add("privileged-theme")
    }
}

function getPlanMonths(startDate, duration) {
    const months = []
    const start = new Date(startDate)

    for (let i = 0; i < duration; i++) {
        const d = new Date(start)
        d.setMonth(start.getMonth() + i)

        months.push({
            year: d.getFullYear(),
            month: d.getMonth(), // 0–11
            label: d.toLocaleString("default", { month: "short", year: "numeric" })
        })
    }

    return months
}

function aggregateExpenses(expenses, categories, months) {
    const map = {}

    // Initialize months with category budgets
    months.forEach(m => {
        const key = `${m.year}-${m.month}`

        map[key] = {
            spentTotal: 0,
            budgetTotal: 0,
            categories: {}
        }

        categories.forEach(cat => {
            map[key].categories[cat.id] = {
                spent: 0,
                budget: cat.amount
            }

            map[key].budgetTotal += cat.amount
        })
    })

    // Aggregate expenses
    for (const exp of expenses) {
        const d = new Date(exp.occurred_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`

        if (!map[key]) continue // expense outside plan range

        map[key].categories[exp.category_id].spent += exp.amount
        map[key].spentTotal += exp.amount
    }

    return map
}

function heatColor(percent) {
    if (percent <= 0) return "#f1f5f9" // empty

    // Clamp value
    percent = Math.min(percent, 1.2)

    // Green → Yellow → Red
    const r = Math.floor(255 * Math.min(1, percent * 1.2))
    const g = Math.floor(255 * Math.max(0, 1 - percent * 0.8))
    const b = 80

    return `rgb(${r}, ${g}, ${b})`
}


function renderTable(months, categories, agg) {
    const container = document.querySelector(".stateTable")
    container.innerHTML = ""
    container.style.display = "grid"
    container.style.gridTemplateColumns =
        `200px repeat(${months.length}, 1fr)`

    // Header
    container.appendChild(document.createElement("div"))
    months.forEach(m => {
        const h = document.createElement("div")
        h.className = "header"
        h.innerText = m.label
        container.appendChild(h)
    })

    // Category rows
    categories.forEach(cat => {
        const nameCell = document.createElement("div")
        nameCell.className = "category-name"
        nameCell.innerText = cat.name
        container.appendChild(nameCell)
        
        /*
        months.forEach(m => {
            const key = `${m.year}-${m.month}`
            const data = agg[key].categories[cat.id]

            const cell = document.createElement("div")
            cell.innerHTML = renderCell(data.budget, data.spent)
            container.appendChild(cell)
        */
        months.forEach(m => {
            const key = `${m.year}-${m.month}`
            const data = agg[key].categories[cat.id]
            const percent = data.spent / data.budget

            let cls = "ok"
            if (percent > 1) cls = "over"
            else if (percent > 0.8) cls = "warn"
            else if (data.spent === 0) cls = "empty"

            const cell = document.createElement("div")

            cell.className = `cell ${cls}`
            cell.innerHTML = `${data.budget} / ${data.spent}`
            container.appendChild(cell)
        })
    })

    const totalLabel = document.createElement("div")
    totalLabel.className = "category-name total-row"
    totalLabel.innerText = "TOTAL"
    container.appendChild(totalLabel)

    months.forEach(m => {
        const key = `${m.year}-${m.month}`
        const data = agg[key]
        const percent = data.spentTotal / data.budgetTotal

        let cls = "ok"
        if (percent > 1) cls = "over"
        else if (percent > 0.8) cls = "warn"
        else if (data.spent === 0) cls = "empty"

        const cell = document.createElement("div")
        cell.innerHTML = `${data.budgetTotal} / ${data.spentTotal}`
        container.appendChild(cell)
    })
}


window.addEventListener('DOMContentLoaded', async () => {
    const {months, categories, agg} = await oneQueryToRuleThemAll()
    console.log(months)
    console.log(categories)
    console.log(agg)
    renderTable(months, categories, agg)
})