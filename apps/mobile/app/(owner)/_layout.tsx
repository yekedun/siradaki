import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { T } from "../../lib/theme";

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.navy,
        tabBarInactiveTintColor: T.muted,
        tabBarStyle: {
          backgroundColor: T.bg,
          borderTopColor: T.line,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 28,
          height: 76,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Özet",
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Ajanda",
          tabBarIcon: ({ color }) => <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Ekip",
          tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ayarlar",
          tabBarIcon: ({ color }) => <Feather name="settings" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
