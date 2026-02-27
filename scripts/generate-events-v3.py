#!/usr/bin/env python3
"""
Post-process excel-events-v2.json → excel-events-v3.json.

Changes:
1. Normalize YIELD event dates: 1st of month → last day of prior month
   (both 'date' and 'period_end' fields)
2. Add Sacha Oshry DEPOSIT of 100,000 USDT on 2025-10-06, placed AFTER the
   yield event for that date (seed script processes YIELD before FLOW on same date)
"""

import json
import calendar
from copy import deepcopy

INPUT  = 'scripts/seed-data/excel-events-v2.json'
OUTPUT = 'scripts/seed-data/excel-events-v3.json'

SACHA_UUID    = 'd5719d57-5308-4b9d-8a4f-a9a8aa596af4'
USDT_FUND_ID  = '8ef9dc49-e76c-4882-84ab-a449ef4326db'

SACHA_DEPOSIT = {
    "fund": "USDT",
    "fund_id": USDT_FUND_ID,
    "event_type": "FLOW",
    "date": "2025-10-06",
    "aum_after": "2155208.0000000000",
    "comment": "Sacha Oshry initial deposit 100000 USDT",
    "transactions": [
        {
            "type": "DEPOSIT",
            "investor_name": "Sacha Oshry",
            "investor_uuid": SACHA_UUID,
            "amount": "100000.0000000000",
            "fee_pct": 0.15,
            "ib_pct": None,
        }
    ],
}


def prev_month_last_day(date_str: str) -> str:
    """Return last day of the month before the given date string."""
    year, month, _ = map(int, date_str.split('-'))
    if month == 1:
        year, month = year - 1, 12
    else:
        month -= 1
    last_day = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-{last_day:02d}"


def normalize_yield_event(ev: dict) -> tuple[dict, bool]:
    """
    If a YIELD event's date is the 1st of the month, shift it (and period_end)
    to the last day of the prior month.
    Returns (potentially_modified_event, was_modified).
    """
    date_str = ev['date']
    day = int(date_str.split('-')[2])
    if day != 1:
        return ev, False

    new_date = prev_month_last_day(date_str)
    ev = deepcopy(ev)
    ev['date'] = new_date
    ev['period_end'] = new_date
    return ev, True


def main() -> None:
    with open(INPUT) as fh:
        data = json.load(fh)

    events_in = data['events']
    events_out = []
    normalized = 0
    sacha_added = False

    for ev in events_in:
        if ev['event_type'] == 'YIELD':
            ev, changed = normalize_yield_event(ev)
            if changed:
                normalized += 1
                print(f"  NORMALIZE {ev['fund']}: original 1st-of-month → {ev['date']}")

        events_out.append(ev)

        # After the USDT 2025-10-06 YIELD, insert Sacha's deposit as a FLOW.
        # The seed script sorts YIELD before FLOW on the same date, so the
        # deposit will be applied after the yield — exactly matching the Excel
        # (her round-number 100,000 balance means she joined after the yield).
        if (
            not sacha_added
            and ev['event_type'] == 'YIELD'
            and ev['fund'] == 'USDT'
            and ev['date'] == '2025-10-06'
        ):
            events_out.append(SACHA_DEPOSIT)
            sacha_added = True
            print(f"  ADDED: Sacha Oshry DEPOSIT 100,000 USDT on 2025-10-06")

    data['events'] = events_out

    print(f"\nSummary:")
    print(f"  Input events : {len(events_in)}")
    print(f"  Output events: {len(events_out)}")
    print(f"  Dates normalized: {normalized}")
    print(f"  Sacha deposit added: {sacha_added}")

    with open(OUTPUT, 'w') as fh:
        json.dump(data, fh, indent=2)
    print(f"\nSaved: {OUTPUT}")


if __name__ == '__main__':
    main()
