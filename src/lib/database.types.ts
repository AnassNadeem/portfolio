export type Database = {
  public: {
    Tables: {
      leaderboard: {
        Row: {
          id: string;
          player_name: string;
          score: number;
          game: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_name: string;
          score: number;
          game: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_name?: string;
          score?: number;
          game?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      signups: {
        Row: {
          id: string;
          email: string;
          consent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          consent: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          consent?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
