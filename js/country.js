/* =========================================================
   country.js : 国のじょうほうカードを表示するプログラム
   ========================================================= */

const CountryView = (() => {
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

  /** まだ国をえらんでいないときの表示 */
  function renderEmpty() {
    cardsEl.innerHTML = `<p class="country-empty">まだ国をえらんでいないよ。<br>上の地図で、あかるい青色の国を タップ(クリック)してみよう!</p>`;
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
    const wc = country.worldCup2026;
    const groupBadge = wc && wc.joined
      ? `<span class="group-badge">ワールドカップ2026:グループ${escapeHtml(wc.group)}</span>`
      : "";
    return `
      <article class="country-card">
        <div class="country-card-head">
          <img class="flag" src="${escapeHtml(country.flag)}" alt="${escapeHtml(country.nameJa)}の国旗">
          <div>
            <h3 class="country-name">${escapeHtml(country.nameJa)}</h3>
            <div class="country-kana">${escapeHtml(country.nameKana)} / ${escapeHtml(country.nameEn)}</div>
            ${groupBadge}
          </div>
        </div>
        <table class="country-table">
          <tbody>
            <tr><th scope="row">首都(しゅと)</th><td>${escapeHtml(country.capital)}</td></tr>
            <tr><th scope="row">人口(じんこう)</th><td>${escapeHtml(country.population)}(${country.populationYear}年ごろ)</td></tr>
            <tr><th scope="row">広さ(面積)</th><td>${escapeHtml(country.area)}</td></tr>
            <tr><th scope="row">日本とくらべると</th><td>${escapeHtml(country.areaVsJapan)}</td></tr>
            <tr><th scope="row">ことば(言語)</th><td>${escapeHtml(country.language)}</td></tr>
            <tr><th scope="row">お金(通貨)</th><td>${escapeHtml(country.currency)}</td></tr>
          </tbody>
        </table>
        <p class="country-note">※ 人口などは年によってかわるので「約」がついています。${escapeHtml(country.infoSource)}</p>
      </article>`;
  }

  return { init, render, renderEmpty };
})();
