#!/bin/bash
PROD_URL="https://nkfimvovosdehmyyjubn.supabase.co"
PROD_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"

curl -s "${PROD_URL}/rest/v1/yield_rates?select=*" \
  -H "apikey: ${PROD_KEY}" \
  -H "Authorization: Bearer ${PROD_KEY}"
