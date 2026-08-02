/* =========================================================
   country.js : 国のじょうほうカードを表示するプログラム
   - 人口や広さは、数字のデータから「約○○万人」のような
     読みやすいことばに、ここでかえています
   ========================================================= */

const CountryView = (() => {
  const JAPAN_AREA_KM2 = 378000; // 日本の広さ(くらべるときのもとにする)

  let cardsEl; // カードをならべる場所

  function init() {
    cardsEl = document.getElementById("country-cards");
    renderEmpty();
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  /** 人口(万人の数)を「約1億2400万人」のようなことばにする */
  function formatPopulation(man) {
    const oku = Math.floor(man / 10000);
    const rest = man % 10000;
    if (oku > 0 && rest > 0) return `約${oku}億${rest}万人`;
    if (oku > 0) return `約${oku}億人`;
    return `約${man}万人`;
  }

  /** 広さ(平方キロメートル)を「約37万8000平方キロメートル」のようなことばにする */
  function formatArea(km2) {
    if (km2 < 1000) return `約${km2}平方キロメートル`;
    if (km2 < 10000) return `約${Math.round(km2 / 100) * 100}平方キロメートル`;
    const rounded = Math.round(km2 / 1000) * 1000;
    const man = Math.floor(rounded / 10000);
    const rest = rounded % 10000;
    if (rest > 0) return `約${man}万${rest}平方キロメートル`;
    return `約${man}万平方キロメートル`;
  }

  /** 日本の広さとくらべたことばをつくる */
  function compareWithJapan(km2) {
    const ratio = km2 / JAPAN_AREA_KM2;
    if (ratio > 0.95 && ratio < 1.05) return "日本とほぼ同じ広さ";
    if (ratio >= 1.05) {
      const times = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
      return `日本の約${times}倍の広さ`;
    }
    const oneOver = Math.round(1 / ratio);
    return `日本の約${oneOver}分の1の広さ`;
  }

  /** まだ国をえらんでいないときの表示 */
  function renderEmpty() {
    cardsEl.innerHTML = `<p class="country-empty">まだ国をえらんでいないよ。<br>上の地図で、緑色の国を タップ(クリック)してみよう!</p>`;
  }

  /** えらばれた国(1つか2つ)のカードを表示する */
  function render(countries) {
    if (!countries.length) {
      renderEmpty();
      return;
    }
    cardsEl.innerHTML = countries.map(cardHtml).join("");
  }

  /** 1つの国のカードのHTML */
  function cardHtml(country) {
    const isJapan = country.id === "JPN";
    const compareText = isJapan ? "(くらべるもとの国です)" : compareWithJapan(country.areaKm2);
    const remarks = country.remarks
      ? `<p class="country-note country-remarks">${escapeHtml(country.remarks)}</p>`
      : "";
    return `
      <article class="country-card">
        <div class="country-card-head">
          <img class="flag" src="${escapeHtml(country.flag)}" alt="${escapeHtml(country.nameJa)}の国旗">
          <div>
            <h3 class="country-name">${escapeHtml(country.nameJa)}</h3>
            <div class="country-kana">${escapeHtml(country.nameKana)} / ${escapeHtml(country.nameEn)}</div>
            <span class="group-badge">ワールドカップ2026:グループ${escapeHtml(country.group)}</span>
          </div>
        </div>
        <table class="country-table">
          <tbody>
            <tr><th scope="row">首都(しゅと)</th><td>${escapeHtml(country.capital)}</td></tr>
            <tr><th scope="row">人口(じんこう)</th><td>${formatPopulation(country.populationMan)}(${country.populationYear}年ごろ)</td></tr>
            <tr><th scope="row">広さ(面積)</th><td>${formatArea(country.areaKm2)}</td></tr>
            <tr><th scope="row">日本とくらべると</th><td>${escapeHtml(compareText)}</td></tr>
            <tr><th scope="row">ことば(言語)</th><td>${escapeHtml(country.language)}</td></tr>
            <tr><th scope="row">お金(通貨)</th><td>${escapeHtml(country.currency)}</td></tr>
          </tbody>
        </table>
        ${remarks}
        <p class="country-note">※ 人口などは年によってかわるので、ひろく知られている おおよその数字に「約」をつけてのせています。</p>
      </article>`;
  }

  return { init, render, renderEmpty };
})();
