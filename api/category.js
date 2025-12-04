// /api/category.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON
);

export default async function handler(req, res) {
  try {
    const cat = req.query.cat ?? "";
    const q = req.query.q ?? "";

    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        image_url,
        barcode,
        nombre_normalizado,
        categories(name),
        product_prices(current_price)
      `)
      .eq("categories.name", cat);

    if (q) {
      query = query.ilike("nombre_normalizado", `%${q.toLowerCase()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = data.map((p) => {
      const best =
        p.product_prices?.length > 0
          ? Math.min(...p.product_prices.map((x) => x.current_price))
          : null;

      return {
        id: p.id,
        nombre: p.name,
        categoria: p.categories?.name || null,
        imagen: p.image_url,
        mejorPrecio: best
      };
    });

    return res.status(200).json({ ok: true, items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}
