import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../../_shared/cors.ts";

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
    // Create client with Auth context of the user that called the function.
    // This way your row-level-security (RLS) policies are applied.
  );
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const { data: backpack } = await supabaseClient.from("backpack").select("*");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let usedSlot = 0;

  function findFirstNotUsedSlot(backpack) {
    const allSlots = Array.from(
      { length: 11 },
      (_, index) => index + usedSlot
    );
    const firstNotUsedSlot = allSlots.find((item_slot) => {
      const usedSlots = backpack.some(
        (backpackItem) => backpackItem.item_slot === item_slot
      );
      return !usedSlots;
    });
    if (firstNotUsedSlot !== undefined) {
      usedSlot = firstNotUsedSlot + 1;
    }
    return firstNotUsedSlot;
  }

  try {
    const items = await req.json();
    const insertPromises = items.map(async (item) => {

      const result = findFirstNotUsedSlot(backpack);

      const newItem = {
        user_id: user.id,
        item_slot: result,
        item_id: item.item_id,
        item_quantity: item.item_quantity,
      };

      const { data, error } = await supabaseClient
        .from("backpack")
        .insert([newItem])
        .select();
      return { data, error };
    });

    const results = await Promise.all(insertPromises);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
