# IPsec Sentinel — 2026 Layout Redesign (Anti-Grid & Tactile)

## 1. Anti-Grid Asymmetric Layout (Importance-Weighted)
- **Concept:** Rejecting the uniform "bento grid" where every panel is the same size. We move to a deliberately asymmetric, CSS Grid layout where size reflects importance. 
- **Application:** The **Risk Verdict** panel will span the maximum width and height possible (e.g., `col-span-2 row-span-2`), visually dominating the results page. Supporting data (PQC, Audit, Copilot) will nest tightly around it in smaller, asymmetric blocks. This creates a "content-first" hierarchy where the user instantly knows the status of their PCAP before reading the details.
- **Reference Studied:** Awwwards winner patterns (like Apple's keynote summary slides, or Studio Meyer's anti-grid approach).

## 2. Kinetic / Viewport-Scaled Typography
- **Concept:** Replacing generic icons (like a static lock or shield) with massive, animated typography as the primary hero element.
- **Application:** The text "CRITICAL RISK" or "STRONG" will be scaled to `10vw` or similar, acting as a structural design element itself. We will use GSAP to animate this text in with heavy, purposeful weight (not a bouncy toy). The typography *becomes* the emotional anchor.
- **Reference Studied:** 2026 Dribbble trends for "purposeful motion" and cinematic typography.

## 3. Tactile Texture (The "Anti-AI" Touch)
- **Concept:** Adding physical materiality to the UI to counteract the hyper-smooth, sterile look of standard AI-generated interfaces. 
- **Application:** We will introduce a very subtle CSS-generated noise grain overlay to the background (`#09090b`), mixed with thin, 1px structural grid lines. It adds depth and a "hardware/terminal" tactile feel appropriate for a low-level network security tool. 
- **Reference Studied:** The "Tactile Brutalism" trend (e.g., Fireart Studio and Webflow Awwwards entries) emphasizing engineered precision with physical texture.

## 4. Barely-There UI (Data-First Chrome)
- **Concept:** Removing unnecessary container paddings, heavy drop shadows, and decorative backgrounds.
- **Application:** The raw data (SHAP values, config diff) will be pushed closer to the edges, bounded only by 1px solid `#27272a` borders. Buttons will lose their solid fills in favor of outlined, terminal-style interactions.

## 5. Mobile & Tablet Fallback
- **Concept:** Asymmetric CSS grids often break or become confusing on mobile.
- **Application:** At `< 1024px`, the grid explicitly collapses into a strict linear hierarchy, enforcing the order: Verdict -> Remediation -> PQC -> Audit. No elements will attempt to stay side-by-side if they compromise readability.
