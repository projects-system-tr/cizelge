const DateUtils = (() => {
  const AY_ADLARI = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];

  function gunSayisi(yil, ay) {
    // ay: 1-12
    return new Date(yil, ay, 0).getDate();
  }

  function ayAdi(ay) {
    return AY_ADLARI[ay - 1];
  }

  function bugununYilAy() {
    const now = new Date();
    return { yil: now.getFullYear(), ay: now.getMonth() + 1 };
  }

  /** "2026-07" formatında anahtar üretir. */
  function yilAyAnahtari(yil, ay) {
    return `${yil}-${String(ay).padStart(2, "0")}`;
  }

  function anahtardanCoz(yilAyStr) {
    const [yil, ay] = yilAyStr.split("-").map(Number);
    return { yil, ay };
  }

  return { AY_ADLARI, gunSayisi, ayAdi, bugununYilAy, yilAyAnahtari, anahtardanCoz };
})();
