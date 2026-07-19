/**
 * Excel şablonlarıyla ilgili tüm işlemler. Her form kendi "form tanımı"na
 * (data/formlar.json) göre işlenir. Üç form TİPİ desteklenir:
 *
 *  - "grid-gun-sutun": maddeler SATIR, günler SÜTUN (örn. Bakım Kontrol Çizelgesi)
 *  - "grid-gun-satir" : günler SATIR, alanlar SÜTUN (örn. Banyo Takip, Oda Kontrol)
 *  - "olay-kaydi"     : güne bağlı olmayan, listeye eklenen olay kayıtları (örn. Düşme Takip)
 */
const Template = (() => {
  const workbookBufferOnbellek = {}; // formId -> ArrayBuffer
  const maddelerOnbellek = {}; // formId -> [{id, etiket, satir}]
  let logoBufferOnbellek = null;

  function relativize(depoYolu) {
    return depoYolu.replace(/^gunluk-takip\//, "");
  }

  async function fetchTemplateBuffer(formTanimi) {
    if (workbookBufferOnbellek[formTanimi.id]) return workbookBufferOnbellek[formTanimi.id];
    const res = await fetch(`${relativize(formTanimi.sablon_dosya)}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`Şablon dosyası yüklenemedi: ${formTanimi.sablon_dosya}`);
    workbookBufferOnbellek[formTanimi.id] = await res.arrayBuffer();
    return workbookBufferOnbellek[formTanimi.id];
  }

  async function fetchLogoBuffer() {
    if (logoBufferOnbellek) return logoBufferOnbellek;
    const res = await fetch(`${relativize(window.APP_CONFIG.LOGO_PATH)}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Bakanlık logosu (assets/logo.png) yüklenemedi.");
    logoBufferOnbellek = await res.arrayBuffer();
    return logoBufferOnbellek;
  }

  async function loadWorkbook(formTanimi) {
    const buffer = await fetchTemplateBuffer(formTanimi);
    const wb = new ExcelJS.Workbook();
    // ExcelJS buffer'ı tükettiği için her seferinde kopyasını veriyoruz
    await wb.xlsx.load(buffer.slice(0));
    return wb;
  }

  /** Şablonun A sütunundan madde adlarını okur (yalnızca grid-gun-sutun). Boşsa "Madde N" döner. */
  async function getMaddeLabels(formTanimi) {
    if (maddelerOnbellek[formTanimi.id]) return maddelerOnbellek[formTanimi.id];
    const wb = await loadWorkbook(formTanimi);
    const ws = wb.worksheets[0];
    const { madde_sayisi, madde_baslangic_satiri, madde_satir_yuksekligi } = formTanimi;

    const labels = [];
    for (let i = 0; i < madde_sayisi; i++) {
      const row = madde_baslangic_satiri + i * madde_satir_yuksekligi;
      const cell = ws.getCell(`A${row}`);
      const val = (cell.value || "").toString().trim();
      labels.push({ id: i + 1, etiket: val || `Madde ${i + 1}`, satir: row });
    }
    maddelerOnbellek[formTanimi.id] = labels;
    return labels;
  }

  function gunSutunu(formTanimi, gun) {
    return formTanimi.gun_baslangic_sutunu + (gun - 1);
  }

  async function logoEkle(wb, ws, formTanimi) {
    // Logo ekleme devre dışı bırakıldı: Excel çıktısı üretilirken şablondaki
    // mevcut logoya (ve o hücreye) hiç dokunulmasın diye bu fonksiyon artık
    // hiçbir şey yapmıyor. Tekrar aktif etmek isterseniz aşağıdaki eski
    // gövdeyi geri getirip formTanimi.logo_hucre_araligi tanımlarını kullanın.
    return;
  }

  function hucreKlonlaVeYaz(cell, deger, font, alignment) {
    cell.style = Object.assign({}, cell.style);
    cell.value = deger;
    if (font) cell.font = font;
    if (alignment) cell.alignment = alignment;
  }

  // ---------------------------------------------------------------------
  // TİP 1: grid-gun-sutun (maddeler satır, günler sütun)
  // ---------------------------------------------------------------------
  async function buildGridGunSutun(wb, ws, kayit, formTanimi) {
    const maddeler = await getMaddeLabels(formTanimi);

    await logoEkle(wb, ws, formTanimi);

    if (formTanimi.personel_imza_satiri && formTanimi.personel_satir_yuksekligi) {
      ws.getRow(formTanimi.personel_imza_satiri).height = formTanimi.personel_satir_yuksekligi;
      ws.getRow(formTanimi.personel_imza_satiri + 1).height = formTanimi.personel_satir_yuksekligi;
      ws.getRow(formTanimi.personel_imza_satiri + 2).height = formTanimi.personel_satir_yuksekligi;
    }

    if (formTanimi.baslik_hucresi) {
      const baslikHucresi = ws.getCell(formTanimi.baslik_hucresi);
      const sablon = formTanimi.baslik_sablon || "{AY_BUYUK} {YIL}";
      hucreKlonlaVeYaz(
        baslikHucresi,
        sablon
          .replace("{AY_BUYUK}", DateUtils.ayAdi(kayit.ay).toLocaleUpperCase("tr"))
          .replace("{AY}", DateUtils.ayAdi(kayit.ay))
          .replace("{YIL}", kayit.yil)
      );
    }

    if (formTanimi.sakin_adi_hucresi) {
      const sakinHucresi = ws.getCell(formTanimi.sakin_adi_hucresi);
      hucreKlonlaVeYaz(sakinHucresi, (kayit.ad_soyad || "").toLocaleUpperCase("tr"));
    }

    const gunSayisi = DateUtils.gunSayisi(kayit.yil, kayit.ay);

    for (let gun = 1; gun <= gunSayisi; gun++) {
      const gunVerisi = (kayit.gunler && kayit.gunler[gun]) || {};
      const maddeVerisi = gunVerisi.maddeler || {};
      const col = gunSutunu(formTanimi, gun);

      for (const madde of maddeler) {
        const deger = maddeVerisi[madde.id];
        if (deger === "E" || deger === "H") {
          const cell = ws.getCell(madde.satir, col);
          const font = { name: "Arial", size: 11, bold: true };
          if (deger === "H") font.color = { argb: "FFCC0000" };
          hucreKlonlaVeYaz(cell, deger, font, { horizontal: "center", vertical: "middle" });
        }
      }

      if (gunVerisi.personel && formTanimi.personel_imza_satiri) {
        const imzaCell = ws.getCell(formTanimi.personel_imza_satiri, col);
        hucreKlonlaVeYaz(
          imzaCell,
          Personel.excelIcinKisalt(gunVerisi.personel, formTanimi.ad_soyad_kisaltma_siniri),
          { ...(formTanimi.personel_imza_font || { name: "Times New Roman", size: 8 }) },
          { horizontal: "center", vertical: "middle", textRotation: 90, wrapText: false }
        );
      }
    }
  }

  // ---------------------------------------------------------------------
  // TİP 2: grid-gun-satir (günler satır, alanlar sütun)
  // ---------------------------------------------------------------------
  async function buildGridGunSatir(wb, ws, kayit, formTanimi) {
    await logoEkle(wb, ws, formTanimi);

    if (formTanimi.sakin_adi_hucresi) {
      const sakinHucresi = ws.getCell(formTanimi.sakin_adi_hucresi);
      const deger = formTanimi.sakin_adi_sablon
        ? formTanimi.sakin_adi_sablon.replace("{AD_SOYAD}", (kayit.ad_soyad || "").toLocaleUpperCase("tr"))
        : (kayit.ad_soyad || "").toLocaleUpperCase("tr");
      hucreKlonlaVeYaz(sakinHucresi, deger);
    }

    if (formTanimi.ay_yil_hucresi) {
      const ayYilHucresi = ws.getCell(formTanimi.ay_yil_hucresi);
      const sablon = formTanimi.ay_yil_sablon || "{AY} {YIL}";
      hucreKlonlaVeYaz(
        ayYilHucresi,
        sablon.replace("{AY}", DateUtils.ayAdi(kayit.ay)).replace("{AY_BUYUK}", DateUtils.ayAdi(kayit.ay).toLocaleUpperCase("tr")).replace("{YIL}", kayit.yil)
      );
    }

    const gunSayisiGercek = DateUtils.gunSayisi(kayit.yil, kayit.ay);
    const sablonSatirSayisi = formTanimi.gun_sayisi || 31;

    for (let gun = 1; gun <= sablonSatirSayisi; gun++) {
      const row = formTanimi.gun_baslangic_satiri + (gun - 1);
      const gecerliGun = gun <= gunSayisiGercek;

      // Tarih türü "tarih_degeri" olan formlarda (gerçek tarih değeri tutan
      // sütun), seçilen aya göre tarih yeniden yazılır; ayın olmayan
      // günleri (örn. Şubat'ta 30-31) için hücre boşaltılır.
      if (formTanimi.tarih_turu === "tarih_degeri" && formTanimi.gun_sutunu) {
        const tarihCell = ws.getCell(`${formTanimi.gun_sutunu}${row}`);
        tarihCell.style = Object.assign({}, tarihCell.style);
        tarihCell.value = gecerliGun ? new Date(kayit.yil, kayit.ay - 1, gun) : null;
      }

      if (!gecerliGun) continue;

      const gunVerisi = (kayit.gunler && kayit.gunler[gun]) || {};
      const alanVerisi = gunVerisi.alanlar || {};

      for (const alan of formTanimi.alanlar) {
        const deger = alanVerisi[alan.id];
        if (deger === undefined || deger === null || deger === "") continue;
        const cell = ws.getCell(`${alan.sutun}${row}`);

        if (alan.tip === "eh") {
          if (deger === "E" || deger === "H") {
            const font = { name: "Arial", size: 11, bold: true };
            if (deger === "H") font.color = { argb: "FFCC0000" };
            hucreKlonlaVeYaz(cell, deger, font, { horizontal: "center", vertical: "middle" });
          }
        } else if (alan.tip === "eh-parantez") {
          if (deger === "E" || deger === "H") {
            const orijinalMetin = (cell.value || "").toString();
            const yeniMetin = orijinalMetin.match(/\([^)]*\)/)
              ? orijinalMetin.replace(/\([^)]*\)/, `( ${deger} )`)
              : `${orijinalMetin}\n( ${deger} )`;
            const font = { name: "Arial", size: 10, bold: true };
            if (deger === "H") font.color = { argb: "FFCC0000" };
            hucreKlonlaVeYaz(cell, yeniMetin, font, { horizontal: "center", vertical: "middle", wrapText: true });
          }
        } else if (alan.tip === "saat") {
          cell.style = Object.assign({}, cell.style);
          cell.numFmt = "@"; // metin olarak sakla, Excel tarih/saat olarak yorumlamasın
          cell.value = deger;
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (alan.tip === "personel") {
          hucreKlonlaVeYaz(cell, deger, { name: "Arial", size: 10 }, { horizontal: "center", vertical: "middle", wrapText: true });
        } else {
          hucreKlonlaVeYaz(cell, deger, undefined, { horizontal: "left", vertical: "middle", wrapText: true });
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // TİP 3: olay-kaydi (güne bağlı olmayan, listeye eklenen kayıtlar)
  // ---------------------------------------------------------------------
  async function buildOlayKaydi(wb, ws, kayit, formTanimi) {
    await logoEkle(wb, ws, formTanimi);

    const olaylar = kayit.olaylar || [];
    const maksimum = formTanimi.maksimum_olay_sayisi || olaylar.length;

    olaylar.slice(0, maksimum).forEach((olay, index) => {
      const row = formTanimi.olay_baslangic_satiri + index * formTanimi.olay_satir_yuksekligi;
      for (const alan of formTanimi.alanlar) {
        let deger = olay[alan.id];
        if (deger === undefined || deger === null || deger === "") continue;
        const cell = ws.getCell(`${alan.sutun}${row}`);
        hucreKlonlaVeYaz(cell, deger, { name: "Arial", size: 10 }, { horizontal: "center", vertical: "middle", wrapText: true });
      }
    });
  }

  /**
   * Doldurulmuş bir rapor workbook'u üretir. kayit'in şekli form tipine göre değişir:
   *  - grid-gun-sutun / grid-gun-satir: { oda_no, ad_soyad, yil, ay, gunler: {...} }
   *  - olay-kaydi: { oda_no, ad_soyad, yil, ay, olaylar: [...] }
   */
  async function buildFilledWorkbook(kayit, formTanimi) {
    const wb = await loadWorkbook(formTanimi);
    const ws = wb.worksheets[0];

    if (formTanimi.tip === "grid-gun-satir") {
      await buildGridGunSatir(wb, ws, kayit, formTanimi);
    } else if (formTanimi.tip === "olay-kaydi") {
      await buildOlayKaydi(wb, ws, kayit, formTanimi);
    } else {
      await buildGridGunSutun(wb, ws, kayit, formTanimi);
    }

    return wb;
  }

  function dosyaAdiUret(kayit, formTanimi) {
    return `${kayit.oda_no}_${DateUtils.yilAyAnahtari(kayit.yil, kayit.ay)}_${formTanimi.kisa_ad || formTanimi.id}.xlsx`;
  }

  async function workbookBufferUret(kayit, formTanimi) {
    const wb = await buildFilledWorkbook(kayit, formTanimi);
    return wb.xlsx.writeBuffer();
  }

  function tetikleIndirme(buffer, dosyaAdi) {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = dosyaAdi;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadFilledWorkbook(kayit, formTanimi) {
    const buffer = await workbookBufferUret(kayit, formTanimi);
    tetikleIndirme(buffer, dosyaAdiUret(kayit, formTanimi));
  }

  return {
    getMaddeLabels,
    buildFilledWorkbook,
    workbookBufferUret,
    dosyaAdiUret,
    downloadFilledWorkbook,
    tetikleIndirme,
  };
})();
