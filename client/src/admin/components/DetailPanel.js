import React, { useState, useEffect } from "react";
import API from "../../api/api";
import defaultUserImg from "../../img/default_user-no-bg.png";

export default function DetailPanel({ activeTab, record, setShowDetailsModal, showDetailsModal }) {
    const [expanded, setExpanded] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [subjectDetails, setSubjectDetails] = useState([]);

    useEffect(() => {
        setExpanded(false);
        setShowHistory(false);
        setHistory([]);
        setSubjectDetails([]);
    }, [record]);

    // Fetch subject details
    useEffect(() => {
        const fetchSubjectDetails = async () => {
            if (
                expanded &&
                record &&
                activeTab === "enrollment" &&
                Array.isArray(record.subjects) &&
                record.subjects.length > 0
            ) {
                try {
                    const res = await API.get("/subjects", {
                        params: { codes: record.subjects.join(",") }
                    });
                    const filtered = res.data.filter(subj =>
                        record.subjects.includes(subj.subject_section)
                    );
                    setSubjectDetails(filtered);
                } catch {
                    setSubjectDetails([]);
                }
            } else {
                setSubjectDetails([]);
            }
        };
        fetchSubjectDetails();
    }, [expanded, record, activeTab]);

    // Fetch academic history
    useEffect(() => {
        if (showHistory && record?.student_id) {
            setLoadingHistory(true);
            API.get(`academic/academic-history/${record.student_id}`)
                .then(res => setHistory(res.data))
                .catch(() => setHistory([]))
                .finally(() => setLoadingHistory(false));
        }
    }, [showHistory, record]);

    // Collapsed view
    const collapsedView = () => (
        <div className="d-flex flex-column gap-2">
            <div><strong>Student ID:</strong> {record.student_id}</div>
            <div>
                <strong>Name:</strong>{" "}
                {record.name ||
                    [record.first_name, record.middle_name, record.last_name]
                        .filter(Boolean)
                        .join(" ")}
            </div>
            <div>
                <strong>Subject Code(s):</strong>{" "}
                {(record.subjects || []).join(", ")}
            </div>
            <button
                className="btn btn-outline-primary mt-3"
                style={{ width: "180px", alignSelf: "flex-start" }}
                onClick={() => setExpanded(true)}
            >
                Expand Details &rarr;
            </button>
        </div>
    );

    // Expanded view
    const expandedView = () => (
        <div className="d-flex flex-column gap-2">
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <strong>Student ID:</strong> {record.student_id}<br />
                    <strong>Name:</strong>{" "}
                    {record.name ||
                        [record.first_name, record.middle_name, record.last_name]
                            .filter(Boolean)
                            .join(" ")}
                </div>
                <button
                    className="btn btn-outline-secondary"
                    style={{ minWidth: 80, maxWidth: 120 }}
                    onClick={() => setExpanded(false)}
                >
                    &larr; Collapse
                </button>
            </div>
            {/* Subjects */}
            <div>
                <h6>Subjects to Enroll</h6>
                <div style={{ overflowX: "auto" }}>
                    <table className="table table-sm table-bordered">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Units</th>
                                <th>Year</th>
                                <th>Semester</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjectDetails.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted">
                                        {Array.isArray(record.subjects) && record.subjects.length > 0
                                            ? "Loading subject details..."
                                            : "No subjects to display."}
                                    </td>
                                </tr>
                            ) : (
                                subjectDetails.map(subj => (
                                    <tr key={subj.subject_section}>
                                        <td>{subj.subject_section}</td>
                                        <td>{subj.subject_code}</td>
                                        <td>{subj.subject_desc}</td>
                                        <td>{subj.units}</td>
                                        <td>{subj.year_level}</td>
                                        <td>{subj.semester}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Academic history */}
            <div className="form-check form-switch my-2">
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="showHistory"
                    checked={showHistory}
                    onChange={() => setShowHistory(v => !v)}
                />
                <label className="form-check-label" htmlFor="showHistory">
                    Show Academic History
                </label>
            </div>
            {showHistory && (
                <div>
                    <h6>Academic History</h6>
                    {loadingHistory ? (
                        <div className="text-center py-2">Loading...</div>
                    ) : (
                        <table className="table table-sm table-bordered">
                            <thead>
                                <tr>
                                    <th>Subject Code</th>
                                    <th>Subject Name</th>
                                    <th>Semester</th>
                                    <th>Year</th>
                                    <th>Grade</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center">No records found.</td>
                                    </tr>
                                ) : (
                                    history.map(h => (
                                        <tr key={h.history_id}>
                                            <td>{h.subject_section}</td>
                                            <td>{h.subject_code}</td>
                                            <td>{h.semester}</td>
                                            <td>{h.academic_year}</td>
                                            <td>{h.grade}</td>
                                            <td>{h.status}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="container">
            {record ? (
                <>
                    <div className="text-center mb-4">
                        <img
                            src={record.image_url || defaultUserImg}
                            alt="Student"
                            style={{
                                width: "120px",
                                height: "120px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                background: "#f0f0f0"
                            }}
                        />
                    </div>
                    {activeTab === "enrollment"
                        ? (expanded ? expandedView() : collapsedView())
                        : (
                            <div className="d-flex flex-column gap-2">
                                {activeTab === "students" && (
                                    <>
                                        <div><strong>Student ID:</strong> {record.student_id}</div>
                                        <div><strong>First Name:</strong> {record.first_name}</div>
                                        <div><strong>Middle Name:</strong> {record.middle_name}</div>
                                        <div><strong>Last Name:</strong> {record.last_name}</div>
                                        <div><strong>Religion:</strong> {record.religion}</div>
                                        <div><strong>Permanent Address:</strong> {record.address}</div>
                                        <div><strong>Contact No.:</strong> {record.contact_no || record.contact_number}</div>
                                        <button className="btn btn-outline-primary w-100" onClick={() => setShowDetailsModal(true)}>
                                            Show More Details
                                        </button>
                                    </>
                                )}
                                {activeTab === "approval" && (
                                    <>
                                        <div><strong>Student ID:</strong> {record.student_id}</div>
                                        <div><strong>Name:</strong> {`${record.first_name || ""} ${record.middle_name || ""} ${record.last_name || ""}`}</div>
                                        <div><strong>Email:</strong> {record.email}</div>
                                        <div><strong>Program:</strong> {record.program_code}</div>
                                        <div><strong>Year Level:</strong> {record.year_level}</div>
                                        <div><strong>Status:</strong> {record.student_status}</div>
                                    </>
                                )}
                                {activeTab === "faculty" && (
                                    <>
                                        <div><strong>Faculty ID:</strong> {record.faculty_id}</div>
                                        <div><strong>Name:</strong> {`${record.first_name || ""} ${record.last_name || ""}`}</div>
                                        <div><strong>Email:</strong> {record.email}</div>
                                        <div><strong>Designation:</strong> {record.designation}</div>
                                    </>
                                )}
                            </div>
                        )}
                </>
            ) : (
                <p className="text-muted text-center mt-5">Select a row to show details</p>
            )}
        </div>

    );
}
