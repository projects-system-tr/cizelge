Auth.requireLogin();

const _params = new URLSearchParams(window.location.search);
const donusHedefi = _params.get("donus") || "odalar.html";

const els = {};

function elemanlariTopla() {
  els.liste = document.getElementById("personelListesi");
  els.yeniAd = document.getElementById("yeniPersonelAdi");
  els.yeniEkleBtn = document.getElementById("yeniEkleBtn");
  els.hata = document.getElementById("hataMesaji");
  els.devamBtn = document.getElementById("devamBtn");
}

let secilenPersonel = null;

function listeyiCiz(liste) {
  if (liste.length === 0) {
    els.liste.innerHTML = `<div class="bos-durum">Henüz personel eklenmemiş. Aşağıdan ekleyin.</div>`;
    return;
  }
  els.liste.innerHTML = liste
    .map(
      (ad) => `
      <button type="button" class="personel-satiri ${ad === secilenPersonel ? "secili" : ""}" data-ad="${ad}">
        <span>${ad}</span>
        ${ad === secilenPersonel ? '<span class="onay-isareti">✓</span>' : ""}
      </button>`
    )
    .join("");

  els.liste.querySelectorAll(".personel-satiri").forEach((btn) => {
    btn.addEventListener("click", () => {
      secilenPersonel = btn.dataset.ad;
      els.devamBtn.disabled = false;
      listeyiCiz(liste);
    });
  });
}

async function yenidenYukle() {
  els.liste.innerHTML = `<div class="bos-durum">Yükleniyor…</div>`;
  const { liste } = await Personel.listele();
  listeyiCiz(liste);
  return liste;
}

async function init() {
  elemanlariTopla();
  await yenidenYukle();

  els.yeniEkleBtn.addEventListener("click", async () => {
    const ad = els.yeniAd.value.trim();
    els.hata.classList.remove("gorunur");
    if (!ad) return;
    els.yeniEkleBtn.disabled = true;
    els.yeniEkleBtn.textContent = "Ekleniyor…";
    try {
      await Personel.ekle(ad);
      els.yeniAd.value = "";
      secilenPersonel = ad.replace(/\s+/g, " ").trim();
      await yenidenYukle();
      els.devamBtn.disabled = false;
    } catch (err) {
      els.hata.textContent = err.message;
      els.hata.classList.add("gorunur");
    } finally {
      els.yeniEkleBtn.disabled = false;
      els.yeniEkleBtn.textContent = "Ekle";
    }
  });

  els.devamBtn.addEventListener("click", () => {
    if (!secilenPersonel) return;
    Auth.setPersonel(secilenPersonel);
    window.location.href = donusHedefi;
  });
}

init();
