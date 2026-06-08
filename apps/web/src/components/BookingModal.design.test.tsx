import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { BookingModal } from './BookingModal';

describe('BookingModal design system surface', () => {
  it('renders the confirmation modal with Sıradaki system typography and accent', () => {
    const html = renderToStaticMarkup(
      <BookingModal
        open
        onClose={vi.fn()}
        summary="Sac sakal - 45 dk"
        shopId="shop-1"
        shopSlug="kuafor-neco"
        staffId={null}
        serviceId="svc-1"
        startsAt="2026-06-08T09:00:00.000Z"
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('bg-[#F9F9F6]');
    expect(html).toContain('font-display');
    expect(html).toContain('text-[#FF4D1C]');
    expect(html).toContain('rounded-none');
  });
});
