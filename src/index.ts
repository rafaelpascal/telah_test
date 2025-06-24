import express from "express";
import cors from "cors";
import { errorMiddleware } from "./packages/error-handlers/error-middleware";
import cookieParser from "cookie-parser";
import router from "./routes/pdf.route";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger-output.json" assert { type: "json" };
import { config } from "dotenv";
config();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

// Apply Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  handler: (req, res) => {
    res.status(429).json({ error: "Too many requests. Slow down!" });
  },
});
app.use(limiter);

app.get("/", (req, res) => {
  res.send("Hello Friend!!👋, Welcome to Telah reciept pdf generator.");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/api-docs.json", (req, res) => {
  res.json(swaggerDocument);
});

app.use("/api", router);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    errorMiddleware(err, req, res, next);
  }
);

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on("error", console.error);
