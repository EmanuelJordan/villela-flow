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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          cpf_cnpj: string | null
          created_at: string
          descricao: string | null
          diagnostico_dados: Json | null
          empresa: string | null
          fim: string
          google_event_id: string | null
          id: string
          inicio: string
          lead_id: string | null
          meet_link: string | null
          owner_id: string | null
          status: string
          team_id: string
          titulo: string
          updated_at: string
          valor_divida: number | null
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string
          descricao?: string | null
          diagnostico_dados?: Json | null
          empresa?: string | null
          fim: string
          google_event_id?: string | null
          id?: string
          inicio: string
          lead_id?: string | null
          meet_link?: string | null
          owner_id?: string | null
          status?: string
          team_id: string
          titulo: string
          updated_at?: string
          valor_divida?: number | null
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string
          descricao?: string | null
          diagnostico_dados?: Json | null
          empresa?: string | null
          fim?: string
          google_event_id?: string | null
          id?: string
          inicio?: string
          lead_id?: string | null
          meet_link?: string | null
          owner_id?: string | null
          status?: string
          team_id?: string
          titulo?: string
          updated_at?: string
          valor_divida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamento_pagamentos: {
        Row: {
          created_at: string
          data_pagamento: string
          descricao: string | null
          id: string
          metodo_pagamento: string | null
          proposta_id: string
          team_id: string
          valor_pago: number
        }
        Insert: {
          created_at?: string
          data_pagamento: string
          descricao?: string | null
          id?: string
          metodo_pagamento?: string | null
          proposta_id: string
          team_id: string
          valor_pago: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          descricao?: string | null
          id?: string
          metodo_pagamento?: string | null
          proposta_id?: string
          team_id?: string
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_pagamentos_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_pagamentos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          concluido_em: string | null
          created_at: string
          descricao: string
          id: string
          lead_id: string
          owner_id: string | null
          team_id: string
          vence_em: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          descricao: string
          id?: string
          lead_id: string
          owner_id?: string | null
          team_id: string
          vence_em: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          descricao?: string
          id?: string
          lead_id?: string
          owner_id?: string | null
          team_id?: string
          vence_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_estagios: {
        Row: {
          cor: string | null
          id: string
          is_lost: boolean
          is_won: boolean
          nome: string
          ordem: number
          team_id: string
        }
        Insert: {
          cor?: string | null
          id?: string
          is_lost?: boolean
          is_won?: boolean
          nome: string
          ordem: number
          team_id: string
        }
        Update: {
          cor?: string | null
          id?: string
          is_lost?: boolean
          is_won?: boolean
          nome?: string
          ordem?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funil_estagios_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      google_connections: {
        Row: {
          access_token_encrypted: string | null
          access_token_expires_at: string | null
          created_at: string
          google_email: string | null
          refresh_token_encrypted: string
          scopes: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          access_token_expires_at?: string | null
          created_at?: string
          google_email?: string | null
          refresh_token_encrypted: string
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          access_token_expires_at?: string | null
          created_at?: string
          google_email?: string | null
          refresh_token_encrypted?: string
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_eventos: {
        Row: {
          actor_id: string | null
          created_at: string
          dados: Json | null
          de_estagio: string | null
          id: number
          lead_id: string
          para_estagio: string | null
          team_id: string
          tipo: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          dados?: Json | null
          de_estagio?: string | null
          id?: never
          lead_id: string
          para_estagio?: string | null
          team_id: string
          tipo: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          dados?: Json | null
          de_estagio?: string | null
          id?: never
          lead_id?: string
          para_estagio?: string | null
          team_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_eventos_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_eventos_de_estagio_fkey"
            columns: ["de_estagio"]
            isOneToOne: false
            referencedRelation: "funil_estagios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_eventos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_eventos_para_estagio_fkey"
            columns: ["para_estagio"]
            isOneToOne: false
            referencedRelation: "funil_estagios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_eventos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cpf_cnpj: string | null
          created_at: string
          diagnostico_dados: Json | null
          diagnostico_status: string | null
          email: string | null
          empresa: string | null
          estagio_id: string
          id: string
          link_diagnostico: string | null
          nome_cliente: string
          observacoes: string | null
          origem: string | null
          owner_id: string | null
          posicao: number
          team_id: string
          telefone: string | null
          updated_at: string
          valor_divida: number | null
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string
          diagnostico_dados?: Json | null
          diagnostico_status?: string | null
          email?: string | null
          empresa?: string | null
          estagio_id: string
          id?: string
          link_diagnostico?: string | null
          nome_cliente: string
          observacoes?: string | null
          origem?: string | null
          owner_id?: string | null
          posicao?: number
          team_id: string
          telefone?: string | null
          updated_at?: string
          valor_divida?: number | null
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string
          diagnostico_dados?: Json | null
          diagnostico_status?: string | null
          email?: string | null
          empresa?: string | null
          estagio_id?: string
          id?: string
          link_diagnostico?: string | null
          nome_cliente?: string
          observacoes?: string | null
          origem?: string | null
          owner_id?: string | null
          posicao?: number
          team_id?: string
          telefone?: string | null
          updated_at?: string
          valor_divida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_estagio_id_fkey"
            columns: ["estagio_id"]
            isOneToOne: false
            referencedRelation: "funil_estagios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          papel: string
          status: string
          team_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          nome?: string
          papel?: string
          status?: string
          team_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          papel?: string
          status?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          agendamento_id: string
          apresentacao: Json | null
          capital_recuperavel: number | null
          contrato_status: string
          created_at: string
          data_validade: string | null
          descricao_estrategia: string | null
          enviada_em: string | null
          espelhamento: boolean
          gerada_em: string | null
          id: string
          lead_id: string | null
          owner_id: string | null
          qtd_parcelas: number
          team_id: string
          titulo_estrategia: string | null
          token_publico: string | null
          updated_at: string
          valor_entrada: number | null
          valor_estrategia: number
          valor_reducao: number | null
          valor_total_divida: number
        }
        Insert: {
          agendamento_id: string
          apresentacao?: Json | null
          capital_recuperavel?: number | null
          contrato_status?: string
          created_at?: string
          data_validade?: string | null
          descricao_estrategia?: string | null
          enviada_em?: string | null
          espelhamento?: boolean
          gerada_em?: string | null
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          qtd_parcelas?: number
          team_id: string
          titulo_estrategia?: string | null
          token_publico?: string | null
          updated_at?: string
          valor_entrada?: number | null
          valor_estrategia: number
          valor_reducao?: number | null
          valor_total_divida: number
        }
        Update: {
          agendamento_id?: string
          apresentacao?: Json | null
          capital_recuperavel?: number | null
          contrato_status?: string
          created_at?: string
          data_validade?: string | null
          descricao_estrategia?: string | null
          enviada_em?: string | null
          espelhamento?: boolean
          gerada_em?: string | null
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          qtd_parcelas?: number
          team_id?: string
          titulo_estrategia?: string | null
          token_publico?: string | null
          updated_at?: string
          valor_entrada?: number | null
          valor_estrategia?: number
          valor_reducao?: number | null
          valor_total_divida?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
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
