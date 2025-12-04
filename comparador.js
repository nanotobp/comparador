// ==============================
// Helpers
// ==============================
const $ = (id) => document.getElementById(id);
const formatPYG = (v) =>
  "Gs. " + (typeof v === "number" ? v.toLocaleString("es-PY") : v);

// ==============================
// Tema claro / oscuro
// ==============================
const themeToggle = $("theme-toggle");

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

const storedTheme = localStorage.getItem("cp_theme");
if (storedTheme) {
  applyTheme(storedTheme);
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  applyTheme("dark");
} else {
  applyTheme("light");
}

themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.classList.contains("dark");
  const newTheme = isDark ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("cp_theme", newTheme);
});

// ==============================
// Vistas
// ==============================
const views = {
  home: $("view-home"),
  product: $("view-product"),
  stats: $("view-stats"),
  scanner: $("view-scanner"),
  favorites: $("view-favorites"),
  promos: $("view-promos"),
  map: $("view-map"),
  terms: $("view-terms"),
  about: $("view-about"),
};

let viewCategory = null;

function setView(name) {
  // vistas base
  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("active", key === name);
  });

  // vista categoría dinámica
  if (viewCategory) {
    viewCategory.classList.toggle("active", name === "category");
  }

  // nav activo
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const target = btn.dataset.target;
    const isActive = target === name;
    btn.classList.toggle("active", isActive);
  });

  if (name !== "scanner") stopScanner();
}

// nav footer
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.target));
});

// FAB scanner
$("scan-fab").addEventListener("click", () => setView("scanner"));

// ==============================
// Menú (profile-sheet)
// ==============================
const profileSheet = $("profile-sheet");
$("btn-profile-menu").onclick = () =>
  profileSheet.classList.remove("hidden");
$("close-sheet").onclick = () =>
  profileSheet.classList.add("hidden");

profileSheet.addEventListener("click", (e) => {
  if (e.target === profileSheet) profileSheet.classList.add("hidden");
});

document.querySelectorAll(".sheet-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.sheet;
    profileSheet.classList.add("hidden");
    if (target === "map") {
      setView("map");
      initMap();
    } else if (target === "terms") {
      setView("terms");
    } else if (target === "about") {
      setView("about");
    }
  });
});

// ==============================
// Datos globales
// ==============================
let PRODUCTS = [];      // listado base /api/products
let currentProduct = null;  // producto de PRODUCTS
let currentDetails = null;  // detalle /api/product

async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "error api products");
    PRODUCTS = json.items || [];
    if (PRODUCTS.length) currentProduct = PRODUCTS[0];
  } catch (e) {
    console.error("Error loadProducts:", e);
    PRODUCTS = [];
  }
}

async function loadProductDetails(id) {
  try {
    const res = await fetch(`/api/product?id=${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "error api product");
    currentDetails = json;
    return json;
  } catch (e) {
    console.error("Error loadProductDetails:", e);
    currentDetails = null;
    return null;
  }
}

// ==============================
// HOME: buscador + categorías + ofertas + más buscados
// ==============================
$("search-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doGlobalSearch();
});

function doGlobalSearch() {
  const q = $("search-input").value.trim().toLowerCase();
  if (!q || !PRODUCTS.length) return;
  const prod = PRODUCTS.find((p) =>
    (p.nombre || "").toLowerCase().includes(q)
  );
  if (!prod) {
    alert("Todavía no tenemos ese producto.");
    return;
  }
  openProduct(prod.id);
}

// categorías → vista categoría
document.querySelectorAll(".cat-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const cat = btn.dataset.category || btn.textContent.trim();
    openCategoryView(cat);
  });
});

function setupTopSearchesSection() {
  const home = $("view-home");
  if (!home) return;
  if ($("top-searches-section")) return;

  const section = document.createElement("section");
  section.id = "top-searches-section";
  section.className = "space-y-2";
  section.innerHTML = `
    <div class="flex items-center justify-between mt-2">
      <h2 class="text-sm font-semibold">Más buscados</h2>
      <span class="text-[11px] text-slate-500 dark:text-neutral-400">Top productos</span>
    </div>
    <div class="rounded-3xl bg-white dark:bg-appdark-card border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
      <table class="w-full text-left text-[12px]">
        <thead class="bg-slate-50 dark:bg-appdark-softer">
          <tr>
            <th class="px-3 py-2">Producto</th>
            <th class="px-3 py-2">Categoría</th>
            <th class="px-3 py-2 text-right">Desde</th>
          </tr>
        </thead>
        <tbody id="top-searches-body"></tbody>
      </table>
    </div>
  `;
  home.appendChild(section);
}

function renderTopSearches() {
  const tbody = $("top-searches-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = [...PRODUCTS].slice(0, 10);
  list.forEach((p) => {
    const tr = document.createElement("tr");
    tr.className =
      "border-t border-slate-100 dark:border-neutral-800 cursor-pointer";
    tr.innerHTML = `
      <td class="px-3 py-2">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-md overflow-hidden bg-slate-100 dark:bg-appdark-softer">
            <img src="${p.imagen || ""}" alt="${p.nombre}" class="w-full h-full object-cover" />
          </div>
          <span class="text-[12px] font-semibold">${p.nombre}</span>
        </div>
      </td>
      <td class="px-3 py-2 text-[11px] text-slate-500 dark:text-neutral-400">
        ${p.categoria || "-"}
      </td>
      <td class="px-3 py-2 text-right text-[12px]">
        ${
          p.mejorPrecio
            ? `<span class="font-semibold text-primary">${formatPYG(
                p.mejorPrecio
              )}</span>`
            : `<span class="text-[11px] text-slate-500 dark:text-neutral-400">-</span>`
        }
      </td>
    `;
    tr.addEventListener("click", () => openProduct(p.id));
    tbody.appendChild(tr);
  });
}

// ofertas destacadas
function renderOffers() {
  const cont = $("offers-carousel");
  if (!cont) return;
  cont.innerHTML = "";

  const sorted = [...PRODUCTS]
    .filter((p) => p.mejorPrecio)
    .sort((a, b) => a.mejorPrecio - b.mejorPrecio)
    .slice(0, 10);

  sorted.forEach((p) => {
    const card = document.createElement("button");
    card.className =
      "relative flex-shrink-0 w-64 rounded-3xl bg-white dark:bg-appdark-card border border-slate-200 dark:border-neutral-800 overflow-hidden text-left shadow-sm";
    card.innerHTML = `
      <div class="h-32 bg-slate-100 dark:bg-appdark-softer overflow-hidden relative">
        <img src="${p.imagen || ""}" class="w-full h-full object-cover" alt="${p.nombre}">
        <div class="offer-badge">
          <span>TOP</span>
          <span>DEAL</span>
        </div>
      </div>
      <div class="p-3 space-y-1">
        <p class="text-[10px] uppercase text-olive tracking-wide">${p.categoria || ""}</p>
        <h3 class="text-sm font-semibold line-clamp-2">${p.nombre}</h3>
        <p class="text-sm font-semibold text-primary">
          Desde ${formatPYG(p.mejorPrecio || 0)}
        </p>
      </div>
    `;
    card.addEventListener("click", () => openProduct(p.id));
    cont.appendChild(card);
  });
}
// ==============================
// Vista categoría
// ==============================
function ensureCategoryView() {
  if (viewCategory) return;
  const main = document.querySelector("main");
  viewCategory = document.createElement("section");
  viewCategory.id = "view-category";
  viewCategory.className = "view px-4 pt-4 space-y-3";
  viewCategory.innerHTML = `
    <div class="rounded-3xl bg-white dark:bg-appdark-card border border-slate-200 dark:border-neutral-800 p-3 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <h2 id="category-title" class="text-sm font-semibold">Categoría</h2>
        <button id="category-back" class="text-[11px] text-primary underline">
          Volver al inicio
        </button>
      </div>
      <div class="mb-3">
        <div class="relative">
          <i class="ti ti-search text-[16px] text-slate-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2"></i>
          <input id="category-search" type="text"
                 class="w-full rounded-full bg-slate-50 dark:bg-appdark-softer border border-slate-200 dark:border-neutral-700 pl-9 pr-4 py-1.5 text-[12px]
                        focus:outline-none focus:ring-1 focus:ring-secondary/70"
                 placeholder="Buscar dentro de la categoría" />
        </div>
      </div>
      <div id="category-list" class="space-y-2"></div>
    </div>
  `;
  main.appendChild(viewCategory);

  $("category-back").addEventListener("click", () => setView("home"));
  $("category-search").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = e.target.value.trim();
    const cat = $("category-title").dataset.cat || "";
    loadCategory(cat, q);
  });
}

async function openCategoryView(catName) {
  ensureCategoryView();
  const title = $("category-title");
  title.textContent = catName;
  title.dataset.cat = catName;
  await loadCategory(catName, "");
  setView("category");
}

async function loadCategory(catName, q) {
  try {
    const params = new URLSearchParams();
    params.set("cat", catName);
    if (q) params.set("q", q);
    const res = await fetch(`/api/category?${params.toString()}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "error category");

    const list = $("category-list");
    list.innerHTML = "";

    if (!json.items || !json.items.length) {
      list.innerHTML =
        '<p class="text-[12px] text-slate-500 dark:text-neutral-400">No hay productos en esta categoría.</p>';
      return;
    }

    json.items.forEach((p) => {
      const row = document.createElement("button");
      row.className =
        "w-full rounded-2xl bg-slate-50 dark:bg-appdark-softer border border-slate-200 dark:border-neutral-700 px-3 py-2 flex items-center justify-between text-left";
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-appdark-card">
            <img src="${p.imagen || ""}" class="w-full h-full object-cover" alt="${p.nombre}">
          </div>
          <div>
            <p class="text-xs font-semibold">${p.nombre}</p>
            <p class="text-[11px] text-slate-500 dark:text-neutral-400">${p.categoria || ""}</p>
          </div>
        </div>
        <div class="text-right">
          ${
            p.mejorPrecio
              ? `<p class="text-xs text-slate-500 dark:text-neutral-400">Desde</p>
                 <p class="text-sm font-semibold text-primary">${formatPYG(
                   p.mejorPrecio
                 )}</p>`
              : `<p class="text-[11px] text-slate-500 dark:text-neutral-400">Sin precio</p>`
          }
        </div>
      `;
      row.addEventListener("click", () => openProduct(p.id));
      list.appendChild(row);
    });
  } catch (e) {
    console.error("Error loadCategory:", e);
  }
}

// ==============================
// Detalle producto + stats
// ==============================
let priceChart = null;

async function openProduct(id) {
  currentProduct = PRODUCTS.find((p) => p.id === id) || null;
  const data = await loadProductDetails(id);
  if (!data || !data.product) {
    alert("No se pudo cargar el producto.");
    return;
  }
  updateProductView();
  setView("product");
}

$("back-home").addEventListener("click", () => setView("home"));

function updateProductView() {
  if (!currentDetails || !currentDetails.product) return;

  const p = currentDetails.product;
  const precios = currentDetails.precios || [];
  const mejores = currentDetails.mejores || {};
  const tendencia = currentDetails.tendencia || {};

  $("prod-img").src = p.imagen || "";
  $("prod-category").textContent = p.categoria || "";
  $("prod-name").textContent = p.nombre || "";
  $("prod-barcode").textContent = p.barcode || "-";

  updateFavButton();

  $("chip-best").textContent = mejores.best
    ? "Mejor precio: " + formatPYG(mejores.best)
    : "Mejor precio: -";
  $("chip-avg").textContent = tendencia.avgHist
    ? "Promedio histórico: " + formatPYG(tendencia.avgHist)
    : "Promedio histórico: -";
  $("chip-savings").textContent = mejores.ahorro
    ? "Ahorro vs más caro: " + formatPYG(mejores.ahorro)
    : "Ahorro vs más caro: -";

  const list = $("price-list");
  list.innerHTML = "";
  if (!precios.length) {
    list.innerHTML =
      '<p class="text-[12px] text-slate-500 dark:text-neutral-400">Sin precios registrados.</p>';
  } else {
    precios.forEach((r, idx) => {
      const isBest = idx === 0;
      const card = document.createElement("article");
      card.className =
        "rounded-2xl bg-white dark:bg-appdark-card border border-slate-200 dark:border-neutral-800 px-3 py-2 flex items-center justify-between shadow-sm";
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-appdark-softer border border-slate-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden">
            ${
              r.logo
                ? `<img src="${r.logo}" alt="${r.supermercado}" class="w-full h-full object-contain">`
                : `<span class="text-xs text-slate-500 dark:text-slate-300">${(r.supermercado || "?")[0]}</span>`
            }
          </div>
          <div>
            <p class="text-xs font-semibold">${r.supermercado}</p>
            <p class="text-[11px] text-slate-500 dark:text-neutral-400">
              ${isBest ? "Mejor precio disponible" : "Precio en catálogo online"}
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold text-primary">${formatPYG(
            r.precio
          )}</p>
        </div>
      `;
      list.appendChild(card);
    });
  }

  $("stats-title").textContent =
    'Tendencia global mensual de "' + (p.nombre || "") + '"';
  $("stat-min").textContent = tendencia.minHist
    ? formatPYG(tendencia.minHist)
    : "-";
  $("stat-avg").textContent = tendencia.avgHist
    ? formatPYG(tendencia.avgHist)
    : "-";
  $("stat-promos").textContent = "-";
  $("stat-monthly").textContent = tendencia.minHist
    ? formatPYG(Math.round(tendencia.minHist * 0.97))
    : "-";

  const labels = tendencia.labels || [];
  const values = tendencia.values || [];

  const ctx = $("priceChart").getContext("2d");
  if (priceChart) priceChart.destroy();
  if (!values.length) return;

  priceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Mejor precio",
          data: values,
          borderColor: "#5B6D41",
          backgroundColor: "#5B6D41",
          tension: 0.25,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: {
            callback: (v) => formatPYG(v),
          },
        },
      },
    },
  });
}

// ==============================
// Stats tab
// ==============================
$("stats-search").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const q = e.target.value.trim().toLowerCase();
  if (!q || !PRODUCTS.length) return;
  const prod = PRODUCTS.find((p) =>
    (p.nombre || "").toLowerCase().includes(q)
  );
  if (!prod) return alert("Producto no encontrado.");
  openProduct(prod.id);
});

$("stats-reset").addEventListener("click", () => {
  if (currentDetails) updateProductView();
});

// ==============================
// Favoritos + alertas
// ==============================
const FAVORITES_KEY = "cp_favorites";

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}
function saveFavorites(f) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(f));
}
function isFavorite(id) {
  return getFavorites().includes(id);
}

function updateFavButton() {
  if (!currentDetails || !currentDetails.product) return;
  const id = currentDetails.product.id;
  const inFav = isFavorite(id);
  $("fav-toggle").textContent = (inFav ? "★ " : "☆ ") + "Favoritos";
}

$("fav-toggle").addEventListener("click", () => {
  if (!currentDetails || !currentDetails.product) return;
  const id = currentDetails.product.id;
  let favs = getFavorites();
  if (isFavorite(id)) {
    favs = favs.filter((x) => x !== id);
  } else {
    favs.push(id);
  }
  saveFavorites(favs);
  updateFavButton();
  renderFavoritesList();
  renderAlertsList();
});

function renderFavoritesList() {
  const cont = $("favorites-list");
  if (!cont) return;
  const favs = getFavorites();
  cont.innerHTML = "";

  if (!favs.length) {
    cont.innerHTML =
      '<p class="text-[12px] text-slate-500 dark:text-neutral-400">Todavía no agregaste productos a favoritos.</p>';
    return;
  }

  favs.forEach((id) => {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    const row = document.createElement("button");
    row.className =
      "favorite-item w-full flex items-center justify-between text-left";
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-appdark-card">
          <img src="${p.imagen || ""}" class="w-full h-full object-cover" alt="${p.nombre}">
        </div>
        <div>
          <p class="text-xs font-semibold">${p.nombre}</p>
          <p class="text-[11px] text-slate-500 dark:text-neutral-400">${p.categoria || ""}</p>
        </div>
      </div>
      <div class="text-right">
        ${
          p.mejorPrecio
            ? `<p class="text-xs text-slate-500 dark:text-neutral-400">Desde</p>
               <p class="text-sm font-semibold text-primary">${formatPYG(
                 p.mejorPrecio
               )}</p>`
            : `<p class="text-[11px] text-slate-500 dark:text-neutral-400">Sin precio</p>`
        }
      </div>
    `;
    row.addEventListener("click", () => openProduct(p.id));
    cont.appendChild(row);
  });
}

async function renderAlertsList() {
  const cont = $("alerts-list");
  if (!cont) return;
  const favs = getFavorites();
  cont.innerHTML = "";

  if (!favs.length) {
    cont.innerHTML =
      '<p class="text-[12px] text-slate-500 dark:text-neutral-400">Cuando un favorito baje de precio va a aparecer acá.</p>';
    return;
  }

  const alerts = [];
  for (const id of favs) {
    try {
      const res = await fetch(`/api/product?id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!json.ok || !json.tendencia || !json.tendencia.values) continue;
      const vals = json.tendencia.values;
      if (vals.length < 2) continue;
      const first = vals[0];
      const last = vals[vals.length - 1];
      if (last < first) {
        const diff = first - last;
        const percent = Math.round((diff / first) * 100);
        alerts.push({ product: json.product, diff, percent });
      }
    } catch (e) {
      console.error("alerta error:", e);
    }
  }

  if (!alerts.length) {
    cont.innerHTML =
      '<p class="text-[12px] text-slate-500 dark:text-neutral-400">Todavía no hay bajadas de precio relevantes.</p>';
    return;
  }

  alerts.forEach((a) => {
    const row = document.createElement("div");
    row.className = "alert-item flex items-center justify-between";
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-appdark-card">
          <img src="${a.product.imagen || ""}" class="w-full h-full object-cover" alt="${a.product.nombre}">
        </div>
        <div>
          <p class="text-xs font-semibold">${a.product.nombre}</p>
          <p class="text-[11px] text-offer font-semibold">
            Bajó ${formatPYG(a.diff)} (${a.percent}%)
          </p>
        </div>
      </div>
      <button class="text-[11px] text-primary underline">Ver</button>
    `;
    row.querySelector("button").addEventListener("click", () =>
      openProduct(a.product.id)
    );
    cont.appendChild(row);
  });
}

// ==============================
// Promos
// ==============================
async function renderPromos() {
  const cont = $("promos-list");
  if (!cont) return;
  cont.innerHTML = "";

  try {
    const res = await fetch("/api/promos");
    const json = await res.json();
    if (!json.ok || !json.items || !json.items.length) {
      cont.innerHTML =
        '<p class="text-[12px] text-slate-500 dark:text-neutral-400">Todavía no hay promos destacadas.</p>';
      return;
    }

    json.items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "promo-card flex items-center gap-2";
      card.innerHTML = `
        <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-appdark-card">
          <img src="${item.productos?.imagen || ""}" class="w-full h-full object-cover" alt="${item.productos?.nombre_original || ""}">
        </div>
        <div>
          <p class="text-xs font-semibold">${item.productos?.nombre_original || ""}</p>
          <p class="text-[11px] text-slate-500 dark:text-neutral-400">${item.descripcion || ""}</p>
        </div>
      `;
      cont.appendChild(card);
    });
  } catch (e) {
    console.error("Error promos:", e);
    cont.innerHTML =
      '<p class="text-[12px] text-slate-500 dark:text-neutral-400">Error cargando promociones.</p>';
  }
}

// ==============================
// Mapa (Leaflet)
// ==============================
let mapInstance = null;
function initMap() {
  if (mapInstance || typeof L === "undefined") return;
  const el = $("map");
  if (!el) return;

  mapInstance = L.map(el).setView([-25.282, -57.635], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(mapInstance);
}

// ==============================
// Scanner (html5-qrcode)
// ==============================
let html5QrInstance = null;
let scannerRunning = false;

async function startScanner() {
  if (scannerRunning) return;
  const status = $("scanner-status");
  status.textContent = "Iniciando cámara...";

  html5QrInstance = new Html5Qrcode("scanner-reader");
  const config = { fps: 10, qrbox: 250 };

  html5QrInstance
    .start(
      { facingMode: "environment" },
      config,
      (decoded) => {
        status.textContent = "Código detectado: " + decoded;
        handleBarcode(decoded);
      }
    )
    .then(() => {
      scannerRunning = true;
      status.textContent = "Cámara lista. Apuntá al código.";
    })
    .catch((err) => {
      status.textContent = "No se pudo iniciar la cámara: " + err;
    });
}

async function stopScanner() {
  const status = $("scanner-status");
  if (html5QrInstance && scannerRunning) {
    try {
      await html5QrInstance.stop();
      await html5QrInstance.clear();
    } catch (e) {}
  }
  scannerRunning = false;
  status.textContent = "Cámara detenida.";
}

// demo de escaneo → busca por últimos 4 dígitos en nombre
async function handleBarcode(code) {
  const q = code.toString().slice(-4).toLowerCase();
  const prod = PRODUCTS.find((p) =>
    (p.nombre || "").toLowerCase().includes(q)
  );
  if (!prod) {
    alert("En esta demo el escaneo es básico y no encontró el producto.");
    stopScanner();
    return;
  }
  await openProduct(prod.id);
  stopScanner();
}

$("scanner-start").addEventListener("click", startScanner);
$("scanner-stop").addEventListener("click", stopScanner);

// ==============================
// INIT
// ==============================
(async function init() {
  await loadProducts();
  setupTopSearchesSection();
  renderTopSearches();
  renderOffers();
  renderFavoritesList();
  await renderAlertsList();
  await renderPromos();
  setView("home");
})();
