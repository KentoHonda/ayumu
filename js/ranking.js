/* =========================================================
   ranking.js : 選手ランキングを表示するプログラム
   - 得点 / アシスト / イエローカード / レッドカード をタブで切りかえ
   - 選手の行をタップすると、世界地図でその選手の国が光って、
     その国の試合にしぼりこまれる(地図までスクロールする)
   ========================================================= */

const RankingView = (() => {
  const TABS = [
    { key: "goals", label: "⚽ 得点", unit: "点" },
    { key: "assists", label: "🎯 アシスト", unit: "回" },
    { key: "yellowCards", label: "🟨 イエロー", unit: "まい" },
    { key: "redCards", label: "🟥 レッド", unit: "まい" },
  ];

  let tabsEl;         // タブボタンをならべる場所
  let listEl;         // ランキングの行をならべる場所
  let rankings;       // rankings.json の中身
  let countriesById;  // 国コード → 国データ
  let onCountryTap;   // 行がタップされたときによぶ関数
  let currentKey = "goals";

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function init(rankingData, byId, onTap) {
    rankings = rankingData;
    countriesById = byId;
    onCountryTap = onTap;
    tabsEl = document.getElementById("ranking-tabs");
    listEl = document.getElementById("ranking-list");

    // タブボタン
    tabsEl.innerHTML = TABS.map(
      (t) =>
        `<button type="button" class="rank-tab" data-key="${t.key}" aria-pressed="${t.key === currentKey}">${t.label}</button>`
    ).join("");
    tabsEl.addEventListener("click", (event) => {
      const btn = event.target.closest(".rank-tab");
      if (!btn) return;
      currentKey = btn.dataset.key;
      tabsEl.querySelectorAll(".rank-tab").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn))
      );
      renderList();
    });

    // 選手の行のタップ(リスト全体で1回だけ受け取る)
    listEl.addEventListener("click", (event) => {
      const row = event.target.closest(".rank-row");
      if (row && onCountryTap) onCountryTap(row.dataset.country);
    });

    renderList();
  }

  function renderList() {
    const tab = TABS.find((t) => t.key === currentKey);
    const rows = rankings[currentKey] || [];
    if (!rows.length) {
      listEl.innerHTML = `<p class="no-data">データがないよ</p>`;
      return;
    }
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
        `aria-label="${escapeHtml(r.player)}(${escapeHtml(country.nameJa)})、${r.value}${tab.unit}。おすと地図でこの国が光るよ">` +
        `<span class="rank-pos">${medal}</span>` +
        `<img class="rank-flag" src="${escapeHtml(country.flag)}" alt="" loading="lazy">` +
        `<span class="rank-main">` +
        `<span class="rank-name">${escapeHtml(r.player)} <span class="rank-country">${escapeHtml(country.nameJa)}</span></span>` +
        `<span class="rank-bar" aria-hidden="true"><span style="width:${barWidth}%"></span></span>` +
        `</span>` +
        `<span class="rank-value">${r.value}<small>${tab.unit}</small></span>` +
        `</button>`;
    });
    listEl.innerHTML = html;
  }

  return { init };
})();
