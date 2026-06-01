import { Tabs } from 'expo-router';
import { BarChart3, CalendarDays, Settings, Users, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { ShopProvider } from '../../lib/ShopContext';
import {
  HIDDEN_OWNER_ROUTES,
  OWNER_TAB_ORDER,
  type OwnerTabDefinition,
} from '../../lib/owner-tabs';

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
    ) : tab.icon === 'users' ? (
      <Users size={ICON_SIZE} color={color} />
    ) : (
      <Settings size={ICON_SIZE} color={color} />
    );

  return (
    <View style={{ alignItems: 'center', height: 32, justifyContent: 'flex-start', width: 30 }}>
      {icon}
      {focused ? (
        <View
          style={{
            backgroundColor: '#2D6AE0',
            borderRadius: 2,
            height: 4,
            marginTop: 5,
            width: 4,
          }}
        />
      ) : null}
    </View>
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
            borderTopWidth: 1,
            height: 88,
            paddingTop: 10,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#184A3A',
          tabBarInactiveTintColor: '#938A7C',
          tabBarLabelStyle: {
            fontFamily: 'HankenGrotesk-SemiBold',
            fontSize: 10,
            letterSpacing: 0,
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
