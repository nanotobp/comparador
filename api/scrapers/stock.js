// api/scrapers/stock.js
import * as cheerio from "cheerio";

export default async function scrapeStock(query = "leche") {
  const url = `https://www.stock.com.py/buscar?search=${encodeURIComponent(
    query
  )}`;

  try {
    const html = await fetch(url).then((r) => r.text());
    const $ = cheerio.load(html);

    const items = [];

    $(".product-item").each((_, el) => {
      const name = $(el).find(".product-name").text().trim();
      const img = $(el).find("img").attr("src") || "";
      const priceText = $(el).find(".price").text().trim();
      const price = Number(priceText.replace(/[^\d]/g, ""));

      if (name && price) {
        items.push({
          supermarket: "stock",
          name,
          price,
          image: img
        });
      }
    });

    return items;
  } catch {
    return [];
  }
}
