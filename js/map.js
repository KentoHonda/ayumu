/* =========================================================
   map.js : せかい地図をかくプログラム
   - D3.js と world-atlas の地図データ(TopoJSON)をつかいます
   - ワールドカップに出た48か国を緑色にして、クリック(タップ)できるようにします
   - しあいをえらぶと、2つの国を線でむすんでスコアを出します
   - 地図に形がない小さな島国(カーボベルデ・キュラソー)は丸いしるしで表示します
   - イングランドとスコットランドは、地図では同じ「イギリス」の形になります
   ========================================================= */

const WorldMap = (() => {
  // 地図の大きさ(SVGの中の座標)
  const WIDTH = 960;
  const HEIGHT = 500;

  let svg;          // 地図ぜんたいのSVG
  let mapRoot;      // ズームでうごかすグループ
  let projection;   // 「地球のどこ」を「画面のどこ」にうつすか計算するもの
  let geoPath;      // 国のかたちをSVGのpathにするもの
  let zoom;         // ズームのしくみ
  let lineLayer;    // たいせんラインをかくグループ
  let labelLayer;   // 国名やスコアのラベルをかくグループ
  let countryPaths; // すべての国のpath(D3のselection)

  let countriesByMapId = new Map();   // 地図の国番号 → その場所の国データ(ふつうは1つ、イギリスは2つ)
  let featureByCountryId = new Map(); // 国コード(JPN など) → 地図のかたち
  let markerByCountryId = new Map();  // 国コード → 丸いしるし(地図に形がない島国用)

  // ズームしても文字が大きくなりすぎないように、いまの拡大率をおぼえておく
  let currentZoomK = 1;
  let anchoredItems = []; // ラベルやスコアのふだ({ g, x, y })。拡大率に合わせて大きさを直す

  /** ラベルやふだを、地図の場所(x, y)にはりつけて、ズームのぶんだけ縮めて表示する */
  function applyAnchoredTransform(item) {
    item.g.attr("transform", `translate(${item.x}, ${item.y}) scale(${1 / currentZoomK})`);
  }

  /**
   * 地図をつくる
   * @param {object} worldTopo world-110m.json(TopoJSONデータ)
   * @param {Array}  countries countries.json の国リスト
   * @param {Function} onCountrySelect 国がえらばれたときによばれる関数(国コードのリストをわたす)
   */
  function init(worldTopo, countries, onCountrySelect) {
    // TopoJSON を、D3でかける形(GeoJSON)にかえる
    const world = topojson.feature(worldTopo, worldTopo.objects.countries);

    // 同じ場所に2つのチームがあることもあるので、リストでおぼえる(例:イギリス=イングランド+スコットランド)
    countriesByMapId = new Map();
    countries.forEach((c) => {
      if (c.mapId === null) return; // 地図に形がない国は、あとで丸いしるしにする
      if (!countriesByMapId.has(c.mapId)) countriesByMapId.set(c.mapId, []);
      countriesByMapId.get(c.mapId).push(c);
    });

    projection = d3
      .geoNaturalEarth1()
      .fitExtent(
        [
          [8, 8],
          [WIDTH - 8, HEIGHT - 8],
        ],
        { type: "Sphere" }
      );
    geoPath = d3.geoPath(projection);

    svg = d3
      .select("#world-map")
      .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    mapRoot = svg.append("g");

    // 海(地球のまるいはんい)
    mapRoot
      .append("path")
      .datum({ type: "Sphere" })
      .attr("class", "ocean")
      .attr("d", geoPath);

    // すべての国をかく
    countryPaths = mapRoot
      .append("g")
      .selectAll("path.country")
      .data(world.features)
      .join("path")
      .attr("class", "country")
      .attr("d", geoPath);

    // ワールドカップに出た国だけ、クリックとキーボードでえらべるようにする
    countryPaths
      .filter((d) => countriesByMapId.has(String(d.id)))
      .classed("joined", true)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => {
        const list = countriesByMapId.get(String(d.id));
        return `${list.map((c) => c.nameJa).join("と")}をえらぶ`;
      })
      .on("click", (event, d) => {
        const list = countriesByMapId.get(String(d.id));
        onCountrySelect(list.map((c) => c.id));
      })
      .on("keydown", (event, d) => {
        // Enter か スペースキーでもえらべるようにする
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const list = countriesByMapId.get(String(d.id));
          onCountrySelect(list.map((c) => c.id));
        }
      })
      .each(function (d) {
        // あとで色をつけられるように、「国コード → 地図のかたち」もおぼえておく
        countriesByMapId.get(String(d.id)).forEach((c) => featureByCountryId.set(c.id, d));
      });

    // 地図に形がない小さな島国は、首都の場所に丸いしるしをかく
    const markerLayer = mapRoot.append("g");
    countries
      .filter((c) => c.mapId === null)
      .forEach((c) => {
        const [x, y] = projection(c.anchorLngLat);
        const marker = markerLayer
          .append("circle")
          .attr("class", "country-marker joined")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 5)
          .attr("tabindex", 0)
          .attr("role", "button")
          .attr("aria-label", `${c.nameJa}(${c.nameKana})をえらぶ`)
          .on("click", () => onCountrySelect([c.id]))
          .on("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onCountrySelect([c.id]);
            }
          });
        markerByCountryId.set(c.id, marker);
      });

    // たいせんラインとラベルは、国の上にかさねてかく
    lineLayer = mapRoot.append("g");
    labelLayer = mapRoot.append("g");

    // ズーム(拡大・縮小)のしくみ
    zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .translateExtent([
        [0, 0],
        [WIDTH, HEIGHT],
      ])
      .on("zoom", (event) => {
        mapRoot.attr("transform", event.transform);
        // 地図を大きくしても、文字やしるしは大きくなりすぎないように縮めなおす
        currentZoomK = event.transform.k;
        anchoredItems.forEach(applyAnchoredTransform);
        markerByCountryId.forEach((m) => m.attr("r", 5 / currentZoomK));
      });
    svg.call(zoom).on("dblclick.zoom", null);

    // 「+」「−」「もとにもどす」ボタン
    d3.select("#zoom-in").on("click", () => svg.transition().duration(300).call(zoom.scaleBy, 1.6));
    d3.select("#zoom-out").on("click", () => svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.6));
    d3.select("#zoom-reset").on("click", () =>
      svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity)
    );
  }

  /** 地図の色やラインを、ぜんぶもとにもどす */
  function clearHighlights() {
    countryPaths.classed("selected", false).classed("home-team", false).classed("away-team", false);
    markerByCountryId.forEach((m) =>
      m.classed("selected", false).classed("home-team", false).classed("away-team", false)
    );
    lineLayer.selectAll("*").remove();
    labelLayer.selectAll("*").remove();
    anchoredItems = [];
  }

  /** 国(1つか2つ)を黄色でえらんだ状態にする */
  function highlightCountries(countryList) {
    clearHighlights();
    countryList.forEach((c) => {
      paintCountry(c.id, "selected");
      addCountryLabel(c, null);
    });
  }

  /**
   * しあいを地図にかく
   * - ホームの国を青、アウェイの国を赤にする
   * - 2つの国を点線のアーチ(にじの形)でむすび、てっぺんにスコアを出す
   * - 近い国どうしでも、スコアや国名が重ならないようにする
   */
  function showMatch(match, homeCountry, awayCountry) {
    clearHighlights();
    paintCountry(homeCountry.id, "home-team");
    paintCountry(awayCountry.id, "away-team");

    // 2つの国を、上にふくらんだ1本のアーチでむすぶ。
    // 地球の反対がわどうし(日本×ブラジルなど)でも、線が地図の右はしと
    // 左はしに分かれないように、かならず地図の中を通る1本の線でかく。
    // ※ カーブのてっぺんは「もち上げる高さ」の半分しか上がらないので、2倍しておく
    const a = projection(homeCountry.anchorLngLat);
    const b = projection(awayCountry.anchorLngLat);
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const lift = Math.min(Math.max(40, dist * 0.22), 90);
    const cx = (a[0] + b[0]) / 2;
    const cy = Math.max((a[1] + b[1]) / 2 - lift * 2, 18); // 地図の上からはみ出さないようにする
    lineLayer
      .append("path")
      .attr("class", "match-line")
      .attr("d", `M ${a[0]} ${a[1]} Q ${cx} ${cy} ${b[0]} ${b[1]}`);
    // アーチのてっぺん(まん中)の場所に、スコアのふだを出す
    const badgeXY = [(a[0] + 2 * cx + b[0]) / 4, (a[1] + 2 * cy + b[1]) / 4];

    // スコアのふだを出す(PKせんがあれば、それも出す)
    let scoreText = `${match.homeTeam.score} - ${match.awayTeam.score}`;
    if (match.penaltyShootout) {
      scoreText += ` (PK ${match.penaltyShootout.home}-${match.penaltyShootout.away})`;
    }
    const badge = addScoreBadge(badgeXY, scoreText);

    // 両はしに、国旗と国名(ホーム/アウェイつき)のラベルを出す。
    // 近い国どうしでラベルが重なったら、あとの方を下にずらす。
    const homeLabel = addCountryLabel(homeCountry, "ホーム");
    const awayLabel = addCountryLabel(awayCountry, "アウェイ");
    fixLabelOverlap(homeLabel, awayLabel);

    // スコアのふだが国名ラベルと重なっていたら、ふだをラベルの上ににがす
    [homeLabel, awayLabel].forEach((label) => {
      if (!label || !badge) return;
      const xOverlap = Math.abs(badge.x - label.x) < (badge.width + label.width) / 2 + 8;
      const yOverlap = Math.abs(badge.y - label.y) < 32;
      if (xOverlap && yOverlap) {
        badge.y = label.y - 40;
        applyAnchoredTransform(badge);
      }
    });
  }

  /** 2つのラベルが重なっていたら、2つめを下にずらす */
  function fixLabelOverlap(label1, label2) {
    if (!label1 || !label2) return;
    const xOverlap = Math.abs(label1.x - label2.x) < (label1.width + label2.width) / 2 + 6;
    const yOverlap = Math.abs(label1.y - label2.y) < 26;
    if (xOverlap && yOverlap) {
      label2.y = label1.y + 26;
      applyAnchoredTransform(label2);
    }
  }

  /** 国コードで国に色クラスをつける(地図の形、または丸いしるし) */
  function paintCountry(countryId, className) {
    const feature = featureByCountryId.get(countryId);
    if (feature) {
      countryPaths.filter((d) => d === feature).classed(className, true);
      return;
    }
    const marker = markerByCountryId.get(countryId);
    if (marker) marker.classed(className, true);
  }

  /** 国のラベルをかく場所(地図の形のまん中、または丸いしるしの場所) */
  function labelCenterOf(country) {
    const feature = featureByCountryId.get(country.id);
    if (feature) return geoPath.centroid(feature);
    return projection(country.anchorLngLat);
  }

  /** スコアのふだ(黄色)をかく。場所の情報をかえす */
  function addScoreBadge(xy, text) {
    const g = labelLayer.append("g");
    const label = g
      .append("text")
      .attr("class", "score-badge-text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 20)
      .text(text);
    const box = label.node().getBBox();
    g.insert("rect", "text")
      .attr("class", "score-badge-bg")
      .attr("x", box.x - 12)
      .attr("y", box.y - 6)
      .attr("width", box.width + 24)
      .attr("height", box.height + 12)
      .attr("rx", 10);
    const item = { g, x: xy[0], y: xy[1], width: box.width + 24, height: box.height + 12 };
    anchoredItems.push(item);
    applyAnchoredTransform(item);
    return item;
  }

  /** 国旗+国名のラベルをかく(sideLabel は「ホーム」「アウェイ」か null)。場所の情報をかえす */
  function addCountryLabel(country, sideLabel) {
    const center = labelCenterOf(country);
    if (!center) return null;
    const y = center[1] + 14;

    const g = labelLayer.append("g");
    const text = sideLabel ? `${country.nameJa}(${sideLabel})` : country.nameJa;
    const label = g
      .append("text")
      .attr("class", "map-label-text")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 14)
      .text(text);
    const box = label.node().getBBox();
    const totalWidth = box.width + 34;
    // ラベルのまん中が(0, 0)になるように、国旗・わく・文字をならべる
    label.attr("x", -totalWidth / 2 + 26);
    g.insert("rect", "text")
      .attr("class", "map-label-bg")
      .attr("x", -totalWidth / 2)
      .attr("y", box.y - 4)
      .attr("width", totalWidth)
      .attr("height", box.height + 8)
      .attr("rx", 7);
    g.append("image")
      .attr("href", country.flag)
      .attr("x", -totalWidth / 2 + 4)
      .attr("y", -7)
      .attr("width", 18)
      .attr("height", 14)
      .attr("preserveAspectRatio", "none");
    // ラベルが地図のそとにはみ出さないよう、ぜんたいを少し中央よりにする
    const gx = Math.min(Math.max(center[0], totalWidth / 2 + 4), WIDTH - totalWidth / 2 - 4);
    const ty = Math.min(y, HEIGHT - 14);
    const item = { g, x: gx, y: ty, width: totalWidth };
    anchoredItems.push(item);
    applyAnchoredTransform(item);
    return item;
  }

  // そとから使えるものだけを公開する
  return { init, highlightCountries, showMatch, clearHighlights };
})();
