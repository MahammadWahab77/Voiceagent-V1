import React, { useState } from 'react';
import { User } from '../src/types';
import { ArrowRight, User as UserIcon, Phone } from 'lucide-react';

interface AuthPageProps {
  onLogin: (user: User) => void;
  onConnect: (user: User) => Promise<void>;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onConnect }) => {
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobileNumber.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Haptic feedback for login
    if (navigator.vibrate) navigator.vibrate(10);

    const user: User = { name, mobileNumber };

    // Trigger connection immediately with user details
    onConnect(user);

    onLogin(user);
  };

  return (
    <div className="relative w-full h-screen bg-white flex flex-col items-center justify-center overflow-hidden font-sans">

      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-[#C9F0FF] rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-[float-slow_20s_infinite_reverse]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-[#E7D9FF] rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-[float-slow_25s_infinite]" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-xl p-8 md:p-10">

          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <img
                src="https://d14qv6cm1t62pm.cloudfront.net/logos/Nxtwave_90_48.png?q=80&auto=format%2C+compress"
                alt="NxtWave"
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Welcome to Maya</h1>
            <p className="text-gray-500 text-sm">Please enter your details to begin the session.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-xs font-medium text-gray-500 ml-1 uppercase tracking-wider">Student Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  className="block w-full pl-11 pr-4 py-4 bg-white/50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all shadow-sm"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="mobileNumber" className="text-xs font-medium text-gray-500 ml-1 uppercase tracking-wider">Registration Mobile Number</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="tel"
                  id="mobileNumber"
                  value={mobileNumber}
                  onChange={(e) => {
                    setMobileNumber(e.target.value);
                    setError('');
                  }}
                  className="block w-full pl-11 pr-4 py-4 bg-white/50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all shadow-sm"
                  placeholder="e.g., +1 234 567 8900"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gray-900 hover:bg-black text-white rounded-2xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gray-200 mt-2"
            >
              Start Session
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">Voice AI Onboarding System v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;