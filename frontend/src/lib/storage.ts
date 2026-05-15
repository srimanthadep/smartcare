/**
 * Safely parses a JSON string from localStorage.
 * Handles cases where the value is missing, null, "undefined", or invalid JSON.
 */
export function safeLocalStorageParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined" || raw === "null") {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    return fallback;
  }
}
