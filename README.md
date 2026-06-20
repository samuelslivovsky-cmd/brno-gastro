# Brno Gastro 🍴

Webová appka, ktorá z Google Maps načíta gastro podniky v Brne s hodnotením
nad 4★ a **každý týždeň náhodne vyberie jeden** ako „tip týždňa“. Po návšteve
podnik orecenzuješ a appka ho odoberie z poolu — náhodný výber ho už nikdy
nevyberie.

- **Tip týždňa** je stabilný počas celého týždňa (prežije reload).
- **Vlastné recenzie** (hviezdičky + text) sa ukladajú lokálne.
- **Bez backendu** — všetok stav je v `localStorage` tvojho prehliadača.

## Tech

Vite + React + TypeScript, Google Maps JavaScript API (Places — nová `Place`
trieda). Žiadny server.

## Setup

1. **Nainštaluj závislosti**

   ```bash
   npm install
   ```

2. **Vytvor Google API kľúč**
   - V [Google Cloud Console](https://console.cloud.google.com/) vytvor projekt
     a zapni **Places API (New)** aj **Maps JavaScript API**.
   - Vytvor API kľúč a obmedz ho **HTTP-referrer reštrikciou** (napr.
     `http://localhost:5173/*`), aby ho nebolo možné zneužiť.
   - Zapni billing (Places API je platené, má mesačný free kredit).

3. **Nastav kľúč**

   ```bash
   cp .env.example .env
   # do .env doplň VITE_GOOGLE_MAPS_API_KEY=<tvoj_kluc>
   ```

4. **Spusti**

   ```bash
   npm run dev
   ```

   Otvor `http://localhost:5173`, klikni **„Načítať / obnoviť zoznam“**.

## Ako to funguje

Places API vráti max 20 výsledkov na jedno volanie, takže „celé Brno“ sa nedá
získať jedným dotazom. Appka preto **rozdelí mesto na mriežku bodov** a pre
každý spustí `searchNearby` s malým polomerom, výsledky **dedupne podľa
place ID** a vyfiltruje podľa min. hodnotenia a počtu recenzií.

> ⚠️ **Cena:** každé načítanie spustí desiatky až stovky volaní Places API.
> Preto sa fetch spúšťa **iba manuálne** tlačidlom a výsledky sa cache-ujú v
> prehliadači. Obnovuj zoznam len keď to potrebuješ.

## Build

```bash
npm run build      # typecheck + produkčný build do dist/
npm run preview    # lokálny náhľad buildu
```

## Poznámky

- Stav je per-prehliadač (`localStorage`). Vymazanie dát prehliadača ho zmaže;
  tlačidlo **„Vymazať dáta“** ho resetuje ručne.
- Kľúč je viditeľný v prehliadači (bez backendu) — chráň ho referrer
  reštrikciou. Pre zdieľanú appku pridaj serverless proxy.
