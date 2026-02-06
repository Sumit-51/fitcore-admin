import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { Members } from './components/Members';
import { Payments } from './components/Payments';
import { Attendance } from './components/Attendance';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { useAuth } from './context/AuthContext';
import LoginPage from './app/page';
import SuperAdminDashboard from './app/super-admin/page';
import CreateGymPage from './app/super-admin/create-gym';

import {
  LayoutDashboard,
  Users,
  CreditCard,
  UserCheck,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  X,
  Moon,
  Sun,
  LogOut
} from 'lucide-react';

// Protected Route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Main Layout component for authenticated users
function AuthenticatedLayout({ children, darkMode, setDarkMode }: { children: React.ReactNode; darkMode: boolean; setDarkMode: (value: boolean) => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userData, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'members', name: 'Members', icon: Users, path: '/members' },
    { id: 'payments', name: 'Payments', icon: CreditCard, path: '/payments' },
    { id: 'attendance', name: 'Attendance', icon: UserCheck, path: '/attendance' },
    { id: 'reports', name: 'Reports', icon: BarChart3, path: '/reports' },
    { id: 'settings', name: 'Settings', icon: SettingsIcon, path: '/settings' },
  ] as const;

  return (
    <div className="min-h-screen transition-colors font-body">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 hidden dark:block">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px] opacity-50 mix-blend-multiply"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] opacity-50 mix-blend-multiply"></div>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 glass-panel border-r-0 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } shadow-2xl lg:shadow-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl lg:bg-transparent lg:backdrop-filter-none`}
      >
        <div className="flex items-center gap-3 h-20 px-8 border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <h1 className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">FITCORE</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2 mt-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                  ? 'bg-gradient-to-r from-primary-500/10 to-blue-500/10 text-primary-700 dark:text-primary-400 shadow-sm border border-primary-100 dark:border-primary-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200/50 dark:border-gray-800/50">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72 transition-all duration-300">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-20 flex items-center justify-between px-6 lg:px-8 glass-panel border-b-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-md m-4 rounded-xl lg:m-0 lg:rounded-none lg:bg-transparent lg:shadow-none lg:backdrop-filter-none">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {navigation.find(n => n.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize tracking-tight">
              {navigation.find(n => n.path === location.pathname)?.name || 'Dashboard'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back, {userData?.displayName?.split(' ')[0] || 'Admin'}</p>
          </div>


          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-primary-100 dark:hover:border-primary-900 rounded-full transition-all shadow-sm hover:shadow"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-800">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-md">
                <span className="text-white text-sm font-bold">{userData?.displayName?.[0] || 'U'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 pt-0">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<LoginPage darkMode={darkMode} setDarkMode={setDarkMode} />} />

        {/* Protected routes with layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout darkMode={darkMode} setDarkMode={setDarkMode}>
                <Dashboard darkMode={darkMode} />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout darkMode={darkMode} setDarkMode={setDarkMode}>
                <Members />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout darkMode={darkMode} setDarkMode={setDarkMode}>
                <Payments />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout darkMode={darkMode} setDarkMode={setDarkMode}>
                <Attendance darkMode={darkMode} />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout darkMode={darkMode} setDarkMode={setDarkMode}>
                <Reports />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout darkMode={darkMode} setDarkMode={setDarkMode}>
                <Settings />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/create-gym"
          element={
            <ProtectedRoute>
              <CreateGymPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to dashboard if logged in, otherwise to login */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}
