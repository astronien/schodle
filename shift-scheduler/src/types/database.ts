export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          employee_code: string;
          full_name: string;
          position_id: string;
          role: 'employee' | 'manager' | 'admin';
          phone: string | null;
          email: string | null;
          avatar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_code: string;
          full_name: string;
          position_id: string;
          role?: 'employee' | 'manager' | 'admin';
          phone?: string | null;
          email?: string | null;
          avatar?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_code?: string;
          full_name?: string;
          position_id?: string;
          role?: 'employee' | 'manager' | 'admin';
          phone?: string | null;
          email?: string | null;
          avatar?: string | null;
          created_at?: string;
        };
      };
      positions: {
        Row: {
          id: string;
          code: string;
          name: string;
          min_required: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          min_required: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          min_required?: number;
          created_at?: string;
        };
      };
      shift_types: {
        Row: {
          id: string;
          code: string;
          name: string;
          start_time: string;
          end_time: string;
          color: string;
          requires_approval: boolean;
          requires_reason: boolean;
          requires_evidence: boolean;
          is_visible: boolean;
          target_staff: number | null;
          category: 'morning' | 'afternoon' | 'other' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          start_time: string;
          end_time: string;
          color: string;
          requires_approval?: boolean;
          requires_reason?: boolean;
          requires_evidence?: boolean;
          is_visible?: boolean;
          target_staff?: number | null;
          category?: 'morning' | 'afternoon' | 'other' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          start_time?: string;
          end_time?: string;
          color?: string;
          requires_approval?: boolean;
          requires_reason?: boolean;
          requires_evidence?: boolean;
          is_visible?: boolean;
          target_staff?: number | null;
          category?: 'morning' | 'afternoon' | 'other' | null;
          created_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          shift_type_id: string;
          status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending';
          employee_note: string | null;
          manager_remark: string | null;
          swap_with_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          date: string;
          shift_type_id: string;
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending';
          employee_note?: string | null;
          manager_remark?: string | null;
          swap_with_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          date?: string;
          shift_type_id?: string;
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending';
          employee_note?: string | null;
          manager_remark?: string | null;
          swap_with_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
