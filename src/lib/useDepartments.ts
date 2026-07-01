import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("is_locked", { ascending: false }).order("name");
      return (data ?? []) as { name: string; is_locked: boolean }[];
    },
  });
}
