// Import all of Bootstrap's JS
// import * as bootstrap from 'bootstrap'
import './dashboard.js'

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
