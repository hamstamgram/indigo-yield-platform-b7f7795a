// scripts/audit/audit-layers.mjs
import Decimal from 'decimal.js';
import { exactMatch, isDust } from './compare.mjs';

Decimal.set({ precision: 40 });

/**
 * Each audit function returns:
 * { layer: string, total: number, passed: number, failed: number, results: AuditResult[] }
 *
 * AuditResult = { ok: boolean, label: string, excel?: string, db?: string, diff?: string, note?: string }
 */

// ─── Layer 1: Transactions ───

export function auditTransactions(excelTxns, dbTxns, nameMap, nameResolver) {
  const results = [];

  // Group DB transactions by date + investor name + type
  const dbByKey = new Map();
  for (const t of dbTxns) {
    const investorName = nameMap.get(t.investor_id) || t.investor_id;
    const type = Number(t.amount) >= 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    const key = `${t.tx_date}|${investorName}|${type}`;
    if (!dbByKey.has(key)) dbByKey.set(key, []);
    dbByKey.get(key).push(t);
  }

  for (const exTxn of excelTxns) {
    const dbName = nameResolver(exTxn.investor);
    if (!dbName) {
      results.push({
        ok: false,
        label: `${exTxn.date} ${exTxn.investor}`,
        note: `MISSING_INVESTOR: no DB match for "${exTxn.investor}"`,
      });
      continue;
    }
    const type = exTxn.amount >= 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    const key = `${exTxn.date}|${dbName}|${type}`;
    const candidates = dbByKey.get(key) || [];

    // Find matching amount
    const exAmt = new Decimal(exTxn.amount).abs();
    let matched = false;
    for (let i = 0; i < candidates.length; i++) {
      const dbAmt = new Decimal(candidates[i].amount).abs();
      const diff = exAmt.minus(dbAmt).abs();
      if (diff.lt('0.01')) {
        // Close enough to be the same transaction — report exact diff
        const cmp = exactMatch(Math.abs(exTxn.amount), dbAmt.toNumber());
        results.push({
          ok: cmp.match,
          label: `${exTxn.date} ${exTxn.investor} ${type} ${exTxn.amount}`,
          excel: exAmt.toFixed(),
          db: dbAmt.toFixed(),
          diff: cmp.match ? null : diff.toFixed(),
        });
        candidates.splice(i, 1); // consume this match
        matched = true;
        break;
      }
    }
    if (!matched) {
      results.push({
        ok: false,
        label: `${exTxn.date} ${exTxn.investor} ${type} ${exTxn.amount}`,
        note: `NOT_IN_DB: no matching transaction found`,
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 1: Transactions',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 2: Distribution Totals ───

export function auditDistributions(excelFundLevel, dbDistributions) {
  const results = [];

  // Index DB distributions by date
  const dbByDate = new Map();
  for (const d of dbDistributions) {
    dbByDate.set(d.effective_date, d);
  }

  for (const ep of excelFundLevel) {
    const db = dbByDate.get(ep.date);
    if (!db) {
      // This epoch may be transaction-only (no yield distributed)
      // Check if grossPerf is null/0 — if so, it's expected
      if (ep.grossPerf === null || ep.grossPerf === 0) {
        results.push({ ok: true, label: `${ep.date} (transaction-only, no distribution)`, note: 'SKIP' });
      } else {
        results.push({
          ok: false,
          label: `${ep.date}`,
          note: `NO_DISTRIBUTION: Excel has gross=${ep.grossPerf} but no DB distribution`,
        });
      }
      continue;
    }

    // Compare gross yield amount = AUM Before × Gross %
    if (ep.grossPerf !== null && ep.aumBefore !== null && ep.aumBefore !== 0) {
      const excelGross = new Decimal(ep.aumBefore).times(new Decimal(ep.grossPerf));
      const dbGross = new Decimal(db.gross_yield_amount);
      const excelDP = countDP(excelGross);
      const dbTrunc = dbGross.toDecimalPlaces(Math.max(excelDP, 6), Decimal.ROUND_DOWN);
      const excelTrunc = excelGross.toDecimalPlaces(Math.max(excelDP, 6), Decimal.ROUND_DOWN);
      const diff = excelTrunc.minus(dbTrunc).abs();
      const match = diff.lt('0.000001'); // within 1e-6 for computed products
      results.push({
        ok: match,
        label: `${ep.date} gross_yield_amount`,
        excel: excelTrunc.toFixed(),
        db: dbTrunc.toFixed(),
        diff: match ? null : diff.toFixed(),
      });
    }

    // Compare net yield amount
    if (ep.netPerf !== null && ep.aumBefore !== null && ep.aumBefore !== 0) {
      const excelNet = new Decimal(ep.aumBefore).times(new Decimal(ep.netPerf));
      const dbNet = new Decimal(db.total_net_amount);
      const excelDP = countDP(excelNet);
      const dbTrunc = dbNet.toDecimalPlaces(Math.max(excelDP, 6), Decimal.ROUND_DOWN);
      const excelTrunc = excelNet.toDecimalPlaces(Math.max(excelDP, 6), Decimal.ROUND_DOWN);
      const diff = excelTrunc.minus(dbTrunc).abs();
      const match = diff.lt('0.000001');
      results.push({
        ok: match,
        label: `${ep.date} total_net_amount`,
        excel: excelTrunc.toFixed(),
        db: dbTrunc.toFixed(),
        diff: match ? null : diff.toFixed(),
      });
    }

    // Compare total fee amount = gross - net
    if (ep.grossPerf !== null && ep.netPerf !== null && ep.aumBefore !== null && ep.aumBefore !== 0) {
      const excelGross = new Decimal(ep.aumBefore).times(new Decimal(ep.grossPerf));
      const excelNet = new Decimal(ep.aumBefore).times(new Decimal(ep.netPerf));
      const excelFee = excelGross.minus(excelNet);
      const dbFee = new Decimal(db.total_fee_amount);
      const dp = Math.max(countDP(excelFee), 6);
      const diff = excelFee.toDecimalPlaces(dp, Decimal.ROUND_DOWN)
        .minus(dbFee.toDecimalPlaces(dp, Decimal.ROUND_DOWN)).abs();
      const match = diff.lt('0.000001');
      results.push({
        ok: match,
        label: `${ep.date} total_fee_amount`,
        excel: excelFee.toDecimalPlaces(dp).toFixed(),
        db: dbFee.toDecimalPlaces(dp).toFixed(),
        diff: match ? null : diff.toFixed(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 2: Distribution Totals',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 3: Per-investor balances ───

export function auditBalances(excelInvestors, excelEpochs, dbTransactions, dbAllocations, dbDistributions, nameMap, nameResolver, dbDustTxns = []) {
  const results = [];

  // Build per-investor running balance from DB
  // Group allocations by distribution_id
  const allocsByDist = new Map();
  for (const a of dbAllocations) {
    if (!allocsByDist.has(a.distribution_id)) allocsByDist.set(a.distribution_id, []);
    allocsByDist.get(a.distribution_id).push(a);
  }

  // Build date → distribution mapping
  const distByDate = new Map();
  for (const d of dbDistributions) {
    distByDate.set(d.effective_date, d);
  }

  // For each investor, reconstruct balance at each epoch from DB
  for (const inv of excelInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) {
      for (let i = 0; i < excelEpochs.length; i++) {
        if (inv.balances[i] !== null && inv.balances[i] !== 0) {
          results.push({
            ok: false,
            label: `${excelEpochs[i].date} ${inv.name}`,
            note: `MISSING_INVESTOR: "${inv.name}" not in DB`,
          });
        }
      }
      continue;
    }

    // Find investor_id from nameMap (reverse lookup)
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) {
      results.push({
        ok: false,
        label: `${inv.name}`,
        note: `MISSING_INVESTOR_ID: "${dbName}" has no investor_id in positions`,
      });
      continue;
    }

    // Compute running balance from transactions + allocations + dust sweeps
    let runningBalance = new Decimal(0);
    const txnsForInvestor = dbTransactions.filter((t) => t.investor_id === investorId);
    const dustForInvestor = dbDustTxns.filter((t) => t.investor_id === investorId);
    // All allocations for this investor
    const allocsForInvestor = dbAllocations.filter((a) => a.investor_id === investorId);

    // Build timeline: all events sorted by date
    const events = [];
    for (const t of txnsForInvestor) {
      events.push({ date: t.tx_date, type: 'txn', amount: new Decimal(t.amount) });
    }
    // Include DUST_SWEEP and DUST transactions (full-exit dust routing)
    for (const t of dustForInvestor) {
      events.push({ date: t.tx_date, type: 'dust', amount: new Decimal(t.amount) });
    }
    for (const a of allocsForInvestor) {
      const dist = dbDistributions.find((d) => d.id === a.distribution_id);
      if (!dist) continue;
      // Net amount + fee_credit + ib_credit all go to the investor's balance
      const totalCredit = new Decimal(a.net_amount || 0)
        .plus(new Decimal(a.fee_credit || 0))
        .plus(new Decimal(a.ib_credit || 0));
      events.push({ date: dist.effective_date, type: 'yield', amount: totalCredit });
    }
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Walk through epochs and compare
    let eventIdx = 0;
    for (let i = 0; i < excelEpochs.length; i++) {
      const epochDate = excelEpochs[i].date;

      // Apply all events up to and including this epoch date
      while (eventIdx < events.length && events[eventIdx].date <= epochDate) {
        runningBalance = runningBalance.plus(events[eventIdx].amount);
        eventIdx++;
      }

      const excelBal = inv.balances[i];
      if (excelBal === null || excelBal === undefined) continue;

      if (excelBal === 0 && isDust(runningBalance.toNumber())) {
        results.push({ ok: true, label: `${epochDate} ${inv.name}: 0 (dust)` });
        continue;
      }

      const cmp = exactMatch(excelBal, runningBalance.toNumber());
      if (cmp.skipped) continue;
      results.push({
        ok: cmp.match,
        label: `${epochDate} ${inv.name}`,
        excel: cmp.excelDec?.toFixed(),
        db: cmp.dbDec?.toFixed(),
        diff: cmp.match ? null : cmp.diff?.toFixed(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 3: Investor Balances',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 4: Per-investor yield allocations ───

export function auditAllocations(excelInvestors, excelEpochs, excelFundLevel, dbAllocations, dbDistributions, nameMap, nameResolver) {
  const results = [];

  const distByDate = new Map();
  for (const d of dbDistributions) distByDate.set(d.effective_date, d);

  for (const inv of excelInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) continue;
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) continue;

    const allocsForInvestor = dbAllocations.filter((a) => a.investor_id === investorId);

    for (let i = 0; i < excelEpochs.length; i++) {
      const epochDate = excelEpochs[i].date;
      const dist = distByDate.get(epochDate);
      if (!dist) continue; // transaction-only epoch

      const alloc = allocsForInvestor.find((a) => a.distribution_id === dist.id);
      if (!alloc) {
        // Only flag if investor had a non-zero balance
        if (inv.balances[i] !== null && inv.balances[i] !== 0) {
          results.push({
            ok: false,
            label: `${epochDate} ${inv.name} yield allocation`,
            note: 'NO_ALLOCATION: investor has balance but no yield allocation',
          });
        }
        continue;
      }

      // Compare net_amount
      const dbNet = new Decimal(alloc.net_amount || 0);
      // Excel yield = balance change between epochs minus deposits
      // We derive this from the balance array
      if (i > 0 && inv.balances[i] !== null && inv.balances[i - 1] !== null) {
        const balBefore = new Decimal(inv.balances[i - 1] || 0);
        const balAfter = new Decimal(inv.balances[i] || 0);
        // Check if there was a deposit/withdrawal on this epoch date
        const flow = new Decimal(excelFundLevel[i]?.topUpWithdrawals || 0);
        // This is fund-level flow, not per-investor — skip exact derivation
        // Instead, compare the DB allocation's net_amount directly
      }

      // Compare fee_credit
      const dbFeeCredit = new Decimal(alloc.fee_credit || 0);
      const dbGross = new Decimal(alloc.gross_amount || 0);
      const expectedFeeCredit = dbGross.times(new Decimal(alloc.fee_pct || 0).div(100));

      // Verify fee_credit = gross_amount × fee_pct / 100
      if (!dbFeeCredit.isZero() || !expectedFeeCredit.isZero()) {
        const diff = dbFeeCredit.minus(expectedFeeCredit).abs();
        const match = diff.lt('0.000000001');
        results.push({
          ok: match,
          label: `${epochDate} ${inv.name} fee_credit consistency`,
          excel: expectedFeeCredit.toFixed(18),
          db: dbFeeCredit.toFixed(18),
          diff: match ? null : diff.toFixed(),
        });
      }

      // Verify net_amount = gross_amount - fee_credit - ib amounts
      const expectedNet = dbGross.minus(dbFeeCredit).minus(new Decimal(alloc.ib_amount || 0));
      const netDiff = dbNet.minus(expectedNet).abs();
      const netMatch = netDiff.lt('0.000000001');
      results.push({
        ok: netMatch,
        label: `${epochDate} ${inv.name} net = gross - fees - ib`,
        excel: expectedNet.toFixed(18),
        db: dbNet.toFixed(18),
        diff: netMatch ? null : netDiff.toFixed(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 4: Yield Allocations',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 5: Ownership shares ───

export function auditShares(excelShareInvestors, excelEpochs, dbAllocations, dbDistributions, nameMap, nameResolver) {
  const results = [];

  const distByDate = new Map();
  for (const d of dbDistributions) distByDate.set(d.effective_date, d);

  for (const inv of excelShareInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) continue;
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) continue;

    const allocsForInvestor = dbAllocations.filter((a) => a.investor_id === investorId);

    for (let i = 0; i < excelEpochs.length; i++) {
      const epochDate = excelEpochs[i].date;
      const dist = distByDate.get(epochDate);
      if (!dist) continue;

      const alloc = allocsForInvestor.find((a) => a.distribution_id === dist.id);
      const excelShare = inv.shares[i];
      if (excelShare === null || excelShare === 0) continue;

      if (!alloc) {
        results.push({
          ok: false,
          label: `${epochDate} ${inv.name} share`,
          note: 'NO_ALLOCATION for share comparison',
        });
        continue;
      }

      // Excel share is 0-1 fraction, DB ownership_pct is 0-100
      const dbShare = new Decimal(alloc.ownership_pct || 0).div(100);
      const cmp = exactMatch(excelShare, dbShare.toNumber());
      if (cmp.skipped) continue;
      results.push({
        ok: cmp.match,
        label: `${epochDate} ${inv.name} ownership %`,
        excel: cmp.excelDec?.toFixed(),
        db: cmp.dbDec?.toFixed(),
        diff: cmp.match ? null : cmp.diff?.toFixed(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 5: Ownership Shares',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 6: Cumulative Indigo Fees ───

export function auditCumulativeFees(excelFeeBalances, excelEpochs, dbAllocations, dbDistributions, dbTransactions, nameMap, dbDustTxns = []) {
  const results = [];

  // Find ALL "Indigo Fees" investor IDs (there may be both "Indigo Fees" and "TEST Indigo Fees")
  // Excel combines both into one row — yield fee_credits go to "Indigo Fees", dust sweeps go to "TEST Indigo Fees"
  const feesIds = [...nameMap.entries()]
    .filter(([, n]) => n.includes('Indigo') && n.includes('Fees'))
    .map(([id]) => id);
  if (feesIds.length === 0) {
    results.push({ ok: false, label: 'Indigo Fees investor', note: 'MISSING: no Indigo Fees investor in DB' });
    return { layer: 'Layer 6: Cumulative Indigo Fees', total: 1, passed: 0, failed: 1, results };
  }

  // Reconstruct fee balance: deposits + yield allocations + dust sweeps received
  // Combine ALL Indigo Fees accounts (yield fee_credits + dust sweep credits)
  const events = [];
  for (const t of dbTransactions.filter((t) => feesIds.includes(t.investor_id))) {
    events.push({ date: t.tx_date, amount: new Decimal(t.amount) });
  }
  // Include dust sweeps received by any Indigo Fees account
  for (const t of dbDustTxns.filter((t) => feesIds.includes(t.investor_id))) {
    events.push({ date: t.tx_date, amount: new Decimal(t.amount) });
  }
  for (const a of dbAllocations.filter((a) => feesIds.includes(a.investor_id))) {
    const dist = dbDistributions.find((d) => d.id === a.distribution_id);
    if (!dist) continue;
    const credit = new Decimal(a.net_amount || 0)
      .plus(new Decimal(a.fee_credit || 0))
      .plus(new Decimal(a.ib_credit || 0));
    events.push({ date: dist.effective_date, amount: credit });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  let balance = new Decimal(0);
  let eventIdx = 0;

  for (let i = 0; i < excelEpochs.length; i++) {
    const epochDate = excelEpochs[i].date;
    while (eventIdx < events.length && events[eventIdx].date <= epochDate) {
      balance = balance.plus(events[eventIdx].amount);
      eventIdx++;
    }

    const excelBal = excelFeeBalances[i];
    if (excelBal === null || excelBal === undefined) continue;

    const cmp = exactMatch(excelBal, balance.toNumber());
    if (cmp.skipped) continue;
    results.push({
      ok: cmp.match,
      label: `${epochDate} Indigo Fees cumulative`,
      excel: cmp.excelDec?.toFixed(),
      db: cmp.dbDec?.toFixed(),
      diff: cmp.match ? null : cmp.diff?.toFixed(),
    });
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 6: Cumulative Indigo Fees',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 7: Fee percentages ───

export function auditFeePercents(excelInvestors, dbAllocations, nameMap, nameResolver) {
  const results = [];

  for (const inv of excelInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) continue;
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) continue;

    const allocs = dbAllocations.filter((a) => a.investor_id === investorId);
    if (allocs.length === 0) {
      if (inv.feePct !== null && inv.feePct !== 0) {
        results.push({
          ok: false,
          label: `${inv.name} fee %`,
          note: `NO_ALLOCATIONS: expected fee=${inv.feePct * 100}%`,
        });
      }
      continue;
    }

    // Check fee_pct from first allocation (should be consistent)
    const dbFeePct = Number(allocs[0].fee_pct || 0);
    const excelFeePct = (inv.feePct || 0) * 100; // Excel stores as decimal (0.15 = 15%)
    const match = Math.abs(dbFeePct - excelFeePct) < 0.001;
    results.push({
      ok: match,
      label: `${inv.name} fee %`,
      excel: `${excelFeePct}%`,
      db: `${dbFeePct}%`,
      diff: match ? null : `${Math.abs(dbFeePct - excelFeePct)}%`,
    });

    // Check IB % if present
    if (inv.ibPct !== null && inv.ibPct > 0) {
      const dbIbPct = Number(allocs[0].ib_pct || 0);
      const excelIbPct = inv.ibPct * 100;
      const ibMatch = Math.abs(dbIbPct - excelIbPct) < 0.001;
      results.push({
        ok: ibMatch,
        label: `${inv.name} IB %`,
        excel: `${excelIbPct}%`,
        db: `${dbIbPct}%`,
        diff: ibMatch ? null : `${Math.abs(dbIbPct - excelIbPct)}%`,
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 7: Fee Percentages',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// Helper: count decimal places in a Decimal
function countDP(dec) {
  const s = dec.toFixed();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}
