const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

let cachedPlan = null
let cachedMonths = null
let cachedAgg = null
let cachedCategories = null
let lem = null
let spentTotal = null
let rembalance = null

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

    const { data : categories, error : catError} = await sb.
    from("categories")
    .select("id, name, amount")
    .eq("plan_id", plan.id)

    const { data: expenses, error : expError } = await sb
    .from("expenses")
    .select("amount, kind, occurred_at, category_id")
    .eq("plan_id", plan.id)

    if (expenses.length === 0) {
        alert("El usuario notiene gastos registrados, considere añadir gastos")
    }
    if (expError || catError || expError) {
        alert(error.message)
        return
    }

    const months = getPlanMonths(plan.start_date, plan.duration)
    const agg = aggregateExpenses(expenses, categories, months)

    cachedPlan = plan
    cachedCategories = categories
    cachedMonths = months
    cachedAgg = agg
    lem = getLastExpenseMonth(expenses)

    return { plan, months, agg, categories }
}

function applyUserTheme(user) {
    if (PRIVILEGED_EMAILS.includes(user.email)) {
        document.body.classList.add("privileged-theme")
    }else{
        document.body.style.backgroundImage = "url('')"
    }
}

function getPlanMonths(startDate, duration) {
    const months = []

    const [year, month] = startDate.split("-").map(Number)
    const startYear = year
    const startMonth = month - 1 // JS months are 0-based

    for (let i = 0; i < duration; i++) {
        const d = new Date(startYear, startMonth + i, 1)

        months.push({
            year: d.getFullYear(),
            month: d.getMonth(),
            label: d.toLocaleString("default", {
                month: "short",
                year: "numeric"
            })
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
        if(exp.kind == 'expense') {
            map[key].categories[exp.category_id].spent += exp.amount
            map[key].spentTotal += exp.amount
        }else {
            map[key].categories[exp.category_id].spent -= exp.amount
            map[key].spentTotal -= exp.amount
        }
    }

    return map
}

function heatColor(percent, invred = false) {
    if (percent <= 0) return "#9bcdff" // empty

    // Clamp value
    percent = Math.min(percent, 1.2)

    // Green → Yellow → Red
    const r = Math.floor(255 * Math.min(1, Math.exp(10*(percent-1.1))))
    const g = Math.floor(255 * Math.max(0, 1 - Math.exp(8*(percent - 1.1))))
    const b = 50

    if (invred) return `rgb(${b}, ${r}, ${g})`

    return `rgb(${r}, ${g}, ${b})`
}

function updateHeaders(nmonths) {
    const theoretical_saving =  (cachedPlan.saving_goal / cachedPlan.duration) * nmonths 
    document.getElementById('budget').innerText += cachedPlan.total_budget
    document.getElementById('spent').innerText += spentTotal
    document.getElementById('current_money').innerText += (cachedPlan.total_budget - spentTotal)
    const saving = theoretical_saving + rembalance
    const perc = saving * 100 / cachedPlan.saving_goal

    const pbar  = document.getElementById('barFill')
    pbar.style.width = `${((perc>0)?perc:0).toFixed(2)}%`
    pbar.style.color = heatColor((saving > 0)? saving / cachedPlan.saving_goal : 1.5)
    document.getElementById('barLabel').innerText = `${(perc).toFixed(2)} %`
    
    const veredict = document.getElementById('savingDetail')
    if(rembalance > 0) {
        veredict.innerHTML = `Actualmente te encuentras $${rembalance} por encima de tu ahorro planeado. ¡Buen trabajo!`
    }else if(rembalance < 0) {
        veredict.innerHTML = `Actualmente te encuentras $${rembalance} por debajo de tu ahorro planeado, pero no te desanimes.`
        if (nmonths < cachedPlan.duration) veredict.innerHTML += `Todavía puedes compensarlo en los proximos ${nmonths - cachedPlan.duration} meses.` 
    }else{
        veredict.innerHTML = `Actualmente te has ceñido al presupuesto al pie de la letra ¡Felicidades!`
    }
}

function buildCumulativeBalance(months, agg) {
    const last = lem
    if (!last) return []

    let cumulativeBudget = 0
    let cumulativeSpent = 0
    let reachedNow = false

    return months.map(m => {
        const key = `${m.year}-${m.month}`
        const data = agg[key]

        if (!reachedNow) {
            cumulativeBudget += data.budgetTotal
            cumulativeSpent += data.spentTotal
        }

        const isPresent = m.year === last.year && m.month === last.month + 1

        if (isPresent) reachedNow = true

        return {
            label: m.label,
            value: reachedNow ? null : (cumulativeBudget - cumulativeSpent),
            isPresent
        }
    })
}

function getTotalSpentFromAgg(agg) {
    let total = 0

    for (const key in agg) {
        total += agg[key].spentTotal
    }

    return total
}

function getLastExpenseMonth(expenses) {
    if (!expenses.length) return null

    let latest = new Date(expenses[0].occurred_at)

    for (const exp of expenses) {
        const d = new Date(exp.occurred_at)
        if (d > latest) latest = d
    }

    return {
        year: latest.getFullYear(),
        month: latest.getMonth()
    }
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
        
        months.forEach(m => {
            const key = `${m.year}-${m.month}`
            const data = agg[key].categories[cat.id]
            const percent = data.spent / data.budget

            let cls = "ok"
            if (percent > 1) cls = "over"
            else if (percent > 0.8) cls = "warn"
            else if (data.spent === 0) cls = "empty"

            const cell = document.createElement("div")

            cell.style.backgroundColor = heatColor(percent)
            cell.className = `cell ${cls}`
            cell.dataset.tooltip = `Has usado: ${Math.round(percent * 100)}% del presupuesto`
            cell.innerHTML = `${data.spent} / ${data.budget}`
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
        cell.className = `cell ${cls}`
        cell.style.backgroundColor = heatColor(percent)
        cell.dataset.tooltip = `Has usado: ${Math.round(percent * 100)}% del presupuesto`
        cell.innerHTML = `${data.spentTotal} / ${data.budgetTotal}`
        container.appendChild(cell)
    })
}

function renderMonthlyChart(months, agg) {
    const last = lem
    let reachedNow = false

    const labels = months.map(m => m.label)

    const spent = months.map(m => {
        const isPresent = m.year === last.year && m.month === last.month + 1
        if(isPresent) reachedNow = true

        if (!reachedNow) {
            return agg[`${m.year}-${m.month}`].spentTotal
        }else{
            return null
        }
    })

    const budget = months.map(m => agg[`${m.year}-${m.month}`].budgetTotal)

    const ctx = document.getElementById("monthlyChart")

    new Chart(ctx, {
        type: "line",
        data: {
        labels,
        datasets: [
            {
            label: "Budget",
            data: budget
            },
            {
            label: "Spent",
            data: spent
            }
        ]
        },
        options: {
        responsive: true,
        plugins: {
            title: { display: true, text: "Monthly Budget vs Spent" }
        }
        }
    })
}

function renderBalanceChart(data) {
    const ctx = document.getElementById("balanceChart")

    new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: "Cumulative Balance",
                data: data.map(d => d.value),
                spanGaps: false,   // 🔥 important
                borderWidth: 2,
                tension: 0.3,
                pointRadius: data.map(d => d.isPresent ? 7 : 4),
                pointBackgroundColor: data.map(d =>
                    d.isPresent ? "#ff9800" : "#2196f3"
                )
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const d = data[ctx.dataIndex]
                            if (d.value === null) return "Future month"
                            return d.isPresent
                                ? `Present balance: ${ctx.raw}`
                                : `Balance: ${ctx.raw}`
                        }
                    }
                }
            }
        }
    })
}

window.addEventListener('DOMContentLoaded', async () => {
    const {months, categories, agg} = await oneQueryToRuleThemAll()
    console.log(months)
    console.log(categories)
    console.log(agg)
    renderTable(months, categories, agg)
    renderMonthlyChart(months, agg)
    spentTotal = getTotalSpentFromAgg(agg)

    const cums = buildCumulativeBalance(months, agg)
    const nmonths = lem.month - (new Date(cachedPlan.start_date)).getMonth()
    rembalance = cums[nmonths-1].value
    console.log(rembalance)

    updateHeaders(nmonths)
    renderBalanceChart(cums)
})