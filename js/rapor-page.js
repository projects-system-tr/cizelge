Auth.requireLogin();

const _p = new URLSearchParams(window.location.search);
const baslangicOda = _p.get("oda") || null;
const baslangicForm = _p.get("form") || null;

const els = {};
let gruplarGlobal = {};
let formlarGlobal = [];
let atamaHaritasi = {};

function elemanlariTopla() {
  els.formSecici = document.getElementById("formSecici");
  els.aySecici = document.getElementById("aySecici");
  els.yilSecici = document.getElementById("yilSecici");
  els.tumunuSecKutu = document.getElementById("tumunuSecKutu");
  els.odaListesiAlani = document.getElementById("odaListesiAlani");
  els.secimSayaci = document.getElementById("secimSayaci");
  els.indirBtn = document.getElementById("indirBtn");
  els.durumMetni = document.getElementById("durumMetni");
  els.ilerlemeAlani = document.getElementById("ilerlemeAlani");
}

function seciliFormTanimi() {
  return formlarGlobal.find((f) => f.id === els.formSecici.value);
}

function formSeceneklerDoldur() {
  els.formSecici.innerHTML = formlarGlobal
    .map((f) => `<option value="${f.id}" ${f.id === baslangicForm ? "selected" : ""}>${f.ad}</option>`)
    .join("");
}

function yilSecenekleriDoldur() {
  const buYil = new Date().getFullYear();
  let html = "";
  for (let y = buYil - 2; y <= buYil + 1; y++) {
    html += `<option value="${y}" ${y === buYil ? "selected" : ""}>${y}</option>`;
  }
  els.yilSecici.innerHTML = html;
}

function aySecenekleriDoldur() {
  els.aySecici.innerHTML = DateUtils.AY_ADLARI.map(
    (ad, i) => `<option value="${i + 1}" ${i + 1 === new Date().getMonth() + 1 ? "selected" : ""}>${ad}</option>`
  ).join("");
}

function seciliOdaKodlari() {
  return Array.from(els.odaListesiAlani.querySelectorAll("input[type=checkbox]:checked")).map((cb) => cb.value);
}

function sayaciGuncelle() {
  const n = seciliOdaKodlari().length;
  els.secimSayaci.textContent = n === 0 ? "Henüz oda seçilmedi" : `${n} oda seçildi`;
  els.indirBtn.disabled = n === 0;
  els.indirBtn.textContent = n > 1 ? `Seçili ${n} Odayı ZIP Olarak İndir` : "Excel Olarak İndir";
}

function odaListesiCiz() {
  const formId = els.formSecici.value;
  const form = seciliFormTanimi();
  const odaBazliAktivasyon = !form || form.oda_bazli_aktivasyon !== false;
  const bloklar = Object.keys(gruplarGlobal).sort();

  const blokIcerikleri = bloklar
    .map((blok) => {
      const odalar = (gruplarGlobal[blok] || []).filter((o) => {
        if (!o.ad_soyad) return false;
        return odaBazliAktivasyon ? (atamaHaritasi[o.oda_no] || []).includes(formId) : true;
      });
      if (odalar.length === 0) return "";
      return `
        <div class="oda-secim-blok" data-blok="${blok}">
          <div class="oda-secim-blok-baslik">
            <h3>${blok} Blok (${odalar.length})</h3>
            <button type="button" data-blok-sec="${blok}">Tümünü Seç / Kaldır</button>
          </div>
          <div class="oda-secim-grid">
            ${odalar
              .map(
                (o) => `
              <label class="oda-secim-satiri">
                <input type="checkbox" value="${o.oda_no}" ${o.oda_no === baslangicOda ? "checked" : ""} />
                <span>${o.oda_no} — ${o.ad_soyad}</span>
              </label>`
              )
              .join("")}
          </div>
        </div>`;
    })
    .join("");

  els.odaListesiAlani.innerHTML =
    blokIcerikleri ||
    (odaBazliAktivasyon
      ? `<div class="bos-durum">Bu form için aktifleştirilmiş oda yok. <a href="form-atamalari.html">Form Atamaları</a> sayfasından ekleyebilirsiniz.</div>`
      : `<div class="bos-durum">Sakin kaydı olan oda bulunamadı.</div>`);

  els.odaListesiAlani.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", sayaciGuncelle);
  });

  els.odaListesiAlani.querySelectorAll("button[data-blok-sec]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const blok = btn.dataset.blokSec;
      const kutular = els.odaListesiAlani.querySelectorAll(`.oda-secim-blok[data-blok="${blok}"] input[type=checkbox]`);
      const hepsiSecili = Array.from(kutular).every((k) => k.checked);
      kutular.forEach((k) => (k.checked = !hepsiSecili));
      sayaciGuncelle();
    });
  });

  sayaciGuncelle();
}

async function kayitGetir(formTanimi, odaNo, adSoyad, yil, ay) {
  if (formTanimi.tip === "olay-kaydi") {
    const { kayit } = await OlayDataStore.getir(formTanimi.id, odaNo, adSoyad, yil, ay);
    return kayit;
  }
  const { kayit } = await DataStore.getir(formTanimi.id, odaNo, adSoyad, yil, ay);
  return kayit;
}

async function raporlariIndir() {
  const odaKodlari = seciliOdaKodlari();
  const formTanimi = seciliFormTanimi();
  const yil = parseInt(els.yilSecici.value, 10);
  const ay = parseInt(els.aySecici.value, 10);
  if (odaKodlari.length === 0) return;

  els.indirBtn.disabled = true;
  els.tumunuSecKutu.disabled = true;

  try {
    if (odaKodlari.length === 1) {
      els.durumMetni.textContent = "Excel dosyası oluşturuluyor…";
      const odaNo = odaKodlari[0];
      const oda = await Rooms.findByCode(odaNo);
      const kayit = await kayitGetir(formTanimi, odaNo, oda?.ad_soyad, yil, ay);
      await Template.downloadFilledWorkbook(kayit, formTanimi);
      els.durumMetni.textContent = "İndirildi ✓";
    } else {
      const zip = new JSZip();
      let tamamlanan = 0;
      for (const odaNo of odaKodlari) {
        els.durumMetni.textContent = `Hazırlanıyor: ${odaNo} (${tamamlanan + 1}/${odaKodlari.length})`;
        els.ilerlemeAlani.style.width = `${Math.round((tamamlanan / odaKodlari.length) * 100)}%`;
        const oda = await Rooms.findByCode(odaNo);
        const kayit = await kayitGetir(formTanimi, odaNo, oda?.ad_soyad, yil, ay);
        const buffer = await Template.workbookBufferUret(kayit, formTanimi);
        zip.file(Template.dosyaAdiUret(kayit, formTanimi), buffer);
        tamamlanan++;
      }
      els.durumMetni.textContent = "ZIP dosyası paketleniyor…";
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Toplu-Rapor_${formTanimi.kisa_ad || formTanimi.id}_${DateUtils.ayAdi(ay)}-${yil}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      els.durumMetni.textContent = `İndirildi ✓ (${odaKodlari.length} oda)`;
    }
  } catch (err) {
    els.durumMetni.textContent = "Hata: " + err.message;
  } finally {
    els.ilerlemeAlani.style.width = "0%";
    els.indirBtn.disabled = false;
    els.tumunuSecKutu.disabled = false;
    setTimeout(() => { els.durumMetni.textContent = ""; }, 4000);
  }
}

(async function init() {
  elemanlariTopla();
  yilSecenekleriDoldur();
  aySecenekleriDoldur();

  [gruplarGlobal, formlarGlobal] = await Promise.all([Rooms.groupedByBlock(), Formlar.listele()]);
  const { harita } = await OdaFormAtama.tumunuGetir();
  atamaHaritasi = harita;

  if (formlarGlobal.length === 0) {
    els.odaListesiAlani.innerHTML = `<div class="bos-durum">Henüz hiç form tanımı yok.</div>`;
    return;
  }

  formSeceneklerDoldur();
  odaListesiCiz();

  els.formSecici.addEventListener("change", odaListesiCiz);
  els.tumunuSecKutu.addEventListener("change", () => {
    const hepsi = els.tumunuSecKutu.checked;
    els.odaListesiAlani.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.checked = hepsi));
    sayaciGuncelle();
  });

  els.indirBtn.addEventListener("click", raporlariIndir);
})();
