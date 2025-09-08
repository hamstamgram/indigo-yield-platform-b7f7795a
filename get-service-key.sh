#!/bin/bash

echo "=========================================="
echo "📝 How to Get Your Supabase Service Role Key"
echo "=========================================="
echo ""
echo "1. Open your browser and go to:"
echo "   https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api"
echo ""
echo "2. Log in with your Supabase account"
echo ""
echo "3. In the API Settings page, find the section called 'Project API keys'"
echo ""
echo "4. Look for the key labeled 'service_role' (secret)"
echo "   - It's a long string starting with 'eyJ...'"
echo "   - Click the 'Reveal' button to see the full key"
echo "   - Click the copy button to copy it"
echo ""
echo "5. Once you have the key, run this command in your terminal:"
echo ""
echo "   export SUPABASE_SERVICE_ROLE_KEY=\"paste-your-key-here\""
echo ""
echo "6. Then run the import script again:"
echo ""
echo "   node import-investors-from-investments-with-service-key.js"
echo ""
echo "=========================================="
echo ""
echo "Press Enter to open the URL in your browser..."
read -r

# Try to open the URL in the default browser
if command -v open &> /dev/null; then
    open "https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api"
else
    echo "Please manually open the URL in your browser"
fi
