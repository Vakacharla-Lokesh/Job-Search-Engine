export class ApiClient {
  private readonly base: string;

  constructor(base: string) {
    if (!base) {
      throw new Error(
        "[ApiClient] VITE_API_URL is not set. " +
          "Make sure it is defined in your .env file.",
      );
    }
    this.base = base.replace(/\/$/, ""); // strip trailing slash
  }

  // ─── Core ────────────────────────────────────────────────────────────────────

  private async fetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.base}${path}`;

    const res = await fetch(url, {
      credentials: "include", // send httpOnly auth cookie on every request
      ...init,
      headers: {
        // Callers can override these headers by spreading their own
        ...init.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        (body as { error?: string; message?: string }).error ??
        (body as { error?: string; message?: string }).message ??
        `HTTP ${res.status}`;
      const err = new Error(message) as Error & { status: number };
      err.status = res.status;
      throw err;
    }

    // Handle 204 No Content or empty bodies gracefully
    const contentType = res.headers.get("content-type") ?? "";
    if (res.status === 204 || !contentType.includes("application/json")) {
      return undefined as unknown as T;
    }

    return res.json() as Promise<T>;
  }

  // ─── Convenience Methods ──────────────────────────────────────────────────────

  get<T>(path: string, init?: Omit<RequestInit, "method">): Promise<T> {
    return this.fetch<T>(path, { ...init, method: "GET" });
  }

  post<T>(
    path: string,
    body?: unknown,
    init?: Omit<RequestInit, "method" | "body">,
  ): Promise<T> {
    return this.fetch<T>(path, {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(
    path: string,
    body?: unknown,
    init?: Omit<RequestInit, "method" | "body">,
  ): Promise<T> {
    return this.fetch<T>(path, {
      ...init,
      method: "PUT",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(
    path: string,
    body?: unknown,
    init?: Omit<RequestInit, "method" | "body">,
  ): Promise<T> {
    return this.fetch<T>(path, {
      ...init,
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string, init?: Omit<RequestInit, "method">): Promise<T> {
    return this.fetch<T>(path, { ...init, method: "DELETE" });
  }
}

/** Singleton instance — import this everywhere instead of `new ApiClient()`. */
export const apiClient = new ApiClient(
  import.meta.env.VITE_API_URL as string,
);
