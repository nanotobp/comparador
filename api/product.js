// /api/product.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON
);

export default async function handler(req, res) {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ ok: false, error: "missing id" });

    // 1) Datos del producto
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select(`
        id,
        name,
        image_url,
        barcode,
        categories(name)
      `)
      .eq("id", id)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!product) return res.status(404).json({ ok: false, error: "not found" });

    // 2) Precios por supermercado (ordenados por precio)
    const { data: rawPrices, error: prErr } = await supabase
      .from("product_prices")
      .select(`
        current_price,
        scraped_at,
        supermarkets (
          id,
          nombre,
          slug,
          logo
        )
      `)
      .eq("product_id", id)
      .order("current_price", { ascending: true });

    if (prErr) throw prErr;

    const formattedPrices = rawPrices.map((r) => ({
      supermercado: r.supermarkets?.nombre,
      slug: r.supermarkets?.slug,
      logo: r.supermarkets?.logo,
      precio: r.current_price,
      fecha: r.scraped_at
    }));

    const best = formattedPrices.length ? formattedPrices[0].precio : null;
    const max = formattedPrices.length
      ? formattedPrices[formattedPrices.length - 1].precio
      : null;

    const ahorro = best && max ? max - best : 0;

    // 3) Tendencia histórica
    const { data: hist, error: hErr } = await supabase
      .from("product_prices")
      .select("current_price, scraped_at")
      .eq("product_id", id)
      .order("scraped_at", { ascending: true })
      .limit(40);

    if (hErr) throw hErr;

    const labels = hist.map((h) => h.scraped_at);
    const values = hist.map((h) => h.current_price);

    const minHist = values.length ? Math.min(...values) : null;
    const avgHist = values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : null;

    return res.status(200).json({
      ok: true,
      product: {
        id: product.id,
        nombre: product.name,
        categoria: product.categories?.name || null,
        imagen: product.image_url,
        barcode: product.barcode
      },
      precios: formattedPrices,
      mejores: { best, max, ahorro },
      tendencia: { labels, values, minHist, avgHist }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}
