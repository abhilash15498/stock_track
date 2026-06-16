export const SUPABASE_URL = "https://zbrvppyhusrjpdpudzrl.supabase.co";
export const SUPABASE_KEY = "sb_publishable_1WpZzKGTEyLyHY8JguNXjg_dFgyazGB";

const isLocalHost =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const configuredBackend = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
const normalizedConfiguredBackend = configuredBackend?.replace(/\/+$/, "");

export const BACKEND_URL =
  normalizedConfiguredBackend ||
  (isLocalHost ? "http://localhost:8000" : "https://stock-track-x342.onrender.com");
