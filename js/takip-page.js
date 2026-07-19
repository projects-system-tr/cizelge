Auth.requireLogin();

const urlParams = new URLSearchParams(window.location.search);
const odaNo = urlParams.get("oda");

if (!odaNo) {
  window.location.href = "odalar.html";
}

// Bu sayfa için personel seçilmemişse seç ekranına gönder, dönüşte buraya gelsin
if (!Auth.getPersonel()) {
  const donus = encodeURIComponent(`takip.html?oda=${odaNo}`);
  window.location.href = `personel-sec.html?donus=${donus}`;
}

let oda = null;
let formlarAktif = []; // bu odada aktif olan, güne bağlı (grid) form tanımları
let maddelerMap = {}; // formId -> [{id, etiket, satir}]  (yalnızca grid-gun-sutun formları için)
let yil, ay;
let kayitlar = {}; // formId -> kayit
let secilenGun = null;
let taslaklar = {}; // formId -> { alan/madde id -> değer }
let kaydedilmemisDegisiklik = false;

const els = {};

function elemanlariTopla() {
  els.odaNo = document.getElementById("odaNoBaslik");
  els.sakinAdi = document.getElementById("sakinAdiBaslik");
  els.personelEtiket = document.getElementById("personelEtiket");
  els.ayEtiket = document.getElementById("ayEtiket");
  els.oncekiAy = document.getElementById("oncekiAy");
  els.sonrakiAy = document.getElementById("sonrakiAy");
  els.ilerlemeDolu = document.getElementById("ilerlemeDolu");
  els.ilerlemeMetin = document.getElementById("ilerlemeMetin");
  els.gunSecici = document.getElementById("gunSecici");
  els.formBolumleri = document.getElementById("formBolumleri");
  els.gunBaslik = document.getElementById("gunBaslik");
  els.durumEtiketi = document.getElementById("durumEtiketi");
  els.tumunuKaydetBtn = document.getElementById("tumunuKaydetBtn");
}

function durumGoster(metin, tip) {
  els.durumEtiketi.textContent = metin;
  els.durumEtiketi.className = "durum-etiketi" + (tip ? " " + tip : "");
}

function alanAnahtari(form) {
  return form.tip === "grid-gun-satir" ? "alanlar" : "maddeler";
}

function alanSayisi(form) {
  return form.tip === "grid-gun-satir" ? form.alanlar.length : maddelerMap[form.id].length;
}

async function aktifFormlariYukle() {
  const { harita } = await OdaFormAtama.tumunuGetir();
  const aktifIdler = harita[odaNo] || [];
  const tumFormlar = await Formlar.listele();
  formlarAktif = tumFormlar.filter((f) => aktifIdler.includes(f.id) && f.tip !== "olay-kaydi");

  for (const form of formlarAktif) {
    if (form.tip !== "grid-gun-satir") {
      maddelerMap[form.id] = await Template.getMaddeLabels(form);
    }
  }
}

async function verileriYukle() {
  for (const form of formlarAktif) {
    const sonuc = await DataStore.getir(form.id, odaNo, oda?.ad_soyad, yil, ay);
    kayitlar[form.id] = sonuc.kayit;
  }
}

/** Bir günün TÜM aktif formlar genelinde birleşik (aggregate) durumu. */
function gunDurumu(gun) {
  if (formlarAktif.length === 0) return "bos";
  let hepsiTam = true;
  let herhangiVeri = false;

  for (const form of formlarAktif) {
    const gv = kayitlar[form.id].gunler[gun];
    const veri = gv && gv[alanAnahtari(form)];
    const dolu = veri ? Object.keys(veri).length : 0;
    if (dolu > 0) herhangiVeri = true;
    if (dolu < alanSayisi(form)) hepsiTam = false;
  }

  if (hepsiTam && herhangiVeri) return "tamamlandi";
  if (herhangiVeri) return "kismi";
  return "bos";
}

function gunSeciciCiz() {
  const gunSayisi = DateUtils.gunSayisi(yil, ay);
  const bugun = new Date();
  const bugunMu = (g) =>
    bugun.getFullYear() === yil && bugun.getMonth() + 1 === ay && bugun.getDate() === g;

  let html = "";
  for (let g = 1; g <= gunSayisi; g++) {
    const durum = gunDurumu(g);
    const siniflar = ["gun-dugme"];
    if (durum === "tamamlandi") siniflar.push("tamamlandi");
    if (durum === "kismi") siniflar.push("kismi");
    if (g === secilenGun) siniflar.push("secili");
    if (bugunMu(g)) siniflar.push("bugun");
    html += `<button class="${siniflar.join(" ")}" data-gun="${g}">${g}</button>`;
  }
  els.gunSecici.innerHTML = html;

  els.gunSecici.querySelectorAll(".gun-dugme").forEach((btn) => {
    btn.addEventListener("click", () => gunSec(parseInt(btn.dataset.gun, 10)));
  });
}

function ilerlemeCiz() {
  const gunSayisi = DateUtils.gunSayisi(yil, ay);
  let tamamlananGun = 0;
  for (let g = 1; g <= gunSayisi; g++) {
    if (gunDurumu(g) === "tamamlandi") tamamlananGun++;
  }
  const yuzde = gunSayisi ? Math.round((tamamlananGun / gunSayisi) * 100) : 0;
  els.ilerlemeDolu.style.width = yuzde + "%";
  els.ilerlemeMetin.textContent = `${tamamlananGun} / ${gunSayisi} gün tamamlandı (%${yuzde}) — ${formlarAktif.length} aktif form`;
}

function gunSec(gun) {
  secilenGun = gun;
  taslaklar = {};
  for (const form of formlarAktif) {
    const gv = kayitlar[form.id].gunler[gun];
    taslaklar[form.id] = { ...((gv && gv[alanAnahtari(form)]) || {}) };
  }
  kaydedilmemisDegisiklik = false;
  gunSeciciCiz();
  formBolumleriCiz();
  els.gunBaslik.textContent = `${gun} ${DateUtils.ayAdi(ay)} ${yil}`;
  durumGoster("");
  els.tumunuKaydetBtn.disabled = false;
}

function formBolumleriCiz() {
  if (formlarAktif.length === 0) {
    els.formBolumleri.innerHTML = `
      <div class="bos-durum">
        Bu oda için aktif form yok. <a href="form-atamalari.html?oda=${encodeURIComponent(odaNo)}">Form Atamaları</a> sayfasından ekleyebilirsiniz.
      </div>`;
    return;
  }

  els.formBolumleri.innerHTML = formlarAktif
    .map((form) => {
      const gv = kayitlar[form.id].gunler[secilenGun];
      const miniDurum = gv && gv.personel ? `Kayıtlı — ${gv.personel}` : "Henüz işaretlenmedi";
      return `
      <div class="kart form-bolumu" data-form-bolumu="${form.id}">
        <div class="form-bolumu-baslik">
          <h2>${form.ad}</h2>
          <span class="mini-durum ${gv && gv.personel ? "dolu" : ""}">${miniDurum}</span>
        </div>
        <div class="madde-listesi" data-form-icerik="${form.id}">
          ${form.tip === "grid-gun-satir" ? alanListesiHtml(form) : maddeListesiHtml(form)}
        </div>
      </div>`;
    })
    .join("");

  formBolumleriOlaylariBagla();
}

function maddeListesiHtml(form) {
  const taslak = taslaklar[form.id];
  return maddelerMap[form.id]
    .map((m) => {
      const deger = taslak[m.id];
      return `
      <div class="madde-satir">
        <div style="display:flex; gap:10px; align-items:center; flex:1;">
          <span class="madde-no">${m.id}</span>
          <span class="madde-metin">${m.etiket}</span>
        </div>
        <div class="eh-grubu">
          <button type="button" class="eh-dugme evet ${deger === "E" ? "secili" : ""}" data-form="${form.id}" data-alan="${m.id}" data-deger="E">E</button>
          <button type="button" class="eh-dugme hayir ${deger === "H" ? "secili" : ""}" data-form="${form.id}" data-alan="${m.id}" data-deger="H">H</button>
        </div>
      </div>`;
    })
    .join("");
}

function alanListesiHtml(form) {
  const taslak = taslaklar[form.id];
  return form.alanlar
    .map((alan) => {
      if (alan.tip === "personel") {
        return `
        <div class="madde-satir">
          <div style="display:flex; gap:10px; align-items:center; flex:1;">
            <span class="madde-metin">${alan.etiket}</span>
          </div>
          <span class="rozet">👤 ${Auth.getPersonel() || "—"}</span>
        </div>`;
      }
      if (alan.tip === "saat") {
        const deger = taslak[alan.id] || "";
        return `
        <div class="madde-satir">
          <div style="display:flex; gap:10px; align-items:center; flex:1;">
            <span class="madde-metin">${alan.etiket}</span>
          </div>
          <input type="time" data-form="${form.id}" data-saat-alani="${alan.id}" value="${deger}" style="padding:8px 10px; border:1px solid var(--kenar); border-radius:8px; font-size:14px;" />
        </div>`;
      }
      const deger = taslak[alan.id];
      return `
      <div class="madde-satir">
        <div style="display:flex; gap:10px; align-items:center; flex:1;">
          <span class="madde-metin">${alan.etiket}</span>
        </div>
        <div class="eh-grubu">
          <button type="button" class="eh-dugme evet ${deger === "E" ? "secili" : ""}" data-form="${form.id}" data-alan="${alan.id}" data-deger="E">E</button>
          <button type="button" class="eh-dugme hayir ${deger === "H" ? "secili" : ""}" data-form="${form.id}" data-alan="${alan.id}" data-deger="H">H</button>
        </div>
      </div>`;
    })
    .join("");
}

function formBolumleriOlaylariBagla() {
  els.formBolumleri.querySelectorAll(".eh-dugme").forEach((btn) => {
    btn.addEventListener("click", () => {
      const formId = btn.dataset.form;
      const alanId = btn.dataset.alan;
      const deger = btn.dataset.deger;
      if (taslaklar[formId][alanId] === deger) {
        delete taslaklar[formId][alanId];
      } else {
        taslaklar[formId][alanId] = deger;
      }
      kaydedilmemisDegisiklik = true;
      durumGoster("Kaydedilmedi — değişiklikleri kaydedin", "hata");
      formBolumleriCiz();
    });
  });

  els.formBolumleri.querySelectorAll("input[data-saat-alani]").forEach((input) => {
    input.addEventListener("change", () => {
      const formId = input.dataset.form;
      if (input.value) taslaklar[formId][input.dataset.saatAlani] = input.value;
      else delete taslaklar[formId][input.dataset.saatAlani];
      kaydedilmemisDegisiklik = true;
      durumGoster("Kaydedilmedi — değişiklikleri kaydedin", "hata");
    });
  });
}

async function tumunuKaydet() {
  if (!secilenGun || formlarAktif.length === 0) return;
  els.tumunuKaydetBtn.disabled = true;
  durumGoster("Kaydediliyor…", "kayit-ediliyor");

  const hatalar = [];
  for (const form of formlarAktif) {
    try {
      const taslak = { ...taslaklar[form.id] };
      if (form.tip === "grid-gun-satir") {
        const personelAlani = form.alanlar.find((a) => a.tip === "personel");
        if (personelAlani) taslak[personelAlani.id] = Auth.getPersonel();
        kayitlar[form.id] = await DataStore.gunKaydetAlan(form.id, odaNo, oda?.ad_soyad, yil, ay, secilenGun, taslak, Auth.getPersonel());
      } else {
        kayitlar[form.id] = await DataStore.gunKaydet(form.id, odaNo, oda?.ad_soyad, yil, ay, secilenGun, taslak, Auth.getPersonel());
      }
    } catch (err) {
      hatalar.push(`${form.kisa_ad || form.ad}: ${err.message}`);
    }
  }

  els.tumunuKaydetBtn.disabled = false;
  if (hatalar.length > 0) {
    durumGoster("Bazı formlar kaydedilemedi: " + hatalar.join(" | "), "hata");
  } else {
    kaydedilmemisDegisiklik = false;
    durumGoster("Tümü kaydedildi ✓");
    gunSeciciCiz();
    ilerlemeCiz();
    formBolumleriCiz();
    const gunSayisi = DateUtils.gunSayisi(yil, ay);
    if (secilenGun < gunSayisi) {
      gunSec(secilenGun + 1);
    }
  }
}

function ayDegistir(delta) {
  if (kaydedilmemisDegisiklik && !confirm("Kaydedilmemiş değişiklikler var. Yine de ay değiştirilsin mi?")) {
    return;
  }
  ay += delta;
  if (ay > 12) { ay = 1; yil++; }
  if (ay < 1) { ay = 12; yil--; }
  sayfaYenidenYukle();
}

async function sayfaYenidenYukle() {
  els.ayEtiket.textContent = `${DateUtils.ayAdi(ay)} ${yil}`;
  durumGoster("Yükleniyor…", "kayit-ediliyor");
  await verileriYukle();
  secilenGun = null;
  els.formBolumleri.innerHTML = `<div class="bos-durum">Yukarıdan bir gün seçin.</div>`;
  els.gunBaslik.textContent = "Gün seçilmedi";
  els.tumunuKaydetBtn.disabled = true;
  durumGoster("");
  gunSeciciCiz();
  ilerlemeCiz();
}

(async function init() {
  elemanlariTopla();
  try {
    els.personelEtiket.textContent = Auth.getPersonel() || "—";

    oda = await Rooms.findByCode(odaNo);
    els.odaNo.textContent = odaNo;
    els.sakinAdi.textContent = oda?.ad_soyad || "Sakin kaydı yok";

    await aktifFormlariYukle();

    if (formlarAktif.length === 0) {
      els.formBolumleri.innerHTML = `
        <div class="bos-durum">
          Bu oda için aktif form yok. <a href="form-atamalari.html?oda=${encodeURIComponent(odaNo)}">Form Atamaları</a> sayfasından ekleyebilirsiniz.
        </div>`;
      els.ilerlemeMetin.textContent = "Aktif form yok";
      return;
    }

    const bugun = DateUtils.bugununYilAy();
    yil = bugun.yil;
    ay = bugun.ay;

    els.oncekiAy.addEventListener("click", () => ayDegistir(-1));
    els.sonrakiAy.addEventListener("click", () => ayDegistir(1));
    els.tumunuKaydetBtn.addEventListener("click", tumunuKaydet);

    await sayfaYenidenYukle();

    if (bugun.yil === yil && bugun.ay === ay) {
      gunSec(new Date().getDate());
    }
  } catch (err) {
    document.getElementById("anaIcerik").innerHTML = `<div class="bos-durum">Sayfa yüklenemedi: ${err.message}</div>`;
  }
})();
