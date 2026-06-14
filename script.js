const pinMaterials = {
  madeira: { name: "Madeira estrutural genérica", shear: 5, axial: 10 },
  aco: { name: "Aço carbono comum", shear: 140, axial: 250 },
  ferro: { name: "Ferro comum didático", shear: 90, axial: 170 },
};

const plateMaterials = {
  madeira: { name: "Madeira estrutural genérica", tension: 8, bearing: 12 },
  aco: { name: "Aço carbono comum", tension: 250, bearing: 250 },
};

const state = { lessonMode: false };

const els = {
  form: document.querySelector("#inputForm"),
  svg: document.querySelector("#connectionSvg"),
  warnings: document.querySelector("#warnings"),
  overallPill: document.querySelector("#overallPill"),
  forceBadge: document.querySelector("#forceBadge"),
  criticalMode: document.querySelector("#criticalMode"),
  summary: document.querySelector("#summary"),
  checks: document.querySelector("#checks"),
  explanation: document.querySelector("#explanation"),
  lessonToggle: document.querySelector("#lessonToggle"),
  boltOptions: document.querySelector("#boltOptions"),
  charts: {
    force: document.querySelector("#chartForce"),
    diameter: document.querySelector("#chartDiameter"),
    thickness: document.querySelector("#chartThickness"),
    spacing: document.querySelector("#chartSpacing"),
  },
};

const inputs = {
  lengthA: document.querySelector("#lengthA"),
  widthA: document.querySelector("#widthA"),
  thicknessA: document.querySelector("#thicknessA"),
  plateMaterialA: document.querySelector("#plateMaterialA"),
  lengthB: document.querySelector("#lengthB"),
  widthB: document.querySelector("#widthB"),
  thicknessB: document.querySelector("#thicknessB"),
  plateMaterialB: document.querySelector("#plateMaterialB"),
  overlap: document.querySelector("#overlap"),
  diameter: document.querySelector("#diameter"),
  pinCount: document.querySelector("#pinCount"),
  edgeStart: document.querySelector("#edgeStart"),
  spacingLong: document.querySelector("#spacingLong"),
  edgeEnd: document.querySelector("#edgeEnd"),
  gauge: document.querySelector("#gauge"),
  force: document.querySelector("#force"),
  forceUnit: document.querySelector("#forceUnit"),
  connectorType: document.querySelector("#connectorType"),
  pinMaterial: document.querySelector("#pinMaterial"),
  hasWasher: document.querySelector("#hasWasher"),
  hasNut: document.querySelector("#hasNut"),
  washerDiameter: document.querySelector("#washerDiameter"),
  washerThickness: document.querySelector("#washerThickness"),
  washerMaterial: document.querySelector("#washerMaterial"),
  showDimensions: document.querySelector("#showDimensions"),
};

function lerInputs() {
  const connectorType = inputs.connectorType.value;
  return {
    lengthA: Number(inputs.lengthA.value),
    widthA: Number(inputs.widthA.value),
    thicknessA: Number(inputs.thicknessA.value),
    plateMaterialAKey: inputs.plateMaterialA.value,
    lengthB: Number(inputs.lengthB.value),
    widthB: Number(inputs.widthB.value),
    thicknessB: Number(inputs.thicknessB.value),
    plateMaterialBKey: inputs.plateMaterialB.value,
    overlap: Number(inputs.overlap.value),
    diameter: Number(inputs.diameter.value),
    pinCount: Number(inputs.pinCount.value),
    edgeStart: Number(inputs.edgeStart.value),
    spacingLong: Number(inputs.spacingLong.value),
    edgeEnd: Number(inputs.edgeEnd.value),
    gauge: Number(inputs.gauge.value),
    spacing: Math.min(Number(inputs.edgeStart.value), Number(inputs.edgeEnd.value)),
    force: Number(inputs.force.value),
    forceUnit: inputs.forceUnit.value,
    connectorType,
    pinMaterialKey: inputs.pinMaterial.value,
    hasWasher: connectorType === "parafuso" && inputs.hasWasher.checked,
    hasNut: connectorType === "parafuso" && inputs.hasNut.checked,
    washerDiameter: Number(inputs.washerDiameter.value),
    washerThickness: Number(inputs.washerThickness.value),
    washerMaterialKey: inputs.washerMaterial.value,
    showDimensions: inputs.showDimensions.checked,
  };
}

function converterUnidades(data) {
  return { ...data, forceN: data.forceUnit === "kN" ? data.force * 1000 : data.force };
}

function obterMaterialPino(key) {
  return pinMaterials[key];
}

function obterMaterialPrancha(key) {
  return plateMaterials[key];
}

function nomeConector(type) {
  return { pino: "pino", parafuso: "parafuso", prego: "prego" }[type] || "conector";
}

function getLayoutShape(pinCount) {
  return {
    cols: pinCount === 6 ? 3 : 2,
    rows: pinCount === 2 ? 1 : 2,
  };
}

function dimensoesMinimas(data) {
  const { cols, rows } = getLayoutShape(data.pinCount);
  return {
    overlap: data.edgeStart + Math.max(0, cols - 1) * data.spacingLong + data.edgeEnd,
    width: rows === 1 ? 2 * data.diameter : (rows - 1) * data.gauge + 2 * data.diameter,
  };
}

function calcularLayoutPinos(data) {
  const { cols, rows } = getLayoutShape(data.pinCount);
  const groupW = (cols - 1) * data.spacingLong;
  const groupH = (rows - 1) * data.gauge;
  const pins = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      pins.push({
        x: data.edgeStart + col * data.spacingLong,
        y: Math.min(data.widthA, data.widthB) / 2 - groupH / 2 + row * data.gauge,
        row,
        col,
      });
    }
  }

  return { pins, rows, cols, groupW, groupH, pitch: data.spacingLong };
}

function validarLayout(data, layout, materialA, materialB, pinMaterial) {
  const errors = [];
  const warnings = [];
  const min = dimensoesMinimas(data);
  const minPlateWidth = Math.min(data.widthA, data.widthB);

  if (!materialA || !materialB || !pinMaterial) errors.push("Alguma propriedade de material está ausente.");
  if (data.thicknessA <= 0 || data.thicknessB <= 0) errors.push("As espessuras das pranchas devem ser maiores que zero.");
  if (data.lengthA <= 0 || data.lengthB <= 0 || data.widthA <= 0 || data.widthB <= 0) errors.push("Comprimentos e larguras devem ser maiores que zero.");
  if (data.forceN <= 0) errors.push("A força aplicada deve ser maior que zero.");
  if (data.diameter <= 0) errors.push("O diâmetro do conector deve ser maior que zero.");
  if (data.edgeStart <= 0 || data.edgeEnd <= 0) errors.push("As distâncias de borda e1/e2 devem ser maiores que zero.");
  if (data.spacingLong <= 0) errors.push("O espaçamento entre conectores s deve ser maior que zero.");
  if (data.gauge <= 0) errors.push("A distância transversal g deve ser maior que zero.");
  if (data.overlap <= 0) errors.push("O comprimento de sobreposição deve ser maior que zero.");
  if (data.overlap > data.lengthA || data.overlap > data.lengthB) errors.push("A sobreposição não pode ser maior que o comprimento de uma das pranchas.");
  if (data.diameter > data.widthA || data.diameter > data.widthB) errors.push("O diâmetro do conector é maior que a largura de uma das pranchas.");
  if (data.overlap < min.overlap) errors.push("O layout dos conectores não cabe na região de sobreposição.");
  if (minPlateWidth < min.width) errors.push("O layout dos conectores não cabe na largura das pranchas.");
  if (data.edgeStart < 2 * data.diameter) warnings.push(`A distância e1 está menor que 2d (${format(2 * data.diameter)} mm).`);
  if (data.edgeEnd < 2 * data.diameter) warnings.push(`A distância e2 está menor que 2d (${format(2 * data.diameter)} mm).`);
  if (layout.cols > 1 && data.spacingLong < 3 * data.diameter) warnings.push(`O espaçamento s está menor que 3d (${format(3 * data.diameter)} mm).`);
  if (layout.rows > 1 && data.gauge < 3 * data.diameter) warnings.push(`A distância g está menor que 3d (${format(3 * data.diameter)} mm).`);
  if (data.connectorType === "prego") warnings.push("Prego usa as verificações gerais desta etapa. Arrancamento e flexão específicos entram em uma versão futura.");

  return {
    errors,
    warnings,
    minOverlap: min.overlap,
    minWidth: min.width,
    edgeLongitudinal: Math.min(data.edgeStart, data.edgeEnd),
    edgeTransverse: Math.max(0, (minPlateWidth - layout.groupH) / 2 - data.diameter / 2),
    controllingEdge: Math.min(data.edgeStart, data.edgeEnd, Math.max(0, (minPlateWidth - layout.groupH) / 2 - data.diameter / 2)),
  };
}

function calcularDistribuicaoCarga(data) {
  return data.forceN / data.pinCount;
}

function calcularTaxaUtilizacao(value, admissible) {
  return admissible > 0 ? value / admissible : Infinity;
}

function verificarStatus(utilization) {
  if (!Number.isFinite(utilization)) return { label: "Falha", key: "fail" };
  if (utilization <= 0.7) return { label: "Seguro", key: "safe" };
  if (utilization <= 1) return { label: "Próximo do limite", key: "warn" };
  return { label: "Falha", key: "fail" };
}

function makeCheck(id, name, shortName, formula, symbol, calculated, admissible, utilization, details) {
  const safetyFactor = calculated > 0 ? admissible / calculated : Infinity;
  return { id, name, shortName, formula, symbol, calculated, admissible, utilization, safetyFactor, status: verificarStatus(utilization), details };
}

function calcularCisalhamentoPino(data, pinMaterial, forcePerPin) {
  const area = Math.PI * data.diameter ** 2 / 4;
  const stress = forcePerPin / area;
  const label = nomeConector(data.connectorType);
  return makeCheck("pin-shear", `Cisalhamento do ${label}`, `Cisalhamento do ${label}`, "τ = Fcon / A", "τ", stress, pinMaterial.shear, calcularTaxaUtilizacao(stress, pinMaterial.shear), [
    `Força por conector: ${format(forcePerPin)} N`,
    `Área do conector: ${format(area)} mm²`,
    `Material: ${pinMaterial.name}`,
  ]);
}

function calcularEsmagamentoPrancha(label, id, data, plateMaterial, thickness, forcePerPin) {
  const area = data.diameter * thickness;
  const stress = forcePerPin / area;
  return makeCheck(id, `Esmagamento no furo da Prancha ${label}`, `Esmagamento - Prancha ${label}`, "σb = Fcon / (d · t)", "σb", stress, plateMaterial.bearing, calcularTaxaUtilizacao(stress, plateMaterial.bearing), [
    `Prancha ${label}`,
    `Diâmetro: ${format(data.diameter)} mm`,
    `Espessura: ${format(thickness)} mm`,
  ]);
}

function calcularArrancamentoBorda(label, id, plateMaterial, thickness, forcePerPin, validation) {
  const area = validation.controllingEdge * thickness;
  const stress = area > 0 ? forcePerPin / area : Infinity;
  return makeCheck(id, `Arrancamento da borda da Prancha ${label}`, `Arrancamento - Prancha ${label}`, "σarr = Fcon / (e · t)", "σarr", stress, plateMaterial.tension, calcularTaxaUtilizacao(stress, plateMaterial.tension), [
    `Prancha ${label}`,
    `Distância crítica: ${format(validation.controllingEdge)} mm`,
    `Área resistente aproximada: ${format(area)} mm²`,
  ]);
}

function calcularTracaoSecaoLiquida(label, id, data, plateMaterial, width, thickness) {
  const holes = data.pinCount === 2 ? 1 : 2;
  const grossArea = width * thickness;
  const netArea = (width - holes * data.diameter) * thickness;
  const stress = netArea > 0 ? data.forceN / netArea : Infinity;
  const check = makeCheck(id, `Tração da seção líquida da Prancha ${label}`, `Seção líquida - Prancha ${label}`, "σt = P / Aliq", "σt", stress, plateMaterial.tension, calcularTaxaUtilizacao(stress, plateMaterial.tension), [
    `Prancha ${label}`,
    `Área bruta: ${format(grossArea)} mm²`,
    `Área líquida: ${format(netArea)} mm²`,
    `Furos na seção crítica: ${holes}`,
  ]);
  check.netArea = netArea;
  return check;
}

function encontrarModoCritico(checks) {
  return checks.reduce((critical, check) => (check.utilization > critical.utilization ? check : critical), checks[0]);
}

function calcularTudo(overrides = {}) {
  const raw = { ...lerInputs(), ...overrides };
  const data = converterUnidades(raw);
  const pinMaterial = obterMaterialPino(data.pinMaterialKey);
  const materialA = obterMaterialPrancha(data.plateMaterialAKey);
  const materialB = obterMaterialPrancha(data.plateMaterialBKey);
  const layout = calcularLayoutPinos(data);
  const validation = validarLayout(data, layout, materialA, materialB, pinMaterial);
  const forcePerPin = calcularDistribuicaoCarga(data);
  const checks = [
    calcularCisalhamentoPino(data, pinMaterial, forcePerPin),
    calcularEsmagamentoPrancha("A", "bearing-a", data, materialA, data.thicknessA, forcePerPin),
    calcularEsmagamentoPrancha("B", "bearing-b", data, materialB, data.thicknessB, forcePerPin),
    calcularArrancamentoBorda("A", "edge-a", materialA, data.thicknessA, forcePerPin, validation),
    calcularArrancamentoBorda("B", "edge-b", materialB, data.thicknessB, forcePerPin, validation),
    calcularTracaoSecaoLiquida("A", "net-a", data, materialA, data.widthA, data.thicknessA),
    calcularTracaoSecaoLiquida("B", "net-b", data, materialB, data.widthB, data.thicknessB),
  ];
  const critical = encontrarModoCritico(checks);
  const geometryError = validation.errors.length > 0;
  const overallStatus = geometryError ? { label: "Layout inválido", key: "fail" } : critical.status;
  return { data, pinMaterial, materialA, materialB, layout, validation, forcePerPin, checks, critical, overallStatus, geometryError };
}

function atualizarVisual(model) {
  desenharLigacaoTipo3(model);
}

function desenharLigacaoTipo3(model) {
  const { data, layout, critical, overallStatus } = model;
  const svg = els.svg;
  const criticalId = model.geometryError ? "geometry" : critical.id;
  const statusColor = overallStatus.key === "safe" ? "#14804a" : overallStatus.key === "warn" ? "#b7791f" : "#c43232";

  const maxLength = Math.max(data.lengthA + data.lengthB - data.overlap, data.overlap);
  const maxWidth = Math.max(data.widthA, data.widthB);
  const scale = Math.min(760 / maxLength, 230 / maxWidth);
  const overlapW = data.overlap * scale;
  const aW = data.lengthA * scale;
  const bW = data.lengthB * scale;
  const aH = data.widthA * scale;
  const bH = data.widthB * scale;
  const overlapX = 450 - overlapW / 2;
  const overlapRight = overlapX + overlapW;
  const aX = overlapRight - aW;
  const bX = overlapX;
  const axisY = 235;
  const aY = axisY - aH / 2;
  const bY = axisY - bH / 2;
  const overlapH = Math.min(aH, bH);
  const overlapY = axisY - overlapH / 2;
  const pinR = Math.max(13, Math.min(23, data.diameter * scale / 2 + 8));

  svg.innerHTML = `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f6feb"></path>
      </marker>
      <marker id="dimArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 5 L 10 0 L 10 10 z" fill="#64748b"></path>
      </marker>
      <pattern id="overlapHatch" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 8 L8 0" stroke="#7c4a03" stroke-width="1.2" opacity="0.55"></path>
      </pattern>
      <pattern id="washerHatch" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 6 L6 0" stroke="#94a3b8" stroke-width="1"></path>
      </pattern>
    </defs>
  `;

  addText(svg, 34, 36, "Vista em planta - Tipo 3: sobreposição simples", "svg-title");
  addText(svg, 34, 60, "Prancha A e Prancha B alinhadas no mesmo eixo longitudinal", "svg-small");
  addRect(svg, aX, aY, aW, aH, 10, "#1f77b4", criticalId === "geometry" ? statusColor : "#15557f", 2.5, 0.88);
  addRect(svg, bX, bY, bW, bH, 10, "#f2b84b", criticalId === "geometry" ? statusColor : "#b97812", 2.5, 0.78);
  addRect(svg, overlapX, overlapY, overlapW, overlapH, 0, "url(#overlapHatch)", "#7c4a03", 2.5, 1);
  addText(svg, Math.max(36, aX + 18), aY + 28, "Prancha A", "svg-on-blue");
  addText(svg, Math.min(760, bX + bW - 128), bY + 28, "Prancha B", "svg-on-orange");
  addText(svg, overlapX + 12, overlapY + overlapH - 16, "Região de sobreposição", "svg-note");

  desenharForcasTipo3(svg, aX, bX, aW, bW, axisY, data.forceN);
  desenharPinosTipo3(svg, model, overlapX, overlapY, scale, pinR, criticalId);
  desenharCaminhoCargaTipo3(svg, layout, overlapX, overlapY, scale);
  if (data.showDimensions) desenharDimensoesTipo3(svg, model, overlapX, overlapY, overlapW, overlapH, scale, pinR);
  destacarModoCriticoTipo3(svg, model, overlapX, overlapY, overlapW, overlapH, scale, criticalId);
}

function desenharForcasTipo3(svg, aX, bX, aW, bW, axisY, forceN) {
  const leftStart = Math.max(118, aX + 72);
  const leftEnd = Math.max(30, aX - 18);
  const rightStart = Math.min(782, bX + bW - 72);
  const rightEnd = Math.min(870, bX + bW + 18);
  addLine(svg, leftStart, axisY, leftEnd, axisY, "#1f6feb", 8, true);
  addText(svg, leftEnd + 6, axisY - 18, `P = ${format(forceN / 1000)} kN`, "svg-label");
  addLine(svg, rightStart, axisY, rightEnd, axisY, "#1f6feb", 8, true);
  addText(svg, rightStart + 8, axisY - 18, `P = ${format(forceN / 1000)} kN`, "svg-label");
}

function pinScreenPosition(pin, overlapX, overlapY, scale) {
  return { cx: overlapX + pin.x * scale, cy: overlapY + pin.y * scale };
}

function desenharPinosTipo3(svg, model, overlapX, overlapY, scale, pinR, criticalId) {
  const connectorFill = model.data.connectorType === "prego" ? "#475569" : "#f8fafc";
  model.layout.pins.forEach((pin) => {
    const { cx, cy } = pinScreenPosition(pin, overlapX, overlapY, scale);
    if (model.data.hasWasher) {
      const washerR = Math.max(pinR * 1.65, (model.data.washerDiameter * scale) / 2);
      addCircle(svg, cx, cy, washerR, "#64748b", "url(#washerHatch)", 3);
    }
    addCircle(svg, cx, cy, pinR, criticalId === "pin-shear" ? "#c43232" : "#202a34", connectorFill, 4);
    addCircle(svg, cx, cy, pinR * 0.36, "#64748b", "#dbe4ee", 2);
    if (model.data.hasNut) desenharPorca(svg, cx, cy, pinR);
    if (model.data.connectorType === "prego") addLine(svg, cx - pinR * 0.45, cy - pinR * 0.45, cx + pinR * 0.45, cy + pinR * 0.45, "#94a3b8", 2);
    if (criticalId === "pin-shear") addLine(svg, cx - pinR * 0.72, cy, cx + pinR * 0.72, cy, "#c43232", 4, false, "5 4");
  });
}

function desenharPorca(svg, cx, cy, pinR) {
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 3 * i + Math.PI / 6;
    points.push(`${cx + Math.cos(angle) * pinR * 2.15},${cy + Math.sin(angle) * pinR * 2.15}`);
  }
  addPoly(svg, points.join(" "), "#475569", "rgba(71,85,105,0.13)", 2.5);
}

function desenharCaminhoCargaTipo3(svg, layout, overlapX, overlapY, scale) {
  addText(svg, overlapX + 12, overlapY - 26, "Carga transferida pelos conectores", "svg-note");
  layout.pins.forEach((pin) => {
    const { cx, cy } = pinScreenPosition(pin, overlapX, overlapY, scale);
    addLine(svg, cx - 42, cy - 18, cx - 12, cy - 5, "#2f855a", 3.5, true);
    addLine(svg, cx + 12, cy + 5, cx + 42, cy + 18, "#2f855a", 3.5, true);
  });
}

function desenharDimensoesTipo3(svg, model, overlapX, overlapY, overlapW, overlapH, scale, pinR) {
  const yDim = overlapY - 52;
  addDimension(svg, overlapX, yDim, overlapX + overlapW, yDim, `sobreposição = ${format(model.data.overlap)} mm`);
  const first = model.layout.pins[0];
  const secondCol = model.layout.pins.find((pin) => pin.col === 1 && pin.row === first.row);
  const lastCol = Math.max(...model.layout.pins.map((pin) => pin.col));
  const last = model.layout.pins.find((pin) => pin.col === lastCol && pin.row === first.row) || model.layout.pins[model.layout.pins.length - 1];
  const p1 = pinScreenPosition(first, overlapX, overlapY, scale);
  const plast = pinScreenPosition(last, overlapX, overlapY, scale);
  addDimension(svg, overlapX, yDim + 28, p1.cx - pinR, yDim + 28, `e1 = ${format(model.data.edgeStart)} mm`);
  if (secondCol) {
    const p2 = pinScreenPosition(secondCol, overlapX, overlapY, scale);
    addDimension(svg, p1.cx, yDim + 56, p2.cx, yDim + 56, `s = ${format(model.data.spacingLong)} mm`);
  }
  addDimension(svg, plast.cx + pinR, yDim + 28, overlapX + overlapW, yDim + 28, `e2 = ${format(model.data.edgeEnd)} mm`);
  if (model.layout.rows > 1) {
    const row0 = model.layout.pins.find((pin) => pin.row === 0 && pin.col === 0);
    const row1 = model.layout.pins.find((pin) => pin.row === 1 && pin.col === 0);
    if (row0 && row1) {
      const pRow0 = pinScreenPosition(row0, overlapX, overlapY, scale);
      const pRow1 = pinScreenPosition(row1, overlapX, overlapY, scale);
      addDimension(svg, pRow0.cx - 46, pRow0.cy, pRow1.cx - 46, pRow1.cy, `g = ${format(model.data.gauge)} mm`);
    }
  }
  addCircle(svg, p1.cx, overlapY + overlapH + 36, pinR, "#64748b", "none", 2);
  addDimension(svg, p1.cx - pinR, overlapY + overlapH + 36, p1.cx + pinR, overlapY + overlapH + 36, `d = ${format(model.data.diameter)} mm`);
  addLine(svg, overlapX, overlapY, overlapX, overlapY + overlapH, "#64748b", 1.5, false, "5 5");
}

function destacarModoCriticoTipo3(svg, model, overlapX, overlapY, overlapW, overlapH, scale, criticalId) {
  if (criticalId.startsWith("bearing")) {
    model.layout.pins.forEach((pin) => {
      const { cx, cy } = pinScreenPosition(pin, overlapX, overlapY, scale);
      addCircle(svg, cx, cy, 33, "#c43232", "rgba(196,50,50,0.14)", 4, "7 5");
    });
  }
  if (criticalId.startsWith("edge")) {
    const leftPins = model.layout.pins.filter((pin) => pin.col === 0);
    leftPins.forEach((pin) => {
      const { cx, cy } = pinScreenPosition(pin, overlapX, overlapY, scale);
      addRect(svg, overlapX, cy - 22, cx - overlapX, 44, 0, "rgba(196,50,50,0.15)", "#c43232", 3);
      addLine(svg, overlapX + 4, cy - 18, cx, cy, "#c43232", 3, false, "7 5");
      addLine(svg, overlapX + 4, cy + 18, cx, cy, "#c43232", 3, false, "7 5");
    });
  }
  if (criticalId.startsWith("net")) {
    const firstColX = overlapX + model.layout.pins[0].x * scale;
    addLine(svg, firstColX, overlapY + 8, firstColX, overlapY + overlapH - 8, "#c43232", 5, false, "9 7");
  }
}

function atualizarResultados(model) {
  const { data, pinMaterial, materialA, materialB, forcePerPin, checks, critical, overallStatus, geometryError } = model;
  const pillClass = overallStatus.key === "warn" ? "warn" : overallStatus.key === "fail" ? "fail" : "";
  const reason = geometryError ? "geometria da sobreposição" : critical.shortName;
  const pillText = overallStatus.key === "safe" ? `${overallStatus.label} - FS mín. ${format(critical.safetyFactor)}` : `${overallStatus.label} - ${reason}`;
  els.overallPill.className = `status-pill ${pillClass}`;
  els.overallPill.textContent = pillText;
  els.forceBadge.textContent = `F por conector = ${format(forcePerPin / 1000)} kN (${format(forcePerPin)} N)`;

  const stressAlerts = checks.filter((check) => check.status.key === "fail").map((check) => `${check.shortName} excessivo: utilização ${formatPercent(check.utilization)}.`);
  const messages = [...model.validation.errors, ...model.validation.warnings, ...stressAlerts];
  els.warnings.classList.toggle("visible", messages.length > 0);
  els.warnings.innerHTML = messages.map((message) => `<div>${message}</div>`).join("");
  els.criticalMode.className = `critical-mode ${pillClass}`;
  els.criticalMode.innerHTML = renderCriticalMode(model);

  els.summary.innerHTML = `
    <div class="critical-card ${pillClass}">
      <h2>Resultado geral</h2>
      <p><strong>Status:</strong> ${overallStatus.label}</p>
      <p><strong>Motivo:</strong> ${geometryError ? "Layout inválido na sobreposição" : critical.shortName}</p>
      <p><strong>Fator de segurança mínimo:</strong> ${geometryError ? "layout inválido" : format(critical.safetyFactor)}</p>
    </div>
    <div class="summary-grid">
      ${metric("Conectores", `${data.pinCount} ${nomeConector(data.connectorType)}${data.pinCount > 1 ? "s" : ""}`)}
      ${metric("Sobreposição", `${format(data.overlap)} mm`)}
      ${metric("Geometria", `e1 ${format(data.edgeStart)} | s ${format(data.spacingLong)} | e2 ${format(data.edgeEnd)} | g ${format(data.gauge)} mm`)}
      ${metric("Prancha A", materialA.name)}
      ${metric("Prancha B", materialB.name)}
      ${metric("Material do conector", pinMaterial.name)}
      ${metric("Força por conector", `${format(forcePerPin)} N`)}
    </div>
  `;
  els.checks.innerHTML = checks.map(renderCheck).join("");
}

function renderCriticalMode(model) {
  if (model.geometryError) {
    return `
      <h3>Modo crítico: validação da sobreposição</h3>
      <p>Os conectores precisam caber dentro da região central sobreposta. Aumente a sobreposição, a largura das pranchas ou reduza diâmetro/espaçamento.</p>
      <div class="critical-grid">
        <div class="mini-metric"><span>Sobreposição mínima</span><strong>${format(model.validation.minOverlap)} mm</strong></div>
        <div class="mini-metric"><span>Largura mínima</span><strong>${format(model.validation.minWidth)} mm</strong></div>
        <div class="mini-metric"><span>Força por conector</span><strong>${format(model.forcePerPin)} N</strong></div>
      </div>
    `;
  }
  return `
    <h3>Modo crítico: ${model.critical.shortName}</h3>
    <p>${criticalExplanation(model.critical.id)}</p>
    <div class="critical-grid">
      <div class="mini-metric"><span>Utilização</span><strong>${formatPercent(model.critical.utilization)}</strong></div>
      <div class="mini-metric"><span>Valor calculado</span><strong>${format(model.critical.calculated)} MPa</strong></div>
      <div class="mini-metric"><span>FS</span><strong>${format(model.critical.safetyFactor)}</strong></div>
    </div>
  `;
}

function criticalExplanation(id) {
  if (id === "pin-shear") return "O conector é o elemento mais solicitado ao corte pela tentativa de deslizamento relativo entre as pranchas.";
  if (id.startsWith("bearing")) return "A pressão de contato entre conector e parede do furo domina a verificação.";
  if (id.startsWith("edge")) return "A faixa entre conector e borda da sobreposição é a região mais sensível.";
  if (id.startsWith("net")) return "Os furos reduzem a área resistente da prancha na seção crítica.";
  return "A geometria da sobreposição controla o resultado.";
}

function atualizarPainelExplicativo(model) {
  const { data, critical, overallStatus, geometryError, forcePerPin } = model;
  const connectorText = {
    pino: "Como o conector é pino, porca e arruela ficam ocultas.",
    parafuso: data.hasNut
      ? "Como o conector é parafuso, a planta mostra arruela e porca. Esta etapa ainda não calcula protensão, torque ou atrito."
      : "Como o conector é parafuso, a arruela pode ser mostrada na montagem. Esta etapa ainda não calcula protensão, torque ou atrito.",
    prego: "Como o conector é prego, porca e arruela ficam ocultas. Verificações específicas de arrancamento e flexão ficam para a próxima etapa.",
  }[data.connectorType];
  const statusSentence = geometryError
    ? "A ligação ainda não pode ser avaliada porque o layout não cabe na sobreposição."
    : `A ligação ficou com status ${overallStatus.label}. O modo mais crítico foi ${critical.shortName}, com FS = ${format(critical.safetyFactor)}.`;

  let html = `
    <p>${statusSentence}</p>
    <p>Esta base representa o Tipo 3: duas pranchas alinhadas no mesmo eixo, sobrepostas no centro, com conectores atravessando as duas peças.</p>
    <p>A força total P foi convertida para <strong>${format(data.forceN)} N</strong> e dividida igualmente entre <strong>${data.pinCount}</strong> conectores. Cada conector recebeu <strong>${format(forcePerPin)} N</strong>.</p>
    <p>As forças opostas tentam deslizar uma prancha em relação à outra. A carga passa da Prancha A para os conectores e dos conectores para a Prancha B.</p>
    <p>${connectorText}</p>
    <div class="suggestions-box">
      <h3>Como melhorar?</h3>
      <ul>${suggestionsFor(geometryError ? "geometry" : critical.id).map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
  `;

  if (state.lessonMode) {
    html += `
      <ul>
        <li><strong>Cisalhamento do conector</strong>: tendência do conector ser cortado pela força transversal.</li>
        <li><strong>Esmagamento no furo</strong>: pressão local do conector contra a parede do furo em cada prancha.</li>
        <li><strong>Arrancamento da borda</strong>: ruptura do trecho entre conector e borda da sobreposição.</li>
        <li><strong>Seção líquida</strong>: área restante depois de descontar furos na Prancha A ou B.</li>
      </ul>
    `;
  }
  els.explanation.innerHTML = html;
}

function suggestionsFor(id) {
  if (id === "geometry") return ["aumentar o comprimento da sobreposição", "aumentar a largura das pranchas", "reduzir diâmetro ou quantidade de conectores", "reduzir o espaçamento e"];
  if (id === "pin-shear") return ["aumentar o diâmetro do conector", "aumentar a quantidade de conectores", "usar material de conector mais resistente", "reduzir a força aplicada"];
  if (id.startsWith("bearing")) return ["aumentar a espessura da prancha crítica", "aumentar o número de conectores", "usar material de prancha mais resistente", "aumentar o diâmetro do conector com cuidado"];
  if (id.startsWith("edge")) return ["aumentar a sobreposição", "afastar conectores das bordas", "aumentar a espessura da prancha crítica"];
  if (id.startsWith("net")) return ["aumentar a largura da prancha crítica", "reduzir diâmetro dos furos se possível", "usar material mais resistente", "aumentar a espessura"];
  return ["revisar geometria e carregamento"];
}

function atualizarGraficos(model) {
  drawChart(els.charts.force, "Força aplicada x utilização", "P (kN)", "Utilização", sampleSeries("force", model), 1);
  drawChart(els.charts.diameter, "Diâmetro x cisalhamento", "d (mm)", "τ (MPa)", sampleSeries("diameter", model), model.pinMaterial.shear);
  drawChart(els.charts.thickness, "Espessura x esmagamento", "t (mm)", "σb (MPa)", sampleSeries("thickness", model), Math.min(model.materialA.bearing, model.materialB.bearing));
  drawChart(els.charts.spacing, "Espaçamento s x arrancamento", "s (mm)", "Utilização", sampleSeries("spacing", model), 1);
}

function sampleSeries(kind, model) {
  const base = model.data;
  const samples = [];
  for (let i = 0; i < 18; i += 1) {
    let value;
    const overrides = {};
    if (kind === "force") {
      value = Math.max(1, base.force * 0.25 + i * base.force * 0.105);
      overrides.force = value;
      overrides.forceUnit = base.forceUnit;
    }
    if (kind === "diameter") {
      value = Math.max(2, base.diameter * 0.45 + i * base.diameter * 0.075);
      overrides.diameter = value;
    }
    if (kind === "thickness") {
      value = Math.max(2, base.thicknessA * 0.45 + i * base.thicknessA * 0.075);
      overrides.thicknessA = value;
      overrides.thicknessB = value;
    }
    if (kind === "spacing") {
      value = Math.max(5, base.spacingLong * 0.35 + i * base.spacingLong * 0.08);
      overrides.spacingLong = value;
    }
    const m = calcularTudo(overrides);
    const y = kind === "force" ? m.critical.utilization : kind === "diameter" ? m.checks[0].calculated : kind === "thickness" ? Math.max(m.checks[1].calculated, m.checks[2].calculated) : Math.max(m.checks[3].utilization, m.checks[4].utilization);
    samples.push({ x: value, y });
  }
  return samples;
}

function drawChart(canvas, title, xLabel, yLabel, points, limit) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 38;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y).filter(Number.isFinite);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(limit * 1.15, ...ys, 1);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d8e0e8";
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.fillStyle = "#17212b";
  ctx.font = "700 13px Segoe UI, Arial";
  ctx.fillText(title, 14, 22);
  ctx.font = "11px Segoe UI, Arial";
  ctx.fillStyle = "#617080";
  ctx.fillText(xLabel, width - 80, height - 10);
  ctx.save();
  ctx.translate(12, 132);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  const xMap = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (width - pad - 16);
  const yMap = (y) => height - pad - (Math.min(y, maxY) / maxY) * (height - pad - 34);
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(pad, 34);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(width - 16, height - pad);
  ctx.stroke();
  ctx.strokeStyle = "#b7791f";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(pad, yMap(limit));
  ctx.lineTo(width - 16, yMap(limit));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#1f6feb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = xMap(point.x);
    const y = yMap(Number.isFinite(point.y) ? point.y : maxY);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = "#1f6feb";
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(xMap(point.x), yMap(Number.isFinite(point.y) ? point.y : maxY), 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderCheck(check) {
  const cls = check.status.key === "warn" ? "warn" : check.status.key === "fail" ? "fail" : "";
  return `
    <article class="check-card">
      <header>
        <h3>${check.name}</h3>
        <span class="status-pill ${cls}">${check.status.label}</span>
      </header>
      <span class="formula">${check.formula}</span>
      <div class="util-bar"><span class="${cls}" style="width:${Math.min(check.utilization * 100, 100)}%"></span></div>
      <p><strong>${check.symbol}calc:</strong> ${format(check.calculated)} MPa | <strong>${check.symbol}adm:</strong> ${format(check.admissible)} MPa</p>
      <p><strong>Utilização:</strong> ${formatPercent(check.utilization)} | <strong>FS:</strong> ${format(check.safetyFactor)}</p>
      <p>${check.details.join(" - ")}</p>
    </article>
  `;
}

function metric(label, value) {
  return `<div class="metric"><p>${label}</p><strong>${value}</strong></div>`;
}

function format(value) {
  if (!Number.isFinite(value)) return "inválido";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "inválido";
  return `${format(value * 100)}%`;
}

function addRect(svg, x, y, width, height, radius, fill, stroke, strokeWidth, opacity = 1) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  node.setAttribute("x", x);
  node.setAttribute("y", y);
  node.setAttribute("width", Math.max(0, width));
  node.setAttribute("height", Math.max(0, height));
  node.setAttribute("rx", radius);
  node.setAttribute("fill", fill);
  node.setAttribute("stroke", stroke);
  node.setAttribute("stroke-width", strokeWidth);
  node.setAttribute("opacity", opacity);
  svg.appendChild(node);
}

function addCircle(svg, cx, cy, r, stroke, fill, strokeWidth, dash = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  node.setAttribute("cx", cx);
  node.setAttribute("cy", cy);
  node.setAttribute("r", Math.max(0, r));
  node.setAttribute("fill", fill);
  node.setAttribute("stroke", stroke);
  node.setAttribute("stroke-width", strokeWidth);
  if (dash) node.setAttribute("stroke-dasharray", dash);
  svg.appendChild(node);
}

function addLine(svg, x1, y1, x2, y2, stroke, strokeWidth, arrow = false, dash = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "line");
  node.setAttribute("x1", x1);
  node.setAttribute("y1", y1);
  node.setAttribute("x2", x2);
  node.setAttribute("y2", y2);
  node.setAttribute("stroke", stroke);
  node.setAttribute("stroke-width", strokeWidth);
  node.setAttribute("stroke-linecap", "round");
  if (arrow) node.setAttribute("marker-end", "url(#arrow)");
  if (dash) node.setAttribute("stroke-dasharray", dash);
  svg.appendChild(node);
}

function addPoly(svg, points, stroke, fill, strokeWidth) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  node.setAttribute("points", points);
  node.setAttribute("fill", fill);
  node.setAttribute("stroke", stroke);
  node.setAttribute("stroke-width", strokeWidth);
  svg.appendChild(node);
}

function addText(svg, x, y, text, className) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
  node.setAttribute("x", x);
  node.setAttribute("y", y);
  node.setAttribute("class", className);
  node.textContent = text;
  svg.appendChild(node);
}

function addDimension(svg, x1, y1, x2, y2, label) {
  addLine(svg, x1, y1, x2, y2, "#64748b", 1.8, false);
  const line = svg.lastChild;
  line.setAttribute("marker-start", "url(#dimArrow)");
  line.setAttribute("marker-end", "url(#dimArrow)");
  addText(svg, (x1 + x2) / 2 - 42, (y1 + y2) / 2 - 8, label, "svg-dim");
}

function atualizarOpcoesCondicionais() {
  els.boltOptions.hidden = inputs.connectorType.value !== "parafuso";
}

function atualizar() {
  atualizarOpcoesCondicionais();
  const model = calcularTudo();
  atualizarVisual(model);
  atualizarResultados(model);
  atualizarPainelExplicativo(model);
  atualizarGraficos(model);
}

els.form.addEventListener("input", atualizar);
els.form.addEventListener("change", atualizar);
els.lessonToggle.addEventListener("click", () => {
  state.lessonMode = !state.lessonMode;
  els.lessonToggle.textContent = state.lessonMode ? "Desativar Modo Aula" : "Ativar Modo Aula";
  atualizar();
});

atualizar();
