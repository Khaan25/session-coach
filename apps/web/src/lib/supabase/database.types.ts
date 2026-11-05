export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      answers: {
        Row: {
          answer: string;
          card_id: string;
          created_at: string;
          id: string;
          missing: string | null;
          review_step: number;
          score: number;
          skipped: boolean;
          user_id: string;
        };
        Insert: {
          answer: string;
          card_id: string;
          created_at?: string;
          id?: string;
          missing?: string | null;
          review_step: number;
          score: number;
          skipped?: boolean;
          user_id: string;
        };
        Update: {
          answer?: string;
          card_id?: string;
          created_at?: string;
          id?: string;
          missing?: string | null;
          review_step?: number;
          score?: number;
          skipped?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answers_card_id_user_id_fkey";
            columns: ["card_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "decision_cards";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "answers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cli_device_codes: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          client_name: string;
          denied_at: string | null;
          device_code_hash: string;
          expires_at: string;
          id: string;
          last_polled_at: string | null;
          poll_interval: number;
          requested_at: string;
          requested_ip: string | null;
          token_issued_at: string | null;
          user_code: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          client_name: string;
          denied_at?: string | null;
          device_code_hash: string;
          expires_at?: string;
          id?: string;
          last_polled_at?: string | null;
          poll_interval?: number;
          requested_at?: string;
          requested_ip?: string | null;
          token_issued_at?: string | null;
          user_code: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          client_name?: string;
          denied_at?: string | null;
          device_code_hash?: string;
          expires_at?: string;
          id?: string;
          last_polled_at?: string | null;
          poll_interval?: number;
          requested_at?: string;
          requested_ip?: string | null;
          token_issued_at?: string | null;
          user_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cli_device_codes_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cli_tokens: {
        Row: {
          created_at: string;
          id: string;
          label: string | null;
          last_used_at: string | null;
          token_hash: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label?: string | null;
          last_used_at?: string | null;
          token_hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string | null;
          last_used_at?: string | null;
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cli_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      decision_cards: {
        Row: {
          created_at: string;
          decision: string;
          evidence: NonNullable<Json>;
          files: string[];
          flagged: boolean | null;
          hidden: boolean | null;
          id: string;
          model_answer: string;
          position: number;
          question: string;
          session_id: string;
          source: string;
          user_id: string;
          why: string;
        };
        Insert: {
          created_at?: string;
          decision: string;
          evidence: NonNullable<Json>;
          files?: string[];
          flagged?: never;
          hidden?: never;
          id?: string;
          model_answer: string;
          position: number;
          question: string;
          session_id: string;
          source: string;
          user_id: string;
          why: string;
        };
        Update: {
          created_at?: string;
          decision?: string;
          evidence?: NonNullable<Json>;
          files?: string[];
          flagged?: never;
          hidden?: never;
          id?: string;
          model_answer?: string;
          position?: number;
          question?: string;
          session_id?: string;
          source?: string;
          user_id?: string;
          why?: string;
        };
        Relationships: [
          {
            foreignKeyName: "decision_cards_session_id_user_id_fkey";
            columns: ["session_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "decision_cards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      defenses: {
        Row: {
          answer: string | null;
          answered_at: string | null;
          card_id: string;
          finished_at: string | null;
          follow_up_answer: string | null;
          follow_up_question: string | null;
          follow_up_started_at: string | null;
          id: string;
          score: number | null;
          started_at: string;
          status: string;
          user_id: string;
        };
        Insert: {
          answer?: string | null;
          answered_at?: string | null;
          card_id: string;
          finished_at?: string | null;
          follow_up_answer?: string | null;
          follow_up_question?: string | null;
          follow_up_started_at?: string | null;
          id?: string;
          score?: number | null;
          started_at?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          answer?: string | null;
          answered_at?: string | null;
          card_id?: string;
          finished_at?: string | null;
          follow_up_answer?: string | null;
          follow_up_question?: string | null;
          follow_up_started_at?: string | null;
          id?: string;
          score?: number | null;
          started_at?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "defenses_card_id_user_id_fkey";
            columns: ["card_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "decision_cards";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "defenses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_log: {
        Row: {
          id: string;
          kind: string;
          resend_id: string | null;
          sent_on: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          kind: string;
          resend_id?: string | null;
          sent_on: string;
          user_id: string;
        };
        Update: {
          id?: string;
          kind?: string;
          resend_id?: string | null;
          sent_on?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          notify_email: boolean;
          report_on: boolean;
          report_slug: string;
          timezone: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          notify_email?: boolean;
          report_on?: boolean;
          report_slug?: string;
          timezone?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          notify_email?: boolean;
          report_on?: boolean;
          report_slug?: string;
          timezone?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          id: string;
          onboarded_at: string | null;
          question_level: string;
          repo: string;
          report_shown: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          onboarded_at?: string | null;
          question_level?: string;
          repo: string;
          report_shown?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          onboarded_at?: string | null;
          question_level?: string;
          repo?: string;
          report_shown?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          card_id: string;
          due_on: string | null;
          last_score: number | null;
          mastered: boolean;
          step: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          card_id: string;
          due_on?: string | null;
          last_score?: number | null;
          mastered?: boolean;
          step?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          card_id?: string;
          due_on?: string | null;
          last_score?: number | null;
          mastered?: boolean;
          step?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_card_id_user_id_fkey";
            columns: ["card_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "decision_cards";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          agent: string;
          branch: string | null;
          created_at: string;
          duration_min: number | null;
          error: string | null;
          event_count: number | null;
          external_id: string;
          id: string;
          processing_started_at: string | null;
          raw_path: string;
          repo: string | null;
          started_at: string | null;
          status: string;
          title: string | null;
          user_id: string;
        };
        Insert: {
          agent?: string;
          branch?: string | null;
          created_at?: string;
          duration_min?: number | null;
          error?: string | null;
          event_count?: number | null;
          external_id: string;
          id?: string;
          processing_started_at?: string | null;
          raw_path: string;
          repo?: string | null;
          started_at?: string | null;
          status?: string;
          title?: string | null;
          user_id: string;
        };
        Update: {
          agent?: string;
          branch?: string | null;
          created_at?: string;
          duration_min?: number | null;
          error?: string | null;
          event_count?: number | null;
          external_id?: string;
          id?: string;
          processing_started_at?: string | null;
          raw_path?: string;
          repo?: string | null;
          started_at?: string | null;
          status?: string;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_members: {
        Row: {
          user_id: string;
        };
        Insert: {
          user_id: string;
        };
        Update: {
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_tasks: {
        Row: {
          created_at: string;
          details: string | null;
          done_at: string | null;
          done_by: string | null;
          id: string;
          owner: string | null;
          position: number;
          section: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          done_at?: string | null;
          done_by?: string | null;
          id?: string;
          owner?: string | null;
          position: number;
          section: string;
          title: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          done_at?: string | null;
          done_by?: string | null;
          id?: string;
          owner?: string | null;
          position?: number;
          section?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_tasks_done_by_fkey";
            columns: ["done_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_tracker_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      learner_ownership: {
        Args: Record<PropertyKey, never>;
        Returns: {
          explained: number;
          owned: number;
          repo: string;
          total: number;
        }[];
      };
      learner_repos: {
        Args: Record<PropertyKey, never>;
        Returns: {
          repo: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
