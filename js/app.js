/* =========================================================
   app.js : アプリぜんたいをうごかすプログラム
   1. data フォルダの JSON(地図・国・試合)をよみこむ
   2. 地図とそれぞれの画面をつくる
   3. うごきのながれ:
      - 国をえらぶ → その国の試合が ぜんぶリストに出る
      - 試合をえらぶ → 国の情報と、試合のくわしい結果が出る
   ========================================================= */

(() => {
  // よみこんだデータをおぼえておく場所
  let countries = [];
  let matches = [];
  let countriesById = new Map();

  // いまの画面の状態
  let filteredCountryIds = null; // どの国の試合にしぼっているか(null = ぜんぶ)
  let selectedMatchId = null;    // いまえらんでいる試合

  /** JSONファイルをよみこむ(GitHub Pagesのサブフォルダでもうごくように、相対パスをつかう) */
  async function fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`${path} がよみこめませんでした (${res.status})`);
    }
    return res.json();
  }

  /** いまの状態(しぼりこみ・えらんだ試合)で、試合リストをかきなおす */
  function renderMatchList() {
    let shownMatches = matches;
    let heading = "ぜんぶの試合";
    let openAll = false;

    if (filteredCountryIds) {
      shownMatches = matches.filter(
        (m) =>
          filteredCountryIds.includes(m.homeTeam.countryId) ||
          filteredCountryIds.includes(m.awayTeam.countryId)
      );
      const names = filteredCountryIds
        .map((id) => countriesById.get(id).nameJa)
        .join("と");
      heading = `${names}の試合`;
      openAll = true; // 国でしぼったときは、ぜんぶの箱をひらいておく
    }

    MatchView.renderMatchList(shownMatches, selectedMatchId, selectMatch, countriesById, {
      heading,
      openAll,
    });
  }

  /** 地図で国がえらばれたとき(イギリスのように、1つの場所に2チームのこともある) */
  function selectCountries(countryIds) {
    const selected = countryIds.map((id) => countriesById.get(id)).filter(Boolean);
    if (!selected.length) return;

    filteredCountryIds = countryIds;
    selectedMatchId = null;

    WorldMap.highlightCountries(selected);   // 地図:えらんだ国を黄色に
    CountryView.render(selected);            // 国の情報カード
    // 試合リストの作りなおしは少しあとにまわして、先に黄色をぬってしまう(はんのうを速くするため)
    setTimeout(() => {
      renderMatchList();                     // その国の試合だけをリストに出す
      MatchView.renderDetailPlaceholder();   // くわしい結果は「試合をえらんでね」に
    }, 0);
  }

  /** 試合がえらばれたとき */
  function selectMatch(matchId) {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    selectedMatchId = matchId;
    const home = countriesById.get(match.homeTeam.countryId);
    const away = countriesById.get(match.awayTeam.countryId);

    WorldMap.showMatch(match, home, away);            // 地図:色つけ+たいせんライン
    MatchView.updateSelected(matchId);                // ボタンの「えらんでいる」しるしをつけかえる
    MatchView.renderMatchDetail(match, countriesById); // 試合のくわしい中身
    CountryView.render([home, away]);                 // 2つの国の情報
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

      WorldMap.init(worldTopo, countries, selectCountries);
      MatchView.init();
      CountryView.init();

      // さいしょは、48か国が緑色の地図と、ぜんぶの試合リストを見せる
      renderMatchList();
      MatchView.renderDetailPlaceholder();
    } catch (error) {
      // file:// でそのままひらいたときなど、よみこみにしっぱいしたとき
      console.error(error);
      document.getElementById("error-banner").hidden = false;
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();
