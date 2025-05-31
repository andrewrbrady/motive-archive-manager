#!/bin/bash

# Client-Side Authentication Audit Script
# Identifies all files using problematic authentication patterns

echo "🔍 CLIENT-SIDE AUTHENTICATION AUDIT"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p audit-results
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="audit-results/client-auth-audit-${TIMESTAMP}.md"

# Initialize results file
cat > "$RESULTS_FILE" << EOF
# Client-Side Authentication Audit Results

Generated: $(date)

## Summary

This audit identifies all files using problematic authentication patterns that need to be updated to use proper Firebase Auth patterns.

EOF

echo "📝 Results will be saved to: $RESULTS_FILE"
echo ""

# Function to count and display results
count_and_display() {
    local pattern="$1"
    local description="$2"
    local color="$3"
    
    local count=$(eval "$pattern" | wc -l)
    printf "${color}Found $count files: $description${NC}\n"
    
    echo "" >> "$RESULTS_FILE"
    echo "## $description ($count files)" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    
    if [ $count -gt 0 ]; then
        echo '```' >> "$RESULTS_FILE"
        eval "$pattern" >> "$RESULTS_FILE"
        echo '```' >> "$RESULTS_FILE"
    else
        echo "No files found." >> "$RESULTS_FILE"
    fi
    
    return $count
}

# 1. Find files using useAPI hook (high priority)
echo "${YELLOW}1. Searching for files using useAPI hook...${NC}"
PATTERN1='grep -r "useAPI" src/ --include="*.ts" --include="*.tsx" -l | grep -v node_modules | sort'
count_and_display "$PATTERN1" "Files using useAPI hook (HIGH PRIORITY)" "$RED"
USEAPI_COUNT=$?

# 2. Find files using plain fetch to API endpoints
echo "${YELLOW}2. Searching for files using plain fetch to API endpoints...${NC}"
PATTERN2='grep -r "fetch.*['\''\"]/api/" src/ --include="*.ts" --include="*.tsx" -l | grep -v node_modules | sort'
count_and_display "$PATTERN2" "Files using plain fetch to API endpoints (HIGH PRIORITY)" "$RED"
FETCH_COUNT=$?

# 3. Find files importing useAPI
echo "${YELLOW}3. Searching for files importing useAPI...${NC}"
PATTERN3='grep -r "import.*useAPI" src/ --include="*.ts" --include="*.tsx" -l | grep -v node_modules | sort'
count_and_display "$PATTERN3" "Files importing useAPI" "$YELLOW"
IMPORT_USEAPI_COUNT=$?

# 4. Find files that might need useAuthenticatedFetch but don't have it
echo "${YELLOW}4. Searching for files that might need useAuthenticatedFetch...${NC}"
PATTERN4='grep -r "fetch.*['\''\"]/api/" src/ --include="*.ts" --include="*.tsx" -l | xargs grep -L "useAuthenticatedFetch" | grep -v node_modules | sort'
count_and_display "$PATTERN4" "Files using API fetch but missing useAuthenticatedFetch" "$YELLOW"
MISSING_AUTH_COUNT=$?

# 5. Find files using fetch but not checking for response.ok
echo "${YELLOW}5. Searching for files using fetch without proper error handling...${NC}"
PATTERN5='grep -r "fetch(" src/ --include="*.ts" --include="*.tsx" -l | xargs grep -L "response\.ok\|!response\.ok" | grep -v node_modules | sort'
count_and_display "$PATTERN5" "Files using fetch without response.ok checks" "$BLUE"
ERROR_HANDLING_COUNT=$?

# 6. Find hooks that might need authentication state checking
echo "${YELLOW}6. Searching for hooks that might need authentication state checking...${NC}"
PATTERN6='find src/hooks -name "*.ts" -exec grep -l "fetch.*['\''\"]/api/" {} \; | grep -v node_modules | sort'
count_and_display "$PATTERN6" "Hooks making API calls that might need auth state checking" "$YELLOW"
HOOKS_COUNT=$?

# 7. Find components using useState for loading without proper auth checks
echo "${YELLOW}7. Searching for components with loading states but missing auth checks...${NC}"
PATTERN7='grep -r "useState.*[Ll]oading" src/components --include="*.tsx" -l | xargs grep -l "fetch.*['\''\"]/api/" | xargs grep -L "useSession\|useAuthenticatedFetch" | grep -v node_modules | sort'
count_and_display "$PATTERN7" "Components with loading states missing auth checks" "$BLUE"
LOADING_COUNT=$?

# 8. Find files using old toast patterns
echo "${YELLOW}8. Searching for files using old toast patterns...${NC}"
PATTERN8='grep -r "toast\." src/ --include="*.ts" --include="*.tsx" -l | xargs grep -L "useToast" | grep -v node_modules | sort'
count_and_display "$PATTERN8" "Files using old toast patterns (should use useToast hook)" "$BLUE"
TOAST_COUNT=$?

# 9. Find React Query hooks that might need authentication
echo "${YELLOW}9. Searching for React Query hooks that might need authentication...${NC}"
PATTERN9='grep -r "useQuery\|useMutation" src/ --include="*.ts" --include="*.tsx" -l | xargs grep -l "fetch.*['\''\"]/api/" | xargs grep -L "useAuthenticatedFetch" | grep -v node_modules | sort'
count_and_display "$PATTERN9" "React Query hooks using API fetch without authentication" "$YELLOW"
QUERY_COUNT=$?

# 10. Find components making API calls in useEffect without auth dependency
echo "${YELLOW}10. Searching for useEffect with API calls missing auth dependencies...${NC}"
PATTERN10='grep -r "useEffect" src/components --include="*.tsx" -A 5 | grep -B 5 "fetch.*['\''\"]/api/" | grep -o "src/[^:]*" | sort -u | xargs grep -L "useSession\|useAuthenticatedFetch" | grep -v node_modules | sort'
count_and_display "$PATTERN10" "Components with useEffect API calls missing auth dependencies" "$RED"
USEEFFECT_COUNT=$?

# Summary
echo "" >> "$RESULTS_FILE"
echo "## AUDIT SUMMARY" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "| Category | Count | Priority |" >> "$RESULTS_FILE"
echo "|----------|-------|----------|" >> "$RESULTS_FILE"
echo "| Files using useAPI hook | $USEAPI_COUNT | 🔴 HIGH |" >> "$RESULTS_FILE"
echo "| Files using plain fetch to API | $FETCH_COUNT | 🔴 HIGH |" >> "$RESULTS_FILE"
echo "| Files importing useAPI | $IMPORT_USEAPI_COUNT | 🟡 MEDIUM |" >> "$RESULTS_FILE"
echo "| Files missing useAuthenticatedFetch | $MISSING_AUTH_COUNT | 🟡 MEDIUM |" >> "$RESULTS_FILE"
echo "| Files without response.ok checks | $ERROR_HANDLING_COUNT | 🔵 LOW |" >> "$RESULTS_FILE"
echo "| Hooks needing auth state checking | $HOOKS_COUNT | 🟡 MEDIUM |" >> "$RESULTS_FILE"
echo "| Components missing auth checks | $LOADING_COUNT | 🔵 LOW |" >> "$RESULTS_FILE"
echo "| Files using old toast patterns | $TOAST_COUNT | 🔵 LOW |" >> "$RESULTS_FILE"
echo "| React Query hooks missing auth | $QUERY_COUNT | 🟡 MEDIUM |" >> "$RESULTS_FILE"
echo "| useEffect missing auth dependencies | $USEEFFECT_COUNT | 🔴 HIGH |" >> "$RESULTS_FILE"

# Calculate totals
TOTAL_HIGH=$((USEAPI_COUNT + FETCH_COUNT + USEEFFECT_COUNT))
TOTAL_MEDIUM=$((IMPORT_USEAPI_COUNT + MISSING_AUTH_COUNT + HOOKS_COUNT + QUERY_COUNT))
TOTAL_LOW=$((ERROR_HANDLING_COUNT + LOADING_COUNT + TOAST_COUNT))
TOTAL_ALL=$((TOTAL_HIGH + TOTAL_MEDIUM + TOTAL_LOW))

echo "" >> "$RESULTS_FILE"
echo "**TOTALS:**" >> "$RESULTS_FILE"
echo "- 🔴 HIGH Priority: $TOTAL_HIGH files" >> "$RESULTS_FILE"
echo "- 🟡 MEDIUM Priority: $TOTAL_MEDIUM files" >> "$RESULTS_FILE"
echo "- 🔵 LOW Priority: $TOTAL_LOW files" >> "$RESULTS_FILE"
echo "- **TOTAL FILES TO REVIEW: $TOTAL_ALL**" >> "$RESULTS_FILE"

echo ""
echo "${GREEN}✅ Audit complete!${NC}"
echo ""
echo "📊 SUMMARY:"
printf "${RED}  🔴 HIGH Priority: $TOTAL_HIGH files${NC}\n"
printf "${YELLOW}  🟡 MEDIUM Priority: $TOTAL_MEDIUM files${NC}\n"
printf "${BLUE}  🔵 LOW Priority: $TOTAL_LOW files${NC}\n"
echo "  📁 TOTAL FILES TO REVIEW: $TOTAL_ALL"
echo ""
echo "📝 Detailed results saved to: $RESULTS_FILE"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Review the HIGH priority files first"
echo "2. Apply the authentication fix pattern to each file"
echo "3. Test each fix thoroughly"
echo "4. Move on to MEDIUM and LOW priority files"
echo "" 