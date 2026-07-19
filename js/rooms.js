/**
 * Oda kodu ayrıştırma, blok/kat bazında gruplama ve oda kayıtlarının
 * (oda no + sakin adı) okunması/güncellenmesi.
 *
 * Kod formatı: BLOK-KATODA  (örn. A-101, A-Z01, B-207-1)
 *   - Blok: A / B / C
 *   - Kat: "Z" = Zemin kat, aksi halde odanın ilk hanesi kat numarasıdır (1,2,...)
 *   - "B-207-1" gibi "-1" sonekli odalar, aynı kattaki bitişik/ek odayı belirtir.
 *
 * Oda kayıtları artık DÜZENLENEBİLİR: önce depodaki API-tabanlı dosya
 * ({DATA_PATH}/{ODA_KAYITLARI_DOSYASI}) aranır; orada henüz kayıt yoksa
 * (ilk kullanım), statik tohum dosyası (ROOMS_INDEX_PATH) kullanılır.
 * "Oda Bilgileri" sayfasından yapılan ilk kaydetmeden sonra hep API
 * tabanlı dosya esas alınır.
 */
const Rooms = (() => {
  let cache = null;

  function parseRoomCode(oda_no) {
    const parts = oda_no.split("-");
    const blok = parts[0]; // A / B / C
    const katOda = parts[1]; // "101", "Z01", "207"
    const ek = parts.length > 2 ? parts.slice(2).join("-") : null; // "1" (varsa)

    let kat, katEtiketi;
    if (katOda.startsWith("Z")) {
      kat = 0;
      katEtiketi = "Zemin Kat";
    } else {
      kat = parseInt(katOda.charAt(0), 10);
      katEtiketi = `${kat}. Kat`;
    }

    return { blok, kat, katEtiketi, ekOda: ek, tamKod: oda_no };
  }

  function apiYolu() {
    return `${window.APP_CONFIG.DATA_PATH}/${window.APP_CONFIG.ODA_KAYITLARI_DOSYASI}`;
  }

  function relativize(depoYolu) {
    return depoYolu.replace(/^gunluk-takip\//, "");
  }

  /** Ham oda listesini (yalnızca oda_no + ad_soyad) döner, düzenleme ekranı için. */
  async function hamListeGetir() {
    const apiSonuc = await GitHubAPI.getJson(apiYolu());
    if (apiSonuc) return { liste: apiSonuc.data, sha: apiSonuc.sha, kaynak: "api" };

    const res = await fetch(`${relativize(window.APP_CONFIG.ROOMS_INDEX_PATH)}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Oda listesi yüklenemedi.");
    const liste = await res.json();
    return { liste, sha: null, kaynak: "tohum" };
  }

  async function loadAll() {
    if (cache) return cache;
    const { liste } = await hamListeGetir();
    cache = liste.map((r) => ({ ...r, ...parseRoomCode(r.oda_no) }));
    return cache;
  }

  /** Bloklara göre gruplanmış, kat/oda sırasına göre sıralanmış liste döner. */
  async function groupedByBlock() {
    const all = await loadAll();
    const groups = {};
    for (const room of all) {
      if (!groups[room.blok]) groups[room.blok] = [];
      groups[room.blok].push(room);
    }
    for (const blok in groups) {
      groups[blok].sort((a, b) => {
        if (a.kat !== b.kat) return a.kat - b.kat;
        return a.oda_no.localeCompare(b.oda_no, "tr");
      });
    }
    return groups;
  }

  async function findByCode(oda_no) {
    const all = await loadAll();
    return all.find((r) => r.oda_no === oda_no) || null;
  }

  /**
   * Oda kayıtlarını (oda no + sakin adı) toplu kaydeder.
   * guncelListe: [{ oda_no, ad_soyad }, ...]
   */
  async function topluKaydet(guncelListe) {
    const { sha } = await hamListeGetir();
    await GitHubAPI.putJson(apiYolu(), guncelListe, "Oda bilgileri güncellendi", sha);
    cache = null; // önbelleği temizle, bir sonraki loadAll yeniden çeksin
  }

  return { loadAll, groupedByBlock, findByCode, parseRoomCode, hamListeGetir, topluKaydet };
})();
