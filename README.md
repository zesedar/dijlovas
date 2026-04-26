# Díjlovagló program tervező – PWA

Magyar nyelvű, offline-ban is működő díjlovas pályarajzoló és program tervező webalkalmazás. Telefonra telepíthető a böngészőből (iOS, Android), külön app store nélkül.

## Funkciók

- **Pálya:** 20×60 m és 20×40 m, helyes betűkiosztással (külső + középvonali D-L-X-I-G).
- **Mozgástípusok:** egyenes vonal, középvonal, félpálya (E–B), kiskör (8/10/15 m), nagykör (20 m), átlóváltás (X-en át), félátlóváltás, körben válts.
- **Jármódok:** megállás, lépés (gyűjtött, középütemű, nyújtott, szabad), ügetés (gyűjtött, munka, középütemű, nyújtott), vágta (gyűjtött, munka, középütemű, nyújtott) – minden jármódnak saját színe és vonalstílusa van.
- **Mozgás-megjegyzés:** szabadszöveges mező minden lépéshez.
- **Több program:** automatikus mentés a böngészőbe (`localStorage`), JSON export/import.
- **Nyomtatás:** a pálya tisztán jelenik meg, sidebar nélkül.
- **Offline:** service worker cache-eli az alkalmazást és a betűtípusokat – lovardában, ahol nincs internet, simán használható.

## Indítás (fejlesztési mód)

Szükséges: **Node.js 18+** és **npm**.

```bash
cd dijlovas-pwa
npm install
npm run dev
```

Megnyílik a `http://localhost:5173` címen, és mobilról a helyi hálózaton keresztül is elérhető (Vite kiírja az IP címet a terminálba).

## Build és deploy

```bash
npm run build
```

Ez létrehozza a `dist/` mappát, ami statikus fájlokból áll – bárhova feltölthető:

### Vercel (legegyszerűbb)
```bash
npx vercel deploy
```
Vagy push GitHubra → Vercel automatikusan deployolja.

### Netlify
Drag-and-drop a `dist/` mappát a [netlify.com/drop](https://app.netlify.com/drop) oldalra.

### GitHub Pages
A `vite.config.js`-ben add hozzá: `base: '/repo-neve/'`, majd `npm run build` és push a `gh-pages` branchre.

### Saját szerver
A `dist/` tartalmát kiszolgálni kell **HTTPS-en** (PWA követelmény) – nginx, Caddy, vagy bármi.

## Telepítés telefonra

1. Nyisd meg az alkalmazást **HTTPS-en** (helyi gépen `localhost` is OK fejlesztéshez).
2. **iPhone (Safari):** Megosztás gomb → "Hozzáadás a kezdőképernyőhöz".
3. **Android (Chrome):** A böngésző felajánlja az "Alkalmazás telepítése" lehetőséget, vagy a menüben kézzel kiválasztható.

A telepített alkalmazás **standalone módban indul** (böngésző UI nélkül), és **offline is működik**.

## Adattárolás

A programok a böngésző `localStorage`-jében vannak elmentve `dijlovas:program:` előtaggal. Ez:
- **Telefononként/böngészőnként külön** – nem szinkronizálódik eszközök között.
- **Megmarad** addig, amíg a böngésző cache-t nem ürít.
- **Biztonsági mentésnek** használd a JSON export gombot, vagy a teljes lista mentésére:

```js
// Konzolba másolás:
const out = {};
for (let i = 0; i < localStorage.length; i++) {
  const k = localStorage.key(i);
  if (k.startsWith('dijlovas:')) out[k] = localStorage.getItem(k);
}
copy(JSON.stringify(out, null, 2));
```

## Fájlszerkezet

```
dijlovas-pwa/
├── package.json          # függőségek (React, Vite, Tailwind, vite-plugin-pwa)
├── vite.config.js        # PWA + manifest konfig
├── tailwind.config.js    # színek, font-családok
├── postcss.config.js
├── index.html            # PWA meta tagek, font preload
├── public/               # ikonok (192, 512, maskable, apple-touch)
└── src/
    ├── main.jsx          # belépési pont, service worker regisztráció
    ├── App.jsx           # a teljes alkalmazás logikája
    └── index.css         # Tailwind + globális stílusok
```

## Testreszabás

- **Színek:** `tailwind.config.js`-ben (cream, forest, amber, paper, charcoal).
- **Új mozgástípus:** `App.jsx` → `MOVEMENT_TYPES` tömb + `generatePath()` függvény.
- **Új jármód:** `App.jsx` → `GAITS` tömb (név + szín + szaggatott-e).
- **Pálya stílus:** `Arena` komponens SVG-je az `App.jsx`-ben.

## Fejlesztési ötletek

- Több ló profil támogatás
- Mozgás-időtartamok (kb. percek/másodpercek)
- Animált útvonal visszajátszás
- PDF export
- Cloud sync (Firebase, Supabase)
- Megosztható linkek (program → URL kódolás)
