"""
Attendly - Employee Attendance Management System Backend API
Flask REST API for managing employee attendance, authentication, and admin operations

Author: [Your Name]
Date: January 2026
Course: Web Application Development
"""

# Import required libraries
from flask import Flask, request, jsonify  # Flask web framework and utilities
from flask_cors import CORS  # Enable cross-origin resource sharing for React frontend
from flask_bcrypt import Bcrypt  # Password hashing and verification
import mysql.connector  # MySQL database connector
from mysql.connector import Error  # MySQL error handling
import jwt  # JSON Web Token for authentication
import datetime  # Date and time operations
from functools import wraps  # Decorator utility for authentication middleware
import os  # Operating system operations for environment variables
from dotenv import load_dotenv  # Load environment variables from .env file

# Load environment variables from .env file
# This allows storing sensitive data like database passwords securely
load_dotenv()

# Initialize Flask application
app = Flask(__name__)

# Secret key for JWT token encryption (should be changed in production)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here-change-this')

# Enable CORS for frontend communication (allows React app to make API calls)
CORS(app)

# Initialize Bcrypt for password hashing with salt rounds
bcrypt = Bcrypt(app)

# MySQL Database Configuration
# Loads from environment variables for security, falls back to defaults for development
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),  # Database server address
    'user': os.getenv('DB_USER', 'root'),  # Database username
    'password': os.getenv('DB_PASSWORD', 'root@1122'),  # Database password
    'database': os.getenv('DB_NAME', 'user_auth_db'),  # Database name
    'port': int(os.getenv('DB_PORT', '3306'))  # Database port (default MySQL port is 3306)
}

# ===== DATABASE CONNECTION FUNCTION =====
def get_db_connection():
    """
    Establish connection to MySQL database
    
    Returns:
        connection object if successful, None if connection fails
    
    Note: Uses DB_CONFIG dictionary for connection parameters
    """
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# ===== DATABASE INITIALIZATION =====
def init_db():
    """
    Initialize all required database tables on first run
    
    Creates the following tables if they don't exist:
    - users: Store user authentication and profile data
    - attendance: Track daily user check-in/check-out times
    - leaves: Manage employee leave requests
    - employees: Store employee records for admin management
    - employee_attendance: Track attendance per employee
    
    Also handles adding new columns to existing tables for backward compatibility
    """
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        # Users table - stores authentication and profile information
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                employee_id VARCHAR(6) UNIQUE,
                is_admin BOOLEAN DEFAULT FALSE,
                department VARCHAR(100),
                designation VARCHAR(100),
                phone VARCHAR(20),
                joining_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Add employee_id column if it doesn't exist (for existing databases)
        try:
            cursor.execute('''
                ALTER TABLE users 
                ADD COLUMN employee_id VARCHAR(6) UNIQUE
            ''')
            conn.commit()
        except:
            pass  # Column already exists
        
        # Add is_admin column if it doesn't exist (for existing databases)
        try:
            cursor.execute('''
                ALTER TABLE users 
                ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
            ''')
            conn.commit()
        except:
            pass  # Column already exists
        
        # Attendance table - tracks daily check-in/check-out with duration and location
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date DATE NOT NULL,
                check_in TIME,
                check_out TIME,
                duration_hours DECIMAL(5, 2),
                status ENUM('present', 'absent', 'late', 'half-day') DEFAULT 'absent',
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_daily_attendance (user_id, date)
            )
        ''')
        
        # Leave table - manages employee leave requests with approval workflow
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS leaves (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type ENUM('sick', 'casual', 'paid') NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Employees table - separate employee records for admin management with soft delete
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                department VARCHAR(100) NOT NULL,
                status ENUM('present', 'absent', 'late', 'checked_out') DEFAULT 'absent',
                is_active BOOLEAN DEFAULT TRUE,
                deleted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Employee Attendance Records table - daily attendance tracking per employee
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS employee_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NOT NULL,
                employee_name VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                check_in TIME,
                check_out TIME,
                status ENUM('present', 'absent', 'late', 'checked_out') DEFAULT 'absent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                UNIQUE KEY unique_employee_daily_attendance (employee_id, date)
            )
        ''')
        
        # Add is_active column to employees if it doesn't exist (for existing databases)
        try:
            cursor.execute('''
                ALTER TABLE employees 
                ADD COLUMN is_active BOOLEAN DEFAULT TRUE
            ''')
            conn.commit()
        except:
            pass  # Column already exists
        
        # Add deleted_at column to employees if it doesn't exist (for existing databases)
        try:
            cursor.execute('''
                ALTER TABLE employees 
                ADD COLUMN deleted_at TIMESTAMP NULL
            ''')
            conn.commit()
        except:
            pass  # Column already exists
        
        # Update enum to include 'checked_out' status for existing databases
        try:
            cursor.execute('''
                ALTER TABLE employees 
                MODIFY COLUMN status ENUM('present', 'absent', 'late', 'checked_out') DEFAULT 'absent'
            ''')
            conn.commit()
        except:
            pass  # Already updated
        
        try:
            cursor.execute('''
                ALTER TABLE employee_attendance 
                MODIFY COLUMN status ENUM('present', 'absent', 'late', 'checked_out') DEFAULT 'absent'
            ''')
            conn.commit()
        except:
            pass  # Already updated
        
        conn.commit()
        cursor.close()
        conn.close()
        print("Database initialized successfully!")

# ===== AUTHENTICATION DECORATORS =====
def token_required(f):
    """
    Decorator to protect routes that require authentication
    
    Validates JWT token from Authorization header and extracts user_id
    Returns 401 if token is missing, expired, or invalid
    
    Usage:
        @app.route('/protected')
        @token_required
        def protected_route(current_user):
            # current_user contains the user_id from token
            pass
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present in Authorization header
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decode JWT token to get user_id
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """
    Decorator to protect routes that require admin privileges
    
    Validates JWT token AND checks if user has admin role (is_admin = TRUE)
    Returns 401 if token invalid, 403 if user is not admin
    
    Usage:
        @app.route('/admin-only')
        @admin_required
        def admin_route(current_user):
            # Only accessible to admins
            pass
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present in Authorization header
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decode JWT token to get user_id
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['user_id']
            
            # Check if user has admin privileges in database
            conn = get_db_connection()
            if not conn:
                return jsonify({'message': 'Database connection failed'}), 500
            
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT is_admin FROM users WHERE id = %s', (current_user,))
            user = cursor.fetchone()
            cursor.close()
            conn.close()
            
            # Deny access if user is not admin
            if not user or not user['is_admin']:
                return jsonify({'message': 'Admin access required'}), 403
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# ===== API ROUTES =====

@app.route('/', methods=['GET'])
def home():
    """
    Root endpoint - API information and health check
    
    Returns: JSON with API status and available endpoints
    """
    return jsonify({
        'message': 'Attendance System API',
        'status': 'running',
        'version': '1.0',
        'endpoints': {
            'health': '/api/health',
            'signup': '/api/signup',
            'login': '/api/login',
            'profile': '/api/profile',
            'dashboard': '/api/dashboard/stats',
            'attendance': '/api/attendance/*',
            'leave': '/api/leave/*'
        }
    }), 200

@app.route('/api/validate-token', methods=['GET'])
@token_required
def validate_token(current_user):
    """
    Token validation endpoint
    
    Validates JWT token and returns user authentication status
    Used by frontend to check if stored token is still valid
    
    Returns: JSON with validation status and user_id if valid
    """
    return jsonify({
        'valid': True,
        'user_id': current_user
    }), 200

@app.route('/api/signup', methods=['POST'])
def signup():
    """
    User registration endpoint
    
    Creates a new user account with email, password, and 6-digit employee ID
    Password is hashed using bcrypt before storage
    
    Request Body:
        - name (string): Full name of the user
        - email (string): Valid email address (must be unique)
        - password (string): User password (will be hashed)
        - employee_id (string): Exactly 6-digit employee ID (must be unique)
    
    Returns:
        201: User created successfully
        400: Validation error (missing fields or invalid employee ID)
        409: User with email or employee ID already exists
        500: Server error
    
    SECURITY: Enhanced error logging for debugging and audit trail
    """
    try:
        data = request.get_json()
        print(f"\n[SIGNUP] Request received from IP: {request.remote_addr}")
        print(f"[SIGNUP] Data received: name={data.get('name')}, email={data.get('email')}, employee_id={data.get('employee_id')}")
        
        # Validation
        if not data.get('name') or not data.get('email') or not data.get('password'):
            print(f"[SIGNUP ERROR] Validation failed: Missing required fields")
            print(f"[SIGNUP ERROR] Fields present: name={bool(data.get('name'))}, email={bool(data.get('email'))}, password={bool(data.get('password'))}")
            return jsonify({'message': 'All fields are required'}), 400
        
        name = data['name']
        email = data['email']
        password = data['password']
        employee_id = data.get('employee_id', '')
        
        # Validate employee_id (must be 6 digits)
        if not employee_id or len(employee_id) != 6 or not employee_id.isdigit():
            print(f"[SIGNUP ERROR] Validation failed: Invalid employee_id format")
            print(f"[SIGNUP ERROR] Employee ID: '{employee_id}', Length: {len(employee_id) if employee_id else 0}, Is Digit: {employee_id.isdigit() if employee_id else False}")
            return jsonify({'message': 'Employee ID must be exactly 6 digits'}), 400
        
        # Hash password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        print(f"[SIGNUP] Password hashed successfully for user: {name}")
        
        # Database operations
        conn = get_db_connection()
        if not conn:
            print(f"[SIGNUP ERROR] Database connection failed - cannot create user {name}")
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute('SELECT id, email FROM users WHERE email = %s', (email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"[SIGNUP ERROR] User already exists: email={email}, existing_user_id={existing_user[0]}")
            cursor.close()
            conn.close()
            return jsonify({'message': 'User already exists'}), 409
        
        # Check if employee_id already exists
        cursor.execute('SELECT id, name FROM users WHERE employee_id = %s', (employee_id,))
        existing_emp = cursor.fetchone()
        if existing_emp:
            print(f"[SIGNUP ERROR] Employee ID already exists: employee_id={employee_id}, existing_user_id={existing_emp[0]}, name={existing_emp[1]}")
            cursor.close()
            conn.close()
            return jsonify({'message': 'Employee ID already exists'}), 409
        
        # Insert new user
        cursor.execute(
            'INSERT INTO users (name, email, password, employee_id) VALUES (%s, %s, %s, %s)',
            (name, email, hashed_password, employee_id)
        )
        new_user_id = cursor.lastrowid
        conn.commit()
        print(f"[SIGNUP SUCCESS] User created: id={new_user_id}, name={name}, email={email}, employee_id={employee_id}")
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'User created successfully',
            'user': {'name': name, 'email': email, 'employee_id': employee_id}
        }), 201
        
    except Exception as e:
        print(f"[SIGNUP CRITICAL ERROR] Exception occurred: {type(e).__name__}")
        print(f"[SIGNUP CRITICAL ERROR] Error message: {str(e)}")
        import traceback
        print(f"[SIGNUP CRITICAL ERROR] Traceback:")
        traceback.print_exc()
        return jsonify({'message': f'An error occurred during signup: {str(e)}'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """
    User authentication endpoint
    
    Authenticates user with employee ID and password
    Returns JWT token valid for 24 hours on successful login
    
    Request Body:
        - employee_id (string): 6-digit employee ID
        - password (string): User password
    
    Returns:
        200: Login successful with JWT token and user details
        400: Missing required fields
        401: Invalid credentials (wrong employee ID or password)
        500: Server error
    
    SECURITY: Enhanced error logging and audit trail for authentication attempts
    """
    try:
        data = request.get_json()
        print(f"\n[LOGIN] Request received from IP: {request.remote_addr}")
        print(f"[LOGIN] Employee ID attempting login: {data.get('employee_id')}")
        print(f"[LOGIN] Timestamp: {datetime.datetime.utcnow().isoformat()}")
        
        # Validation
        if not data.get('password') or not data.get('employee_id'):
            print(f"[LOGIN ERROR] Validation failed: Missing credentials")
            print(f"[LOGIN ERROR] Has password: {bool(data.get('password'))}, Has employee_id: {bool(data.get('employee_id'))}")
            return jsonify({'message': 'Password and Employee ID are required'}), 400
        
        password = data['password']
        employee_id = data['employee_id']
        
        # Database operations
        conn = get_db_connection()
        if not conn:
            print(f"[LOGIN ERROR] Database connection failed for employee_id: {employee_id}")
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Find user by employee_id only
        cursor.execute('SELECT * FROM users WHERE employee_id = %s', (employee_id,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            print(f"[LOGIN ERROR] Authentication failed: User not found with employee_id={employee_id}")
            print(f"[LOGIN ERROR] This employee ID does not exist in the system")
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # Check password
        if not bcrypt.check_password_hash(user['password'], password):
            print(f"[LOGIN ERROR] Authentication failed: Invalid password for employee_id={employee_id}")
            print(f"[LOGIN ERROR] User exists (id={user['id']}, name={user['name']}) but password is incorrect")
            return jsonify({'message': 'Invalid credentials'}), 401
        
        print(f"[LOGIN SUCCESS] User authenticated successfully")
        print(f"[LOGIN SUCCESS] User details: id={user['id']}, name={user['name']}, email={user['email']}, employee_id={user['employee_id']}, is_admin={user.get('is_admin', False)}")
        
        # Generate JWT token with user session isolation
        token = jwt.encode({
            'user_id': user['id'],
            'email': user['email'],
            'employee_id': user['employee_id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        print(f"[LOGIN SUCCESS] JWT token generated for user_id={user['id']}")
        print(f"[LOGIN SUCCESS] Token expires at: {(datetime.datetime.utcnow() + datetime.timedelta(hours=24)).isoformat()}")
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'employee_id': user['employee_id'],
                'is_admin': user.get('is_admin', False)
            }
        }), 200
        
    except Exception as e:
        print(f"[LOGIN CRITICAL ERROR] Exception occurred: {type(e).__name__}")
        print(f"[LOGIN CRITICAL ERROR] Error message: {str(e)}")
        import traceback
        print(f"[LOGIN CRITICAL ERROR] Traceback:")
        traceback.print_exc()
        return jsonify({'message': f'An error occurred during login: {str(e)}'}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    """
    Password reset endpoint
    
    Allows users to reset their password using employee ID
    New password must be at least 6 characters and is hashed before storage
    
    Request Body:
        - employee_id (string): 6-digit employee ID
        - new_password (string): New password (minimum 6 characters)
    
    Returns:
        200: Password reset successfully
        400: Missing fields or password too short
        401: Invalid employee ID
        500: Server error
    """
    try:
        data = request.get_json()
        
        # Validation
        if not data.get('employee_id') or not data.get('new_password'):
            return jsonify({'message': 'Employee ID and new password are required'}), 400
        
        employee_id = data['employee_id']
        new_password = data['new_password']
        
        # Validate new password length
        if len(new_password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters long'}), 400
        
        # Database operations
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Find user by employee_id only
        cursor.execute('SELECT * FROM users WHERE employee_id = %s', (employee_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Invalid employee ID'}), 401
        
        # Hash the new password and update
        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        cursor.execute('UPDATE users SET password = %s WHERE id = %s', (hashed_password, user['id']))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        print(f"Password reset error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'An error occurred during password reset'}), 500

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """
    Get current user profile information
    
    Protected route: Requires valid JWT token
    Returns user details (id, name, email, created_at)
    
    Returns:
        200: User profile data
        404: User not found
        401: Invalid or missing token
        500: Server error
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id, name, email, created_at FROM users WHERE id = %s', (current_user,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        return jsonify({'user': user}), 200
        
    except Exception as e:
        print(f"Profile error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/dashboard/stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    """
    Get dashboard statistics (demo endpoint)
    
    Protected route: Requires valid JWT token
    Currently returns mock data - can be extended with real statistics
    
    Returns:
        200: Dashboard statistics
        401: Invalid or missing token
    """
    # This is a demo endpoint - replace with actual business logic
    stats = {
        'projects': 24,
        'users': 1429,
        'revenue': 12450,
        'tasks': 186
    }
    return jsonify({'stats': stats}), 200

# ===== ATTENDANCE MANAGEMENT ENDPOINTS =====

@app.route('/api/attendance/check-in', methods=['POST'])
@token_required
def check_in(current_user):
    """
    Check-in endpoint for user attendance
    
    Protected route: Records user check-in time for today
    Prevents duplicate check-ins on the same day
    
    Request Body (optional):
        - time (string): Check-in time in HH:MM:SS format (defaults to current time)
        - location (string): Check-in location (defaults to 'Office')
    
    Returns:
        200: Check-in successful
        400: Already checked in today
        401: Invalid or missing token
        500: Server error
    """
    try:
        from datetime import datetime, date
        
        data = request.get_json()
        check_in_time = data.get('time', datetime.now().time().strftime('%H:%M:%S'))
        location = data.get('location', 'Office')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        today = date.today()
        
        # Check if already checked in today
        cursor.execute(
            'SELECT * FROM attendance WHERE user_id = %s AND date = %s',
            (current_user, today)
        )
        existing = cursor.fetchone()
        
        if existing:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Already checked in today'}), 400
        
        # Create new attendance record
        cursor.execute(
            'INSERT INTO attendance (user_id, date, check_in, location, status) VALUES (%s, %s, %s, %s, %s)',
            (current_user, today, check_in_time, location, 'present')
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Check-in successful',
            'check_in_time': check_in_time
        }), 200
        
    except Exception as e:
        print(f"Check-in error: {e}")
        return jsonify({'message': 'An error occurred during check-in'}), 500

@app.route('/api/attendance/check-out', methods=['POST'])
@token_required
def check_out(current_user):
    """
    Check-out endpoint for user attendance
    
    Protected route: Records user check-out time for today
    Requires that user has already checked in today
    
    Request Body (optional):
        - time (string): Check-out time in HH:MM:SS format (defaults to current time)
    
    Returns:
        200: Check-out successful
        400: No check-in record found for today
        401: Invalid or missing token
        500: Server error
    """
    try:
        from datetime import datetime, date
        
        data = request.get_json()
        check_out_time = data.get('time', datetime.now().time().strftime('%H:%M:%S'))
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        today = date.today()
        
        # Find today's attendance record
        cursor.execute(
            'SELECT * FROM attendance WHERE user_id = %s AND date = %s',
            (current_user, today)
        )
        attendance = cursor.fetchone()
        
        if not attendance:
            cursor.close()
            conn.close()
            return jsonify({'message': 'No check-in record found for today'}), 400
        
        # Update with check-out time
        cursor.execute(
            'UPDATE attendance SET check_out = %s WHERE id = %s',
            (check_out_time, attendance['id'])
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Check-out successful',
            'check_out_time': check_out_time
        }), 200
        
    except Exception as e:
        print(f"Check-out error: {e}")
        return jsonify({'message': 'An error occurred during check-out'}), 500

@app.route('/api/attendance/records', methods=['GET'])
@token_required
def get_attendance_records(current_user):
    """
    Get user's attendance history
    
    Protected route: Returns last 30 attendance records for current user
    Includes date, check-in/out times, duration, status, and location
    
    Returns:
        200: List of attendance records (most recent first)
        401: Invalid or missing token
        500: Server error
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get attendance records for current month
        cursor.execute('''
            SELECT date, check_in, check_out, duration_hours, status, location 
            FROM attendance 
            WHERE user_id = %s 
            ORDER BY date DESC 
            LIMIT 30
        ''', (current_user,))
        
        records = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'records': records}), 200
        
    except Exception as e:
        print(f"Get records error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/attendance/summary', methods=['GET'])
@token_required
def get_attendance_summary(current_user):
    """
    Get monthly attendance summary statistics
    
    Protected route: Returns attendance statistics for current month
    Calculates present, late, absent days and overall attendance percentage
    
    Returns:
        200: Attendance summary with counts and percentage
        401: Invalid or missing token
        500: Server error
    """
    try:
        from datetime import datetime
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get current month
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Count attendance by status
        cursor.execute('''
            SELECT 
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
                COUNT(*) as total_days
            FROM attendance 
            WHERE user_id = %s 
            AND MONTH(date) = %s 
            AND YEAR(date) = %s
        ''', (current_user, current_month, current_year))
        
        summary = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if summary and summary['total_days'] > 0:
            attendance_percentage = round((summary['present_days'] / summary['total_days']) * 100, 2)
        else:
            attendance_percentage = 0
        
        return jsonify({
            'summary': {
                'present_days': summary['present_days'] or 0,
                'late_days': summary['late_days'] or 0,
                'absent_days': summary['absent_days'] or 0,
                'attendance_percentage': attendance_percentage
            }
        }), 200
        
    except Exception as e:
        print(f"Summary error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

# ===== LEAVE MANAGEMENT ENDPOINTS =====

@app.route('/api/leave/request', methods=['POST'])
@token_required
def request_leave(current_user):
    """
    Submit leave request
    
    Protected route: Allows users to request sick, casual, or paid leave
    Leave status starts as 'pending' and requires admin approval
    
    Request Body:
        - type (string): Leave type ('sick', 'casual', 'paid')
        - start_date (date): Leave start date
        - end_date (date): Leave end date
        - reason (string, optional): Reason for leave
    
    Returns:
        201: Leave request submitted successfully
        400: Missing required fields
        401: Invalid or missing token
        500: Server error
    """
    try:
        data = request.get_json()
        
        if not data.get('type') or not data.get('start_date') or not data.get('end_date'):
            return jsonify({'message': 'All fields are required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO leaves (user_id, type, start_date, end_date, reason, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
        ''', (
            current_user,
            data['type'],
            data['start_date'],
            data['end_date'],
            data.get('reason', '')
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Leave request submitted successfully'}), 201
        
    except Exception as e:
        print(f"Leave request error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/leave/history', methods=['GET'])
@token_required
def get_leave_history(current_user):
    """
    Get user's leave request history
    
    Protected route: Returns all leave requests for current user
    Includes leave type, dates, reason, status, and submission date
    
    Returns:
        200: List of leave requests (most recent first)
        401: Invalid or missing token
        500: Server error
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('''
            SELECT type, start_date, end_date, reason, status, created_at
            FROM leaves 
            WHERE user_id = %s 
            ORDER BY created_at DESC
        ''', (current_user,))
        
        leaves = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'leaves': leaves}), 200
        
    except Exception as e:
        print(f"Leave history error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    API health check endpoint
    
    Simple endpoint to verify API is running
    Used for monitoring and debugging
    
    Returns:
        200: API is healthy and running
    """
    return jsonify({'status': 'healthy', 'message': 'API is running'}), 200

@app.route('/api/user/info', methods=['GET'])
@token_required
def get_user_info(current_user):
    """
    Get current user information including role and employee record ID
    
    Protected route: Returns user profile with admin status and linked employee record
    Used by frontend to determine user permissions and access level
    
    Returns:
        200: User information including admin status and employee_record_id
        404: User not found
        401: Invalid or missing token
        500: Server error
    """
    try:
        print(f"Getting user info for user ID: {current_user}")
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get user details
        cursor.execute('SELECT id, name, email, employee_id, is_admin FROM users WHERE id = %s', (current_user,))
        user = cursor.fetchone()
        
        print(f"User found: {user}")
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        # Get employee record if exists (match by email)
        cursor.execute('SELECT id FROM employees WHERE email = %s', (user['email'],))
        employee = cursor.fetchone()
        
        print(f"Employee record found: {employee}")
        
        cursor.close()
        conn.close()
        
        user_response = {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'employee_id': user['employee_id'],
            'is_admin': user['is_admin'],
            'employee_record_id': employee['id'] if employee else None
        }
        
        print(f"Returning user info: {user_response}")
        
        return jsonify({'user': user_response}), 200
        
    except Exception as e:
        print(f"Get user info error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

# ===== EMPLOYEE MANAGEMENT ENDPOINTS (ADMIN & USER ACCESS) =====

@app.route('/api/employees', methods=['GET'])
@token_required
def get_employees(current_user):
    """
    Get employee list (role-based access)
    
    Protected route:
    - Admins: See all active employees across all departments
    - Regular users: See only their own employee record
    
    Returns:
        200: List of employee records with status and details
        401: Invalid or missing token
        500: Server error
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Check if user is admin
        cursor.execute('SELECT is_admin, employee_id FROM users WHERE id = %s', (current_user,))
        user_data = cursor.fetchone()
        
        if user_data and user_data.get('is_admin'):
            # Admin can see all active employees
            cursor.execute('SELECT id, name, email, department, status, is_active, created_at FROM employees WHERE is_active = TRUE ORDER BY created_at DESC')
        else:
            # Non-admin can only see their own data (if active)
            # Find employee record matching the user's email
            cursor.execute('SELECT email FROM users WHERE id = %s', (current_user,))
            user_email = cursor.fetchone()
            if user_email:
                cursor.execute('SELECT id, name, email, department, status, is_active, created_at FROM employees WHERE email = %s AND is_active = TRUE', (user_email['email'],))
            else:
                cursor.close()
                conn.close()
                return jsonify({'employees': []}), 200
        
        employees = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({'employees': employees}), 200
        
    except Exception as e:
        print(f"Get employees error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/employees/deleted', methods=['GET'])
@admin_required
def get_deleted_employees(current_user):
    """
    Get list of soft-deleted employees (Admin only)
    
    Protected admin route: Returns employees marked as inactive
    Used for viewing deleted employee history
    
    Returns:
        200: List of deleted employees with deletion timestamp
        403: User is not admin
        401: Invalid or missing token
        500: Server error
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Admin can see all deleted employees
        cursor.execute('SELECT id, name, email, department, status, deleted_at, created_at FROM employees WHERE is_active = FALSE ORDER BY deleted_at DESC')
        employees = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({'employees': employees}), 200
        
    except Exception as e:
        print(f"Get deleted employees error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/employees/<int:employee_id>/details', methods=['GET'])
@admin_required
def get_employee_details(current_user, employee_id):
    """
    Get detailed information for a specific employee (Admin only)
    
    Protected admin route: Returns employee profile and attendance statistics
    Includes total days worked, present/absent/late counts
    
    Path Parameters:
        employee_id (int): Employee record ID
    
    Returns:
        200: Employee details with attendance statistics
        404: Employee not found
        403: User is not admin
        401: Invalid or missing token
        500: Server error
    """
    print(f"Getting details for employee ID: {employee_id}")
    print(f"Requested by user ID: {current_user}")
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get employee details
        cursor.execute('''
            SELECT id, name, email, department, status, created_at
            FROM employees
            WHERE id = %s
        ''', (employee_id,))
        
        employee = cursor.fetchone()
        
        if not employee:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Employee not found'}), 404
        
        # Try to get employee_id from users table by matching email
        cursor.execute('SELECT employee_id FROM users WHERE email = %s', (employee['email'],))
        user_data = cursor.fetchone()
        if user_data:
            employee['employee_id'] = user_data['employee_id']
        else:
            employee['employee_id'] = None
        
        # Get attendance statistics
        cursor.execute('''
            SELECT 
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
            FROM employee_attendance
            WHERE employee_id = %s
        ''', (employee_id,))
        
        attendance_stats = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'employee': employee,
            'attendance_stats': attendance_stats
        }), 200
        
    except Exception as e:
        print(f"Get employee details error: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        
        # Return more detailed error for debugging
        return jsonify({
            'message': f'An error occurred: {str(e)}',
            'error_type': type(e).__name__
        }), 500

@app.route('/api/employees', methods=['POST'])
@admin_required
def add_employee(current_user):
    """
    Add new employee to the system (Admin only)
    
    Protected admin route: Creates both employee record and user account
    Generates initial password and validates employee ID format
    
    Request Body:
        - name (string): Employee full name
        - email (string): Employee email (must be unique)
        - department (string): Employee department
        - employee_id (string): 6-digit employee ID (must be unique)
        - password (string, optional): Initial password (defaults to 'Password123')
    
    Returns:
        201: Employee created successfully with account details
        400: Validation error (missing fields or invalid employee ID)
        409: Employee with email or employee ID already exists
        403: User is not admin
        401: Invalid or missing token
        500: Server error
    """
    try:
        data = request.get_json()
        
        # Validation
        if not data.get('name') or not data.get('email') or not data.get('department') or not data.get('employee_id'):
            return jsonify({'message': 'Name, email, department, and employee ID are required'}), 400
        
        # Validate employee_id (must be 6 digits)
        employee_id = data['employee_id']
        if len(employee_id) != 6 or not employee_id.isdigit():
            return jsonify({'message': 'Employee ID must be exactly 6 digits'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Check if employee already exists
        cursor.execute('SELECT * FROM employees WHERE email = %s', (data['email'],))
        existing_employee = cursor.fetchone()
        
        if existing_employee:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Employee with this email already exists'}), 409
        
        # Check if employee_id already exists
        cursor.execute('SELECT * FROM users WHERE employee_id = %s', (employee_id,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'message': 'Employee ID already exists'}), 409
        
        # Check if user with this email already exists
        cursor.execute('SELECT * FROM users WHERE email = %s', (data['email'],))
        existing_user = cursor.fetchone()
        
        if not existing_user:
            # Create user account for the employee with the provided employee_id and password
            provided_password = data.get('password', 'Password123')  # Use provided password or default
            hashed_password = bcrypt.generate_password_hash(provided_password).decode('utf-8')
            
            cursor.execute(
                'INSERT INTO users (name, email, password, employee_id) VALUES (%s, %s, %s, %s)',
                (data['name'], data['email'], hashed_password, employee_id)
            )
            conn.commit()
        
        # Insert new employee (no user_id column needed)
        cursor.execute(
            'INSERT INTO employees (name, email, department, status) VALUES (%s, %s, %s, %s)',
            (data['name'], data['email'], data['department'], 'absent')
        )
        conn.commit()
        
        # Get the newly created employee
        new_employee_id = cursor.lastrowid
        cursor.execute('SELECT id, name, email, department, status, created_at FROM employees WHERE id = %s', (new_employee_id,))
        new_employee = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Employee added successfully',
            'employee': {
                'id': new_employee[0],
                'name': new_employee[1],
                'email': new_employee[2],
                'department': new_employee[3],
                'status': new_employee[4]
            }
        }), 201
        
    except Exception as e:
        print(f"Add employee error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/employees/<int:employee_id>', methods=['DELETE'])
@admin_required
def delete_employee(current_user, employee_id):
    """
    Soft delete an employee (Admin only)
    
    Protected admin route: Marks employee as inactive instead of permanent deletion
    Sets is_active=FALSE and records deletion timestamp
    Maintains data integrity by preserving attendance history
    
    Path Parameters:
        employee_id (int): Employee record ID to delete
    
    Returns:
        200: Employee deleted successfully
        404: Employee not found
        403: User is not admin
        401: Invalid or missing token
        500: Server error
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Check if employee exists
        cursor.execute('SELECT * FROM employees WHERE id = %s AND is_active = TRUE', (employee_id,))
        employee = cursor.fetchone()
        
        if not employee:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Employee not found'}), 404
        
        # Soft delete employee (mark as inactive)
        cursor.execute('UPDATE employees SET is_active = FALSE, deleted_at = NOW() WHERE id = %s', (employee_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Employee deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete employee error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/employees/<int:employee_id>/status', methods=['PUT'])
@token_required
def update_employee_status(current_user, employee_id):
    """
    Update employee attendance status
    
    Protected route: Updates employee status (present/absent/late)
    Used for quick status changes without full attendance record
    
    Path Parameters:
        employee_id (int): Employee record ID
    
    Request Body:
        - status (string): New status ('present', 'absent', 'late')
    
    Returns:
        200: Status updated successfully
        400: Invalid status value
        401: Invalid or missing token
        500: Server error
    """
    try:
        data = request.get_json()
        
        if not data.get('status'):
            return jsonify({'message': 'Status is required'}), 400
        
        status = data['status']
        if status not in ['present', 'absent', 'late']:
            return jsonify({'message': 'Invalid status'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Update employee status
        cursor.execute('UPDATE employees SET status = %s WHERE id = %s', (status, employee_id))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Employee status updated successfully'}), 200
        
    except Exception as e:
        print(f"Update employee status error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

# Employee Attendance Record Endpoints
@app.route('/api/employee-attendance', methods=['POST'])
@token_required
def mark_employee_attendance(current_user):
    try:
        from datetime import datetime, date
        
        data = request.get_json()
        employee_id = data.get('employee_id')
        status = data.get('status')
        check_in_time = data.get('check_in')
        check_out_time = data.get('check_out')
        action = data.get('action', 'check_in')  # 'check_in' or 'check_out'
        
        print(f"Mark attendance request - User ID: {current_user}, Employee ID: {employee_id}, Status: {status}, Action: {action}")
        
        if not employee_id:
            return jsonify({'message': 'Employee ID is required'}), 400
        
        if action == 'check_in' and not status:
            return jsonify({'message': 'Status is required for check-in'}), 400
        
        if status and status not in ['present', 'absent', 'late', 'checked_out']:
            return jsonify({'message': 'Invalid status'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get employee details
        cursor.execute('SELECT * FROM employees WHERE id = %s', (employee_id,))
        employee = cursor.fetchone()
        
        print(f"Employee found: {employee}")
        
        if not employee:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Employee not found'}), 404
        
        # Get current user's email and admin status to verify ownership
        cursor.execute('SELECT email, is_admin FROM users WHERE id = %s', (current_user,))
        user = cursor.fetchone()
        
        print(f"Current user: {user}")
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        # Check if current user is authorized to mark this employee's attendance
        # Everyone (including admin) can only mark their own attendance (match by email)
        employee_email = employee['email'].lower().strip() if employee['email'] else ''
        user_email = user['email'].lower().strip() if user['email'] else ''
        
        print(f"Comparing emails (normalized) - Employee: '{employee_email}', User: '{user_email}'")
        
        # Changed: Admin can NO LONGER mark other employees' attendance
        if employee_email != user_email:
            cursor.close()
            conn.close()
            print(f"Authorization failed - User can only mark their own attendance. Admin: {user['is_admin']}, Emails match: {employee_email == user_email}")
            return jsonify({'message': 'You can only mark your own attendance'}), 403
        
        print("Authorization successful! Proceeding to mark attendance...")
        
        today = date.today()
        current_time = datetime.now().strftime('%H:%M:%S')
        
        print(f"[ATTENDANCE CHECK] Today's date: {today}")
        print(f"[ATTENDANCE CHECK] Employee ID: {employee_id}, Action: {action}, Status: {status}")
        
        # Check if attendance already recorded today
        cursor.execute(
            'SELECT * FROM employee_attendance WHERE employee_id = %s AND date = %s',
            (employee_id, today)
        )
        existing = cursor.fetchone()
        
        if existing:
            print(f"[ATTENDANCE CHECK] Found existing record for today: ID={existing['id']}, Status={existing['status']}, Check-in={existing['check_in']}, Check-out={existing['check_out']}")
        else:
            print(f"[ATTENDANCE CHECK] No existing record found for today. Will create new record.")
        
        if action == 'check_out':
            # Handle check-out
            if existing:
                actual_check_out = check_out_time if check_out_time else current_time
                cursor.execute(
                    'UPDATE employee_attendance SET check_out = %s, status = %s WHERE employee_id = %s AND date = %s',
                    (actual_check_out, 'checked_out', employee_id, today)
                )
                # Update employee status to checked_out
                cursor.execute('UPDATE employees SET status = %s WHERE id = %s', ('checked_out', employee_id))
            else:
                cursor.close()
                conn.close()
                return jsonify({'message': 'No check-in record found for today. Please check in first.'}), 400
        else:
            # Handle check-in
            actual_check_in = check_in_time if check_in_time else current_time
            
            if existing:
                # If attendance already marked today, prevent changing to absent/late
                # This prevents marking someone absent after they've already checked in
                current_status = existing.get('status')
                
                print(f"[VALIDATION] Existing status: {current_status}, Trying to mark as: {status}")
                
                # Prevent downgrading from checked_out or present to absent/late
                if current_status in ['present', 'checked_out'] and status in ['absent', 'late']:
                    print(f"[VALIDATION BLOCKED] Cannot change from '{current_status}' to '{status}'")
                    cursor.close()
                    conn.close()
                    return jsonify({
                        'message': f'Cannot change status from "{current_status}" to "{status}". Employee already marked as {current_status} today.'
                    }), 400
                
                # Prevent duplicate absent or late markings (already marked absent/late, trying again)
                if current_status in ['absent', 'late'] and status in ['absent', 'late']:
                    print(f"[VALIDATION BLOCKED] Already marked as '{current_status}', cannot mark as '{status}' again")
                    cursor.close()
                    conn.close()
                    return jsonify({
                        'message': f'Attendance already marked as "{current_status}" today. Cannot mark as {status} again for the same day.'
                    }), 400
                
                # Allow updating status (corrections like absent → present, or late → present)
                print(f"[VALIDATION PASSED] Updating attendance from '{current_status}' to '{status}'")
                cursor.execute(
                    'UPDATE employee_attendance SET status = %s, check_in = %s WHERE employee_id = %s AND date = %s',
                    (status, actual_check_in, employee_id, today)
                )
            else:
                # No record for today - create new attendance record (this should always work for a new day)
                print(f"[NEW RECORD] Creating new attendance record for today: {status}")
                cursor.execute(
                    'INSERT INTO employee_attendance (employee_id, employee_name, date, check_in, status) VALUES (%s, %s, %s, %s, %s)',
                    (employee_id, employee['name'], today, actual_check_in, status)
                )
            
            # Update employee status
            cursor.execute('UPDATE employees SET status = %s WHERE id = %s', (status, employee_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Attendance marked successfully',
            'employee_id': employee_id,
            'status': status
        }), 200
        
    except Exception as e:
        print(f"Mark attendance error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/employee-attendance', methods=['GET'])
@token_required
def get_employee_attendance(current_user):
    try:
        from datetime import date
        
        # Get query parameters - convert to int for LIMIT clause
        limit = int(request.args.get('limit', 500))  # Default to last 500 records
        
        print(f"\n[ATTENDANCE RECORDS] Request from user_id: {current_user}")
        print(f"[ATTENDANCE RECORDS] Fetching ALL attendance records (including today)")
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Check if user is admin
        cursor.execute('SELECT is_admin, email, name FROM users WHERE id = %s', (current_user,))
        user_data = cursor.fetchone()
        
        print(f"[ATTENDANCE RECORDS] User: {user_data['name']}, Email: {user_data['email']}, Is Admin: {user_data.get('is_admin')}")
        
        if user_data and user_data.get('is_admin'):
            # Admin can see ALL attendance records for all employees
            print(f"[ATTENDANCE RECORDS] Admin access granted - fetching ALL records for all employees")
            cursor.execute('''
                SELECT id, employee_id, employee_name, date, check_in, check_out, status
                FROM employee_attendance 
                ORDER BY date DESC, check_in DESC
                LIMIT %s
            ''', (limit,))
        else:
            # Non-admin can only see their own attendance records
            print(f"[ATTENDANCE RECORDS] Non-admin access - fetching only user's records")
            
            # Try multiple strategies to find employee record
            employee = None
            
            # Strategy 1: Match by user_id
            cursor.execute('SELECT id, name FROM employees WHERE user_id = %s', (current_user,))
            employee = cursor.fetchone()
            
            if employee:
                print(f"[ATTENDANCE RECORDS] Found employee by user_id: id={employee['id']}, name={employee['name']}")
            else:
                # Strategy 2: Match by email
                cursor.execute('SELECT id, name FROM employees WHERE email = %s', (user_data['email'],))
                employee = cursor.fetchone()
                
                if employee:
                    print(f"[ATTENDANCE RECORDS] Found employee by email: id={employee['id']}, name={employee['name']}")
                else:
                    # Strategy 3: Match by name (case-insensitive)
                    cursor.execute('SELECT id, name FROM employees WHERE LOWER(name) = LOWER(%s)', (user_data['name'],))
                    employee = cursor.fetchone()
                    
                    if employee:
                        print(f"[ATTENDANCE RECORDS] Found employee by name: id={employee['id']}, name={employee['name']}")
            
            if employee:
                cursor.execute('''
                    SELECT id, employee_id, employee_name, date, check_in, check_out, status
                    FROM employee_attendance 
                    WHERE employee_id = %s
                    ORDER BY date DESC, check_in DESC
                    LIMIT %s
                ''', (employee['id'], limit))
            else:
                print(f"[ATTENDANCE RECORDS] No employee record found for user: {user_data['name']}, email: {user_data['email']}, user_id: {current_user}")
                cursor.close()
                conn.close()
                return jsonify({'records': []}), 200
        
        records = cursor.fetchall()
        print(f"[ATTENDANCE RECORDS] Found {len(records)} total record(s) for all dates")
        
        # Convert date and time objects to strings
        for record in records:
            if record['date']:
                record['date'] = record['date'].isoformat()
            if record['check_in']:
                record['check_in'] = str(record['check_in'])[:5]  # HH:MM format
            if record['check_out']:
                record['check_out'] = str(record['check_out'])[:5]
            else:
                record['check_out'] = '-'
            print(f"[ATTENDANCE RECORDS] Record: employee={record['employee_name']}, status={record['status']}, check_in={record['check_in']}")
        
        cursor.close()
        conn.close()
        
        print(f"[ATTENDANCE RECORDS] Returning {len(records)} records to frontend")
        return jsonify({'records': records}), 200
        
    except Exception as e:
        print(f"Get employee attendance error: {e}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/employee-attendance/date/<date_str>', methods=['GET'])
@token_required
def get_employee_attendance_by_date(current_user, date_str):
    """
    Get attendance records for a specific date
    Used by Mark Attendance tab to show check-in/check-out times
    """
    try:
        print(f"\n[ATTENDANCE BY DATE] Request from user_id: {current_user} for date: {date_str}")
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Check if user is admin
        cursor.execute('SELECT is_admin, email, name FROM users WHERE id = %s', (current_user,))
        user_data = cursor.fetchone()
        
        print(f"[ATTENDANCE BY DATE] User: {user_data['name']}, Is Admin: {user_data.get('is_admin')}")
        
        if user_data and user_data.get('is_admin'):
            # Admin can see all attendance records for the date
            print(f"[ATTENDANCE BY DATE] Admin access - fetching all records for date {date_str}")
            cursor.execute('''
                SELECT id, employee_id, employee_name, date, check_in, check_out, status
                FROM employee_attendance 
                WHERE date = %s
                ORDER BY check_in ASC
            ''', (date_str,))
        else:
            # Non-admin can only see their own attendance for the date
            print(f"[ATTENDANCE BY DATE] Non-admin access - fetching only user's record")
            
            # Try multiple strategies to find employee record
            employee = None
            
            # Strategy 1: Match by user_id
            cursor.execute('SELECT id, name FROM employees WHERE user_id = %s', (current_user,))
            employee = cursor.fetchone()
            
            if employee:
                print(f"[ATTENDANCE BY DATE] Found employee by user_id: id={employee['id']}")
            else:
                # Strategy 2: Match by email
                cursor.execute('SELECT id, name FROM employees WHERE email = %s', (user_data['email'],))
                employee = cursor.fetchone()
                
                if employee:
                    print(f"[ATTENDANCE BY DATE] Found employee by email: id={employee['id']}")
                else:
                    # Strategy 3: Match by name
                    cursor.execute('SELECT id, name FROM employees WHERE LOWER(name) = LOWER(%s)', (user_data['name'],))
                    employee = cursor.fetchone()
                    
                    if employee:
                        print(f"[ATTENDANCE BY DATE] Found employee by name: id={employee['id']}")
            
            if employee:
                cursor.execute('''
                    SELECT id, employee_id, employee_name, date, check_in, check_out, status
                    FROM employee_attendance 
                    WHERE date = %s AND employee_id = %s
                    ORDER BY check_in ASC
                ''', (date_str, employee['id']))
            else:
                print(f"[ATTENDANCE BY DATE] No employee record found")
                cursor.close()
                conn.close()
                return jsonify({'records': []}), 200
        
        records = cursor.fetchall()
        print(f"[ATTENDANCE BY DATE] Found {len(records)} record(s) for date {date_str}")
        
        # Convert date and time objects to strings
        for record in records:
            if record['date']:
                record['date'] = record['date'].isoformat()
            if record['check_in']:
                record['check_in'] = str(record['check_in'])[:5]  # HH:MM format
            if record['check_out']:
                record['check_out'] = str(record['check_out'])[:5]
            else:
                record['check_out'] = '-'
        
        cursor.close()
        conn.close()
        
        return jsonify({'records': records}), 200
        
    except Exception as e:
        print(f"Get attendance by date error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'An error occurred'}), 500

# Initialize database on startup
if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)