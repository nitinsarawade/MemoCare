/**
 * Static check: every component used as <Name /> must be either imported in
 * that file or defined locally. Catches runtime crashes like the dismiss
 * modal's "FormRow is not defined". Run: node scripts/check-jsx-imports.mjs
 */
import fs from 'fs';
import path from 'path';
import url from 'url';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'src');
const primPath = path.join(root, 'components', 'ui', 'primitives.jsx');

// Collect exported names from all local component modules (primitives + any others).
const exportsByFile = new Map(); // resolved abs path -> Set(names)
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx|js)$/.test(f)) out.push(p);
  }
  return out;
}
const allFiles = walk(root);
for (const f of allFiles) {
  const t = fs.readFileSync(f, 'utf8');
  const names = new Set([...t.matchAll(/export (?:function|const) (\w+)/g)].map((m) => m[1]));
  if (names.size) exportsByFile.set(f, names);
}

// Reserved/intrinsic elements never need importing.
const intrinsic = new Set(['div','span','p','h1','h2','h3','h4','a','button','input','textarea','select','option','form','table','thead','tbody','tr','th','td','ul','li','ol','label','strong','em','code','pre','img','br','hr','svg','path','circle','nav','header','footer','section','main','aside','header']);

let problems = 0;
for (const f of allFiles) {
  const t = fs.readFileSync(f, 'utf8');

  // imports inside this file: map local name -> source module.
  // Handles both single-line and multi-line brace imports by scanning the
  // full 'import ... from' statement non-greedily across newlines.
  const importedNames = new Map(); // name -> source path
  for (const m of t.matchAll(/import\s+\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gs)) {
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean);
    const declared = m[2]; // any module, not just relative
    for (const n of names) importedNames.set(n, declared);
  }
  for (const m of t.matchAll(/import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g)) {
    importedNames.set(m[1], m[2]); // default imports
  }
  for (const m of t.matchAll(/import\s*\*\s*as\s+(\w+)/g)) {
    importedNames.set(m[1], '*'); // namespace imports: any Name after it is fine
  }
  // explicitly imported default/namespace identifiers too
  const definedNames = new Set([...t.matchAll(/(?:function|const|class)\s+(\w+)/g)].map((m) => m[1]));
  const usedViaNamespace = [...importedNames.values()].includes('*');

  // every JSX usage <Name ...>
  const used = new Set([...t.matchAll(/<([A-Z]\w*)[\s/>]/g)].map((m) => m[1]));
  for (const name of used) {
    if (definedNames.has(name)) continue;
    if (usedViaNamespace) continue;
    if (importedNames.has(name)) {
      // only verify local relative modules truly export the name
      const src = importedNames.get(name);
      if (src.startsWith('.')) {
        const srcAbs = path.resolve(path.dirname(f), src);
        const srcExports = exportsByFile.get(srcAbs);
        if (srcExports && !srcExports.has(name)) {
          console.log(`NOT EXPORTED: ${name} imported from ${path.relative(root, src)} used in ${path.relative(root, f)}`);
          problems++;
        }
      } // else: external package (react-router-dom, lucide-react, recharts…), trust it
      continue;
    }
    console.log(`MISSING IMPORT: <${name}> used in ${path.relative(root, f)}`);
    problems++;
  }
}

console.log(problems ? `${problems} problem(s)` : 'ALL CLEAN — every JSX component resolves');
process.exit(problems ? 1 : 0);
