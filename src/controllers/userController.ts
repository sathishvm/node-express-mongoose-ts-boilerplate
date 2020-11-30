import { User } from '../models';
import { AppError, catchAsync } from '../utils';
import HTTP_STATUS from 'http-status';
import { Request, Response, NextFunction } from 'express';

const filterObj = (obj: any, ...allowedFields: any[]) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const users = await User.find();

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      results: users.length,
      data: {
        users,
      },
    });
  }
);

const getUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);

    if (!user)
      return next(
        new AppError('User not found with this ID.', HTTP_STATUS.NOT_FOUND)
      );

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: {
        user,
      },
    });
  }
);

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      data: {
        user,
      },
    });
  }
);

const updateUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return next(
        new AppError('User not found by the ID', HTTP_STATUS.NOT_FOUND)
      );
    }

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: {
        user,
      },
    });
  }
);

const deleteUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return next(
        new AppError('User not found by the ID', HTTP_STATUS.NOT_FOUND)
      );
    }

    res.status(HTTP_STATUS.NO_CONTENT).json({
      status: 'success',
      data: {},
    });
  }
);

const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.params.id = req.user.id;
    next();
  }
);

const updateMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. check if the user POST's a password
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          'This route is not to update the password. Please use /updateMyPassword',
          HTTP_STATUS.BAD_REQUEST
        )
      );
    }

    // 2. Filter the unwanted data from the req.body
    const filteredBody = filterObj(req.body, 'name', 'email');

    // 3. Find the user and update details with the filtered data
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    // 4. Send response
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  }
);

const deleteMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 3. Find the user and set inactive
    const deletedUser = await User.findByIdAndDelete(req.user.id);

    // 4. Send response
    res.status(204).json({
      status: 'success',
      data: null,
    });
  }
);

export const userController = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  deleteMe,
};
