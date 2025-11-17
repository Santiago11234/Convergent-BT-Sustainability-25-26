# 🚀 Easy Deploy - Just Run This!

I can't do the interactive login for you, but here's the easiest way:

## Option 1: Run the Script (Easiest)

```bash
cd sustainability
./deploy_now.sh
```

This will:
1. Open your browser to login
2. Ask for your project ref (if needed)
3. Deploy the function automatically

---

## Option 2: Manual Steps (If script doesn't work)

### Step 1: Login
```bash
cd sustainability
npx supabase login
```
(This opens your browser - just click "Authorize")

### Step 2: Link Project (if first time)
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```
(Find your project ref in your Supabase dashboard URL)

### Step 3: Deploy
```bash
npx supabase functions deploy classify-fresh-stale
```

---

## Option 3: Use Access Token (No Browser)

1. Go to: https://supabase.com/dashboard/account/tokens
2. Create a new token
3. Copy it
4. Run:
```bash
cd sustainability
export SUPABASE_ACCESS_TOKEN=your_token_here
npx supabase functions deploy classify-fresh-stale
```

---

**Once deployed, your app will use your real model!** 🎉

