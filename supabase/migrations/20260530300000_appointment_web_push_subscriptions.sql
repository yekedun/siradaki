-- Müşteri randevu hatırlatması için web push subscription tablosu.
-- Anonim widget bookinglerinde appointment_id ile eşlenir.
-- notified_24h / notified_1h bayrakları çift gönderimi önler.

CREATE TABLE appointment_web_push_subscriptions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  endpoint       TEXT        NOT NULL,
  p256dh         TEXT        NOT NULL,
  auth           TEXT        NOT NULL,
  notified_24h   BOOLEAN     NOT NULL DEFAULT FALSE,
  notified_1h    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, endpoint)
);

CREATE INDEX ON appointment_web_push_subscriptions (appointment_id);
CREATE INDEX ON appointment_web_push_subscriptions (notified_24h, notified_1h);

ALTER TABLE appointment_web_push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Sadece service role (edge function) erişebilir — kullanıcı RLS policy'si yok.
