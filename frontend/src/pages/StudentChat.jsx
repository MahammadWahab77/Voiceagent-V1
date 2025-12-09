import { useState, useEffect } from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { StudentEntry } from '../components/StudentEntry';
import { Dashboard } from '../components/Dashboard';

export default function StudentChat() {
    const [student, setStudent] = useState(null);
    const liveData = useGeminiLive();

    useEffect(() => {
        // Check local storage for session
        const storedSession = localStorage.getItem('student_session_id');
        const storedId = localStorage.getItem('student_id');
        // In a real app we would verify this against DB, for now trust local
        if (storedSession && storedId) {
            // Need a way to get name/number if stored, or fetch from DB
            // For now, mock or retrieve if passed
            setStudent({ session_id: storedSession, id: storedId, name: 'Student', mobileNumber: 'Unknown' });
        }
    }, []);

    const handleEntryComplete = (studentData) => {
        setStudent({
            ...studentData,
            name: studentData.name,
            mobileNumber: studentData.mobile_number
        });
    };

    const handleLogout = () => {
        localStorage.clear();
        setStudent(null);
    };

    if (!student) {
        return <StudentEntry onComplete={handleEntryComplete} />;
    }

    return (
        <Dashboard
            user={{ name: student.name, mobileNumber: student.mobileNumber }}
            liveData={liveData}
            onLogout={handleLogout}
        />
    );
}
