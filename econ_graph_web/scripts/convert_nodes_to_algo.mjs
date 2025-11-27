#!/usr/bin/env node
/*
  Convert all nodes to Python algorithm form.
  - For nodes without a computation_definition or not marked as computed,
    generate: def compute(**kwargs): return <value_or_0>
  - Sets value_type = 'computed', computation_mode = 'algorithm',
    value_manual = null, value_computed = null.

  Usage:
    NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 node scripts/convert_nodes_to_algo.mjs
*/

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.detail) msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail);
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

function buildAlgoFromValue(v) {
  const safe = (v === null || v === undefined || Number.isNaN(v)) ? 0 : v;
  return `def compute(**kwargs):\n    return ${safe}`;
}

(async function main() {
  try {
    const nodes = await api('/nodes');
    let updated = 0;
    for (const n of nodes) {
      const needsAlgo = !n.computation_definition || n.value_type !== 'computed' || n.computation_mode !== 'algorithm';
      if (!needsAlgo) continue;
      const baseValue = (n.value_manual ?? n.value_computed ?? n.value ?? 0);
      const payload = {
        value_type: 'computed',
        value_manual: null,
        value_computed: null,
        computation_mode: 'algorithm',
        computation_definition: n.computation_definition && n.computation_definition.trim().length > 0
          ? n.computation_definition
          : buildAlgoFromValue(baseValue),
      };
      try {
        await api(`/nodes/${encodeURIComponent(n.id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
        updated++;
        process.stdout.write(`✔ converted ${n.id}\n`);
      } catch (e) {
        process.stderr.write(`✖ failed ${n.id}: ${e.message}\n`);
      }
    }
    console.log(`Done. Updated ${updated} node(s).`);
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
})();

