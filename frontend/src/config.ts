export const SUPABASE_URL = "https://zbrvppyhusrjpdpudzrl.supabase.co";
export const SUPABASE_KEY = "sb_publishable_1WpZzKGTEyLyHY8JguNXjg_dFgyazGB";

export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string) ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "");
