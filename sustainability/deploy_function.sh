#!/bin/bash

echo "🚀 Deploying classify-fresh-stale function..."
echo ""

cd "$(dirname "$0")"

# Check if function exists
if [ ! -d "supabase/functions/classify-fresh-stale" ]; then
    echo "❌ Function not found!"
    exit 1
fi

echo "✅ Function found"
echo ""
echo "Using npx to deploy (no installation needed)..."
echo ""

# Use npx to run supabase without installing
npx supabase functions deploy classify-fresh-stale

if [ $? -eq 0 ]; then
    echo ""
    echo "✅✅✅ Function deployed successfully!"
    echo ""
    echo "Your app is now connected to your model API!"
else
    echo ""
    echo "❌ Deployment failed"
    echo ""
    echo "Try this instead:"
    echo "1. Go to Supabase Dashboard → Edge Functions"
    echo "2. Click 'Deploy a new function'"
    echo "3. Import from: $(pwd)/supabase/functions/classify-fresh-stale"
fi

