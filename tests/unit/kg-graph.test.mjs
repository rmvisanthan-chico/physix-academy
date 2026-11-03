/* Knowledge graph (KG_EDGES) tests — validates prerequisite edge structure.
 * Extracts KG_EDGES from js/graph.js via regex because graph.js imports
 * browser-dependent modules. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* Extract all ['id1', 'id2'] pairs from KG_EDGES. */
function extractEdges() {
  const src = readFileSync(resolve(ROOT, 'js', 'graph.js'), 'utf8');
  const edges = [];
  const edgeRegex = /\['([a-z0-9.]+)',\s*'([a-z0-9.]+)'\]/g;
  let m;
  while ((m = edgeRegex.exec(src)) !== null) {
    edges.push([m[1], m[2]]);
  }
  return edges;
}

/* Extract all chapter ids from all curriculum data files */
function extractChapterIds() {
  const ids = new Set();
  const files = [
    'js/data-core.js',
    'js/data-ncert9.js',
    'js/data-ncert10.js',
    'js/data-ncert11.js',
    'js/data-ncert12.js',
    'js/data-l3a.js',
    'js/data-l3b.js',
    'js/data-l3c.js',
    'js/data-l3d.js',
    'js/data-l3e.js',
    'js/data-l4.js'
  ];
  for (const f of files) {
    try {
      const src = readFileSync(resolve(ROOT, f), 'utf8');
      const chRegex = /\bid:\s*'(l[1-4]\.[a-z0-9]+)'/g;
      let m;
      while ((m = chRegex.exec(src)) !== null) {
        ids.add(m[1]);
      }
    } catch {
      /* file may not exist in this build */
    }
  }
  return ids;
}

describe('KG_EDGES', () => {
  const edges = extractEdges();
  const chapterIds = extractChapterIds();

  test('has a substantial number of edges', () => {
    assert.ok(edges.length >= 40, `expected 40+ edges, got ${edges.length}`);
  });

  test('all edges are unique', () => {
    const keys = edges.map((e) => e.join('->'));
    const unique = new Set(keys);
    assert.equal(keys.length, unique.size, 'duplicate edges found');
  });

  test('no self-references', () => {
    for (const [from, to] of edges) {
      assert.notEqual(from, to, `self-referencing edge ${from}->${to}`);
    }
  });

  test('all referenced chapters exist in curriculum data', () => {
    const referenced = new Set(edges.flat());
    for (const id of referenced) {
      assert.ok(chapterIds.has(id), `edge references unknown chapter "${id}"`);
    }
  });

  test('graph is a DAG (no cycles)', () => {
    const visited = new Set();
    const visiting = new Set();
    const adj = new Map();
    for (const [from, to] of edges) {
      if (!adj.has(from)) adj.set(from, []);
      adj.get(from).push(to);
    }
    function dfs(node) {
      if (visiting.has(node)) return false;
      if (visited.has(node)) return true;
      visiting.add(node);
      for (const next of adj.get(node) || []) {
        if (!dfs(next)) return false;
      }
      visiting.delete(node);
      visited.add(node);
      return true;
    }
    for (const node of adj.keys()) {
      assert.ok(dfs(node), `cycle detected at node ${node}`);
    }
  });

  test('all edges connect to valid level prefixes', () => {
    for (const [from, to] of edges) {
      assert.ok(from.startsWith('l'), `invalid node "${from}"`);
      assert.ok(to.startsWith('l'), `invalid node "${to}"`);
      assert.ok(/^l[1-4]\./.test(from), `node "${from}" does not match l<level>.<chapter> pattern`);
      assert.ok(/^l[1-4]\./.test(to), `node "${to}" does not match l<level>.<chapter> pattern`);
    }
  });
});
