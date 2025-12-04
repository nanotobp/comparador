import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("promos")
      .select(`
        id,
        descripcion,
        destacado,
        productos (
          id,
          nombre_original,
          imagen
        )
      `)
      .eq("destacado", true);

    if (error) throw error;

    res.status(200).json({ ok: true, items: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.toString() });
  }
}
