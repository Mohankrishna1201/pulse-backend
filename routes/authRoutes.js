import express from 'express';
import AuthController from '../controllers/authController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const authController = new AuthController();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (require authentication)
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);

// Admin only routes
router.get('/users', authenticate, requireRole('admin'), authController.getAllUsers);
router.put('/users/:userId/role', authenticate, requireRole('admin'), authController.updateUserRole);
router.put('/users/:userId/toggle-status', authenticate, requireRole('admin'), authController.toggleUserStatus);

export default router;
