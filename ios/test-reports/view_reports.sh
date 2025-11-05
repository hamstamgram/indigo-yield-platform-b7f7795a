#!/bin/bash

# Quick access to test reports
# Run: ./view_reports.sh [report_name]

REPORTS_DIR="/Users/mama/Desktop/Claude code/indigo-yield-platform-v01/ios/test-reports"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  iOS Testing Reports - Indigo Yield Platform${NC}"
echo -e "${GREEN}  All 115 Screens Documented${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""

if [ -z "$1" ]; then
    echo -e "${BLUE}Available Reports:${NC}"
    echo ""
    echo -e "${YELLOW}1. summary${NC}     - Executive summary (15 pages)"
    echo -e "${YELLOW}2. complete${NC}    - Complete analysis (90 pages)"
    echo -e "${YELLOW}3. guide${NC}       - Testing guide (20 pages)"
    echo -e "${YELLOW}4. matrix${NC}      - Testing matrix (30 pages)"
    echo -e "${YELLOW}5. inventory${NC}   - Screen inventory (5 pages)"
    echo ""
    echo "Usage: ./view_reports.sh [report_name]"
    echo "Example: ./view_reports.sh summary"
    exit 0
fi

case "$1" in
    summary)
        open "$REPORTS_DIR/TESTING_SUMMARY.md"
        echo "Opening executive summary..."
        ;;
    complete)
        open "$REPORTS_DIR/ios-all-screens-tests.md"
        echo "Opening complete analysis..."
        ;;
    guide)
        open "$REPORTS_DIR/QUICK_TEST_GUIDE.md"
        echo "Opening testing guide..."
        ;;
    matrix)
        open "$REPORTS_DIR/TEST_MATRIX.md"
        echo "Opening testing matrix..."
        ;;
    inventory)
        open "$REPORTS_DIR/screen_inventory.txt"
        echo "Opening screen inventory..."
        ;;
    all)
        open "$REPORTS_DIR"
        echo "Opening reports directory..."
        ;;
    *)
        echo "Unknown report: $1"
        echo "Available: summary, complete, guide, matrix, inventory, all"
        exit 1
        ;;
esac
