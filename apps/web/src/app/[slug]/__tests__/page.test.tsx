import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// -- mocks (hoisted) --------------------------------------------------------
vi.mock("../../../lib/supabase/server");
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("../BookingClient", () => ({
  default: vi.fn(),
}));

// -- imports (after mocks) ---------------------------------------------------
import { createClient } from "../../../lib/supabase/server";
import { notFound } from "next/navigation";
import BookingClient from "../BookingClient";
import ShopPage from "../page";

const mockCreateClient = createClient as Mock;
const mockBookingClient = BookingClient as unknown as Mock;

// ---------------------------------------------------------------------------

type ServiceRow = { id: string; name: string; duration_min: number; price_cents: number | null };
type StaffRow   = { id: string; name: string; phone: string | null };
type BookingClientProps = {
  shop: { id: string; name: string; address: string | null; slug: string; timezone: string };
  services: Array<{ id: string; name: string; duration_min: number; price: number }>;
  staff: Array<{ id: string; name: string; phone: string | null }>;
};

function buildSupabaseMock({
  shopData,
  servicesData = [] as ServiceRow[],
  staffData    = [] as StaffRow[],
}: {
  shopData: Record<string, unknown> | null;
  servicesData?: ServiceRow[];
  staffData?:   StaffRow[];
}) {
  const shopChain = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: shopData }),
  };
  const servicesChain = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue({ data: servicesData }),
  };
  const staffChain = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue({ data: staffData }),
  };
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "services") return servicesChain;
    if (table === "staff")    return staffChain;
    return shopChain; // "shops" + fallback
  });
  mockCreateClient.mockResolvedValue({ from: fromMock });
  return { fromMock, shopChain, servicesChain, staffChain };
}

async function callPage(slug = "ahmet-berber") {
  return ShopPage({ params: Promise.resolve({ slug }) });
}

function propsOf(el: unknown): BookingClientProps {
  return (el as React.ReactElement<BookingClientProps>).props;
}

const ACTIVE_SHOP = {
  id:           "shop-1",
  name:         "Ahmet Berber",
  display_name: null,
  address:      "İstanbul",
  slug:         "ahmet-berber",
  timezone:     "Europe/Istanbul",
  status:       "active",
  phone:        "05001234567",
} as const;

// ===========================================================================

describe("ShopPage — durum yönlendirmeleri", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("shop DB'de yok → notFound() çağrılır", async () => {
    buildSupabaseMock({ shopData: null });
    await expect(callPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("status 'pending' → 'Onay Bekleniyor' sayfası render edilir", async () => {
    buildSupabaseMock({ shopData: { ...ACTIVE_SHOP, status: "pending" } });
    const el = await callPage();
    const html = renderToStaticMarkup(el as React.ReactElement);
    expect(html).toContain("Onay Bekleniyor");
  });

  it("status 'rejected' → 'Dükkan Aktif Değil' sayfası render edilir", async () => {
    buildSupabaseMock({ shopData: { ...ACTIVE_SHOP, status: "rejected" } });
    const el = await callPage();
    const html = renderToStaticMarkup(el as React.ReactElement);
    expect(html).toContain("Dükkan Aktif Değil");
  });

  it("status bilinmeyen ('suspended') → notFound()", async () => {
    buildSupabaseMock({ shopData: { ...ACTIVE_SHOP, status: "suspended" } });
    await expect(callPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("status 'active' → BookingClient element döner (React element type doğru)", async () => {
    buildSupabaseMock({ shopData: ACTIVE_SHOP });
    const el = await callPage();
    // React.createElement(BookingClient, props) → type === mockBookingClient
    expect((el as React.ReactElement).type).toBe(mockBookingClient);
  });
});

// ===========================================================================

describe("ShopPage — parallel fetch", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("services ve staff sorguları her ikisi de çalıştırılır", async () => {
    const { servicesChain, staffChain } = buildSupabaseMock({ shopData: ACTIVE_SHOP });
    await callPage();
    expect(servicesChain.order).toHaveBeenCalledOnce();
    expect(staffChain.order).toHaveBeenCalledOnce();
  });
});

// ===========================================================================

describe("ShopPage — price_cents → price dönüşümü", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("2500 cents → 25 TL", async () => {
    buildSupabaseMock({
      shopData:     ACTIVE_SHOP,
      servicesData: [{ id: "s1", name: "Saç Kesimi", duration_min: 30, price_cents: 2500 }],
    });
    const el = await callPage();
    expect(propsOf(el).services[0]!.price).toBe(25);
  });

  it("15099 cents → Math.round(150.99) = 151 TL", async () => {
    buildSupabaseMock({
      shopData:     ACTIVE_SHOP,
      servicesData: [{ id: "s1", name: "Tıraş", duration_min: 15, price_cents: 15099 }],
    });
    const el = await callPage();
    expect(propsOf(el).services[0]!.price).toBe(151);
  });

  it("price_cents null → price: 0 (hizmet ücretsiz)", async () => {
    buildSupabaseMock({
      shopData:     ACTIVE_SHOP,
      servicesData: [{ id: "s1", name: "Konsültasyon", duration_min: 15, price_cents: null }],
    });
    const el = await callPage();
    expect(propsOf(el).services[0]!.price).toBe(0);
  });

  it("services boş array gelirse BookingClient boş services alır", async () => {
    buildSupabaseMock({ shopData: ACTIVE_SHOP, servicesData: [] });
    const el = await callPage();
    expect(propsOf(el).services).toHaveLength(0);
  });
});

// ===========================================================================

describe("ShopPage — staff Türkçe sıralama ('tr' locale)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("İ/Ö içeren isimler Türkçe alfabetik sırayla gelir", async () => {
    buildSupabaseMock({
      shopData: ACTIVE_SHOP,
      // DB'den rastgele sırada — client-side localeCompare('tr') sıralaması beklenir
      staffData: [
        { id: "s3", name: "Özkan",  phone: null },
        { id: "s1", name: "Ahmet",  phone: null },
        { id: "s2", name: "İsmail", phone: null },
      ],
    });
    const el = await callPage();
    expect(propsOf(el).staff.map((s) => s.name)).toEqual(["Ahmet", "İsmail", "Özkan"]);
  });

  it("staff DB'den boş gelirse hata fırlatmaz", async () => {
    buildSupabaseMock({ shopData: ACTIVE_SHOP, staffData: [] });
    await expect(callPage()).resolves.toBeDefined();
  });
});

// ===========================================================================

describe("ShopPage — staff.phone ?? shop.phone fallback", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("staff.phone yoksa shop.phone kullanılır", async () => {
    buildSupabaseMock({
      shopData:  { ...ACTIVE_SHOP, phone: "05551234567" },
      staffData: [{ id: "s1", name: "Ahmet", phone: null }],
    });
    const el = await callPage();
    expect(propsOf(el).staff[0]!.phone).toBe("05551234567");
  });

  it("staff.phone varsa kendi telefonu korunur", async () => {
    buildSupabaseMock({
      shopData:  { ...ACTIVE_SHOP, phone: "05551234567" },
      staffData: [{ id: "s1", name: "Ahmet", phone: "05009999999" }],
    });
    const el = await callPage();
    expect(propsOf(el).staff[0]!.phone).toBe("05009999999");
  });
});
