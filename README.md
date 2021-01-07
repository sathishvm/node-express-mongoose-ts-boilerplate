# RESTful API Node Server Boilerplate

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

A boilerplate/starter template for quickly building RESTful APIs using Node.js, Express, and Mongoose with TypeScript.

It comes with many built-in features, such as authentication using JWT, pagination, etc. For more details about the features, check the list below.

---

If you're a new beginner who starting nodejs + typescript for first time. I recommend you to watch this youtube lectures, tutorials and blog posts. This will help you to find what is going on in this boilerplate and this help you to gain the basic knowledge of nodejs + typescript.

[TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

[IN 0-60 WITH TYPESCRIPT AND NODE JS](https://www.youtube.com/watch?v=vxvQPHFJDRo)

[Beginner Node.js + TypeScript](https://www.youtube.com/watch?v=1UcLoOD1lRM)

[Restful API with NodeJS, Express, Typescript & Mongo / Mongoose](https://www.youtube.com/watch?v=lNqaQ0wEeAo)

[Building a Production - Ready Node.js App with TypeScript](https://cloudnweb.dev/2019/09/building-a-production-ready-node-js-app-with-typescript-and-docker/)

[Complete guide for Typescript with Mongoose for Node.js](https://medium.com/@agentwhs/complete-guide-for-typescript-for-mongoose-for-node-js-8cc0a7e470c1)

This blog post will explain you that how to create a strong typed model. I strongly recommend this one to read. 👇️

[Strongly typed models with Mongoose and TypeScript](https://medium.com/@tomanagle/strongly-typed-models-with-mongoose-and-typescript-7bc2f7197722)

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Error Handling](#error-handling)
- [Validation](#validation)
- [Authentication and Authorization](#authentication-and-authorization)
- [Logging](#logging)
- [Linting](#linting)

## Features

- **NoSQL database**: [MongoDB](https://www.mongodb.com) object data modeling using [Mongoose](https://mongoosejs.com)
- **Authentication and authorization**: custom auth using [jwt](https://www.jwt.io)
- **Validation**: custom validation
- **Logging**: using [morgan](https://github.com/expressjs/morgan) for development only.
- **Error handling**: centralized error handling mechanism
- **Dependency management**: with [NPM](https://npmjs.com)
- **Environment variables**: using [dotenv](https://github.com/motdotla/dotenv)
- **Security**: set security HTTP headers using [helmet](https://helmetjs.github.io)
- **Santizing**: sanitize request data against xss and query injection
- **CORS**: Cross-Origin Resource-Sharing enabled using [cors](https://github.com/expressjs/cors)
- **Compression**: gzip compression with [compression](https://github.com/expressjs/compression)
- **Linting**: with [TSLint](https://palantir.github.io/tslint/) and [Prettier](https://prettier.io)

## Getting Started

### Installation

Clone the repo:

```bash
git clone https://github.com/SathishBublu/node-express-mongoose-ts-boilerplate.git
cd node-express-mongoose-ts-boilerplate
```

Install the dependencies:

```bash
npm install
```

Set the environment variables:

```bash
cp config.env.example config.env

# open config.env and modify the environment variables (if needed)
```

### Commands

Running locally as typescript:

```bash
npm dev
```

For Build:

```bash
npm build
```

Testing production locally (builded - javascript):

```bash
npm start:prod
```

Running in production (builded - javascript):

```bash
npm start
```

## Project Structure

```
src\
 |--@types\         # Declared @types modules
 |--config\         # Environment variables and configuration related things
 |--controllers\    # Route controllers (controller layer)
 |--middlewares\    # Custom express middlewares
 |--models\         # Mongoose models (data layer)
 |--routes\         # Routes
 |--utils\          # Utility classes and functions
 |--app.ts          # Express app
 |--server.ts       # App entry point
```

### API Endpoints

List of available routes:

**Auth routes**:

`POST /v1/users/signup` - signup\
`POST /v1/users/login` - login\
`POST /v1/users/forgotPassword` - send reset password email\
`POST /v1/users/resetPassword` - reset password

**User routes**:

(Admin access only) \
`POST /v1/users` - create a user\
`GET /v1/users` - get all users

(Admin and Users access)

`GET /v1/users/:userId` - get user\
`PATCH /v1/users/:userId` - update user\
`DELETE /v1/users/:userId` - delete user

## Error Handling

The app has a centralized error handling mechanism.

Controllers should try to catch the errors and forward them to the error handling middleware (by calling `next(error)`). For convenience, you can also wrap the controller inside the catchAsync utility wrapper, which forwards the error.

### With catchAsync

```javascript
import catchAsync from '../utils/';
import AppError from '../utils/';
import { Request, Response, NextFunction } from 'express';

const controller = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // this error will be forwarded to the error handling middleware
    throw new Error('Something wrong happened');
  }
);
```

### Without Async

```javascript
import { catchAsync, AppError } from '../utils/';

const controller = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Your code goes here...
    } catch (error) {
      // this error will be forwarded to the error handling middleware
      return next(error);
    }
  }
);
```

The error handling middleware sends an error response, which has the following format:

```json
{
  "status": "fail",
  "statusCode": 404,
  "message": "Something went wrong",
  "isOperational": true
}
```

When running in development mode, the error response also contains the error stack.

The app has a utility AppError class to which you can attach a response code and a message, and then throw it from anywhere (catchAsync will catch it).

For example, if you are trying to get a user from the Database who is not found, and you want to send a 404 error, the code should look something like:

```javascript
import HTTP_STATUS from 'http-status';
import { AppError } from '../utils';
import { User } from '../models';

const getUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }
};
```

## Validation

Request data is validated by custom validations in the controller itself.

You can go through the coding to know what is happening in the data validation.

**Generating Access Tokens**:

An access token can be generated by making a successful call to the register (`POST /v1/users/signup`) or login (`POST /v1/users/login`) endpoints.

An access token is valid for 30 minutes (default by the time provided by the config.env). You can modify this expiration time by changing the `JWT_ACCESS_EXPIRATION_TIME` environment variable in the config.env file.

## Authentication and Authorization

The `authController` middleware can also be used to require certain rights/permissions to access a route.

```javascript
import { Router } from 'express';
import { userController } from '../controllers';
import { authController } from '../controllers';

const router = express.Router();

router
  .route('/')
  .post(authController.restrictTo('user', 'admin'), userController.createUser);
```

In the example above, an authenticated user can access this route only if that user has the `user or admin` permission.

The permissions are role-based. There are only two types of permissions ['user','admin']. You can add many more as you want in the models.

If the user making the request does not have the required permissions to access this route, a Forbidden (403) error is thrown.

## Logging

Import the logger from `src/middlewares/logger.ts`. It is using the [morgan](https://github.com/expressjs/morgan#readme) logging library. ( For development purpose only )

```javascript
import { requestLogger } from './middlewares';

if (config.env === 'development') {
  app.use(requestLogger);
}
```

Note: API request information (request url, response code, timestamp, etc.)

### paginate

The paginate, a utility is used and it named as apiFeatures. You can find this utility in the util folder.

Adding this plugin to the `User` model or any model to your schema will allow you to do the following:

```javascript
const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const features = await new APIFeatures(User.find(), req.query)
      .filter()
      .sort()
      .selectFields()
      .paginate(User);

    const users = await features.query;
    const pagination = features.pagination;

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      results: users.length,
      pagination,
      data: {
        users,
      },
    });
  }
);
```

The ApiFeatures class has two params such as model to find and the second one is the absolute req.query data.

The filter() function is used to filter the query thats needs to be added or removed.

The sort() function is used to sort the data that has been sent by the req.query.

The selectFields() function is used to select the fileds thats only need to query from the api.

The paginate() function is used to paginate the data itself. Actually the paginate function accepts `Model` itself to restrict the data

If you need to find what exactly goes in please go ahead and check the apiFeatures.ts file utility.

## Linting

Linting is done using [TSLint](https://palantir.github.io/tslint/) and [Prettier](https://prettier.io).

In this app, TSLint is configured also extends [tslint-config-prettier](https://github.com/prettier/tslint-config-prettier) to turn off all rules that are unnecessary or might conflict with Prettier.

To modify the TSLint configuration, update the `tslint.json` file. To modify the Prettier configuration, update the `.prettierrc` file.

To prevent a certain file or directory from being linted, add it to `linterOptions` in tslint.json

```json
"linterOptions": {
      "exclude": [
          "bin",
          "lib/*generated.ts"
      ]
  }
```

and in `.prettierignore` you can add the files name or directories simply as normal.

## Contributing

Contributions are more than welcome!.

## License

[MIT](LICENSE)
