/* =========================================================
   match.js : しあいのけっかを表示するプログラム
   - しあいのボタンのリスト
   - スコアボード(ホームは左、アウェイは右)
   - とくてん(ゴール)/ せんしゅこうたい / フォーメーション
   - じょうほうのもと(出典)へのリンク
   ========================================================= */

const MatchView = (() => {
  let listEl;    // しあいボタンをならべる場所
  let detailEl;  // しあいのくわしい中身を出す場所

  function init() {
    listEl = document.getElementById("match-list");
    detailEl = document.getElementById("match-detail");
  }

  /** 「45+2」のような時間も、じゅんばんにならべられるように数字にする */
  function minuteValue(minute) {
    const parts = String(minute).split("+");
    return Number(parts[0]) + (parts[1] ? Number(parts[1]) / 100 : 0);
  }

  /** ゴールの種類のことば(PK・オウンゴール) */
  function goalTypeText(type) {
    if (type === "pk") return "(PK)";
    if (type === "og") return "(オウンゴール)";
    return "";
  }

  /** かちまけのことば */
  function resultText(match) {
    const home = match.homeTeam;
    const away = match.awayTeam;
    if (home.score > away.score) return `${home.nameJa}の勝ち`;
    if (home.score < away.score) return `${away.nameJa}の勝ち`;
    return "引き分け";
  }

  /** HTMLにそのまま入れても安全な文字にかえる */
  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  /** しあいをえらぶボタンのリストをつくる */
  function renderMatchList(matches, selectedId, onSelect) {
    listEl.innerHTML = "";
    matches.forEach((match) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "match-btn";
      btn.setAttribute("aria-pressed", String(match.id === selectedId));
      btn.innerHTML =
        `<span class="match-btn-date">${escapeHtml(match.dateJa)}・${escapeHtml(match.stage)}</span>` +
        `${escapeHtml(match.homeTeam.nameJa)} ${match.homeTeam.score} - ${match.awayTeam.score} ${escapeHtml(match.awayTeam.nameJa)}`;
      btn.addEventListener("click", () => onSelect(match.id));
      listEl.appendChild(btn);
    });
  }

  /** しあいのくわしい中身をぜんぶかく */
  function renderMatchDetail(match, countriesById) {
    const home = match.homeTeam;
    const away = match.awayTeam;
    const homeCountry = countriesById.get(home.countryId);
    const awayCountry = countriesById.get(away.countryId);

    const homeGoals = match.goals.filter((g) => g.team === "home");
    const awayGoals = match.goals.filter((g) => g.team === "away");
    const sortByMinute = (a, b) => minuteValue(a.minute) - minuteValue(b.minute);

    const goalRow = (g) =>
      `<p class="goal-row"><span class="minute">${escapeHtml(g.minute)}分</span> ` +
      `${escapeHtml(g.player || "(かくにん中)")}` +
      `<span class="goal-type">${goalTypeText(g.type)}</span> <span aria-hidden="true">⚽</span></p>`;

    const subRow = (s) =>
      `<p class="sub-row"><span class="minute">${escapeHtml(s.minute)}分</span> ` +
      `<span class="sub-out">${escapeHtml(s.playerOut)} <span class="sub-inout">(OUT)</span></span> ` +
      `<span class="sub-arrow" aria-hidden="true">→</span><span class="visually-hidden">から</span> ` +
      `<span class="sub-in">${escapeHtml(s.playerIn)} <span class="sub-inout">(IN)</span></span></p>`;

    const goalsHtml = (goals, side) =>
      goals.length
        ? goals.sort(sortByMinute).map(goalRow).join("")
        : `<p class="no-data">ゴールなし</p>`;

    const subsHtml = (subs) =>
      subs.length
        ? subs.slice().sort(sortByMinute).map(subRow).join("")
        : `<p class="no-data">こうたいなし</p>`;

    // フォーメーションが「公式でかくにんできたか」で、ことわり書きを出す
    const formationNote =
      home.formationConfirmed && away.formationConfirmed
        ? ""
        : `<p class="formation-note">※ 公式のならびが かくにんできていないため、せんしゅの とうろくポジションをもとにした、おおよその ならびです。</p>`;

    const sourcesHtml = match.sources.length
      ? `<ul class="sources-list">` +
        match.sources
          .map(
            (s) =>
              `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.name)}</a></li>`
          )
          .join("") +
        `</ul>`
      : `<p class="no-data">じゅんび中</p>`;

    detailEl.innerHTML = `
      <div class="match-head">
        <span class="stage-badge">${escapeHtml(match.competition)}・${escapeHtml(match.stage)}</span>
        <span><span aria-hidden="true">📅</span> ${escapeHtml(match.dateJa)}</span>
        <span><span aria-hidden="true">🏟️</span> ${escapeHtml(match.venue || "かくにん中")}</span>
      </div>

      <div class="scoreboard">
        <div class="sb-team">
          <img class="flag" src="${escapeHtml(homeCountry.flag)}" alt="${escapeHtml(homeCountry.nameJa)}の国旗">
          <div class="team-name">${escapeHtml(home.nameJa)}</div>
          <span class="side-label home">ホーム</span>
        </div>
        <div class="sb-center">
          <div class="sb-score">${home.score} - ${away.score}</div>
          <span class="sb-result">${escapeHtml(resultText(match))}</span>
        </div>
        <div class="sb-team">
          <img class="flag" src="${escapeHtml(awayCountry.flag)}" alt="${escapeHtml(awayCountry.nameJa)}の国旗">
          <div class="team-name">${escapeHtml(away.nameJa)}</div>
          <span class="side-label away">アウェイ</span>
        </div>
      </div>

      <div class="match-part">
        <h4><span aria-hidden="true">⚽</span> とくてん(ゴール)</h4>
        <div class="two-cols">
          <div class="col-home">
            <p class="col-head">ホーム:${escapeHtml(home.nameJa)}</p>
            ${goalsHtml(homeGoals, "home")}
          </div>
          <div class="col-away">
            <p class="col-head">アウェイ:${escapeHtml(away.nameJa)}</p>
            ${goalsHtml(awayGoals, "away")}
          </div>
        </div>
      </div>

      <div class="match-part">
        <h4><span aria-hidden="true">📋</span> さいしょに出るメンバー(先発)</h4>
        ${formationNote}
        <div class="pitches">
          ${pitchBox(home, "home")}
          ${pitchBox(away, "away")}
        </div>
      </div>

      <div class="match-part">
        <h4><span aria-hidden="true">🔁</span> せんしゅこうたい</h4>
        <div class="two-cols">
          <div class="col-home">
            <p class="col-head">ホーム:${escapeHtml(home.nameJa)}</p>
            ${subsHtml(home.substitutions)}
          </div>
          <div class="col-away">
            <p class="col-head">アウェイ:${escapeHtml(away.nameJa)}</p>
            ${subsHtml(away.substitutions)}
          </div>
        </div>
      </div>

      <div class="match-part">
        <h4><span aria-hidden="true">🔎</span> じょうほうのもとを見る</h4>
        ${sourcesHtml}
      </div>
    `;
  }

  /** 1チームぶんのコートの箱(タイトル+コートSVG) */
  function pitchBox(team, side) {
    if (!team.startingPlayers.length) {
      return `<div class="pitch-box"><p class="pitch-title">${escapeHtml(team.nameJa)}</p><p class="no-data">先発メンバーは かくにん中です</p></div>`;
    }
    return `
      <div class="pitch-box">
        <p class="pitch-title">${escapeHtml(team.nameJa)}
          <span class="formation-name">${escapeHtml(team.formation || "かくにん中")}</span>
        </p>
        ${pitchSvg(team, side)}
      </div>`;
  }

  /**
   * サッカーコートの上に先発メンバーをならべたSVGをつくる
   * - row 0 がゴールキーパー(いちばん下)、数字が大きいほど前(上)
   */
  function pitchSvg(team, side) {
    const W = 380;
    const H = 500;
    const teamColor = side === "home" ? "#4da3ff" : "#ff6b6b";

    // 選手を row(れつ)ごとにまとめる
    const rows = new Map();
    team.startingPlayers.forEach((p) => {
      if (!rows.has(p.row)) rows.set(p.row, []);
      rows.get(p.row).push(p);
    });
    const rowKeys = [...rows.keys()].sort((a, b) => a - b);

    const topY = 80;      // いちばん前のれつの高さ
    const bottomY = 445;  // ゴールキーパーの高さ
    const stepY = rowKeys.length > 1 ? (bottomY - topY) / (rowKeys.length - 1) : 0;

    let players = "";
    rowKeys.forEach((rowKey, rowIndex) => {
      const rowPlayers = rows.get(rowKey);
      const y = bottomY - rowIndex * stepY;
      rowPlayers.forEach((p, i) => {
        const x = (W * (i + 1)) / (rowPlayers.length + 1);
        const isGk = p.position === "GK";
        const fill = isGk ? "#ffd166" : teamColor;
        const name = escapeHtml(p.name);
        // 長い名前は textLength でおしこめて、よこの選手と重ならないようにする
        const nameLength = String(p.name).length;
        const textLengthAttr = nameLength > 5 ? ` textLength="88" lengthAdjust="spacingAndGlyphs"` : "";
        players += `
          <g>
            <circle cx="${x}" cy="${y}" r="17" fill="${fill}" stroke="#082042" stroke-width="2"/>
            <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
              font-size="14" font-weight="bold" fill="#082042">${p.number}</text>
            <text x="${x}" y="${y + 31}" text-anchor="middle" font-size="11.5" font-weight="bold"
              fill="#ffffff" stroke="#0b3d22" stroke-width="3" paint-order="stroke"${textLengthAttr}>${name}</text>
          </g>`;
      });
    });

    const title = `${escapeHtml(team.nameJa)}の先発メンバー(フォーメーション ${escapeHtml(team.formation || "かくにん中")})`;

    // コート(たて向きの半分)と、その上の選手たち
    return `
      <svg class="pitch-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
        <rect width="${W}" height="${H}" rx="12" fill="#17643b"/>
        <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
        <line x1="14" y1="47" x2="${W - 14}" y2="47" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
        <path d="M ${W / 2 - 70} 14 A 70 70 0 0 0 ${W / 2 + 70} 14" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
        <rect x="${W / 2 - 90}" y="${H - 86}" width="180" height="72" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
        <rect x="${W / 2 - 44}" y="${H - 48}" width="88" height="34" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
        ${players}
      </svg>`;
  }

  return { init, renderMatchList, renderMatchDetail };
})();
