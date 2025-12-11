import { DOM } from './dom.js';

export function showToast(message, ms = 3000) {
    const toast = DOM.toastEl || document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), ms);
}
