// D3 world map — North America + Europe + Middle East clickable.
const GeoMap = (() => {
  const CLICKABLE = {
    840: "USA", 124: "Canada", 484: "Mexico",
    826: "UK", 276: "Germany", 250: "France", 643: "Russia",
    380: "Italy", 724: "Spain", 804: "Ukraine", 616: "Poland",
    528: "Netherlands", 756: "Switzerland", 752: "Sweden",
    792: "Turkey", 578: "Norway", 56: "Belgium", 620: "Portugal",
    40: "Austria", 300: "Greece", 642: "Romania",
    376: "Israel", 275: "Palestine", 682: "Saudi Arabia",
    364: "Iran", 368: "Iraq", 400: "Jordan", 422: "Lebanon",
    760: "Syria", 818: "Egypt", 784: "UAE", 634: "Qatar", 887: "Yemen",
  };

  const COORDS = {
    USA: [-98, 39], Canada: [-106, 56], Mexico: [-102, 23],
    UK: [-1.5, 52], Germany: [10, 51], France: [2, 46], Russia: [90, 62],
    Italy: [12, 42], Spain: [-3.7, 40], Ukraine: [32, 49], Poland: [19, 52],
    Netherlands: [5.3, 52.3], Switzerland: [8.2, 46.8], Sweden: [18, 62],
    Turkey: [35, 39], Norway: [10, 62], Belgium: [4.5, 50.5], Portugal: [-8, 39.5],
    Austria: [14, 47], Greece: [22, 39], Romania: [25, 46],
    Israel: [34.8, 31.5], Palestine: [35.2, 31.9], "Saudi Arabia": [45, 24],
    Iran: [53, 32], Iraq: [43, 33], Jordan: [36.5, 31], Lebanon: [35.5, 33.9],
    Syria: [38, 35], Egypt: [30, 26], UAE: [54, 24], Qatar: [51.2, 25.3],
    Yemen: [47, 16],
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

  let svg, gMap, gOverlay, gAncient = null, projection, path, centroids = {}, dims = { w: 0, h: 0 };
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

    const BASE_LABEL = 11;
    const BASE_STROKE = 0.5;

    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on("zoom", (e) => {
        const k = e.transform.k;
        gMap.attr("transform", e.transform);
        gOverlay.attr("transform", e.transform);
        if (gAncient) gAncient.attr("transform", e.transform);
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

    const labelSet = new Set(["USA", "Canada", "Mexico", "UK", "Germany", "France",
      "Russia", "Italy", "Spain", "Ukraine", "Poland", "Sweden", "Turkey", "Norway",
      "Israel", "Saudi Arabia", "Iran", "Iraq", "Egypt", "Syria"]);
    gMap.selectAll("text.clabel")
      .data(clickable.filter((f) => labelSet.has(CLICKABLE[+f.id])))
      .join("text")
      .attr("class", "clabel")
      .attr("x", (d) => path.centroid(d)[0])
      .attr("y", (d) => path.centroid(d)[1])
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

  function highlightCountries(nameSet) {
    gMap.selectAll("path.country").each(function(d) {
      const name = CLICKABLE[+d.id];
      if (name) this.classList.toggle("agent-glow", nameSet.has(name));
    });
  }

  return { init, setActive, centroidOf, updateOverlays, setAncientMode, highlightCountries };
})();
