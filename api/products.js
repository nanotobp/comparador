// /api/products.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON
);

export default async function handler(req, res) {
  try {
    const q = req.query.q ?? "";
    const limit = parseInt(req.query.limit ?? "50", 10);

    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        nombre_normalizado,
        image_url,
        barcode,
        categories (
          name
        ),
        product_prices (
          current_price
        )
      `)
      .limit(limit);

    // Buscador ILIKE usando nombre_normalizado
    if (q) {
      query = query.ilike("nombre_normalizado", `%${q.toLowerCase()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transformar datos al formato que espera el frontend
    const enhanced = data.map((p) => {
      const best =
        p.product_prices?.length > 0
          ? Math.min(...p.product_prices.map((x) => x.current_price))
          : null;

      return {
        id: p.id,
        nombre: p.name,
        categoria: p.categories?.name || null,
        imagen: p.image_url,
        barcode: p.barcode,
        mejorPrecio: best
      };
    });

    return res.status(200).json({ ok: true, items: enhanced });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}
