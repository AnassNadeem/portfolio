export type Database = {
  public: {
    Tables: {
      drivers: {
        Row: {
          id: string;
          email: string;
          player_name: string;
          consent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          player_name: string;
          consent: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          player_name?: string;
          consent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      arcade_scores: {
        Row: {
          driver_id: string;
          game: string;
          score: number;
          updated_at: string;
        };
        Insert: {
          driver_id: string;
          game: string;
          score: number;
          updated_at?: string;
        };
        Update: {
          driver_id?: string;
          game?: string;
          score?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "arcade_scores_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
        ];
      };
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
    Views: {
      arcade_leaderboard: {
        Row: {
          game: string;
          score: number;
          created_at: string;
          player_name: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
