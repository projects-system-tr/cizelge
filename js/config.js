/**
 * GENEL AYARLAR
 * -------------
 * Bu dosyayı depoya yerleştirmeden önce aşağıdaki iki alanı kendi
 * GitHub deponuza göre düzenleyin. Başka hiçbir dosyada depo adı
 * geçmez; hepsi buradan okunur.
 *
 * Form bazlı ayarlar (hangi Excel şablonu, hangi hücreye ne yazılacak vb.)
 * artık burada DEĞİL — data/formlar.json içinde. Yeni bir form eklemek
 * için bu dosyayı değiştirmenize gerek yok, sadece formlar.json'a yeni
 * bir kayıt ekleyip ilgili .xlsx şablonunu data/ klasörüne koymanız yeterli.
 * Bkz. README.md "Yeni form ekleme" bölümü.
 */
window.APP_CONFIG = {
  // GitHub kullanıcı adınız / organizasyon adınız
  GITHUB_OWNER: "KULLANICI_ADINIZ",

  // Depo adı (örn. "huzurevi-sistemi")
  GITHUB_REPO: "DEPO_ADINIZ",

  // Verilerin ve raporların yazılacağı/okunacağı branch
  GITHUB_BRANCH: "main",

  // Bu modülün verilerini depo içinde tuttuğu klasör.
  // Mevcut oda/profil sisteminden ayrı tutulur, çakışma olmaz.
  DATA_PATH: "gunluk-takip-data",

  // Personel listesinin depo içindeki dosya yolu (DATA_PATH altında, API ile okunur/yazılır)
  PERSONEL_DOSYASI: "personel.json",

  // Oda-form aktiflik atamalarının depo içindeki dosya yolu (DATA_PATH altında, API ile okunur/yazılır)
  ODA_FORM_ATAMA_DOSYASI: "oda-form-atamalari.json",

  // Oda kayıtlarının (oda no + sakin adı) DÜZENLENEBİLİR halinin depo
  // içindeki dosya yolu (DATA_PATH altında, API ile okunur/yazılır).
  // Bu dosya henüz oluşturulmamışsa (ilk kullanım), sistem otomatik olarak
  // ROOMS_INDEX_PATH'teki statik listeyi tohum (seed) olarak kullanır;
  // ilk kayıttan sonra hep bu dosya esas alınır.
  ODA_KAYITLARI_DOSYASI: "odalar.json",

  // Form tanımlarının (şablonların) listelendiği dosya — statik, GitHub Pages üzerinden okunur
  FORMLAR_DOSYASI: "gunluk-takip/data/formlar.json",

  // Oda listesinin BAŞLANGIÇ (tohum) dosyasının depo içindeki yolu.
  // Yalnızca ODA_KAYITLARI_DOSYASI henüz oluşturulmamışsa okunur.
  ROOMS_INDEX_PATH: "gunluk-takip/data/rooms-index.json",

  // Bakanlık logosunun depo içindeki yolu (rapor çıktısında logo alanına eklenir)
  LOGO_PATH: "gunluk-takip/assets/logo.png",
};
