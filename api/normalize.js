export function normalizeItems(items) {
  return items.map((p) => ({
    supermarket: p.supermarket,
    name: p.name.trim(),
    price: Number(p.price),
    image: p.image || "",
    link: p.link || "",
  }));
}
