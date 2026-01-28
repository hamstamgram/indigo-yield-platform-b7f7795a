/**
 * Recent Activity Feed
 * Real-time stream of platform events
 *
 * This is a thin wrapper around the common ActivityFeed component
 * that provides the self-fetching behavior for the admin dashboard.
 */

import { ActivityFeed } from "@/components/common";

/**
 * Self-fetching activity feed for the admin dashboard.
 * Automatically fetches recent activities and subscribes to realtime updates.
 */
export function RecentActivityFeed() {
  return <ActivityFeed />;
}
