Auth.requireLogin();
Auth.requirePersonel();

const _params = new URLSearchParams(window.location.search);
const odaNo = _params.get("oda");
const formId = _params.get("form");

if (!odaNo || !formId) {
  window.location.href = "odalar.html";
}

let oda = null;
let formTanimi = null;
let yil, ay;
let kayit = null;

const els = {};
function elemanlariTopla() {
  els.odaNo = document.getElementById("odaNoBaslik");
  els.sakinAdi = document.getElementById("sakinAdiBaslik");
  els.formAdi = document.getElementById("formAdiBaslik");
  els.personelEtiket = document.getElementById("personelEtiket");
  els.ayEtiket = document.getElementById("ayEtiket");
  els.oncekiAy = document.getElementById("oncekiAy");
  els.sonrakiAy = document.getElementById("sonrakiAy");
  els.olayListesi = document.getElementById("olayListesi");
  els.yeniOlayBtn = document.getElementById("yeniOlayBtn");
  els.olayFormuAlani = document.getElementById("olayFormuAlani");
  els.durumMetni = document.getElementById("durumMetni");
}

function alanGirdiHtml(alan) {
  if (alan.tip === "otomatik-sakin" || alan.tip === "otomatik-oda" || alan.tip === "personel") {
    return ""; // bunlar otomatik dolar, form içinde ayrı girdi gösterilmez
  }
  if (alan.tip === "tarih") {
    const bugun = new Date().toISOString().slice(0, 10);
    return `
      <div class="alan">
        <label>${alan.etiket}</label>
        <input type="date" name="${alan.id}" value="${bugun}" required />
      </div>`;
  }
  if (alan.tip === "saat") {
    return `
      <div class="alan">
        <label>${alan.etiket}</label>
        <input type="time" name="${alan.id}" />
      </div>`;
  }
  return `
    <div class="alan">
      <label>${alan.etiket}</label>
      <textarea name="${alan.id}" rows="2"></textarea>
    </div>`;
}

function olayFormuGoster() {
  const girdiAlanlari = formTanimi.alanlar.filter(
    (a) => !["otomatik-sakin", "otomatik-oda", "personel"].includes(a.tip)
  );
  els.olayFormuAlani.innerHTML = `
    <div class="kart" style="margin-bottom:20px;">
      <h3 style="margin:0 0 14px; font-size:15px;">Yeni Olay Kaydı</h3>
      <form id="olayForm">
        ${girdiAlanlari.map(alanGirdiHtml).join("")}
        <div class="arac-satiri">
          <button type="button" class="buton" id="olayIptalBtn">İptal</button>
          <button type="submit" class="buton birincil">Kaydet</button>
        </div>
      </form>
    </div>`;

  document.getElementById("olayIptalBtn").addEventListener("click", () => {
    els.olayFormuAlani.innerHTML = "";
    els.yeniOlayBtn.disabled = false;
  });

  document.getElementById("olayForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const veri = {};
    for (const alan of girdiAlanlari) {
      const el = e.target.elements[alan.id];
      if (el) veri[alan.id] = el.value;
    }
    // Otomatik alanlar
    for (const alan of formTanimi.alanlar) {
      if (alan.tip === "otomatik-sakin") veri[alan.id] = oda?.ad_soyad || "";
      if (alan.tip === "otomatik-oda") veri[alan.id] = odaNo;
      if (alan.tip === "personel") veri[alan.id] = Auth.getPersonel();
    }
    // Tarih alanı varsa seçili ay/yıl ile tutarlı hale getir (biçim: gg.aa.yyyy)
    if (veri.tarih) {
      const [y, m, d] = veri.tarih.split("-");
      veri.tarih = `${d}.${m}.${y}`;
    }

    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Kaydediliyor…";
    try {
      kayit = await OlayDataStore.olayEkle(formId, odaNo, oda?.ad_soyad, yil, ay, veri, Auth.getPersonel());
      els.olayFormuAlani.innerHTML = "";
      els.yeniOlayBtn.disabled = false;
      olayListesiCiz();
    } catch (err) {
      alert("Kaydedilemedi: " + err.message);
      btn.disabled = false;
      btn.textContent = "Kaydet";
    }
  });
}

function olayKartiHtml(olay) {
  const ozetAlanlar = formTanimi.alanlar.filter((a) => olay[a.id]);
  return `
    <div class="kart" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:start;">
        <div style="flex:1;">
          ${ozetAlanlar
            .map((a) => `<div style="font-size:13px; margin-bottom:3px;"><strong>${a.etiket}:</strong> ${olay[a.id]}</div>`)
            .join("")}
        </div>
        <button type="button" class="buton tehlike" style="padding:5px 12px; font-size:12.5px;" data-olay-id="${olay.id}">Sil</button>
      </div>
    </div>`;
}

function olayListesiCiz() {
  const olaylar = kayit.olaylar || [];
  if (olaylar.length === 0) {
    els.olayListesi.innerHTML = `<div class="bos-durum">Bu ay için henüz olay kaydı yok.</div>`;
  } else {
    els.olayListesi.innerHTML = olaylar
      .slice()
      .reverse()
      .map(olayKartiHtml)
      .join("");
    els.olayListesi.querySelectorAll("button[data-olay-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Bu olay kaydı silinsin mi?")) return;
        btn.disabled = true;
        try {
          kayit = await OlayDataStore.olaySil(formId, odaNo, oda?.ad_soyad, yil, ay, btn.dataset.olayId);
          olayListesiCiz();
        } catch (err) {
          alert("Silinemedi: " + err.message);
          btn.disabled = false;
        }
      });
    });
  }

  const maksimum = formTanimi.maksimum_olay_sayisi;
  if (maksimum && olaylar.length >= maksimum) {
    els.yeniOlayBtn.disabled = true;
    els.durumMetni.textContent = `Bu form için aylık maksimum kayıt sayısına (${maksimum}) ulaşıldı.`;
  } else {
    els.yeniOlayBtn.disabled = false;
    els.durumMetni.textContent = `${olaylar.length}${maksimum ? " / " + maksimum : ""} olay kaydı`;
  }
}

async function verileriYukle() {
  els.ayEtiket.textContent = `${DateUtils.ayAdi(ay)} ${yil}`;
  els.olayListesi.innerHTML = `<div class="bos-durum">Yükleniyor…</div>`;
  const sonuc = await OlayDataStore.getir(formId, odaNo, oda?.ad_soyad, yil, ay);
  kayit = sonuc.kayit;
  olayListesiCiz();
}

function ayDegistir(delta) {
  ay += delta;
  if (ay > 12) { ay = 1; yil++; }
  if (ay < 1) { ay = 12; yil--; }
  els.olayFormuAlani.innerHTML = "";
  verileriYukle();
}

(async function init() {
  elemanlariTopla();
  els.personelEtiket.textContent = Auth.getPersonel() || "—";

  try {
    [oda, formTanimi] = await Promise.all([Rooms.findByCode(odaNo), Formlar.getir(formId)]);
    els.odaNo.textContent = odaNo;
    els.sakinAdi.textContent = oda?.ad_soyad || "Sakin kaydı yok";
    els.formAdi.textContent = formTanimi.ad;
    document.title = `${formTanimi.ad} — ${odaNo}`;

    const bugun = DateUtils.bugununYilAy();
    yil = bugun.yil;
    ay = bugun.ay;

    els.oncekiAy.addEventListener("click", () => ayDegistir(-1));
    els.sonrakiAy.addEventListener("click", () => ayDegistir(1));
    els.yeniOlayBtn.addEventListener("click", () => {
      els.yeniOlayBtn.disabled = true;
      olayFormuGoster();
    });

    await verileriYukle();
  } catch (err) {
    document.getElementById("anaIcerik").innerHTML = `<div class="bos-durum">Sayfa yüklenemedi: ${err.message}</div>`;
  }
})();
