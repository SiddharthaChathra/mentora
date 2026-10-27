
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "academic_semesters": {
                  Row: {
                    "academic_year": string,"created_at": string,"department_id": string,"finalized_at": string | null,"finalized_by": string | null,"id": string,"manual_cgpa": number | null,"manual_sgpa": number | null,"return_note": string | null,"semester_no": number,"status": Database["public"]['Enums']["semester_status"],"student_id": string,"submitted_at": string | null,"updated_at": string,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_year": string,"created_at"?: string,"department_id"?: string,"finalized_at"?: string | null,"finalized_by"?: string | null,"id"?: string,"manual_cgpa"?: number | null,"manual_sgpa"?: number | null,"return_note"?: string | null,"semester_no": number,"status"?: Database["public"]['Enums']["semester_status"],"student_id": string,"submitted_at"?: string | null,"updated_at"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "academic_year"?: string,"created_at"?: string,"department_id"?: string,"finalized_at"?: string | null,"finalized_by"?: string | null,"id"?: string,"manual_cgpa"?: number | null,"manual_sgpa"?: number | null,"return_note"?: string | null,"semester_no"?: number,"status"?: Database["public"]['Enums']["semester_status"],"student_id"?: string,"submitted_at"?: string | null,"updated_at"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "academic_semesters_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academic_semesters_finalized_by_fkey"
      columns: ["finalized_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academic_semesters_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academic_semesters_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"academic_years": {
                  Row: {
                    "created_at": string,"ends_on": string,"id": string,"is_current": boolean,"label": string,"starts_on": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_on": string,"id"?: string,"is_current"?: boolean,"label": string,"starts_on": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_on"?: string,"id"?: string,"is_current"?: boolean,"label"?: string,"starts_on"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_summaries": {
                  Row: {
                    "created_at": string,"created_by": string | null,"edited_text": string | null,"generated_text": string,"id": string,"model": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["ai_status"],"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"edited_text"?: string | null,"generated_text": string,"id"?: string,"model": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["ai_status"],"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"edited_text"?: string | null,"generated_text"?: string,"id"?: string,"model"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["ai_status"],"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_summaries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_summaries_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_summaries_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"after": Json | null,"before": Json | null,"created_at": string,"department_id": string | null,"entity_id": string | null,"entity_type": string,"id": number,"ip": string | null,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"department_id"?: string | null,"entity_id"?: string | null,"entity_type": string,"id"?: never,"ip"?: string | null,"user_agent"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"department_id"?: string | null,"entity_id"?: string | null,"entity_type"?: string,"id"?: never,"ip"?: string | null,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"content_views": {
                  Row: {
                    "entity_id": string,"entity_type": string,"user_id": string,"viewed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entity_id": string,"entity_type": string,"user_id": string,"viewed_at"?: string
                  }
                  Update: {
                    "entity_id"?: string,"entity_type"?: string,"user_id"?: string,"viewed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_views_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"department_heads": {
                  Row: {
                    "appointed_by": string | null,"created_at": string,"department_id": string,"end_reason": string | null,"ended_at": string | null,"ended_by": string | null,"id": string,"reason": string | null,"started_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appointed_by"?: string | null,"created_at"?: string,"department_id": string,"end_reason"?: string | null,"ended_at"?: string | null,"ended_by"?: string | null,"id"?: string,"reason"?: string | null,"started_at"?: string,"user_id": string
                  }
                  Update: {
                    "appointed_by"?: string | null,"created_at"?: string,"department_id"?: string,"end_reason"?: string | null,"ended_at"?: string | null,"ended_by"?: string | null,"id"?: string,"reason"?: string | null,"started_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "department_heads_appointed_by_fkey"
      columns: ["appointed_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "department_heads_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "department_heads_ended_by_fkey"
      columns: ["ended_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "department_heads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"display_order": number,"id": string,"name": string,"status": Database["public"]['Enums']["branch_status"],"updated_at": string,"usn_code": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"created_by"?: string | null,"display_order"?: number,"id"?: string,"name": string,"status"?: Database["public"]['Enums']["branch_status"],"updated_at"?: string,"usn_code"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"display_order"?: number,"id"?: string,"name"?: string,"status"?: Database["public"]['Enums']["branch_status"],"updated_at"?: string,"usn_code"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "departments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"grading_schemes": {
                  Row: {
                    "active": boolean,"bands": NonNullable<Json>,"created_at": string,"created_by": string | null,"department_id": string | null,"id": string,"max_grade_points": number,"mse_weight": number,"name": string,"pass_pct": number,"see_weight": number,"sgpa_formula": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"bands": NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"department_id"?: string | null,"id"?: string,"max_grade_points"?: number,"mse_weight"?: number,"name": string,"pass_pct"?: number,"see_weight"?: number,"sgpa_formula"?: string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"bands"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"department_id"?: string | null,"id"?: string,"max_grade_points"?: number,"mse_weight"?: number,"name"?: string,"pass_pct"?: number,"see_weight"?: number,"sgpa_formula"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "grading_schemes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "grading_schemes_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"hod_profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"designation": string | null,"full_name": string | null,"phone": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"designation"?: string | null,"full_name"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"designation"?: string | null,"full_name"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "hod_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"import_jobs": {
                  Row: {
                    "committed_at": string | null,"created_at": string,"created_by": string,"department_id": string | null,"duplicate_rows": number,"error_rows": number,"errors": NonNullable<Json>,"file_name": string,"id": string,"kind": string,"options": NonNullable<Json>,"status": Database["public"]['Enums']["import_status"],"summary": NonNullable<Json>,"total_rows": number,"valid_rows": number
                  }
                  ComputedFields: never
                  Insert: {
                    "committed_at"?: string | null,"created_at"?: string,"created_by": string,"department_id"?: string | null,"duplicate_rows"?: number,"error_rows"?: number,"errors"?: NonNullable<Json>,"file_name": string,"id"?: string,"kind": string,"options"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["import_status"],"summary"?: NonNullable<Json>,"total_rows"?: number,"valid_rows"?: number
                  }
                  Update: {
                    "committed_at"?: string | null,"created_at"?: string,"created_by"?: string,"department_id"?: string | null,"duplicate_rows"?: number,"error_rows"?: number,"errors"?: NonNullable<Json>,"file_name"?: string,"id"?: string,"kind"?: string,"options"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["import_status"],"summary"?: NonNullable<Json>,"total_rows"?: number,"valid_rows"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_jobs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_jobs_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"intervention_followups": {
                  Row: {
                    "created_at": string,"department_id": string,"id": string,"mentor_id": string,"note": string,"requested_by": string,"resolution_note": string | null,"resolved_at": string | null,"status": Database["public"]['Enums']["followup_status"],"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id"?: string,"id"?: string,"mentor_id": string,"note": string,"requested_by": string,"resolution_note"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["followup_status"],"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string,"id"?: string,"mentor_id"?: string,"note"?: string,"requested_by"?: string,"resolution_note"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["followup_status"],"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "intervention_followups_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intervention_followups_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intervention_followups_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intervention_followups_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"learning_resources": {
                  Row: {
                    "created_at": string,"department_id": string,"external_url": string | null,"file_name": string | null,"file_path": string | null,"id": string,"instructions": string,"mentor_id": string,"mime": string | null,"size_bytes": number | null,"student_id": string | null,"subject_id": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id"?: string,"external_url"?: string | null,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"instructions"?: string,"mentor_id": string,"mime"?: string | null,"size_bytes"?: number | null,"student_id"?: string | null,"subject_id"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string,"external_url"?: string | null,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"instructions"?: string,"mentor_id"?: string,"mime"?: string | null,"size_bytes"?: number | null,"student_id"?: string | null,"subject_id"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "learning_resources_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learning_resources_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learning_resources_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learning_resources_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"mentor_assignments": {
                  Row: {
                    "assigned_by": string | null,"created_at": string,"department_id": string,"end_reason": string | null,"ended_at": string | null,"ended_by": string | null,"group_name": string | null,"id": string,"mentor_id": string,"reason": string | null,"started_at": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_by"?: string | null,"created_at"?: string,"department_id"?: string,"end_reason"?: string | null,"ended_at"?: string | null,"ended_by"?: string | null,"group_name"?: string | null,"id"?: string,"mentor_id": string,"reason"?: string | null,"started_at"?: string,"student_id": string
                  }
                  Update: {
                    "assigned_by"?: string | null,"created_at"?: string,"department_id"?: string,"end_reason"?: string | null,"ended_at"?: string | null,"ended_by"?: string | null,"group_name"?: string | null,"id"?: string,"mentor_id"?: string,"reason"?: string | null,"started_at"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentor_assignments_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentor_assignments_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentor_assignments_ended_by_fkey"
      columns: ["ended_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentor_assignments_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentor_assignments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"mentor_profiles": {
                  Row: {
                    "avatar_path": string | null,"capacity": number,"created_at": string,"designation": string | null,"draft": NonNullable<Json>,"draft_step": number,"expertise": (string)[],"faculty_id": string | null,"full_name": string | null,"official_email": string | null,"phone": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"capacity"?: number,"created_at"?: string,"designation"?: string | null,"draft"?: NonNullable<Json>,"draft_step"?: number,"expertise"?: (string)[],"faculty_id"?: string | null,"full_name"?: string | null,"official_email"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "avatar_path"?: string | null,"capacity"?: number,"created_at"?: string,"designation"?: string | null,"draft"?: NonNullable<Json>,"draft_step"?: number,"expertise"?: (string)[],"faculty_id"?: string | null,"full_name"?: string | null,"official_email"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentor_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"mentor_recommendations": {
                  Row: {
                    "body": string,"category": Database["public"]['Enums']["rec_category"],"completion_confirmed_at": string | null,"created_at": string,"department_id": string,"due_date": string | null,"id": string,"include_in_report": boolean,"kind": Database["public"]['Enums']["rec_kind"],"mentor_id": string,"parent_id": string | null,"reflection": string | null,"review_date": string | null,"status": Database["public"]['Enums']["rec_status"],"steps": NonNullable<Json>,"student_id": string,"subject_id": string | null,"target_metric": string | null,"title": string,"updated_at": string,"visibility": Database["public"]['Enums']["rec_visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"category"?: Database["public"]['Enums']["rec_category"],"completion_confirmed_at"?: string | null,"created_at"?: string,"department_id"?: string,"due_date"?: string | null,"id"?: string,"include_in_report"?: boolean,"kind": Database["public"]['Enums']["rec_kind"],"mentor_id": string,"parent_id"?: string | null,"reflection"?: string | null,"review_date"?: string | null,"status"?: Database["public"]['Enums']["rec_status"],"steps"?: NonNullable<Json>,"student_id": string,"subject_id"?: string | null,"target_metric"?: string | null,"title": string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["rec_visibility"]
                  }
                  Update: {
                    "body"?: string,"category"?: Database["public"]['Enums']["rec_category"],"completion_confirmed_at"?: string | null,"created_at"?: string,"department_id"?: string,"due_date"?: string | null,"id"?: string,"include_in_report"?: boolean,"kind"?: Database["public"]['Enums']["rec_kind"],"mentor_id"?: string,"parent_id"?: string | null,"reflection"?: string | null,"review_date"?: string | null,"status"?: Database["public"]['Enums']["rec_status"],"steps"?: NonNullable<Json>,"student_id"?: string,"subject_id"?: string | null,"target_metric"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["rec_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentor_recommendations_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentor_recommendations_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentor_recommendations_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "mentor_recommendations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentor_recommendations_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentor_recommendations_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"mentoring_sessions": {
                  Row: {
                    "action_items": NonNullable<Json>,"agenda": string,"completed_at": string | null,"created_at": string,"department_id": string,"duration_min": number,"group_name": string | null,"id": string,"location_or_link": string | null,"mentor_id": string,"mode": Database["public"]['Enums']["session_mode"],"next_follow_up_date": string | null,"scheduled_at": string,"status": Database["public"]['Enums']["session_status"],"student_id": string | null,"summary": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_items"?: NonNullable<Json>,"agenda"?: string,"completed_at"?: string | null,"created_at"?: string,"department_id"?: string,"duration_min"?: number,"group_name"?: string | null,"id"?: string,"location_or_link"?: string | null,"mentor_id": string,"mode"?: Database["public"]['Enums']["session_mode"],"next_follow_up_date"?: string | null,"scheduled_at": string,"status"?: Database["public"]['Enums']["session_status"],"student_id"?: string | null,"summary"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "action_items"?: NonNullable<Json>,"agenda"?: string,"completed_at"?: string | null,"created_at"?: string,"department_id"?: string,"duration_min"?: number,"group_name"?: string | null,"id"?: string,"location_or_link"?: string | null,"mentor_id"?: string,"mode"?: Database["public"]['Enums']["session_mode"],"next_follow_up_date"?: string | null,"scheduled_at"?: string,"status"?: Database["public"]['Enums']["session_status"],"student_id"?: string | null,"summary"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentoring_sessions_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentoring_sessions_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentoring_sessions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"department_id": string | null,"emailed_at": string | null,"entity_id": string | null,"entity_type": string | null,"id": string,"link": string | null,"read_at": string | null,"snoozed_until": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"department_id"?: string | null,"emailed_at"?: string | null,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"snoozed_until"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"department_id"?: string | null,"emailed_at"?: string | null,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"snoozed_until"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"recommendation_status_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"from_status": Database["public"]['Enums']["rec_status"] | null,"id": string,"recommendation_id": string,"to_status": Database["public"]['Enums']["rec_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["rec_status"] | null,"id"?: string,"recommendation_id": string,"to_status": Database["public"]['Enums']["rec_status"]
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["rec_status"] | null,"id"?: string,"recommendation_id"?: string,"to_status"?: Database["public"]['Enums']["rec_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommendation_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommendation_status_history_recommendation_id_fkey"
      columns: ["recommendation_id"]
isOneToOne: false
      referencedRelation: "mentor_recommendations"
      referencedColumns: ["id"]
    }
                  ]
                },"record_change_requests": {
                  Row: {
                    "academic_semester_id": string,"created_at": string,"created_by": string,"current_values": NonNullable<Json>,"department_id": string,"id": string,"proposed": NonNullable<Json>,"reason": string,"review_note": string | null,"reviewed_at": string | null,"reviewer_id": string | null,"status": Database["public"]['Enums']["review_status"],"student_id": string,"target_id": string,"target_table": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_semester_id": string,"created_at"?: string,"created_by": string,"current_values"?: NonNullable<Json>,"department_id"?: string,"id"?: string,"proposed": NonNullable<Json>,"reason": string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewer_id"?: string | null,"status"?: Database["public"]['Enums']["review_status"],"student_id": string,"target_id": string,"target_table": string
                  }
                  Update: {
                    "academic_semester_id"?: string,"created_at"?: string,"created_by"?: string,"current_values"?: NonNullable<Json>,"department_id"?: string,"id"?: string,"proposed"?: NonNullable<Json>,"reason"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewer_id"?: string | null,"status"?: Database["public"]['Enums']["review_status"],"student_id"?: string,"target_id"?: string,"target_table"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "record_change_requests_academic_semester_id_fkey"
      columns: ["academic_semester_id"]
isOneToOne: false
      referencedRelation: "academic_semesters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "record_change_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "record_change_requests_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "record_change_requests_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "record_change_requests_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"risk_thresholds": {
                  Row: {
                    "department_id": string | null,"id": string,"rule_key": string,"updated_at": string,"updated_by": string | null,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "department_id"?: string | null,"id"?: string,"rule_key": string,"updated_at"?: string,"updated_by"?: string | null,"value": number
                  }
                  Update: {
                    "department_id"?: string | null,"id"?: string,"rule_key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "risk_thresholds_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "risk_thresholds_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"sections": {
                  Row: {
                    "created_at": string,"department_id": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id": string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sections_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"semester_summaries": {
                  Row: {
                    "academic_semester_id": string,"cgpa_snapshot": number | null,"computation_note": string | null,"computed": boolean,"computed_at": string,"credits_earned": number,"credits_registered": number,"grading_scheme_id": string | null,"sgpa": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_semester_id": string,"cgpa_snapshot"?: number | null,"computation_note"?: string | null,"computed"?: boolean,"computed_at"?: string,"credits_earned"?: number,"credits_registered"?: number,"grading_scheme_id"?: string | null,"sgpa"?: number | null
                  }
                  Update: {
                    "academic_semester_id"?: string,"cgpa_snapshot"?: number | null,"computation_note"?: string | null,"computed"?: boolean,"computed_at"?: string,"credits_earned"?: number,"credits_registered"?: number,"grading_scheme_id"?: string | null,"sgpa"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "semester_summaries_academic_semester_id_fkey"
      columns: ["academic_semester_id"]
isOneToOne: true
      referencedRelation: "academic_semesters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "semester_summaries_grading_scheme_id_fkey"
      columns: ["grading_scheme_id"]
isOneToOne: false
      referencedRelation: "grading_schemes"
      referencedColumns: ["id"]
    }
                  ]
                },"student_branch_transfers": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"from_department_id": string,"id": string,"reason": string,"requested_by": string | null,"status": Database["public"]['Enums']["review_status"],"student_id": string,"to_department_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"from_department_id": string,"id"?: string,"reason": string,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["review_status"],"student_id": string,"to_department_id": string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"from_department_id"?: string,"id"?: string,"reason"?: string,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["review_status"],"student_id"?: string,"to_department_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_branch_transfers_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_branch_transfers_from_department_id_fkey"
      columns: ["from_department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_branch_transfers_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_branch_transfers_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_branch_transfers_to_department_id_fkey"
      columns: ["to_department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"student_profiles": {
                  Row: {
                    "achievements": string | null,"address": string | null,"admission_year": number | null,"avatar_path": string | null,"career_goals": string | null,"created_at": string,"current_semester": number | null,"dob": string | null,"draft": NonNullable<Json>,"draft_step": number,"expected_graduation_year": number | null,"full_name": string | null,"gender": string | null,"interests": (string)[],"phone": string | null,"profile_completion": number,"program": string | null,"section_id": string | null,"skills": (string)[],"support_areas": string | null,"updated_at": string,"user_id": string,"usn": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "achievements"?: string | null,"address"?: string | null,"admission_year"?: number | null,"avatar_path"?: string | null,"career_goals"?: string | null,"created_at"?: string,"current_semester"?: number | null,"dob"?: string | null,"draft"?: NonNullable<Json>,"draft_step"?: number,"expected_graduation_year"?: number | null,"full_name"?: string | null,"gender"?: string | null,"interests"?: (string)[],"phone"?: string | null,"profile_completion"?: number,"program"?: string | null,"section_id"?: string | null,"skills"?: (string)[],"support_areas"?: string | null,"updated_at"?: string,"user_id": string,"usn"?: string | null
                  }
                  Update: {
                    "achievements"?: string | null,"address"?: string | null,"admission_year"?: number | null,"avatar_path"?: string | null,"career_goals"?: string | null,"created_at"?: string,"current_semester"?: number | null,"dob"?: string | null,"draft"?: NonNullable<Json>,"draft_step"?: number,"expected_graduation_year"?: number | null,"full_name"?: string | null,"gender"?: string | null,"interests"?: (string)[],"phone"?: string | null,"profile_completion"?: number,"program"?: string | null,"section_id"?: string | null,"skills"?: (string)[],"support_areas"?: string | null,"updated_at"?: string,"user_id"?: string,"usn"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_profiles_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "sections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"student_subject_results": {
                  Row: {
                    "academic_semester_id": string,"attempt": number,"created_at": string,"credits": number,"credits_earned": number | null,"grade": string | null,"grade_points": number | null,"ia": NonNullable<Json>,"id": string,"mse_marks": number | null,"mse_max": number | null,"result": Database["public"]['Enums']["subject_result"],"see_marks": number | null,"see_max": number | null,"subject_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_semester_id": string,"attempt"?: number,"created_at"?: string,"credits": number,"credits_earned"?: number | null,"grade"?: string | null,"grade_points"?: number | null,"ia"?: NonNullable<Json>,"id"?: string,"mse_marks"?: number | null,"mse_max"?: number | null,"result"?: Database["public"]['Enums']["subject_result"],"see_marks"?: number | null,"see_max"?: number | null,"subject_id": string,"updated_at"?: string
                  }
                  Update: {
                    "academic_semester_id"?: string,"attempt"?: number,"created_at"?: string,"credits"?: number,"credits_earned"?: number | null,"grade"?: string | null,"grade_points"?: number | null,"ia"?: NonNullable<Json>,"id"?: string,"mse_marks"?: number | null,"mse_max"?: number | null,"result"?: Database["public"]['Enums']["subject_result"],"see_marks"?: number | null,"see_max"?: number | null,"subject_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_subject_results_academic_semester_id_fkey"
      columns: ["academic_semester_id"]
isOneToOne: false
      referencedRelation: "academic_semesters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_subject_results_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"subjects": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"credits": number,"department_id": string,"has_mse": boolean,"has_see": boolean,"ia_components": NonNullable<Json>,"id": string,"is_verified": boolean,"mse_max": number | null,"name": string,"see_max": number | null,"semester": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"created_by"?: string | null,"credits": number,"department_id": string,"has_mse"?: boolean,"has_see"?: boolean,"ia_components"?: NonNullable<Json>,"id"?: string,"is_verified"?: boolean,"mse_max"?: number | null,"name": string,"see_max"?: number | null,"semester"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"credits"?: number,"department_id"?: string,"has_mse"?: boolean,"has_see"?: boolean,"ia_components"?: NonNullable<Json>,"id"?: string,"is_verified"?: boolean,"mse_max"?: number | null,"name"?: string,"see_max"?: number | null,"semester"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subjects_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subjects_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "created_at": string,"department_id": string | null,"email": string,"id": string,"invited_by": string | null,"last_seen_at": string | null,"onboarding_completed_at": string | null,"preferences": NonNullable<Json>,"role": Database["public"]['Enums']["user_role"],"status": Database["public"]['Enums']["user_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id"?: string | null,"email": string,"id": string,"invited_by"?: string | null,"last_seen_at"?: string | null,"onboarding_completed_at"?: string | null,"preferences"?: NonNullable<Json>,"role": Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["user_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string | null,"email"?: string,"id"?: string,"invited_by"?: string | null,"last_seen_at"?: string | null,"onboarding_completed_at"?: string | null,"preferences"?: NonNullable<Json>,"role"?: Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["user_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "users_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "users_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "activate_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"appoint_hod":
{ Args: { "p_department": string,"p_reason"?: string,"p_user": string }; Returns: undefined
                           },
"assign_students":
{ Args: { "p_group"?: string,"p_mentor": string,"p_reason"?: string,"p_student_ids": (string)[] }; Returns: Json
                           },
"complete_onboarding":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"decide_branch_transfer":
{ Args: { "p_approve": boolean,"p_id": string,"p_note"?: string }; Returns: undefined
                           },
"end_hod_appointment":
{ Args: { "p_department": string,"p_reason"?: string }; Returns: undefined
                           },
"import_results":
{ Args: { "p_department"?: string,"p_rows": Json,"p_update"?: boolean }; Returns: Json
                           },
"import_subjects":
{ Args: { "p_department"?: string,"p_rows": Json,"p_update"?: boolean }; Returns: Json
                           },
"mark_all_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"move_student_branch":
{ Args: { "p_reason": string,"p_student": string,"p_to": string }; Returns: string
                           },
"my_sessions":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"current": boolean,"id": string,"ip": string,"updated_at": string,"user_agent": string
            }[]
                           },
"notify_branch_hod":
{ Args: { "p_body": string,"p_department": string,"p_title": string }; Returns: number
                           },
"policy_inventory":
{ Args: Record<PropertyKey, never>; Returns: {
              "cmd": string,"policyname": string,"qual": string,"schemaname": string,"tablename": string,"with_check": string
            }[]
                           },
"request_branch_transfer":
{ Args: { "p_reason": string,"p_student": string,"p_to": string }; Returns: string
                           },
"restore_assignments":
{ Args: { "p_previous": Json }; Returns: number
                           },
"review_change_request":
{ Args: { "p_approve": boolean,"p_id": string,"p_note"?: string }; Returns: Json
                           },
"revoke_my_session":
{ Args: { "p_session": string }; Returns: undefined
                           },
"seed_branch_sections":
{ Args: { "p_department": string }; Returns: undefined
                           },
"set_user_role":
{ Args: { "p_role": Database["public"]['Enums']["user_role"],"p_user": string }; Returns: undefined
                           },
"set_user_status":
{ Args: { "p_status": Database["public"]['Enums']["user_status"],"p_user": string }; Returns: undefined
                           },
"tables_without_rls":
{ Args: Record<PropertyKey, never>; Returns: {
              "tablename": string
            }[]
                           }
          }
          Enums: {
            "ai_status": "DRAFT"|"APPROVED"|"REJECTED","branch_status": "ACTIVE"|"ARCHIVED","followup_status": "OPEN"|"RESOLVED","import_status": "PREVIEW"|"COMMITTED"|"FAILED","rec_category": "ACADEMIC_PROGRESS"|"ATTENDANCE"|"CAREER_GUIDANCE"|"PERSONAL_DEVELOPMENT","rec_kind": "RECOMMENDATION"|"FEEDBACK"|"GOAL"|"ACTION_POINT"|"STRENGTH"|"IMPROVEMENT_AREA","rec_status": "PENDING"|"IN_PROGRESS"|"COMPLETED","rec_visibility": "SHARED"|"PRIVATE_MENTOR","review_status": "PENDING"|"APPROVED"|"REJECTED","semester_status": "DRAFT"|"SUBMITTED"|"VERIFIED"|"FINALIZED","session_mode": "IN_PERSON"|"ONLINE","session_status": "SCHEDULED"|"COMPLETED"|"CANCELLED","subject_result": "PASS"|"FAIL"|"PENDING"|"ABSENT","user_role": "MENTEE"|"MENTOR"|"HOD"|"PRINCIPAL","user_status": "INVITED"|"ACTIVE"|"SUSPENDED"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "ai_status": ["DRAFT", "APPROVED", "REJECTED"],"branch_status": ["ACTIVE", "ARCHIVED"],"followup_status": ["OPEN", "RESOLVED"],"import_status": ["PREVIEW", "COMMITTED", "FAILED"],"rec_category": ["ACADEMIC_PROGRESS", "ATTENDANCE", "CAREER_GUIDANCE", "PERSONAL_DEVELOPMENT"],"rec_kind": ["RECOMMENDATION", "FEEDBACK", "GOAL", "ACTION_POINT", "STRENGTH", "IMPROVEMENT_AREA"],"rec_status": ["PENDING", "IN_PROGRESS", "COMPLETED"],"rec_visibility": ["SHARED", "PRIVATE_MENTOR"],"review_status": ["PENDING", "APPROVED", "REJECTED"],"semester_status": ["DRAFT", "SUBMITTED", "VERIFIED", "FINALIZED"],"session_mode": ["IN_PERSON", "ONLINE"],"session_status": ["SCHEDULED", "COMPLETED", "CANCELLED"],"subject_result": ["PASS", "FAIL", "PENDING", "ABSENT"],"user_role": ["MENTEE", "MENTOR", "HOD", "PRINCIPAL"],"user_status": ["INVITED", "ACTIVE", "SUSPENDED"]
          }
        }
} as const
