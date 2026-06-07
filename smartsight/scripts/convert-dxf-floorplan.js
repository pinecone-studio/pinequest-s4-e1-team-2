const fs = require('fs');
const path = require('path');

const [, , inputArg, outputDirArg] = process.argv;

if (!inputArg) {
  console.error('Usage: node scripts/convert-dxf-floorplan.js <input.dxf> [output-dir]');
  process.exit(1);
}

const inputPath = path.resolve(inputArg);
const outputDir = path.resolve(outputDirArg || 'assets/floorplans');
const baseName = path.basename(inputPath, path.extname(inputPath));

const raw = fs.readFileSync(inputPath, 'utf8');
const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

const pairs = [];
for (let i = 0; i + 1 < lines.length; i += 2) {
  pairs.push({ code: lines[i].trim(), value: lines[i + 1].trim() });
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readLayer(entityPairs) {
  const pair = entityPairs.find((item) => item.code === '8');
  return pair ? pair.value : '0';
}

function getBounds(items) {
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  function add(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
  }

  for (const item of items) {
    if (item.type === 'line') {
      add(item.x1, item.y1);
      add(item.x2, item.y2);
    } else if (item.type === 'polyline') {
      for (const point of item.points) add(point.x, point.y);
    } else if (item.type === 'circle' || item.type === 'arc') {
      add(item.cx - item.r, item.cy - item.r);
      add(item.cx + item.r, item.cy + item.r);
    } else if (item.type === 'text') {
      add(item.x, item.y);
    }
  }

  if (!Number.isFinite(bounds.minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  }

  return bounds;
}

function parseLine(entityPairs) {
  const entity = { type: 'line', layer: readLayer(entityPairs), x1: 0, y1: 0, x2: 0, y2: 0 };
  for (const pair of entityPairs) {
    if (pair.code === '10') entity.x1 = number(pair.value);
    if (pair.code === '20') entity.y1 = number(pair.value);
    if (pair.code === '11') entity.x2 = number(pair.value);
    if (pair.code === '21') entity.y2 = number(pair.value);
  }
  return entity;
}

function parseCircle(entityPairs) {
  const entity = { type: 'circle', layer: readLayer(entityPairs), cx: 0, cy: 0, r: 0 };
  for (const pair of entityPairs) {
    if (pair.code === '10') entity.cx = number(pair.value);
    if (pair.code === '20') entity.cy = number(pair.value);
    if (pair.code === '40') entity.r = number(pair.value);
  }
  return entity.r > 0 ? entity : null;
}

function parseArc(entityPairs) {
  const entity = { type: 'arc', layer: readLayer(entityPairs), cx: 0, cy: 0, r: 0, start: 0, end: 0 };
  for (const pair of entityPairs) {
    if (pair.code === '10') entity.cx = number(pair.value);
    if (pair.code === '20') entity.cy = number(pair.value);
    if (pair.code === '40') entity.r = number(pair.value);
    if (pair.code === '50') entity.start = number(pair.value);
    if (pair.code === '51') entity.end = number(pair.value);
  }
  return entity.r > 0 ? entity : null;
}

function parseText(entityPairs) {
  const entity = { type: 'text', layer: readLayer(entityPairs), x: 0, y: 0, height: 1, value: '' };
  for (const pair of entityPairs) {
    if (pair.code === '10') entity.x = number(pair.value);
    if (pair.code === '20') entity.y = number(pair.value);
    if (pair.code === '40') entity.height = number(pair.value, 1);
    if (pair.code === '1' || pair.code === '3') entity.value += pair.value;
  }
  return entity.value ? entity : null;
}

function parseInsert(entityPairs) {
  const entity = {
    type: 'insert',
    layer: readLayer(entityPairs),
    name: '',
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  };

  for (const pair of entityPairs) {
    if (pair.code === '2') entity.name = pair.value;
    if (pair.code === '10') entity.x = number(pair.value);
    if (pair.code === '20') entity.y = number(pair.value);
    if (pair.code === '41') entity.scaleX = number(pair.value, 1);
    if (pair.code === '42') entity.scaleY = number(pair.value, 1);
    if (pair.code === '50') entity.rotation = number(pair.value);
  }

  return entity.name ? entity : null;
}

function parseLwPolyline(entityPairs) {
  const entity = { type: 'polyline', layer: readLayer(entityPairs), closed: false, points: [] };
  let pendingX = null;

  for (const pair of entityPairs) {
    if (pair.code === '70') entity.closed = (number(pair.value) & 1) === 1;
    if (pair.code === '10') pendingX = number(pair.value);
    if (pair.code === '20' && pendingX !== null) {
      entity.points.push({ x: pendingX, y: number(pair.value) });
      pendingX = null;
    }
  }

  return entity.points.length > 1 ? entity : null;
}

function parseEntity(currentType, currentPairs, unsupported) {
  const type = currentType.toUpperCase();
  let parsed = null;
  if (type === 'LINE') parsed = parseLine(currentPairs);
  else if (type === 'LWPOLYLINE' || type === 'POLYLINE') parsed = parseLwPolyline(currentPairs);
  else if (type === 'CIRCLE') parsed = parseCircle(currentPairs);
  else if (type === 'ARC') parsed = parseArc(currentPairs);
  else if (type === 'TEXT' || type === 'MTEXT') parsed = parseText(currentPairs);
  else if (type === 'INSERT') parsed = parseInsert(currentPairs);
  else unsupported[type] = (unsupported[type] || 0) + 1;
  return parsed;
}

function parseEntityRange(startIndex, endIndex, unsupported) {
  const entities = [];
  let currentType = null;
  let currentPairs = [];

  function flush() {
    if (!currentType) return;
    const parsed = parseEntity(currentType, currentPairs, unsupported);
    if (parsed) entities.push(parsed);
  }

  for (let i = startIndex; i < endIndex; i++) {
    const pair = pairs[i];
    if (pair.code === '0') {
      flush();
      currentType = pair.value.toUpperCase();
      currentPairs = [];
      continue;
    }

    currentPairs.push(pair);
  }

  flush();
  return entities;
}

function readBlockName(blockPairs) {
  const namedPair = blockPairs.find((pair) => pair.code === '2');
  return namedPair ? namedPair.value : '';
}

function parseDrawing() {
  const unsupported = {};
  const modelEntities = [];
  const blocks = {};

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const next = pairs[i + 1];
    if (pair.code !== '0' || pair.value !== 'SECTION' || next?.code !== '2') continue;

    const sectionName = next.value.toUpperCase();
    const sectionStart = i + 2;
    let sectionEnd = sectionStart;
    while (sectionEnd < pairs.length && !(pairs[sectionEnd].code === '0' && pairs[sectionEnd].value === 'ENDSEC')) {
      sectionEnd++;
    }

    if (sectionName === 'ENTITIES') {
      modelEntities.push(...parseEntityRange(sectionStart, sectionEnd, unsupported));
    }

    if (sectionName === 'BLOCKS') {
      let blockName = '';
      let blockHeader = [];
      let blockEntityStart = -1;

      for (let j = sectionStart; j < sectionEnd; j++) {
        const item = pairs[j];
        if (item.code === '0' && item.value.toUpperCase() === 'BLOCK') {
          blockHeader = [];
          blockName = '';
          blockEntityStart = -1;
          continue;
        }

        if (item.code === '0' && item.value.toUpperCase() === 'ENDBLK') {
          blockName = blockName || readBlockName(blockHeader);
          if (blockName && blockEntityStart >= 0) {
            blocks[blockName] = parseEntityRange(blockEntityStart, j, unsupported);
          }
          blockName = '';
          blockHeader = [];
          blockEntityStart = -1;
          continue;
        }

        if (!blockName && item.code === '2') blockName = item.value;
        if (blockEntityStart < 0 && item.code === '0') blockEntityStart = j;
        if (blockEntityStart < 0) blockHeader.push(item);
      }
    }

    i = sectionEnd;
  }

  return { entities: expandInserts(modelEntities, blocks, unsupported), blocks, unsupported };
}

function transformPoint(point, insert) {
  const rotation = (insert.rotation * Math.PI) / 180;
  const sx = point.x * insert.scaleX;
  const sy = point.y * insert.scaleY;
  return {
    x: insert.x + sx * Math.cos(rotation) - sy * Math.sin(rotation),
    y: insert.y + sx * Math.sin(rotation) + sy * Math.cos(rotation),
  };
}

function transformEntity(entity, insert) {
  if (entity.type === 'line') {
    const p1 = transformPoint({ x: entity.x1, y: entity.y1 }, insert);
    const p2 = transformPoint({ x: entity.x2, y: entity.y2 }, insert);
    return { ...entity, layer: entity.layer || insert.layer, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }

  if (entity.type === 'polyline') {
    return { ...entity, layer: entity.layer || insert.layer, points: entity.points.map((point) => transformPoint(point, insert)) };
  }

  if (entity.type === 'circle' || entity.type === 'arc') {
    const center = transformPoint({ x: entity.cx, y: entity.cy }, insert);
    const scale = (Math.abs(insert.scaleX) + Math.abs(insert.scaleY)) / 2;
    return { ...entity, layer: entity.layer || insert.layer, cx: center.x, cy: center.y, r: entity.r * scale };
  }

  if (entity.type === 'text') {
    const point = transformPoint({ x: entity.x, y: entity.y }, insert);
    const scale = (Math.abs(insert.scaleX) + Math.abs(insert.scaleY)) / 2;
    return { ...entity, layer: entity.layer || insert.layer, x: point.x, y: point.y, height: entity.height * scale };
  }

  return null;
}

function expandInserts(entities, blocks, unsupported, depth = 0) {
  if (depth > 8) return entities.filter((entity) => entity.type !== 'insert');

  const expanded = [];
  for (const entity of entities) {
    if (entity.type !== 'insert') {
      expanded.push(entity);
      continue;
    }

    const blockEntities = blocks[entity.name];
    if (!blockEntities) {
      unsupported[`MISSING_BLOCK:${entity.name}`] = (unsupported[`MISSING_BLOCK:${entity.name}`] || 0) + 1;
      continue;
    }

    for (const blockEntity of blockEntities) {
      if (blockEntity.type === 'insert') {
        const nested = transformEntity(blockEntity, entity) || blockEntity;
        expanded.push(...expandInserts([nested], blocks, unsupported, depth + 1));
      } else {
        const transformed = transformEntity(blockEntity, entity);
        if (transformed) expanded.push(transformed);
      }
    }
  }

  return expanded;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toSvgPath(entity, bounds) {
  const y = (value) => bounds.maxY - value + bounds.minY;

  if (entity.type === 'line') {
    return `<line x1="${entity.x1}" y1="${y(entity.y1)}" x2="${entity.x2}" y2="${y(entity.y2)}" />`;
  }

  if (entity.type === 'polyline') {
    const points = entity.points.map((point) => `${point.x},${y(point.y)}`).join(' ');
    return `<polyline points="${points}"${entity.closed ? ' class="closed"' : ''} />`;
  }

  if (entity.type === 'circle') {
    return `<circle cx="${entity.cx}" cy="${y(entity.cy)}" r="${entity.r}" />`;
  }

  if (entity.type === 'arc') {
    const start = (entity.start * Math.PI) / 180;
    const end = (entity.end * Math.PI) / 180;
    const x1 = entity.cx + entity.r * Math.cos(start);
    const y1 = y(entity.cy + entity.r * Math.sin(start));
    const x2 = entity.cx + entity.r * Math.cos(end);
    const y2 = y(entity.cy + entity.r * Math.sin(end));
    const delta = ((entity.end - entity.start + 360) % 360) || 360;
    const largeArc = delta > 180 ? 1 : 0;
    return `<path d="M ${x1} ${y1} A ${entity.r} ${entity.r} 0 ${largeArc} 0 ${x2} ${y2}" />`;
  }

  if (entity.type === 'text') {
    return `<text x="${entity.x}" y="${y(entity.y)}" font-size="${entity.height}">${escapeXml(entity.value)}</text>`;
  }

  return '';
}

function layerSummary(entities) {
  const layers = {};
  for (const entity of entities) {
    if (!layers[entity.layer]) layers[entity.layer] = { count: 0, types: {} };
    layers[entity.layer].count++;
    layers[entity.layer].types[entity.type] = (layers[entity.layer].types[entity.type] || 0) + 1;
  }
  return layers;
}

const { entities, blocks, unsupported } = parseDrawing();
const bounds = getBounds(entities);
const width = bounds.maxX - bounds.minX;
const height = bounds.maxY - bounds.minY;

fs.mkdirSync(outputDir, { recursive: true });

const metadata = {
  source: path.basename(inputPath),
  generatedAt: new Date().toISOString(),
  bounds,
  size: { width, height },
  entityCount: entities.length,
  blockCount: Object.keys(blocks).length,
  layers: layerSummary(entities),
  unsupported,
};

const jsonPath = path.join(outputDir, `${baseName}.json`);
fs.writeFileSync(jsonPath, JSON.stringify({ metadata, entities }, null, 2));

const svgBody = entities.map((entity) => toSvgPath(entity, bounds)).filter(Boolean).join('\n  ');
const svg = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${width} ${height}">`,
  '  <style>',
  '    line, polyline, path, circle { fill: none; stroke: #111827; stroke-width: 8; vector-effect: non-scaling-stroke; }',
  '    polyline.closed { fill: rgba(17, 24, 39, 0.03); }',
  '    text { fill: #111827; font-family: Arial, sans-serif; dominant-baseline: middle; vector-effect: non-scaling-stroke; }',
  '  </style>',
  `  ${svgBody}`,
  '</svg>',
  '',
].join('\n');

const svgPath = path.join(outputDir, `${baseName}.svg`);
fs.writeFileSync(svgPath, svg);

const metadataPath = path.join(outputDir, `${baseName}.metadata.json`);
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${svgPath}`);
console.log(`Wrote ${metadataPath}`);
console.log(`Entities: ${entities.length}`);
console.log(`Bounds: ${JSON.stringify(bounds)}`);
