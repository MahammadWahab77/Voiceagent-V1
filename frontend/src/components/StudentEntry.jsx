import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Phone, ArrowRight } from 'lucide-react';

export function StudentEntry({ onComplete }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Create session ID
            const sessionId = crypto.randomUUID();

            // Save student to Supabase
            const { data, error: dbError } = await supabase
                .from('students')
                .insert([{
                    name,
                    mobile_number: phone,
                    session_id: sessionId
                }])
                .select()
                .single();

            if (dbError) throw dbError;

            // Persist session
            localStorage.setItem('student_session_id', sessionId);
            localStorage.setItem('student_id', data.id);

            onComplete(data);
        } catch (err) {
            console.error('Full error:', err);

            // Handle specific error cases
            setError('Failed to start session. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#F2FBFF] to-[#F2F0FF] font-sans antialiased text-[#0F172A] selection:bg-blue-100">

            {/* Main Card */}
            <div className="w-full max-w-[380px] bg-[#F7FAFF] rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] py-8 px-6 transition-all duration-300">

                {/* Brand Header */}
                <div className="flex justify-center mb-4">
                    <img
                        src="https://d14qv6cm1t62pm.cloudfront.net/logos/Nxtwave_90_48.png?q=80&auto=format%2C+compress"
                        alt="NxtWave"
                        className="h-8 w-auto object-contain"
                    />
                </div>

                {/* Title & Subtitle */}
                <div className="text-center mb-6">
                    <h1 className="text-[22px] font-semibold text-[#0F172A] mb-2 tracking-tight">
                        Welcome to Maya
                    </h1>
                    <p className="text-[13px] text-[#64748B]">
                        Please enter your details to begin the session.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Input 1: Student Name */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="name"
                            className="block text-[11px] font-bold tracking-[0.6px] text-[#6B7280] uppercase ml-1"
                        >
                            Student Name
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <User className="h-[18px] w-[18px] text-[#94A3B8] group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                id="name"
                                required
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (error) setError(null);
                                }}
                                className="block w-full h-12 pl-11 pr-4 bg-[#F1F6FF] border-none rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-0 focus:bg-white focus:shadow-[0_0_0_2px_rgba(31,101,214,0.1)] transition-all"
                                placeholder="Enter your full name"
                            />
                        </div>
                    </div>

                    {/* Input 2: Mobile Number */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="phone"
                            className="block text-[11px] font-bold tracking-[0.6px] text-[#6B7280] uppercase ml-1"
                        >
                            Registration Mobile Number
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Phone className="h-[18px] w-[18px] text-[#94A3B8] group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="tel"
                                id="phone"
                                required
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value);
                                    if (error) setError(null);
                                }}
                                className="block w-full h-12 pl-11 pr-4 bg-[#F1F6FF] border-none rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-0 focus:bg-white focus:shadow-[0_0_0_2px_rgba(31,101,214,0.1)] transition-all"
                                placeholder="e.g., 9876543210"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="text-[11px] font-medium text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100 text-center animate-fadeIn">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-[52px] mt-6 bg-[#0B1220] text-white text-[15px] font-semibold rounded-[14px] flex items-center justify-center gap-2 hover:-translate-y-px hover:shadow-lg active:scale-[0.98] active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                        {loading ? 'Starting...' : 'Start Session'}
                        {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
                    </button>
                </form>
            </div>


        </div>
    );
}
