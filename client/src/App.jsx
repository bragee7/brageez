import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PoliceDashboard from './pages/PoliceDashboard';
import CaseDetails from './pages/CaseDetails';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/use-app" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'police' ? '/police' : '/use-app'} replace />;
  }

  return children;
};

const UseApp = () => {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-emergency-red to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">This Portal is for Police Only</h1>
        <p className="text-gray-600 mb-6">
          The user dashboard and SOS features are available in the ZELDA mobile app.
          Please download and use the app to access your dashboard.
        </p>
        <Link
          to="/police"
          className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg mb-3 hover:from-blue-700 hover:to-indigo-700"
        >
          Go to Police Dashboard
        </Link>
        <div>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/use-app" element={<UseApp />} />
        <Route 
          path="/police" 
          element={
            <ProtectedRoute requiredRole="police">
              <PoliceDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/case/:id" 
          element={
            <ProtectedRoute requiredRole="police">
              <CaseDetails />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
