Auth.requireLogin();

let gruplarGlobal = {};
let taslakListe = []; // [{oda_no, ad_soyad}, ...] düzenlenebilir yerel kopya
let kaydedilmemisVar = false;

const BLOK_ADLARI = { A: "A Blok", B: "B Blok", C: "C Blok" };

const els = {};
function elemanlariTopla() {
  els.icerik = document.getElementById("odaListesiIcerik");
  els.kaydetBtn = document.getElementById("kaydetBtn");
  els.durumMetni = document.getElementById("durumMetni");
  els.yeniOdaNo = document.getElementById("yeniOdaNo");
  els.yeniAdSoyad = document.getElementById("yeniAdSoyad");
  els.yeniEkleBtn = document.getElementById("yeniEkleBtn");
  els.hataMesaji = document.getElementById("hataMesaji");
}

function durumGoster(metin) {
  els.durumMetni.textContent = metin;
}

function degisiklikOldu() {
  kaydedilmemisVar = true;
  els.kaydetBtn.disabled = false;
  durumGoster("Kaydedilmemiş değişiklikler var");
}

function listeyiCiz() {
  const gruplar = {};
  for (const oda of taslakListe) {
    const parsed = Rooms.parseRoomCode(oda.oda_no);
    if (!gruplar[parsed.blok]) gruplar[parsed.blok] = [];
    gruplar[parsed.blok].push({ ...oda, ...parsed });
  }
  for (const blok in gruplar) {
    gruplar[blok].sort((a, b) => (a.kat !== b.kat ? a.kat - b.kat : a.oda_no.localeCompare(b.oda_no, "tr")));
  }

  const bloklar = Object.keys(gruplar).sort();
  els.icerik.innerHTML = bloklar
    .map(
      (blok) => `
      <div class="kart" style="margin-bottom:18px;">
        <h3 style="margin:0 0 12px; font-size:14px;">${BLOK_ADLARI[blok] || blok + " Blok"}</h3>
        <table class="atama-tablosu">
          <thead><tr><th style="width:120px;">Oda No</th><th>Sakin Adı Soyadı</th></tr></thead>
          <tbody>
            ${gruplar[blok]
              .map(
                (o) => `
              <tr>
                <td>${o.oda_no}</td>
                <td>
                  <input type="text" data-oda-no="${o.oda_no}" value="${(o.ad_soyad || "").replace(/"/g, "&quot;")}"
                    placeholder="Boş — sakin kaydı yok"
                    style="width:100%; padding:6px 8px; border:1px solid var(--kenar); border-radius:6px; font-size:13.5px;" />
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
    )
    .join("");

  els.icerik.querySelectorAll("input[data-oda-no]").forEach((input) => {
    input.addEventListener("input", () => {
      const kayit = taslakListe.find((o) => o.oda_no === input.dataset.odaNo);
      if (kayit) kayit.ad_soyad = input.value;
      degisiklikOldu();
    });
  });
}

async function kaydet() {
  els.kaydetBtn.disabled = true;
  els.kaydetBtn.textContent = "Kaydediliyor…";
  try {
    await Rooms.topluKaydet(taslakListe);
    kaydedilmemisVar = false;
    durumGoster("Kaydedildi ✓");
  } catch (err) {
    durumGoster("Hata: " + err.message);
    els.kaydetBtn.disabled = false;
  } finally {
    els.kaydetBtn.textContent = "Değişiklikleri Kaydet";
  }
}

function yeniOdaEkle() {
  els.hataMesaji.classList.remove("gorunur");
  const odaNo = els.yeniOdaNo.value.trim().toUpperCase();
  const adSoyad = els.yeniAdSoyad.value.trim();

  if (!odaNo) return;
  if (!/^[A-C]-(Z\d{2}|\d{3})(-\d+)?$/.test(odaNo)) {
    els.hataMesaji.textContent = 'Oda kodu "A-101", "A-Z01" veya "B-207-1" biçiminde olmalı.';
    els.hataMesaji.classList.add("gorunur");
    return;
  }
  if (taslakListe.some((o) => o.oda_no === odaNo)) {
    els.hataMesaji.textContent = "Bu oda kodu zaten listede var.";
    els.hataMesaji.classList.add("gorunur");
    return;
  }

  taslakListe.push({ oda_no: odaNo, ad_soyad: adSoyad });
  els.yeniOdaNo.value = "";
  els.yeniAdSoyad.value = "";
  listeyiCiz();
  degisiklikOldu();
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
    const { liste } = await Rooms.hamListeGetir();
    taslakListe = liste.map((o) => ({ ...o }));
    listeyiCiz();
    els.kaydetBtn.addEventListener("click", kaydet);
    els.yeniEkleBtn.addEventListener("click", yeniOdaEkle);
  } catch (err) {
    els.icerik.innerHTML = `<div class="bos-durum">Yüklenemedi: ${err.message}</div>`;
  }
})();
