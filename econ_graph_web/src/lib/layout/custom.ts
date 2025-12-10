'use client';

type NodeIn = { id: string };
type EdgeIn = { source: string; target: string };

export function computeBottomUpLayout(
  nodes: NodeIn[],
  edges: EdgeIn[],
  cfg?: { nodeSpacing?: number; layerSpacing?: number }
): Map<string, { x: number; y: number }>
{
  const nodeIds = nodes.map(n => n.id);
  const S = new Set(nodeIds);
  const outMap = new Map<string, string[]>(); // source -> [targets]
  const inMap = new Map<string, string[]>(); // target -> [sources]
  for (const id of nodeIds) { outMap.set(id, []); inMap.set(id, []); }
  for (const e of edges) {
    if (!S.has(e.source) || !S.has(e.target)) continue;
    outMap.get(e.source)!.push(e.target);
    inMap.get(e.target)!.push(e.source);
  }

  // sinks: nodes that no one depends on (no outgoing edges)
  const sinks = nodeIds.filter(id => (outMap.get(id) || []).length === 0);

  const nodeSpacing = cfg?.nodeSpacing ?? 180;
  const layerSpacing = cfg?.layerSpacing ?? 140;

  const positions = new Map<string, { x: number; y: number }>();
  const placed = new Set<string>();
  let cursorX = 0;

  // helper to get or assign x sequentially if missing
  function seqX(nextIndex: number) {
    return cursorX + nextIndex * nodeSpacing;
  }

  for (const sink of sinks) {
    if (placed.has(sink)) continue;

    // Build layers bottom-up from this sink
    const layers: string[][] = [];
    const seen = new Set<string>();
    let frontier = [sink];
    let depth = 0;
    while (frontier.length > 0) {
      const unique = Array.from(new Set(frontier.filter(id => S.has(id))));
      layers.push(unique);
      unique.forEach(id => seen.add(id));
      // parents of this layer
      const parents: string[] = [];
      for (const id of unique) {
        const ins = inMap.get(id) || [];
        for (const p of ins) {
          if (!seen.has(p)) parents.push(p);
        }
      }
      frontier = parents;
      depth++;
      if (depth > 1000) break; // guard
    }

    // Determine x positions from top to bottom to center parents above children
    const layerCount = layers.length;
    if (layerCount === 0) continue;

    // Top layer (furthest ancestors) — spread sequentially
    const top = layers[layerCount - 1];
    let nextIndex = 0;
    for (const id of top) {
      if (placed.has(id)) continue; // keep existing
      positions.set(id, { x: seqX(nextIndex), y: 0 });
      nextIndex++;
    }

    // For each layer going downward, set x as average of parents (or sequential if none)
    for (let li = layerCount - 2; li >= 0; li--) {
      const layer = layers[li];
      let idx = 0;
      for (const id of layer) {
        if (placed.has(id)) continue;
        const parents = (inMap.get(id) || []).filter(p => positions.has(p));
        let x: number;
        if (parents.length > 0) {
          const sum = parents.reduce((acc, p) => acc + (positions.get(p)!.x), 0);
          x = sum / parents.length;
        } else {
          x = seqX(idx++);
        }
        positions.set(id, { x, y: 0 });
      }
    }

    // Compaction pass: per layer, compress horizontally with even spacing while preserving order
    for (let li = layerCount - 1; li >= 0; li--) {
      const layer = layers[li];
      const items = layer
        .filter((id) => positions.has(id))
        .map((id) => ({ id, x: positions.get(id)!.x }));
      if (items.length <= 1) continue;
      items.sort((a, b) => a.x - b.x);
      const minX = items[0].x;
      const maxX = items[items.length - 1].x;
      const center = (minX + maxX) / 2;
      const start = center - ((items.length - 1) * nodeSpacing) / 2;
      items.forEach((it, i) => {
        positions.set(it.id, { x: Math.round(start + i * nodeSpacing), y: positions.get(it.id)!.y });
      });
    }

    // Compute y positions: parents above children (top at y=0)
    const maxDepth = layerCount - 1;
    for (let li = layerCount - 1; li >= 0; li--) {
      const y = (layerCount - 1 - li) * layerSpacing;
      for (const id of layers[li]) {
        const p = positions.get(id);
        if (!p) continue;
        positions.set(id, { x: p.x, y });
        placed.add(id);
      }
    }

    // Shift cluster so it starts at current cursorX (avoid overlapping previous clusters)
    let minX = Infinity, maxX = -Infinity;
    for (let li = 0; li < layerCount; li++) {
      for (const id of layers[li]) {
        const p = positions.get(id); if (!p) continue;
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
      }
    }
    const shift = cursorX - (isFinite(minX) ? minX : 0);
    if (isFinite(shift) && shift !== 0) {
      for (let li = 0; li < layerCount; li++) {
        for (const id of layers[li]) {
          const p = positions.get(id); if (!p) continue;
          positions.set(id, { x: p.x + shift, y: p.y });
        }
      }
      minX += shift; maxX += shift;
    }
    cursorX = (isFinite(maxX) ? maxX : cursorX) + nodeSpacing * 1.2;
  }

  // Normalize global minX to 0 to avoid large positive offsets
  let globalMinX = Infinity;
  positions.forEach((p) => { globalMinX = Math.min(globalMinX, p.x); });
  if (isFinite(globalMinX) && globalMinX !== 0) {
    const shift = -globalMinX;
    positions.forEach((p, id) => {
      positions.set(id, { x: Math.round(p.x + shift), y: p.y });
    });
  }

  return positions;
}
