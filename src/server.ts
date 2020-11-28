import mongoose from 'mongoose';
import { config } from './config/config';

process.on('uncaughtException', (err: Error) => {
  console.warn('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

import { app } from './app';

mongoose
  .connect(config.mongodb.url, config.mongodb.options)
  .then(() => {
    console.log('DB Connected Successfully');
  })
  .catch((error) => {
    console.log('Error: DB not Connected :', error.name);
  });

const port = config.port;

const server = app.listen(port, () => {
  console.log(`App started running on port ${port}...`);
});

process.on('unhandledRejection', (err: Error) => {
  console.warn('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
