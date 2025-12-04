import scrapeSuperseis from "./scrapers/superseis";
import scrapeStock from "./scrapers/stock";
import scrapeReal from "./scrapers/real";
import scrapeCasaRica from "./scrapers/casarica";
import scrapeBiggie from "./scrapers/biggie";
import { normalizeItems } from "./normalize";
import { saveProducts } from "./push-to-supabase";

export default async function handler(req, res) {
  try {
    const results = await Promise.all([
      scrapeSuperseis(),
      scrapeStock(),
      scrapeReal(),
      scrapeCasaRica(),
      scrapeBiggie()
    ]);

    const flat = results.flat();
    const normalized = normalizeItems(flat);

    await saveProducts(normalized);

    res.status(200).json({
      ok: true,
      count: normalized.length,
      message: "Scrape realizado"
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.toString() });
  }
}
