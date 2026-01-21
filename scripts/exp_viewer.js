async function requestDelete(exp_id) {
    
    window.parent.postMessage({
        type: "DELETE_EXPENSE",
        payload: { id: exp_id }
    }, "*")
    
    return
}


function renderExpenses(expenses) {
    const container = document.body
    container.innerHTML = `<h1>Movimientos</h1>`

    if (expenses.length === 0) {
        const rrms = document.createElement("p")
        rrms.innerText = "No hay movimientos en el intervalo de tiempo seleccionado"
        container.appendChild(rrms)
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
        
        const delBtn = document.createElement("button")
        delBtn.textContent = "✖"
        delBtn.value = exp.id

        row.appendChild(delBtn)
        container.appendChild(row)

        delBtn.addEventListener('click', async () => {
            await requestDelete(delBtn.value)
        })
    })
}



window.addEventListener("message", event => {
    if (!event.data || event.data.type !== "FILTER_EXPENSES") return

    const { expenses } = event.data.payload

    renderExpenses(expenses)
})

