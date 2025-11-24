// src/components/EnrollmentTracker.js
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import socket from "../socket";   // ✅ import socket.io client
import "../css/EnrollmentTracker.css";

const EnrollmentTracker = ({
	student,
	steps = [],
	currentStep = 0,
	onStepClick,
	setCurrentStep,   // ✅ pass state setter from parent
}) => {
	const navigate = useNavigate();

	// 🔹 Listen to socket updates
	useEffect(() => {
		if (!student) return;

		const handleStatusUpdate = (data) => {
			if (data.student_id === student.student_id) {
				console.log("📢 Enrollment status updated via socket:", data);
				if (setCurrentStep) setCurrentStep(data.status); // 🔹 sync step
			}
		};

		socket.on("enrollment-status-updated", handleStatusUpdate);

		return () => {
			socket.off("enrollment-status-updated", handleStatusUpdate);
		};
	}, [student, setCurrentStep]);

	return (
		<div className="horizontal-tracker" role="list" aria-label="Enrollment steps">
			{steps.map((step, i) => {
				const isCompleted = i < currentStep;
				const isCurrent = i === currentStep;
				const isLast = i === steps.length - 1;

				// ✅ Only allow clicking the current step
				const isClickable = i === currentStep;

				let circleClass = "";
				if (isCompleted) circleClass = "completed";
				else if (isCurrent) circleClass = "active";

				const handleCircleClick = async () => {
					if (!isClickable) return;

					if (i === 1) {
						navigate("/enroll");
					}
					else if (i === 2) {
						try {
							await API.put(`/enrollments/status/${student.student_id}`, { status: 3 });
							if (onStepClick) onStepClick(2);
						} catch (err) {
							console.error("Failed to update medical form status", err);
						}
					}
				};

				return (
					<div
						className="step"
						key={i}
						role="listitem"
						style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
					>
						{/* Circle */}
						<div
							className={`circle ${circleClass} ${isClickable ? "clickable" : ""}`}
							onClick={handleCircleClick}
							style={{ cursor: isClickable ? "pointer" : "default" }}
						>
							{ i === 3 && isCurrent ? (
								<div className="loader"></div>
							) : (
								<span className="circle-num">{i + 1}</span>
							)}
						</div>

						{/* Step details */}
						<div className="step-details">
							<p className="label">{step.label}</p>
							<hr />
							<p className="details">{step.details}</p>
						</div>

						{/* Label button */}
						<button
							className={`step-label ${!isClickable ? "disabled" : ""}`}
							disabled={!isClickable}
							style={{
								marginTop: 8,
								cursor: isClickable ? "pointer" : "not-allowed",
								background: "none",
								border: "none",
								padding: "4px 8px",
								fontSize: "0.95rem",
								fontWeight: 500,
								borderRadius: 4,
							}}
							onClick={handleCircleClick}
							title={isClickable ? `Click for ${step.label}` : step.details}
						>
							{step.label}
						</button>

						{/* Connector */}
						{!isLast && (
							<div className={`connector ${isCompleted ? "done" : ""}`} />
						)}
					</div>
				);
			})}
		</div>
	);
};

export default EnrollmentTracker;
