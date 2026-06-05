import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// -- mocks (hoisted) --------------------------------------------------------
vi.mock("@/lib/supabase/browser");
vi.mock("@berber/db");

// -- imports (after mocks) ---------------------------------------------------
import { createClient } from "@/lib/supabase/browser";
import { getServices, upsertService, deleteService, toggleService } from "@berber/db";
import HizmetlerPage from "../page";

const mockCreateClient = createClient as Mock;
const mockGetServices = getServices as Mock;
const mockUpsertService = upsertService as Mock;
const mockDeleteService = deleteService as Mock;
const mockToggleService = toggleService as Mock;

// ---------------------------------------------------------------------------

const SHOP_CHAIN = {
  select: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: { id: "shop-1" } }),
};

function setupClient(overrides?: { user?: object | null }) {
  const user = overrides?.user !== undefined ? overrides.user : { id: "user-1" };
  mockCreateClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockReturnValue(SHOP_CHAIN),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Tüm from() çağrılarında SHOP_CHAIN'i döndür (her test resetlensin diye)
  SHOP_CHAIN.select.mockReturnThis();
  SHOP_CHAIN.or.mockReturnThis();
  SHOP_CHAIN.maybeSingle.mockResolvedValue({ data: { id: "shop-1" } });

  setupClient();
  mockGetServices.mockResolvedValue({ data: [] });
  mockUpsertService.mockResolvedValue({ error: null });
  mockDeleteService.mockResolvedValue({ error: null });
  mockToggleService.mockResolvedValue({ error: null });
});

// ===========================================================================

describe("DURATIONS sabiti", () => {
  it("form açıldığında 7 süre seçeneği gösterilir: [15,20,30,45,60,90,120]", async () => {
    render(<HizmetlerPage />);
    // Hizmet Ekle butonuna tıkla (form açılır)
    const addBtn = await screen.findByRole("button", { name: /hizmet ekle/i });
    fireEvent.click(addBtn);

    const expected = [15, 20, 30, 45, 60, 90, 120];
    for (const d of expected) {
      // Buton metni "{d} dk" biçiminde — {d} text node, " dk" span
      // getByText regex ile sayı değerini buluruz
      expect(screen.getByText(new RegExp(`^${d}$`))).toBeInTheDocument();
    }

    // Toplam süre butonu sayısı tam 7 olmalı
    const durationButtons = screen
      .getAllByRole("button")
      .filter((btn) => /^\d+\s*dk/.test(btn.textContent ?? ""));
    expect(durationButtons).toHaveLength(7);
  });
});

// ===========================================================================

describe("Hizmet Ekle — insert testi", () => {
  it("form doldurulup Ekle tıklandığında upsertService doğru price_cents ile çağrılır", async () => {
    render(<HizmetlerPage />);
    fireEvent.click(await screen.findByRole("button", { name: /hizmet ekle/i }));

    // Ad gir
    fireEvent.change(screen.getByPlaceholderText(/saç kesimi/i), {
      target: { value: "Tıraş" },
    });
    // Fiyat gir: 150 TL → 15000 cents
    fireEvent.change(screen.getByPlaceholderText(/200/), {
      target: { value: "150" },
    });

    // Kaydet
    fireEvent.click(screen.getByRole("button", { name: /^ekle$/i }));

    await waitFor(() => {
      expect(mockUpsertService).toHaveBeenCalledOnce();
      expect(mockUpsertService).toHaveBeenCalledWith(
        expect.anything(), // supabase client
        "shop-1",
        expect.objectContaining({
          name: "Tıraş",
          price_cents: 15000, // 150 * 100
        })
      );
    });
  });

  it("price_cents = Math.round(fiyat * 100) — kesirli fiyat doğru yuvarlanır", async () => {
    render(<HizmetlerPage />);
    fireEvent.click(await screen.findByRole("button", { name: /hizmet ekle/i }));

    fireEvent.change(screen.getByPlaceholderText(/saç kesimi/i), {
      target: { value: "Saç Kesimi" },
    });
    // 199.99 TL → Math.round(199.99 * 100) = 19999
    fireEvent.change(screen.getByPlaceholderText(/200/), {
      target: { value: "199.99" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^ekle$/i }));

    await waitFor(() => {
      expect(mockUpsertService).toHaveBeenCalledWith(
        expect.anything(),
        "shop-1",
        expect.objectContaining({ price_cents: 19999 })
      );
    });
  });

  it("fiyat 0 girilirse hata mesajı gösterilir, DB'ye yazılmaz", async () => {
    render(<HizmetlerPage />);
    fireEvent.click(await screen.findByRole("button", { name: /hizmet ekle/i }));

    fireEvent.change(screen.getByPlaceholderText(/saç kesimi/i), {
      target: { value: "Test" },
    });
    // Fiyat girilmez (0 kalır)
    fireEvent.click(screen.getByRole("button", { name: /^ekle$/i }));

    await waitFor(() => {
      expect(screen.getByText("Fiyat 0'dan büyük olmalıdır.")).toBeInTheDocument();
    });
    expect(mockUpsertService).not.toHaveBeenCalled();
  });

  it("hizmet adı boş bırakılırsa DB'ye yazılmaz", async () => {
    render(<HizmetlerPage />);
    fireEvent.click(await screen.findByRole("button", { name: /hizmet ekle/i }));

    fireEvent.change(screen.getByPlaceholderText(/200/), {
      target: { value: "100" },
    });
    // Ad girilmez
    fireEvent.click(screen.getByRole("button", { name: /^ekle$/i }));

    await waitFor(() => {
      expect(screen.getByText("Hizmet adı gerekli")).toBeInTheDocument();
    });
    expect(mockUpsertService).not.toHaveBeenCalled();
  });
});

// ===========================================================================

describe("Hizmet Sil — delete testi", () => {
  const SERVICE = {
    id: "svc-1",
    name: "Saç Kesimi",
    duration_min: 30,
    price_cents: 20000,
    is_active: true,
  };

  beforeEach(() => {
    mockGetServices.mockResolvedValue({ data: [SERVICE] });
  });

  it("silme butonuna basılıp onaylanınca deleteService(svcId, shopId) çağrılır", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<HizmetlerPage />);
    await screen.findByText("Saç Kesimi");

    // Trash2 butonu: her hizmet satırındaki son buton
    const buttons = screen.getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1]!;
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteService).toHaveBeenCalledOnce();
      expect(mockDeleteService).toHaveBeenCalledWith(
        expect.anything(),
        "svc-1",
        "shop-1"
      );
    });
  });

  it("confirm reddedilirse deleteService çağrılmaz", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<HizmetlerPage />);
    await screen.findByText("Saç Kesimi");

    const buttons = screen.getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1]!;
    fireEvent.click(deleteBtn);

    // confirm false döndü — sil fonksiyonu çağrılmamalı
    expect(mockDeleteService).not.toHaveBeenCalled();
  });

  it("DB'den hizmet listesi çekilir (getServices shopId ile çağrılır)", async () => {
    render(<HizmetlerPage />);
    await waitFor(() => {
      expect(mockGetServices).toHaveBeenCalledWith(
        expect.anything(),
        "shop-1"
      );
    });
  });
});
