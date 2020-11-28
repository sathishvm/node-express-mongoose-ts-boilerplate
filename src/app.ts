import path from 'path';
import { requestLogger } from './middlewares';

// tslint:disable-next-line: no-duplicate-imports
import { limiter as apiLimiter } from './middlewares';

import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import bodyParser from 'body-parser';

import pug from 'pug';

import express, { Application, Response, Request } from 'express';

const app: Application = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Global Middleware
// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(requestLogger);
}

// HTTP Security Header Middleware
app.use(helmet());

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
    whitelist: [], // FIXME : Create whitelist those need to be done!!!
  })
);

// Routes
// app.use('/api/v1');

app.get('/', (req: Request, res: Response) => {
  res.send('TS App is Running');
});

// If no other routes is found this middleware will trigger.

// TODO : AppError utility
// app.all('*', (req, res, next) => {
//   next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
// });

// Global error controller => ( will control errors coming from all of the files. )
// TODO : Want to setup global error controller
// app.use(globalErrorController);

export { app };
