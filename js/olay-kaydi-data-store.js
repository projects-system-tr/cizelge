/**
 * "olay-kaydi" tipi formlar (örn. Düşme Takip Formu) için veri yönetimi.
 * Günlere bağlı bir ızgara yerine, o ay içinde eklenen OLAY KAYITLARININ
 * bir listesi tutulur.
 *
 * Dosya yolu: {DATA_PATH}/{FORM_ID}/{ODA_NO}/{YYYY-MM}.json
 * {
 *   oda_no, form_id, ad_soyad, yil, ay,
 *   olaylar: [
 *     { id, tarih, saat, yer, neden, ..., olusturan, olusturma_tarihi },
 *     ...
 *   ],
 *   son_guncelleme, guncelleyen
 * }
 */
const OlayDataStore = (() => {
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
      olaylar: [],
      son_guncelleme: null,
      guncelleyen: null,
    };
  }

  async function getir(formId, odaNo, adSoyad, yil, ay) {
    const yilAyStr = DateUtils.yilAyAnahtari(yil, ay);
    const path = dosyaYolu(formId, odaNo, yilAyStr);
    const sonuc = await GitHubAPI.getJson(path);
    if (!sonuc) return { kayit: bosKayit(formId, odaNo, adSoyad, yil, ay), sha: null };
    return { kayit: sonuc.data, sha: sonuc.sha };
  }

  async function olayEkle(formId, odaNo, adSoyad, yil, ay, olayVerisi, personelAdi) {
    const yilAyStr = DateUtils.yilAyAnahtari(yil, ay);
    const path = dosyaYolu(formId, odaNo, yilAyStr);
    const mevcut = await GitHubAPI.getJson(path);
    const kayit = mevcut ? mevcut.data : bosKayit(formId, odaNo, adSoyad, yil, ay);

    const olay = {
      id: `olay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...olayVerisi,
      olusturan: personelAdi || "bilinmiyor",
      olusturma_tarihi: new Date().toISOString(),
    };
    kayit.olaylar.push(olay);
    kayit.son_guncelleme = new Date().toISOString();
    kayit.guncelleyen = personelAdi || "bilinmiyor";
    if (adSoyad) kayit.ad_soyad = adSoyad;

    await GitHubAPI.putJson(path, kayit, `${odaNo} [${formId}] - ${yilAyStr} - Olay eklendi`, mevcut ? mevcut.sha : undefined);
    return kayit;
  }

  async function olaySil(formId, odaNo, adSoyad, yil, ay, olayId) {
    const yilAyStr = DateUtils.yilAyAnahtari(yil, ay);
    const path = dosyaYolu(formId, odaNo, yilAyStr);
    const mevcut = await GitHubAPI.getJson(path);
    if (!mevcut) return null;
    const kayit = mevcut.data;
    kayit.olaylar = kayit.olaylar.filter((o) => o.id !== olayId);
    kayit.son_guncelleme = new Date().toISOString();

    await GitHubAPI.putJson(path, kayit, `${odaNo} [${formId}] - ${yilAyStr} - Olay silindi`, mevcut.sha);
    return kayit;
  }

  return { getir, olayEkle, olaySil, dosyaYolu };
})();
