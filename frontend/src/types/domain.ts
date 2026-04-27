export interface User {
  id: string
  name: string
  email: string
  email_verified_at?: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  module_id: string
  user_id: string
  editor: boolean
}

export interface MembershipWithUser extends Membership {
  user_name: string
  user_email: string
}

export interface SubscriptionWithUser extends Subscription {
  user_name: string
  user_email: string
}

export type SystemStructure = 'core_plus_many' | 'core_plus_one' | 'grouping_only'

export interface SystemConfig {
  system_structure: SystemStructure
  sort_rules_by: 'number' | 'sort_order'
  toc_depth: number
  cover_image: string | null
}

export interface System {
  id: string
  slug: string
  name: string
  description: string | null
  config: SystemConfig | null
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  system_id: string
  slug: string
  name: string
  description: string | null
  config: Record<string, unknown> | null
  is_core: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BookmarkEntry {
  type: 'rule'
  id: string
}

export interface MembershipConfig {
  active_module_ids: string[]
  bookmarks?: BookmarkEntry[]
}

export interface Membership {
  id: string
  system_id: string
  user_id: string
  admin: boolean
  config: MembershipConfig | null
  created_at: string
  updated_at: string
}

export interface Rule {
  id: string
  module_id: string
  parent_id: string | null
  number: string
  title: string
  content: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface IndexEntryRelations {
  rule_refs?: string[]
  see_also?: string[]
}

export interface IndexEntry {
  id: string
  module_id: string
  parent_id: string | null
  term: string
  definition: string
  notes: string | null
  relations: IndexEntryRelations | null
  created_at: string
  updated_at: string
}

// -- Requests --
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface ResetPasswordRequest {
  email: string
}

export interface UpdatePasswordRequest {
  password: string
  password_confirmation: string
}

export interface UpdateProfileRequest {
  name: string
  email: string
}

export interface CreateSystemRequest {
  name: string
  slug: string
  description: string
  config: {
    system_structure: SystemStructure
    toc_depth: number
    sort_rules_by: 'number' | 'sort_order'
  }
}

export interface CreateModuleRequest {
  name: string
  slug: string
  is_core: boolean
  description: string
  config: Record<string, unknown>
  sort_order: number
}
