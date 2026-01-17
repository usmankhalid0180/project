/**
 * AttendanceSystem Component
 * Main employee management and attendance tracking interface
 * 
 * Features:
 * - Dashboard with real-time statistics
 * - Employee list management (admin only)
 * - Attendance marking (role-based: admins can mark anyone, users mark own)
 * - Attendance records viewing
 * - Employee CRUD operations (admin only)
 * 
 * Role-based access control:
 * - Admin: Full access to all employees and attendance records
 * - Regular User: Can only view/mark their own attendance
 * 
 * Author: [Your Name]
 * Date: January 2026
 */

import React, { useState, useEffect } from 'react';
// Import icons for UI elements
import { Calendar, Users, Clock, TrendingUp, Download, Upload, Search, Filter, UserPlus, CheckCircle, XCircle, AlertCircle, LogOut, Trash2, User } from 'lucide-react';
// Import PDF generation libraries
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * AttendanceSystem Main Component
 * @param {Object} currentUser - Current logged-in user object
 * @param {Function} onLogout - Logout callback function
 */
const AttendanceSystem = ({ currentUser, onLogout }) => {
  // ===== STATE MANAGEMENT =====
  const [activeTab, setActiveTab] = useState('dashboard'); // Current active tab (dashboard/employees/attendance/add-employee)
  const [employees, setEmployees] = useState([]); // List of all employees
  const [attendanceRecords, setAttendanceRecords] = useState([]); // Attendance records for selected date (Mark Attendance tab)
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]); // All attendance records (Records tab)
  const [userInfo, setUserInfo] = useState(null); // Detailed user information including admin status

  // UI state
  const [searchTerm, setSearchTerm] = useState(''); // Search filter for employees
  const [filterDept, setFilterDept] = useState('all'); // Department filter
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Date for viewing attendance records (defaults to today)
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', department: '', employeeId: '', password: '' }); // Form data for adding new employee
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [showDeleted, setShowDeleted] = useState(false); // Toggle to show deleted employees (admin only)
  const [selectedEmployee, setSelectedEmployee] = useState(null); // Currently selected employee for details view
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false); // Toggle employee details modal

  /**
   * Fetch user information on component mount
   * Gets detailed user data including admin status and employee record ID
   */
  useEffect(() => {
    fetchUserInfo();
    fetchAllAttendanceRecords(); // Fetch all records for Records tab
  }, []);

  /**
   * Fetch employees and attendance records when showDeleted toggle changes or selectedDate changes
   * Refreshes data to show either active or deleted employees and attendance for the selected date
   */
  useEffect(() => {
    fetchEmployees();
    fetchAttendanceRecords();
  }, [showDeleted, selectedDate]);

  /**
   * Refresh all attendance records when switching to records tab
   */
  useEffect(() => {
    if (activeTab === 'records') {
      console.log('[FRONTEND] Records tab accessed - fetching all records');
      fetchAllAttendanceRecords();
    }
  }, [activeTab]);

  /**
   * Monitor allAttendanceRecords state changes
   */
  useEffect(() => {
    console.log(`[FRONTEND] allAttendanceRecords state changed. Count: ${allAttendanceRecords.length}`);
    if (allAttendanceRecords.length > 0) {
      console.log(`[FRONTEND] Sample record:`, allAttendanceRecords[0]);
    }
  }, [allAttendanceRecords]);

  /**
   * Fetch current user information from backend
   * Retrieves user details including role and linked employee record
   */
  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/user/info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);
      } else {
        console.error('Failed to fetch user info');
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  /**
   * Check if current user has admin privileges
   * @returns {boolean} True if user is admin, false otherwise
   */
  const isAdmin = () => {
    return currentUser?.is_admin || userInfo?.is_admin || false;
  };

  /**
   * Check if user has permission to mark attendance for specific employee
   * 
   * Authorization logic:
   * - Admin users: Can mark attendance for ANY employee
   * - Regular users: Can only mark their OWN attendance
   * 
   * @param {number} employeeId - Employee record ID to check permission for
   * @returns {boolean} True if user can mark this employee's attendance
   */
  const canMarkAttendance = (employeeId) => {
    console.log('canMarkAttendance check:', {
      employeeId,
      userInfo,
      employee_record_id: userInfo?.employee_record_id,
      isAdmin: isAdmin(),
      employees: employees
    });
    
    // Find the employee record
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      return false;
    }
    
    // Check if current user's email matches employee's email
    const userEmail = userInfo?.email?.toLowerCase().trim();
    const employeeEmail = employee?.email?.toLowerCase().trim();
    
    console.log('Email comparison:', { userEmail, employeeEmail, match: userEmail === employeeEmail });
    
    // Everyone (admin or not) can only mark their own attendance
    return userEmail === employeeEmail;
  };

  /**
   * Fetch employee list from backend
   * 
   * Role-based filtering:
   * - Admin: Retrieves all employees (active or deleted based on showDeleted toggle)
   * - Regular User: Retrieves only their own employee record
   */
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = showDeleted ? 'http://localhost:5000/api/employees/deleted' : 'http://localhost:5000/api/employees';
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      } else {
        console.error('Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch attendance records for selected date
   * 
   * Role-based filtering:
   * - Admin: Retrieves all attendance records for the date
   * - Regular User: Retrieves only their own attendance record
   * 
   * Formats records to match frontend display structure
   */
  const fetchAttendanceRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log(`[FRONTEND] Fetching attendance records for date: ${selectedDate}`);
      console.log(`[FRONTEND] User is admin: ${isAdmin()}`);
      
      // Fetch records for the selected date (for mark attendance display)
      const response = await fetch(`http://localhost:5000/api/employee-attendance/date/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[FRONTEND] Received ${data.records.length} attendance records from backend`);
        
        // Convert the records to match the frontend format
        const formattedRecords = data.records.map(record => ({
          id: record.id,
          employeeId: record.employee_id,
          employeeName: record.employee_name,
          date: record.date,
          checkIn: record.check_in || '-',
          checkOut: record.check_out || '-',
          status: record.status
        }));
        
        console.log(`[FRONTEND] Formatted records:`, formattedRecords);
        setAttendanceRecords(formattedRecords);
      } else {
        console.error('[FRONTEND] Failed to fetch attendance records, status:', response.status);
      }
    } catch (error) {
      console.error('[FRONTEND] Error fetching attendance records:', error);
    }
  };

  /**
   * Fetch ALL attendance records for Records tab
   * Shows complete history for admin (all employees) or user (own records only)
   */
  const fetchAllAttendanceRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log(`[FRONTEND] Fetching ALL attendance records`);
      console.log(`[FRONTEND] API URL: http://localhost:5000/api/employee-attendance?limit=500`);
      console.log(`[FRONTEND] Token present: ${!!token}`);
      
      const response = await fetch(`http://localhost:5000/api/employee-attendance?limit=500`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`[FRONTEND] Response status: ${response.status}`);
      console.log(`[FRONTEND] Response ok: ${response.ok}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[FRONTEND] Received ${data.records.length} total attendance records`);
        console.log(`[FRONTEND] Raw records data:`, data.records);
        
        const formattedRecords = data.records.map(record => ({
          id: record.id,
          employeeId: record.employee_id,
          employeeName: record.employee_name,
          date: record.date,
          checkIn: record.check_in || '-',
          checkOut: record.check_out || '-',
          status: record.status
        }));
        
        console.log(`[FRONTEND] Formatted records:`, formattedRecords);
        console.log(`[FRONTEND] Setting allAttendanceRecords state with ${formattedRecords.length} records`);
        setAllAttendanceRecords(formattedRecords);
        console.log(`[FRONTEND] allAttendanceRecords state updated`);
      } else {
        const errorText = await response.text();
        console.error(`[FRONTEND] Failed to fetch all attendance records. Status: ${response.status}`, errorText);
      }
    } catch (error) {
      console.error('[FRONTEND] Error fetching all attendance records:', error);
    }
  };

  /**
   * Calculate real-time dashboard statistics
   * Computed from current employees array state
   * 
   * Stats include:
   * - Total employees count
   * - Present/Absent/Late counts
   * - Overall attendance rate percentage
   */
  const stats = {
    totalEmployees: employees.length,
    presentToday: employees.filter(e => e.status === 'present').length,
    absentToday: employees.filter(e => e.status === 'absent').length,
    lateToday: employees.filter(e => e.status === 'late').length,
    attendanceRate: ((employees.filter(e => e.status === 'present').length / employees.length) * 100).toFixed(1)
  };

  /**
   * Mark attendance for an employee
   * 
   * Process:
   * 1. Check user permission (canMarkAttendance)
   * 2. Create attendance record in database
   * 3. Update employee status
   * 4. Refresh local state
   * 
   * @param {number} employeeId - Employee record ID
   * @param {string} status - Attendance status ('present', 'absent', 'late')
   */
  const handleMarkAttendance = async (employeeId, status) => {
    console.log('handleMarkAttendance called:', { employeeId, status, userInfo });
    
    // Verify user has permission to mark this employee's attendance
    if (!canMarkAttendance(employeeId)) {
      alert('You can only mark your own attendance!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      console.log('Sending attendance request:', { employee_id: employeeId, status, check_in: timeString });
      
      // Save attendance record to backend
      const attendanceResponse = await fetch('http://localhost:5000/api/employee-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_id: employeeId,
          status: status,
          check_in: status === 'present' || status === 'late' ? timeString : null,
          action: 'check_in'
        })
      });

      if (attendanceResponse.ok) {
        // Update employee status
        const statusResponse = await fetch(`http://localhost:5000/api/employees/${employeeId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });

        if (statusResponse.ok) {
          // Update local employee state
          setEmployees(employees.map(e => 
            e.id === employeeId ? { ...e, status } : e
          ));

          // Refresh attendance records from backend
          await fetchAttendanceRecords();
          const statusMessage = status === 'present' ? '✓ Successfully CHECKED IN' : 
                               status === 'late' ? '⚠ Marked as LATE' : 
                               '✗ Marked as ABSENT';
          alert(`${statusMessage}\nTime: ${timeString}`);
        } else {
          alert('Failed to update employee status');
        }
      } else {
        const errorData = await attendanceResponse.json();
        alert(errorData.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Error marking attendance');
    }
  };

  /**
   * Handle employee check-out
   * 
   * @param {number} employeeId - Employee record ID
   */
  const handleCheckOut = async (employeeId) => {
    console.log('handleCheckOut called:', { employeeId, userInfo });
    
    // Verify user has permission
    if (!canMarkAttendance(employeeId)) {
      alert('You can only check out your own attendance!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      console.log('Sending check-out request:', { employee_id: employeeId, check_out: timeString });
      
      // Send check-out request to backend
      const response = await fetch('http://localhost:5000/api/employee-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_id: employeeId,
          check_out: timeString,
          action: 'check_out',
          status: 'checked_out'
        })
      });

      if (response.ok) {
        // Update local employee state to checked_out
        setEmployees(employees.map(e => 
          e.id === employeeId ? { ...e, status: 'checked_out' } : e
        ));

        // Refresh attendance records
        await fetchAttendanceRecords();
        alert(`✓ Successfully CHECKED OUT\nTime: ${timeString}\nDay completed!`);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to check out');
      }
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Error checking out');
    }
  };

  /**
   * Add new employee to the system (Admin only)
   * 
   * Validates:
   * - All required fields are filled
   * - Employee ID is exactly 6 digits
   * - Password is at least 6 characters
   * 
   * Creates both employee record and user account
   */
  const handleAddEmployee = async () => {
    // Check admin permission
    if (!isAdmin()) {
      alert('Only admin can add employees!');
      return;
    }

    if (newEmployee.name && newEmployee.email && newEmployee.department && newEmployee.employeeId && newEmployee.password) {
      // Validate employee ID (6 digits)
      if (newEmployee.employeeId.length !== 6 || !/^\d{6}$/.test(newEmployee.employeeId)) {
        alert('Employee ID must be exactly 6 digits');
        return;
      }

      // Validate password (minimum 6 characters)
      if (newEmployee.password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newEmployee.name,
            email: newEmployee.email,
            department: newEmployee.department,
            employee_id: newEmployee.employeeId,
            password: newEmployee.password
          })
        });

        if (response.ok) {
          const data = await response.json();
          alert('Employee added successfully!');
          setNewEmployee({ name: '', email: '', department: '', employeeId: '', password: '' });
          fetchEmployees(); // Refresh the employee list
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Failed to add employee');
        }
      } catch (error) {
        console.error('Error adding employee:', error);
        alert('Error adding employee');
      }
    } else {
      alert('Please fill all fields');
    }
  };

  /**
   * View detailed employee information (Admin only)
   * 
   * Fetches employee profile and attendance statistics
   * Opens modal with detailed information
   * 
   * @param {number} employeeId - Employee record ID
   */
  const handleViewEmployeeDetails = async (employeeId) => {
    if (!isAdmin()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/employees/${employeeId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedEmployee(data);
        setShowEmployeeDetails(true);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch employee details:', response.status, errorData);
        alert(`Failed to fetch employee details: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      alert(`Error fetching employee details: ${error.message}`);
    }
  };

  /**
   * Delete employee (Soft delete - Admin only)
   * 
   * Marks employee as inactive instead of permanent deletion
   * Preserves data integrity by keeping attendance history
   * Requires confirmation before deletion
   * 
   * @param {number} employeeId - Employee record ID to delete
   */
  const handleDeleteEmployee = async (employeeId) => {
    // Check admin permission
    if (!isAdmin()) {
      alert('Only admin can delete employees!');
      return;
    }

    // Require confirmation before deletion
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/employees/${employeeId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          alert('Employee deleted successfully!');
          fetchEmployees(); // Refresh the employee list
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Failed to delete employee');
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error deleting employee');
      }
    }
  };

  /**
   * Export attendance records to PDF file
   * Creates downloadable PDF file with all attendance records
   * Includes employee name, date, check-in/out times, and status
   */
  const exportToPDF = () => {
    try {
      const records = activeTab === 'records' ? allAttendanceRecords : attendanceRecords;
      
      console.log('[PDF EXPORT] Starting PDF export...');
      console.log('[PDF EXPORT] Records count:', records.length);
      console.log('[PDF EXPORT] Active tab:', activeTab);
      
      // Check if there are records to export
      if (records.length === 0) {
        alert('No records to export. Please make sure there are attendance records available.');
        return;
      }
      
      // Create new PDF document
      const doc = new jsPDF();
      
      // Add title
      const title = activeTab === 'records' ? 'Attendance Records Report' : 'Mark Attendance Report';
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 20);
      
      // Add generation date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      
      // Add user info
      if (currentUser) {
        doc.text(`Generated by: ${currentUser.name || currentUser.email}`, 14, 34);
      }
      
      // Prepare table data
      const tableData = records.map(r => [
        r.employeeName,
        r.date,
        r.checkIn,
        r.checkOut,
        r.status.toUpperCase()
      ]);
      
      console.log('[PDF EXPORT] Table data prepared:', tableData.length, 'rows');
      
      // Add table
      autoTable(doc, {
        startY: 40,
        head: [['Employee Name', 'Date', 'Check In', 'Check Out', 'Status']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue color
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 40 }, // Employee Name
          1: { cellWidth: 30 }, // Date
          2: { cellWidth: 25 }, // Check In
          3: { cellWidth: 25 }, // Check Out
          4: { cellWidth: 30 }, // Status
        },
      });
      
      // Add footer with record count
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 40;
      doc.setFontSize(9);
      doc.text(`Total Records: ${records.length}`, 14, finalY + 10);
      
      // Save the PDF
      const fileName = `attendance_report_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('[PDF EXPORT] Saving PDF as:', fileName);
      doc.save(fileName);
      console.log('[PDF EXPORT] PDF export completed successfully');
      
    } catch (error) {
      console.error('[PDF EXPORT] Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message}`);
    }
  };

  // ===== FILTERED DATA =====
  
  /**
   * Filter employees based on search term and department
   * Used for employee list display with search and filter functionality
   */
  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'all' || e.department === filterDept;
    return matchesSearch && matchesDept;
  });

  // Filter attendance records for selected date
  const todayRecords = attendanceRecords.filter(r => r.date === selectedDate);

  // Extract unique departments from employee list for department filter dropdown
  const departments = [...new Set(employees.map(e => e.department).filter(d => d))];

  // ===== LOADING STATE =====
  // Display loading spinner while initial employee data is being fetched
  if (loading && employees.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 flex justify-between items-center">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg backdrop-blur-sm">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
            </div>
            <span>Attendly</span>
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="hidden md:flex flex-col items-end px-3 sm:px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm font-medium">Welcome, {currentUser?.name || 'User'}</span>
              </div>
              {(userInfo?.employee_id || currentUser?.employee_id) && (
                <span className="text-xs text-blue-200">
                  ID: {userInfo?.employee_id || currentUser?.employee_id}
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 backdrop-blur-sm font-medium hover:scale-105 transform text-sm sm:text-base"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
            {['dashboard', 'mark-attendance', 'records', 'employees', 'reports'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-4 md:px-6 py-3 md:py-4 font-semibold text-xs sm:text-sm md:text-base capitalize transition-all duration-200 relative whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-3'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.replace('-', ' ')}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-full"></div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Header with Date and Quick Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">Dashboard Overview</h2>
                <p className="text-sm sm:text-base text-gray-600 flex items-center gap-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="sm:hidden">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
                <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 font-semibold">This Month</p>
                  <p className="text-lg font-bold text-blue-700">22 Days</p>
                </div>
                <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-600 font-semibold">On Time</p>
                  <p className="text-lg font-bold text-green-700">95%</p>
                </div>
              </div>
            </div>
            
            {/* Main Stats Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white p-4 sm:p-5 md:p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 p-2 sm:p-3 rounded-xl backdrop-blur-sm">
                      <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-100 font-medium uppercase tracking-wider">Total</p>
                      <p className="text-xs sm:text-sm text-blue-50">Employees</p>
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black mb-1">{stats.totalEmployees}</p>
                  <div className="flex items-center gap-1 text-blue-100">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-semibold">Active members</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 text-white p-4 sm:p-5 md:p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 p-2 sm:p-3 rounded-xl backdrop-blur-sm">
                      <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-100 font-medium uppercase tracking-wider">Present</p>
                      <p className="text-xs sm:text-sm text-green-50">Today</p>
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black mb-1">{stats.presentToday}</p>
                  <div className="flex items-center gap-1 text-green-100">
                    <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold">Working now</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500 via-red-600 to-rose-700 text-white p-4 sm:p-5 md:p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 p-2 sm:p-3 rounded-xl backdrop-blur-sm">
                      <XCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-100 font-medium uppercase tracking-wider">Absent</p>
                      <p className="text-xs sm:text-sm text-red-50">Today</p>
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black mb-1">{stats.absentToday}</p>
                  <div className="flex items-center gap-1 text-red-100">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-xs font-semibold">Not checked in</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 text-white p-4 sm:p-5 md:p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 p-2 sm:p-3 rounded-xl backdrop-blur-sm">
                      <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-purple-100 font-medium uppercase tracking-wider">Rate</p>
                      <p className="text-xs sm:text-sm text-purple-50">Overall</p>
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black mb-1">{stats.attendanceRate}%</p>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${stats.attendanceRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Today's Attendance Summary - Takes 2 columns */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-xl p-4 sm:p-6 md:p-8 border border-gray-100">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                    <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <span className="hidden sm:inline">Today's Attendance Summary</span>
                    <span className="sm:hidden">Today's Summary</span>
                  </h3>
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-700 rounded-lg text-xs sm:text-sm font-bold">
                    {todayRecords.length} Records
                  </span>
                </div>
                
                {/* Admin-only notice for non-admin users */}
                {!isAdmin() && (
                  <div className="bg-amber-50 border-2 border-amber-300 p-4 mb-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-800 font-semibold text-sm">Admin Access Only</p>
                        <p className="text-amber-700 text-xs mt-1">Only administrators can view today's attendance summary for all employees.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">{isAdmin() ? (
                  todayRecords.slice(0, 5).map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-xl hover:shadow-lg transition-all duration-200 border-2 border-gray-100 hover:border-blue-200 group">
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-200 ${
                          record.status === 'present' ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 text-white' :
                          record.status === 'absent' ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 text-white' :
                          'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white'
                        }`}>
                          {record.employeeName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base md:text-lg text-gray-800">{record.employeeName}</p>
                          <div className="flex items-center gap-2 sm:gap-3 mt-1">
                            <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span className="hidden sm:inline">In: </span><span className="font-semibold text-gray-700">{record.checkIn}</span>
                            </p>
                            {record.checkOut !== '-' && (
                              <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                                <span className="hidden sm:inline">Out: </span><span className="font-semibold text-gray-700">{record.checkOut}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md ${
                          record.status === 'present' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                          record.status === 'absent' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                          'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                        }`}>
                          {record.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400 mx-auto mb-3 sm:mb-4" />
                    <p className="text-amber-700 text-base sm:text-lg font-semibold">Restricted Access</p>
                    <p className="text-amber-600 text-xs sm:text-sm mt-2">You need administrator privileges to view this section</p>
                  </div>
                )}
                  {isAdmin() && todayRecords.length === 0 && (
                    <div className="text-center py-8 sm:py-12">
                      <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                      <p className="text-gray-500 text-base sm:text-lg font-medium">No attendance records for today</p>
                      <p className="text-gray-400 text-xs sm:text-sm mt-2">Records will appear here as attendance is marked</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats & Department Breakdown */}
              <div className="space-y-4 sm:space-y-6">
                {/* Late Arrivals Card */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border-2 border-yellow-200">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="bg-yellow-500 p-2 sm:p-3 rounded-lg">
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-yellow-700 font-semibold">Late Today</p>
                      <p className="text-2xl sm:text-3xl font-black text-yellow-800">{stats.lateToday}</p>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2 sm:p-3">
                    <p className="text-xs text-yellow-700 font-medium">Employees who checked in late</p>
                  </div>
                </div>

                {/* Department Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-100">
                  <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Department Distribution
                  </h4>
                  <div className="space-y-3">
                    {departments.slice(0, 4).map((dept, index) => {
                      const deptEmployees = employees.filter(e => e.department === dept);
                      const percentage = ((deptEmployees.length / employees.length) * 100).toFixed(0);
                      const colors = [
                        'from-blue-500 to-blue-600',
                        'from-green-500 to-green-600',
                        'from-purple-500 to-purple-600',
                        'from-orange-500 to-orange-600'
                      ];
                      
                      return (
                        <div key={dept}>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs sm:text-sm font-bold text-gray-700">{dept}</span>
                            <span className="text-xs sm:text-sm font-bold text-gray-600">{deptEmployees.length}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 overflow-hidden">
                            <div
                              className={`bg-gradient-to-r ${colors[index % colors.length]} h-2 sm:h-2.5 rounded-full transition-all duration-500 shadow-sm`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mark Attendance */}
        {activeTab === 'mark-attendance' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Mark Attendance</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
              />
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Employee</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Department</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Check In</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Check Out</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-gray-200">
                    {employees.map(emp => {
                      // Find today's attendance record for this employee
                      const todayAttendance = attendanceRecords.find(
                        record => record.employeeId === emp.id && record.date === selectedDate
                      );
                      
                      // Debug logging
                      if (emp.id === 1) { // Log for first employee only
                        console.log(`[DEBUG] Employee ${emp.name} (ID: ${emp.id}):`, {
                          employeeId: emp.id,
                          selectedDate,
                          attendanceRecordsCount: attendanceRecords.length,
                          todayAttendance: todayAttendance,
                          allRecordsForThisEmployee: attendanceRecords.filter(r => r.employeeId === emp.id)
                        });
                      }
                      
                      return (
                      <tr key={emp.id} className="hover:bg-blue-50 transition-colors duration-150">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-md text-sm sm:text-base">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-sm sm:text-base">{emp.name}</p>
                              <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px]">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-semibold">
                            {emp.department}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="text-gray-700 font-medium text-xs sm:text-sm">
                            {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="text-gray-700 font-semibold text-xs sm:text-sm">
                            {todayAttendance?.checkIn || '-'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="text-gray-700 font-semibold text-xs sm:text-sm">
                            {todayAttendance?.checkOut || '-'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm ${
                            todayAttendance?.status === 'present' ? 'bg-green-100 text-green-700 border border-green-200' :
                            todayAttendance?.status === 'absent' ? 'bg-red-100 text-red-700 border border-red-200' :
                            todayAttendance?.status === 'checked_out' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            todayAttendance?.status === 'late' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                            'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {todayAttendance?.status ? (todayAttendance.status === 'checked_out' ? 'CHECKED OUT' : todayAttendance.status.toUpperCase()) : 'NOT MARKED'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex flex-wrap lg:flex-nowrap gap-1 sm:gap-2">
                            {canMarkAttendance(emp.id) ? (
                              todayAttendance?.status === 'checked_out' ? (
                                <span className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-100 text-gray-600 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap">
                                  Day Completed
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleMarkAttendance(emp.id, 'present')}
                                    disabled={todayAttendance?.status === 'present' || todayAttendance?.status === 'checked_out'}
                                    className={`px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap ${(todayAttendance?.status === 'present' || todayAttendance?.status === 'checked_out') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => handleMarkAttendance(emp.id, 'absent')}
                                    disabled={todayAttendance?.status === 'absent' || todayAttendance?.status === 'present' || todayAttendance?.status === 'checked_out'}
                                    className={`px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap ${(todayAttendance?.status === 'absent' || todayAttendance?.status === 'present' || todayAttendance?.status === 'checked_out') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    Absent
                                  </button>
                                  <button
                                    onClick={() => handleMarkAttendance(emp.id, 'late')}
                                    disabled={todayAttendance?.status === 'late' || todayAttendance?.status === 'present' || todayAttendance?.status === 'checked_out'}
                                    className={`px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap ${(todayAttendance?.status === 'late' || todayAttendance?.status === 'present' || todayAttendance?.status === 'checked_out') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    Late
                                  </button>
                                  {(todayAttendance?.status === 'present' || todayAttendance?.status === 'late') && (
                                    <button
                                      onClick={() => handleCheckOut(emp.id)}
                                      className="px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap"
                                    >
                                      Check Out
                                    </button>
                                  )}
                                </>
                              )
                            ) : (
                              <span className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-100 text-gray-500 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap">
                                Not Authorized
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Records */}
        {activeTab === 'records' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Attendance Records</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {isAdmin() ? 'Complete attendance records for all employees' : 'Your complete attendance records'}
                </p>
              </div>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                Export PDF
              </button>
            </div>

            {/* Debug info */}
            {console.log(`[FRONTEND RENDER] Records tab rendering. allAttendanceRecords.length = ${allAttendanceRecords.length}`)}

            {allAttendanceRecords.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-100">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-gray-100 p-4 rounded-full">
                    <Calendar className="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Records Found</h3>
                    <p className="text-gray-600">
                      No attendance records available
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Records will appear here after employees mark their attendance
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">
                    Showing {allAttendanceRecords.length} total record(s) - All dates including today
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Employee</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Check In</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Check Out</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {allAttendanceRecords.map(record => (
                        <tr key={record.id} className="hover:bg-blue-50 transition-colors duration-150">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-gray-800 text-sm sm:text-base">{record.employeeName}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600 text-xs sm:text-sm">{record.date}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-700 font-semibold text-xs sm:text-sm">{record.checkIn}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-700 font-semibold text-xs sm:text-sm">{record.checkOut}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <span className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm ${
                              record.status === 'present' ? 'bg-green-100 text-green-700 border border-green-200' :
                              record.status === 'checked_out' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              record.status === 'absent' ? 'bg-red-100 text-red-700 border border-red-200' :
                              record.status === 'late' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                              'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {record.status.toUpperCase().replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Employee Management */}
        {activeTab === 'employees' && (
          <div>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Employee Management</h2>
              
              {/* Toggle for viewing deleted employees - Admin Only */}
              {isAdmin() && (
                <button
                  onClick={() => setShowDeleted(!showDeleted)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    showDeleted 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {showDeleted ? 'View Active Employees' : 'View Deleted Employees'}
                </button>
              )}
            </div>

            {/* Add Employee Form - Admin Only */}
            {isAdmin() && !showDeleted && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 lg:p-8 mb-4 sm:mb-6 border border-blue-100">
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 md:mb-6 flex items-center gap-2 text-gray-800">
                  <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
                    <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  Add New Employee
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                  <input
                    type="text"
                    placeholder="Employee Name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-base"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-base"
                  />
                  <input
                    type="text"
                    placeholder="Employee ID (6 digits)"
                    value={newEmployee.employeeId}
                    onChange={(e) => setNewEmployee({...newEmployee, employeeId: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-base"
                    maxLength="6"
                  />
                  <select
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-base bg-white"
                  >
                    <option value="">Select Department</option>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                  <input
                    type="password"
                    placeholder="Initial Password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-base"
                  />
                </div>
                <button
                  onClick={handleAddEmployee}
                  className="mt-3 sm:mt-4 md:mt-6 px-6 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-sm sm:text-base w-full md:w-auto flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Add Employee
                </button>
              </div>
            )}

            {/* Viewing Deleted Employees Notice - Admin Only */}
            {isAdmin() && showDeleted && (
              <div className="bg-red-50 border-2 border-red-300 p-6 mb-6 rounded-xl shadow-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-8 h-8 text-red-500 mr-4 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-red-800 font-bold text-lg mb-2">📋 Viewing Deleted Employees</p>
                    <p className="text-red-700 text-sm mb-3">You are currently viewing employees that have been deleted. These are archived records only.</p>
                    <button
                      onClick={() => setShowDeleted(false)}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md transition-all transform hover:scale-105"
                    >
                      ← Back to Active Employees & Add New Employee
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Non-Admin Notice */}
            {!isAdmin() && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
                <div className="flex">
                  <AlertCircle className="w-6 h-6 text-yellow-400 mr-3" />
                  <div>
                    <p className="text-yellow-800 font-semibold">Limited Access</p>
                    <p className="text-yellow-700 text-sm mt-1">Only admin can add or remove employees. You can view your own data.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
                  />
                </div>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredEmployees.map(emp => (
                <div key={emp.id} className={`rounded-xl shadow-lg p-4 sm:p-6 border hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative ${
                  showDeleted ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-100'
                }`}>
                  {isAdmin() && !showDeleted && (
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all duration-200 hover:scale-110 transform"
                      title="Delete Employee"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                  {showDeleted && (
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold">
                      DELETED
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3 sm:mb-4 pr-8 sm:pr-10">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center text-lg sm:text-xl md:text-2xl font-bold shadow-lg">
                      {emp.name.charAt(0)}
                    </div>
                    <span className={`px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm ${
                      emp.status === 'present' ? 'bg-green-100 text-green-700 border border-green-200' :
                      emp.status === 'absent' ? 'bg-red-100 text-red-700 border border-red-200' :
                      'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }`}>
                      {emp.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg md:text-xl mb-1 sm:mb-2 text-gray-800">{emp.name}</h3>
                  <p className="text-gray-500 text-xs sm:text-sm mb-1 sm:mb-2 flex items-center gap-1 truncate">
                    <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></div>
                    <span className="truncate">{emp.email}</span>
                  </p>
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                    <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-semibold">
                      {emp.department}
                    </span>
                    {showDeleted && emp.deleted_at && (
                      <p className="text-red-500 text-xs mt-2">
                        Deleted: {new Date(emp.deleted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  {/* View Details Button for Admin */}
                  {isAdmin() && !showDeleted && (
                    <button
                      onClick={() => handleViewEmployeeDetails(emp.id)}
                      className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      View Full Details
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800">Attendance Reports</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Department-wise Attendance */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-800 flex items-center gap-2">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  Department-wise Attendance
                </h3>
                <div className="space-y-4 sm:space-y-6">
                  {departments.map(dept => {
                    const deptEmployees = employees.filter(e => e.department === dept);
                    const deptPresent = deptEmployees.filter(e => e.status === 'present').length;
                    const percentage = ((deptPresent / deptEmployees.length) * 100).toFixed(0);
                    
                    return (
                      <div key={dept} className="bg-gradient-to-r from-gray-50 to-white p-3 sm:p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="font-bold text-gray-800 text-sm sm:text-base">{dept}</span>
                          <span className="text-gray-600 font-semibold text-xs sm:text-sm">{deptPresent}/{deptEmployees.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 sm:h-3 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-right mt-1">
                          <span className="text-xs sm:text-sm font-bold text-blue-600">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Summary */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  Monthly Summary
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center p-4 sm:p-5 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 hover:shadow-md transition-all duration-200">
                    <div>
                      <p className="text-xs sm:text-sm text-green-600 font-semibold mb-1">Total Present Days</p>
                      <p className="text-2xl sm:text-3xl font-bold text-green-700">185</p>
                    </div>
                    <div className="bg-green-200 p-2 sm:p-3 rounded-lg">
                      <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-700" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 sm:p-5 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200 hover:shadow-md transition-all duration-200">
                    <div>
                      <p className="text-xs sm:text-sm text-red-600 font-semibold mb-1">Total Absent Days</p>
                      <p className="text-2xl sm:text-3xl font-bold text-red-700">15</p>
                    </div>
                    <div className="bg-red-200 p-2 sm:p-3 rounded-lg">
                      <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-700" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 sm:p-5 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 hover:shadow-md transition-all duration-200">
                    <div>
                      <p className="text-xs sm:text-sm text-yellow-600 font-semibold mb-1">Late Arrivals</p>
                      <p className="text-2xl sm:text-3xl font-bold text-yellow-700">8</p>
                    </div>
                    <div className="bg-yellow-200 p-2 sm:p-3 rounded-lg">
                      <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEmployeeDetails(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Employee Details</h2>
                  <p className="text-blue-100">Complete information and statistics</p>
                </div>
                <button
                  onClick={() => setShowEmployeeDetails(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Personal Information */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Full Name</p>
                    <p className="font-semibold text-gray-800">{selectedEmployee.employee?.name}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Email Address</p>
                    <p className="font-semibold text-gray-800">{selectedEmployee.employee?.email}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                    <p className="font-semibold text-gray-800">{selectedEmployee.employee?.employee_id || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Department</p>
                    <p className="font-semibold text-gray-800">{selectedEmployee.employee?.department}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Current Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      selectedEmployee.employee?.status === 'present' ? 'bg-green-100 text-green-700' :
                      selectedEmployee.employee?.status === 'absent' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedEmployee.employee?.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Statistics */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Attendance Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                    <p className="text-2xl font-bold text-blue-700">{selectedEmployee.attendance_stats?.total_days || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">Total Days</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                    <p className="text-2xl font-bold text-green-700">{selectedEmployee.attendance_stats?.present_days || 0}</p>
                    <p className="text-xs text-green-600 mt-1">Present</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                    <p className="text-2xl font-bold text-red-700">{selectedEmployee.attendance_stats?.absent_days || 0}</p>
                    <p className="text-xs text-red-600 mt-1">Absent</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-200">
                    <p className="text-2xl font-bold text-yellow-700">{selectedEmployee.attendance_stats?.late_days || 0}</p>
                    <p className="text-xs text-yellow-600 mt-1">Late</p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Account Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Joined On</p>
                  <p className="font-semibold text-gray-800">
                    {selectedEmployee.employee?.created_at 
                      ? new Date(selectedEmployee.employee.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowEmployeeDetails(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSystem;
