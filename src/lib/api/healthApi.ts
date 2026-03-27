import type { HealthAppState } from "@/lib/healthStore";

const STORAGE_KEY = "vitalis-core-state-v1";

export type HealthApi = {
  loadState: () => Promise<HealthAppState | null>;
  saveState: (state: HealthAppState) => Promise<void>;
};

function createLocalHealthApi(): HealthApi {
  return {
    async loadState() {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw) as HealthAppState;
      } catch {
        return null;
      }
    },
    async saveState(state) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
  };
}

function createRemoteHealthApi(baseUrl: string): HealthApi {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    async loadState() {
      const response = await fetch(`${normalizedBaseUrl}/state`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load state: ${response.status}`);
      }

      return (await response.json()) as HealthAppState;
    },
    async saveState(state) {
      const response = await fetch(`${normalizedBaseUrl}/state`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        throw new Error(`Failed to save state: ${response.status}`);
      }
    },
  };
}

export function createHealthApi(): HealthApi {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (baseUrl) {
    return createRemoteHealthApi(baseUrl);
  }

  return createLocalHealthApi();
}
