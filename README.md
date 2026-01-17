# Catan (Web Edition)

An HTML5/JavaScript implementation of the classic board game, refactored for modern browser standards. This version is a complete rewrite; for the previous iteration, please refer to the `legacy` branch.

## 🛠 Technical Features
* **Hexagonal Map Coordinate System:** Implemented a **Cube Coordinate System** for the hex grid ($q, r, s$). 
* **Vertex & Edge Mapping:** Building upon the hex grid, vertices and edges are managed via a derivative coordinate system:
    * For any hex $(q, r, s)$, its six vertices are uniquely represented by the set: 
      `[(q, r-1, s), (q+1, r, s), (q, r, s-1), (q, r+1, s), (q-1, r, s), (q, r, s+1)]`
    * Edges are uniquely identified by the sum of the coordinates of the two vertices they connect, ensuring a consistent and collision-free data structure for building roads and settlements.

* **Map Editor & Extensibility:** While still a work in progress, the engine supports loading map configurations from a **JSON file**. This ensures extensibility and flexibility for custom map layouts and future development.

## 🎨 Asset Information
**AI Disclosure:** The card imageries were generated using **Gemini (Nano Banana & Veo models)**.

**Disclaimer:** These images and game mechanics are inspired by the board game *Catan* by Klaus Teuber. This project is a fan-made implementation and is not affiliated with, endorsed by, or licensed by Catan GmbH or Catan Studio. All assets are intended for personal, non-commercial educational use as part of a coding portfolio.