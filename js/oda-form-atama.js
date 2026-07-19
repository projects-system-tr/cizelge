/**
 * Hangi odanın hangi form(lar) için AKTİF olduğunun yönetimi.
 * Depoda {DATA_PATH}/{ODA_FORM_ATAMA_DOSYASI} altında bir JSON nesnesi
 * olarak tutulur:
 *   { "A-101": ["bakim-kontrol", "ilac-takip"], "A-102": ["bakim-kontrol"] }
 *
 * Bir oda bir haritada hiç geçmiyorsa veya dizi boşsa, o oda için henüz
 * hiçbir form aktifleştirilmemiş demektir (varsayılan: pasif).
 */
const OdaFormAtama = (() => {
  function dosyaYolu() {
    return `${window.APP_CONFIG.DATA_PATH}/${window.APP_CONFIG.ODA_FORM_ATAMA_DOSYASI}`;
  }

  async function tumunuGetir() {
    const sonuc = await GitHubAPI.getJson(dosyaYolu());
    if (!sonuc) return { harita: {}, sha: null };
    return { harita: sonuc.data, sha: sonuc.sha };
  }

  /** Bir odanın aktif form id'lerini döner (dizi). */
  async function odaninAktifFormlari(odaNo) {
    const { harita } = await tumunuGetir();
    return harita[odaNo] || [];
  }

  /** Bir oda için bir formu aktif/pasif yapar. */
  async function ayarla(odaNo, formId, aktifMi) {
    const { harita, sha } = await tumunuGetir();
    const mevcutListe = new Set(harita[odaNo] || []);
    if (aktifMi) mevcutListe.add(formId);
    else mevcutListe.delete(formId);
    harita[odaNo] = Array.from(mevcutListe);
    if (harita[odaNo].length === 0) delete harita[odaNo];

    await GitHubAPI.putJson(
      dosyaYolu(),
      harita,
      `${odaNo} için "${formId}" formu ${aktifMi ? "aktifleştirildi" : "pasifleştirildi"}`,
      sha
    );
    return harita;
  }

  /** Tüm haritayı tek seferde kaydeder (toplu düzenleme ekranı için). */
  async function topluKaydet(yeniHarita) {
    const { sha } = await tumunuGetir();
    // Boş dizileri temizle
    const temiz = {};
    for (const [odaNo, formlar] of Object.entries(yeniHarita)) {
      if (formlar && formlar.length > 0) temiz[odaNo] = formlar;
    }
    await GitHubAPI.putJson(dosyaYolu(), temiz, "Oda-form atamaları toplu güncellendi", sha);
    return temiz;
  }

  return { tumunuGetir, odaninAktifFormlari, ayarla, topluKaydet };
})();
