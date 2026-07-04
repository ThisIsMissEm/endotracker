// Import all of Bootstrap's JS
// import * as bootstrap from 'bootstrap'
import './charts.js'

import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.css'

// Native <input type="date"> renders its display format from the browser/OS
// locale, which markup can't control. flatpickr gives a consistent day-first
// (d/m/Y) field while still submitting ISO (Y-m-d), so server-side validators
// expecting ^\d{4}-\d{2}-\d{2}$ are unaffected. Applied to every date input.
document.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach((input) => {
  flatpickr(input, {
    altInput: true, // visible field the user reads/edits
    altFormat: 'd/m/Y', // European display, e.g. 01/06/2026
    dateFormat: 'Y-m-d', // value actually submitted → validator-safe
    allowInput: true, // allow typing as well as picking
    // flatpickr's visible field is a brand-new element; copy the source input's
    // classes so Bootstrap styling + server-side validation state carry over.
    altInputClass: input.className,
  })
})

const highlightClassname = 'table-active'
const hash = window.location.hash.substring(1) // Remove the '#' symbol
if (hash) {
  const targetElement = document.getElementById(hash)
  if (targetElement && targetElement.nodeName == 'TR') {
    targetElement.classList.add(highlightClassname)
    setTimeout(() => {
      targetElement.classList.remove(highlightClassname)
    }, 2000)
  }
}
