export interface User {
  id: string
  name: string
  email: string
  email_verified_at?: string
  super_admin: boolean
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

export interface SystemConfig {
  global_rule_numbers: boolean
  sort_rules_by: 'number' | 'sort_order'
  toc_depth: number
  proofread_threshold: number
  cover_image: string | null
}

export interface SystemPermissions {
  'system.manage': boolean
  'membership.manage': boolean
  'module.create': boolean
}

export interface ModulePermissions {
  'module.update': boolean
  'module.delete': boolean
  'content.view_live': boolean
  'content.view_released': boolean
  'content.edit': boolean
  'content.proofread': boolean
  'version.publish': boolean
  'version.amend_latest': boolean
  'subscription.manage': boolean
}

export interface System {
  id: string
  slug: string
  name: string
  description: string | null
  config: SystemConfig | null
  permissions: SystemPermissions
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
  permissions: ModulePermissions
  created_at: string
  updated_at: string
}

export interface BookmarkEntry {
  type: 'rule'
  id: string
}

export interface UserSubscription {
  id: string
  editor: boolean
}

export interface MembershipConfig {
  bookmarks?: BookmarkEntry[]
  ignored_tags?: string[]
  preferred_rule_format?: 'content' | 'markdown'
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
  rule_id?: string
  module_id: string
  parent_id: string | null
  number: string
  title: string
  content: string
  markdown: string | null
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
  index_entry_id?: string
  module_id: string
  parent_id: string | null
  term: string
  definition: string
  notes: string | null
  relations: IndexEntryRelations | null
  created_at: string
  updated_at: string
}

export interface GameDatum {
  id: string
  game_datum_id?: string
  module_id: string
  type: 'sop' | 'table' | 'ordnance' | 'vehicle'
  slug: string
  name: string
  content: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ProofreadEntityType = 'rule' | 'index_entry' | 'game_datum'

export interface ProofreadEntityStatus {
  count: number
  me: boolean
}

export interface ProofreadStatus {
  threshold: number
  proofreads: Record<string, ProofreadEntityStatus>
}

export interface ManifestContent {
  rules: string
  index: string
  'game-data': string
}

export interface ManifestEntry {
  module_id: string
  version_id: string
  version_string: string
  released_at: string
  revision: number
  content: ManifestContent
}

export interface AmendVersionRequest {
  entity_type: 'rule' | 'index_entry' | 'game_datum'
  entity_id: string
  expected_revision: number
  content: Record<string, unknown>
}

export interface ModuleDraftChange {
  id: string
  module_id: string
  module_version_id: string | null
  entity_type: 'rule' | 'index_entry' | 'game_datum'
  entity_id: string
  change_type: 'correction' | 'update'
  description: string | null
  content_after: Record<string, unknown>
  changed_by: string
  changed_at: string
}

// -- API Response Wrappers --
export interface ApiResource<T> {
  data: T
}

export interface ApiCollection<T> {
  data: T[]
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
    global_rule_numbers: boolean
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

export interface UpdateIndexEntryRequest {
  parent_id: string | null
  term: string
  definition: string
  notes: string
  relations: {
    rule_refs: string[]
    see_also: string[]
  }
}

export interface UpdateRuleRequest {
  number: string
  title: string
  content: string
  markdown: string | null
  parent_id: string | null
  sort_order: number
}

export type RuleDeletionMode = 're_parent' | 'recursive'

export interface BrokenReference {
  module: string
  location: string
  kind: 'rule' | 'index'
  reference: string
  reason: 'unknown_number' | 'unknown_slug'
}
