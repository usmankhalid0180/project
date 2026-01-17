/**
 * AdminDashboard Component
 * Enhanced admin dashboard with comprehensive attendance statistics and visualizations
 * 
 * Features:
 * - Real-time attendance statistics (total, present, absent, late)
 * - Monthly attendance overview with bar charts
 * - Attendance summary with pie chart visualization
 * - Recent check-ins table
 * - Late arrivals tracking with progress bars
 * - Absent employees list
 * - Upcoming holidays calendar
 * 
 * Note: Currently uses mock data for demonstration
 * Can be integrated with real API data by replacing mock values
 * 
 * Author: [Your Name]
 * Date: January 2026
 */

import React from 'react';
// Import icons for UI elements
import { 
  User, CheckCircle, AlertCircle, Clock, Calendar, 
  Bell, Settings, ChevronDown, BarChart3, Download
} from 'lucide-react';

/**
 * AdminDashboard Main Component
 * @param {Object} currentUser - Current logged-in user object
 * @param {Date} currentTime - Current date/time for display
 * @param {Function} handleLogout - Logout callback function
 */
const AdminDashboard = ({ currentUser, currentTime, handleLogout }) => {
  // ===== MOCK DATA =====
  // In production, this would be fetched from backend API
  
  // Overall attendance statistics
  const stats = {
    totalEmployees: 248,
    presentToday: 195,
    absentToday: 32,
    lateToday: 14,
    onTime: 178,
    late: 17
  };

  // Monthly attendance trend data (7 months)
  const monthlyData = [
    { month: 'Jan', present: 180, absent: 15 },
    { month: 'Feb', present: 175, absent: 18 },
    { month: 'Mar', present: 145, absent: 12 },
    { month: 'Apr', present: 210, absent: 20 },
    { month: 'May', present: 220, absent: 18 },
    { month: 'Jun', present: 280, absent: 25 },
    { month: 'Jul', present: 140, absent: 10 },
  ];

  // Calculate maximum present count for chart scaling
  const maxPresent = Math.max(...monthlyData.map(d => d.present));

  // Recent employee check-in records
  const recentCheckIns = [
    { name: 'Michael Davis', checkIn: '8:45 AM', checkOut: '5:15 PM', status: 'On Time' },
    { name: 'Sarah Lee', checkIn: '9:10 AM', checkOut: '6:00 PM', status: 'Late' },
    { name: 'David Johnson', checkIn: '8:30 AM', checkOut: '5:00 PM', status: 'On Time' },
    { name: 'Emily Clark', checkIn: '8:55 AM', checkOut: '5:20 PM', status: 'On Time' },
  ];

  // Employees with frequent late arrivals (showing percentage)
  const lateArrivals = [
    { name: 'Alex Turner', percentage: 90 },
    { name: 'Lisa Wong', percentage: 70 },
    { name: 'Mark Evans', percentage: 60 },
    { name: 'Jason Reed', percentage: 55 },
  ];

  // Currently absent employees with reasons
  const absentEmployees = [
    { name: 'Robert Wilson', department: 'Sales', reason: 'Sick Leave' },
    { name: 'Anna Miller', department: 'HR', reason: 'Personal Leave' },
    { name: 'James Brown', department: 'IT', reason: 'Vacation' },
  ];

  // Upcoming company holidays
  const holidays = [
    { name: 'Memorial Day', date: 'May 27, 2024', color: 'blue' },
    { name: 'Independence Day', date: 'July 4, 2024', color: 'red' },
    { name: 'Labor Day', date: 'September 2, 2024', color: 'orange' },
  ];

  // ===== COMPONENT RENDER =====
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== TOP NAVIGATION BAR ===== */}
      <nav className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto max-w-full px-4 sm:px-6 py-3 md:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          {/* Logo and App Title */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold">Attendance System</h1>
          </div>

          {/* Right Side - Action Icons and User Profile */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            {/* Action buttons (Calendar, Notifications, Settings) */}
            <div className="hidden sm:flex items-center space-x-2 md:space-x-4">
              <button className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition">
                <Calendar className="w-4 h-4 md:w-6 md:h-6" />
              </button>
              <button className="relative p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition">
                <Bell className="w-4 h-4 md:w-6 md:h-6" />
                {/* Notification indicator badge */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition">
                <Settings className="w-4 h-4 md:w-6 md:h-6" />
              </button>
            </div>

            {/* User Profile Section */}
            <div className="flex items-center space-x-2 sm:space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center">
                <User className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="hidden sm:block">
                <p className="font-semibold text-xs sm:text-sm">{currentUser?.name || 'John Smith'} | Admin</p>
                <p className="text-xs opacity-90">Welcome, {currentUser?.name?.split(' ')[0] || 'John'}!</p>
              </div>
              <ChevronDown className="hidden sm:block w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
        </div>
      </nav>

      {/* ===== MAIN DASHBOARD CONTENT ===== */}
      <div className="container mx-auto max-w-full px-4 sm:px-6 py-4 sm:py-6">
        {/* ===== TOP STATISTICS CARDS ===== */}
        {/* Grid of 4 cards showing key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Total Employees Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 sm:p-5 md:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm opacity-90 mb-1">Total Employees</p>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold">{stats.totalEmployees}</p>
              </div>
              <div className="bg-white/20 p-2 sm:p-3 md:p-4 rounded-lg">
                <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9" />
              </div>
            </div>
          </div>

          {/* Present Today Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 sm:p-5 md:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm opacity-90 mb-1">Present Today</p>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold">{stats.presentToday}</p>
              </div>
              <div className="bg-white/20 p-2 sm:p-3 md:p-4 rounded-lg">
                <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9" />
              </div>
            </div>
          </div>

          {/* Absent Today Card */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 sm:p-5 md:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm opacity-90 mb-1">Absent Today</p>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold">{stats.absentToday}</p>
              </div>
              <div className="bg-white/20 p-2 sm:p-3 md:p-4 rounded-lg">
                <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9" />
              </div>
            </div>
          </div>

          {/* Late Today Card */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 sm:p-5 md:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm opacity-90 mb-1">Late Today</p>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold">{stats.lateToday}</p>
              </div>
              <div className="bg-white/20 p-2 sm:p-3 md:p-4 rounded-lg">
                <Clock className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9" />
              </div>
            </div>
          </div>
        </div>

        {/* ===== MAIN DASHBOARD GRID (3 columns) ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
          {/* LEFT COLUMN - Today's Check-Ins Summary */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-5 md:p-6">
            <div className="flex items-center mb-3 sm:mb-4">
              <CheckCircle className="text-blue-600 mr-2 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <h3 className="text-base sm:text-lg font-bold text-gray-800">Check-Ins Today</h3>
            </div>
            {/* Large number display */}
            <div className="text-center py-4 sm:py-6">
              <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800">{stats.presentToday}</p>
              {/* Breakdown: On Time vs Late */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="text-green-600 mr-2" size={18} />
                    <span className="text-sm text-gray-600">On Time:</span>
                  </div>
                  <span className="font-bold text-gray-800">{stats.onTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className="text-red-600 mr-2" size={18} />
                    <span className="text-sm text-gray-600">Late:</span>
                  </div>
                  <span className="font-bold text-gray-800">{stats.late}</span>
                </div>
              </div>
              {/* Current date display */}
              <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                <Calendar className="mr-2" size={16} />
                April 22, 2024
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN - Monthly Attendance Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Attendance Overview</h3>
            {/* Bar chart showing present vs absent for each month */}
            <div className="flex items-end justify-between gap-0.5 sm:gap-1 md:gap-2 h-32 sm:h-40 md:h-48">
              {monthlyData.map((item, idx) => {
                // Calculate bar heights relative to max value
                const presentHeight = (item.present / maxPresent) * 100;
                const absentHeight = (item.absent / maxPresent) * 100;
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 min-w-[35px] sm:min-w-[50px] md:min-w-[60px]">
                    <div className="w-full relative flex items-end justify-center h-full">
                      {/* Present bar (blue) */}
                      <div 
                        className="w-8 sm:w-10 md:w-12 bg-blue-500 rounded-t transition-all hover:bg-blue-600" 
                        style={{ height: `${presentHeight}%` }}
                      ></div>
                      {/* Absent bar (red, smaller width) */}
                      <div 
                        className="absolute bottom-0 w-3 sm:w-4 bg-red-400 rounded-t" 
                        style={{ height: `${absentHeight}%`, right: '0' }}
                      ></div>
                    </div>
                    {/* Month label */}
                    <span className="text-xs text-gray-600 mt-1 sm:mt-2">{item.month}</span>
                  </div>
                );
              })}
            </div>
            {/* Chart legend */}
            <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                <span>Present</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-400 rounded mr-2"></div>
                <span>Absent</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Attendance Summary Pie Chart */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-5 md:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Attendance Summary</h3>
            {/* SVG Pie Chart showing Present/Absent/Late percentages */}
            <div className="flex items-center justify-center py-4 sm:py-6">
              <div className="relative w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48">
                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                  {/* Background circle (gray) */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="30" />
                  {/* Present segment (78% - blue) */}
                  <circle 
                    cx="100" cy="100" r="80" 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="30" 
                    strokeDasharray={`${78 * 5.02} 502`}
                    strokeLinecap="round"
                  />
                  {/* Absent segment (13% - red) */}
                  <circle 
                    cx="100" cy="100" r="80" 
                    fill="none" 
                    stroke="#ef4444" 
                    strokeWidth="30" 
                    strokeDasharray={`${13 * 5.02} 502`}
                    strokeDashoffset={`-${78 * 5.02}`}
                    strokeLinecap="round"
                  />
                  {/* Late segment (9% - orange) */}
                  <circle 
                    cx="100" cy="100" r="80" 
                    fill="none" 
                    stroke="#f97316" 
                    strokeWidth="30" 
                    strokeDasharray={`${9 * 5.02} 502`}
                    strokeDashoffset={`-${(78 + 13) * 5.02}`}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center percentage display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-gray-800">78%</p>
                  </div>
                </div>
                {/* Percentage labels */}
                <div className="absolute top-0 right-0 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                  13%
                </div>
                <div className="absolute top-10 right-0 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
                  9%
                </div>
              </div>
            </div>
            {/* Chart legend */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span className="text-sm">Present</span>
                </div>
                <span className="font-semibold">78%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span className="text-sm">Absent</span>
                </div>
                <span className="font-semibold">13%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                  <span className="text-sm">Late</span>
                </div>
                <span className="font-semibold">9%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== BOTTOM SECTION (2 columns) ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* LEFT COLUMN - Recent Check-Ins and Late Arrivals */}
          <div className="bg-white rounded-lg shadow">
            {/* Recent Check-Ins Table */}
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <User className="text-blue-600 mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                <h3 className="text-base sm:text-lg font-bold text-gray-800">Recent Check-Ins</h3>
              </div>
              {/* Table showing latest check-in records */}
              <div className="overflow-x-auto">
              <table className="w-full min-w-[450px] sm:min-w-[500px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Employee Name</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Check-In Time</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Check-Out Time</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCheckIns.map((emp, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 text-sm text-blue-600 font-medium">{emp.name}</td>
                      <td className="py-3 px-2 text-sm text-gray-700">{emp.checkIn}</td>
                      <td className="py-3 px-2 text-sm text-gray-700">{emp.checkOut}</td>
                      <td className="py-3 px-2">
                        {/* Status badge (green for On Time, red for Late) */}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          emp.status === 'On Time' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Late Arrivals Section with Progress Bars */}
            <div className="p-3 sm:p-4 md:p-6 border-t">
              <div className="flex items-center mb-3 sm:mb-4">
                <User className="text-blue-600 mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                <h3 className="text-base sm:text-lg font-bold text-gray-800">Late Arrivals</h3>
              </div>
              {/* Progress bars showing late arrival frequency */}
              <div className="space-y-3">
                {lateArrivals.map((emp, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-blue-600 font-medium">{emp.name}</span>
                    </div>
                    {/* Progress bar representing percentage */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${emp.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Absent Employees and Upcoming Holidays */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Absent Employees Table */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <User className="text-blue-600 mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                <h3 className="text-base sm:text-lg font-bold text-gray-800">Absent Employees</h3>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[350px] sm:min-w-[400px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-gray-600">Name</th>
                    <th className="text-left py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-gray-600">Department</th>
                    <th className="text-left py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-gray-600">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {absentEmployees.map((emp, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm text-blue-600 font-medium">{emp.name}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm text-gray-700">{emp.department}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm text-gray-700">{emp.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Upcoming Holidays */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <Calendar className="text-blue-600 mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                <h3 className="text-base sm:text-lg font-bold text-gray-800">Upcoming Holidays</h3>
              </div>
              {/* List of holidays with color indicators */}
              <div className="space-y-2 sm:space-y-3">
                {holidays.map((holiday, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {/* Color dot indicator */}
                      <div className={`w-2 h-2 rounded-full bg-${holiday.color}-500 mr-2 sm:mr-3`}></div>
                      <span className="font-semibold text-gray-800 text-xs sm:text-sm md:text-base">{holiday.name}</span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-600">{holiday.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
