# Manual Storage Setup Instructions

If you're getting permission errors, follow these manual steps:

## Option 1: Create Bucket via Dashboard (Recommended)

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Settings:
   - **Name**: `posts`
   - **Public bucket**: ✅ Check this (toggle ON)
   - **File size limit**: 52428800 (50MB)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`
4. Click **Create bucket**

## Option 2: Create Policies via Dashboard

After creating the bucket:

1. Go to **Storage** → **Policies**
2. Select the `posts` bucket
3. Click **New Policy**

### Policy 1: Upload Policy
- **Policy name**: `Authenticated users can upload to posts bucket`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition** (USING expression): Leave empty
- **WITH CHECK expression**: `bucket_id = 'posts'`

### Policy 2: Read Policy
- **Policy name**: `Public read access for post images`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'posts'`

### Policy 3: Update Policy (Optional)
- **Policy name**: `Allow users to update their own images`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**: 
  ```sql
  bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]
  ```
- **WITH CHECK expression**: Same as USING

### Policy 4: Delete Policy (Optional)
- **Policy name**: `Allow users to delete their own images`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: 
  ```sql
  bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]
  ```

## Minimum Required Policies

For basic functionality, you only need:
1. **INSERT policy** for authenticated users
2. **SELECT policy** for public access

The UPDATE and DELETE policies are optional but recommended for full functionality.

