

## Auto-fetch YouTube Profile Pictures — Current State & Enhancement Options

### What Already Exists
The edge function `fetch-creator-avatars` is fully implemented and functional. It:
- Fetches YouTube channel thumbnails via the YouTube Data API
- Updates the `avatar_url` field for creators with a `youtube_channel_id`
- Requires admin authentication
- Has rate limiting (100ms delay between API calls)
- Supports filtering to only update missing avatars (`only_missing` flag)

### Potential Enhancements

**Option A: Add a button in the Admin Panel to trigger it**
- Add a "Sync YouTube Avatars" button in the admin panel UI
- Show results (how many updated, which failed)

**Option B: Auto-run on creator creation/update**
- When a new creator is added or their `youtube_channel_id` is updated, automatically fetch the avatar
- Could be done via a database trigger + pg_net, or by calling the function from the frontend after creator save

**Option C: Scheduled auto-sync (periodic refresh)**
- Set up a cron-like mechanism (e.g., call the function weekly) to keep avatars fresh
- Would require an external scheduler or a Supabase pg_cron extension

### Technical Details
- Edge function: `supabase/functions/fetch-creator-avatars/index.ts`
- YouTube API key: Already configured as `YOUTUBE_API_KEY` secret
- The function uses `snippet.thumbnails.high` (preferring high > medium > default quality)
- Admin auth is enforced via JWT + `user_roles` table check

