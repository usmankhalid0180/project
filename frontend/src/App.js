/**
 * Attendly - Employee Attendance Management System
 * Main Application Component
 * 
 * This is the root component that handles:
 * - User authentication (login, signup, password reset)
 * - Session management with JWT tokens
 * - Navigation between different pages
 * - Global notification system
 * - Integration with AttendanceSystem component
 * 
 * Author: [Your Name]
 * Date: January 2026
 * Course: Web Application Development
 */

import React, { useState, useEffect, useCallback } from 'react';
// Import icons from lucide-react for modern UI
import { 
  Menu, LogOut, User, Settings, BarChart3, FileText, Bell, Home, 
  Clock, CheckCircle, AlertCircle, TrendingUp, Calendar, Download,
  MapPin, Wifi, ChevronDown, Award
} from 'lucide-react';
import './App.css';
import AttendanceSystem from './AttendanceSystem'; // Employee management and attendance tracking component

// API Base URL - connects to Flask backend on port 5000
const API_URL = 'http://localhost:5000/api';

/**
 * Main App Component
 * Manages application state, authentication, and page routing
 */
const App = () => {
  // ===== STATE MANAGEMENT =====
  const [currentPage, setCurrentPage] = useState('login'); // Current active page (login/signup/reset-password/dashboard)
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Authentication status
  const [currentUser, setCurrentUser] = useState(null); // Current logged-in user data (name, email, is_admin, etc.)
  const [notification, setNotification] = useState(null); // Notification message {message, type}
  const [loading, setLoading] = useState(false); // Global loading state
  const [currentTime, setCurrentTime] = useState(new Date()); // Real-time clock for dashboard

  /**
   * Check for existing session on component mount
   * Restores user session if valid JWT token exists in localStorage
   * SECURITY FIX: Always fetch user data from backend, never trust localStorage user data
   * This prevents users from seeing each other's data when switching between accounts
   */
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      
      // CRITICAL SECURITY: Clear any stale user data first
      // This ensures no cached user data persists between sessions
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        console.log('[SECURITY] Clearing cached user data to prevent session leakage');
        localStorage.removeItem('user');
      }
      
      if (token) {
        try {
          console.log('[AUTH] Validating token and fetching fresh user data from backend');
          // SECURITY: Validate token with backend AND fetch current user data
          // Never trust localStorage user data - always fetch from backend
          const response = await fetch(`${API_URL}/user/info`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            // Token is valid, get FRESH user data from backend
            const data = await response.json();
            console.log(`[AUTH] Successfully authenticated user: ${data.user.name} (ID: ${data.user.id})`);
            setCurrentUser(data.user);
            // Update localStorage with fresh user data for offline reference
            localStorage.setItem('user', JSON.stringify(data.user));
            setIsLoggedIn(true);
            setCurrentPage('dashboard');
          } else {
            // Token invalid or expired, clear ALL session data
            console.log('[AUTH] Token validation failed - clearing session data');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentUser(null);
            setIsLoggedIn(false);
            setCurrentPage('login');
          }
        } catch (error) {
          // Network error or backend unreachable, clear ALL session data
          console.error('[AUTH ERROR] Token validation error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setCurrentUser(null);
          setIsLoggedIn(false);
          setCurrentPage('login');
        }
      } else {
        // No token found, ensure clean state
        console.log('[AUTH] No token found - showing login page');
        localStorage.removeItem('user');
        setCurrentUser(null);
        setIsLoggedIn(false);
        setCurrentPage('login');
      }
    };

    validateToken();
  }, []);

  /**
   * Global notification system
   * Displays success/error messages for 4 seconds
   * @param {string} message - Message to display
   * @param {string} type - Type of notification ('success' or 'error')
   */
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000); // Auto-dismiss after 4 seconds
  };

  /**
   * Login Page Component
   * Handles user authentication with employee ID and password
   * Validates input and communicates with backend API
   */
  const LoginPage = () => {
    // Form state for input fields
    const [formData, setFormData] = useState({
      password: '',
      employeeId: ''
    });
    const [errors, setErrors] = useState({}); // Form validation errors
    const [isSubmitting, setIsSubmitting] = useState(false); // Prevent double submission

    /**
     * Handle login form submission
     * Validates employee ID format and sends login request to backend
     * SECURITY: Always fetches fresh user data from backend after login
     */
    const handleSubmit = async () => {
      setErrors({});
      setIsSubmitting(true);

      // Client-side validation
      if (!formData.password || !formData.employeeId) {
        setErrors({ general: 'Please fill in all fields' });
        setIsSubmitting(false);
        return;
      }

      // Validate employee ID format (must be exactly 6 digits)
      if (formData.employeeId.length !== 6 || !/^\d{6}$/.test(formData.employeeId)) {
        setErrors({ general: 'Employee ID must be exactly 6 digits' });
        setIsSubmitting(false);
        return;
      }

      try {
        console.log(`[LOGIN] Attempting login for employee ID: ${formData.employeeId}`);
        
        // Send login request to backend
        const response = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: formData.password,
            employee_id: formData.employeeId
          })
        });

        const data = await response.json();

        if (response.ok) {
          console.log('[LOGIN] Authentication successful, storing token');
          
          // SECURITY FIX: Clear any existing user data first
          localStorage.removeItem('user');
          
          // Only save token, then fetch fresh user data from backend
          localStorage.setItem('token', data.token);
          
          // CRITICAL: Fetch fresh user data from backend using the new token
          // This ensures we never use stale or incorrect user data from previous sessions
          try {
            console.log('[LOGIN] Fetching fresh user data from backend');
            const userResponse = await fetch(`${API_URL}/user/info`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${data.token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              console.log(`[LOGIN] User data fetched successfully: ${userData.user.name} (ID: ${userData.user.id})`);
              setCurrentUser(userData.user);
              localStorage.setItem('user', JSON.stringify(userData.user));
              setIsLoggedIn(true);
              setCurrentPage('dashboard');
              showNotification('Login successful! Welcome back.', 'success');
            } else {
              console.error('[LOGIN ERROR] Failed to fetch user data from backend');
              throw new Error('Failed to fetch user data');
            }
          } catch (userError) {
            console.error('[LOGIN ERROR] Error fetching user data:', userError);
            // Fallback to login response data only if backend is completely unreachable
            console.warn('[LOGIN WARNING] Using fallback user data from login response');
            setCurrentUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
            setIsLoggedIn(true);
            setCurrentPage('dashboard');
            showNotification('Login successful! Welcome back.', 'success');
          }
        } else {
          console.error(`[LOGIN ERROR] Authentication failed: ${data.message}`);
          setErrors({ general: data.message || 'Login failed' });
          showNotification(data.message || 'Login failed', 'error');
        }
      } catch (error) {
        console.error('[LOGIN ERROR] Network error:', error);
        setErrors({ general: 'Cannot connect to server. Make sure backend is running!' });
        showNotification('Connection error! Check if backend is running.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md p-5 sm:p-6">
          <div className="text-center mb-4 sm:mb-5">
            {/* Attendly Logo */}
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shadow-lg mr-2">
                <CheckCircle className="text-white" size={window.innerWidth < 640 ? 24 : 32} />
              </div>
              <div className="text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent leading-tight">Attendly</h1>
                <p className="text-gray-600 text-xs">Smart Attendance</p>
              </div>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent mb-1">Welcome</h1>
            <p className="text-gray-600 text-xs sm:text-sm">Login to your attendance dashboard</p>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {errors.general && (
              <div className="bg-red-50 border-2 border-red-400 text-red-800 p-2.5 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-semibold mb-1.5 text-sm sm:text-base">Employee ID</label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-300 rounded-lg text-sm sm:text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                placeholder="123456"
                maxLength="6"
                disabled={isSubmitting}
              />
              <p className="text-gray-500 text-xs mt-0.5">6-digit unique ID</p>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1.5 text-sm sm:text-base">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-300 rounded-lg text-sm sm:text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2.5 sm:py-3 rounded-lg text-sm sm:text-base transition-all duration-200 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>

            <div className="mt-2 text-center">
              <button
                onClick={() => setCurrentPage('reset-password')}
                className="text-green-600 hover:text-green-700 font-semibold text-xs sm:text-sm underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <div className="mt-4 sm:mt-5 text-center">
            <p className="text-gray-600 text-xs sm:text-sm">
              Don't have an account?{' '}
              <button
                onClick={() => setCurrentPage('signup')}
                className="text-green-600 hover:text-green-700 font-semibold underline transition-colors"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Signup Page Component
   * Handles new user registration
   * Validates all required fields and password strength before submission
   */
  const SignupPage = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      employeeId: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * Handle signup form submission
     * Validates all fields, password match, and employee ID format
     */
    const handleSubmit = async () => {
      setErrors({});
      setIsSubmitting(true);

      // Validation
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.employeeId) {
        setErrors({ general: 'Please fill in all fields' });
        setIsSubmitting(false);
        return;
      }

      // Validate employee ID (6 digits)
      if (formData.employeeId.length !== 6 || !/^\d{6}$/.test(formData.employeeId)) {
        setErrors({ general: 'Employee ID must be exactly 6 digits' });
        setIsSubmitting(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setErrors({ password: 'Passwords do not match' });
        setIsSubmitting(false);
        return;
      }

      if (formData.password.length < 6) {
        setErrors({ password: 'Password must be at least 6 characters' });
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            employee_id: formData.employeeId
          })
        });

        const data = await response.json();

        if (response.ok) {
          showNotification('Account created successfully! Please login.', 'success');
          setCurrentPage('login');
        } else {
          setErrors({ general: data.message || 'Signup failed' });
          showNotification(data.message || 'Signup failed', 'error');
        }
      } catch (error) {
        console.error('Signup error:', error);
        setErrors({ general: 'Cannot connect to server. Make sure backend is running!' });
        showNotification('Connection error! Check if backend is running.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md p-4 sm:p-6 md:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="bg-green-600 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <User className="text-white" size={window.innerWidth < 640 ? 28 : 32} />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Create Account</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Sign up to get started</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
                {errors.general}
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm sm:text-base"
                placeholder="John Doe"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm sm:text-base"
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">Employee ID</label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm sm:text-base"
                placeholder="123456"
                maxLength="6"
                disabled={isSubmitting}
              />
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Enter your unique 6-digit Employee ID</p>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm sm:text-base"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm sm:text-base"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-red-600 text-xs sm:text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 sm:py-3.5 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>

          <div className="mt-5 sm:mt-6 text-center">
            <p className="text-gray-600 text-xs sm:text-sm">
              Already have an account?{' '}
              <button
                onClick={() => setCurrentPage('login')}
                className="text-green-600 hover:text-green-700 font-semibold underline transition-colors"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Reset Password Page Component
   * Allows users to reset their password using employee ID
   * Requires employee ID and validates password requirements
   */
  const ResetPasswordPage = () => {
    const [formData, setFormData] = useState({
      employeeId: '',
      newPassword: '',
      confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false); // Track successful password reset

    /**
     * Handle password reset form submission
     * Validates employee ID and password requirements before submission
     */
    const handleSubmit = async () => {
      setErrors({});
      setIsSubmitting(true);

      // Validation
      if (!formData.employeeId || !formData.newPassword || !formData.confirmPassword) {
        setErrors({ general: 'Please fill in all fields' });
        setIsSubmitting(false);
        return;
      }

      // Validate employee ID (6 digits)
      if (formData.employeeId.length !== 6 || !/^\d{6}$/.test(formData.employeeId)) {
        setErrors({ general: 'Employee ID must be exactly 6 digits' });
        setIsSubmitting(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setErrors({ password: 'Passwords do not match' });
        setIsSubmitting(false);
        return;
      }

      if (formData.newPassword.length < 6) {
        setErrors({ password: 'Password must be at least 6 characters' });
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: formData.employeeId,
            new_password: formData.newPassword
          })
        });

        const data = await response.json();

        if (response.ok) {
          setResetSuccess(true);
          showNotification('Password reset successfully! You can now login.', 'success');
          setTimeout(() => {
            setCurrentPage('login');
          }, 2000);
        } else {
          setErrors({ general: data.message || 'Password reset failed' });
          showNotification(data.message || 'Password reset failed', 'error');
        }
      } catch (error) {
        console.error('Reset password error:', error);
        setErrors({ general: 'Cannot connect to server. Make sure backend is running!' });
        showNotification('Connection error! Check if backend is running.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <Settings className="text-white" size={window.innerWidth < 640 ? 28 : 40} />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent mb-2">Reset Password</h1>
            <p className="text-gray-600 text-xs sm:text-sm">Enter your credentials to reset your password</p>
          </div>

          {resetSuccess ? (
            <div className="bg-green-50 border-2 border-green-500 text-green-800 p-4 sm:p-6 rounded-xl text-center">
              <CheckCircle className="mx-auto mb-3 text-green-500" size={window.innerWidth < 640 ? 40 : 48} />
              <p className="font-bold text-base sm:text-lg">Password Reset Successfully!</p>
              <p className="text-xs sm:text-sm mt-2">Redirecting to login...</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {errors.general && (
                <div className="bg-red-50 border-2 border-red-400 text-red-800 p-3 rounded-lg text-sm">
                  {errors.general}
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">Employee ID</label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg text-sm sm:text-base focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  placeholder="123456"
                  maxLength="6"
                  disabled={isSubmitting}
                />
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Your 6-digit employee ID</p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">New Password</label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg text-sm sm:text-base focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">Confirm New Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg text-sm sm:text-base focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                {errors.password && (
                  <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 sm:py-3.5 rounded-lg text-sm sm:text-base transition-all duration-200 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </div>
          )}

          <div className="mt-5 sm:mt-6 text-center">
            <p className="text-gray-600 text-xs sm:text-sm">
              Remember your password?{' '}
              <button
                onClick={() => setCurrentPage('login')}
                className="text-amber-600 hover:text-amber-700 font-semibold underline transition-colors"
              >
                Back to Login
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Dashboard Component - Main Attendance Management Interface
   * 
   * Features:
   * - Real-time clock display
   * - Check-in/check-out functionality
   * - Attendance records viewing
   * - Monthly attendance summary
   * - Multi-page navigation (overview, attendance, leave, reports, profile)
   */
  const Dashboard = () => {
    const [dashboardPage, setDashboardPage] = useState('overview'); // Current dashboard sub-page
    const [attendanceRecords, setAttendanceRecords] = useState([]); // User's attendance history
    const [checkInTime, setCheckInTime] = useState(null); // Today's check-in time
    const [checkOutTime, setCheckOutTime] = useState(null); // Today's check-out time
    const [todayStatus, setTodayStatus] = useState('absent'); // Today's attendance status
    const [attendanceSummary, setAttendanceSummary] = useState({ present_days: 0, late_days: 0, absent_days: 0, attendance_percentage: 0 }); // Monthly statistics
    const [currentTime, setCurrentTime] = useState(new Date()); // Real-time clock

    // Update clock display every second
    useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);

    /**
     * Fetch user's attendance records from backend on component mount
     * Loads records, summary statistics, and today's status
     */
    useEffect(() => {
      fetchAttendanceRecords();
      fetchAttendanceSummary();
      checkTodayStatus();
    }, []);

    /**
     * Fetch attendance records from backend API
     * Retrieves last 30 records for current user
     */
    const fetchAttendanceRecords = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/attendance/records`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && data.records) {
          setAttendanceRecords(data.records);
        }
      } catch (error) {
        console.error('Error fetching records:', error);
      }
    };

    /**
     * Fetch monthly attendance summary statistics
     * Calculates present/late/absent days and attendance percentage
     */
    const fetchAttendanceSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/attendance/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && data.summary) {
          setAttendanceSummary(data.summary);
        }
      } catch (error) {
        console.error('Error fetching summary:', error);
      }
    };

    /**
     * Check if user has already marked attendance today
     * Updates local state with today's check-in/check-out times
     */
    const checkTodayStatus = () => {
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = attendanceRecords.find(r => r.date === today);
      if (todayRecord) {
        setCheckInTime(todayRecord.check_in);
        setCheckOutTime(todayRecord.check_out);
        setTodayStatus(todayRecord.check_out ? 'present' : 'checked-in');
      }
    };

    /**
     * Handle check-in button click
     * Sends check-in request to backend with current time
     * Prevents duplicate check-ins on the same day
     */
    const handleCheckIn = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        
        const response = await fetch(`${API_URL}/attendance/check-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ time: timeString })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          const displayTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          setCheckInTime(displayTime);
          setTodayStatus('checked-in');
          showNotification('Check-in successful! ✓', 'success');
          fetchAttendanceRecords();
          fetchAttendanceSummary();
        } else {
          showNotification(data.message || 'Check-in failed', 'error');
        }
      } catch (error) {
        console.error('Check-in error:', error);
        showNotification('Connection error! Check if backend is running.', 'error');
      } finally {
        setLoading(false);
      }
    };

    /**
     * Handle check-out button click
     * Sends check-out request to backend with current time
     * Requires user to have already checked in today
     */
    const handleCheckOut = async () => {
      if (!checkInTime) {
        showNotification('Please check-in first', 'error');
        return;
      }
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        
        const response = await fetch(`${API_URL}/attendance/check-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ time: timeString })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          const displayTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          setCheckOutTime(displayTime);
          setTodayStatus('present');
          showNotification('Check-out successful! ✓', 'success');
          fetchAttendanceRecords();
          fetchAttendanceSummary();
        } else {
          showNotification(data.message || 'Check-out failed', 'error');
        }
      } catch (error) {
        console.error('Check-out error:', error);
        showNotification('Connection error! Check if backend is running.', 'error');
      } finally {
        setLoading(false);
      }
    };

    /**
     * Handle user logout
     * Clears localStorage and resets app state to login page
     */
    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentPage('login');
      showNotification('Logged out successfully', 'success');
    };

    // Overview Page - Main dashboard with real-time stats and quick actions
    const OverviewPage = () => {
      const totalPresent = attendanceSummary.present_days || 0;
      const attendancePercentage = attendanceSummary.attendance_percentage || 0;
      const currentHour = new Date().getHours();
      const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

      return (
        <div className="space-y-4 sm:space-y-6">
          {/* Top Stats Bar - Real-time Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Current Time & Date */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 sm:p-5 md:p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Clock size={window.innerWidth < 640 ? 20 : 24} className="opacity-80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Live</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold mb-1">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-xs sm:text-sm opacity-90">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
            </div>

            {/* Today's Status */}
            <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle size={window.innerWidth < 640 ? 20 : 24} className={todayStatus === 'present' ? 'text-green-500' : todayStatus === 'checked-in' ? 'text-blue-500' : 'text-gray-400'} />
                <div className={`w-3 h-3 rounded-full ${todayStatus === 'present' ? 'bg-green-500 animate-pulse' : todayStatus === 'checked-in' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
                {todayStatus === 'present' ? 'Present' : todayStatus === 'checked-in' ? 'Working' : 'Not Marked'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Today's Status</div>
            </div>

            {/* Monthly Attendance */}
            <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp size={window.innerWidth < 640 ? 20 : 24} className="text-green-500" />
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">{attendancePercentage}%</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{totalPresent} Days</div>
              <div className="text-xs sm:text-sm text-gray-600">Present This Month</div>
            </div>

            {/* Working Hours */}
            <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 size={window.innerWidth < 640 ? 20 : 24} className="text-blue-500" />
                <Award size={window.innerWidth < 640 ? 16 : 20} className="text-yellow-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">162.5 hrs</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Hours</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Check In/Out & Quick Actions */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Greeting Card */}
              <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-xl p-4 sm:p-5 md:p-6 text-white shadow-lg">
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1">{greeting}, {currentUser?.name}! 👋</h2>
                    <p className="text-green-50 text-xs sm:text-sm">Ready to make today productive?</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                    <Calendar className="text-white" size={window.innerWidth < 640 ? 24 : 32} />
                  </div>
                </div>
              </div>

              {/* Check-In/Out Card */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 flex items-center">
                    <Clock className="mr-2 text-green-600" size={window.innerWidth < 640 ? 20 : 24} />
                    <span className="hidden sm:inline">Attendance Control</span>
                    <span className="sm:hidden">Attendance</span>
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 rounded-full font-semibold">Today</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {/* Check-In */}
                  <div className={`p-3 sm:p-4 md:p-5 rounded-lg border-2 transition-all ${checkInTime ? 'bg-green-50 border-green-400 shadow-sm' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Check-In</p>
                      {checkInTime && <CheckCircle size={14} className="text-green-600" />}
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">{checkInTime || '--:--'}</p>
                    <button
                      onClick={handleCheckIn}
                      disabled={checkInTime !== null || loading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-2 sm:py-2.5 rounded-lg transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-md text-sm sm:text-base"
                    >
                      {checkInTime ? '✓ Checked In' : '→ Check In'}
                    </button>
                  </div>

                  {/* Status */}
                  <div className={`p-3 sm:p-4 md:p-5 rounded-lg border-2 flex flex-col justify-between transition-all ${
                    todayStatus === 'present' ? 'bg-green-50 border-green-400 shadow-sm' : 
                    todayStatus === 'checked-in' ? 'bg-blue-50 border-blue-400 shadow-sm' : 
                    'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
                  }`}>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-2 sm:mb-3">Status</p>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-pulse ${
                          todayStatus === 'present' ? 'bg-green-500' : 
                          todayStatus === 'checked-in' ? 'bg-blue-500' : 
                          'bg-gray-400'
                        }`}></div>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                          {todayStatus === 'present' ? 'Complete' : todayStatus === 'checked-in' ? 'Active' : 'Pending'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4 bg-white/50 rounded px-2 sm:px-3 py-1.5 sm:py-2">
                      <span className="text-xs text-gray-600 font-medium">
                        {todayStatus === 'present' ? '✓ Work completed' : todayStatus === 'checked-in' ? '⏱ In progress...' : '○ Not started'}
                      </span>
                    </div>
                  </div>

                  {/* Check-Out */}
                  <div className={`p-3 sm:p-4 md:p-5 rounded-lg border-2 transition-all ${checkOutTime ? 'bg-green-50 border-green-400 shadow-sm' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Check-Out</p>
                      {checkOutTime && <CheckCircle size={14} className="text-green-600" />}
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">{checkOutTime || '--:--'}</p>
                    <button
                      onClick={handleCheckOut}
                      disabled={!checkInTime || checkOutTime !== null}
                      className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-2 sm:py-2.5 rounded-lg transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-md text-sm sm:text-base"
                    >
                      {checkOutTime ? '✓ Checked Out' : '← Check Out'}
                    </button>
                  </div>
                </div>

                {/* Work Duration */}
                {checkInTime && (
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 sm:p-4 border border-indigo-200 mt-3 sm:mt-4">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Clock size={16} className="text-indigo-600" />
                        <span className="text-gray-700 font-medium text-sm sm:text-base">Work Duration</span>
                      </div>
                      <span className="text-xl sm:text-2xl font-bold text-indigo-600">
                        {checkOutTime ? '8h 45m' : `${Math.floor((new Date() - new Date(new Date().toDateString() + ' 09:00 AM')) / 3600000)}h ${Math.floor(((new Date() - new Date(new Date().toDateString() + ' 09:00 AM')) % 3600000) / 60000)}m`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                  <button className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all transform hover:scale-105 border border-blue-200">
                    <Calendar className="text-blue-600 mb-1.5 sm:mb-2" size={window.innerWidth < 640 ? 20 : 24} />
                    <span className="text-xs font-semibold text-gray-700 text-center">Request Leave</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all transform hover:scale-105 border border-purple-200">
                    <FileText className="text-purple-600 mb-1.5 sm:mb-2" size={window.innerWidth < 640 ? 20 : 24} />
                    <span className="text-xs font-semibold text-gray-700 text-center">View Reports</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all transform hover:scale-105 border border-green-200">
                    <Download className="text-green-600 mb-1.5 sm:mb-2" size={window.innerWidth < 640 ? 20 : 24} />
                    <span className="text-xs font-semibold text-gray-700 text-center">Export Data</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg transition-all transform hover:scale-105 border border-orange-200">
                    <Settings className="text-orange-600 mb-1.5 sm:mb-2" size={window.innerWidth < 640 ? 20 : 24} />
                    <span className="text-xs font-semibold text-gray-700 text-center">Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Stats & Activity */}
            <div className="space-y-4 sm:space-y-6">
              {/* Monthly Stats Card */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
                  <TrendingUp className="mr-2 text-green-600" size={window.innerWidth < 640 ? 18 : 20} />
                  This Month
                </h3>
                
                {/* Attendance Rate Circle */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-32 h-32">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                      <circle 
                        cx="64" cy="64" r="56" 
                        stroke="url(#gradient)" 
                        strokeWidth="12" 
                        fill="none" 
                        strokeDasharray={`${attendancePercentage * 3.51} 351.86`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-800">{attendancePercentage}%</div>
                        <div className="text-xs text-gray-500">Rate</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <CheckCircle size={14} className="text-green-600" />
                      <span className="text-xs sm:text-sm text-gray-700">Present Days</span>
                    </div>
                    <span className="font-bold text-green-600 text-sm sm:text-base">{attendanceSummary.present_days}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <AlertCircle size={14} className="text-yellow-600" />
                      <span className="text-xs sm:text-sm text-gray-700">Late Arrivals</span>
                    </div>
                    <span className="font-bold text-yellow-600 text-sm sm:text-base">{attendanceSummary.late_days}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <AlertCircle size={14} className="text-red-600" />
                      <span className="text-xs sm:text-sm text-gray-700">Absent Days</span>
                    </div>
                    <span className="font-bold text-red-600 text-sm sm:text-base">{attendanceSummary.absent_days}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
                  <Bell className="mr-2 text-blue-600" size={window.innerWidth < 640 ? 18 : 20} />
                  Recent Activity
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  {[
                    { action: 'Checked In', time: '2 hours ago', color: 'green', icon: CheckCircle },
                    { action: 'Leave Approved', time: 'Yesterday', color: 'blue', icon: Calendar },
                    { action: 'Report Generated', time: '2 days ago', color: 'purple', icon: FileText },
                  ].map((activity, idx) => {
                    const Icon = activity.icon;
                    return (
                      <div key={idx} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <div className={`p-1.5 sm:p-2 bg-${activity.color}-100 rounded-lg`}>
                          <Icon size={14} className={`text-${activity.color}-600`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-800">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Performance Badge */}
              <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 rounded-xl p-4 sm:p-5 md:p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <Award className="text-white" size={window.innerWidth < 640 ? 28 : 32} />
                  <span className="bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">Achievement</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold mb-1">Perfect Attendance!</h4>
                <p className="text-xs sm:text-sm opacity-90">You've maintained 100% attendance this week. Keep it up!</p>
              </div>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Weekly Overview</h3>
              <span className="text-xs sm:text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                const isPast = idx < 4;
                const isToday = idx === 4;
                const statusColors = ['bg-green-500', 'bg-green-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-gray-200', 'bg-gray-200'];
                return (
                  <div key={day} className="text-center">
                    <div className="text-xs text-gray-500 mb-1 sm:mb-2 font-medium">{day}</div>
                    <div className={`w-full h-16 sm:h-20 rounded-lg ${statusColors[idx]} ${isToday ? 'ring-2 ring-blue-400 ring-offset-1 sm:ring-offset-2' : ''} flex items-center justify-center transition-all hover:scale-105`}>
                      {isPast && <CheckCircle className="text-white" size={window.innerWidth < 640 ? 18 : 24} />}
                      {isToday && <Clock className="text-white" size={window.innerWidth < 640 ? 18 : 24} />}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 sm:mt-2">
                      {isPast ? '9h' : isToday ? 'Active' : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    };

    // Attendance Records Page
    const AttendanceRecordsPage = () => {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800">Attendance Records</h2>
            <button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Check-In</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Check-Out</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Duration</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceRecords.map((record, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{record.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{record.checkIn}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{record.checkOut}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{record.duration}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'Present' ? 'bg-green-100 text-green-800' :
                          record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    };

    // Leave Management Page
    const LeaveManagementPage = () => {
      const leaveData = [
        { type: 'Sick Leave', used: 2, available: 8, color: 'bg-red-100 text-red-800' },
        { type: 'Casual Leave', used: 3, available: 7, color: 'bg-blue-100 text-blue-800' },
        { type: 'Paid Leave', used: 5, available: 15, color: 'bg-green-100 text-green-800' },
      ];

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800">Leave Management</h2>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition font-medium">
              + Request Leave
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {leaveData.map((leave, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">{leave.type}</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Used</span>
                      <span className="font-bold text-gray-800">{leave.used} days</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(leave.used / (leave.used + leave.available)) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available</span>
                      <span className="font-bold text-green-600">{leave.available} days</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Leave History</h3>
            <div className="space-y-3">
              {[
                { type: 'Sick Leave', from: '2024-01-05', to: '2024-01-05', days: 1, status: 'Approved' },
                { type: 'Casual Leave', from: '2023-12-25', to: '2023-12-27', days: 3, status: 'Approved' },
                { type: 'Paid Leave', from: '2023-12-01', to: '2023-12-05', days: 5, status: 'Approved' },
              ].map((record, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div>
                    <p className="font-semibold text-gray-800">{record.type}</p>
                    <p className="text-sm text-gray-600">{record.from} to {record.to} ({record.days} {record.days > 1 ? 'days' : 'day'})</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">{record.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    // Reports Page
    const ReportsPage = () => {
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-800">Attendance Reports</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Monthly Attendance</h3>
              <div className="space-y-2 h-64 flex flex-col justify-end">
                {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">{week}</span>
                      <span className="text-sm font-semibold text-gray-800">{[90, 85, 95, 80][idx]}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold" 
                        style={{ width: `${[90, 85, 95, 80][idx]}%` }}
                      >
                        {[90, 85, 95, 80][idx]}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Department Statistics</h3>
              <div className="space-y-4">
                {[
                  { dept: 'Engineering', attendance: 92, employees: 45 },
                  { dept: 'Sales', attendance: 88, employees: 30 },
                  { dept: 'HR', attendance: 95, employees: 10 },
                  { dept: 'Marketing', attendance: 90, employees: 15 },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{item.dept}</span>
                      <span className="text-sm text-gray-600">{item.attendance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${item.attendance}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    };

    // Profile Page
    const ProfilePage = () => {
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-800">User Profile</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <User className="text-white" size={48} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{currentUser?.name}</h3>
                <p className="text-gray-600 mt-1">{currentUser?.email}</p>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Employee ID</p>
                  <p className="text-lg font-bold text-gray-800">EMP-2024-001</p>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input type="text" defaultValue={currentUser?.name} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" defaultValue={currentUser?.email} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input type="text" defaultValue="Engineering" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                    <input type="text" defaultValue="Senior Developer" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
                    <input type="date" defaultValue="2023-01-15" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                </div>
                <button className="mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation Bar */}
        <nav className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white shadow-lg">
          <div className="px-6 py-4 flex justify-between items-center">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <BarChart3 className="text-white" size={28} />
              </div>
              <h1 className="text-2xl font-bold">Attendly</h1>
            </div>

            {/* Right Side - User Profile and Actions */}
            <div className="flex items-center space-x-6">
              {/* Action Icons */}
              <div className="flex items-center space-x-4">
                <button className="p-2 hover:bg-white/10 rounded-lg transition">
                  <Calendar size={24} />
                </button>
                <button className="relative p-2 hover:bg-white/10 rounded-lg transition">
                  <Bell size={24} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition">
                  <Settings size={24} />
                </button>
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <User className="text-blue-600" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{currentUser?.name} | Admin</p>
                  <p className="text-xs opacity-90">Welcome, {currentUser?.name?.split(' ')[0]}!</p>
                </div>
                <button className="hover:bg-white/10 p-1 rounded">
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="p-6">
          {/* Top Header */}
          <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
            <div className="px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  {dashboardPage === 'overview' && <><Home className="mr-2 text-green-600" size={24} />Dashboard Overview</>}
                  {dashboardPage === 'attendance' && <><Clock className="mr-2 text-green-600" size={24} />Attendance Records</>}
                  {dashboardPage === 'leave' && <><Calendar className="mr-2 text-green-600" size={24} />Leave Management</>}
                  {dashboardPage === 'reports' && <><FileText className="mr-2 text-green-600" size={24} />Reports</>}
                  {dashboardPage === 'profile' && <><User className="mr-2 text-green-600" size={24} />Profile</>}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Welcome back, {currentUser?.name}</p>
              </div>
              <div className="flex items-center space-x-4">
                <button className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition">
                  <Bell size={20} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{currentUser?.name}</p>
                    <p className="text-xs text-gray-500">{currentUser?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 px-6 py-8 overflow-y-auto">
            {dashboardPage === 'overview' && <OverviewPage />}
            {dashboardPage === 'attendance' && <AttendanceRecordsPage />}
            {dashboardPage === 'leave' && <LeaveManagementPage />}
            {dashboardPage === 'reports' && <ReportsPage />}
            {dashboardPage === 'profile' && <ProfilePage />}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Update real-time clock every second
   * Only active when user is logged in to conserve resources
   */
  useEffect(() => {
    if (!isLoggedIn) return; // Don't update time if not logged in
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isLoggedIn]);

  /**
   * Global logout function
   * SECURITY: Clears ALL user session data and returns to login page
   * Ensures no user data persists between sessions
   */
  const handleLogout = () => {
    console.log('[LOGOUT] Clearing user session');
    
    // Clear all session data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset all state
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentPage('login');
    
    console.log('[LOGOUT] Session cleared successfully');
    showNotification('Logged out successfully', 'success');
  };

  /**
   * Main App Render
   * Displays:
   * - Notification banner (if active)
   * - Login/Signup/Reset Password pages (if not logged in)
   * - AttendanceSystem component (if logged in)
   */
  return (
    <>
      {/* Global Notification Banner - Appears at top-right corner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg animate-slide-in ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <p className="font-medium">{notification.message}</p>
        </div>
      )}

      {!isLoggedIn ? (
        currentPage === 'login' ? <LoginPage /> : 
        currentPage === 'reset-password' ? <ResetPasswordPage /> : 
        <SignupPage />
      ) : (
        <AttendanceSystem currentUser={currentUser} onLogout={handleLogout} />
      )}
    </>
  );
};

export default App;