import express from "express";
import path from "path";
import fs from "fs";
import * as archiverLib from "archiver";
const archiver = (archiverLib as any).default || archiverLib;
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health Check for Proxy
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Build and Download Compiled Dist Files (HTML/JS/CSS)
  app.get("/api/download-dist", async (req, res) => {
    try {
      console.log("Request to download compiled dist received. Packing files...");

      const distDir = path.join(process.cwd(), "dist");
      if (!fs.existsSync(distDir)) {
        res.status(500).json({ error: "La carpeta de distribución 'dist' no fue encontrada." });
        return;
      }

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="Inmobiliaria_Portafolio_Compilado.zip"');

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err) => {
        throw err;
      });

      archive.pipe(res);

      // Add all pre-compiled frontend files inside dist, excluding backend server files
      const items = fs.readdirSync(distDir);
      for (const item of items) {
        if (item === "server.cjs" || item === "server.cjs.map") {
          continue;
        }
        const itemPath = path.join(distDir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          archive.directory(itemPath, item);
        } else {
          archive.file(itemPath, { name: item });
        }
      }

      await archive.finalize();
      console.log("Distribution files successfully sent!");
    } catch (error: any) {
      console.error("Error generating compiled download:", error);
      res.status(500).send(`Error empaquetando recursos compilados: ${error.message}`);
    }
  });

  // API Route: Download Complete Source Code ZIP
  app.get("/api/download-src", async (req, res) => {
    try {
      console.log("Packing source code...");
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="Inmobiliaria_Portafolio_CodigoFuente.zip"');

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err) => {
        throw err;
      });

      archive.pipe(res);

      // Add files in the root folder, ignoring large/unnecessary files
      const srcDir = path.join(process.cwd(), "src");
      archive.directory(srcDir, "src");

      // Add key configuration files
      const filesToInclude = [
        "package.json",
        "index.html",
        "vite.config.ts",
        "tsconfig.json",
        ".env.example",
        "firestore.rules",
        "firebase-blueprint.json",
        "server.ts"
      ];

      filesToInclude.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file });
        }
      });

      await archive.finalize();
      console.log("Source code zip successfully sent!");
    } catch (error: any) {
      console.error("Error generating source code download:", error);
      res.status(500).send(`Error empaquetando código fuente: ${error.message}`);
    }
  });

  // Vite middleware setup for Development UI rendering
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start custom server:", err);
});
