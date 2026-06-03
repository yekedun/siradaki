-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: 03.06.2026 günü için sahte randevular
-- Supabase Dashboard → SQL Editor'da çalıştır (service role — RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_shop_id    uuid;
  v_staff      RECORD;
  v_svc        RECORD;
  v_services   uuid[];
  v_svc_durs   int[];
  v_svc_prices int[];
  v_svc_count  int;
  v_svc_idx    int;

  v_slot_start  timestamptz;
  v_slot_end    timestamptz;
  v_slot_offset interval;
  v_dur         int;
  v_price       int;
  v_status      text;
  v_slot_num    int;
  v_total       int := 0;

  -- Gerçekçi müşteri isimleri
  names text[] := ARRAY[
    'Ahmet Yılmaz','Mehmet Kaya','Ali Demir','Hasan Çelik','İbrahim Şahin',
    'Mustafa Arslan','Hüseyin Kurt','Osman Aydın','Yusuf Özkan','Musa Erdoğan',
    'İsmail Çetin','Kadir Doğan','Selim Bozkurt','Emre Güneş','Serkan Polat',
    'Burak Acar','Tolga Kılıç','Volkan Aslan','Onur Yıldız','Cem Koç',
    'Baran Şimşek','Kaan Öztürk','Mert Aydın','Kerem Yıldırım','Uğur Güler',
    'Taner Çakır','Suat Bulut','Arda Keskin','Berk Tekin','Alper Uysal'
  ];
  n_idx int := 0;

  -- Telefon numaraları
  phones text[] := ARRAY[
    '05321001001','05331002002','05341003003','05351004004','05361005005',
    '05371006006','05381007007','05391008008','05301009009','05311010010',
    '05321011011','05331012012','05341013013','05351014014','05361015015',
    '05371016016','05381017017','05391018018','05301019019','05311020020',
    '05321021021','05331022022','05341023023','05351024024','05361025025',
    '05371026026','05381027027','05391028028','05301029029','05311030030'
  ];

BEGIN
  -- ── 1. Shop bul ───────────────────────────────────────────────────────────
  SELECT s.id INTO v_shop_id
  FROM public.shops s
  JOIN auth.users u ON u.id = s.owner_user_id
  WHERE u.email = 'emreyek29@gmail.com'
  LIMIT 1;

  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'Shop bulunamadı — email kontrolü yap';
  END IF;
  RAISE NOTICE 'Shop: %', v_shop_id;

  -- ── 2. Aktif hizmetleri topla ─────────────────────────────────────────────
  SELECT
    array_agg(id ORDER BY display_order),
    array_agg(duration_min ORDER BY display_order),
    array_agg(COALESCE(price_cents, 60000) ORDER BY display_order)
  INTO v_services, v_svc_durs, v_svc_prices
  FROM public.services
  WHERE shop_id = v_shop_id AND is_active = true;

  IF v_services IS NULL OR array_length(v_services, 1) = 0 THEN
    -- Hizmet yoksa fallback: 30 dk / 60000 kuruş
    v_services   := ARRAY[NULL::uuid];
    v_svc_durs   := ARRAY[30];
    v_svc_prices := ARRAY[60000];
    RAISE NOTICE 'Hizmet bulunamadı, varsayılan (30dk / 600₺) kullanılıyor';
  END IF;

  v_svc_count := array_length(v_services, 1);

  -- ── 3. Her aktif personel için randevular oluştur ─────────────────────────
  FOR v_staff IN
    SELECT id, name
    FROM public.staff
    WHERE shop_id = v_shop_id AND is_active = true
    ORDER BY name
  LOOP
    RAISE NOTICE 'Personel: %', v_staff.name;

    v_slot_offset := interval '0';
    v_slot_num    := 0;

    -- 09:00'dan 18:30'a kadar doldur
    LOOP
      EXIT WHEN v_slot_offset >= interval '9 hours 30 minutes';

      -- Rotasyonla hizmet seç
      v_svc_idx := (v_slot_num % v_svc_count) + 1;
      v_dur      := v_svc_durs[v_svc_idx];

      v_slot_start := ('2026-06-03 09:00:00 Europe/Istanbul'::timestamptz) + v_slot_offset;
      v_slot_end   := v_slot_start + (v_dur * interval '1 minute');

      -- 19:00'ı aşmasın
      EXIT WHEN v_slot_end > '2026-06-03 19:00:00 Europe/Istanbul'::timestamptz;

      -- Fiyat: 550–700₺ arası (ortalama ~600₺)
      v_price  := (55 + (random() * 15)::int) * 1000;

      -- Sabah randevuları completed, öğleden sonrası confirmed
      v_status := CASE
        WHEN v_slot_start < '2026-06-03 13:00:00 Europe/Istanbul'::timestamptz
          THEN 'completed'
        ELSE 'confirmed'
      END;

      INSERT INTO public.appointments (
        staff_id, service_id, customer_name, customer_phone,
        starts_at, ends_at, status, booked_price_cents
      ) VALUES (
        v_staff.id,
        v_services[v_svc_idx],
        names[(n_idx % array_length(names, 1)) + 1],
        phones[(n_idx % array_length(phones, 1)) + 1],
        v_slot_start,
        v_slot_end,
        v_status,
        v_price
      );

      n_idx         := n_idx + 1;
      v_total       := v_total + 1;
      v_slot_num    := v_slot_num + 1;
      -- Randevular arası 5 dk boşluk
      v_slot_offset := v_slot_offset + (v_dur * interval '1 minute') + interval '5 minutes';
    END LOOP;

  END LOOP;

  RAISE NOTICE '✓ Toplam % randevu oluşturuldu (03.06.2026)', v_total;
END $$;
