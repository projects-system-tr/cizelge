Auth.requireLogin();

const _params = new URLSearchParams(window.location.search);
const odaklanilacakOda = _params.get("oda") || null;

let gruplarGlobal = {};
let formlarGlobal = [];
let atamaHaritasi = {}; // düzenlenebilir yerel kopya
let kaydedilmemisVar = false;

const BLOK_ADLARI = { A: "A Blok", B: "B Blok", C: "C Blok" };

const els = {};
function elemanlariTopla() {
  els.icerik = document.getElementById("matrisIcerik");
  els.kaydetBtn = document.getElementById("kaydetBtn");
  els.durumMetni = document.getElementById("durumMetni");
}

function durumGoster(metin) {
  els.durumMetni.textContent = metin;
}

function isaretliMi(odaNo, formId) {
  return (atamaHaritasi[odaNo] || []).includes(formId);
}

function checkboxDegisti(odaNo, formId, isaretli) {
  const mevcut = new Set(atamaHaritasi[odaNo] || []);
  if (isaretli) mevcut.add(formId);
  else mevcut.delete(formId);
  atamaHaritasi[odaNo] = Array.from(mevcut);
  kaydedilmemisVar = true;
  els.kaydetBtn.disabled = false;
  durumGoster("Kaydedilmemiş değişiklikler var");
}

function matrisCiz() {
  if (formlarGlobal.length === 0) {
    els.icerik.innerHTML = `<div class="bos-durum">Henüz hiç form tanımı yok. data/formlar.json dosyasına form ekleyin.</div>`;
    return;
  }

  const bloklar = Object.keys(gruplarGlobal).sort();
  els.icerik.innerHTML = bloklar
    .map((blok) => {
      const odalar = gruplarGlobal[blok];
      return `
        <div class="kart" style="margin-bottom:18px;">
          <h3 style="margin:0 0 12px; font-size:14px;">${BLOK_ADLARI[blok] || blok + " Blok"}</h3>
          <table class="atama-tablosu">
            <thead>
              <tr>
                <th>Oda</th>
                <th>Sakin</th>
                ${formlarGlobal.map((f) => `<th>${f.kisa_ad || f.ad}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${odalar
                .map(
                  (o) => `
                <tr class="${o.oda_no === odaklanilacakOda ? "odaklanilan-satir" : ""}" data-oda-satiri="${o.oda_no}">
                  <td>${o.oda_no}</td>
                  <td class="sakin-hucre">${o.ad_soyad || "—"}</td>
                  ${formlarGlobal
                    .map(
                      (f) => `
                    <td style="text-align:center;">
                      <input type="checkbox" data-oda="${o.oda_no}" data-form="${f.id}"
                        ${isaretliMi(o.oda_no, f.id) ? "checked" : ""}
                        ${!o.ad_soyad ? "disabled" : ""} />
                    </td>`
                    )
                    .join("")}
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`;
    })
    .join("");

  els.icerik.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => checkboxDegisti(cb.dataset.oda, cb.dataset.form, cb.checked));
  });

  if (odaklanilacakOda) {
    const satir = els.icerik.querySelector(`[data-oda-satiri="${CSS.escape(odaklanilacakOda)}"]`);
    if (satir) satir.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

async function kaydet() {
  els.kaydetBtn.disabled = true;
  els.kaydetBtn.textContent = "Kaydediliyor…";
  try {
    atamaHaritasi = await OdaFormAtama.topluKaydet(atamaHaritasi);
    kaydedilmemisVar = false;
    durumGoster("Kaydedildi ✓");
  } catch (err) {
    durumGoster("Hata: " + err.message);
    els.kaydetBtn.disabled = false;
  } finally {
    els.kaydetBtn.textContent = "Değişiklikleri Kaydet";
  }
}

window.addEventListener("beforeunload", (e) => {
  if (kaydedilmemisVar) {
    e.preventDefault();
    e.returnValue = "";
  }
});

(async function init() {
  elemanlariTopla();
  els.icerik.innerHTML = `<div class="bos-durum">Yükleniyor…</div>`;
  try {
    [gruplarGlobal, formlarGlobal] = await Promise.all([Rooms.groupedByBlock(), Formlar.listele()]);
    formlarGlobal = formlarGlobal.filter((f) => f.oda_bazli_aktivasyon !== false);
    const { harita } = await OdaFormAtama.tumunuGetir();
    atamaHaritasi = harita;
    matrisCiz();
    els.kaydetBtn.addEventListener("click", kaydet);
  } catch (err) {
    els.icerik.innerHTML = `<div class="bos-durum">Yüklenemedi: ${err.message}</div>`;
  }
})();
