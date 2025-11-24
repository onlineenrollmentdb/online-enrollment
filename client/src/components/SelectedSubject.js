import React, { useState, useMemo } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import "../css/SelectedSubject.css";

const MAX_UNIT_LOAD = 25;
const MAX_WITH_OVERLOAD = 27;

const SelectedSubject = ({ selectedSubjects, studentId, semester, academicYear }) => {
	const [message, setMessage] = useState("");
	const [showPopup, setShowPopup] = useState(false);
	const [isError, setIsError] = useState(false);
	const [collapsed, setCollapsed] = useState(true);
	const navigate = useNavigate();

	const totalUnits = useMemo(
		() => selectedSubjects.reduce((sum, s) => sum + Number(s.units || s.unit || 0), 0),
		[selectedSubjects]
	);

	const overloadStatus = useMemo(() => {
		if (totalUnits > MAX_WITH_OVERLOAD) return "exceeded";
		if (totalUnits > MAX_UNIT_LOAD) return "overload";
		return "normal";
	}, [totalUnits]);

	const handleEnroll = async () => {
		setMessage("");
		setShowPopup(false);
		setIsError(false);

		if (overloadStatus === "exceeded") {
			setMessage("❌ Unit load exceeds maximum allowed (27 units). Please remove some subjects.");
			setIsError(true);
			setShowPopup(true);
			return;
		}

		try {
			const res = await API.post("/enrollments", {
				student_id: studentId,
				semester,
				academic_year: academicYear,
				subject_codes: selectedSubjects.map((s) => s.subject_code),
			});

			let responseMessage = res.data.message || "Enrollment successful!";
			if (res.data.duplicates?.length > 0) {
				responseMessage += ` (Skipped already enrolled: ${res.data.duplicates.join(", ")})`;
			}

			setMessage(responseMessage);
			setShowPopup(true);
			setTimeout(() => {
				setShowPopup(false);
				navigate("/home");
			}, 2000);
		} catch (error) {
			setIsError(true);
			setMessage(
				error.response?.data?.error ||
				error.message ||
				"Unknown error"
			);
			setShowPopup(true);
		}
	};

	return (
		<div className="enroll-form-form">
			{/* Header */}
			<div className="form-header">
				<h3>SelectedSubjects</h3>
				<button
					className="collapse-btn"
					onClick={() => setCollapsed(!collapsed)}
				>
					{collapsed ? "Show Subjects ▼" : "Hide Subjects ▲"}
				</button>
			</div>

			{/* Student Load / Subject Table */}
			{!collapsed && (
				<div className="subjects-table-wrapper">
					<table className="subjects-table">
						<thead>
							<tr>
								<th>Subject Code</th>
								<th>Title</th>
								<th>Units</th>
								<th>Semester</th>
							</tr>
						</thead>
						<tbody>
							{selectedSubjects.map((s, i) => (
								<tr key={i}>
									<td>{s.subject_code}</td>
									<td>{s.subject_desc || "—"}</td>
									<td>{s.units || "—"}</td>
									<td>{semester}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Controls */}
			<div className="enroll-form-controls">
				<button
					className="btn-enroll"
					disabled={selectedSubjects.length === 0 || overloadStatus === "exceeded"}
					onClick={handleEnroll}
				>
					Enroll
				</button>

				<span className={`total-units ${overloadStatus}`}>
					Total Units: {totalUnits}
					{overloadStatus === "overload" ? " ⚠️ Overload (Needs Approval)" : ""}
					{overloadStatus === "exceeded" ? " ❌ Overload Limit Exceeded" : ""}
				</span>
			</div>

			{showPopup && (
				<div className={`enroll-popup ${isError ? "error" : "success"}`}>
					{message}
				</div>
			)}
		</div>
	);
};

export default SelectedSubject;
