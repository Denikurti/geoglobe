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
    // Sub-Saharan
    566: "Nigeria", 24: "Angola", 710: "South Africa",
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
    China: [104, 35], Japan: [138, 36], "South Korea": [128, 37],
    Australia: [134, -25], "North Korea": [127, 40], India: [78, 22],
    NATO: [6, 48], "Five Eyes": [-30, 50],
  };

  const TYPE_COLOR = {
    trade: "#3fb950", rivalry: "#f85149", war: "#f85149",
    intelligence: "#58a6ff", finance: "#d29922", ideology: "#bc8cff",
    military: "#ff7b72", sanctions: "#f85149",
  };
  const RES_ICON = { oil_gas: "🛢️", rare_earths: "⛏️", lithium: "🔋", water: "💧", agriculture: "🌾", nuclear: "☢️", coal: "⚫" };

  let svg, gMap, gOverlay, gNews = null, gAncient = null, projection, path, centroids = {}, dims = { w: 0, h: 0 };
  let onClick = () => {};

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
    svg = d3.select(svgEl);
    const rect = svgEl.getBoundingClientRect();
    dims = { w: rect.width, h: rect.height };
    svg.attr("viewBox", `0 0 ${dims.w} ${dims.h}`);
    gMap = svg.append("g");
    gOverlay = svg.append("g");
    gNews = svg.append("g");

    const BASE_LABEL = 11;
    const BASE_STROKE = 0.5;

    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on("zoom", (e) => {
        const k = e.transform.k;
        gMap.attr("transform", e.transform);
        gOverlay.attr("transform", e.transform);
        gNews.attr("transform", e.transform);
        if (gAncient) gAncient.attr("transform", e.transform);
        gNews.selectAll(".news-dot-pulse").attr("r", 9 / k);
        gNews.selectAll(".news-dot-core").attr("r", 3.5 / k);
        gMap.selectAll("text.clabel").style("font-size", `${BASE_LABEL / k}px`);
        gOverlay.selectAll("text.clabel").style("font-size", `${BASE_LABEL / k}px`);
        gMap.selectAll("path.country").style("stroke-width", `${BASE_STROKE / k}px`);
        gOverlay.selectAll("path.conn, path.flow").style("stroke-width", `${2 / k}px`);
        gOverlay.selectAll("circle").attr("r", 3 / k);
        if (gAncient) {
          gAncient.selectAll("text.ancient-label").style("font-size", `${13 / k}px`);
          gAncient.selectAll("text.city-name").style("font-size", `${10 / k}px`);
          gAncient.selectAll(".city-glow").attr("r", 9 / k);
          gAncient.selectAll(".city-dot").attr("r", 4 / k);
        }
      });
    svg.call(zoom).style("cursor", "grab");
    svg.on("mousedown.cursor", () => svg.style("cursor", "grabbing"))
       .on("mouseup.cursor",   () => svg.style("cursor", "grab"));

    const topo = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    const countries = topojson.feature(topo, topo.objects.countries).features;
    const clickable = countries.filter((f) => CLICKABLE[+f.id]);

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

    const labelSet = new Set([
      "USA", "Canada", "Mexico",
      "United Kingdom", "Germany", "France", "Russia", "Italy", "Spain",
      "Ukraine", "Poland", "Sweden", "Norway", "Turkey",
      "Greece", "Romania", "Bulgaria", "Serbia", "Croatia", "Hungary",
      "Czech Republic", "Ireland", "Denmark", "Finland", "Turkey",
      "Bosnia", "Albania", "Montenegro", "North Macedonia", "Kosovo", "Slovenia",
      "Israel", "Saudi Arabia", "Iran", "Iraq", "Egypt", "Syria",
      "Jordan", "Yemen", "Oman",
      "Libya", "Tunisia", "Algeria", "Morocco", "Sudan",
      "Ethiopia", "Nigeria", "South Africa", "Kenya",
    ]);
    gMap.selectAll("text.clabel")
      .data(clickable.filter((f) => labelSet.has(CLICKABLE[+f.id])))
      .join("text")
      .attr("class", "clabel")
      .attr("x", (d) => { const n = CLICKABLE[+d.id]; const c = COORDS[n]; return c ? projection(c)[0] : path.centroid(d)[0]; })
      .attr("y", (d) => { const n = CLICKABLE[+d.id]; const c = COORDS[n]; return c ? projection(c)[1] : path.centroid(d)[1]; })
      .text((d) => CLICKABLE[+d.id]);
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

  // ── Ancient / Religion mode ──────────────────────────────────────────────
  function setAncientMode(on, onCityClick) {
    gMap.selectAll("text.clabel").style("display", on ? "none" : null);
    if (gAncient) { gAncient.remove(); gAncient = null; }

    if (!on) {
      // Restore modern country colors AND click handlers
      gMap.selectAll("path.country")
        .attr("class", d => "country " + (CLICKABLE[+d.id] ? "na" : "other"))
        .on("click", (e, d) => { const n = CLICKABLE[+d.id]; if (n) onClick(n); });
      return;
    }

    // Disable country clicks in ancient mode — only city markers are interactive
    gMap.selectAll("path.country").on("click", null);

    // Color by ancient region
    gMap.selectAll("path.country").attr("class", function(d) {
      const reg = ANCIENT_MAP[+d.id];
      return "country ancient-country " + (reg ? reg.cls : "ancient-unknown");
    });

    // Ancient overlay group (sits above gOverlay)
    gAncient = svg.append("g");

    // Region name labels — one per unique region, at centroid of first matching country
    const drawnRegions = new Set();
    gMap.selectAll("path.country").each(function(d) {
      const reg = ANCIENT_MAP[+d.id];
      if (!reg || drawnRegions.has(reg.name)) return;
      drawnRegions.add(reg.name);
      const c = path.centroid(d);
      if (!c || isNaN(c[0])) return;
      gAncient.append("text")
        .attr("class", "ancient-label")
        .attr("x", c[0]).attr("y", c[1])
        .text(reg.name);
    });

    // City markers
    ANCIENT_CITIES.forEach(city => {
      const pt = projection([city.lon, city.lat]);
      if (!pt) return;
      const g = gAncient.append("g")
        .attr("class", "city-marker")
        .attr("transform", `translate(${pt[0]},${pt[1]})`)
        .style("cursor", "pointer")
        .on("click", (e) => { e.stopPropagation(); onCityClick(city); });

      g.append("circle").attr("r", 9).attr("class", `city-glow city-glow-${city.type}`);
      g.append("circle").attr("r", 4).attr("class", `city-dot city-dot-${city.type}`);
      g.append("text").attr("class", "city-name")
        .attr("x", 7).attr("y", 4)
        .text(city.name);
    });
  }

  function updateOverlays(data, opts) {
    gOverlay.selectAll("*").remove();
    const legend = document.getElementById("legend");
    legend.style.display = opts.connections ? "block" : "none";
    if (!data) return;
    const src = centroidOf(data.country);

    if (opts.connections) {
      const conns = (data.connections || []).filter((c) => !c.year || c.year <= opts.year);
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

  function setTimelineColors(colorMap) {
    gMap.selectAll("path.country").each(function(d) {
      const name = CLICKABLE[+d.id];
      if (!name) return;
      const cls = colorMap[name];
      this.classList.remove("tl-at-war", "tl-tension", "tl-occupied", "tl-allied");
      if (cls) this.classList.add(cls);
    });
  }

  function clearTimelineColors() {
    gMap.selectAll("path.country")
      .classed("tl-at-war", false).classed("tl-tension", false)
      .classed("tl-occupied", false).classed("tl-allied", false);
  }

  function setNewsDots(names, onHover, onLeave, onDotClick) {
    gNews.selectAll("g.news-dot-grp").remove();
    names.forEach(name => {
      const c = centroidOf(name);
      if (!c) return;
      const g = gNews.append("g").attr("class", "news-dot-grp")
        .attr("transform", `translate(${c[0]},${c[1]})`).style("cursor","pointer");
      g.append("circle").attr("r", 9).attr("class", "news-dot-pulse");
      g.append("circle").attr("r", 3.5).attr("class", "news-dot-core");
      g.on("mouseover", (e) => onHover(name, e.clientX, e.clientY))
       .on("mouseout",  ()  => onLeave())
       .on("click",     (e) => { e.stopPropagation(); onDotClick(name); });
    });
  }

  function showNewsDots(visible) {
    if (gNews) gNews.style("display", visible ? null : "none");
  }

  function highlightCountries(nameSet) {
    gMap.selectAll("path.country").each(function(d) {
      const name = CLICKABLE[+d.id];
      if (name) this.classList.toggle("agent-glow", nameSet.has(name));
    });
  }

  return { init, setActive, centroidOf, updateOverlays, setAncientMode, highlightCountries, setNewsDots, showNewsDots, setConflictDots, setTimelineColors, clearTimelineColors };
})();
