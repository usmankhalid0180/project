# 🎯 Attendly

A modern, full-stack web application for managing employee attendance with a beautiful, responsive design.

![Tech Stack](https://img.shields.io/badge/React-19.2.3-blue) ![Flask](https://img.shields.io/badge/Flask-3.1.2-green) ![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)

---

## 📋 Features

- **User Authentication** - Secure signup/login with JWT tokens and session isolation
- **Employee Management** - Add, view, and soft-delete employees (admin only)
- **Attendance Tracking** - Mark attendance as Present/Absent/Late with automatic validation
- **Check-In/Check-Out System** - Track employee work hours with timestamps
- **Dashboard** - Real-time statistics and analytics with responsive cards
- **Records Management** - View complete attendance history with date filtering
- **PDF Export** - Download attendance reports as professionally formatted PDFs
- **Role-Based Access Control** - Admins see all records, employees see only their own
- **Attendance Validation** - Prevents duplicate marking on the same day
- **Responsive Design** - Optimized for mobile, tablet, and desktop screens
- **Database Integration** - Persistent data storage with MySQL and auto-table creation  

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL 8.0+

### Installation Steps

1. **Setup Database:**
   ```sql
   -- Open MySQL and create the database:
   CREATE DATABASE user_auth_db;
   ```
   
   **⚠️ Important:** You ONLY need to create the empty database. All tables are created automatically!
   
   **Auto-Created Tables:**
   - `users` - User authentication (id, name, email, password, employee_id, is_admin)
   - `employees` - Employee records (id, name, email, department, status, is_active, deleted_at)
   - `employee_attendance` - Attendance records (id, employee_id, date, check_in, check_out, status)
   
   These tables are automatically created when you first run `python app.py` in the backend.

2. **Configure Credentials:**
   ```bash
   cd backend
   cp .env.example .env     # Mac/Linux
   copy .env.example .env   # Windows
   
   # Edit .env file with YOUR MySQL credentials
   ```

3. **Start Backend:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate         # Windows
   source venv/bin/activate      # Mac/Linux
   pip install -r requirements.txt
   python app.py
   ```

4. **Start Frontend (New Terminal):**
   ```bash
   cd frontend
   npm install
   npm start
   ```



---

## 🔑 **CRITICAL: Admin Setup (REQUIRED)**

**⚠️ This is the MOST IMPORTANT step! Without an admin, the app won't work properly.**

The attendance system requires at least **ONE ADMIN** to function. Only admins can:
- Add new employees to the system
- Delete employees
- View all attendance records
- Manage the entire organization

### **Steps to Create First Admin:**

1. **Sign up for the first account:**
   - Go to http://localhost:3000
   - Click "Sign Up"
   - Fill in details with a 6-digit Employee ID (e.g., `100001`)
   - Complete signup

2. **Make this user an Admin** (Choose ONE method):

   **Option A - Using MySQL Workbench/Command Line:**
   ```sql
   -- Open MySQL and run these statements one by one:
   USE user_auth_db;
   UPDATE users SET is_admin = 1 WHERE employee_id = '100001';
   ```

   **Option B - Using phpMyAdmin:**
   - Open phpMyAdmin
   - Select `user_auth_db` database
   - Click on `users` table
   - Find your user row
   - Edit `is_admin` column to `1`
   - Save changes

3. **Login as Admin:**
   - Logout (if logged in)
   - Login with your Employee ID and password
   - You now have full admin access!

4. **Add More Employees:**
   - As admin, go to "Employee Management" tab
   - Click "Add New Employee"
   - Fill in employee details **including initial password**
   - New employees can now login and use the system

### **Important Notes:**
- **Only admins can add employees** - regular signup is for the first admin only
- **Admin users can ONLY mark their OWN attendance** - not other employees' attendance
- **Attendance validation** - Cannot mark as absent/late multiple times on the same day
- **Each employee can only mark attendance once per day** - prevents duplicate entries
- **Admins set employee passwords** when adding them
- Employees can reset their passwords using "Forgot Password"
- You can create multiple admins by updating the `is_admin` field to `1` in the database
- **Records are downloadable as PDF** - not CSV format

---

## 🧪 **Testing Guide **

### **Quick Test Setup (5 minutes)**

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   cd YOUR-REPO-NAME
   ```

2. **Prerequisites Check:**
   - Python 3.8+ installed: `python --version`
   - Node.js 16+ installed: `node --version`
   - MySQL running: Check MySQL service is active

3. **Setup Database:**
   ```sql
   -- Open MySQL Command Line or Workbench
   CREATE DATABASE user_auth_db;
   ```

4. **Configure Backend:**
   ```bash
   cd backend
   copy .env.example .env    # Windows
   # cp .env.example .env    # Mac/Linux
   
   # Edit .env file with your MySQL credentials:
   # DB_PASSWORD=your_mysql_password
   
   pip install -r requirements.txt
   python app.py
   ```
   - Backend should start on `http://localhost:5000`

5. **Configure Frontend (New Terminal):**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   - Browser opens automatically at `http://localhost:3000`

### **Test Scenarios:**

#### **Scenario 1: First User Registration & Admin Setup**
1. Click "Sign Up"
2. Fill details with Employee ID: `100001`
3. Complete registration
4. Open MySQL and run:
   ```sql
   USE user_auth_db;
   UPDATE users SET is_admin = 1 WHERE employee_id = '100001';
   ```
5. Login again with Employee ID `100001`
6. - Verify: "Employee Management" tab appears (admin feature)

#### **Scenario 2: Admin Adding New Employee**
1. Login as admin (Employee ID: `100001`)
2. Go to "Employee Management" tab
3. Click "Add New Employee"
4. Fill details:
   - Name: `Test Employee`
   - Email: `test@company.com`
   - Employee ID: `100002`
   - Department: `IT`
   - Initial Password: `password123`
5. - Verify: New employee card appears

#### **Scenario 3: Employee Login & Attendance**
1. Logout from admin account
2. Login with Employee ID: `100002`, Password: `password123`
3. - Verify: Dashboard shows (no "Employee Management" tab - not admin)
4. Go to "Mark Attendance" tab
5. Click "Present" button for your own employee record
6. - Verify: Status changes to "PRESENT"
7. Try clicking "Present" again
8. - Verify: Button is disabled (already marked)
9. Click "Check Out" button
10. - Verify: Status changes to "CHECKED OUT"
11. Go to "Records" tab
12. - Verify: Today's attendance record shows with check-in and check-out times
13. Click "Export PDF" button
14. - Verify: PDF downloads with attendance records

#### **Scenario 4: Password Reset**
1. Logout
2. Click "Forgot Password?"
3. Enter Employee ID: `100002`
4. Enter new password twice
5. - Verify: "Password reset successful" message
6. Login with new password
7. - Verify: Login successful

#### **Scenario 5: Authorization & Security Features**
1. Login as Employee ID: `100002` (non-admin)
2. Go to "Mark Attendance" tab
3. - Verify: Can only mark OWN attendance (other employees show "Not Authorized")
4. Mark attendance as "Present"
5. Try marking as "Absent" immediately after
6. - Verify: Button is disabled (already marked today)
7. Logout and login as admin (`100001`)
8. Go to "Mark Attendance" tab
9. - Verify: Admin also sees "Not Authorized" for other employees (can only mark own attendance)
10. Go to "Records" tab
11. - Verify: Admin can see ALL employee records
12. - Verify: Admin can download PDF of all records

#### **Scenario 6: Responsive Design**
1. Press F12 (Developer Tools)
2. Click device toolbar (mobile view icon)
3. Select "iPhone 12 Pro" or similar
4. - Verify: Login page fits mobile screen
5. Login and check dashboard
6. - Verify: All cards stack vertically, buttons are usable

### **Expected Results:**
- User authentication works with JWT tokens
- Admin can add/delete employees (soft delete with is_active flag)
- Admin can ONLY mark their OWN attendance
- Non-admin users can ONLY mark their own attendance
- Non-admin users see only their own attendance records
- Admin users see ALL attendance records in Records tab
- Attendance marking validates against duplicate entries
- Cannot mark absent/late multiple times on the same day
- Check-in and check-out functionality works with timestamps
- Records tab displays all historical attendance data
- PDF export generates professional formatted reports
- Password reset works correctly
- Responsive design on mobile/tablet/desktop
- No console errors in browser (F12 → Console)
- Session isolation prevents users from seeing each other's cached data

### **Common Issues & Solutions:**
| Issue | Solution |
|-------|----------|
| Backend won't start | Check `.env` file has correct MySQL password |
| "Cannot connect to server" | Ensure backend is running on port 5000 |
| Database errors | Run `CREATE DATABASE user_auth_db;` in MySQL |
| Port 3000 already in use | Kill existing Node process or use different port |

---



---

## 💻 Tech Stack

**Frontend:** React 19.2.3, Tailwind CSS, lucide-react, jsPDF, jspdf-autotable  
**Backend:** Flask 3.1.2, Python 3.8+, JWT, Bcrypt, MySQL Connector  
**Database:** MySQL 8.0  


## 🔧 Configuration

### Database Credentials

Edit `backend/.env` file:
```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=user_auth_db
DB_PORT=3306
```



---

## 📊 API Endpoints

### Authentication
- `POST /api/signup` - Create new user
- `POST /api/login` - Login user
- `GET /api/profile` - Get user profile

### Employee Management
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Add new employee
- `DELETE /api/employees/:id` - Delete employee
- `PUT /api/employees/:id/status` - Update status

### Attendance
- `POST /api/employee-attendance` - Mark attendance (check-in)
- `POST /api/employee-attendance` (action=check_out) - Check out
- `GET /api/employee-attendance` - Get all attendance records (admin sees all, user sees own)
- `GET /api/employee-attendance/date/<date>` - Get attendance for specific date

---

## 🐛 Troubleshooting

**Backend not starting?**
- Check if MySQL is running
- Verify credentials in `backend/.env`
- Ensure port 5000 is available

**Frontend not loading?**
- Check if backend is running
- Verify port 3002 is available
- Try: `rm -rf node_modules && npm install`

**Database errors?**
- Verify MySQL service is running
- Check database user permissions


---

## 🚀 Deployment

### Production Checklist
- [ ] Configure environment variables in `.env`
- [ ] Set `FLASK_DEBUG=False`
- [ ] Build React: `npm run build`
- [ ] Use production WSGI server (Gunicorn)
- [ ] Set up HTTPS
- [ ] Configure firewall rules
- [ ] Regular database backups

---

## 🎯 Usage

1. **Sign Up:** Create your first account (will be made admin via database)
2. **Login as Admin:** Access full system features
3. **Add Employees:** Go to Employee Management tab and add team members
4. **Mark Attendance:** Each user marks their own attendance (Present/Absent/Late)
5. **Check Out:** Click Check Out button when leaving for the day
6. **View Dashboard:** See real-time attendance statistics (admin sees all, users see own)
7. **View Records:** Access complete attendance history with date filtering
8. **Export Reports:** Download attendance records as PDF with professional formatting
9. **Manage Employees:** Admin can add/delete employees and view all records

---



---

## 📄 License

Open-source and available for personal and commercial use.

---

## 🎉 Credits

Built with React, Flask, MySQL, Tailwind CSS, and ❤️

---

**🚀 Ready to start? Follow the Quick Start guide above!**






