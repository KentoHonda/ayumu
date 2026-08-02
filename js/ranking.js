/* =========================================================
   ranking.js : 選手ランキングを表示するプログラム
   - 得点 / アシスト / イエローカード / レッドカード の4つを、
     試合リストと同じ「ひらいたりとじたりできる箱」でならべる
   - 選手の行をタップすると、世界地図でその選手の国が光って、
     その国の試合にしぼりこまれる(地図までスクロールする)
   ========================================================= */

const RankingView = (() => {
  const KINDS = [
    { key: "goals", label: "⚽ 得点ランキング", unit: "点" },
    { key: "assists", label: "🎯 アシストランキング", unit: "回" },
    { key: "yellowCards", label: "🟨 イエローカード", unit: "まい" },
    { key: "redCards", label: "🟥 レッドカード", unit: "まい" },
  ];

  let boxesEl;        // 4つの箱をならべる場所
  let countriesById;  // 国コード → 国データ
  let onCountryTap;   // 行がタップされたときによぶ関数

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function init(rankings, byId, onTap) {
    countriesById = byId;
    onCountryTap = onTap;
    boxesEl = document.getElementById("ranking-boxes");

    // 4つの箱をつくる(さいしょは「得点」だけひらいておく)
    boxesEl.innerHTML = KINDS.map((kind, i) => {
      const rows = rankings[kind.key] || [];
      return (
        `<details class="stage-box"${i === 0 ? " open" : ""}>` +
        `<summary>${kind.label} <span class="stage-count">(${rows.length}人)</span></summary>` +
        `<div class="rank-list">${rowsHtml(kind, rows)}</div>` +
        `</details>`
      );
    }).join("");

    // 選手の行のタップ(ぜんたいで1回だけ受け取る)
    boxesEl.addEventListener("click", (event) => {
      const row = event.target.closest(".rank-row");
      if (row && onCountryTap) onCountryTap(row.dataset.country);
    });
  }

  /** 1つのランキングの、ぜんぶの行のHTML */
  function rowsHtml(kind, rows) {
    if (!rows.length) return `<p class="no-data">データがないよ</p>`;
    const max = rows[0].value || 1;

    // 同じ数の選手は同じ順位にする
    let html = "";
    let prevValue = null;
    let rank = 0;
    rows.forEach((r, i) => {
      if (r.value !== prevValue) {
        rank = i + 1;
        prevValue = r.value;
      }
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}位`;
      const country = countriesById.get(r.countryId);
      const barWidth = Math.max((r.value / max) * 100, 6);
      html +=
        `<button type="button" class="rank-row${rank <= 3 ? " rank-top3" : ""}" data-country="${escapeHtml(r.countryId)}" ` +
        `aria-label="${escapeHtml(r.player)}(${escapeHtml(country.nameJa)})、${r.value}${kind.unit}。おすと地図でこの国が光るよ">` +
        `<span class="rank-pos">${medal}</span>` +
        `<img class="rank-flag" src="${escapeHtml(country.flag)}" alt="" loading="lazy">` +
        `<span class="rank-main">` +
        `<span class="rank-name">${escapeHtml(r.player)} <span class="rank-country">${escapeHtml(country.nameJa)}</span></span>` +
        `<span class="rank-bar" aria-hidden="true"><span style="width:${barWidth}%"></span></span>` +
        `</span>` +
        `<span class="rank-value">${r.value}<small>${kind.unit}</small></span>` +
        `</button>`;
    });
    return html;
  }

  return { init };
})();
