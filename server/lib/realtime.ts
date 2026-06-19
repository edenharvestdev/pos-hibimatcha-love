import Pusher from "pusher";

// Note: Ensure you set these environment variables when deploying to production
// To get these keys, sign up at pusher.com, create an app, and copy the App Keys.
const pusherClient = new Pusher({
  appId: process.env.PUSHER_APP_ID || "mock_app_id",
  key: process.env.PUSHER_KEY || "mock_key",
  secret: process.env.PUSHER_SECRET || "mock_secret",
  cluster: process.env.PUSHER_CLUSTER || "ap1",
  useTLS: true,
});

export const RealtimeEvents = {
  NEW_ORDER: "new_order",
  ORDER_UPDATED: "order_updated",
  STOCK_LOW: "stock_low",
};

export function isPusherConfigured(): boolean {
  const key = process.env.PUSHER_KEY ?? "";
  const appId = process.env.PUSHER_APP_ID ?? "";
  return !!(
    appId &&
    key &&
    process.env.PUSHER_SECRET &&
    !key.includes("your-pusher") &&
    !appId.includes("mock") &&
    key !== "mock_key"
  );
}

/**
 * Broadcasts a real-time event to a specific branch channel.
 * @param branchId The ID of the branch
 * @param event The event name (e.g., "new_order")
 * @param payload The data to send
 */
export async function broadcastToBranch(branchId: number, event: string, payload: any) {
  const channel = `branch-${branchId}`;
  try {
    if (isPusherConfigured()) {
      await pusherClient.trigger(channel, event, payload);
    } else {
      console.log(`[Realtime Mock] Channel: ${channel} | Event: ${event}`, payload);
    }
  } catch (error) {
    console.warn("[Realtime] Broadcast skipped:", (error as Error).message);
  }
}
