'use client';

import { useEffect } from 'react';
import { Clock, Lock, MapPin, Smartphone, Store } from 'lucide-react';
import {
  getInviteOpenUrl,
  ATTEMPT_KEY_PREFIX,
  shouldAutoOpen,
} from './invite-linking';

interface Props {
  token: string;
}

const INVITE_CSS = `
  .invite-v2 {
    --paper: #FBF8F1;
    --paper-2: #F2ECDF;
    --card: #FFFFFF;
    --ink: #1B1813;
    --ink-2: #5A534A;
    --ink-3: #938A7C;
    --line: #E5DECF;
    --line-2: #D8CFBC;
    --spruce: #184A3A;
    --ember: #2D6AE0;
    --serif: 'Newsreader', Georgia, 'Times New Roman', serif;
    --grot: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
    --mono: 'JetBrains Mono', ui-monospace, monospace;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--grot);
    min-height: 100vh;
  }
  .invite-chrome {
    align-items: center;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
    display: flex;
    gap: 8px;
    height: 46px;
    justify-content: center;
    padding: 0 46px;
  }
  .invite-address {
    align-items: center;
    background: rgba(27,24,19,.08);
    border-radius: 8px;
    color: rgba(27,24,19,.38);
    display: flex;
    font-family: var(--mono);
    font-size: 9px;
    gap: 4px;
    height: 28px;
    justify-content: center;
    max-width: 298px;
    overflow: hidden;
    padding: 0 9px;
    white-space: nowrap;
    width: 100%;
  }
  .invite-page {
    align-items: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: calc(100vh - 46px);
    padding: 24px 28px 44px;
    text-align: center;
  }
  .invite-mark {
    align-items: center;
    background: var(--spruce);
    border-radius: 20px;
    box-shadow: 0 12px 24px -12px rgba(24,74,58,.65);
    display: flex;
    height: 68px;
    justify-content: center;
    margin-bottom: 16px;
    position: relative;
    width: 68px;
  }
  .invite-mark::before {
    border-bottom: 14px solid transparent;
    border-left: 18px solid #fff;
    border-top: 14px solid transparent;
    content: '';
    margin-left: 5px;
  }
  .invite-dot {
    background: var(--ember);
    border-radius: 999px;
    bottom: 10px;
    height: 7px;
    position: absolute;
    right: 10px;
    width: 7px;
  }
  .invite-overline {
    color: var(--ember);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .2em;
    margin: 0 0 8px;
    text-transform: uppercase;
  }
  .invite-title {
    font-family: var(--serif);
    font-size: 26px;
    font-weight: 500;
    letter-spacing: -.01em;
    line-height: 1.08;
    margin: 0 0 8px;
  }
  .invite-desc {
    color: var(--ink-2);
    font-family: var(--serif);
    font-size: 14px;
    line-height: 1.58;
    margin: 0 auto 24px;
    max-width: 290px;
  }
  .invite-card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 1px 0 rgba(27,24,19,.04), 0 6px 18px -10px rgba(27,24,19,.28);
    max-width: 300px;
    padding: 14px 16px;
    text-align: left;
    width: 100%;
  }
  .invite-row {
    align-items: center;
    border-top: 1px solid var(--line);
    color: var(--ink-2);
    display: flex;
    font-size: 12.5px;
    gap: 9px;
    padding: 8px 0;
  }
  .invite-row:first-child { border-top: 0; padding-top: 0; }
  .invite-row:last-child { padding-bottom: 0; }
  .invite-row svg { color: var(--ink-3); height: 13px; width: 13px; }
  .invite-row b { color: var(--ink); }
  .invite-open {
    align-items: center;
    background: var(--spruce);
    border: 0;
    border-radius: 15px;
    box-shadow: 0 10px 24px -12px rgba(24,74,58,.7);
    color: #fff;
    cursor: pointer;
    display: flex;
    font-family: var(--grot);
    font-size: 15px;
    font-weight: 800;
    gap: 9px;
    height: 52px;
    justify-content: center;
    margin-top: 18px;
    max-width: 300px;
    width: 100%;
  }
  .invite-note {
    color: var(--ink-3);
    font-family: var(--serif);
    font-size: 11.5px;
    line-height: 1.5;
    margin: 12px auto 0;
    max-width: 280px;
  }
  @media (min-width: 700px) {
    .invite-v2 { display: grid; place-items: start center; }
    .invite-chrome, .invite-page { width: 390px; }
  }
`;

function tokenLabel(token: string) {
  return token.length > 4 ? `${token.slice(0, 4)}…` : token;
}

function shouldAutoOpenOnThisDevice(token: string) {
  if (!/android|iphone|ipad|ipod/i.test(navigator.userAgent)) return false;
  return shouldAutoOpen(sessionStorage, token);
}

export default function OpenInviteClient({ token }: Props) {
  useEffect(() => {
    if (!shouldAutoOpenOnThisDevice(token)) {
      return;
    }

    const key = `${ATTEMPT_KEY_PREFIX}${token}`;
    const timer = setTimeout(() => {
      sessionStorage.setItem(key, '1');
      const fallbackUrl = window.location.href;
      const openUrl = getInviteOpenUrl(token, navigator.userAgent, fallbackUrl);
      window.location.assign(openUrl);
    }, 250);

    return () => clearTimeout(timer);
  }, [token]);

  function handleOpenApp() {
    const fallbackUrl = window.location.href;
    const openUrl = getInviteOpenUrl(token, navigator.userAgent, fallbackUrl);
    window.location.assign(openUrl);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: INVITE_CSS }} />
      <main className="invite-v2">
        <div className="invite-chrome" aria-hidden="true">
          <div className="invite-address">
            <Lock size={9} />
            siradaki.app/invite/{tokenLabel(token)}
          </div>
        </div>

        <section className="invite-page">
          <div className="invite-mark" aria-hidden="true">
            <span className="invite-dot" />
          </div>
          <p className="invite-overline">Davet · Sıradaki</p>
          <h1 className="invite-title">Sıradaki Ekibine Katıl</h1>
          <p className="invite-desc">
            Size gönderilen daveti kabul etmek ve randevu takvimini yönetmeye başlamak için uygulamayı açın.
          </p>

          <div className="invite-card">
            <div className="invite-row"><Store aria-hidden="true" /><span><b>Dükkan daveti</b></span></div>
            <div className="invite-row"><MapPin aria-hidden="true" /><span>Sıradaki panel erişimi</span></div>
            <div className="invite-row"><Clock aria-hidden="true" /><span>Davetler <b>48 saat</b> geçerlidir</span></div>
          </div>

          <button type="button" onClick={handleOpenApp} className="invite-open">
            <Smartphone size={17} aria-hidden="true" />
            Uygulamayı Aç
          </button>
          <p className="invite-note">Sıradaki uygulaması yüklü değilse önce App Store veya Google Play&apos;den indirin.</p>
        </section>
      </main>
    </>
  );
}
