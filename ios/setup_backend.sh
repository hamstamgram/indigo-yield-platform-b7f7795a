#!/bin/bash

# Setup script for connecting iOS app to Supabase backend

echo "🚀 IndigoInvestor iOS - Backend Integration Setup"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo ""
fi

# Function to update .env file
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" .env; then
        # Update existing variable
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${key}=.*|${key}=${value}|" .env
        else
            # Linux
            sed -i "s|^${key}=.*|${key}=${value}|" .env
        fi
    else
        # Add new variable
        echo "${key}=${value}" >> .env
    fi
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI not found. Installing...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install supabase/tap/supabase
    else
        # Linux
        curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz
        sudo mv supabase /usr/local/bin/
    fi
    
    echo -e "${GREEN}✅ Supabase CLI installed${NC}"
fi

# Get Supabase project details
echo ""
echo "📋 Please provide your Supabase project details:"
echo ""

read -p "Supabase Project URL (e.g., https://xxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY

# Update .env file
echo ""
echo -e "${YELLOW}Updating .env file...${NC}"
update_env_var "SUPABASE_URL" "$SUPABASE_URL"
update_env_var "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"

# Create iOS configuration file
echo ""
echo -e "${YELLOW}Creating iOS configuration...${NC}"

cat > IndigoInvestor/Config/Secrets.swift << EOF
//
//  Secrets.swift
//  IndigoInvestor
//
//  Auto-generated configuration - DO NOT COMMIT
//

import Foundation

struct Secrets {
    static let supabaseURL = "$SUPABASE_URL"
    static let supabaseAnonKey = "$SUPABASE_ANON_KEY"
}
EOF

echo -e "${GREEN}✅ iOS configuration created${NC}"

# Add Secrets.swift to .gitignore
if ! grep -q "Secrets.swift" .gitignore; then
    echo "IndigoInvestor/Config/Secrets.swift" >> .gitignore
    echo -e "${GREEN}✅ Added Secrets.swift to .gitignore${NC}"
fi

# Test Supabase connection
echo ""
echo -e "${YELLOW}Testing Supabase connection...${NC}"

# Create a simple test script
cat > test_connection.swift << 'EOF'
import Foundation

let url = URL(string: ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "")!
let session = URLSession.shared
let request = URLRequest(url: url)

let task = session.dataTask(with: request) { data, response, error in
    if let httpResponse = response as? HTTPURLResponse {
        if httpResponse.statusCode == 200 {
            print("✅ Connection successful!")
        } else {
            print("❌ Connection failed with status: \(httpResponse.statusCode)")
        }
    } else if let error = error {
        print("❌ Connection error: \(error.localizedDescription)")
    }
    exit(0)
}

task.resume()
RunLoop.main.run()
EOF

export SUPABASE_URL="$SUPABASE_URL"
swift test_connection.swift
rm test_connection.swift

# Create sample data script
echo ""
echo -e "${YELLOW}Creating sample data generator...${NC}"

cat > IndigoInvestor/Scripts/generate_sample_data.sql << 'EOF'
-- Sample data for development and testing
-- Run this in your Supabase SQL editor

-- Create sample admin user (password: Admin123!)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@indigo.com',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create sample LP user (password: Investor123!)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'investor@example.com',
    crypt('Investor123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add roles
INSERT INTO user_roles (user_id, role) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'limited_partner')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create sample investor profile
INSERT INTO investors (
    user_id, 
    email, 
    full_name, 
    phone_number, 
    investor_status,
    kyc_status
) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'investor@example.com',
    'John Sample Investor',
    '+1-555-0123',
    'active',
    'approved'
) ON CONFLICT (email) DO NOTHING;

-- Create sample portfolio
INSERT INTO portfolios (
    investor_id,
    total_invested,
    current_value,
    total_return
)
SELECT 
    id,
    1000000.00,
    1150000.00,
    150000.00
FROM investors 
WHERE email = 'investor@example.com'
ON CONFLICT (investor_id) DO NOTHING;

-- Add sample transactions
INSERT INTO transactions (
    investor_id,
    type,
    amount,
    status,
    description
)
SELECT 
    id,
    'deposit',
    1000000.00,
    'completed',
    'Initial investment'
FROM investors 
WHERE email = 'investor@example.com';

REFRESH MATERIALIZED VIEW IF EXISTS portfolio_summary;

SELECT 'Sample data created successfully!' as message;
EOF

echo -e "${GREEN}✅ Sample data generator created${NC}"

# Update Package.swift to use Environment configuration
echo ""
echo -e "${YELLOW}Updating SupabaseService configuration...${NC}"

cat > IndigoInvestor/Core/Services/SupabaseClient.swift << 'EOF'
//
//  SupabaseClient.swift
//  IndigoInvestor
//
//  Supabase client configuration
//

import Foundation
import Supabase

extension SupabaseService {
    static func createClient() -> SupabaseClient {
        // Try to use Secrets.swift first (for development)
        if let url = URL(string: Secrets.supabaseURL),
           !Secrets.supabaseAnonKey.isEmpty {
            return SupabaseClient(
                supabaseURL: url,
                supabaseKey: Secrets.supabaseAnonKey
            )
        }
        
        // Fall back to environment variables
        guard let urlString = ProcessInfo.processInfo.environment["SUPABASE_URL"],
              let url = URL(string: urlString),
              let anonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] else {
            fatalError("Supabase configuration not found. Please run setup_backend.sh")
        }
        
        return SupabaseClient(
            supabaseURL: url,
            supabaseKey: anonKey
        )
    }
}
EOF

echo -e "${GREEN}✅ Supabase client configuration updated${NC}"

# Create Xcode scheme with environment variables
echo ""
echo -e "${YELLOW}Creating Xcode scheme...${NC}"

cat > IndigoInvestor.xcscheme << EOF
<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1500"
   version = "1.3">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "IndigoInvestor"
               BuildableName = "IndigoInvestor.app"
               BlueprintName = "IndigoInvestor"
               ReferencedContainer = "container:IndigoInvestor.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "IndigoInvestor"
            BuildableName = "IndigoInvestor.app"
            BlueprintName = "IndigoInvestor"
            ReferencedContainer = "container:IndigoInvestor.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
      <EnvironmentVariables>
         <EnvironmentVariable
            key = "SUPABASE_URL"
            value = "$SUPABASE_URL"
            isEnabled = "YES">
         </EnvironmentVariable>
         <EnvironmentVariable
            key = "SUPABASE_ANON_KEY"
            value = "$SUPABASE_ANON_KEY"
            isEnabled = "YES">
         </EnvironmentVariable>
      </EnvironmentVariables>
   </LaunchAction>
</Scheme>
EOF

echo -e "${GREEN}✅ Xcode scheme created${NC}"

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Backend Integration Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Open the project in Xcode:"
echo "   open IndigoInvestor.xcodeproj"
echo ""
echo "2. Run the sample data script in Supabase SQL editor:"
echo "   IndigoInvestor/Scripts/generate_sample_data.sql"
echo ""
echo "3. Test the app with these credentials:"
echo "   Admin: admin@indigo.com / Admin123!"
echo "   LP: investor@example.com / Investor123!"
echo ""
echo "4. Build and run the app (Cmd+R)"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Never commit Secrets.swift or .env files"
echo "- Use environment variables for CI/CD"
echo "- Rotate keys regularly in production"
echo ""
echo "Need help? Check the README.md for more details."
