/* =========================================================
   map.js : せかい地図をかくプログラム
   - D3.js と world-atlas の地図データ(TopoJSON)をつかいます
   - 出場国をクリック(タップ)できるようにします
   - しあいをえらぶと、2つの国を線でむすんでスコアを出します
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

  let countriesByMapId = new Map(); // 地図の国番号 → 国データ
  let featureByCountryId = new Map(); // 国コード(JPN など) → 地図のかたち

  /**
   * 地図をつくる
   * @param {object} worldTopo world-110m.json(TopoJSONデータ)
   * @param {Array}  countries countries.json の国リスト
   * @param {Function} onCountrySelect 国がえらばれたときによばれる関数
   */
  function init(worldTopo, countries, onCountrySelect) {
    // TopoJSON を、D3でかける形(GeoJSON)にかえる
    const world = topojson.feature(worldTopo, worldTopo.objects.countries);

    countriesByMapId = new Map(countries.map((c) => [String(c.mapId), c]));

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
        const c = countriesByMapId.get(String(d.id));
        return `${c.nameJa}(${c.nameKana})をえらぶ`;
      })
      .on("click", (event, d) => {
        const c = countriesByMapId.get(String(d.id));
        onCountrySelect(c.id);
      })
      .on("keydown", (event, d) => {
        // Enter か スペースキーでもえらべるようにする
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const c = countriesByMapId.get(String(d.id));
          onCountrySelect(c.id);
        }
      })
      .each(function (d) {
        // あとで色をつけられるように、「国コード → 地図のかたち」もおぼえておく
        const c = countriesByMapId.get(String(d.id));
        featureByCountryId.set(c.id, d);
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
    lineLayer.selectAll("*").remove();
    labelLayer.selectAll("*").remove();
  }

  /** 国を1つだけ、黄色でえらんだ状態にする */
  function highlightCountry(country) {
    clearHighlights();
    paintCountry(country.id, "selected");
    addCountryLabel(country, null);
  }

  /**
   * しあいを地図にかく
   * - ホームの国を青、アウェイの国を赤にする
   * - 2つの国を点線でむすび、まん中にスコアを出す
   */
  function showMatch(match, homeCountry, awayCountry) {
    clearHighlights();
    paintCountry(homeCountry.id, "home-team");
    paintCountry(awayCountry.id, "away-team");

    // 2つの首都のあいだを、地球の上のいちばん短い道(大圏コース)でむすぶ。
    // こうすると、日付変更線をまたいでも、へんに長い線にならない。
    const interpolate = d3.geoInterpolate(homeCountry.anchorLngLat, awayCountry.anchorLngLat);
    const points = d3.range(0, 1.0001, 1 / 60).map(interpolate);
    lineLayer
      .append("path")
      .datum({ type: "LineString", coordinates: points })
      .attr("class", "match-line")
      .attr("d", geoPath);

    // 線のまん中にスコアのふだを出す
    const mid = projection(interpolate(0.5));
    addScoreBadge(mid, `${match.homeTeam.score} - ${match.awayTeam.score}`);

    // 両はしに、国旗と国名(ホーム/アウェイつき)のラベルを出す
    addCountryLabel(homeCountry, "ホーム");
    addCountryLabel(awayCountry, "アウェイ");
  }

  /** 国コードで国に色クラスをつける */
  function paintCountry(countryId, className) {
    const feature = featureByCountryId.get(countryId);
    if (!feature) return;
    countryPaths.filter((d) => d === feature).classed(className, true);
  }

  /** スコアのふだ(黄色)をかく */
  function addScoreBadge(xy, text) {
    const g = labelLayer.append("g").attr("transform", `translate(${xy[0]}, ${xy[1]})`);
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
  }

  /** 国旗+国名のラベルをかく(sideLabel は「ホーム」「アウェイ」か null) */
  function addCountryLabel(country, sideLabel) {
    const feature = featureByCountryId.get(country.id);
    if (!feature) return;
    // ラベルは国のまん中の、少し下に出す
    const center = geoPath.centroid(feature);
    const y = center[1] + 14;

    const g = labelLayer.append("g").attr("transform", `translate(${center[0]}, ${y})`);
    const text = sideLabel ? `${country.nameJa}(${sideLabel})` : country.nameJa;
    const label = g
      .append("text")
      .attr("class", "map-label-text")
      .attr("x", 12) // 国旗のぶん、右にずらす
      .attr("dominant-baseline", "middle")
      .attr("font-size", 14)
      .text(text);
    const box = label.node().getBBox();
    g.insert("rect", "text")
      .attr("class", "map-label-bg")
      .attr("x", -14)
      .attr("y", box.y - 4)
      .attr("width", box.width + 34)
      .attr("height", box.height + 8)
      .attr("rx", 7);
    g.append("image")
      .attr("href", country.flag)
      .attr("x", -10)
      .attr("y", -7)
      .attr("width", 18)
      .attr("height", 14)
      .attr("preserveAspectRatio", "none");
    // ラベルが地図のそとにはみ出さないよう、ぜんたいを少し中央よりにする
    const totalWidth = box.width + 34;
    const gx = Math.min(Math.max(center[0], totalWidth / 2 + 4), WIDTH - totalWidth / 2 - 4);
    g.attr("transform", `translate(${gx - totalWidth / 2 + 14}, ${Math.min(y, HEIGHT - 14)})`);
  }

  // そとから使えるものだけを公開する
  return { init, highlightCountry, showMatch, clearHighlights };
})();
