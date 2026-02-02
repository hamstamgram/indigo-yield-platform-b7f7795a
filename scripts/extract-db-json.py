#!/usr/bin/env python3
import json
import sys
import re

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Parse outer JSON
data = json.loads(content)
text = data[0]['text']

# Find the escaped JSON array
match = re.search(r'\[\{\\\"function_name.*?\}\]', text, re.DOTALL)
if not match:
    print("Could not find JSON array", file=sys.stderr)
    sys.exit(1)

escaped_json = match.group(0)

# Unescape the JSON
json_str = escaped_json.replace('\\"', '"').replace('\\\\', '\\')

# Parse and pretty-print
parsed = json.loads(json_str)

with open(sys.argv[2], 'w') as f:
    json.dump(parsed, f, indent=2)

print(f"Extracted {len(parsed)} functions to {sys.argv[2]}")
