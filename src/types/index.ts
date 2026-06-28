export type { Database } from './database.types'

export interface ClerkPublicMetadata {
  role: 'customer' | 'super_admin' | 'admin' | 'delivery'
  supabase_profile_id: string
  admin_profile_id?: string
}

declare module '@clerk/nextjs' {
  interface UserPublicMetadata extends ClerkPublicMetadata {}
}