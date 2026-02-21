import fs from "fs";
import path from "path";

function main() {
  const sourceFile = path.join(
    process.cwd(),
    "supabase/migrations/20260302_flat_yield_engine_no_auto_crystal.sql"
  );
  const content = fs.readFileSync(sourceFile, "utf-8");

  // We want to extract apply_segmented_yield_distribution_v5 and preview_segmented_yield_distribution_v5
  const applyStart = content.indexOf(
    "CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5"
  );
  const previewStart = content.indexOf("-- 3. preview_segmented_yield_distribution_v5");

  if (applyStart === -1 || previewStart === -1) {
    throw new Error("Could not find functions to extract");
  }

  // The apply function ends before the preview function
  const applyFunc = content.substring(applyStart, previewStart).trim();

  // The preview function ends when we hit the next block (or end of file, but let's just take it to the end since there's nothing else)
  const previewFunc = content.substring(previewStart).trim();

  // Now we apply our fixes to apply_segmented_yield_distribution_v5
  // We need to change:
  // apply_transaction_with_crystallization(
  //   p_investor_id := ...,
  //   ...
  //   p_distribution_id := v_distribution_id
  // );
  // To use apply_investor_transaction without p_distribution_id

  // 1. Rename the function call
  let patchedApply = applyFunc.replace(
    /apply_transaction_with_crystallization\(/g,
    "apply_investor_transaction("
  );

  // 2. Remove p_distribution_id := v_distribution_id
  // Because it's followed by a closing parenthesis, it might have a comma before it or a newline
  patchedApply = patchedApply.replace(
    /,\s*p_distribution_id\s*:=\s*v_distribution_id\s*\)/g,
    "\n    )"
  );

  // 3. (Optional) Also ensure investor_yield_events gets distribution_id if necessary
  // Let's modify the UPDATE investor_yield_events
  patchedApply = patchedApply.replace(
    /investor_balance = v_alloc\.current_value\s+WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;/g,
    "investor_balance = v_alloc.current_value,\n        distribution_id = v_distribution_id\n      WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;"
  );

  const newContent = `-- Fix apply_segmented_yield_distribution_v5 dropped legacy RPC dependency

${patchedApply}

${previewFunc}
`;

  // Provide a timestamp for the new migration
  const dateStr = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const outPath = path.join(
    process.cwd(),
    `supabase/migrations/${dateStr}_fix_v5_yield_engine_rpc.sql`
  );

  fs.writeFileSync(outPath, newContent, "utf-8");
  console.log(`Successfully generated new migration: ${outPath}`);
}

main();
