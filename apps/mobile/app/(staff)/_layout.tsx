import { Tabs } from "expo-router";
import { Calendar, Slash, Settings } from "lucide-react-native";
import { T } from "../../lib/theme";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.brand600,
        tabBarInactiveTintColor: T.fg3,
        tabBarStyle: {
          backgroundColor: T.bg,
          borderTopColor: T.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 28,
          height: 76,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Montserrat-Medium', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Randevular",
          tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="block"
        options={{
          title: "Blok",
          tabBarIcon: ({ color }) => <Slash size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ayarlar",
          tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
