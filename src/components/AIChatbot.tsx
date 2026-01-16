'use client';

import React from 'react';
import { OnDemandChatBot } from "./ondemand-chat";
import { useAuth0 } from '@auth0/auth0-react';

const AIChatbot = () => {
    const { user } = useAuth0();
    const [studentContext, setStudentContext] = React.useState<string>("");

    React.useEffect(() => {
        // Collect Student Data for Context
        const attData = localStorage.getItem('attendance_data');
        const acadData = localStorage.getItem('academic_data');

        let summary = "Student Academic Status:\n";

        if (attData) {
            const att = JSON.parse(attData);
            summary += "Attendance:\n";
            Object.keys(att).forEach(sub => {
                const p = att[sub];
                if (p.total > 0) {
                    const pct = ((p.attended / p.total) * 100).toFixed(1);
                    summary += `- ${sub}: ${pct}% (${p.attended}/${p.total})\n`;
                }
            });
        }

        if (acadData) {
            const acad = JSON.parse(acadData);
            if (acad.cgpa) {
                summary += `Current CGPA: ${acad.cgpa}\n`;
            }
        }

        setStudentContext(summary);
    }, []);

    const contextVariables = [
        { key: "name", value: user?.name || "User" },
        { key: "email", value: user?.email || "anonymous@example.com" },
        { key: "student_data", value: studentContext },
    ];

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <OnDemandChatBot
                apiKey={process.env.NEXT_PUBLIC_ONDEMAND_API_KEY || "bFOOFKIcKN0bX6llErS1uX5JicrsJVdF"}
                botId="6969fd7c8b00a652c700df6d"
                contextVariables={contextVariables}
                mode="embedded"
            />
        </div>
    );
};

export default AIChatbot;
