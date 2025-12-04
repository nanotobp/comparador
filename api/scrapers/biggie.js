// api/scrapers/biggie.js
import * as cheerio from "cheerio";

export default async function scrapeBiggie() {
  try {
    const url = "https://biggie.com.py/?s=leche"; // ejemplo

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const items = [];

    $(".products .product").each((_, el) => {
      const name = $(el).find(".woo-loop-product__title").text().trim();
      const priceText = $(el).find(".price bdi").first().text().trim();
      const image = $(el).find("img").attr("src") || "";
      const link = $(el).find("a").attr("href") || "";

      const price = Number(priceText.replace(/[^\d]/g, ""));

      if (name && price) {
        items.push({
          supermarket: "biggie",
          name,
          price,
          image,
          link,
        });
      }
    });

    return items;

  } catch (e) {
    return [];
  }
}
