import React, { useEffect, useState } from 'react';
import API from '../api/api';

const SubjectList = ({ selectedSubjects, onSelectSubject, yearLevel, semester }) => {
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
    API.get('/subjects', {
        params: { year_level: yearLevel, semester },
    })
        .then((res) => {
        if (Array.isArray(res.data)) {
            setSubjects(res.data);
        } else {
            console.warn('Unexpected response:', res.data);
            setSubjects([]); // fallback to empty array
        }
        })
        .catch((err) => {
        console.error('Failed to fetch subjects:', err);
        setSubjects([]); // fallback to prevent .map crash
        });
    }, [yearLevel, semester]);


    const toggleSelect = (subject) => {
        const exists = selectedSubjects.some(s => s.subject_section === subject.subject_section);
        if (exists) {
        onSelectSubject(selectedSubjects.filter(s => s.subject_section !== subject.subject_section));
        } else {
        onSelectSubject([...selectedSubjects, subject]);
        }
    };

    return (
        <div>
        <h3>Available Subjects</h3>
        {subjects.length === 0 ? (
            <p>No subjects available for this year and semester.</p>
        ) : (
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {subjects.map(subject => (
                <li key={subject.subject_section} style={{ marginBottom: 8 }}>
                <label>
                    <input
                    type="checkbox"
                    checked={selectedSubjects.some(s => s.subject_section === subject.subject_section)}
                    onChange={() => toggleSelect(subject)}
                    />{' '}
                    {subject.subject_section} - {subject.subject_code} ({subject.units} units)
                </label>
                </li>
            ))}
            </ul>
        )}
        </div>
    );
};

export default SubjectList;
