Auth.requireLogin();
Auth.requirePersonel();
document.getElementById("personelEtiket").textContent = Auth.getPersonel() || "—";

const DUSME_FORM_ID = "dusme-formu";
const BLOK_ADLARI = { A: "A Blok", B: "B Blok", C: "C Blok" };

let secilenBlok = null;
let gruplarGlobal = {};

function odaKarti(oda) {
  const bos = !oda.ad_soyad;
  return `
    <a class="oda-kart ${bos ? "bos-oda" : ""}" href="olay-kaydi.html?oda=${encodeURIComponent(oda.oda_no)}&form=${DUSME_FORM_ID}">
      <div class="oda-no">${oda.oda_no}</div>
      <div class="sakin-adi">${bos ? "Sakin kaydı yok" : oda.ad_soyad}</div>
      <div style="margin-top:8px;"><span class="kat-etiket">${oda.katEtiketi}</span></div>
    </a>`;
}

function blokIcerigiCiz(blok) {
  const odalar = (gruplarGlobal[blok] || []).filter((o) => o.ad_soyad);
  const katlar = {};
  for (const o of odalar) {
    if (!katlar[o.katEtiketi]) katlar[o.katEtiketi] = [];
    katlar[o.katEtiketi].push(o);
  }
  document.getElementById("odaIcerik").innerHTML = Object.entries(katlar)
    .map(
      ([kat, odalar]) => `
      <div class="kat-bolumu">
        <h3>${kat}</h3>
        <div class="oda-grid">${odalar.map(odaKarti).join("")}</div>
      </div>`
    )
    .join("");
}

(async function init() {
  try {
    gruplarGlobal = await Rooms.groupedByBlock();
    const bloklar = Object.keys(gruplarGlobal).sort();
    secilenBlok = bloklar[0];

    document.getElementById("blokSekmeleri").innerHTML = bloklar
      .map(
        (b) =>
          `<button class="blok-sekme ${b === secilenBlok ? "aktif" : ""}" data-blok="${b}">
            ${BLOK_ADLARI[b] || b + " Blok"}
          </button>`
      )
      .join("");

    document.querySelectorAll(".blok-sekme").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".blok-sekme").forEach((b) => b.classList.remove("aktif"));
        btn.classList.add("aktif");
        secilenBlok = btn.dataset.blok;
        blokIcerigiCiz(secilenBlok);
      });
    });

    blokIcerigiCiz(secilenBlok);
  } catch (err) {
    document.getElementById("odaIcerik").innerHTML = `<div class="bos-durum">Oda listesi yüklenemedi: ${err.message}</div>`;
  }
})();
