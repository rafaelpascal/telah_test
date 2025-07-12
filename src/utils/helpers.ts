import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 15 * 60 * 10000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  handler: (req, res) => {
    res.status(429).json({ error: "Too many requests. Slow down!" });
  },
});
