# IndigoInvestor iOS App Makefile
# Development automation and build tasks

.PHONY: help bootstrap clean build-dev build-staging build-prod test lint format archive beta install-deps

# Default target
help:
	@echo "IndigoInvestor iOS Development Commands:"
	@echo ""
	@echo "  make bootstrap      - Initial setup (install dependencies, configure environment)"
	@echo "  make build-dev      - Build for development"
	@echo "  make build-staging  - Build for staging"
	@echo "  make build-prod     - Build for production"
	@echo "  make test           - Run all tests"
	@echo "  make test-unit      - Run unit tests only"
	@echo "  make test-ui        - Run UI tests only"
	@echo "  make test-rls       - Run RLS tests against Supabase"
	@echo "  make lint           - Run SwiftLint"
	@echo "  make format         - Format code with SwiftFormat"
	@echo "  make archive        - Create release archive"
	@echo "  make beta           - Upload to TestFlight"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make docs           - Generate documentation"

# Bootstrap the development environment
bootstrap:
	@echo "🚀 Bootstrapping IndigoInvestor iOS development environment..."
	@./scripts/bootstrap.sh

# Install dependencies
install-deps:
	@echo "📦 Installing dependencies..."
	@cd IndigoInvestor && swift package resolve
	@bundle install --path vendor/bundle

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf build/
	@rm -rf DerivedData/
	@xcodebuild clean -workspace IndigoInvestor.xcworkspace -scheme "IndigoInvestor Dev"

# Build for development
build-dev:
	@echo "🔨 Building for development..."
	@xcodebuild build \
		-workspace IndigoInvestor.xcworkspace \
		-scheme "IndigoInvestor Dev" \
		-configuration Debug \
		-destination "platform=iOS Simulator,name=iPhone 15 Pro" \
		ONLY_ACTIVE_ARCH=YES \
		| xcpretty

# Build for staging
build-staging:
	@echo "🔨 Building for staging..."
	@xcodebuild build \
		-workspace IndigoInvestor.xcworkspace \
		-scheme "IndigoInvestor Staging" \
		-configuration Release \
		-destination "generic/platform=iOS" \
		| xcpretty

# Build for production
build-prod:
	@echo "🔨 Building for production..."
	@xcodebuild build \
		-workspace IndigoInvestor.xcworkspace \
		-scheme "IndigoInvestor Production" \
		-configuration Release \
		-destination "generic/platform=iOS" \
		CODE_SIGNING_REQUIRED=YES \
		| xcpretty

# Run all tests
test: test-unit test-ui test-rls

# Run unit tests
test-unit:
	@echo "🧪 Running unit tests..."
	@xcodebuild test \
		-workspace IndigoInvestor.xcworkspace \
		-scheme "IndigoInvestor Dev" \
		-destination "platform=iOS Simulator,name=iPhone 15 Pro" \
		-only-testing:IndigoInvestorTests \
		| xcpretty

# Run UI tests
test-ui:
	@echo "🧪 Running UI tests..."
	@xcodebuild test \
		-workspace IndigoInvestor.xcworkspace \
		-scheme "IndigoInvestor Dev" \
		-destination "platform=iOS Simulator,name=iPhone 15 Pro" \
		-only-testing:IndigoInvestorUITests \
		| xcpretty

# Run RLS tests
test-rls:
	@echo "🔒 Running RLS tests..."
	@cd ../supabase && npm run test:rls

# Lint code
lint:
	@echo "🔍 Running SwiftLint..."
	@swiftlint --config .swiftlint.yml

# Format code
format:
	@echo "✨ Formatting code..."
	@swiftformat . --config .swiftformat

# Create archive for App Store
archive:
	@echo "📦 Creating release archive..."
	@xcodebuild archive \
		-workspace IndigoInvestor.xcworkspace \
		-scheme "IndigoInvestor Production" \
		-configuration Release \
		-archivePath build/IndigoInvestor.xcarchive \
		| xcpretty

# Upload to TestFlight
beta:
	@echo "🚀 Uploading to TestFlight..."
	@bundle exec fastlane beta

# Generate documentation
docs:
	@echo "📚 Generating documentation..."
	@jazzy \
		--clean \
		--author "Indigo Yield" \
		--module IndigoInvestor \
		--source-directory IndigoInvestor \
		--output docs/

# Run the app in simulator
run-dev:
	@echo "▶️ Running in simulator..."
	@xcodebuild build-for-testing \
		-workspace IndigoInvestor.xcworkspace \
		-scheme "IndigoInvestor Dev" \
		-destination "platform=iOS Simulator,name=iPhone 15 Pro"
	@xcrun simctl boot "iPhone 15 Pro" || true
	@xcrun simctl install booted build/Debug-iphonesimulator/IndigoInvestor.app
	@xcrun simctl launch booted com.indigoyield.investor.dev

# Setup git hooks
setup-hooks:
	@echo "🪝 Setting up git hooks..."
	@cp scripts/hooks/* .git/hooks/
	@chmod +x .git/hooks/*

# Check environment
check-env:
	@echo "🔍 Checking environment..."
	@./scripts/check-env.sh
