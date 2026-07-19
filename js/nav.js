/**
 * Üst bardaki "Yönetim ▾" açılır menüsünün ortak davranışı.
 * Her sayfa aynı .nav-acilir-buton / .nav-acilir-menu yapısını kullanır.
 */
document.addEventListener("DOMContentLoaded", () => {
  const buton = document.querySelector(".nav-acilir-buton");
  const menu = document.querySelector(".nav-acilir-menu");
  if (!buton || !menu) return;

  buton.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("acik");
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== buton) {
      menu.classList.remove("acik");
    }
  });
});
