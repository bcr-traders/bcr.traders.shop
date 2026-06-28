export async function updateClerkPublicMetadata(
  clerkUserId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  if (!process.env.CLERK_SECRET_KEY) return
  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  await client.users.updateUserMetadata(clerkUserId, { publicMetadata: metadata })
}
