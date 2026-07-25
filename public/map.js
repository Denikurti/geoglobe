// D3 world map — North America + Europe + Middle East clickable.
const GeoMap = (() => {
  const CLICKABLE = {
    // North America
    840: "USA", 124: "Canada", 484: "Mexico",
    // Western Europe
    826: "United Kingdom", 276: "Germany", 250: "France", 643: "Russia",
    380: "Italy", 724: "Spain", 804: "Ukraine", 616: "Poland",
    528: "Netherlands", 756: "Switzerland", 752: "Sweden",
    578: "Norway", 56: "Belgium", 620: "Portugal", 40: "Austria",
    208: "Denmark", 246: "Finland", 372: "Ireland",
    // Balkans
    300: "Greece", 642: "Romania", 100: "Bulgaria", 688: "Serbia",
    191: "Croatia", 70: "Bosnia", 705: "Slovenia", 807: "North Macedonia",
    8: "Albania", 499: "Montenegro", 383: "Kosovo",
    348: "Hungary", 203: "Czech Republic", 703: "Slovakia",
    // Turkey
    792: "Turkey",
    // Middle East
    376: "Israel", 275: "Palestine", 682: "Saudi Arabia",
    364: "Iran", 368: "Iraq", 400: "Jordan", 422: "Lebanon",
    760: "Syria", 784: "UAE", 634: "Qatar", 887: "Yemen", 512: "Oman",
    414: "Kuwait", 48: "Bahrain",
    // North Africa
    818: "Egypt", 434: "Libya", 788: "Tunisia", 12: "Algeria", 504: "Morocco",
    729: "Sudan", 706: "Somalia", 231: "Ethiopia", 404: "Kenya",
    // Sub-Saharan Africa
    566: "Nigeria", 24: "Angola", 710: "South Africa",
    800: "Uganda", 646: "Rwanda", 180: "DR Congo", 288: "Ghana",
    686: "Senegal", 466: "Mali", 854: "Burkina Faso", 204: "Benin",
    120: "Cameroon", 694: "Sierra Leone", 270: "Gambia",
    508: "Mozambique", 716: "Zimbabwe", 454: "Malawi", 834: "Tanzania",
    // East Asia
    156: "China", 392: "Japan", 410: "South Korea", 408: "North Korea",
    158: "Taiwan", 496: "Mongolia",
    // South Asia
    356: "India", 586: "Pakistan", 50: "Bangladesh", 524: "Nepal",
    64: "Bhutan", 144: "Sri Lanka", 462: "Maldives",
    // Southeast Asia
    764: "Thailand", 704: "Vietnam", 360: "Indonesia", 608: "Philippines",
    458: "Malaysia", 702: "Singapore", 116: "Cambodia", 418: "Laos",
    104: "Myanmar", 96: "Brunei", 626: "Timor-Leste",
    // Central Asia
    4: "Afghanistan", 860: "Uzbekistan", 398: "Kazakhstan",
    762: "Tajikistan", 417: "Kyrgyzstan", 795: "Turkmenistan",
    // Caucasus
    31: "Azerbaijan", 268: "Georgia", 51: "Armenia",
    // Oceania
    36: "Australia", 554: "New Zealand", 598: "Papua New Guinea",
    // South America
    76: "Brazil", 32: "Argentina", 152: "Chile", 170: "Colombia",
    604: "Peru", 862: "Venezuela", 858: "Uruguay", 68: "Bolivia",
    600: "Paraguay", 218: "Ecuador",
  };

  const COORDS = {
    USA: [-98, 39], Canada: [-106, 56], Mexico: [-102, 23],
    "United Kingdom": [-1.5, 52], Germany: [10, 51], France: [2, 46], Russia: [90, 62],
    Italy: [12, 42], Spain: [-3.7, 40], Ukraine: [32, 49], Poland: [19, 52],
    Netherlands: [5.3, 52.3], Switzerland: [8.2, 46.8], Sweden: [18, 62],
    Turkey: [35, 39], Norway: [10, 62], Belgium: [4.5, 50.5], Portugal: [-8, 39.5],
    Austria: [14, 47], Greece: [22, 39], Romania: [25, 46],
    Bulgaria: [25, 43], Serbia: [21, 44], Croatia: [15.5, 45.5],
    Bosnia: [17.5, 44], Slovenia: [14.8, 46.1], "North Macedonia": [21.7, 41.6],
    Albania: [20, 41], Montenegro: [19.4, 42.7], Kosovo: [21, 42.6], Ireland: [-8, 53],
    Denmark: [10, 56], Finland: [26, 62], Hungary: [19, 47],
    "Czech Republic": [15.5, 49.8], Slovakia: [19.5, 48.7],
    Israel: [34.8, 31.5], Palestine: [35.2, 31.9], "Saudi Arabia": [45, 24],
    Iran: [53, 32], Iraq: [43, 33], Jordan: [36.5, 31], Lebanon: [35.5, 33.9],
    Syria: [38, 35], Egypt: [30, 26], UAE: [54, 24], Qatar: [51.2, 25.3],
    Yemen: [47, 16], Oman: [57, 22], Kuwait: [47.6, 29.3], Bahrain: [50.5, 26],
    Libya: [17, 27], Tunisia: [9, 34], Algeria: [3, 28], Morocco: [-6, 32],
    Sudan: [30, 16], Somalia: [46, 6], Ethiopia: [40, 9], Kenya: [38, 1],
    Nigeria: [8, 10], Angola: [18, -12], "South Africa": [25, -29],
    // East Asia
    China: [104, 35], Japan: [138, 36], "South Korea": [128, 37],
    "North Korea": [127, 40], Taiwan: [121, 23.5], Mongolia: [103, 47],
    // South Asia
    India: [78, 22], Pakistan: [69, 30], Bangladesh: [90, 24],
    Nepal: [84, 28], Bhutan: [90.5, 27.5], "Sri Lanka": [80.7, 7.8], Maldives: [73.2, 3.2],
    // Southeast Asia
    Thailand: [101, 15], Vietnam: [108, 16], Indonesia: [118, -2],
    Philippines: [122, 12], Malaysia: [110, 3.5], Singapore: [103.8, 1.35],
    Cambodia: [105, 12.5], Laos: [103, 18], Myanmar: [96, 19],
    Brunei: [114.7, 4.5], "Timor-Leste": [125.7, -8.8],
    // Central Asia
    Afghanistan: [67, 33], Uzbekistan: [63, 41], Kazakhstan: [67, 48],
    Tajikistan: [71, 39], Kyrgyzstan: [74.5, 41], Turkmenistan: [59, 40],
    // Caucasus
    Azerbaijan: [47.5, 40.5], Georgia: [43.5, 42], Armenia: [45, 40],
    // Oceania
    Australia: [134, -25], "New Zealand": [172, -42], "Papua New Guinea": [144, -6],
    // Sub-Saharan Africa
    Uganda: [32.4, 1.4], Rwanda: [29.9, -1.9], "DR Congo": [24, -3],
    Ghana: [-1, 8], Senegal: [-14, 14], Mali: [-2, 17], "Burkina Faso": [-1.6, 12.4],
    Benin: [2.3, 9.3], Cameroon: [12.4, 5.7], "Sierra Leone": [-11.8, 8.5],
    Gambia: [-15.3, 13.4], Mozambique: [35, -18], Zimbabwe: [29.2, -20],
    Malawi: [34.3, -13.5], Tanzania: [35, -6],
    // South America
    Brazil: [-51, -10], Argentina: [-64, -34], Chile: [-71, -35],
    Colombia: [-74, 4], Peru: [-75, -10], Venezuela: [-66, 8],
    Uruguay: [-56, -33], Bolivia: [-64, -17], Paraguay: [-58, -23], Ecuador: [-78, -2],
    NATO: [6, 48], "Five Eyes": [-30, 50],
  };

  const TYPE_COLOR = {
    trade: "#3fb950", rivalry: "#f85149", war: "#f85149",
    intelligence: "#58a6ff", finance: "#d29922", ideology: "#bc8cff",
    military: "#ff7b72", sanctions: "#f85149",
  };
  const RES_ICON = { oil_gas: "🛢️", rare_earths: "⛏️", lithium: "🔋", water: "💧", agriculture: "🌾", nuclear: "☢️", coal: "⚫" };

  let svg, gMap, gOverlay, gNews = null, projection, path, centroids = {}, dims = { w: 0, h: 0 };
  let zoomBehavior = null;
  let onClick = () => {};
  // Kept for re-layout on resize (fixes blank map when the pane had 0 width at init)
  let _svgEl = null, _countries = [], _clickable = [];
  let _lastOverlay = null, _lastNews = null, _lastConflicts = null;

  // Reliable size: fall back to the parent / window when the SVG measures 0
  // (can happen on mobile before flex layout settles → projection fits to nothing).
  function measure(el) {
    let r = el.getBoundingClientRect();
    let w = r.width, h = r.height;
    if (w < 2 || h < 2) {
      const pr = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
      w = (pr && pr.width) || window.innerWidth || 375;
      h = (pr && pr.height) || window.innerHeight || 600;
    }
    return { w, h };
  }

  function colorFor(type) {
    const key = (type || "").split(/[+\/\s]/)[0];
    return TYPE_COLOR[key] || "#8b949e";
  }

  function endpointFor(name, fallback) {
    const c = COORDS[name];
    if (!c) return [fallback[0] - 50, fallback[1] - 50];
    const p = projection(c);
    if (!p) return [fallback[0] - 50, fallback[1] - 50];
    return p;
  }

  async function init(svgEl, clickHandler) {
    onClick = clickHandler;
    _svgEl = svgEl;
    svg = d3.select(svgEl);
    dims = measure(svgEl);
    svg.attr("viewBox", `0 0 ${dims.w} ${dims.h}`);
    gMap = svg.append("g");
    gOverlay = svg.append("g");
    gNews = svg.append("g");

    const BASE_LABEL = 11;
    const BASE_STROKE = 0.5;

    const zoom = zoomBehavior = d3.zoom()
      .scaleExtent([0.5, 20])
      .on("zoom", (e) => {
        const k = e.transform.k;
        gMap.attr("transform", e.transform);
        gOverlay.attr("transform", e.transform);
        gNews.attr("transform", e.transform);
        if (!_newsVisible) { gNews.attr("visibility","hidden").style("display","none"); }
        gNews.selectAll(".news-dot-pulse").attr("r", 6 / k);
        gNews.selectAll(".news-dot-core").attr("r", 2.3 / k);
        gMap.selectAll("text.clabel").style("font-size", `${BASE_LABEL / k}px`);
        gOverlay.selectAll("text.clabel").style("font-size", `${BASE_LABEL / k}px`);
        applyLabelLOD(k);
        gMap.selectAll("path.country").style("stroke-width", `${BASE_STROKE / k}px`);
        gOverlay.selectAll("path.conn, path.flow").style("stroke-width", `${2 / k}px`);
        gOverlay.selectAll("circle").attr("r", 3 / k);
      });
    svg.call(zoom).style("cursor", "grab");
    svg.on("mousedown.cursor", () => svg.style("cursor", "grabbing"))
       .on("mouseup.cursor",   () => svg.style("cursor", "grab"));

    const topo = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    const countries = topojson.feature(topo, topo.objects.countries).features;
    const clickable = countries.filter((f) => CLICKABLE[+f.id]);
    _countries = countries; _clickable = clickable;

    projection = d3.geoNaturalEarth1()
      .rotate([-15, 0])
      .fitExtent([[10, 10], [dims.w - 10, dims.h - 10]],
        { type: "FeatureCollection", features: clickable });
    path = d3.geoPath(projection);

    gMap.selectAll("path.country")
      .data(countries)
      .join("path")
      .attr("class", (d) => "country " + (CLICKABLE[+d.id] ? "na" : "other"))
      .attr("d", path)
      .attr("data-name", (d) => CLICKABLE[+d.id] || "")
      .on("click", (e, d) => { const n = CLICKABLE[+d.id]; if (n) onClick(n); });

    clickable.forEach((f) => { centroids[CLICKABLE[+f.id]] = path.centroid(f); });

    // All clickable countries get a label; LOD controls zoom threshold
    gMap.selectAll("text.clabel")
      .data(clickable)
      .join("text")
      .attr("class", "clabel")
      .attr("data-mink", (d) => {
        const a = path.area(d);
        // Larger area = visible sooner; tiny island-states need deep zoom
        return a > 4000 ? 0.6 : a > 1200 ? 1 : a > 300 ? 1.8 : a > 80 ? 3 : 5;
      })
      .attr("x", (d) => { const n = CLICKABLE[+d.id]; const c = COORDS[n]; return c ? projection(c)[0] : path.centroid(d)[0]; })
      .attr("y", (d) => { const n = CLICKABLE[+d.id]; const c = COORDS[n]; return c ? projection(c)[1] : path.centroid(d)[1]; })
      .text((d) => {
        // Shorten very long names so they fit at default zoom
        const n = CLICKABLE[+d.id];
        const a = path.area(d);
        if (a < 300) return n; // tiny countries: full name only when zoomed, fits fine
        const SHORT = {
          "United Kingdom": "UK", "Saudi Arabia": "Saudi Arabia",
          "South Africa": "S. Africa", "North Korea": "N. Korea",
          "South Korea": "S. Korea", "North Macedonia": "N. Macedonia",
          "Czech Republic": "Czech Rep.", "DR Congo": "DR Congo",
          "New Zealand": "N. Zealand", "Papua New Guinea": "PNG",
          "Sri Lanka": "Sri Lanka", "Timor-Leste": "Timor",
          "Sierra Leone": "S. Leone", "Burkina Faso": "Burkina",
          "Equatorial Guinea": "Eq. Guinea",
        };
        return SHORT[n] || n;
      });
    applyLabelLOD(1);
  }

  // Google-Maps-style LOD: small countries' labels only appear when zoomed in
  function applyLabelLOD(k) {
    gMap.selectAll("text.clabel").style("display", function () {
      return k >= +(this.dataset.mink || 1) ? null : "none";
    });
  }

  // Recompute the projection for the current pane size and re-place everything.
  // Called on window/pane resize and once after init in case the pane was 0-width.
  function resize() {
    if (!_svgEl || !projection) return;
    const next = measure(_svgEl);
    if (Math.abs(next.w - dims.w) < 1 && Math.abs(next.h - dims.h) < 1) return;
    dims = next;
    svg.attr("viewBox", `0 0 ${dims.w} ${dims.h}`);
    projection.fitExtent([[10, 10], [dims.w - 10, dims.h - 10]],
      { type: "FeatureCollection", features: _clickable });
    path = d3.geoPath(projection);

    gMap.selectAll("path.country").attr("d", path);
    gMap.selectAll("text.clabel")
      .attr("x", (d) => { const n = CLICKABLE[+d.id]; const c = COORDS[n]; return c ? projection(c)[0] : path.centroid(d)[0]; })
      .attr("y", (d) => { const n = CLICKABLE[+d.id]; const c = COORDS[n]; return c ? projection(c)[1] : path.centroid(d)[1]; });
    _clickable.forEach((f) => { centroids[CLICKABLE[+f.id]] = path.centroid(f); });

    // Re-place any active overlays against the new projection
    if (_lastOverlay) updateOverlays(_lastOverlay.data, _lastOverlay.opts);
    // News + conflict dots are positioned with the projection too, so they
    // must be redrawn on resize or they stay stuck at their init coordinates.
    if (_lastNews) setNewsDots(_lastNews.names, _lastNews.onHover, _lastNews.onLeave, _lastNews.onDotClick);
    if (_lastConflicts) setConflictDots(_lastConflicts.conflicts, _lastConflicts.onClick);
  }

  function setActive(name) {
    gMap.selectAll("path.country").classed("active", function () {
      return this.getAttribute("data-name") === name;
    });
  }

  function centroidOf(name) {
    if (centroids[name]) return centroids[name];
    const c = COORDS[name];
    if (c) { const p = projection(c); if (p) return p; }
    return [dims.w / 2, dims.h / 2];
  }

  function updateOverlays(data, opts) {
    _lastOverlay = { data, opts };
    gOverlay.selectAll("*").remove();
    const legend = document.getElementById("legend");
    legend.style.display = opts.connections ? "block" : "none";
    if (!data) return;
    const src = centroidOf(data.country);

    if (opts.connections) {
      const conns = data.connections || [];
      conns.forEach((c) => {
        const end = endpointFor(c.to, src);
        const col = colorFor(c.type);
        const mx = (src[0] + end[0]) / 2, my = Math.min(src[1], end[1]) - 50;
        gOverlay.append("path")
          .attr("class", "conn").attr("stroke", col)
          .attr("d", `M${src[0]},${src[1]} Q${mx},${my} ${end[0]},${end[1]}`);
        gOverlay.append("circle").attr("cx", end[0]).attr("cy", end[1]).attr("r", 3).attr("fill", col);
        gOverlay.append("text").attr("class", "clabel").attr("x", end[0]).attr("y", end[1] - 6).text(c.to);
      });
      legend.innerHTML = `
        <div class="row"><span class="swatch" style="background:#3fb950"></span>trade</div>
        <div class="row"><span class="swatch" style="background:#f85149"></span>war / rivalry</div>
        <div class="row"><span class="swatch" style="background:#58a6ff"></span>intelligence</div>
        <div class="row"><span class="swatch" style="background:#d29922"></span>finance</div>
        <div class="row"><span class="swatch" style="background:#bc8cff"></span>ideology</div>`;
    }

    if (opts.money) {
      (data.follow_the_money || []).forEach((m, i) => {
        const named = Object.keys(COORDS).find((k) => (m.flow + " " + m.detail).includes(k));
        const end = named ? endpointFor(named, src) : [src[0] + 80 * Math.cos(i * 1.2), src[1] + 80 * Math.sin(i * 1.2)];
        gOverlay.append("path").attr("class", "flow").attr("d", `M${src[0]},${src[1]} L${end[0]},${end[1]}`);
        gOverlay.append("text").attr("class", "clabel").attr("x", end[0]).attr("y", end[1] - 6).text(m.flow);
      });
    }

    if (opts.resources) {
      const res = data.resources || {};
      Object.keys(res).forEach((k, i) => {
        const icon = RES_ICON[k]; if (!icon) return;
        const angle = (i / Object.keys(res).length) * Math.PI * 2;
        const x = src[0] + 50 * Math.cos(angle), y = src[1] + 50 * Math.sin(angle);
        gOverlay.append("text").attr("class", "resicon").attr("x", x).attr("y", y)
          .attr("text-anchor", "middle").text(icon)
          .append("title").text(`${k.replace(/_/g, " ")}: ${res[k]}`);
      });
    }
  }

  function setConflictDots(conflicts, onClick) {
    _lastConflicts = { conflicts, onClick };
    gOverlay.selectAll("g.conflict-dot-grp").remove();
    conflicts.forEach(c => {
      c.countries.forEach(name => {
        const coord = centroidOf(name);
        if (!coord) return;
        const g = gOverlay.append("g").attr("class", "conflict-dot-grp")
          .attr("transform", `translate(${coord[0] + 10},${coord[1] - 10})`)
          .style("cursor", "pointer");
        const cls = c.intensity === "critical" ? "conflict-critical" : c.intensity === "high" ? "conflict-high" : "conflict-medium";
        g.append("circle").attr("r", 10).attr("class", `conflict-pulse ${cls}`);
        g.append("circle").attr("r", 4).attr("class", `conflict-core ${cls}`);
        g.on("click", (e) => { e.stopPropagation(); onClick(c); });
      });
    });
  }

  function setNewsDots(names, onHover, onLeave, onDotClick) {
    _lastNews = { names, onHover, onLeave, onDotClick };
    gNews.selectAll("g.news-dot-grp").remove();
    names.forEach(name => {
      const c = centroidOf(name);
      if (!c) return;
      const g = gNews.append("g").attr("class", "news-dot-grp")
        .attr("transform", `translate(${c[0]},${c[1]})`).style("cursor","pointer");
      g.append("circle").attr("r", 6).attr("class", "news-dot-pulse");
      g.append("circle").attr("r", 2.3).attr("class", "news-dot-core");
      g.on("mouseover", (e) => onHover(name, e.clientX, e.clientY))
       .on("mouseout",  ()  => onLeave())
       .on("click",     (e) => { e.stopPropagation(); onDotClick(name); });
    });
  }

  let _newsVisible = true;
  function showNewsDots(visible) {
    _newsVisible = visible;
    if (gNews) {
      gNews.attr("visibility", visible ? "visible" : "hidden");
      gNews.style("display", visible ? null : "none");
    }
  }

  function highlightCountries(nameSet) {
    gMap.selectAll("path.country").each(function(d) {
      const name = CLICKABLE[+d.id];
      if (name) this.classList.toggle("agent-glow", nameSet.has(name));
    });
  }

  function zoomBy(factor) {
    if (svg && zoomBehavior) svg.transition().duration(250).call(zoomBehavior.scaleBy, factor);
  }
  function resetZoom() {
    if (svg && zoomBehavior) svg.transition().duration(400).call(zoomBehavior.transform, d3.zoomIdentity);
  }

  return { init, resize, setActive, centroidOf, updateOverlays, highlightCountries, setNewsDots, showNewsDots, setConflictDots, zoomBy, resetZoom };
})();
