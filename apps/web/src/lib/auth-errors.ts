export function mapSupabaseError(msg: string): string {
  if (msg.includes("already registered") || msg.includes("already been registered")) {
    return "Bu e-posta adresi zaten kayıtlı.";
  }
  if (msg.includes("Invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (msg.includes("Email not confirmed")) {
    return "Lütfen e-postanızı doğrulayın.";
  }
  if (msg.includes("Too many requests")) {
    return "Çok fazla deneme yaptınız. Lütfen bekleyin.";
  }
  if (msg.includes("User not found")) {
    return "Bu e-posta adresi kayıtlı değil.";
  }
  return "Bir hata oluştu. Lütfen tekrar deneyin.";
}
