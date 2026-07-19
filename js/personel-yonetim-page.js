Auth.requireLogin();

const els = {};
function elemanlariTopla() {
  els.liste = document.getElementById("personelListesi");
  els.yeniAd = document.getElementById("yeniPersonelAdi");
  els.yeniEkleBtn = document.getElementById("yeniEkleBtn");
  els.hata = document.getElementById("hataMesaji");
}

function listeyiCiz(liste) {
  if (liste.length === 0) {
    els.liste.innerHTML = `<div class="bos-durum">Henüz personel eklenmemiş.</div>`;
    return;
  }
  els.liste.innerHTML = liste
    .map(
      (ad) => `
      <div class="personel-satiri" style="cursor:default;">
        <span>${ad}</span>
        <button type="button" class="buton tehlike" style="padding:5px 12px; font-size:13px;" data-ad="${ad}">Çıkar</button>
      </div>`
    )
    .join("");

  els.liste.querySelectorAll("button[data-ad]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ad = btn.dataset.ad;
      if (!confirm(`"${ad}" personel listesinden çıkarılsın mı?`)) return;
      btn.disabled = true;
      btn.textContent = "Çıkarılıyor…";
      try {
        const yeniListe = await Personel.cikar(ad);
        listeyiCiz(yeniListe);
      } catch (err) {
        alert("Hata: " + err.message);
        btn.disabled = false;
        btn.textContent = "Çıkar";
      }
    });
  });
}

async function yenidenYukle() {
  els.liste.innerHTML = `<div class="bos-durum">Yükleniyor…</div>`;
  const { liste } = await Personel.listele();
  listeyiCiz(liste);
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
      await yenidenYukle();
    } catch (err) {
      els.hata.textContent = err.message;
      els.hata.classList.add("gorunur");
    } finally {
      els.yeniEkleBtn.disabled = false;
      els.yeniEkleBtn.textContent = "Ekle";
    }
  });
}

init();
