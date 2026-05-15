import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();

const MemoryStore = createMemoryStore(session);
app.use(
  session({
    name: "connect.sid",
    secret: process.env.SESSION_SECRET || "saptco-dev-session-secret-change-me",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 1000 * 60 * 60 * 8,
    },
    store: new MemoryStore({ checkPeriod: 1000 * 60 * 60 }),
  }),
);

app.set("trust proxy", true);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);
const ready = registerRoutes(httpServer, app).then(() => {
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    if (res.headersSent) return next(err);
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });
});

export default async function handler(req: any, res: any) {
  await ready;
  return (app as any)(req, res);
}
