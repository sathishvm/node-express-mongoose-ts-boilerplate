import path from 'path';
import { config } from './config/config';
import { requestLogger } from './middlewares';
import { limiter as apiLimiter } from './middlewares';

import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import compression from 'compression'
import bodyParser from 'body-parser';
import { AppError } from './utils';
import pug from 'pug';
import { errorController as globalErrorController } from './controllers';
import { router } from './routes/routes';

import express, { Application, Response, Request, NextFunction } from 'express';

const app: Application = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Global Middleware

// HTTP Security Header Middleware
app.use(helmet());

if (config.env === 'development') {
  app.use(requestLogger);
}

// Enabling cors options
app.use(cors())
app.options('*',cors())

// gzip compression
app.use(compression())

// API request limiter
app.use('/api/', apiLimiter);

// Body Parser, reading data into req.body
app.use(express.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serving static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Data sanitization of NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against xss
app.use(xss());

// Preventing http parameter pollution
app.use(
  hpp({
    whitelist: [], // FIXME: Create whitelist those need to be done!!!
  })
);

// Routes
app.use('/api/v1', router);

app.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.send('TS App is Running');
});

// If no other routes is found this middleware will trigger.
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error controller => ( will control errors coming from all of the files. )
app.use(globalErrorController);

export { app };
