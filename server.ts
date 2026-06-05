import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { requestStorage } from "./lib/hubspot";

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for frontend
app.use(cors({
  origin: true,
  credentials: true
}));

// Use express.raw to capture request body without parsing it
// This prevents breaking standard Web Request.text() / Request.json() handlers
app.use(express.raw({ type: "*/*", limit: "50mb" }));

// Helper to convert Express req to Web Request
function expressToWebRequest(req: express.Request): Request {
  const protocol = req.protocol;
  const host = req.get("host");
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const val of value) {
          headers.append(key, val);
        }
      } else {
        headers.set(key, value);
      }
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
      init.body = req.body as any;
    }
  }

  const webReq = new Request(fullUrl, init) as any;
  webReq.nextUrl = new URL(fullUrl);
  return webReq;
}

const apiDir = path.join(__dirname, "app/api");

function getRoutes(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getRoutes(filePath, fileList);
    } else if (file === "route.ts") {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function registerRoutes() {
  const routeFiles = getRoutes(apiDir);
  console.log(`🔍 Found ${routeFiles.length} API route files to register.`);

  for (const routeFile of routeFiles) {
    const relativePath = path.relative(apiDir, routeFile);
    const dirPath = path.dirname(relativePath);
    
    // Convert next.js routing convention to express routes:
    // e.g. "crm/leads/[id]" -> "/api/crm/leads/:id"
    // e.g. "auth/[...nextauth]" -> "/api/auth/*"
    let expressPath = "/api/" + dirPath
      .replace(/\\/g, "/") // Normalise backslashes for Windows
      .replace(/\[\.\.\.[^\]]+\]/g, "*")
      .replace(/\[([^\]]+)\]/g, ":$1");

    if (dirPath === ".") {
      expressPath = "/api";
    }

    try {
      const routeModule = await import(`./app/api/${dirPath}/route`);
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];
      
      const registered: string[] = [];
      for (const method of methods) {
        const handler = routeModule[method];
        if (handler) {
          app[method.toLowerCase() as "get" | "post" | "put" | "delete"](
            expressPath,
            async (req, res) => {
              const webRequest = expressToWebRequest(req);
              
              await requestStorage.run(webRequest, async () => {
                try {
                  const webResponse = await handler(webRequest, { params: req.params });
                  
                  // Copy status
                  res.status(webResponse.status);
                  
                  // Copy headers
                  webResponse.headers.forEach((value: string, key: string) => {
                    res.setHeader(key, value);
                  });
                  
                  // Read body and send
                  const arrayBuffer = await webResponse.arrayBuffer();
                  const bodyBuffer = Buffer.from(arrayBuffer);
                  
                  if (bodyBuffer.length > 0) {
                    res.send(bodyBuffer);
                  } else {
                    res.end();
                  }
                } catch (error) {
                  console.error(`❌ Error in ${method} ${req.originalUrl}:`, error);
                  res.status(500).json({ error: "Internal Server Error" });
                }
              });
            }
          );
          registered.push(method);
        }
      }
      
      if (registered.length > 0) {
        console.log(`✅ Registered route: [${registered.join(",")}] ${expressPath}`);
      }
    } catch (e) {
      console.error(`❌ Failed to load route module for ${routeFile}:`, e);
    }
  }
}

async function startServer() {
  await registerRoutes();
  
  // Basic health check
  app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date() });
  });

  // Catch-all for undefined routes
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Standalone Backend Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting backend server:", err);
});
