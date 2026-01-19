const SUPABASE_URL = 'https://kcgafrfckiaqsvvhgrzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_7uE2TT6IsgrXOPFpYWisyg_nmcyDoL7'

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)

const form = document.getElementById('plan_form')
const nxtdiv = document.getElementById('calculated')
const monthly = document.getElementById('monthly_budget')
const catTable = document.getElementById('cat_table')
const createCatBtn = document.getElementById('create_cat')
const rem = document.getElementById("remaining_budget")
const alloc = document.getElementById("allocated_budget")


function createCategory() {
    const row = document.createElement('div')
    row.className = 'category'

    const nameInput = document.createElement('input')
    nameInput.placeholder = 'Categoría'

    const amountInput = document.createElement('input')
    amountInput.type = 'number'
    amountInput.min = '0'
    amountInput.value = '0'

    const delBtn = document.createElement('button')
    delBtn.textContent = '✖'

    row.append(nameInput, amountInput, delBtn)

    // Recalculate on amount change
    amountInput.addEventListener('input', updateTotals)

    // Delete logic
    delBtn.addEventListener('click', () => {
        row.remove()
        updateTotals()
    })

    return row
}


function updateTotals() {
    const amountInputs = document.querySelectorAll('.category input[type="number"]')
    const monthlyBudget = Number(monthly.innerText)

    let allocated = 0
    amountInputs.forEach(input => {
        allocated += Number(input.value) || 0
    })

    const remaining = monthlyBudget - allocated

    rem.textContent = remaining.toFixed(2)
    alloc.textContent = allocated.toFixed(2)

    // Optional: visual feedback
    if (remaining < 0) {
        rem.style.color = 'red'
    } else {
        rem.style.color = 'black'
    }
}


form.addEventListener('submit', (e) => {
    const duration = Number(document.getElementById('duration').value)
    const budget = Number(document.getElementById('budget').value)
    const saving = Number(document.getElementById('saving').value)

    e.preventDefault()

    if (saving > budget) {
        alert('La meta de ahorro no puede ser mayor que el presupuesto')
        return
    }

    nxtdiv.style.display = 'grid'
    monthly.innerText = ((budget-saving)/duration).toFixed(2)
    rem.innerText = monthly.innerText
})


form.addEventListener('input', (e) => {    
    const duration = Number(document.getElementById('duration').value)
    const budget = Number(document.getElementById('budget').value)
    const saving = Number(document.getElementById('saving').value)


    if (saving > budget) {
        document.getElementById('saving').value = 0
        monthly.innerText = ""
        alert('La meta de ahorro no puede ser mayor que el presupuesto')
        return
    }

    if (budget==0 || duration==0) {
        monthly.innerText = ""
        return
    }else 
        {monthly.innerText = ((budget-saving)/duration).toFixed(2)
    }
})


createCatBtn.addEventListener('click', () => {
    document.querySelectorAll("form input").forEach( e => {e.disabled = true;});
    document.getElementById("submit").style.display = 'none'
    document.getElementById("reset").style.display = 'inherit'
    catTable.appendChild(createCategory())
})


document.getElementById("reset").onclick = () => {
    window.location.reload()
}

document.getElementById("create_plan").onclick = async () => {        
    const budget = Number(document.getElementById('budget').value)
    const saving = Number(document.getElementById('saving').value)
    const stdt = document.getElementById("stdt")


    const {
        data: { user },
        error: authError
    } = await sb.auth.getUser()

    if (authError || !user) {
        alert("Usuario no autenticado")
        return
    }
    if (budget < saving || Number(rem.innerText) < 0 || duration < 0) {
        alert("Datos invalidos")
        return
    }
    if(stdt.value == "") {
        alert("Por favor proporcione una fecha valida")
        return
    }

    //insert plan
    
    const { data: plan, error: planError } = await sb.from('plans').insert({
        user_id: user.id,
        duration: Number(document.getElementById('duration').value),
        total_budget: budget,
        saving_goal: saving,
        monthly_budget: Number(monthly.value),
        start_date: stdt.value
    }).select().single()

    if (planError) {
        alert(planError.message)
        return
    }

    //insert cat

}