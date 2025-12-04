// api/scrapers/superseis.js
import * as cheerio from "cheerio";

export default async function scrapeSuperseis() {
  try {
    const url = "https://www.superseis.com.py/buscar?search=leche";

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const items = [];

    $(".product-item").each((_, el) => {
      const name = $(el).find(".product-name").text().trim();
      const img = $(el).find("img").attr("src");
      const priceText = $(el).find(".price").text().trim();

      const price = Number(priceText.replace(/[^\d]/g, ""));

      if (name && price) {
        items.push({
          supermarket: "superseis",
          name,
          price,
          image: img,
        });
      }
    });

    return items;
  } catch (err) {
    return [];
  }
}
