/**
 * Personel listesi yönetimi.
 * Depoda {DATA_PATH}/{PERSONEL_DOSYASI} altında bir JSON dizisi olarak tutulur:
 *   ["Ahmet ANDİÇ", "Ayşe YILMAZ", ...]
 */
const Personel = (() => {
  function dosyaYolu() {
    return `${window.APP_CONFIG.DATA_PATH}/${window.APP_CONFIG.PERSONEL_DOSYASI}`;
  }

  async function listele() {
    const sonuc = await GitHubAPI.getJson(dosyaYolu());
    if (!sonuc) return { liste: [], sha: null };
    return { liste: sonuc.data, sha: sonuc.sha };
  }

  async function ekle(adSoyad) {
    const temiz = adSoyad.trim().replace(/\s+/g, " ");
    if (!temiz) throw new Error("Personel adı boş olamaz.");
    const { liste, sha } = await listele();
    if (liste.some((p) => p.toLocaleLowerCase("tr") === temiz.toLocaleLowerCase("tr"))) {
      throw new Error("Bu personel zaten listede kayıtlı.");
    }
    liste.push(temiz);
    liste.sort((a, b) => a.localeCompare(b, "tr"));
    await GitHubAPI.putJson(dosyaYolu(), liste, `Personel eklendi: ${temiz}`, sha);
    return liste;
  }

  async function cikar(adSoyad) {
    const { liste, sha } = await listele();
    const yeniListe = liste.filter((p) => p !== adSoyad);
    await GitHubAPI.putJson(dosyaYolu(), yeniListe, `Personel çıkarıldı: ${adSoyad}`, sha);
    return yeniListe;
  }

  /**
   * Excel'e yazılacak kısaltılmış ad üretir.
   * İsim ve soyisim AYRI AYRI değerlendirilir: verilen sınırı aşan kısım
   * yalnızca baş harfiyle yazılır (örn. "Mehmet Emin Çakır" -> "M. Çakır",
   * "Abdulkadir Hocaoğlu" -> "A. H."). Sınır form tanımından gelir
   * (formTanimi.ad_soyad_kisaltma_siniri); verilmezse varsayılan 7 kullanılır.
   */
  function excelIcinKisalt(adSoyad, sinir) {
    const gercekSinir = sinir || 7;
    const temiz = (adSoyad || "").trim().replace(/\s+/g, " ");
    if (!temiz) return "";

    const parcalar = temiz.split(" ");
    if (parcalar.length < 2) {
      // Tek kelimelik isim: yalnızca uzunluk sınırını uygula
      return temiz.length > gercekSinir ? temiz.charAt(0).toLocaleUpperCase("tr") + "." : temiz;
    }

    const soyad = parcalar[parcalar.length - 1];
    const ad = parcalar.slice(0, -1).join(" ");

    const adKisim = ad.length > gercekSinir ? ad.charAt(0).toLocaleUpperCase("tr") + "." : ad;
    const soyadKisim = soyad.length > gercekSinir ? soyad.charAt(0).toLocaleUpperCase("tr") + "." : soyad;

    return `${adKisim} ${soyadKisim}`.trim();
  }

  return { listele, ekle, cikar, excelIcinKisalt, dosyaYolu };
})();
