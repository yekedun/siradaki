import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'child_process';

function readSupabaseStatusEnv() {
  try {
    const out = execFileSync('supabase', ['status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return Object.fromEntries(
      out
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^"|"$/g, '')])
    );
  } catch {
    return {};
  }
}

const localEnv = readSupabaseStatusEnv();
const SUPABASE_URL = process.env.SUPABASE_URL ?? localEnv.API_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? localEnv.SECRET_KEY ?? localEnv.SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY missing. Run `supabase start` or set it in the shell.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BARBER_EMAIL = 'testberber@berber.test';
const BARBER_PASSWORD = 'Test1234!';

async function run() {
  // 1. Auth user oluştur
  console.log('Auth user oluşturuluyor...');
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: BARBER_EMAIL,
    password: BARBER_PASSWORD,
    email_confirm: true,
  });
  if (authErr && !authErr.message.toLowerCase().includes('already')) {
    throw new Error('Auth user hatası: ' + authErr.message);
  }
  const userId = authData?.user?.id;
  console.log('Auth user ID:', userId ?? '(zaten mevcut, tekrar sorgulanıyor)');

  // Zaten varsa kullanıcıyı bul
  let finalUserId = userId;
  if (!finalUserId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const found = list?.users?.find(u => u.email === BARBER_EMAIL);
    finalUserId = found?.id;
  }
  if (!finalUserId) throw new Error('Kullanıcı ID alınamadı');
  console.log('Kullanıcı ID:', finalUserId);

  // 2. Shop oluştur (yoksa)
  let shopId;
  const { data: existingShop } = await supabase
    .from('shops')
    .select('id')
    .eq('slug', 'test-dukkan')
    .single();

  if (existingShop) {
    shopId = existingShop.id;
    console.log('Mevcut shop kullanılıyor:', shopId);
  } else {
    // Owner için ayrı bir auth user oluştur
    const { data: ownerAuth } = await supabase.auth.admin.createUser({
      email: 'testowner@berber.test',
      password: 'Test1234!',
      email_confirm: true,
    });
    let ownerId = ownerAuth?.user?.id;
    if (!ownerId) {
      const { data: list } = await supabase.auth.admin.listUsers();
      ownerId = list?.users?.find(u => u.email === 'testowner@berber.test')?.id;
    }

    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .insert({
        name: 'Test Berber Dükkanı',
        display_name: 'Test Berber Dükkanı',
        slug: 'test-dukkan',
        timezone: 'Europe/Istanbul',
        owner_user_id: ownerId,
      })
      .select('id')
      .single();
    if (shopErr) throw new Error('Shop hatası: ' + shopErr.message);
    shopId = shop.id;
    console.log('Shop oluşturuldu:', shopId);

    // Owner için services ekle
    await supabase.from('services').insert([
      { shop_id: shopId, name: 'Saç Kesimi', duration_min: 30, price_cents: 15000, is_active: true },
      { shop_id: shopId, name: 'Sakal Tıraşı', duration_min: 20, price_cents: 10000, is_active: true },
      { shop_id: shopId, name: 'Saç + Sakal', duration_min: 45, price_cents: 20000, is_active: true },
    ]);
    console.log('Services eklendi');
  }

  // 3. Staff kaydı oluştur (role='staff', NOT admin/owner)
  let staffId;
  const { data: existingStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', finalUserId)
    .single();

  if (existingStaff) {
    staffId = existingStaff.id;
    console.log('Mevcut staff kullanılıyor:', staffId);
  } else {
    const { data: staff, error: staffErr } = await supabase
      .from('staff')
      .insert({
        shop_id: shopId,
        name: 'Test Berber',
        user_id: finalUserId,
        role: 'staff',
        is_active: true,
      })
      .select('id')
      .single();
    if (staffErr) throw new Error('Staff hatası: ' + staffErr.message);
    staffId = staff.id;
    console.log('Staff oluşturuldu:', staffId);
  }

  // 4. Haftalık çalışma saatleri (Pzt-Cmt 09:00-18:00)
  const { data: existingSchedules } = await supabase
    .from('staff_schedules')
    .select('id')
    .eq('staff_id', staffId);

  if (!existingSchedules || existingSchedules.length === 0) {
    const schedules = [1, 2, 3, 4, 5, 6].map(day => ({
      staff_id: staffId,
      day_of_week: day,
      work_start: '09:00',
      work_end: '18:00',
      is_working: true,
    }));
    const { error: schErr } = await supabase.from('staff_schedules').insert(schedules);
    if (schErr) throw new Error('Schedule hatası: ' + schErr.message);
    console.log('Çalışma saatleri eklendi (Pzt-Cmt 09:00-18:00)');
  } else {
    console.log('Çalışma saatleri zaten mevcut');
  }

  // 5. Test randevuları ekle (bugün + yarın)
  const { data: services } = await supabase
    .from('services')
    .select('id, duration_min')
    .eq('shop_id', shopId)
    .limit(3);

  if (services && services.length > 0) {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const svc = services[0];
    const appts = [
      {
        staff_id: staffId,
        service_id: svc.id,
        customer_name: 'Ali Veli',
        customer_phone: '05551234567',
        starts_at: new Date(today.getTime()).toISOString(),
        ends_at: new Date(today.getTime() + svc.duration_min * 60000).toISOString(),
        status: 'confirmed',
        booked_price_cents: 15000,
      },
      {
        staff_id: staffId,
        service_id: services[1]?.id ?? svc.id,
        customer_name: 'Mehmet Demir',
        customer_phone: '05559876543',
        starts_at: new Date(today.getTime() + 2 * 3600000).toISOString(),
        ends_at: new Date(today.getTime() + 2 * 3600000 + svc.duration_min * 60000).toISOString(),
        status: 'confirmed',
        booked_price_cents: 10000,
      },
      {
        staff_id: staffId,
        service_id: svc.id,
        customer_name: 'Kemal Şahin',
        customer_phone: '05557654321',
        starts_at: new Date(tomorrow.getTime() + 3600000).toISOString(),
        ends_at: new Date(tomorrow.getTime() + 3600000 + svc.duration_min * 60000).toISOString(),
        status: 'confirmed',
        booked_price_cents: 15000,
      },
    ];

    const { error: apptErr } = await supabase.from('appointments').insert(appts);
    if (apptErr) console.warn('Randevu ekleme uyarısı:', apptErr.message);
    else console.log('3 test randevusu eklendi');
  }

  console.log('\n=== TEST BERBER GİRİŞ BİLGİLERİ ===');
  console.log('Email   :', BARBER_EMAIL);
  console.log('Şifre   :', BARBER_PASSWORD);
  console.log('Rol     : staff (dükkan sahibi DEĞİL)');
  console.log('Shop    :', shopId);
  console.log('Staff ID:', staffId);
  console.log('=====================================\n');
}

run().catch(err => {
  console.error('HATA:', err.message);
  process.exit(1);
});
