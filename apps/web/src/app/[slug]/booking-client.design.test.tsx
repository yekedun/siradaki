import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import BookingClient from './BookingClient';

const SHOP = {
  id: 'shop-1',
  name: 'Kuafor Neco',
  address: 'Istanbul',
  slug: 'kuafor-neco',
  timezone: 'Europe/Istanbul',
};

describe('BookingClient design system surface', () => {
  it('renders the booking screen with the Sıradaki system fonts and surface', () => {
    const html = renderToStaticMarkup(
      <BookingClient
        shop={SHOP}
        services={[{ id: 'svc-1', name: 'Sac sakal', duration_min: 45, price: 900 }]}
        staff={[
          { id: 'staff-1', name: 'Neco Aslan', phone: null },
          { id: 'staff-2', name: 'Can Aslan', phone: null },
        ]}
      />,
    );

    expect(html).toContain('bg-[#F9F9F6]');
    expect(html).toContain('font-sans');
    expect(html).toContain('font-display');
    expect(html).toContain('border-[#0B1220]');
    expect(html).toContain('text-[#FF4D1C]');
  });
});
