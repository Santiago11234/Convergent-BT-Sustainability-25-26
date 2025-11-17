#!/bin/bash

echo "🚀 Deploying classify-fresh-stale Function"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Step 1: Login
echo "Step 1: Logging into Supabase..."
echo "This will open your browser..."
echo ""
npx supabase login

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Login failed. Please run this manually:"
    echo "   npx supabase login"
    echo ""
    echo "Or get your access token from:"
    echo "   https://supabase.com/dashboard/account/tokens"
    echo "Then run:"
    echo "   export SUPABASE_ACCESS_TOKEN=your_token_here"
    echo "   npx supabase functions deploy classify-fresh-stale"
    exit 1
fi

echo ""
echo "✅ Logged in!"
echo ""

# Step 2: Link project (if needed)
echo "Step 2: Checking project link..."
if [ ! -f ".supabase/config.toml" ]; then
    echo "Project not linked. Please provide your project ref:"
    echo "(Find it in your Supabase dashboard URL)"
    read -p "Project ref: " project_ref
    npx supabase link --project-ref "$project_ref"
fi

echo ""
echo "Step 3: Deploying function..."
npx supabase functions deploy classify-fresh-stale

if [ $? -eq 0 ]; then
    echo ""
    echo "✅✅✅ SUCCESS! Function deployed!"
    echo ""
    echo "Your app is now connected to your model API!"
    echo "Test it by taking a photo in your app! 🎉"
else
    echo ""
    echo "❌ Deployment failed"
    echo ""
    echo "Try manually:"
    echo "   npx supabase functions deploy classify-fresh-stale"
fi

