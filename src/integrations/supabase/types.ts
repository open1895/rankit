export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      battle_votes: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          user_id: string
          voted_creator_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          user_id: string
          voted_creator_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          user_id?: string
          voted_creator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_votes_voted_creator_id_fkey"
            columns: ["voted_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          category: string
          created_at: string
          creator_a_id: string
          creator_b_id: string
          ends_at: string
          featured: boolean
          id: string
          status: string
          votes_a: number
          votes_b: number
          winner_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          creator_a_id: string
          creator_b_id: string
          ends_at?: string
          featured?: boolean
          id?: string
          status?: string
          votes_a?: number
          votes_b?: number
          winner_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          creator_a_id?: string
          creator_b_id?: string
          ends_at?: string
          featured?: boolean
          id?: string
          status?: string
          votes_a?: number
          votes_b?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battles_creator_a_id_fkey"
            columns: ["creator_a_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_creator_b_id_fkey"
            columns: ["creator_b_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      board_post_comments: {
        Row: {
          created_at: string
          id: string
          message: string
          nickname: string
          parent_id: string | null
          post_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          nickname: string
          parent_id?: string | null
          post_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          nickname?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "board_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "board_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      board_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_identifier: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_identifier: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_identifier?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "board_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      board_posts: {
        Row: {
          author: string
          category: string
          comments_count: number
          content: string
          created_at: string
          id: string
          image_urls: string[] | null
          is_active: boolean
          likes: number
          title: string
          user_id: string | null
        }
        Insert: {
          author?: string
          category?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          likes?: number
          title: string
          user_id?: string | null
        }
        Update: {
          author?: string
          category?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          likes?: number
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      boost_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          creator_id: string
          current_points: number
          ends_at: string
          goal: number
          id: string
          started_at: string
          started_by: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          creator_id: string
          current_points?: number
          ends_at?: string
          goal?: number
          id?: string
          started_at?: string
          started_by: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          current_points?: number
          ends_at?: string
          goal?: number
          id?: string
          started_at?: string
          started_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_campaigns_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_contributions: {
        Row: {
          action_type: string
          campaign_id: string
          created_at: string
          id: string
          points: number
          user_id: string
        }
        Insert: {
          action_type?: string
          campaign_id: string
          created_at?: string
          id?: string
          points?: number
          user_id: string
        }
        Update: {
          action_type?: string
          campaign_id?: string
          created_at?: string
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "boost_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          message: string
          nickname: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          message: string
          nickname: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          message?: string
          nickname?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          message: string
          nickname: string
          post_count: number
          vote_count: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          message: string
          nickname: string
          post_count?: number
          vote_count?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          message?: string
          nickname?: string
          post_count?: number
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "comments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          pending_amount: number
          settled_amount: number
          total_earnings: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          pending_amount?: number
          settled_amount?: number
          total_earnings?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          pending_amount?: number
          settled_amount?: number
          total_earnings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_feed_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_feed_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "creator_feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_feed_posts: {
        Row: {
          content: string
          created_at: string
          creator_id: string
          id: string
          image_url: string
          likes_count: number
        }
        Insert: {
          content?: string
          created_at?: string
          creator_id: string
          id?: string
          image_url?: string
          likes_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          creator_id?: string
          id?: string
          image_url?: string
          likes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_feed_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_rewards: {
        Row: {
          created_at: string
          creator_id: string
          display_order: number
          id: string
          media_url: string
          reward_type: string
          thanks_message: string
          threshold_votes: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          display_order?: number
          id?: string
          media_url?: string
          reward_type?: string
          thanks_message?: string
          threshold_votes?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          display_order?: number
          id?: string
          media_url?: string
          reward_type?: string
          thanks_message?: string
          threshold_votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_rewards_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          avatar_url: string
          category: string
          channel_link: string
          chzzk_channel_id: string
          chzzk_followers: number
          claim_message: string | null
          claimed: boolean
          claimed_at: string | null
          contact_email: string | null
          created_at: string
          id: string
          instagram_followers: number
          instagram_handle: string | null
          is_promoted: boolean
          is_verified: boolean
          last_stats_updated: string | null
          name: string
          promotion_end: string | null
          promotion_start: string | null
          promotion_status: string
          promotion_type: string
          rank: number
          rankit_score: number
          subscriber_count: number
          tiktok_followers: number
          user_id: string | null
          verification_status: string
          votes_count: number
          youtube_channel_id: string
          youtube_subscribers: number
        }
        Insert: {
          avatar_url?: string
          category?: string
          channel_link?: string
          chzzk_channel_id?: string
          chzzk_followers?: number
          claim_message?: string | null
          claimed?: boolean
          claimed_at?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          instagram_followers?: number
          instagram_handle?: string | null
          is_promoted?: boolean
          is_verified?: boolean
          last_stats_updated?: string | null
          name: string
          promotion_end?: string | null
          promotion_start?: string | null
          promotion_status?: string
          promotion_type?: string
          rank?: number
          rankit_score?: number
          subscriber_count?: number
          tiktok_followers?: number
          user_id?: string | null
          verification_status?: string
          votes_count?: number
          youtube_channel_id?: string
          youtube_subscribers?: number
        }
        Update: {
          avatar_url?: string
          category?: string
          channel_link?: string
          chzzk_channel_id?: string
          chzzk_followers?: number
          claim_message?: string | null
          claimed?: boolean
          claimed_at?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          instagram_followers?: number
          instagram_handle?: string | null
          is_promoted?: boolean
          is_verified?: boolean
          last_stats_updated?: string | null
          name?: string
          promotion_end?: string | null
          promotion_start?: string | null
          promotion_status?: string
          promotion_type?: string
          rank?: number
          rankit_score?: number
          subscriber_count?: number
          tiktok_followers?: number
          user_id?: string | null
          verification_status?: string
          votes_count?: number
          youtube_channel_id?: string
          youtube_subscribers?: number
        }
        Relationships: []
      }
      event_banners: {
        Row: {
          banner_type: string
          bg_color: string | null
          created_at: string
          description: string
          emoji: string | null
          ends_at: string
          id: string
          is_active: boolean
          link_label: string | null
          link_url: string | null
          priority: number
          starts_at: string
          title: string
        }
        Insert: {
          banner_type?: string
          bg_color?: string | null
          created_at?: string
          description?: string
          emoji?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          priority?: number
          starts_at?: string
          title: string
        }
        Update: {
          banner_type?: string
          bg_color?: string | null
          created_at?: string
          description?: string
          emoji?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          priority?: number
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      hall_of_fame: {
        Row: {
          created_at: string
          creator_id: string
          final_rank: number
          final_votes: number
          id: string
          period_end: string
          period_label: string
          period_start: string
          period_type: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          final_rank?: number
          final_votes?: number
          id?: string
          period_end: string
          period_label: string
          period_start: string
          period_type: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          final_rank?: number
          final_votes?: number
          id?: string
          period_end?: string
          period_label?: string
          period_start?: string
          period_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hall_of_fame_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          category: string
          channel_url: string
          created_at: string
          creator_name: string
          id: string
          reason: string
          status: string
        }
        Insert: {
          category?: string
          channel_url: string
          created_at?: string
          creator_name: string
          id?: string
          reason?: string
          status?: string
        }
        Update: {
          category?: string
          channel_url?: string
          created_at?: string
          creator_name?: string
          id?: string
          reason?: string
          status?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      point_purchases: {
        Row: {
          created_at: string
          id: string
          item_id: string
          price_paid: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          price_paid: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          price_paid?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          created_at: string
          id: string
          message: string
          nickname: string
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          nickname: string
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          nickname?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          liker_ip: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          liker_ip: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          liker_ip?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          creator_id: string
          id: string
          likes_count: number
          nickname: string
          title: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          creator_id: string
          id?: string
          likes_count?: number
          nickname: string
          title: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          creator_id?: string
          id?: string
          likes_count?: number
          nickname?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_bets: {
        Row: {
          amount: number
          created_at: string
          event_id: string
          id: string
          is_winner: boolean | null
          predicted_creator_id: string
          reward_amount: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          event_id: string
          id?: string
          is_winner?: boolean | null
          predicted_creator_id: string
          reward_amount?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_id?: string
          id?: string
          is_winner?: boolean | null
          predicted_creator_id?: string
          reward_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_bets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "prediction_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_bets_predicted_creator_id_fkey"
            columns: ["predicted_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_events: {
        Row: {
          bet_deadline: string
          created_at: string
          creator_a_id: string
          creator_b_id: string
          description: string
          id: string
          resolved_at: string | null
          status: string
          title: string
          total_pool: number
          winner_id: string | null
        }
        Insert: {
          bet_deadline: string
          created_at?: string
          creator_a_id: string
          creator_b_id: string
          description?: string
          id?: string
          resolved_at?: string | null
          status?: string
          title: string
          total_pool?: number
          winner_id?: string | null
        }
        Update: {
          bet_deadline?: string
          created_at?: string
          creator_a_id?: string
          creator_b_id?: string
          description?: string
          id?: string
          resolved_at?: string | null
          status?: string
          title?: string
          total_pool?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_events_creator_a_id_fkey"
            columns: ["creator_a_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_events_creator_b_id_fkey"
            columns: ["creator_b_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_events_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string
          created_at: string
          daily_ticket_claimed_at: string | null
          display_name: string
          id: string
          is_beta_tester: boolean
          tickets: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string
          created_at?: string
          daily_ticket_claimed_at?: string | null
          display_name?: string
          id?: string
          is_beta_tester?: boolean
          tickets?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          daily_ticket_claimed_at?: string | null
          display_name?: string
          id?: string
          is_beta_tester?: boolean
          tickets?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rank_history: {
        Row: {
          creator_id: string
          id: string
          rank: number
          recorded_at: string
          votes_count: number
        }
        Insert: {
          creator_id: string
          id?: string
          rank: number
          recorded_at?: string
          votes_count: number
        }
        Update: {
          creator_id?: string
          id?: string
          rank?: number
          recorded_at?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "rank_history_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          bonus_votes_earned: number
          code: string
          created_at: string
          id: string
          nickname: string
        }
        Insert: {
          bonus_votes_earned?: number
          code: string
          created_at?: string
          id?: string
          nickname: string
        }
        Update: {
          bonus_votes_earned?: number
          code?: string
          created_at?: string
          id?: string
          nickname?: string
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          used_by_ip: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          used_by_ip: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          used_by_ip?: string
        }
        Relationships: []
      }
      season_awards: {
        Row: {
          award_key: string
          award_label: string
          award_type: string
          created_at: string
          creator_id: string | null
          id: string
          season_id: string
          season_number: number
          user_id: string | null
        }
        Insert: {
          award_key?: string
          award_label?: string
          award_type?: string
          created_at?: string
          creator_id?: string | null
          id?: string
          season_id: string
          season_number?: number
          user_id?: string | null
        }
        Update: {
          award_key?: string
          award_label?: string
          award_type?: string
          created_at?: string
          creator_id?: string | null
          id?: string
          season_id?: string
          season_number?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_awards_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_awards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_rankings: {
        Row: {
          created_at: string
          creator_id: string
          final_rank: number
          final_votes: number
          id: string
          season_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          final_rank: number
          final_votes?: number
          id?: string
          season_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          final_rank?: number
          final_votes?: number
          id?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_rankings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_rankings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          ended_at: string
          id: string
          is_active: boolean
          season_number: number
          started_at: string
          title: string
        }
        Insert: {
          created_at?: string
          ended_at: string
          id?: string
          is_active?: boolean
          season_number: number
          started_at: string
          title?: string
        }
        Update: {
          created_at?: string
          ended_at?: string
          id?: string
          is_active?: boolean
          season_number?: number
          started_at?: string
          title?: string
        }
        Relationships: []
      }
      settlement_requests: {
        Row: {
          amount: number
          bank_info: string
          created_at: string
          creator_id: string
          id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          amount: number
          bank_info?: string
          created_at?: string
          creator_id: string
          id?: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          bank_info?: string
          created_at?: string
          creator_id?: string
          id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          price: number
          stock: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean
          name: string
          price: number
          stock?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          price?: number
          stock?: number | null
        }
        Relationships: []
      }
      ticket_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      tournament_champions: {
        Row: {
          created_at: string
          creator_id: string
          crowned_at: string
          id: string
          is_featured: boolean
          tournament_id: string
          tournament_title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          crowned_at?: string
          id?: string
          is_featured?: boolean
          tournament_id: string
          tournament_title?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          crowned_at?: string
          id?: string
          is_featured?: boolean
          tournament_id?: string
          tournament_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_champions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_champions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          created_at: string
          creator_a_id: string
          creator_b_id: string
          id: string
          is_completed: boolean
          match_order: number
          round: number
          tournament_id: string
          votes_a: number
          votes_b: number
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          creator_a_id: string
          creator_b_id: string
          id?: string
          is_completed?: boolean
          match_order?: number
          round?: number
          tournament_id: string
          votes_a?: number
          votes_b?: number
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          creator_a_id?: string
          creator_b_id?: string
          id?: string
          is_completed?: boolean
          match_order?: number
          round?: number
          tournament_id?: string
          votes_a?: number
          votes_b?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_creator_a_id_fkey"
            columns: ["creator_a_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_creator_b_id_fkey"
            columns: ["creator_b_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_votes: {
        Row: {
          created_at: string
          id: string
          match_id: string
          user_id: string | null
          voted_creator_id: string
          voter_ip: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          user_id?: string | null
          voted_creator_id: string
          voter_ip: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          user_id?: string | null
          voted_creator_id?: string
          voter_ip?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_votes_voted_creator_id_fkey"
            columns: ["voted_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          description: string
          ended_at: string | null
          id: string
          is_active: boolean
          round: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          round?: number
          title?: string
        }
        Update: {
          created_at?: string
          description?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          round?: number
          title?: string
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          completed_at: string
          id: string
          mission_key: string
          reward_amount: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          mission_key: string
          reward_amount?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          mission_key?: string
          reward_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          user_id: string | null
          voter_ip: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          user_id?: string | null
          voter_ip: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          user_id?: string | null
          voter_ip?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_highlights: {
        Row: {
          created_at: string
          creator_id: string
          highlight_text: string
          id: string
          rank_change: number
          top_fan_nickname: string | null
          vote_increase: number
          week_start: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          highlight_text?: string
          id?: string
          rank_change?: number
          top_fan_nickname?: string | null
          vote_increase?: number
          week_start: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          highlight_text?: string
          id?: string
          rank_change?: number
          top_fan_nickname?: string | null
          vote_increase?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_highlights_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_tickets: {
        Args: {
          p_amount: number
          p_description: string
          p_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      batch_recalculate_ranks: { Args: never; Returns: undefined }
      deduct_tickets: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      get_creator_daily_votes: {
        Args: { p_creator_id: string; p_days?: number }
        Returns: {
          vote_count: number
          vote_date: string
        }[]
      }
      get_creator_hourly_votes: {
        Args: { p_creator_id: string }
        Returns: {
          today_count: number
          vote_count: number
          vote_hour: number
          yesterday_count: number
        }[]
      }
      get_prediction_event_stats: {
        Args: never
        Returns: {
          bet_count: number
          event_id: string
          predicted_creator_id: string
          total_amount: number
        }[]
      }
      get_prediction_leaderboard: {
        Args: { p_month_offset?: number }
        Returns: {
          avatar_url: string
          display_name: string
          hit_rate: number
          total_bets: number
          total_reward: number
          user_id: string
          wins: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator"],
    },
  },
} as const
