import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function saveProducts(normalized) {
  const { data, error } = await supabase
    .from("prices")
    .insert(normalized);

  if (error) console.error(error);
  return data;
}
