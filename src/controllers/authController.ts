import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { User } from '../models';
import { AppError } from '../utils';
import { catchAsync } from '../utils';
import { config } from '../config/config';
import HTTP_STATUS from 'http-status';
import { Email } from '../utils';

import { Request, Response, NextFunction } from 'express';

const createToken = (id: string) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpirationTime,
  });
};

const sendCreatedToken = (user: any, statusCode: number, res: Response) => {
  const token: string = createToken(user._id);

  const cookieOptions: any = {
    expires: new Date(
      Date.now() + config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000 // 1hr = 3600000 milliseconds
    ),
    httpOnly: true,
  };

  if (config.env === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Check if the email is already exists
    if (await User.isEmailTaken(req.body.email)) {
      return next(new AppError('Email already taken', HTTP_STATUS.BAD_REQUEST));
    }
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    // Send the welcome e-mail to the user
    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();

    sendCreatedToken(newUser, HTTP_STATUS.CREATED, res);
  }
);

const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    // 1. Check if username or email and password exits
    if (!email || !password) {
      return next(
        new AppError(
          'Please provide email and password',
          HTTP_STATUS.BAD_REQUEST
        )
      );
    }

    // 2. If no user found give error
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isPasswordMatch(password, user.password)) {
      return next(
        new AppError('Incorrect email or password', HTTP_STATUS.UNAUTHORIZED)
      );
    }

    // 3. If user exits give a token
    sendCreatedToken(user, HTTP_STATUS.OK, res);
  }
);

const logout = (req: Request, res: Response) => {
  res.cookie('jwt', '', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(HTTP_STATUS.OK).json({ status: 'success' });
};

const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Check if user have token
    let token: string;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // FIXME: enable req.cookie.jwt when app is set to production otherwise it will give error

    // else if (req.cookie.jwt) {
    //   token = req.cookie.jwt;
    // }

    // 2. If there is no token send error
    if (!token) {
      return next(
        new AppError('Please Login to get access.', HTTP_STATUS.UNAUTHORIZED)
      );
    }

    // 3. verify token with jwt
    const decoded: any = jwt.verify(token, config.jwt.secret);

    // 4. Check if user is still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          HTTP_STATUS.UNAUTHORIZED
        )
      );
    }

    // 5. Check if the user changed password after token as issued.
    if (currentUser.changedPasswordAfterToken(decoded.iat)) {
      return next(
        new AppError(
          'User recently changed password! Please log in again.',
          HTTP_STATUS.UNAUTHORIZED
        )
      );
    }

    // 6. If all true allow access
    req.user = currentUser;
    next();
  }
);

const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if the user has its role to perform task && if not send error
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You don't have permission to perform this action",
          HTTP_STATUS.FORBIDDEN
        )
      );
    }

    // If he has the correct role give permission
    next();
  };
};

const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Check the email is exists or not
    const user = await User.findOne({ email: req.body.email });

    // 2. If not send a error
    if (!user) {
      return next(
        new AppError(
          'There is no user with email address.',
          HTTP_STATUS.NOT_FOUND
        )
      );
    }

    // 3. If true create a reset password token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 4. Send token via the user mail
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    try {
      // await sendEmail({
      //   email: user.email,
      //   subject: 'Company Name password reset token (valid for 10 min)',
      //   message,
      // });

      //  TODO: remove token from response

      await new Email(user, resetURL).sendPasswordReset();

      res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Token sent to email!',
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError(
          'There was an error sending the email. Try again later!',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get token and hash it
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      return next(
        new AppError('Token is invalid or has expired', HTTP_STATUS.BAD_REQUEST)
      );
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 5. Create token and get sign in
    sendCreatedToken(user, HTTP_STATUS.OK, res);
  }
);

const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 0. Check if the email is already exists

    if (await User.isEmailTaken(req.body.email)) {
      return next(
        new AppError('Email already exists', HTTP_STATUS.BAD_REQUEST)
      );
    }

    // 1. Get user by the id
    const user = await User.findById(req.user.id).select('+password');

    // 2. Check if current POSTed password is correct
    if (
      !(await user.isPasswordMatch(req.body.passwordCurrent, user.password))
    ) {
      return next(
        new AppError('Your password is wrong!.', HTTP_STATUS.UNAUTHORIZED)
      );
    }

    // 3. If so, update the user password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // 4. Get login again
    sendCreatedToken(user, HTTP_STATUS.OK, res);
  }
);

export const authController = {
  signup,
  login,
  logout,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
};
