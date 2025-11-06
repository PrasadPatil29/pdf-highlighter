# PDF Highlighter — Maersk Q2 2025

**Objective**

Recreate a small React app that shows a PDF (Maersk Q2 2025 Interim Report.pdf) on the left and the analysis text on the right. When the user clicks the reference marker `[3]` in the analysis text, the phrase **“Gain on sale of non-current assets, etc”** in the PDF is highlighted in **yellow** and scrolled into view.

---

## Features

* Left: embedded PDF viewer (uses `pdfjs-dist` / `pdfjs` worker).
* Right: analysis text with reference links `[1]`, `[2]`, `[3]`.
* Clicking `[3]` searches the visible PDF text for the matching phrase, scrolls to the page, and highlights the phrase in yellow.
* Fallback: if exact text coordinates are not found, the app navigates to the likely PDF page containing the text and visually marks that page.
* Simple, easy-to-extend code so you can add more reference links and highlights.

  <img width="1910" height="955" alt="image" src="https://github.com/user-attachments/assets/ee7c04c4-6300-4d3e-a7ee-a604a581e8a6" />
  <img width="1909" height="968" alt="image" src="https://github.com/user-attachments/assets/0685fe57-a424-4be5-ab75-81850f5a4fcb" />



---

## Implementation summary (how it works)

1. The app uses `pdfjs-dist` (PDF.js) to load pages and extract text layers.
2. When the user clicks a reference (e.g. `[3]`), the app runs a text search across the PDF's text content to find the page and the match index.
3. Once a match is found, the app calculates the text's position using PDF.js text-layer items (x/y/width/height) and overlays an absolutely-positioned `div` or canvas rectangle with a semi-transparent yellow background at that position — producing the highlight effect.
4. The viewer then scrolls to the page and animates a brief flash to draw attention.
5. If PDF.js cannot expose exact coordinates (older worker versions, CORS, or text-encoding issues), the app will at least open the correct page and show a prominent page-level marker.

---

## How to use this repo

1. Clone the repo and copy `Maersk Q2 2025 Interim Report.pdf` into the `public/` folder.
2. Install dependencies and start the dev server:

```bash
npm install
npm start
```

3. Open `http://localhost:3000`.
4. Click the `[3]` link in the analysis panel — the viewer will jump to the PDF page and highlight the text.


### Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in the development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.

#### `npm test`

Launches the test runner in the interactive watch mode.

#### `npm run build`

Builds the app for production to the `build` folder.

#### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

See the Create React App docs for details.

---
