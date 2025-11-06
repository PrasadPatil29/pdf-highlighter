import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { GlobalWorkerOptions } from "pdfjs-dist";
import * as pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs";
import "./index.css";

// Set worker source
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// PDF file (place your PDF in public folder)
const PDF_URL = "/Maersk Q2 2025 Interim Report.pdf";

const SEARCH_PHRASES = {
  1: "Maersk's results continued to improve year-on-year … EBITDA of USD 2.3 bn",
  2: "EBITDA increased to USD 2.3 bn",
  3: "Gain on sale of non-current assets"
};

export default function App() {
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load PDF once
  useEffect(() => {
    (async () => {
      try {
        console.log("Starting to load PDF from:", PDF_URL);
        const loadingTask = pdfjsLib.getDocument({
          url: PDF_URL,
          cMapUrl: '/cmaps/',
          cMapPacked: true,
        });
        
        loadingTask.onProgress = function(progress) {
          console.log(`Loading PDF: ${Math.round(progress.loaded / progress.total * 100)}%`);
        };
        
        const loaded = await loadingTask.promise;
        console.log("PDF loaded successfully, pages:", loaded.numPages);
        setPdfDoc(loaded);
      } catch (err) {
        console.error("PDF load error:", err);
        alert("Error loading PDF. Please check if the PDF file exists in the public folder.");
      }
    })();
  }, []);

  // Calculate scale to fit width
  const calculateFitToWidthScale = (page, containerWidth) => {
    const defaultViewport = page.getViewport({ scale: 1.0 });
    // Subtract padding and some margin to ensure it fits
    const targetWidth = containerWidth - 40;
    return targetWidth / defaultViewport.width;
  };

  // Render all PDF pages
  useEffect(() => {
    if (!pdfDoc) return;
    const container = containerRef.current;
    container.innerHTML = "";

    const renderPage = async (num) => {
      const page = await pdfDoc.getPage(num);
      // Calculate scale based on container width
      const scale = calculateFitToWidthScale(page, container.offsetWidth);
      const viewport = page.getViewport({ scale });

      const wrapper = document.createElement("div");
      wrapper.className = "page-wrap";
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.height = `${viewport.height}px`;
      wrapper.dataset.pageNumber = num;

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.className = "pdf-canvas";
      wrapper.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;

      const textLayerDiv = document.createElement("div");
      textLayerDiv.className = "textLayer";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      wrapper.appendChild(textLayerDiv);

      container.appendChild(wrapper);

      const textContent = await page.getTextContent();
      textContent.items.forEach((item) => {
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const x = tx[4];
        const y = tx[5];
        const fontHeight = Math.hypot(tx[1], tx[3]);
        const span = document.createElement("span");
        span.className = "textItem";
        span.textContent = item.str;
        span.style.left = `${x}px`;
        span.style.top = `${viewport.height - y - fontHeight}px`;
        span.style.fontSize = `${fontHeight}px`;
        span.style.transform = `scaleX(${tx[0] / fontHeight || 1})`;
        textLayerDiv.appendChild(span);
      });
    };

    (async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        await renderPage(i);
      }
    })();
  }, [pdfDoc, windowWidth]);

  // Draw highlight rectangles
  useEffect(() => {
    const container = containerRef.current;
    container.querySelectorAll(".pdf-highlight").forEach((n) => n.remove());

    highlights.forEach((h) => {
      const pageWrap = container.querySelector(`.page-wrap[data-page-number="${h.page}"]`);
      if (!pageWrap) return;
      const overlay = document.createElement("div");
      overlay.className = "pdf-highlight";
      overlay.style.left = `${h.left}px`;
      overlay.style.top = `${h.top}px`;
      overlay.style.width = `${h.width}px`;
      overlay.style.height = `${h.height}px`;
      pageWrap.appendChild(overlay);
    });
  }, [highlights]);

  // Jump to specific page
  const jumpToPage = (pageNum) => {
    const pageWrap = containerRef.current.querySelector(
      `.page-wrap[data-page-number="${pageNum}"]`
    );
    if (pageWrap) {
      pageWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Handle reference click
  const handleRefClick = (refNumber) => {
    const phrase = SEARCH_PHRASES[refNumber];
    if (phrase) {
      highlightPhrase(phrase);
    }
  };

  // Search and highlight
  const highlightPhrase = (phrase) => {
    const container = containerRef.current;
    const found = [];
    const pages = Array.from(container.querySelectorAll(".page-wrap"));

    pages.forEach((pageWrap) => {
      const pageNum = parseInt(pageWrap.dataset.pageNumber, 10);
      const spans = Array.from(pageWrap.querySelectorAll(".textItem"));
      let text = "";
      const map = [];
      spans.forEach((s) => {
        for (let i = 0; i < s.textContent.length; i++) {
          map.push(s);
        }
        text += s.textContent;
      });
      const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx !== -1) {
        const matchSpans = map.slice(idx, idx + phrase.length);
        const uniq = [...new Set(matchSpans)];
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
        uniq.forEach((sp) => {
          const r = sp.getBoundingClientRect();
          const p = pageWrap.getBoundingClientRect();
          left = Math.min(left, r.left - p.left);
          top = Math.min(top, r.top - p.top);
          right = Math.max(right, r.right - p.left);
          bottom = Math.max(bottom, r.bottom - p.top);
        });
        found.push({ page: pageNum, left, top, width: right - left, height: bottom - top });
      }
    });

    if (found.length === 0) alert("Text not found!");
    else {
      setHighlights(found);
      container.querySelector(
        `.page-wrap[data-page-number="${found[0].page}"]`
      )?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="app-root">
      <div className="left">
        <div className="pdf-container" ref={containerRef}>
          {!pdfDoc && <div className="loader">Loading PDF...</div>}
        </div>
      </div>

      <div className="right">
        <h3>Analysis</h3>
        <p>
          No extraordinary or one-off items affecting EBITDA were reported in Maersk's Q2 2025 results. 
          The report explicitly notes that EBITDA improvements stemmed from operational performance—
          including volume growth, cost control, and margin improvement across Ocean, Logistics & 
          Services, and Terminals segments [<button className="ref-btn" onClick={() => handleRefClick(1)}>1</button>][<button className="ref-btn" onClick={() => handleRefClick(2)}>2</button>]. 
          Gains or losses from asset sales, which could qualify as extraordinary items, 
          are shown separately under EBIT and not included in EBITDA. The gain on 
          sale of non-current assets was USD 25 m in Q2 2025, significantly lower than USD 208 m in Q2 
          2024, but these affect EBIT, not EBITDA [<button className="ref-btn" onClick={() => handleRefClick(3)}>3</button>]. 
          Hence, Q2 2025 EBITDA reflects core operating activities without one-off extraordinary adjustments.
        </p>

        <h3>Findings</h3>
        <div className="findings">
          <p>
            <button className="page-link" onClick={() => jumpToPage(3)}>Page 3 — Highlights Q2 2025</button><br />
            EBITDA increase (USD 2.3 bn vs USD 2.1 bn prior year) attributed to operational improvements; no 
            mention of extraordinary or one-off items. [<button className="ref-btn" onClick={() => handleRefClick(1)}>1</button>]
          </p>

          <p>
            <button className="page-link" onClick={() => jumpToPage(5)}>Page 5 — Review Q2 2025</button><br />
            EBITDA rise driven by higher revenue and cost control across all segments; no extraordinary gains 
            or losses included. [<button className="ref-btn" onClick={() => handleRefClick(2)}>2</button>]
          </p>

          <p>
            <button className="page-link" onClick={() => jumpToPage(15)}>Page 15 — Condensed Income Statement</button><br />
            Gain on sale of non-current assets USD 25 m (vs USD 208 m prior year) reported separately below 
            EBITDA; therefore, not part of EBITDA. [<button className="ref-btn" onClick={() => handleRefClick(3)}>3</button>]
          </p>
        </div>

        <h3>Supporting Evidence</h3>
        <div className="supporting">
          <p>[<button className="ref-btn" onClick={() => handleRefClick(1)}>1</button>] A.P. Moller – Maersk Q2 2025 Interim Report (7 Aug 2025) — <button className="page-link" onClick={() => jumpToPage(3)}>Page 3</button> →<br />
          "Maersk's results continued to improve year-on-year … EBITDA of USD 2.3 bn (USD 2.1 bn) … 
          driven by volume and other revenue growth in Ocean, margin improvements in Logistics & 
          Services and significant top line growth in Terminals."</p>

          <p>[<button className="ref-btn" onClick={() => handleRefClick(2)}>2</button>] A.P. Moller – Maersk Q2 2025 Interim Report (7 Aug 2025) — <button className="page-link" onClick={() => jumpToPage(5)}>Page 5</button> →<br />
          "EBITDA increased to USD 2.3 bn (USD 2.1 bn) … driven by higher revenue and cost management 
          … Ocean's EBITDA … slightly increased by USD 36 m … Logistics & Services contributed 
          significantly with a USD 71 m increase … Terminals' EBITDA increased by USD 50 m."</p>

          <p>[<button className="ref-btn" onClick={() => handleRefClick(3)}>3</button>] A.P. Moller – Maersk Q2 2025 Interim Report (7 Aug 2025) — <button className="page-link" onClick={() => jumpToPage(15)}>Page 15</button> →<br />
          "Gain on sale of non-current assets, etc., net 25 (208) … Profit before depreciation, amortisation 
          and impairment losses, etc. (EBITDA) 2,298"</p>
        </div>
      </div>
    </div>
  );
}
