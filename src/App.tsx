import { useAuth } from './lib/auth';
import AuthPage from './components/AuthPage';
import PatientApp from './components/PatientApp';
import CaregiverDashboard from './components/CaregiverDashboard';

export default function App() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-loading">
            <div className="dash-spinner" />
            <p>Loading Smaran...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthPage />;
  }

  if (profile.role === 'caregiver') {
    return <CaregiverDashboard />;
  }

  return <PatientApp />;
}
