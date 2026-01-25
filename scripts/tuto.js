const ps = document.getElementById('perselect')

function heatColor(percent, invred = false) {
    if (percent <= 0) return "#9bcdff" // empty

    // Clamp value
    percent = Math.min(percent, 1.2)

    // Green → Yellow → Red
    const r = Math.floor(255 * Math.min(1, Math.exp(4*(percent-1.1))))
    const g = Math.floor(255 * Math.max(0, 1 - Math.exp(4*(percent - 1.1))))
    const b = 50

    if (invred) return `rgb(${b}, ${r * 8 + 20}, ${g})`

    return `rgb(${r}, ${g*4}, ${b})`
}



ps.addEventListener('input', () => {
    const p =document.getElementById('percol_test')
    p.style.backgroundColor = heatColor(ps.value/100, true)
    p.innerText = ps.value + '%'
})

