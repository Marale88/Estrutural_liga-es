const materials = {
  pinus: { name: "Pinus", ft: 45, fc: 32, fv: 6, E: 8500, fy: 0, fu: 45 },
  eucalipto: { name: "Eucalipto", ft: 75, fc: 52, fv: 9, E: 14500, fy: 0, fu: 75 },
  ipe: { name: "Ipê", ft: 115, fc: 78, fv: 13, E: 21000, fy: 0, fu: 115 },
  compensado: { name: "Compensado", ft: 32, fc: 28, fv: 4.5, E: 6500, fy: 0, fu: 32 },
  mdf: { name: "MDF", ft: 18, fc: 22, fv: 3, E: 3000, fy: 0, fu: 18 },
  a36: { name: "Aço ASTM A36", ft: 250, fc: 250, fv: 145, E: 200000, fy: 250, fu: 400 },
  sae1020: { name: "SAE 1020", ft: 300, fc: 300, fv: 170, E: 205000, fy: 300, fu: 420 },
  sae1045: { name: "SAE 1045", ft: 530, fc: 530, fv: 300, E: 205000, fy: 530, fu: 625 },
  inox: { name: "Inox", ft: 215, fc: 215, fv: 125, E: 193000, fy: 215, fu: 505 },
  aluminio: { name: "Alumínio", ft: 150, fc: 150, fv: 85, E: 69000, fy: 150, fu: 240 },
};

const connectionTypes = {
  beamColumn: {
    label: "Tipo A · Viga × Pilar frontal",
    path: ["Carga", "Viga", "Fixadores", "Chapa", "Fixadores", "Pilar"],
    description: "A força sai da viga, atravessa o grupo de fixadores e entra no pilar pela chapa frontal.",
  },
  beamBeam: {
    label: "Tipo B · Viga × Viga alinhada",
    path: ["Carga", "Viga A", "Fixadores", "Chapa", "Viga B"],
    description: "As vigas trabalham alinhadas e a chapa ajuda a transferir tração, cortante e momento.",
  },
  lap: {
    label: "Tipo C · Emenda por sobreposição",
    path: ["Carga", "Viga A", "Fixadores", "Sobreposição", "Viga B"],
    description: "A região sobreposta transforma a carga axial em cisalhamento nos fixadores e esmagamento local.",
  },
  angle: {
    label: "Tipo D · Ligação por cantoneira",
    path: ["Carga", "Viga", "Fixadores", "Cantoneira", "Fixadores", "Apoio"],
    description: "A cantoneira cria duas abas resistentes e adiciona uma leitura didática de excentricidade.",
  },
};

const fastenerTypes = {
  nail: { label: "Pregos", material: "sae1020", checks: ["cisalhamento", "arrancamento", "esmagamento", "arrancamento da cabeça"] },
  pin: { label: "Pinos", material: "sae1045", checks: ["cisalhamento", "esmagamento", "arrancamento"] },
  bolt: { label: "Parafusos", material: "a36", checks: ["cisalhamento", "esmagamento", "seção líquida", "atrito didático"] },
};

const state = {
  mode: "didatico",
};

const $ = (selector) => document.querySelector(selector);
const form = $("#labForm");
const modeTabs = [...document.querySelectorAll(".mode-tab")];

const inputs = {
  connectionType: $("#connectionType"),
  fastenerType: $("#fastenerType"),
  beamALength: $("#beamALength"),
  beamAWidth: $("#beamAWidth"),
  beamAHeight: $("#beamAHeight"),
  beamAMaterial: $("#beamAMaterial"),
  beamBWidth: $("#beamBWidth"),
  beamBHeight: $("#beamBHeight"),
  plateThickness: $("#plateThickness"),
  plateMaterial: $("#plateMaterial"),
  diameter: $("#diameter"),
  fastenerLength: $("#fastenerLength"),
  rows: $("#rows"),
  cols: $("#cols"),
  spacing: $("#spacing"),
  edge: $("#edge"),
  hasWasher: $("#hasWasher"),
  hasNut: $("#hasNut"),
  loadP: $("#loadP"),
  loadN: $("#loadN"),
  loadV: $("#loadV"),
  loadM: $("#loadM"),
  loadT: $("#loadT"),
  loadFactor: $("#loadFactor"),
};

const els = {
  connectionLabel: $("#connectionLabel"),
  statusBadge: $("#statusBadge"),
  loadPath: $("#loadPath"),
  planSvg: $("#planSvg"),
  sectionSvg: $("#sectionSvg"),
  isoSvg: $("#isoSvg"),
  modeTitle: $("#modeTitle"),
  modeContent: $("#modeContent"),
  governingFailure: $("#governingFailure"),
  summaryCards: $("#summaryCards"),
  stressMap: $("#stressMap"),
  checksTable: $("#checksTable"),
  exportPng: $("#exportPng"),
  printReport: $("#printReport"),
};

function boot() {
  fillMaterialSelect(inputs.beamAMaterial, ["pinus", "eucalipto", "ipe", "compensado", "mdf", "a36", "aluminio"], "eucalipto");
  fillMaterialSelect(inputs.plateMaterial, ["a36", "sae1020", "sae1045", "inox", "aluminio", "compensado"], "a36");

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.mode = tab.dataset.mode;
      modeTabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      render();
    });
  });
  els.printReport.addEventListener("click", () => window.print());
  els.exportPng.addEventListener("click", exportPlanPng);
  render();
}

function fillMaterialSelect(select, keys, selected) {
  select.innerHTML = keys.map((key) => `<option value="${key}">${materials[key].name}</option>`).join("");
  select.value = selected;
}

function readData() {
  const factor = Number(inputs.loadFactor.value);
  const rows = clamp(Math.round(Number(inputs.rows.value)), 1, 4);
  const cols = clamp(Math.round(Number(inputs.cols.value)), 1, 5);
  return {
    connectionType: inputs.connectionType.value,
    fastenerType: inputs.fastenerType.value,
    beamALength: num(inputs.beamALength),
    beamAWidth: num(inputs.beamAWidth),
    beamAHeight: num(inputs.beamAHeight),
    beamAMaterial: inputs.beamAMaterial.value,
    beamBWidth: num(inputs.beamBWidth),
    beamBHeight: num(inputs.beamBHeight),
    plateThickness: num(inputs.plateThickness),
    plateMaterial: inputs.plateMaterial.value,
    diameter: num(inputs.diameter),
    fastenerLength: num(inputs.fastenerLength),
    rows,
    cols,
    spacing: num(inputs.spacing),
    edge: num(inputs.edge),
    hasWasher: inputs.hasWasher.checked,
    hasNut: inputs.hasNut.checked,
    loadP: num(inputs.loadP) * 1000 * factor,
    loadN: num(inputs.loadN) * 1000 * factor,
    loadV: num(inputs.loadV) * 1000 * factor,
    loadM: num(inputs.loadM) * 1000000 * factor,
    loadT: num(inputs.loadT) * 1000000 * factor,
    factor,
  };
}

function analyze(data) {
  const beam = materials[data.beamAMaterial];
  const plate = materials[data.plateMaterial];
  const fastener = materials[fastenerTypes[data.fastenerType].material];
  const count = data.rows * data.cols;
  const shearDemand = Math.hypot(data.loadP, data.loadV) / Math.max(1, count);
  const fastenerArea = Math.PI * data.diameter ** 2 / 4;
  const beamArea = data.beamAWidth * data.beamAHeight;
  const inertia = data.beamAWidth * data.beamAHeight ** 3 / 12;
  const sectionModulus = inertia / (data.beamAHeight / 2);
  const netArea = Math.max(1, (data.beamAWidth - data.rows * data.diameter) * data.beamAHeight);
  const polar = Math.PI * data.diameter ** 4 / 32;
  const effectiveLength = data.beamALength;
  const k = 1;
  const pcr = Math.PI ** 2 * beam.E * inertia / (k * effectiveLength) ** 2;
  const washerBoost = data.hasWasher ? 1.15 : 1;
  const nutBoost = data.hasNut ? 1.08 : 1;
  const pulloutArea = Math.max(1, data.edge * data.beamAHeight * count);

  const checks = [
    check("Fixadores", "Cisalhamento", shearDemand / fastenerArea, fastener.fv, "τ = V/A"),
    check("Viga A", "Esmagamento local", shearDemand / (data.diameter * data.beamAHeight), beam.fc * washerBoost, "σb = V/(d·t)"),
    check("Chapa", "Esmagamento local", shearDemand / (data.diameter * data.plateThickness), plate.fc * washerBoost, "σb = V/(d·t)"),
    check("Viga A", "Arrancamento", Math.hypot(data.loadP, data.loadV) / pulloutArea, beam.fv * nutBoost, "σarr = V/(e·t)"),
    check("Viga A", "Seção líquida", data.loadP / netArea, beam.ft, "σ = P/Al"),
    check("Viga A", "Flexão", data.loadM / Math.max(1, sectionModulus), beam.ft, "σ = M/W"),
    check("Viga A", "Compressão", data.loadN / Math.max(1, beamArea), beam.fc, "σ = N/A"),
    check("Viga A", "Compressão + flexão", data.loadN / Math.max(1, beamArea) + data.loadM / Math.max(1, sectionModulus), beam.fc, "σ = N/A + M/W"),
    check("Fixadores", "Torção", (data.loadT * data.diameter / 2) / Math.max(1, polar * count), fastener.fv, "τ = T·r/J"),
    check("Viga A", "Flambagem", data.loadN, pcr, "N ≤ Pcr"),
  ];

  if (data.connectionType === "angle") {
    checks.push(check("Cantoneira", "Flexão simplificada na aba", (data.loadV * data.edge) / Math.max(1, data.plateThickness * data.edge ** 2 / 6), plate.fy || plate.ft, "σ = M/W"));
  }

  const governing = checks.reduce((max, item) => (item.utilization > max.utilization ? item : max), checks[0]);
  const status = governing.utilization >= 1 ? "failed" : governing.utilization >= 0.8 ? "warning" : "safe";
  const reactions = {
    horizontal: data.loadP / 1000,
    vertical: (data.loadV + data.loadN) / 1000,
    moment: data.loadM / 1000000,
  };

  return {
    beam,
    plate,
    fastener,
    count,
    checks,
    governing,
    status,
    reactions,
    shearDemand,
    netArea,
    pcr,
  };
}

function check(element, mode, stress, resistance, formula) {
  const safeResistance = Math.max(0.0001, resistance);
  return {
    element,
    mode,
    stress,
    resistance: safeResistance,
    utilization: stress / safeResistance,
    formula,
  };
}

function render() {
  const data = readData();
  const result = analyze(data);
  const meta = connectionTypes[data.connectionType];

  els.connectionLabel.textContent = meta.label;
  els.statusBadge.textContent = statusText(result.status);
  els.statusBadge.className = `status ${result.status}`;
  renderLoadPath(meta.path);
  renderSummary(data, result);
  renderChecks(result.checks);
  renderStressMap(result.checks);
  renderModeContent(data, result, meta);
  drawPlan(data, result);
  drawSection(data);
  drawIso(data);
}

function renderLoadPath(path) {
  els.loadPath.innerHTML = path.map((step) => `<span class="path-chip">${step}</span>`).join("");
}

function renderSummary(data, result) {
  const governingText = result.governing.utilization >= 1
    ? "Falhou"
    : result.governing.utilization >= 0.8
      ? "Próximo do limite"
      : "Seguro";

  els.governingFailure.innerHTML = `
    <strong>${governingText}</strong>
    <p>Modo governante: ${result.governing.mode.toLowerCase()} em ${result.governing.element}. Utilização ${pct(result.governing.utilization)}.</p>
  `;

  els.summaryCards.innerHTML = [
    card("Fixadores", `${result.count}`, fastenerTypes[data.fastenerType].label),
    card("Carga total", `${fmt(Math.hypot(data.loadP, data.loadV) / 1000)} kN`, `Fator ${fmt(data.factor)}`),
    card("Reações", `${fmt(result.reactions.horizontal)} / ${fmt(result.reactions.vertical)} kN`, "Horizontal / vertical"),
    card("Material base", result.beam.name, `E = ${fmt(result.beam.E)} MPa`),
  ].join("");
}

function card(title, value, note) {
  return `<article class="summary-card"><p>${title}</p><strong>${value}</strong><p>${note}</p></article>`;
}

function renderChecks(checks) {
  els.checksTable.innerHTML = checks.map((item) => `
    <tr>
      <td>${item.element}<br><small>${item.mode}</small></td>
      <td>${fmt(item.stress)} MPa</td>
      <td>${fmt(item.resistance)} ${item.mode === "Flambagem" ? "N" : "MPa"}</td>
      <td>${pct(item.utilization)}</td>
    </tr>
  `).join("");
}

function renderStressMap(checks) {
  const byElement = {};
  checks.forEach((item) => {
    byElement[item.element] = Math.max(byElement[item.element] || 0, item.utilization);
  });
  els.stressMap.innerHTML = Object.entries(byElement).map(([element, utilization]) => {
    const css = utilization >= 1 ? "util-failed" : utilization >= 0.8 ? "util-warning" : "util-safe";
    return `
      <div class="stress-row">
        <span>${element}</span>
        <span class="bar"><span class="${css}" style="width:${Math.min(100, utilization * 100)}%"></span></span>
        <span>${pct(utilization)}</span>
      </div>
    `;
  }).join("");
}

function renderModeContent(data, result, meta) {
  if (state.mode === "engenharia") {
    els.modeTitle.textContent = "Modo Engenharia";
    els.modeContent.innerHTML = `
      <p>Sequência aplicada: Carga → Estática → Esforços internos → Tensões → Resistência do material → Aprova ou falha.</p>
      <span class="formula">ΣFx = 0 → Rx = ${fmt(result.reactions.horizontal)} kN
ΣFy = 0 → Ry = ${fmt(result.reactions.vertical)} kN
ΣM = 0 → M = ${fmt(result.reactions.moment)} kN·m
Força média por fixador = ${fmt(result.shearDemand / 1000)} kN</span>
      <ul>
        ${result.checks.slice(0, 6).map((item) => `<li>${item.mode}: ${item.formula}, utilização ${pct(item.utilization)}.</li>`).join("")}
      </ul>
    `;
    return;
  }

  if (state.mode === "ruptura") {
    els.modeTitle.textContent = "Modo Ruptura";
    els.modeContent.innerHTML = `
      <p>A carga está multiplicada por <strong>${fmt(data.factor)}</strong>. O primeiro limite alcançado define o modo de falha governante.</p>
      <span class="formula">Falha governante: ${result.governing.element} · ${result.governing.mode}
Utilização = ${pct(result.governing.utilization)}
Critério: ${result.governing.formula}</span>
      <ul>
        <li>Verde: baixa utilização.</li>
        <li>Amarelo: próximo do limite educacional.</li>
        <li>Vermelho: falha prevista pelo modelo simplificado.</li>
      </ul>
    `;
    return;
  }

  els.modeTitle.textContent = "Modo Didático";
  els.modeContent.innerHTML = `
    <p>${meta.description}</p>
    <ul>
      <li>A carga entra no sistema, passa pelos elementos resistentes e se distribui entre ${result.count} fixadores.</li>
      <li>O simulador compara tensões calculadas com propriedades didáticas dos materiais, sem aplicar norma técnica.</li>
      <li>O mapa de tensões resume onde a ligação está trabalhando mais.</li>
    </ul>
  `;
}

function drawPlan(data, result) {
  const svg = els.planSvg;
  const width = 820;
  const height = 380;
  const rows = data.rows;
  const cols = data.cols;
  const groupWidth = (cols - 1) * data.spacing;
  const groupHeight = (rows - 1) * data.spacing;
  const centerX = width / 2;
  const centerY = height / 2;
  const beamW = clamp(data.beamALength, 360, 680);
  const beamH = clamp(data.beamAWidth, 90, 180);
  const plateW = Math.max(180, groupWidth + data.edge * 2);
  const plateH = Math.max(95, groupHeight + data.edge * 2);
  const beamX = centerX - beamW / 2;
  const beamY = centerY - beamH / 2;
  const overlapDraw = Math.max(plateW * 0.42, data.spacing + data.edge);
  const d = clamp(data.diameter * 1.5, 12, 28);

  const fasteners = [];
  const startX = centerX - groupWidth / 2;
  const startY = centerY - groupHeight / 2;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      fasteners.push(`<circle class="fastener" cx="${startX + c * data.spacing}" cy="${startY + r * data.spacing}" r="${d / 2}" />`);
    }
  }

  const primaryElement = data.connectionType === "beamColumn" || data.connectionType === "angle"
    ? `<rect class="element-beam-a" x="${beamX}" y="${beamY}" width="${beamW}" height="${beamH}" rx="5" />`
    : `<rect class="element-beam-a" x="${beamX}" y="${beamY}" width="${beamW / 2 + overlapDraw / 2}" height="${beamH}" rx="5" />`;

  const secondElement = data.connectionType === "beamColumn"
    ? `<rect class="element-beam-b" x="${centerX + beamW / 2 - 115}" y="45" width="120" height="290" rx="4" />`
    : data.connectionType === "angle"
      ? `<path class="element-angle" d="M${centerX - 120} ${centerY + 70} H${centerX + 120} V${centerY + 112} H${centerX - 78} V${centerY + 170} H${centerX - 120} Z" />`
      : `<rect class="element-beam-b" x="${centerX - overlapDraw / 2}" y="${beamY}" width="${beamW / 2 + overlapDraw / 2}" height="${beamH}" rx="5" />`;

  const jointLine = data.connectionType === "beamColumn" || data.connectionType === "angle"
    ? ""
    : `<line class="dim" x1="${centerX}" y1="${beamY - 10}" x2="${centerX}" y2="${beamY + beamH + 10}" />`;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = defs() + `
    ${primaryElement}
    ${secondElement}
    <rect class="element-plate" x="${centerX - plateW / 2}" y="${centerY - plateH / 2}" width="${plateW}" height="${plateH}" rx="4" opacity="0.86" />
    ${jointLine}
    ${fasteners.join("")}
    <line class="force-arrow" x1="45" y1="${centerY}" x2="${centerX - beamW / 2 + 90}" y2="${centerY}" />
    <line class="force-arrow" x1="${centerX + 95}" y1="${centerY - 110}" x2="${centerX + 95}" y2="${centerY - 50}" />
    <line class="dim" x1="${centerX - groupWidth / 2}" y1="${centerY + plateH / 2 + 22}" x2="${centerX + groupWidth / 2}" y2="${centerY + plateH / 2 + 22}" />
    <text class="svg-label" x="54" y="${centerY - 18}">Carga</text>
    <text class="svg-label" x="${beamX + 18}" y="${beamY + 24}">Viga A</text>
    ${data.connectionType === "beamColumn" || data.connectionType === "angle" ? "" : `<text class="svg-label" x="${centerX + overlapDraw / 2 + 18}" y="${beamY + 24}">Viga B</text>`}
    <text class="svg-label" x="${centerX - 38}" y="${centerY - plateH / 2 - 12}">${data.connectionType === "angle" ? "Cantoneira" : "Chapa"}</text>
    <text class="svg-label" x="${centerX - 56}" y="${centerY + plateH / 2 + 45}">s = ${fmt(data.spacing)} mm</text>
    <text class="svg-label" x="590" y="344">Utilização máx.: ${pct(result.governing.utilization)}</text>
  `;
}

function drawSection(data) {
  const svg = els.sectionSvg;
  const width = 460;
  const height = 260;
  const centerX = width / 2;
  const y = 128;
  const beamT = clamp(data.beamAHeight / 2, 34, 68);
  const plateT = clamp(data.plateThickness * 3, 16, 34);
  const boltR = clamp(data.diameter * 0.75, 8, 18);
  const washer = data.hasWasher ? `<rect class="element-plate" x="${centerX - 54}" y="${y - beamT / 2 - 18}" width="108" height="10" rx="3" />` : "";
  const nut = data.hasNut ? `<polygon class="fastener" points="${centerX - 26},${y + beamT / 2 + 26} ${centerX + 26},${y + beamT / 2 + 26} ${centerX + 34},${y + beamT / 2 + 48} ${centerX - 34},${y + beamT / 2 + 48}" />` : "";

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = defs() + `
    <rect class="element-beam-a" x="64" y="${y - beamT / 2}" width="332" height="${beamT}" rx="5" />
    <rect class="element-plate" x="64" y="${y - beamT / 2 - plateT}" width="332" height="${plateT}" rx="3" />
    ${washer}
    <rect class="fastener" x="${centerX - boltR / 2}" y="${y - beamT / 2 - plateT - 18}" width="${boltR}" height="${beamT + plateT + 56}" rx="${boltR / 3}" />
    <circle class="fastener" cx="${centerX}" cy="${y - beamT / 2 - plateT - 22}" r="${boltR * 1.25}" />
    ${nut}
    <text class="svg-label" x="74" y="${y - beamT / 2 - plateT - 18}">Chapa ${fmt(data.plateThickness)} mm</text>
    <text class="svg-label" x="74" y="${y + beamT / 2 + 24}">Viga ${fmt(data.beamAHeight)} mm</text>
    <text class="svg-label" x="${centerX + 44}" y="${y + 6}">d = ${fmt(data.diameter)} mm</text>
  `;
}

function drawIso(data) {
  const svg = els.isoSvg;
  const width = 460;
  const height = 260;
  const x = 92;
  const y = 72;
  const w = 250;
  const h = 82;
  const dx = 58;
  const dy = 36;
  const group = [];
  for (let r = 0; r < data.rows; r += 1) {
    for (let c = 0; c < data.cols; c += 1) {
      group.push(`<ellipse class="fastener" cx="${196 + c * 42}" cy="${112 + r * 30}" rx="8" ry="5" />`);
    }
  }
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = `
    <polygon class="element-beam-a" points="${x},${y} ${x + w},${y} ${x + w + dx},${y + dy} ${x + dx},${y + dy}" />
    <polygon class="element-beam-a" points="${x},${y} ${x + dx},${y + dy} ${x + dx},${y + dy + h} ${x},${y + h}" opacity="0.78" />
    <polygon class="element-beam-b" points="${x + 74},${y + 52} ${x + w + 70},${y + 52} ${x + w + dx + 70},${y + dy + 52} ${x + dx + 74},${y + dy + 52}" />
    <polygon class="element-plate" points="174,84 330,84 365,106 209,106" opacity="0.9" />
    ${group.join("")}
    <text class="svg-label" x="92" y="208">Modelo 3D simplificado</text>
  `;
}

function defs() {
  return `
    <defs>
      <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="#ef4444"></path>
      </marker>
    </defs>
  `;
}

function exportPlanPng() {
  const source = new XMLSerializer().serializeToString(els.planSvg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1640;
    canvas.height = 760;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const link = document.createElement("a");
    link.download = "laboratorio-ligacoes-v1.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  image.src = url;
}

function statusText(status) {
  if (status === "failed") return "Falhou";
  if (status === "warning") return "Próximo do limite";
  return "Seguro";
}

function num(input) {
  return Math.max(0, Number(input.value) || 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fmt(value) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1000) return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

boot();
