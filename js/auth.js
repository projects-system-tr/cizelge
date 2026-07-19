/**
 * Basit oturum yönetimi: Admin panelindekiyle aynı yöntem.
 * GitHub Personal Access Token (PAT) sessionStorage'da tutulur,
 * sekme/tarayıcı kapanınca silinir.
 */
const Auth = (() => {
  const KEY = "gunluk_takip_pat";
  const PERSONEL_KEY = "gunluk_takip_personel";

  function getToken() {
    return sessionStorage.getItem(KEY);
  }

  function setToken(pat) {
    sessionStorage.setItem(KEY, pat);
  }

  function clearToken() {
    sessionStorage.removeItem(KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  /** Giriş yapılmamışsa login sayfasına yönlendirir. Her korumalı sayfanın başında çağrılır. */
  function requireLogin() {
    if (!isLoggedIn()) {
      window.location.href = "index.html";
    }
  }

  function logout() {
    clearToken();
    clearPersonel();
    window.location.href = "index.html";
  }

  // --- Seçili personel (o oturumda formu dolduran kişi) ---
  function getPersonel() {
    return sessionStorage.getItem(PERSONEL_KEY);
  }

  function setPersonel(adSoyad) {
    sessionStorage.setItem(PERSONEL_KEY, adSoyad);
  }

  function clearPersonel() {
    sessionStorage.removeItem(PERSONEL_KEY);
  }

  /** Personel seçilmemişse seçim sayfasına yönlendirir (dönüş adresini korur). */
  function requirePersonel() {
    if (!getPersonel()) {
      const donus = encodeURIComponent(window.location.pathname.split("/").pop() + window.location.search);
      window.location.href = `personel-sec.html?donus=${donus}`;
    }
  }

  return {
    getToken, setToken, clearToken, isLoggedIn, requireLogin, logout,
    getPersonel, setPersonel, clearPersonel, requirePersonel,
  };
})();
