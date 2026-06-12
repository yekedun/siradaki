import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { colors } from '../../../lib/theme';

jest.mock('../../../lib/ShopContext', () => ({
  useShop: () => ({
    shopName: 'Kuaför Neco',
    shopSlug: 'kuafor-neco',
    staffList: [{ id: 'staff-1', name: 'Mehmet Yılmaz' }],
  }),
}));

import { OwnerTabAvatar } from '../OwnerTabAvatar';

test('renders the shop initials with legible inactive colors', () => {
  const { getByText } = render(<OwnerTabAvatar focused={false} />);
  const avatar = getByText('KN').parent?.parent;

  expect(StyleSheet.flatten(avatar?.props.style)).toMatchObject({
    backgroundColor: colors.slate[500],
    borderColor: colors.slate[300],
  });
});
