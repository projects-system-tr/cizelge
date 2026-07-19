# Günlük Bakım Takip Sistemi — Web Uygulaması

T.C. Sivas Valiliği / Sivas Huzurevi Yaşlı Bakım ve Rehabilitasyon Merkezi
Müdürlüğü için, **birden fazla form şablonunu** destekleyen, odaların
her form için ayrı ayrı **aktif/pasif** yapılabildiği, web üzerinden
doldurulan ve GitHub deposunda saklanan, istenildiğinde (tek tek veya
toplu) doldurulmuş Excel çıktısı alınabilen statik (backend'siz) bir
web uygulaması.

Mevcut oda/profil sistemiyle aynı mimariyi kullanır: GitHub Pages +
GitHub Contents API (Personal Access Token ile doğrudan tarayıcıdan
depoya yazma). Ayrı bir sunucu veya veritabanı kurulumu gerekmez.

---

## 1. Kurulum

1. Bu `gunluk-takip` klasörünü GitHub Pages deponuza kopyalayın.
2. `js/config.js` içindeki şu iki satırı kendi deponuza göre düzenleyin:
   ```js
   GITHUB_OWNER: "KULLANICI_ADINIZ",
   GITHUB_REPO: "DEPO_ADINIZ",
   ```
3. `data/rooms-index.json` — 97 odalık BAŞLANGIÇ (tohum) listeniz zaten
   yüklü. Uygulama ilk açıldığında bu dosyayı okur; **"Oda Bilgileri"**
   sayfasından ilk kayıt yapıldıktan sonra ise depodaki düzenlenebilir
   kopya (`gunluk-takip-data/odalar.json`) esas alınır (bkz. bölüm 4).
4. `data/formlar.json` — 7 form tanımlı (aşağıya bakın).
5. Depoda **Settings → Pages** üzerinden GitHub Pages'in aktif
   olduğundan emin olun.

### GitHub Personal Access Token (PAT)

Giriş ekranı PAT ile çalışır; sessionStorage'da (yalnızca o sekme
açıkken) tutulur, depoya hiçbir zaman yazılmaz. PAT'ın depoya
**Contents: Read and write** izni (fine-grained token) veya klasik
token için `repo` kapsamı olmalıdır.

---

## 2. Site haritası ve navigasyon

Üst bar, sık kullanılanları doğrudan, yönetimsel sayfaları ise
**"Yönetim ▾"** açılır menüsü altında gruplar:

| Doğrudan erişim | Yönetim ▾ menüsü |
|---|---|
| Odalar (ana sayfa) | Form Atamaları |
| Düşme Takip | Oda Bilgileri |
| Rapor Al | Personel Yönetimi |

Ayrıca "Personel Değiştir" ve "Çıkış Yap" her zaman sağ üstte durur.

---

## 3. Tanımlı formlar

| Form | Tip | Oda aktivasyonu | Açıklama |
|---|---|---|---|
| Bakım Kontrol Çizelgesi | `grid-gun-sutun` | ✓ gerekir | 13 madde × 31 gün, E/Hayır |
| Banyo Takip Çizelgesi | `grid-gun-satir` | ✓ gerekir | Gün satır; Saat, Banyo, Vücut Silme, Uygulayan |
| Günlük Kişisel Bakım Çizelgesi | `grid-gun-satir` | ✓ gerekir | Gün satır; Saat + 5 bakım maddesi + Uygulayan |
| Pozisyon Takip Çizelgesi | `grid-gun-satir` | ✓ gerekir | Gün satır; günde 8 sabit saatte pozisyon değişimi (E/H) + Uygulayan |
| Oda Kontrol Formu | `grid-gun-satir` | ✓ gerekir | Gün satır; günde 12 sabit saatte E/H (2 saatte bir) |
| Çıkan İdrar / Bez Değişim Takip Çizelgesi | `grid-gun-satir` | ✓ gerekir | Gün satır; günde 24 saatlik E/H |
| **Düşme Takip Formu** | `olay-kaydi` | **✗ gerekmez — sabit** | Güne bağlı değil, "olay ekle" ile serbest kayıt (ayda en fazla 8). Üst bardaki **"Düşme Takip"** bağlantısından, oda aktivasyonundan bağımsız olarak her zaman erişilebilir. |

### "Tek sayfa, tümünü kaydet" akışı

Bir odaya tıklandığında (Odalar sayfasından), o oda için **aktif olan
TÜM günlük (grid tipi) formlar** tek bir sayfada (`takip.html?oda=...`)
**alt alta** listelenir. Gün seçilir, her formun kendi alanları
doldurulur, sayfanın en altındaki **tek "Tümünü Kaydet"** butonuyla
hepsi bir seferde kaydedilir. Artık ayrı bir "form seç" ara sayfası
yoktur.

- **0 aktif form** varsa → Form Atamaları sayfasına yönlendirilir.
- **1+ aktif form** varsa → hepsi aynı sayfada gösterilir.

Gün seçici üzerindeki tamamlanma renkleri (yeşil/turuncu), o gün için
**tüm aktif formların birlikte** tam dolu olup olmadığına göre
hesaplanır.

### Form TİPLERİ

**`grid-gun-sutun`** — Maddeler satır, günler sütun.
**`grid-gun-satir`** — Günler satır, alanlar sütun (`eh`, `eh-parantez`,
`saat`, `personel` alan tipleri desteklenir; `tarih_turu` ile gün
sütununun sabit numara mı yoksa gerçek tarih mi tuttuğu belirlenir).
**`olay-kaydi`** — Güne bağlı olmayan, "olay ekle" ile büyüyen liste.

Yeni bir formun **oda bazlı aktivasyon gerektirip gerektirmediği**
`formlar.json` içindeki `"oda_bazli_aktivasyon": false` alanıyla
kapatılabilir (Düşme Takip Formu'nda olduğu gibi) — bu tip formlar
Form Atamaları matrisinde görünmez, her zaman erişilebilir olur ve
Rapor Al'da tüm (sakin kaydı olan) odalar listelenir.

### Yeni form ekleme

Kod değişikliği GEREKMEZ: yeni şablonu `data/`'ya koyun,
`data/formlar.json`'a bir kayıt ekleyin, gerekiyorsa Form
Atamaları'ndan odalara aktifleştirin.

---

## 4. Oda bilgileri (düzenlenebilir)

**"Yönetim ▾ → Oda Bilgileri"** sayfasından, oda başına sakin
adı-soyadı düzenlenebilir ve yeni oda eklenebilir. "Değişiklikleri
Kaydet" ile depoya (`gunluk-takip-data/odalar.json`) yazılır.

İlk kullanımda bu dosya henüz yoktur; sistem otomatik olarak statik
tohum dosyasını (`data/rooms-index.json`) kullanır. İlk kayıttan
sonra hep `gunluk-takip-data/odalar.json` esas alınır — statik dosya
bir daha okunmaz. (Dolayısıyla ileride `data/rooms-index.json`'ı
güncellemeniz, "Oda Bilgileri" sayfasından yapılmış bir değişikliği
etkilemez.)

---

## 5. Kullanım akışı (özet)

1. **Giriş** (`index.html`) — PAT girilir.
2. **Personel Seç** (`personel-sec.html`) — formu dolduran personel
   seçilir/eklenir. Oturum boyunca hatırlanır.
3. **Odalar** (`odalar.html`) — blok/kat bazlı oda listesi, her kartta
   aktif formların doluluk durumu.
4. **Günlük Takip** (`takip.html?oda=A-101`) — o odanın tüm aktif
   formları tek sayfada, tek "Tümünü Kaydet" ile.
5. **Düşme Takip** (üst bar) — herhangi bir odayı seçip olay kaydı
   ekleme; oda aktivasyonu gerekmez.
6. **Rapor Al** (`rapor.html`) — form seçilir, ay/yıl ve oda(lar)
   seçilip tek `.xlsx` veya toplu `.zip` indirilir.

### Oda — Form atamaları

`form-atamalari.html`'de her oda × her (oda bazlı aktivasyon
gerektiren) form için onay kutusu vardır. Sakin kaydı olmayan
odalarda kutucuklar devre dışıdır. Düşme Takip Formu bu tabloda
**görünmez** (bkz. yukarı).

### Personel yönetimi

`personel-yonetim.html` üzerinden personel eklenip çıkarılabilir.
Liste `gunluk-takip-data/personel.json` içinde saklanır.

---

## 6. Bakanlık logosu

Yeni formlarda logo normal bir "floating image" olarak ekli
geldiğinden ExcelJS ile otomatik korunur. Yalnızca ilk "Bakım Kontrol
Çizelgesi" şablonunda logo "hücre içi resim" (rich-data) olarak
eklenmişti; o form için dışa aktarımda `assets/logo.png` yeniden
yerleştirilir (`logo_hucre_araligi` alanı tanımlıysa). `assets/logo.png`
sabittir, otomatik güncellenmez.

---

## 7. Veri modeli

### Grid tipli formlar

```
gunluk-takip-data/{FORM_ID}/{ODA_NO}/{YYYY-MM}.json
```

### Olay kaydı formları (Düşme Takip)

```
gunluk-takip-data/dusme-formu/{ODA_NO}/{YYYY-MM}.json
```
→ `{ olaylar: [ { tarih, saat, yer, neden, ... }, ... ] }`

### Diğer depo dosyaları

- `gunluk-takip-data/personel.json` → personel listesi
- `gunluk-takip-data/oda-form-atamalari.json` → oda-form aktiflik haritası
- `gunluk-takip-data/odalar.json` → düzenlenebilir oda listesi (oluşturulunca statik tohumun yerini alır)

Bu klasör (`gunluk-takip-data/`), mevcut `rooms/` klasöründen ayrı
tutulmuştur — iki sistem birbirine karışmaz.

---

## 8. Bilinen sınırlamalar

- Gerçek bir backend olmadığından, aynı gün/olay üzerinde aynı anda
  iki farklı kişi kayıt yaparsa son kaydeden öncekini geçersiz
  kılabilir.
- "Tümünü Kaydet" birden fazla formu **sırayla** kaydeder (paralel
  değil); bir form başarısız olursa hangisinin kaydedilemediği durum
  mesajında belirtilir, diğerleri yine de kaydedilmiş olur.
- PAT tarayıcıda tutulduğundan, ortak bilgisayarlarda işlem bitince
  "Çıkış Yap" yapılması önerilir.
- Pozisyon Takip Çizelgesi'nde her saat dilimi için önerilen pozisyon
  şablonda sabittir; sistem yalnızca uygulanıp uygulanmadığını (E/H)
  işaretler.
- "KONTROL EDEN:" alanları (bazı formlarda) otomatik doldurulmuyor.
