#!/bin/bash
# Security verification script - Run this regularly to ensure no credentials are exposed

echo "🔒 SecondBrain Security Verification"
echo "===================================="
echo ""

FAILED=0

# Check 1: .env.local is ignored
echo "1️⃣ Checking .env.local is ignored..."
if git check-ignore .env.local > /dev/null 2>&1; then
    echo "   ✅ .env.local is properly ignored"
else
    echo "   ❌ .env.local is NOT ignored!"
    FAILED=1
fi

# Check 2: .env.local is not tracked
echo ""
echo "2️⃣ Checking .env.local is not tracked..."
if git ls-files | grep -q "\.env\.local"; then
    echo "   ❌ .env.local IS tracked by git (DANGEROUS!)"
    FAILED=1
else
    echo "   ✅ .env.local is not tracked"
fi

# Check 3: No API keys in git history
echo ""
echo "3️⃣ Scanning git history for exposed credentials..."
PATTERNS=(
    "sk-ant-"
    "sk-proj-"
    "sb_secret"
    "re_[A-Za-z0-9]"
)

FOUND_CREDENTIALS=0
for pattern in "${PATTERNS[@]}"; do
    if git log --all -p | grep -q "$pattern"; then
        echo "   ❌ Found pattern: $pattern"
        FOUND_CREDENTIALS=1
        FAILED=1
    fi
done

if [ $FOUND_CREDENTIALS -eq 0 ]; then
    echo "   ✅ No exposed credentials found in history"
fi

# Check 4: .env.example has no real values
echo ""
echo "4️⃣ Checking .env.example has no real credentials..."
if grep -E "^[A-Z_]+=(sk-|sb_secret|re_[A-Za-z0-9])" .env.example > /dev/null 2>&1; then
    echo "   ❌ .env.example contains real values!"
    FAILED=1
else
    echo "   ✅ .env.example contains only templates"
fi

# Check 5: .gitignore is correct
echo ""
echo "5️⃣ Checking .gitignore configuration..."
if grep -q "\.env\.local" .gitignore && grep -q "\.env$" .gitignore; then
    echo "   ✅ .gitignore correctly configured"
else
    echo "   ❌ .gitignore missing .env patterns!"
    FAILED=1
fi

# Check 6: Pre-commit hook exists
echo ""
echo "6️⃣ Checking pre-commit hook..."
if [ -x ".git/hooks/pre-commit" ]; then
    echo "   ✅ Pre-commit hook is installed"
else
    echo "   ⚠️  Pre-commit hook not found - installing..."
    chmod +x scripts/install-hooks.sh
    ./scripts/install-hooks.sh
fi

# Summary
echo ""
echo "===================================="
if [ $FAILED -eq 0 ]; then
    echo "✅ ALL SECURITY CHECKS PASSED"
    echo ""
    echo "Your setup is secure! Remember:"
    echo "  • Never share your .env.local"
    echo "  • Never commit credentials"
    echo "  • Revoke exposed keys immediately"
    exit 0
else
    echo "❌ SECURITY ISSUES FOUND"
    echo ""
    echo "Please fix the issues above before proceeding."
    exit 1
fi
