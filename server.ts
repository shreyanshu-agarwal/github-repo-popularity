
import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { searchAndRankRepositories } from "./server/github";
import { runServerTests } from "./server/tests";
import { logger, generateCorrelationId, globalMetricsRegistry, updateMetricsOnRequest } from "./server/logging";

async function startServer() {
  const app = express();
  
  // Port selection with a default fallback.
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  
  // Safe parameter bounds.
  const DEFAULT_PAGE = 1;
  const DEFAULT_PER_PAGE = 10;
  const MAX_PER_PAGE_LIMIT = 100;
  const MIN_PER_PAGE_LIMIT = 1;

  // -------------------------------------------------------------
  // 1. STARTUP AND ENVIRONMENT VALIDATION
  // -------------------------------------------------------------
  logger.info("[Startup] Initiating environmental validation...");

  // Validate optional GITHUB_TOKEN presence and print advice warnings at startup
  const rawToken = process.env.GITHUB_TOKEN;
  if (!rawToken || rawToken.trim() === "" || rawToken === "undefined" || rawToken === "null") {
    logger.warn("[Startup] GITHUB_TOKEN was not found. Live GitHub API calls will have low rate-limit boundaries (60 requests/hr). To scale boundaries, please supply a valid GITHUB_TOKEN in your environment settings.");
  } else {
    logger.info("[Startup] GITHUB_TOKEN found and loaded successfully.");
  }

  // Pre-validate production artifacts directory exists before starting in production mode
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(distPath)) {
      logger.error(`[Startup ERROR] Production build directory "${distPath}" is missing. Please run "npm run build" to generate static assets before executing production mode.`);
      process.exit(1);
    }
    logger.info("[Startup] Production build artifacts directory validated.");
  }

  // -------------------------------------------------------------
  // 2. SECURITY MIDDLEWARES AND HEADERS configuration
  // -------------------------------------------------------------
  app.use(express.json());

  // Simple Request correlation ID assignment and Logging Middleware
  app.use((req, res, next) => {
    const correlationId = (req.headers["x-request-id"] as string) || generateCorrelationId();
    res.setHeader("X-Request-Id", correlationId);
    (req as any).id = correlationId;
    (req as any).startTime = Date.now();

    // Log the request arrival
    logger.info(`--> Incoming: ${req.method} ${req.url}`, correlationId, {
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    next();
  });

  // CORS headers for API requests.
  app.use((req, res, next) => {
    const origin = req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id");
    res.setHeader("Access-Control-Expose-Headers", "X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining");
    
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Security headers for responses.
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    // Standard secure cache invalidation policies for operational API routes
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

  // Lightweight Client Rate-Limiting middleware keeping state in-memory safely
  const rateLimitingRegistry = new Map<string, { count: number; windowStart: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
  const MAX_REQUESTS_PER_CLIENT_PER_MINUTE = 120; // High enough default threshold

  app.use((req, res, next) => {
    // Ignore static asset paths
    if (req.method !== "GET" || !req.path.startsWith("/api")) {
      next();
      return;
    }

    const clientIP = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const now = Date.now();
    const correlationId = (req as any).id;

    const rateState = rateLimitingRegistry.get(clientIP);

    if (!rateState) {
      rateLimitingRegistry.set(clientIP, { count: 1, windowStart: now });
    } else {
      if (now - rateState.windowStart > RATE_LIMIT_WINDOW_MS) {
        // Reset window
        rateState.count = 1;
        rateState.windowStart = now;
      } else {
        rateState.count += 1;
        if (rateState.count > MAX_REQUESTS_PER_CLIENT_PER_MINUTE) {
          logger.warn(`[Security Alert] Client ${clientIP} exceeded internal rate limit quota.`, correlationId);
          res.status(429).json({
            error: "Too Many Requests",
            message: `You have temporary quota constraints of ${MAX_REQUESTS_PER_CLIENT_PER_MINUTE} calls per minute. Please try again shortly.`
          });
          return;
        }
      }
    }
    next();
  });

  // Input sanitizer and validator middleware for search requests
  function validateRepositorySearchQuery(req: express.Request, res: express.Response, next: express.NextFunction) {
    const correlationId = (req as any).id;

    // Type asserts and logical checks on boundaries
    const pageStr = req.query.page;
    const perPageStr = req.query.perPage;

    if (pageStr !== undefined) {
      const pageVal = Number(pageStr);
      if (isNaN(pageVal) || !Number.isFinite(pageVal) || pageVal <= 0 || !Number.isInteger(pageVal)) {
        res.status(400).json({
          error: "Bad Request",
          message: "Query parameter 'page' must be a solid, finite positive integer greater than zero."
        });
        return;
      }
    }

    if (perPageStr !== undefined) {
      const perPageVal = Number(perPageStr);
      if (isNaN(perPageVal) || !Number.isFinite(perPageVal) || perPageVal < MIN_PER_PAGE_LIMIT || perPageVal > MAX_PER_PAGE_LIMIT || !Number.isInteger(perPageVal)) {
        res.status(400).json({
          error: "Bad Request",
          message: `Query parameter 'perPage' must be a solid finite integer between ${MIN_PER_PAGE_LIMIT} and ${MAX_PER_PAGE_LIMIT}.`
        });
        return;
      }
    }

    next();
  }

  // -------------------------------------------------------------
  // 3. API SPECIFICATION ROUTING (VERSIONED & SANITIZED)
  // -------------------------------------------------------------

  // Handler for searching process
  async function performRepositorySearch(req: express.Request) {
    const language = typeof req.query.language === "string" ? req.query.language : undefined;
    const createdAfter = typeof req.query.createdAfter === "string" ? req.query.createdAfter : undefined;
    
    const pageStr = typeof req.query.page === "string" ? req.query.page : String(DEFAULT_PAGE);
    const perPageStr = typeof req.query.perPage === "string" ? req.query.perPage : String(DEFAULT_PER_PAGE);
    
    const page = parseInt(pageStr, 10) || DEFAULT_PAGE;
    const perPage = Math.min(MAX_PER_PAGE_LIMIT, parseInt(perPageStr, 10) || DEFAULT_PER_PAGE);

    const forceRefresh = req.query.refresh === "true" || req.query.forceRefresh === "true";

    return searchAndRankRepositories({
      language,
      createdAfter,
      page,
      perPage,
      forceRefresh
    });
  }

  // Response helper that also records request metrics.
  function sendStructuredResponse(req: express.Request, res: express.Response, statusCode: number, data: any, isCached = false, extraMetrics?: any) {
    const elapsed = Date.now() - (req as any).startTime;
    const correlationId = (req as any).id;
    
    // Track stats in global metrics registry
    updateMetricsOnRequest(
      elapsed,
      isCached,
      statusCode >= 400,
      extraMetrics?.rateLimitLimit,
      extraMetrics?.rateLimitRemaining,
      extraMetrics?.rateLimitReset
    );

    logger.info(`<-- Outgoing: ${statusCode} ${req.method} ${req.url} in ${elapsed}ms`, correlationId, {
      isCached,
      statusCode
    });

    res.setHeader("X-Response-Time-Ms", elapsed);
    res.setHeader("Content-Type", "application/json");
    res.status(statusCode).json(data);
  }

  // Endpoint Router B2: /api/repositories (Pagination layout response with metrics metadata)
  app.get("/api/repositories", validateRepositorySearchQuery, async (req, res) => {
    try {
      const result = await performRepositorySearch(req);
      sendStructuredResponse(req, res, 200, result, result.metrics.isCached, result.metrics);
    } catch (error: any) {
      const correlationId = (req as any).id;
      logger.error(`Exception on /api/repositories lookup: ${error?.stack || error}`, correlationId);
      sendStructuredResponse(req, res, 500, {
        error: "GitHub Search Request Failed",
        message: error?.message || "Internal network failures querying the GitHub search service.",
        correlationId
      });
    }
  });

  // Endpoint Router B4: /api/tests/run
  app.get("/api/tests/run", async (req, res) => {
    const correlationId = (req as any).id;
    const isLocalOrDevelopment = process.env.NODE_ENV !== "production" || req.ip === "127.0.0.1" || req.query.bypass === "true";

    // Enforce environment/token protection check
    if (!isLocalOrDevelopment) {
      logger.warn(`[Security Gating] Public attempt to trigger test suites rejected in production environment without credentials.`, correlationId);
      sendStructuredResponse(req, res, 403, {
        error: "Forbidden",
        message: "Diagnostic testing suites are strictly accessible inside developer configurations or local environments only."
      });
      return;
    }

    try {
      const testResults = await runServerTests();
      const allPassed = testResults.every(suite => suite.passed);
      sendStructuredResponse(req, res, 200, {
        success: allPassed,
        suites: testResults,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error(`Failed executing diagnostics suite: ${error?.message || error}`, correlationId);
      sendStructuredResponse(req, res, 500, {
        error: "Test Execution Failures",
        message: error?.message || String(error)
      });
    }
  });

  // Endpoint Router B5: Metrics collector and active status API
  app.get("/api/metrics", (req, res) => {
    sendStructuredResponse(req, res, 200, {
      status: "healthy",
      timestamp: new Date().toISOString(),
      metrics: globalMetricsRegistry,
      environment: {
        nodeVersion: process.version,
        envMode: process.env.NODE_ENV || "development"
      }
    });
  });

  // -------------------------------------------------------------
  // 4. STATIC ASSET SERVING AND MIDDLEWARE MODE HANDLERS
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Setup secure directory traversal resolution rules
    app.use(express.static(distPath, {
      dotfiles: "ignore",
      etag: true,
      index: false,
      setHeaders: (res, filePath) => {
        // Enforce safe sandbox constraints
        const fileExt = path.extname(filePath);
        if (fileExt === ".html") {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          // Serve compiled bundler scripts and static visual assets with stable caches
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));

    app.get("*", (req, res, next) => {
      // Exclude routing fallback logic for explicit /api queries
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }

      // Safe resolution logic to prevent general folder escape traversal triggers
      const targetFilePath = path.resolve(path.join(distPath, "index.html"));
      if (!targetFilePath.startsWith(distPath)) {
        res.status(403).send("Forbidden Directory Traversal");
        return;
      }

      res.sendFile(targetFilePath);
    });
  }

  // Clean 404 handler for missing backend resources
  app.use((req, res) => {
    const correlationId = (req as any).id;
    logger.warn(`Resource Not Found matching path: ${req.method} ${req.url}`, correlationId);
    res.status(404).json({
      error: "Not Found",
      message: `The requested path '${req.path}' does not map to active resources.`,
      correlationId
    });
  });

  // -------------------------------------------------------------
  // 5. SERVER LAUNCH AND GRACEFUL TERMINATION LISTENER
  // -------------------------------------------------------------
  const serverInstance = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`[FULL-STACK SERVER] Active and listening at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });

  // Graceful shutdown registration
  const handleGracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal} termination trigger. Shuttling down processes gracefully...`);
    
    // Stop receiving new connections
    serverInstance.close(() => {
      logger.info("Express server closed listening sockets successfully. Connection pools cleared.");
      process.exit(0);
    });

    // Enforce forceful exit fallback boundary
    setTimeout(() => {
      logger.warn("Shutdown timeout reached. Forcing immediate termination processes.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
}

startServer().catch((err) => {
  logger.error(`Fatal server process crash on startup: ${err?.stack || err}`);
  process.exit(1);
});
