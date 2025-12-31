#!/bin/bash
# Extract certificate from Supabase domain

DOMAIN="nkfimvovosdehmyyjubn.supabase.co"
OUTPUT_DIR="../IndigoInvestor/Resources/Certificates"

mkdir -p "$OUTPUT_DIR"

# Download certificate chain
echo "Extracting certificate from $DOMAIN..."
openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | \
  openssl x509 -outform DER -out "$OUTPUT_DIR/supabase.cer"

if [ -f "$OUTPUT_DIR/supabase.cer" ]; then
  # Extract public key hash (SHA-256)
  openssl x509 -in "$OUTPUT_DIR/supabase.cer" -inform DER -pubkey -noout | \
    openssl pkey -pubin -outform DER | \
    openssl dgst -sha256 -binary | \
    base64 > "$OUTPUT_DIR/supabase_pin.txt"
  
  echo "✅ Certificate saved to: $OUTPUT_DIR/supabase.cer"
  echo "✅ Public key hash: $(cat $OUTPUT_DIR/supabase_pin.txt)"
else
  echo "❌ Failed to extract certificate"
  exit 1
fi
