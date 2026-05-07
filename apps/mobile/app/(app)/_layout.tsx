import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        headerStyle: { backgroundColor: "#fff" },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Randevular",
          tabBarLabel: "Randevular",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="block"
        options={{
          title: "Blok Ekle",
          tabBarLabel: "Blok",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⛔</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ayarlar",
          tabBarLabel: "Ayarlar",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
