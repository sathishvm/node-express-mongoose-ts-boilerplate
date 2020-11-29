import { Router } from 'express';
import { userRoute } from './userRoutes';

const router = Router();
router.use('/users', userRoute);

export { router };
