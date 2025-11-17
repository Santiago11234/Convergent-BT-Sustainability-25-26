# Deploy classify-fresh-stale Function

## Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

## Step 2: Login to Supabase
```bash
supabase login
```
(This will open a browser to authenticate)

## Step 3: Link Your Project
```bash
cd sustainability
supabase link --project-ref YOUR_PROJECT_REF
```
(You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`)

## Step 4: Deploy the Function
```bash
supabase functions deploy classify-fresh-stale
```

That's it! Your function will be deployed and use the MODEL_API_URL secret you already set.

---

## Alternative: Deploy via Dashboard

If the dashboard has a "Deploy" or "Import" option, you can:
1. Click "Deploy a new function"
2. Select "Import from local" or "Upload"
3. Navigate to: `sustainability/supabase/functions/classify-fresh-stale`
4. Deploy!

