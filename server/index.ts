import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedSkills } from "./seed-skills";
import { seedGpRates } from "./seed-gp-rates";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Dashboard password protection - only active when DASHBOARD_PASSWORD env var is set
if (process.env.DASHBOARD_PASSWORD) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip: dink webhook (RuneLite needs public access), and API health checks
    if (req.path === '/api/dink' || req.path === '/api/bot-status') return next();

    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
      const password = credentials.split(':').slice(1).join(':'); // allow colons in password
      if (password === process.env.DASHBOARD_PASSWORD) return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Dragon Services Dashboard"');
    res.status(401).send('Access denied. Enter your dashboard password.');
  });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seed skills and GP rates on startup (ensures data exists in both dev and production)
  try {
    await seedSkills();
  } catch (error) {
    console.error('Failed to seed skills:', error);
  }

  try {
    await seedGpRates();
  } catch (error) {
    console.error('Failed to seed GP rates:', error);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
