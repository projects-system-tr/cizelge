Auth.requireLogin();
Auth.requirePersonel();
document.getElementById("personelEtiket").textContent = Auth.getPersonel() || "—";

const BLOK_ADLARI = { A: "A Blok", B: "B Blok", C: "C Blok" };

let secilenBlok = null;
let gruplarGlobal = {};
let formlarGlobal = []; // [{id, ad, kisa_ad, ...}]
let atamaHaritasi = {}; // oda_no -> [form_id, ...]
const dolulukOnbellek = {}; // "odaNo::formId" -> { yuzde, bugunDurum }

const bugun = new Date();
const buYil = bugun.getFullYear();
const buAy = bugun.getMonth() + 1;
const buGun = bugun.getDate();

function formTanimiBul(formId) {
  return formlarGlobal.find((f) => f.id === formId);
}

function dolulukRozetiHtml(odaNo, formId) {
  const anahtar = `${odaNo}::${formId}`;
  const form = formTanimiBul(formId);
  const formEtiketi = form ? form.kisa_ad || form.ad : formId;
  const veri = dolulukOnbellek[anahtar];
  if (!veri) {
    return `<div class="form-doluluk-satiri" data-oda="${odaNo}" data-form="${formId}">
      <span class="form-etiketi">${formEtiketi}</span>
      <span class="doluluk-etiket yukleniyor">…</span>
    </div>`;
  }

  if (veri.olayModu) {
    return `<div class="form-doluluk-satiri" data-oda="${odaNo}" data-form="${formId}">
      <span class="form-etiketi">${formEtiketi}</span>
      <span class="doluluk-etiket ${veri.olaySayisi > 0 ? "kismi" : "bos"}">${veri.olaySayisi} olay</span>
    </div>`;
  }

  const bugunSimge = { tamamlandi: "✓", kismi: "•", bos: "✗" }[veri.bugunDurum];
  const bugunSinif = { tamamlandi: "bugun-tamam", kismi: "bugun-kismi", bos: "bugun-yok" }[veri.bugunDurum];
  return `
    <div class="form-doluluk-satiri" data-oda="${odaNo}" data-form="${formId}">
      <span class="form-etiketi">${formEtiketi}</span>
      <span class="doluluk-etiket ${veri.yuzde === 100 ? "tam" : veri.yuzde > 0 ? "kismi" : "bos"}">%${veri.yuzde}</span>
      <span class="bugun-rozeti ${bugunSinif}" title="Bugünün durumu">${bugunSimge}</span>
    </div>`;
}

function odaKarti(oda) {
  const bos = !oda.ad_soyad;
  const aktifFormlar = atamaHaritasi[oda.oda_no] || [];

  let altIcerik;
  if (bos) {
    altIcerik = "";
  } else if (aktifFormlar.length === 0) {
    altIcerik = `<div class="form-atanmamis">Form atanmamış</div>`;
  } else {
    altIcerik = `<div class="form-doluluk-listesi">${aktifFormlar.map((fid) => dolulukRozetiHtml(oda.oda_no, fid)).join("")}</div>`;
  }

  // Yönlendirme: 0 form -> yönetim sayfası, 1+ form -> tek takip sayfası (hepsi alt alta)
  let hedef;
  if (bos) {
    hedef = "#";
  } else if (aktifFormlar.length === 0) {
    hedef = `form-atamalari.html?oda=${encodeURIComponent(oda.oda_no)}`;
  } else {
    hedef = `takip.html?oda=${encodeURIComponent(oda.oda_no)}`;
  }

  return `
    <a class="oda-kart ${bos ? "bos-oda" : ""}" href="${hedef}" data-oda-kart="${oda.oda_no}">
      <div class="oda-no">${oda.oda_no}</div>
      <div class="sakin-adi">${bos ? "Sakin kaydı yok" : oda.ad_soyad}</div>
      <div style="margin-top:8px;">
        <span class="kat-etiket">${oda.katEtiketi}</span>
      </div>
      ${altIcerik}
    </a>`;
}

function blokIcerigiCiz(blok) {
  const odalar = gruplarGlobal[blok] || [];
  const katlar = {};
  for (const o of odalar) {
    if (!katlar[o.katEtiketi]) katlar[o.katEtiketi] = [];
    katlar[o.katEtiketi].push(o);
  }
  const icerik = document.getElementById("odaIcerik");
  icerik.innerHTML = Object.entries(katlar)
    .map(
      ([kat, odalar]) => `
      <div class="kat-bolumu">
        <h3>${kat}</h3>
        <div class="oda-grid">${odalar.map(odaKarti).join("")}</div>
      </div>`
    )
    .join("");

  const isler = [];
  for (const o of odalar) {
    if (!o.ad_soyad) continue;
    for (const formId of atamaHaritasi[o.oda_no] || []) {
      isler.push({ odaNo: o.oda_no, formId });
    }
  }
  dolulukVerileriniYukle(isler);
}

/** Bir odanın belirli bir formdaki doluluk rozetini yeniden çizmeden günceller. */
function rozetiGuncelle(odaNo, formId) {
  const satir = document.querySelector(
    `.form-doluluk-satiri[data-oda="${CSS.escape(odaNo)}"][data-form="${CSS.escape(formId)}"]`
  );
  if (!satir) return;
  satir.outerHTML = dolulukRozetiHtml(odaNo, formId);
}

/** Basit eşzamanlılık sınırlı iş kuyruğu (GitHub API'yi aşırı yüklememek için). */
async function eszamanliSinirliCalistir(isler, esZamanliSayi) {
  let index = 0;
  async function isci() {
    while (index < isler.length) {
      const mevcutIndex = index++;
      await isler[mevcutIndex]();
    }
  }
  const isciler = Array.from({ length: Math.min(esZamanliSayi, isler.length) }, () => isci());
  await Promise.all(isciler);
}

async function odaFormDolulukGetir(odaNo, formId) {
  const anahtar = `${odaNo}::${formId}`;
  if (dolulukOnbellek[anahtar]) return;
  try {
    const form = formTanimiBul(formId);

    if (form.tip === "olay-kaydi") {
      const { kayit } = await OlayDataStore.getir(formId, odaNo, null, buYil, buAy);
      const olaySayisi = (kayit.olaylar || []).length;
      dolulukOnbellek[anahtar] = { olayModu: true, olaySayisi };
      rozetiGuncelle(odaNo, formId);
      return;
    }

    const alanAnahtari = form.tip === "grid-gun-satir" ? "alanlar" : "maddeler";
    const alanSayisi = form.tip === "grid-gun-satir" ? form.alanlar.length : form.madde_sayisi;

    const { kayit } = await DataStore.getir(formId, odaNo, null, buYil, buAy);
    const gunSayisi = DateUtils.gunSayisi(buYil, buAy);
    const ozet = DataStore.tamamlanmaOzeti(kayit, gunSayisi, alanSayisi, alanAnahtari);

    const bugunGv = kayit.gunler[buGun];
    const bugunVerisi = bugunGv && bugunGv[alanAnahtari];
    const bugunAlanSayisi = bugunVerisi ? Object.keys(bugunVerisi).length : 0;
    let bugunDurum = "bos";
    if (bugunAlanSayisi >= alanSayisi) bugunDurum = "tamamlandi";
    else if (bugunAlanSayisi > 0) bugunDurum = "kismi";

    dolulukOnbellek[anahtar] = { yuzde: ozet.yuzde, bugunDurum };
  } catch (err) {
    dolulukOnbellek[anahtar] = { yuzde: 0, bugunDurum: "bos" };
  }
  rozetiGuncelle(odaNo, formId);
}

function dolulukVerileriniYukle(isler) {
  const filtrelenmis = isler.filter((is) => !dolulukOnbellek[`${is.odaNo}::${is.formId}`]);
  eszamanliSinirliCalistir(
    filtrelenmis.map((is) => () => odaFormDolulukGetir(is.odaNo, is.formId)),
    6
  );
}

(async function init() {
  try {
    [gruplarGlobal, formlarGlobal] = await Promise.all([Rooms.groupedByBlock(), Formlar.listele()]);
    const { harita } = await OdaFormAtama.tumunuGetir();
    atamaHaritasi = harita;

    const bloklar = Object.keys(gruplarGlobal).sort();
    secilenBlok = bloklar[0];

    document.getElementById("blokSekmeleri").innerHTML = bloklar
      .map(
        (b) =>
          `<button class="blok-sekme ${b === secilenBlok ? "aktif" : ""}" data-blok="${b}">
            ${BLOK_ADLARI[b] || b + " Blok"} <span style="opacity:.65">(${gruplarGlobal[b].length})</span>
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
    document.getElementById("odaIcerik").innerHTML = `
      <div class="bos-durum">Oda listesi yüklenemedi: ${err.message}</div>`;
  }
})();
