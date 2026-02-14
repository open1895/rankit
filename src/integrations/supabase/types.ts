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
      creators: {
        Row: {
          avatar_url: string
          category: string
          channel_link: string
          created_at: string
          id: string
          is_verified: boolean
          name: string
          rank: number
          subscriber_count: number
          votes_count: number
        }
        Insert: {
          avatar_url?: string
          category?: string
          channel_link?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          name: string
          rank?: number
          subscriber_count?: number
          votes_count?: number
        }
        Update: {
          avatar_url?: string
          category?: string
          channel_link?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          name?: string
          rank?: number
          subscriber_count?: number
          votes_count?: number
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
      profiles: {
        Row: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          display_name?: string
          id?: string
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
