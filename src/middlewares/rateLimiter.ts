import rateLimit from 'express-rate-limit';

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message:
    'Too many requests from this IP, please try again later after an hour.',
  skipSuccessfulRequests: true,
});
