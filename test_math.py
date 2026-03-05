aum = 1252 + 234.17
gain = 1500 - aum
paul_gross = gain * (234.17 / aum)

# Paul Net = 236.02 - 234.17 = 1.85
# Fees = 0.2942
# IB = 0.0327

print(f"Paul Gross Check: {paul_gross}")
print(f"Sum matches: {1.85 + 0.2942 + 0.0327} vs {paul_gross}")

fee_pct = 0.2942 / paul_gross
ib_pct = 0.0327 / paul_gross

print(f"Fee Pct Required: {fee_pct*100}%")
print(f"IB Pct Required: {ib_pct*100}%")
print(f"Total Pct: {(fee_pct+ib_pct)*100}%")
