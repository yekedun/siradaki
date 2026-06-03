import { describe, expect, it } from "vitest";
import { mapSupabaseError } from "./auth-errors";

describe("mapSupabaseError", () => {
  it("maps known Supabase auth errors to Turkish messages", () => {
    expect(mapSupabaseError("User already registered")).toBe("Bu e-posta adresi zaten kayıtlı.");
    expect(mapSupabaseError("Invalid login credentials")).toBe("E-posta veya şifre hatalı.");
    expect(mapSupabaseError("Email not confirmed")).toBe("Lütfen e-postanızı doğrulayın.");
    expect(mapSupabaseError("Too many requests")).toBe("Çok fazla deneme yaptınız. Lütfen bekleyin.");
    expect(mapSupabaseError("User not found")).toBe("Bu e-posta adresi kayıtlı değil.");
  });

  it("uses a generic Turkish fallback for unknown errors", () => {
    expect(mapSupabaseError("Unexpected auth provider failure")).toBe(
      "Bir hata oluştu. Lütfen tekrar deneyin.",
    );
  });
});
