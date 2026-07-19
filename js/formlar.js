/**
 * Form şablonu tanımlarının okunması.
 * data/formlar.json içinden statik olarak (GitHub Pages üzerinden, API'ye
 * gerek olmadan) okunur. Yeni form eklemek için sadece bu JSON dosyasına
 * yeni bir kayıt eklemek ve ilgili .xlsx şablonunu data/ klasörüne koymak
 * yeterlidir — kod değişikliği gerekmez.
 */
const Formlar = (() => {
  let cache = null;

  function relativize(depoYolu) {
    return depoYolu.replace(/^gunluk-takip\//, "");
  }

  async function listele() {
    if (cache) return cache;
    const res = await fetch(`${relativize(window.APP_CONFIG.FORMLAR_DOSYASI)}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Form tanımları (data/formlar.json) yüklenemedi.");
    cache = await res.json();
    return cache;
  }

  async function getir(formId) {
    const liste = await listele();
    const form = liste.find((f) => f.id === formId);
    if (!form) throw new Error(`"${formId}" adlı form tanımı bulunamadı.`);
    return form;
  }

  return { listele, getir };
})();
