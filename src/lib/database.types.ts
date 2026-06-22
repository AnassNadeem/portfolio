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
        Update: never;
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
        Update: never;
      };
      messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          message: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
    };
  };
};
