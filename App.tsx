import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import { User } from './types';
import { useGeminiLive } from './hooks/useGeminiLive';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const liveData = useGeminiLive();

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <AuthPage onLogin={setUser} onConnect={liveData.connect} />;
  }

  return <Dashboard user={user} liveData={liveData} onLogout={handleLogout} />;
};

export default App;
