import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { BookingFlow } from "./BookingFlow";
import type { WorkingHours } from "@berber/shared/types";
import type { Database } from "@berber/db/src/database.types";

interface PageProps {
  params: { slug: string };
}

// D-03: ISR — sayfa statik render edilir, 60 saniyede bir arka planda yenilenir.
export const revalidate = 60;
// Yeni eklenen slug'lar build'de tanımsız; ilk istekte SSR + cache.
export const dynamicParams = true;

// D-03: build-time'da bilinen tüm berber slug'larını prerender et.
// Cookie'siz raw client — `cookies()` çağrısı sayfayı dinamik moda zorlar (ISR'i bozar).
// Env yoksa (lokal build, CI sandbox) sessizce boş dönüp on-demand SSR'a düşer.
export async function generateStaticParams() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  const supabase = createClient<Database>(url, anon);
  const { data } = await supabase.from("barbers").select("slug");
  return (data ?? []).map(({ slug }) => ({ slug }));
}

// F-01: generateMetadata + sayfa aynı sorguyu paylaşır; ayrıca 60s cache.
// Cookie'siz raw client — unstable_cache içinde cookies() çağrısı yasak (Next.js kısıtı).
// Berber profili public data, auth gerektirmiyor.
const getBarberBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("barbers")
      .select("id, slug, display_name, bio, avatar_url, timezone, working_hours")
      .eq("slug", slug)
      .single();
    return data;
  },
  ["barber-profile"],
  { revalidate: 60, tags: ["barber-profile"] }
);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const barber = await getBarberBySlug(params.slug);
  if (!barber) return { title: "Berber bulunamadı" };
  return { title: `${barber.display_name} — Randevu Al` };
}

export default async function BookingPage({ params }: PageProps) {
  const barber = await getBarberBySlug(params.slug);
  if (!barber) notFound();

  const supabase = createSupabaseServerClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, barber_id, name, duration_min, price_cents, display_order")
    .eq("barber_id", barber.id)
    .eq("is_active", true)
    .order("display_order");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center gap-4">
          {barber.avatar_url && (
            <Image
              src={barber.avatar_url}
              alt={barber.display_name}
              width={64}
              height={64}
              className="rounded-full object-cover"
              priority
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{barber.display_name}</h1>
            {barber.bio && (
              <p className="mt-1 text-sm text-gray-500">{barber.bio}</p>
            )}
          </div>
        </div>

        <BookingFlow
          barber={{
            id: barber.id,
            slug: barber.slug,
            display_name: barber.display_name,
            bio: barber.bio,
            avatar_url: barber.avatar_url,
            timezone: barber.timezone,
            working_hours: barber.working_hours as unknown as WorkingHours,
          }}
          services={services ?? []}
        />
      </div>
    </main>
  );
}
