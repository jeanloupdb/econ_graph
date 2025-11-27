#!/usr/bin/env node
/*
  Seed three example economic graph projects with simple, practical nodes/edges.

  Usage:
    NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 node scripts/seed_projects.mjs
*/

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function ensureProject(id, name) {
  try {
    await api('/projects', { method: 'POST', body: JSON.stringify({ id, name }) });
    process.stdout.write(`✓ created project ${id}\n`);
  } catch (e) {
    if (String(e.message).includes('409')) {
      process.stdout.write(`• project ${id} already exists\n`);
    } else {
      throw e;
    }
  }
}

async function upsertNode(projectId, node) {
  try {
    node = { ...node, project_id: projectId };
    await api(`/nodes?project=${encodeURIComponent(projectId)}`, {
      method: 'POST',
      body: JSON.stringify(node),
    });
    process.stdout.write(`  ✓ node ${node.id}\n`);
  } catch (e) {
    if (String(e.message).includes('409')) {
      // update
      const update = { ...node };
      delete update.id;
      await api(`/nodes/${encodeURIComponent(node.id)}?project=${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        body: JSON.stringify(update),
      });
      process.stdout.write(`  • updated node ${node.id}\n`);
    } else {
      throw e;
    }
  }
}

// No longer create edges here — API deduces edges from compute signature

function nodeManual({ id, label, unit, value, range }) {
  const base = {
    id,
    label,
    unit,
    status: 'observed',
    confidence: 1.0,
    notes: null,
    value_computed: typeof value === 'number' ? value : null,
    computation_definition: null,
    project_id: undefined,
  };
  if (Array.isArray(range) && range.length === 2 && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
    base.plausible_range = range;
  }
  return base;
}

function nodeComputed({ id, label, unit, code, range }) {
  const normalized = /\bdef\s+compute\s*\(/.test(code.trim())
    ? code.trim()
    : `def compute(x, y):\n    return ${code.trim()}`;
  const base = {
    id,
    label,
    unit,
    status: 'unknown',
    confidence: 0.9,
    notes: null,
    value_computed: null,
    computation_definition: normalized,
    project_id: undefined,
  };
  if (Array.isArray(range) && range.length === 2 && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
    base.plausible_range = range;
  }
  return base;
}

async function seedGDPBasics() {
  const pid = 'gdp-basics';
  await ensureProject(pid, 'GDP Basics');
  // Short IDs and explicit compute signature (API will create edges automatically)
  await upsertNode(pid, nodeManual({ id: 'C', label: 'Consumption (C)', unit: 'bn USD', value: 1500 }));
  await upsertNode(pid, nodeManual({ id: 'I', label: 'Investment (I)', unit: 'bn USD', value: 500 }));
  await upsertNode(pid, nodeManual({ id: 'G', label: 'Government Spending (G)', unit: 'bn USD', value: 700 }));
  await upsertNode(pid, nodeManual({ id: 'NX', label: 'Net Exports (NX)', unit: 'bn USD', value: -100 }));
  const gdpCode = `def compute(C, I, G, NX):\n    return (C or 0) + (I or 0) + (G or 0) + (NX or 0)`;
  await upsertNode(pid, nodeComputed({ id: 'Y', label: 'GDP (Y)', unit: 'bn USD', code: gdpCode }));
}

async function seedFisher() {
  const pid = 'fisher-equation';
  await ensureProject(pid, 'Fisher Equation');
  await upsertNode(pid, nodeManual({ id: 'r', label: 'Real Rate (r)', unit: 'percent', value: 1.5 }));
  await upsertNode(pid, nodeManual({ id: 'pi_e', label: 'Expected Inflation (πe)', unit: 'percent', value: 2.0 }));
  const fisherCode = `def compute(r, pi_e):\n    return (r or 0) + (pi_e or 0)`;
  await upsertNode(pid, nodeComputed({ id: 'i', label: 'Nominal Rate (i)', unit: 'percent', code: fisherCode }));
}

async function seedPhillips() {
  const pid = 'phillips-curve';
  await ensureProject(pid, 'Phillips Curve (Simple)');
  await upsertNode(pid, nodeManual({ id: 'u', label: 'Unemployment Rate (u)', unit: 'percent', value: 6.0 }));
  await upsertNode(pid, nodeManual({ id: 'u_star', label: 'Natural Unemployment (u*)', unit: 'percent', value: 5.0 }));
  const phillipsCode = `def compute(u, u_star):\n    # Simple inverse relation: π = max(0, 4 - 0.8*(u - u*))\n    return max(0.0, 4.0 - 0.8*((u or 0) - (u_star or 0)))`;
  await upsertNode(pid, nodeComputed({ id: 'pi', label: 'Inflation (π)', unit: 'percent', code: phillipsCode }));
}

(async function main() {
  try {
    await seedGDPBasics();
    await seedFisher();
    await seedPhillips();
    console.log('Seeding complete.');
  } catch (e) {
    console.error('Seeding failed:', e.message);
    process.exit(1);
  }
})();
