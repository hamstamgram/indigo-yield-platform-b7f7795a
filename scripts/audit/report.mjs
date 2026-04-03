// scripts/audit/report.mjs

export function printHeader(excelPath) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  EXCEL vs DB EXACT-MATCH AUDIT                          ║');
  console.log(`║  Excel: ${excelPath.split('/').pop().padEnd(48)}║`);
  console.log('║  DB: nkfimvovosdehmyyjubn (Indigo Yield)                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

export function printFundHeader(label) {
  console.log(`━━━ ${label} ━━━`);
  console.log('');
}

export function printLayerResult(layerResult, verbose = false) {
  const { layer, total, passed, failed, results } = layerResult;

  console.log(`${layer} (${total} checks)`);

  // Always show failures
  const failures = results.filter((r) => !r.ok);
  for (const f of failures) {
    if (f.note) {
      console.log(`  ✗ ${f.label} — ${f.note}`);
    } else {
      console.log(`  ✗ ${f.label}: excel=${f.excel} db=${f.db} diff=${f.diff}`);
    }
  }

  // Show passes only in verbose mode
  if (verbose) {
    const passes = results.filter((r) => r.ok);
    for (const p of passes) {
      if (p.note === 'SKIP') {
        console.log(`  ⊘ ${p.label}`);
      } else {
        console.log(`  ✓ ${p.label}`);
      }
    }
  }

  const statusIcon = failed === 0 ? '✓' : '✗';
  console.log(`  ${statusIcon} RESULT: ${passed}/${total} passed${failed > 0 ? `, ${failed} mismatches` : ''}`);
  console.log('');

  return { passed, failed };
}

export function printGrandTotal(totals) {
  const totalChecks = totals.reduce((s, t) => s + t.passed + t.failed, 0);
  const totalPassed = totals.reduce((s, t) => s + t.passed, 0);
  const totalFailed = totals.reduce((s, t) => s + t.failed, 0);
  const exitCode = totalFailed > 0 ? 1 : 0;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`GRAND TOTAL: ${totalChecks.toLocaleString()} checks — ${totalPassed.toLocaleString()} passed, ${totalFailed.toLocaleString()} mismatches`);
  console.log(`EXIT CODE: ${exitCode}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  return exitCode;
}
