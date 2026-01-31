#!/bin/bash
# Deploy backend to Railway

echo "🚀 Deploying Backend to Railway..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build (if needed)
if [ -d "build" ]; then
  echo "✓ Build directory exists"
else
  echo "⚠️  No build directory found"
fi

echo ""
echo "✅ Backend ready for deployment!"
echo ""
echo "📋 Changes made:"
echo "   1. Added ensure_schema.js migration"
echo "   2. Updated server.js to run schema check on startup"
echo "   3. Fixed predictController.js column references"
echo ""
echo "Push these changes to your Git repo to trigger Railway deployment:"
echo "   git add ."
echo "   git commit -m 'Fix: Add schema migration and fix column references'"
echo "   git push"
