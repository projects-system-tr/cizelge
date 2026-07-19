/**
 * Bir oda + form + ay için günlük takip verisinin GitHub deposunda saklanması.
 * Dosya yolu: {DATA_PATH}/{FORM_ID}/{ODA_NO}/{YYYY-MM}.json
 *
 * Aynı oda birden fazla form için takip edilebildiğinden, veriler form
 * bazında ayrı klasörlerde tutulur (bir formun verisi diğerine karışmaz).
 *
 * Kayıt biçimi:
 * {
 *   oda_no, form_id, ad_soyad, yil, ay,
 *   gunler: {
 *     "1": { maddeler: {"1":"E","2":"H",...}, personel: "Ahmet ANDİÇ" },
 *     ...
 *   },
 *   son_guncelleme, guncelleyen
 * }
 */
const DataStore = (() => {
  function dosyaYolu(formId, odaNo, yilAyStr) {
    return `${window.APP_CONFIG.DATA_PATH}/${formId}/${odaNo}/${yilAyStr}.json`;
  }

  function bosKayit(formId, odaNo, adSoyad, yil, ay) {
    return {
      oda_no: odaNo,
      form_id: formId,
      ad_soyad: adSoyad || "",
      yil,
      ay,
      gunler: {},
      son_guncelleme: null,
      guncelleyen: null,
    };
  }

  /** Kaydı getirir. Yoksa boş bir kayıt döner (sha=null → henüz oluşturulmadı demektir). */
  async function getir(formId, odaNo, adSoyad, yil, ay) {
    const yilAyStr = DateUtils.yilAyAnahtari(yil, ay);
    const path = dosyaYolu(formId, odaNo, yilAyStr);
    const sonuc = await GitHubAPI.getJson(path);
    if (!sonuc) {
      return { kayit: bosKayit(formId, odaNo, adSoyad, yil, ay), sha: null };
    }
    return { kayit: sonuc.data, sha: sonuc.sha };
  }

  /**
   * Tek bir günün madde işaretlerini ve o günü dolduran personeli günceller.
   * maddeVerisi: { "1": "E", "2": "H", ... }
   */
  async function gunKaydet(formId, odaNo, adSoyad, yil, ay, gun, maddeVerisi, personelAdi) {
    const yilAyStr = DateUtils.yilAyAnahtari(yil, ay);
    const path = dosyaYolu(formId, odaNo, yilAyStr);
    const mevcut = await GitHubAPI.getJson(path);
    const kayit = mevcut ? mevcut.data : bosKayit(formId, odaNo, adSoyad, yil, ay);

    kayit.gunler[gun] = { maddeler: maddeVerisi, personel: personelAdi || null };
    kayit.son_guncelleme = new Date().toISOString();
    kayit.guncelleyen = personelAdi || "bilinmiyor";
    if (adSoyad) kayit.ad_soyad = adSoyad;

    await GitHubAPI.putJson(
      path,
      kayit,
      `${odaNo} [${formId}] - ${yilAyStr} - Gün ${gun} güncellendi (${personelAdi || "?"})`,
      mevcut ? mevcut.sha : undefined
    );
    return kayit;
  }

  /**
   * grid-gun-satir formları için: bir günün alan değerlerini günceller.
   * alanVerisi: { "saat": "14:30", "banyo": "E", "uygulayan": "Ahmet ANDİÇ", ... }
   */
  async function gunKaydetAlan(formId, odaNo, adSoyad, yil, ay, gun, alanVerisi, personelAdi) {
    const yilAyStr = DateUtils.yilAyAnahtari(yil, ay);
    const path = dosyaYolu(formId, odaNo, yilAyStr);
    const mevcut = await GitHubAPI.getJson(path);
    const kayit = mevcut ? mevcut.data : bosKayit(formId, odaNo, adSoyad, yil, ay);

    kayit.gunler[gun] = { alanlar: alanVerisi, personel: personelAdi || null };
    kayit.son_guncelleme = new Date().toISOString();
    kayit.guncelleyen = personelAdi || "bilinmiyor";
    if (adSoyad) kayit.ad_soyad = adSoyad;

    await GitHubAPI.putJson(
      path,
      kayit,
      `${odaNo} [${formId}] - ${yilAyStr} - Gün ${gun} güncellendi (${personelAdi || "?"})`,
      mevcut ? mevcut.sha : undefined
    );
    return kayit;
  }

  /**
   * 31 günlük tamamlanma durumunu hesaplar (kaç gün, tüm alanlar işaretlenmiş).
   * alanAnahtari: "maddeler" (grid-gun-sutun) veya "alanlar" (grid-gun-satir)
   */
  function tamamlanmaOzeti(kayit, gunSayisi, alanSayisi, alanAnahtari) {
    const anahtar = alanAnahtari || "maddeler";
    let tamamlananGun = 0;
    for (let g = 1; g <= gunSayisi; g++) {
      const gv = kayit.gunler[g];
      const veri = gv && gv[anahtar];
      if (veri && Object.keys(veri).length >= alanSayisi) tamamlananGun++;
    }
    return { tamamlananGun, gunSayisi, yuzde: Math.round((tamamlananGun / gunSayisi) * 100) };
  }

  return { getir, gunKaydet, gunKaydetAlan, tamamlanmaOzeti, dosyaYolu };
})();
