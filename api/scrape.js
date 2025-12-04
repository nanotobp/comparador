// /api/scrape.js — VERSIÓN PRO PARA TU BASE REAL
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

// ==============================
// CONFIG SUPABASE
// ==============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// ==============================
// HELPERS
// ==============================

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function normalizePrice(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\./g, "").replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : null;
}

function absUrl(base, src) {
  if (!src) return null;
  if (src.startsWith("http")) return src;
  if (src.startsWith("//")) return "https:" + src;
  if (src.startsWith("/")) return base + src;
  return base + "/" + src;
}

// ==============================
// DB FUNCTIONS
// ==============================

async function getOrCreateSupermarket(slug, nombre, logo = null) {
  const { data } = await supabase
    .from("supermarkets")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (data) return data.id;

  const { data: created } = await supabase
    .from("supermarkets")
    .insert({ slug, nombre, logo })
    .select()
    .single();

  return created.id;
}

async function getOrCreateCategory(catName) {
  if (!catName) return null;

  const slug = normalizeName(catName).replace(/ /g, "-");

  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (data) return data.id;

  const { data: created } = await supabase
    .from("categories")
    .insert({ slug, name: catName })
    .select()
    .single();

  return created.id;
}

async function getOrCreateProduct({ name, image, barcode, category }) {
  const normalized = normalizeName(name);

  // Si tiene código de barras → match directo
  if (barcode) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();

    if (data) return data;
  }

  // Sino buscar por nombre normalizado
  const { data: byName } = await supabase
    .from("products")
    .select("*")
    .ilike("nombre_normalizado", `%${normalized.slice(0, 12)}%`)
    .limit(1);

  if (byName && byName.length) return byName[0];

  // Crear categoría si existe
  const category_id = await getOrCreateCategory(category);

  // Crear producto
  const { data: created } = await supabase
    .from("products")
    .insert({
      name,
      nombre_normalizado: normalized,
      image_url: image,
      barcode: barcode || null,
      category_id
    })
    .select()
    .single();

  return created;
}

async function savePrice(productId, supermarketId, price) {
  if (!price) return;

  await supabase.from("product_prices").insert({
    product_id: productId,
    supermarket_id: supermarketId,
    current_price: price,
    scraped_at: new Date()
  });
}

// ==============================
// SCRAPERS (DEMO BASE — SE PUEDEN MEJORAR)
// ==============================

// Superseis (simple selector)
async function scrapeSuperseis() {
  const url = "https://www.superseis.com.py/";
  const html = await fetch(url).then(r => r.text());
  const $ = cheerio.load(html);

  const items = [];

  $(".product-item").each((_, el) => {
    const name = $(el).find(".product-name").text().trim();
    const price = normalizePrice($(el).find(".price").text());
    const img = absUrl("https://www.superseis.com.py", $(el).find("img").attr("src"));
    const category = "Superseis";

    if (name && price) {
      items.push({ name, price, image: img, category });
    }
  });

  return items;
}

// Stock
async function scrapeStock() {
  const url = "https://www.stock.com.py/";
  const html = await fetch(url).then(r => r.text());
  const $ = cheerio.load(html);

  const items = [];

  $(".product-item, .product-block").each((_, el) => {
    const name = $(el).find(".product-name").text().trim();
    const price = normalizePrice($(el).find(".price").text());
    const img = absUrl("https://www.stock.com.py", $(el).find("img").attr("src"));
    const category = "Stock";

    if (name && price) {
      items.push({ name, price, image: img, category });
    }
  });

  return items;
}

// Biggie
async function scrapeBiggie() {
  const url = "https://biggie.com.py/?s=leche";
  const html = await fetch(url).then(r => r.text());
  const $ = cheerio.load(html);

  const items = [];

  $(".products .product").each((_, el) => {
    const name = $(el).find(".woo-loop-product__title").text().trim();
    const price = normalizePrice($(el).find("bdi").first().text());
    const img = absUrl("https://biggie.com.py", $(el).find("img").attr("src"));
    const category = "Biggie";

    if (name && price) {
      items.push({ name, price, image: img, category });
    }
  });

  return items;
}

// ==============================
// MAIN HANDLER
// ==============================
export default async function handler(req, res) {
  try {
    const markets = [
      { slug: "superseis", nombre: "Superseis", scraper: scrapeSuperseis },
      { slug: "stock", nombre: "Stock", scraper: scrapeStock },
      { slug: "biggie", nombre: "Biggie", scraper: scrapeBiggie }
    ];

    let total = 0;
    const summary = [];

    for (const m of markets) {
      const superId = await getOrCreateSupermarket(m.slug, m.nombre);
      const products = await m.scraper();

      let count = 0;

      for (const p of products) {
        try {
          const prod = await getOrCreateProduct(p);
          await savePrice(prod.id, superId, p.price);
          total++;
          count++;
        } catch (err) {
          console.error("Error guardando producto:", p.name, err);
        }
      }

      summary.push({
        supermercado: m.nombre,
        items: count
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Scraping completado",
      total,
      summary
    });
  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}
