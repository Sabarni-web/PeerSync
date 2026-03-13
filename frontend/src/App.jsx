import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/common/Navbar/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';

import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Onboarding from './pages/Onboarding/Onboarding';
import Dashboard from './pages/Dashboard/Dashboard';
import FindMentor from './pages/FindMentor/FindMentor';
import Profile from './pages/Profile/Profile';
import Chat from './pages/Chat/Chat';
import Feedback from './pages/Feedback/Feedback';
import MentorProfile from './pages/MentorProfile/MentorProfile';
import MentorDashboard from './pages/MentorDashboard/MentorDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/find-mentor" element={<ProtectedRoute><FindMentor /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/chat/:sessionId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/feedback/:sessionId" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
          <Route path="/mentor/:id" element={<ProtectedRoute><MentorProfile /></ProtectedRoute>} />
          <Route path="/mentor-dashboard" element={<ProtectedRoute><MentorDashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
