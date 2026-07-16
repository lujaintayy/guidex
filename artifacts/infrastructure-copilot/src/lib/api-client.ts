// Configure the API client to inject auth token
// The custom fetch in api-client-react reads this
export function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("infra-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.token ?? null;
    }
  } catch {}
  return null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}
