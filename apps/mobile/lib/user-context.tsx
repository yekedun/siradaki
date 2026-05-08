import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";

export type UserRole = "owner" | "staff" | null;

interface UserContextValue {
  role: UserRole;
  shopId: string | null;
  staffId: string | null;
  loading: boolean;
  reload: () => void;
}

const UserContext = createContext<UserContextValue>({
  role: null,
  shopId: null,
  staffId: null,
  loading: true,
  reload: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [role, setRole]       = useState<UserRole>(null);
  const [shopId, setShopId]   = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      // Önce dükkan sahibi mi?
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (shop && !cancelled) {
        setRole("owner");
        setShopId(shop.id);
        setStaffId(null);
        setLoading(false);
        return;
      }

      // Usta mı?
      const { data: staff } = await supabase
        .from("staff")
        .select("id, shop_id")
        .eq("user_id", user.id)
        .single();

      if (!cancelled) {
        if (staff) {
          setRole("staff");
          setStaffId(staff.id);
          setShopId(staff.shop_id);
        } else {
          setRole(null);
          setShopId(null);
          setStaffId(null);
        }
        setLoading(false);
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [tick]);

  // Oturum değişince yeniden çöz
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      reload();
    });
    return () => subscription.unsubscribe();
  }, [reload]);

  return (
    <UserContext.Provider value={{ role, shopId, staffId, loading, reload }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUserRole = () => useContext(UserContext);
