import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class AuthController {
  // Generate JWT token
  generateToken(userId) {
    return jwt.sign(
      { id: userId }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  // Register new user
  register = async (req, res) => {
    try {
      const { username, email, password, role, organization } = req.body;

    
      if (!username || !email || !password) {
        return res.status(400).json({ 
          error: 'Please provide username, email, and password' 
        });
      }

 
      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });

      if (existingUser) {
        return res.status(400).json({ 
          error: existingUser.email === email 
            ? 'Email already registered' 
            : 'Username already taken' 
        });
      }

 
      const user = await User.create({
        username,
        email,
        password,
        role: role || 'viewer',
        organization: organization || 'default'
      });

    
      const token = this.generateToken(user._id);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          organization: user.organization
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ error: messages.join(', ') });
      }

      res.status(500).json({ 
        error: 'Registration failed. Please try again.' 
      });
    }
  };

  // Login user
  login = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Please provide email and password' 
        });
      }

     
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      if (!user.isActive) {
        return res.status(401).json({ 
          error: 'Account is deactivated. Please contact administrator.' 
        });
      }

   
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      
      const token = this.generateToken(user._id);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          organization: user.organization
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        error: 'Login failed. Please try again.' 
      });
    }
  };

  getCurrentUser = async (req, res) => {
    try {
      
      res.json({
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          organization: req.user.organization,
          isActive: req.user.isActive,
          createdAt: req.user.createdAt
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user profile' 
      });
    }
  };

  // Update user profile
  updateProfile = async (req, res) => {
    try {
      const { username, email } = req.body;
      const userId = req.user._id;

      const updateData = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;

      // Check if username/email is already taken by another user
      if (username || email) {
        const existingUser = await User.findOne({
          _id: { $ne: userId },
          $or: [
            username ? { username } : {},
            email ? { email } : {}
          ].filter(obj => Object.keys(obj).length > 0)
        });

        if (existingUser) {
          return res.status(400).json({ 
            error: existingUser.username === username 
              ? 'Username already taken' 
              : 'Email already registered' 
          });
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          organization: user.organization
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ error: messages.join(', ') });
      }

      res.status(500).json({ 
        error: 'Failed to update profile' 
      });
    }
  };

  // Change password
  changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user._id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          error: 'Please provide current and new password' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          error: 'New password must be at least 6 characters' 
        });
      }

 
      const user = await User.findById(userId).select('+password');

 
      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Current password is incorrect' 
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ 
        error: 'Failed to change password' 
      });
    }
  };

  // Admin: Get all users
  getAllUsers = async (req, res) => {
    try {
      const { page = 1, limit = 10, role, organization, search } = req.query;

      const query = {};
      
      // Organization-based filtering: Admins can only see users from their organization
      // Unless they are super admin (we can check if organization is 'super' or handle differently)
      if (req.user.role === 'admin') {
        query.organization = req.user.organization;
      }
      
      if (role) query.role = role;
      if (organization && req.user.role === 'admin') {
        query.organization = organization;
      }
      
      // Search by username or email
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('-password')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      res.json({
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          usersPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch users' 
      });
    }
  };

  // Admin: Update user role
  updateUserRole = async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['viewer', 'editor', 'admin'].includes(role)) {
        return res.status(400).json({ 
          error: 'Invalid role. Must be viewer, editor, or admin' 
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if admin is trying to update user from their organization
      if (req.user.role === 'admin' && user.organization !== req.user.organization) {
        return res.status(403).json({ 
          error: 'You can only update users from your organization' 
        });
      }

      user.role = role;
      await user.save();

      res.json({
        message: 'User role updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          organization: user.organization,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ 
        error: 'Failed to update user role' 
      });
    }
  };

  // Admin: Deactivate/activate user
  toggleUserStatus = async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if admin is trying to update user from their organization
      if (req.user.role === 'admin' && user.organization !== req.user.organization) {
        return res.status(403).json({ 
          error: 'You can only update users from your organization' 
        });
      }

      user.isActive = !user.isActive;
      await user.save();

      res.json({
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error('Toggle user status error:', error);
      res.status(500).json({ 
        error: 'Failed to update user status' 
      });
    }
  };
}

export default AuthController;
