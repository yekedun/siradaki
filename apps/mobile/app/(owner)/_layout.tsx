import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { T } from "../../lib/theme";
import { useUserRole } from "../../lib/user-context";

export default function OwnerLayout() {
  const { shopId } = useUserRole();
  const [commissionEnabled, setCommissionEnabled] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    supabase
      .from("shops")
      .select("commission_enabled")
      .eq("id", shopId)
      .single()
      .then(({ data }) => setCommissionEnabled(Boolean(data?.commission_enabled)));
  }, [shopId]);

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
        name="earnings"
        options={{
          title: "Kazanç",
          href: commissionEnabled ? undefined : null,
          tabBarIcon: ({ color }) => <Feather name="credit-card" size={22} color={color} />,
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
