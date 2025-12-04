// api/scrapers/casarica.js
import * as cheerio from "cheerio";

export default async function scrapeCasaRica() {
  const url = "https://www.casarica.com.py/catalogsearch/result/?q=leche";

  try {
    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const items = [];

    $(".product-item").each((_, el) => {
      const name = $(el).find(".product-item-link").text().trim();
      const priceText = $(el).find(".price").text().trim();
      const img = $(el).find("img").attr("src") || "";

      const price = Number(priceText.replace(/[^\d]/g, ""));

      if (name && price) {
        items.push({
          supermarket: "casarica",
          name,
          price,
          image: img,
        });
      }
    });

    return items;
  } catch {
    return [];
  }
}
