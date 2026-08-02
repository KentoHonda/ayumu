/* =========================================================
   match.js : しあいのけっかを表示するプログラム
   - しあいのボタンのリスト(国でしぼりこみもできる)
   - スコアボード(ホームは左、アウェイは右。PKせんにも対応)
   - とくてん(ゴール)
   - さいしょに出るメンバー(先発)と せんしゅこうたい(まとめて表示)
   - じょうほうのもと(出典)へのリンク
   ========================================================= */

const MatchView = (() => {
  let listEl;      // しあいボタンをならべる場所
  let headingEl;   // しあいリストの見出し
  let detailEl;    // しあいのくわしい中身を出す場所
  let matchButtons = new Map(); // しあいID → ボタン(えらび直しに使う)

  function init() {
    listEl = document.getElementById("match-list");
    headingEl = document.getElementById("match-list-heading");
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

  /** かちまけのことば(PKせんにも対応) */
  function resultText(match) {
    const home = match.homeTeam;
    const away = match.awayTeam;
    if (match.penaltyShootout) {
      const pk = match.penaltyShootout;
      const winner = pk.home > pk.away ? home.nameJa : away.nameJa;
      return `PKせんで ${winner}の勝ち`;
    }
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

  /**
   * しあいをえらぶボタンのリストをつくる
   * - しあいは1つずつ、たてにならべる
   * - 「グループA」「ラウンド32」などのステージごとに、ひらいたり
   *   とじたりできる箱(details)に分けて、分かりやすくする
   * options.heading : リストの上に出す見出し(例「日本のしあい」)
   * options.openAll : true なら、ぜんぶの箱をひらいた状態にする(国でしぼったとき用)
   */
  function renderMatchList(matches, selectedId, onSelect, countriesById, options = {}) {
    headingEl.textContent = `${options.heading || "ぜんぶのしあい"}(${matches.length}しあい)`;
    listEl.innerHTML = "";
    matchButtons = new Map();

    const sorted = matches
      .slice()
      .sort(
        (a, b) =>
          a.stageOrder - b.stageOrder ||
          a.stage.localeCompare(b.stage, "ja") ||
          a.date.localeCompare(b.date) ||
          a.id.localeCompare(b.id)
      );

    // 「グループA」「ラウンド32」などのステージごとにまとめる
    const sections = [];
    sorted.forEach((match) => {
      const last = sections[sections.length - 1];
      if (!last || last.stage !== match.stage) {
        sections.push({ stage: match.stage, stageType: match.stageType, matches: [] });
      }
      sections[sections.length - 1].matches.push(match);
    });

    let lastType = null;
    sections.forEach((section) => {
      // 「グループリーグ」と「けっしょうトーナメント」の大きな見出し
      if (section.stageType !== lastType) {
        const big = document.createElement("h4");
        big.className = "stage-type-heading";
        big.textContent =
          section.stageType === "group"
            ? "🏁 グループリーグ(1回せんリーグ)"
            : "🏆 けっしょうトーナメント(かったら つぎにすすめる)";
        listEl.appendChild(big);
        lastType = section.stageType;
      }

      const details = document.createElement("details");
      details.className = "stage-box";
      // 国でしぼったとき・えらんだしあいがある箱・けっしょうの箱は、ひらいておく
      if (
        options.openAll ||
        section.matches.some((m) => m.id === selectedId) ||
        section.stage === "けっしょう(決勝)"
      ) {
        details.open = true;
      }
      const summary = document.createElement("summary");
      summary.innerHTML = `${escapeHtml(section.stage)} <span class="stage-count">(${section.matches.length}しあい)</span>`;
      details.appendChild(summary);

      const box = document.createElement("div");
      box.className = "stage-matches";
      section.matches.forEach((match) => {
        const btn = buildMatchButton(match, countriesById, onSelect);
        btn.setAttribute("aria-pressed", String(match.id === selectedId));
        matchButtons.set(match.id, btn);
        box.appendChild(btn);
      });
      details.appendChild(box);
      listEl.appendChild(details);
    });
  }

  /** 1つのしあいのボタンをつくる(ホームは左、アウェイは右) */
  function buildMatchButton(match, countriesById, onSelect) {
    const home = countriesById.get(match.homeTeam.countryId);
    const away = countriesById.get(match.awayTeam.countryId);
    let noteText = "";
    if (match.penaltyShootout) {
      noteText = `・PKせん ${match.penaltyShootout.home}-${match.penaltyShootout.away}`;
    } else if (match.extraTime) {
      noteText = "・えんちょうせん";
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "match-btn";
    btn.innerHTML =
      `<span class="match-btn-date">${escapeHtml(match.dateJa)}${noteText ? escapeHtml(noteText) : ""}</span>` +
      `<span class="match-btn-card">` +
      `<span class="mb-team mb-home">${escapeHtml(match.homeTeam.nameJa)}<img class="mb-flag" src="${escapeHtml(home.flag)}" alt=""></span>` +
      `<span class="mb-score">${match.homeTeam.score} - ${match.awayTeam.score}</span>` +
      `<span class="mb-team mb-away"><img class="mb-flag" src="${escapeHtml(away.flag)}" alt="">${escapeHtml(match.awayTeam.nameJa)}</span>` +
      `</span>`;
    btn.addEventListener("click", () => onSelect(match.id));
    return btn;
  }

  /** えらんでいるしあいのしるしを、つけかえる(リストは作りなおさない) */
  function updateSelected(selectedId) {
    matchButtons.forEach((btn, id) => {
      const isOn = id === selectedId;
      btn.setAttribute("aria-pressed", String(isOn));
      if (isOn) {
        const details = btn.closest("details");
        if (details) details.open = true;
      }
    });
  }

  /** 「しあいをえらんでね」のプレースホルダ */
  function renderDetailPlaceholder() {
    detailEl.innerHTML = `<p class="no-data">上のボタンから しあいをえらぶと、ここに くわしいけっかが 出るよ。</p>`;
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

    // ゴールのリスト。数がスコアより少ないときは「かくにん中」と出す(うそのデータでうめない)
    const goalsHtml = (goals, teamScore) => {
      if (!goals.length && teamScore === 0) return `<p class="no-data">ゴールなし</p>`;
      let html = goals.slice().sort(sortByMinute).map(goalRow).join("");
      if (goals.length < teamScore) {
        html += `<p class="no-data">(とくてんの くわしい じょうほうは かくにん中)</p>`;
      }
      return html;
    };

    // PKせん・えんちょうせんの表示
    let extraHtml = "";
    if (match.penaltyShootout) {
      const pk = match.penaltyShootout;
      extraHtml = `<div class="sb-extra">えんちょうせんでも ${home.score} - ${away.score}。PKせんは ${pk.home} - ${pk.away} だったよ</div>`;
    }

    // フォーメーションが「公式でかくにんできたか」で、ことわり書きを出す
    const hasLineup = home.startingPlayers.length || away.startingPlayers.length;
    const formationNote =
      hasLineup && !(home.formationConfirmed && away.formationConfirmed)
        ? `<p class="formation-note">※ 公式のならびが かくにんできていないため、せんしゅの とうろくポジションをもとにした、おおよその ならびです。</p>`
        : "";

    // こうたいの見方のせつめい(先発とこうたいの両方があるときだけ出す)
    const hasSubs = home.substitutions.length || away.substitutions.length;
    const subHint =
      hasLineup && hasSubs
        ? `<p class="sub-hint">せんしゅの下の 黄色い「(66分 ○○)」は、その時間に ○○せんしゅと こうたいして 下がった という意味だよ。</p>`
        : "";

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
          ${extraHtml}
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
            ${goalsHtml(homeGoals, home.score)}
          </div>
          <div class="col-away">
            <p class="col-head">アウェイ:${escapeHtml(away.nameJa)}</p>
            ${goalsHtml(awayGoals, away.score)}
          </div>
        </div>
      </div>

      <div class="match-part">
        <h4><span aria-hidden="true">📋</span> さいしょに出るメンバー(先発)と せんしゅこうたい</h4>
        ${formationNote}
        ${subHint}
        <div class="pitches">
          ${teamLineupBox(home, "home")}
          ${teamLineupBox(away, "away")}
        </div>
      </div>

      <div class="match-part">
        <h4><span aria-hidden="true">🔎</span> じょうほうのもとを見る</h4>
        ${sourcesHtml}
      </div>
    `;
  }

  /**
   * 1チームぶんの箱:コート(先発)+ とちゅうから出たせんしゅ
   * コートの上では、こうたいで下がったせんしゅに「(○分OUT)」と出す。
   * コートの下に、こうたいで出たせんしゅを「名前(○分IN・だれとこうたい)」で出す。
   */
  function teamLineupBox(team, side) {
    if (!team.startingPlayers.length) {
      return `
        <div class="pitch-box">
          <p class="pitch-title">${escapeHtml(team.nameJa)}</p>
          <p class="no-data">先発メンバーと こうたいの じょうほうは かくにん中です</p>
        </div>`;
    }

    const subs = team.substitutions.slice().sort((a, b) => minuteValue(a.minute) - minuteValue(b.minute));
    const subsHtml = subs.length
      ? `<p class="col-head sub-list-head">とちゅうから出たせんしゅ</p>` +
        subs
          .map(
            (s) =>
              `<p class="sub-row">${escapeHtml(s.playerIn)}` +
              `<span class="sub-inout">(<span class="minute">${escapeHtml(s.minute)}分</span>IN・${escapeHtml(s.playerOut)} とこうたい)</span></p>`
          )
          .join("")
      : `<p class="no-data">こうたいの じょうほうは かくにん中です</p>`;

    return `
      <div class="pitch-box">
        <p class="pitch-title">${escapeHtml(team.nameJa)}
          <span class="formation-name">${escapeHtml(team.formation || "")}</span>
        </p>
        ${pitchSvg(team, side)}
        <div class="sub-list">${subsHtml}</div>
      </div>`;
  }

  /**
   * 長い名前を、コートの上で2行に分ける
   * - 「・」があれば、まん中にいちばん近い「・」のうしろで分ける
   * - なければ、まん中で分ける(小さい文字「ェ」などの前では切らない)
   */
  function splitName(name) {
    const text = String(name);
    if (text.length <= 6) return [text];

    const parts = text.split("・");
    if (parts.length >= 2) {
      let best = 1;
      let bestDiff = Infinity;
      for (let i = 1; i < parts.length; i++) {
        const left = parts.slice(0, i).join("・") + "・";
        const right = parts.slice(i).join("・");
        const diff = Math.abs(left.length - right.length);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = i;
        }
      }
      return [parts.slice(0, best).join("・") + "・", parts.slice(best).join("・")];
    }

    let mid = Math.ceil(text.length / 2);
    while (mid < text.length - 1 && /[ァィゥェォャュョッー]/.test(text[mid])) mid++;
    return [text.slice(0, mid), text.slice(mid)];
  }

  /**
   * サッカーコートの上に先発メンバーをならべたSVGをつくる
   * - row 0 がゴールキーパー(いちばん下)、数字が大きいほど前(上)
   * - こうたいで下がったせんしゅには「(○分 かわりに出たせんしゅ)」と出す
   */
  function pitchSvg(team, side) {
    const W = 400;
    const H = 515;
    const teamColor = side === "home" ? "#4da3ff" : "#ff6b6b";

    // 「この先発せんしゅは、何分にだれと交代したか」をしらべられるようにしておく
    const subByOutName = new Map(team.substitutions.map((s) => [s.playerOut, s]));

    // 選手を row(れつ)ごとにまとめる
    const rows = new Map();
    team.startingPlayers.forEach((p) => {
      if (!rows.has(p.row)) rows.set(p.row, []);
      rows.get(p.row).push(p);
    });
    const rowKeys = [...rows.keys()].sort((a, b) => a - b);

    const topY = 75;      // いちばん前のれつの高さ
    const bottomY = 435;  // ゴールキーパーの高さ
    const stepY = rowKeys.length > 1 ? (bottomY - topY) / (rowKeys.length - 1) : 0;

    let players = "";
    rowKeys.forEach((rowKey, rowIndex) => {
      const rowPlayers = rows.get(rowKey);
      const y = bottomY - rowIndex * stepY;
      // 同じれつの、となりの選手との間かく。文字はこの中におさめる
      const spacing = W / (rowPlayers.length + 1);
      const maxTextWidth = Math.min(96, spacing - 8);
      rowPlayers.forEach((p, i) => {
        const x = (W * (i + 1)) / (rowPlayers.length + 1);
        const isGk = p.position === "GK";
        const fill = isGk ? "#ffd166" : teamColor;

        // 名前は2行までに折り返して、よこの選手と重ならないようにする
        const nameLines = splitName(p.name);
        const nameText = nameLines
          .map((line, li) => {
            const fontSize = line.length >= 7 ? 10 : 11.5;
            const tl =
              line.length * fontSize > maxTextWidth
                ? ` textLength="${maxTextWidth}" lengthAdjust="spacingAndGlyphs"`
                : "";
            return `<tspan x="${x}" y="${y + 31 + li * 12}" font-size="${fontSize}"${tl}>${escapeHtml(line)}</tspan>`;
          })
          .join("");

        // こうたいで下がった選手には「(○分 かわりに出たせんしゅ)」と出す
        const sub = subByOutName.get(p.name);
        let outText = "";
        if (sub) {
          const subLabel = `(${sub.minute}分 ${sub.playerIn})`;
          // 長いときは、よこの選手と重ならないように、間かくの中におしこめる
          const tl =
            subLabel.length * 9.5 > maxTextWidth
              ? ` textLength="${maxTextWidth}" lengthAdjust="spacingAndGlyphs"`
              : "";
          outText = `<text x="${x}" y="${y + 31 + nameLines.length * 12}" text-anchor="middle" font-size="9.5"
               fill="#ffd166" stroke="#0b3d22" stroke-width="3" paint-order="stroke"${tl}>${escapeHtml(subLabel)}</text>`;
        }

        players += `
          <g>
            <circle cx="${x}" cy="${y}" r="17" fill="${fill}" stroke="#082042" stroke-width="2"/>
            <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
              font-size="14" font-weight="bold" fill="#082042">${p.number}</text>
            <text text-anchor="middle" font-weight="bold"
              fill="#ffffff" stroke="#0b3d22" stroke-width="3" paint-order="stroke">${nameText}</text>
            ${outText}
          </g>`;
      });
    });

    const title = `${escapeHtml(team.nameJa)}の先発メンバー(フォーメーション ${escapeHtml(team.formation || "かくにん中")})`;

    // コート(たて向きの半分)と、その上の選手たち
    return `
      <svg class="pitch-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
        <rect width="${W}" height="${H}" rx="12" fill="#17643b"/>
        <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
        <line x1="14" y1="44" x2="${W - 14}" y2="44" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
        <path d="M ${W / 2 - 70} 14 A 70 70 0 0 0 ${W / 2 + 70} 14" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
        <rect x="${W / 2 - 95}" y="${H - 86}" width="190" height="72" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
        <rect x="${W / 2 - 46}" y="${H - 48}" width="92" height="34" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
        ${players}
      </svg>`;
  }

  return { init, renderMatchList, updateSelected, renderMatchDetail, renderDetailPlaceholder };
})();
