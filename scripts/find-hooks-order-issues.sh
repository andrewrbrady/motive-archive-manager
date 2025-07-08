#!/bin/bash

# Script to find React components with hooks order issues
# Looks for useAPI components with early returns before other hooks

echo "🔍 Scanning for React hooks order issues..."
echo "Looking for pattern: useAPI + component-level early return + hooks after return"
echo "================================================="

FOUND_ISSUES=0

# Function to check a file for the problematic pattern
check_file() {
    local file="$1"
    
    # Skip test files and __test__ directories
    if [[ "$file" =~ __test|\.test\.|\.spec\. ]]; then
        return 0
    fi
    
    # Check if file uses useAPI
    if ! grep -q "useAPI" "$file" 2>/dev/null; then
        return 0
    fi
    
    # Get the line number where useAPI is called
    local useapi_line=$(grep -n "const.*useAPI()" "$file" 2>/dev/null | head -1 | cut -d: -f1)
    if [[ -z "$useapi_line" ]]; then
        return 0
    fi
    
    # Look for component-level early returns (not inside functions)
    # We need to find "if (!api)" that's at component level, followed by "return"
    local return_line=""
    
    # Find lines with "if (!api)" that are likely at component level
    # Look for minimal indentation (0-4 spaces) which indicates component level
    while IFS=':' read -r line_num line_content; do
        # Skip empty results
        [[ -z "$line_num" || -z "$line_content" ]] && continue
        
        # Check indentation - component level should have minimal indentation
        # Count leading spaces
        local leading_spaces=$(echo "$line_content" | sed 's/[^ ].*//' | wc -c)
        leading_spaces=$((leading_spaces - 1))  # wc -c includes newline
        
        # Component level: 0-4 spaces, Function level: 6+ spaces
        if [[ $leading_spaces -le 4 ]]; then
            # Check if this contains "if (!api)" and next few lines have return
            if echo "$line_content" | grep -q "if.*!api"; then
                # Look ahead for return statement at similar indentation level
                local check_lines=$(tail -n +$((line_num + 1)) "$file" | head -3)
                if echo "$check_lines" | grep -q "return"; then
                    return_line=$line_num
                    break
                fi
            fi
        fi
    done < <(grep -n "if.*!api" "$file" 2>/dev/null)
    
    if [[ -z "$return_line" ]]; then
        return 0
    fi
    
    # Check if there are actual React hooks called after the return line
    # Look for lines that start with hook calls (const/let hookName = useHook)
    # Also look for standalone hook calls (useEffect, etc.)
    local hooks_after=$(tail -n +$((return_line + 3)) "$file" | grep -E "^\s*(const|let)\s+.*\s*=\s*use[A-Z]|^\s*use(State|Effect|Memo|Callback|Context|Reducer|Ref|LayoutEffect|API)\s*\(" | head -5)
    
    if [[ ! -z "$hooks_after" ]]; then
        echo "❌ ISSUE FOUND: $file"
        echo "   - useAPI at line $useapi_line"
        echo "   - Component-level early return at line $return_line"
        echo "   - React hooks found after return:"
        echo "$hooks_after" | while IFS= read -r line; do
            echo "     • $(echo "$line" | xargs)"
        done
        echo ""
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
        return 1
    fi
    
    return 0
}

# Find all TypeScript React files
find src -name "*.tsx" -type f | while read -r file; do
    check_file "$file"
done

# Summary
echo "================================================="
if [[ $FOUND_ISSUES -eq 0 ]]; then
    echo "✅ No hooks order issues found!"
else
    echo "❌ Found $FOUND_ISSUES files with potential hooks order issues"
fi

echo ""
echo "To fix these issues:"
echo "1. Move ALL hooks before the 'if (!api) return' statement"
echo "2. Add 'if (!api) return;' checks inside useEffect hooks"
echo "3. Add 'api' to dependency arrays where needed"
echo ""
echo "See: tasks/react-hooks-order-audit-instructions.md" 