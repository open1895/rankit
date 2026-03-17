

## Problem Analysis

The `400 validation_failed: missing OAuth secret` error occurs on **both** Google and Apple login. The code logic is:
- **Lovable preview domain**: Uses `lovable.auth.signInWithOAuth()` (managed by Lovable Cloud)
- **Custom domain (rankit.today)**: Uses `supabase.auth.signInWithOAuth()` directly

The error indicates that OAuth provider secrets are not configured in the backend authentication settings. For Google on Lovable domains, the managed solution should handle this automatically, but it appears the configuration may need to be re-initialized or verified.

## Plan

### 1. Verify/Fix Cloud Authentication Configuration
- Use the Configure Social Auth tool to ensure the Lovable Cloud managed Google OAuth is properly set up
- This regenerates the necessary OAuth bridge configuration

### 2. Hide Apple Login Button
- Apple OAuth requires manual credential setup (Service ID, Team ID, Key ID, Private Key) which is not yet done
- Remove or conditionally hide the Apple login button in `src/pages/Auth.tsx`

### 3. Improve Error Handling in Auth Page
- Catch the raw `400 validation_failed` JSON response in both `handleGoogleLogin` and `handleAppleLogin`
- Display a user-friendly Korean error message like "소셜 로그인 설정이 준비 중입니다" instead of exposing the raw error

### 4. Custom Domain OAuth Flow
- The custom domain path uses `supabase.auth.signInWithOAuth()` directly, which also requires the provider to be enabled in the backend
- Since Google is managed by Lovable Cloud, the same credentials should work for both paths once properly configured

### Files to Modify
- **`src/pages/Auth.tsx`**: Hide Apple button, improve error messages for OAuth failures

### Backend Action Required
- Re-run the Configure Social Auth tool to ensure Google provider is active in Lovable Cloud
- User will need to open the backend dashboard to verify Google is enabled under Users → Authentication Settings → Sign In Methods

