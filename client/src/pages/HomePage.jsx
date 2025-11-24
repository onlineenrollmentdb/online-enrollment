import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import socket from "../socket";
import EnrollmentTracker from "../components/EnrollmentTracker";
import "../css/HomePage.css";
import "../css/EnrollmentTracker.css";

const HomePage = () => {
	const { user: student, loading } = useAuth();
	const navigate = useNavigate();
	const [currentStep, setCurrentStep] = useState(0);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!student) navigate("/");
	}, [student, navigate]);

	useEffect(() => {
		if (!student) return;
		setIsLoading(true);

		API.get(`/enrollments/status/${student.student_id}`)
			.then((res) => {
				const { step = 0 } = res.data;
				setCurrentStep(step);
			})
			.catch(() => setCurrentStep(0))
			.finally(() => setIsLoading(false));
	}, [student]);

	useEffect(() => {
		if (!student) return;

		const updateStatus = (data) => {
			if (data.student_id === student.student_id) {
				setCurrentStep(data.status);
			}
		};

		socket.on("enrollment-status-updated", updateStatus);
		return () => socket.off("enrollment-status-updated", updateStatus);
	}, [student]);

	if (!student || loading) return null;

	const steps = [
		{ label: "Clearance", details: "Submit clearance form" },
		{ label: "Enrollment", details: "Fill out enrollment form" },
		{ label: "Medical Form", details: "Upload medical requirements" },
		{ label: "Processing", details: "Registrar validates documents" },
		{ label: "Enrolled", details: "You are officially enrolled!" },
	];

	const handleStepClick = (i) => {
		if (i === 1 && student.enrollment_status >= 1) navigate("/enroll");
		if (i === 2 && student.enrollment_status >= 2)
			window.open("https://docs.google.com/forms/your-form-link", "_blank");
	};

	return (
<div className="homepage">

  {/* Blurred Background */}
  <div className="background-blur"></div>

  {/* Foreground Content */}
  <div className="homepage-content">

    <h1 className="welcome-text">
      Welcome <span>{student.first_name} {student.last_name}</span>
    </h1>

    <div className="status-card">
      <h5 className="fw-bold mb-3">Enrollment Status</h5>

      <EnrollmentTracker
        student={student}
        steps={steps}
        currentStep={currentStep}
        enrollmentStatus={student.enrollment_status}
        onStepClick={handleStepClick}
      />

      {isLoading && (
        <small className="text-muted">Loading enrollment status...</small>
      )}
    </div>

  </div>
</div>

	);
};

export default HomePage;
