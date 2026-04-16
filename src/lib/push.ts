// Web Push subscription helpers
import { supabase } from "@/integrations/supabase/client";

// Public VAPID key - safe to expose in client
export const VAPID_PUBLIC_KEY =
  "BK6tQtvZYUkshPMMMO6SsrKtPFQflZwvP9INRHfiR6ZAqEjF8vkcBOi2N7KIO69cLBKUsIp_lJnKnTYI5_S8_xY";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerPushSW(): Promise<ServiceWorkerRegistration> {
  // Use a dedicated SW for push (does not interfere with PWA SW)
  const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  return reg;
}

export async function subscribeUserToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await registerPushSW();
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
  }

  const json = subscription.toJSON();
  const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
  const auth_key = arrayBufferToBase64(subscription.getKey("auth"));
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint || subscription.endpoint,
      p256dh,
      auth_key,
      device_type: isMobile ? "mobile" : "desktop",
      user_agent: navigator.userAgent.slice(0, 500),
    },
    { onConflict: "user_id,endpoint" }
  );
  return !error;
}

export async function unsubscribeUserFromPush(userId: string): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch (e) {
    console.warn("unsubscribe failed", e);
  }
}
