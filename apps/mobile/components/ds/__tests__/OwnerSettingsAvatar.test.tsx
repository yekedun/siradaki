import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../../lib/ShopContext', () => ({
  useShop: () => ({
    shopName: 'Kuaför Neco',
    shopSlug: 'kuafor-neco',
    staffList: [{ id: 'staff-1', name: 'Mehmet Yılmaz' }],
  }),
}));

import { OwnerSettingsAvatar } from '../OwnerSettingsAvatar';

test('uses shop name initials instead of first staff initials', () => {
  const { getByText, queryByText } = render(<OwnerSettingsAvatar />);

  expect(getByText('KN')).toBeTruthy();
  expect(queryByText('MY')).toBeNull();
});
