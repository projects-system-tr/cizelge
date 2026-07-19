/**
 * GitHub Contents API yardımcı fonksiyonları.
 * Sadece GÜNLÜK VERİ okuma/yazma işlemleri için kullanılır
 * (şablon ve oda listesi gibi statik dosyalar doğrudan GitHub Pages
 * üzerinden çekilir, API'ye gerek yoktur).
 */
const GitHubAPI = (() => {
  function apiBase() {
    const { GITHUB_OWNER, GITHUB_REPO } = window.APP_CONFIG;
    return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;
  }

  function authHeaders() {
    const pat = Auth.getToken();
    if (!pat) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
    return {
      Authorization: `token ${pat}`,
      Accept: "application/vnd.github+json",
    };
  }

  // UTF-8 güvenli base64 encode/decode (Türkçe karakterler için şart)
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function fromBase64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  /**
   * Depodan bir JSON dosyası okur.
   * Bulunamazsa (henüz oluşturulmamışsa) null döner.
   * Döner: { data: <parsed json>, sha: <string> } | null
   */
  async function getJson(path) {
    const url = `${apiBase()}/${path}?ref=${window.APP_CONFIG.GITHUB_BRANCH}&t=${Date.now()}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`GitHub okuma hatası (${res.status}): ${await res.text()}`);
    }
    const body = await res.json();
    const content = fromBase64(body.content.replace(/\n/g, ""));
    return { data: JSON.parse(content), sha: body.sha };
  }

  /**
   * Depoya bir JSON dosyası yazar (varsa günceller, yoksa oluşturur).
   */
  async function putJson(path, dataObj, message, existingSha) {
    const url = `${apiBase()}/${path}`;
    const payload = {
      message,
      content: toBase64(JSON.stringify(dataObj, null, 2)),
      branch: window.APP_CONFIG.GITHUB_BRANCH,
    };
    if (existingSha) payload.sha = existingSha;

    const res = await fetch(url, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`GitHub yazma hatası (${res.status}): ${await res.text()}`);
    }
    return res.json();
  }

  /** PAT'ın geçerli olup olmadığını ve depoya erişimi kontrol eder. */
  async function testAccess() {
    const { GITHUB_OWNER, GITHUB_REPO } = window.APP_CONFIG;
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
      { headers: authHeaders() }
    );
    if (!res.ok) return false;
    return true;
  }

  return { getJson, putJson, testAccess };
})();
