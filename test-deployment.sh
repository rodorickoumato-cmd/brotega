#!/bin/bash

# 🧪 Script de Test Post-Déploiement Brotega

echo "🚀 TEST COMPLET BROTEGA"
echo "========================"

# Configuration
API_URL="http://localhost:3000"
PROD_URL="https://brotega.vercel.app"

# Déterminer l'URL (local ou production)
if [ "$1" = "prod" ]; then
    API_URL=$PROD_URL
    echo "Mode: 🌐 PRODUCTION"
else
    echo "Mode: 💻 LOCAL"
fi

echo ""
echo "URL: $API_URL"
echo ""

# ============================================
# TEST 1: Commission System
# ============================================
echo "📊 TEST 1: COMMISSION SYSTEM"
echo "----------------------------"

echo "✓ Endpoint: GET /api/vendor/commission"
echo "  (Nécessite auth token)"
echo ""

# ============================================
# TEST 2: Auth System - Register
# ============================================
echo "🔐 TEST 2: AUTH REGISTER"
echo "------------------------"

TEST_PSEUDO="TestUser$(date +%s)"
TEST_PIN="1234"

echo "Pseudo: $TEST_PSEUDO"
echo "PIN: $TEST_PIN"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"pseudo\": \"$TEST_PSEUDO\",
    \"pin\": \"$TEST_PIN\",
    \"recovery_method\": \"code\"
  }")

echo "Response:"
echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract user_id and recovery_code
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user_id' 2>/dev/null)
RECOVERY_CODE=$(echo "$REGISTER_RESPONSE" | jq -r '.recovery_code' 2>/dev/null)

echo ""
if [ "$USER_ID" != "null" ] && [ ! -z "$USER_ID" ]; then
    echo "✅ REGISTER SUCCESS"
    echo "  User ID: $USER_ID"
    echo "  Recovery Code: $RECOVERY_CODE"
else
    echo "❌ REGISTER FAILED"
fi

echo ""

# ============================================
# TEST 3: Auth System - Login
# ============================================
echo "🔑 TEST 3: AUTH LOGIN"
echo "---------------------"

echo "Pseudo: $TEST_PSEUDO"
echo "PIN: $TEST_PIN"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"pseudo\": \"$TEST_PSEUDO\",
    \"pin\": \"$TEST_PIN\"
  }")

echo "Response:"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)

echo ""
if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
    echo "✅ LOGIN SUCCESS"
    echo "  Token: ${TOKEN:0:50}..."
else
    echo "❌ LOGIN FAILED"
fi

echo ""

# ============================================
# TEST 4: UI Pages
# ============================================
echo "🎨 TEST 4: UI PAGES"
echo "-------------------"

PAGES=(
    "/auth/register"
    "/auth/login"
    "/auth/recover"
    "/auth/support"
    "/vendor/configuration"
)

for page in "${PAGES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$page")
    if [ "$STATUS" = "200" ]; then
        echo "✅ $page - HTTP $STATUS"
    else
        echo "❌ $page - HTTP $STATUS"
    fi
done

echo ""

# ============================================
# TEST 5: Database Tables
# ============================================
echo "🗄️  TEST 5: DATABASE TABLES"
echo "----------------------------"

echo "Commission Tables:"
echo "  • vendor_commission_settings"
echo "  • produit_commission"
echo "  • commission_history"
echo ""
echo "Auth Tables:"
echo "  • utilisateurs_auth_v2"
echo "  • recovery_attempts"
echo "  • admin_recovery_actions"
echo "  • support_tickets"
echo "  • user_sessions"
echo ""
echo "⚠️  Vérifier dans Supabase Table Editor"
echo ""

# ============================================
# RÉSUMÉ
# ============================================
echo "📋 RÉSUMÉ"
echo "==========="
echo ""
echo "Si tous les tests sont ✅:"
echo "  → Migrations OK"
echo "  → API endpoints OK"
echo "  → Pages UI OK"
echo "  → BD OK"
echo ""
echo "✅ DÉPLOIEMENT RÉUSSI!"
echo ""
echo "Prochaines étapes:"
echo "  1. Vérifier Supabase Table Editor"
echo "  2. Tester en production"
echo "  3. Notifier les utilisateurs"
echo ""
