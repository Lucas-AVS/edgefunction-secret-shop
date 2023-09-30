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
  );

  let rowId, newSlot, newQuantity;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { itemsToUpdate, itemsToDelete } = await req.json();

    for (const itemToUpdate of itemsToUpdate) {
      rowId = itemToUpdate.id;
      newSlot = itemToUpdate.item_slot;
      newQuantity = itemToUpdate.item_quantity;

      const { data, error } = await supabaseClient
        .from("backpack")
        .update({ item_slot: newSlot, item_quantity: newQuantity })
        .eq("id", rowId)
        .select();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    for (const itemIdToDelete of itemsToDelete) {
        const { error } = await supabaseClient
          .from("backpack")
          .delete()
          .eq("id", itemIdToDelete)
    
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
      }

    return new Response(JSON.stringify({ success: true }), {
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
