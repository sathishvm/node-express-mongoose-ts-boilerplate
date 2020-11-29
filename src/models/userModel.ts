import { Document, Schema, model, Model } from 'mongoose';
import { isEmail } from 'validator';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

interface IUser extends Document {
  name: string;
  email: string;
  role?: string;
  password: string;
  passwordConfirm: string | undefined;
  passwordChangedAt?: Date | number;
  passwordResetToken?: string;
  passwordResetExpires?: Date | number;
  image?: string;
}

const userSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: [isEmail, 'Please provide a valid email,'],
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: [8, "Password must have minimum 8 character's"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        // make sure only use of create() and save() else it won't validate by mongoose query
        validator: function (el: string) {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
    },
    role: {
      type: String,
      enum: ['user', 'admin'], // add roles as much you need
      default: 'user',
    },
    image: {
      type: String,
      default: 'default.jpg',
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);

  this.passwordConfirm = undefined;

  next();
});

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;

  next();
});

userSchema.statics.isEmailTaken = async function (email: any) {
  const user = await this.findOne({ email });
  console.log(user);
  return !!user;
};

userSchema.methods.isPasswordMatch = async function (
  candidatePassword: string,
  userPassword: string
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfterToken = function (
  JWTTimestamp: number | string
) {
  if (this.passwordChangedAt) {
    const passwordChangedTimestamp = this.passwordChangedAt.getTime() / 1000;

    return JWTTimestamp < passwordChangedTimestamp;
  }

  // false means that the user does not change password after token issued.
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

interface UserBaseDocument extends IUser, Document {
  isPasswordMatch(candidatePassword: string, userPassword: string): boolean;
  changedPasswordAfterToken(JWTTimestamp: number | string): boolean;
  createPasswordResetToken(): string;
}

interface UserModel extends Model<UserBaseDocument> {
  isEmailTaken(email: string): any;
}

export const User = model<UserBaseDocument, UserModel>('User', userSchema);
