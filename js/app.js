/* =========================================================
   app.js : アプリぜんたいをうごかすプログラム
   1. data フォルダの JSON(地図・国・しあい)をよみこむ
   2. 地図とそれぞれの画面をつくる
   3. 「国をえらぶ」「しあいをえらぶ」のうごきをつなぐ
   ========================================================= */

(() => {
  // よみこんだデータをおぼえておく場所
  let countries = [];
  let matches = [];
  let countriesById = new Map();

  /** JSONファイルをよみこむ(GitHub Pagesのサブフォルダでもうごくように、相対パスをつかう) */
  async function fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`${path} がよみこめませんでした (${res.status})`);
    }
    return res.json();
  }

  /** 国をえらんだとき */
  function selectCountry(countryId) {
    const country = countriesById.get(countryId);
    if (!country) return;

    // その国が出ているしあいをさがす
    const countryMatches = matches.filter(
      (m) => m.homeTeam.countryId === countryId || m.awayTeam.countryId === countryId
    );

    if (countryMatches.length > 0) {
      // しあいがあれば、さいしょのしあいを地図と画面に出す
      selectMatch(countryMatches[0].id);
    } else {
      // まだしあいデータがない国は、国のじょうほうだけを出す
      WorldMap.highlightCountry(country);
      CountryView.render([country]);
      MatchView.renderMatchList(matches, null, selectMatch);
      document.getElementById("match-detail").innerHTML =
        `<p class="no-data">${country.nameJa}のしあいデータは、これから ついかしていく よていだよ。</p>`;
    }
  }

  /** しあいをえらんだとき */
  function selectMatch(matchId) {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const home = countriesById.get(match.homeTeam.countryId);
    const away = countriesById.get(match.awayTeam.countryId);

    WorldMap.showMatch(match, home, away);              // 地図:色つけ+たいせんライン
    MatchView.renderMatchList(matches, matchId, selectMatch); // しあいボタンのえらび直し
    MatchView.renderMatchDetail(match, countriesById);  // しあいのくわしい中身
    CountryView.render([home, away]);                   // 2つの国のじょうほう
  }

  /** アプリのスタート */
  async function start() {
    try {
      const [worldTopo, countriesData, matchesData] = await Promise.all([
        fetchJson("data/world-110m.json"),
        fetchJson("data/countries.json"),
        fetchJson("data/matches.json"),
      ]);

      countries = countriesData.countries;
      matches = matchesData.matches;
      countriesById = new Map(countries.map((c) => [c.id, c]));

      WorldMap.init(worldTopo, countries, selectCountry);
      MatchView.init();
      CountryView.init();

      // さいしょから1つめのしあいを見せて、つかい方がすぐわかるようにする
      if (matches.length > 0) {
        selectMatch(matches[0].id);
      }
    } catch (error) {
      // file:// でそのままひらいたときなど、よみこみにしっぱいしたとき
      console.error(error);
      document.getElementById("error-banner").hidden = false;
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();
