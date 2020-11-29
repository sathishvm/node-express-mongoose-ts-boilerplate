import { Response, Request, NextFunction } from 'express';

type ReqWithResAlsoNext = (
  req: Request,
  res: Response,
  next: NextFunction
) => any;

const catchAsync = (fn: ReqWithResAlsoNext) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

export { catchAsync };
