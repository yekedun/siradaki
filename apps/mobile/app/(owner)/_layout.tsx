import { Tabs } from 'expo-router';
import { BarChart3, CalendarDays, Clock, Users, Wallet } from 'lucide-react-native';
import { Dimensions } from 'react-native';
import { ShopProvider } from '../../lib/ShopContext';
import {
  HIDDEN_OWNER_ROUTES,
  OWNER_TAB_ORDER,
  type OwnerTabDefinition,
} from '../../lib/owner-tabs';

const OWNER_SCALE = Dimensions.get('window').width / 354;
const dp = (value: number) => Math.round(value * OWNER_SCALE * 100) / 100;
const ICON_SIZE = 22;

function OwnerTabIcon({
  tab,
  color,
  focused,
}: {
  tab: OwnerTabDefinition;
  color: string;
  focused: boolean;
}) {
  const icon =
    tab.icon === 'bar-chart-3' ? (
      <BarChart3 size={ICON_SIZE} color={color} />
    ) : tab.icon === 'calendar-days' ? (
      <CalendarDays size={ICON_SIZE} color={color} />
    ) : tab.icon === 'wallet' ? (
      <Wallet size={ICON_SIZE} color={color} />
    ) : tab.icon === 'clock' ? (
      <Clock size={ICON_SIZE} color={color} />
    ) : (
      <Users size={ICON_SIZE} color={color} />
    );

  return (
    icon
  );
}

export default function OwnerLayout() {
  return (
    <ShopProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(251,248,241,0.92)',
            borderTopColor: '#E5DECF',
            borderTopWidth: dp(1),
            height: dp(88),
            paddingTop: dp(6),
            paddingBottom: dp(24),
          },
          tabBarActiveTintColor: '#184A3A',
          tabBarInactiveTintColor: '#938A7C',
          tabBarIconStyle: {
            marginTop: dp(-12),
          },
          tabBarLabelStyle: {
            fontFamily: 'HankenGrotesk-SemiBold',
            fontSize: 10,
            letterSpacing: 0,
            marginTop: dp(-8),
          },
        }}
      >
        {OWNER_TAB_ORDER.map((tab) => (
          <Tabs.Screen
            key={tab.route}
            name={tab.route}
            options={{
              title: tab.label,
              tabBarIcon: ({ color, focused }) => (
                <OwnerTabIcon tab={tab} color={color} focused={focused} />
              ),
            }}
          />
        ))}
        {HIDDEN_OWNER_ROUTES.map((route) => (
          <Tabs.Screen key={route} name={route} options={{ href: null }} />
        ))}
      </Tabs>
    </ShopProvider>
  );
}
