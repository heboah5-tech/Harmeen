import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { createServer, type Server } from "http";
import { registerRoutes } from "../server/routes";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

let cachedApp: Express | null = null;
let initPromise: Promise<Express> | null = null;

async function buildApp(): Promise<Express> {
  const app = express();

  const MemoryStore = createMemoryStore(session);
  app.use(
    session({
      name: "connect.sid",
      secret:
        process.env.SESSION_SECRET || "saptco-dev-session-secret-change-me",
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 8,
      },
      store: new MemoryStore({ checkPeriod: 1000 * 60 * 60 }),
    }),
  );

  app.set("trust proxy", true);

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  const httpServer: Server = createServer(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  return app;
}

async function getApp(): Promise<Express> {
  if (cachedApp) return cachedApp;
  if (!initPromise) {
    initPromise = buildApp().then((a) => {
      cachedApp = a;
      return a;
    });
  }
  return initPromise;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
