// @vitest-environment node
// NOT: ADMIN_EMAILS middleware.ts'de modül yüklenirken hesaplanır (module-level const).
// vi.hoisted() import'lardan önce çalışır → env'yi modül yüklenmeden önce set etmek için kullanılır.

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.ADMIN_EMAILS = "admin@siradaki.app, second@siradaki.app";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

// -- mock (hoisted) ---------------------------------------------------------
const supabaseMock = {
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => supabaseMock),
}));

// -- imports -----------------------------------------------------------------
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

// ---------------------------------------------------------------------------

function makeRequest(pathname: string) {
  return new NextRequest(new URL(pathname, "https://siradaki.app"));
}

const AUTHED_USER  = { id: "user-1", email: "user@example.com" };
const ADMIN_USER   = { id: "user-2", email: "admin@siradaki.app" };
const SECOND_ADMIN = { id: "user-3", email: "second@siradaki.app" };

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// PROTECTED routes — /dashboard
// ===========================================================================

describe("PROTECTED route — /dashboard", () => {
  it("auth olmadan /dashboard → /giris redirect", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/dashboard"));
    expect(res.headers.get("location")).toContain("/giris");
  });

  it("redirect URL'i ?redirect=/dashboard parametresi taşır", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/dashboard"));
    expect(res.headers.get("location")).toBe(
      "https://siradaki.app/giris?redirect=%2Fdashboard"
    );
  });

  it("auth varsa /dashboard → redirect yok (200)", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    const res = await middleware(makeRequest("/dashboard"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("auth olmadan /dashboard/hizmetler (alt path) → /giris redirect + alt path parametresi", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/dashboard/hizmetler"));
    expect(res.headers.get("location")).toContain("/giris");
    expect(res.headers.get("location")).toContain("redirect=%2Fdashboard%2Fhizmetler");
  });
});

// ===========================================================================
// AUTH_ROUTES — /giris, /kayit
// ===========================================================================

describe("AUTH_ROUTES — /giris, /kayit", () => {
  it("auth varsa /giris → /dashboard redirect", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    const res = await middleware(makeRequest("/giris"));
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("auth varsa /kayit → /dashboard redirect", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    const res = await middleware(makeRequest("/kayit"));
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("auth olmadan /giris → redirect yok (200)", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/giris"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("auth olmadan /kayit → redirect yok (200)", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/kayit"));
    expect(res.headers.get("location")).toBeNull();
  });
});

// ===========================================================================
// Public route — herhangi bir slug
// ===========================================================================

describe("Public route — dükkan sayfaları", () => {
  it("auth olmadan /keskin-berber → redirect yok", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/keskin-berber"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("auth varken public route → redirect yok", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    const res = await middleware(makeRequest("/keskin-berber"));
    expect(res.headers.get("location")).toBeNull();
  });
});

// ===========================================================================
// Admin route — ADMIN_EMAILS tabanlı koruma
// ADMIN_EMAILS="admin@siradaki.app, second@siradaki.app" (vi.hoisted ile set edildi)
// ===========================================================================

describe("Admin route — ADMIN_EMAILS e-posta tabanlı koruma", () => {
  it("auth olmadan /admin → /giris redirect (redirect param taşır)", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/admin"));
    expect(res.headers.get("location")).toBe(
      "https://siradaki.app/giris?redirect=%2Fadmin"
    );
  });

  it("auth var ama ADMIN_EMAILS'te değil → 404", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "hacker@evil.com" } },
    });
    const res = await middleware(makeRequest("/admin"));
    expect(res.status).toBe(404);
  });

  it("auth var ve ADMIN_EMAILS'te kayıtlı (ilk e-posta) → redirect yok, 404 yok", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await middleware(makeRequest("/admin"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).not.toBe(404);
  });

  it("e-posta büyük/küçük harf fark gözetmez (case-insensitive)", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "ADMIN@SIRADAKI.APP" } },
    });
    const res = await middleware(makeRequest("/admin"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).not.toBe(404);
  });

  it("virgülle ayrılmış ikinci admin e-posta da erişim sağlar", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: SECOND_ADMIN } });
    const res = await middleware(makeRequest("/admin"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).not.toBe(404);
  });
});
