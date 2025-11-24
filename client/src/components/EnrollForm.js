import React, { useState, useMemo, useEffect } from 'react';
import API from '../api/api';
import { useNavigate } from 'react-router-dom';

const MAX_UNIT_LOAD = 25;
const MAX_WITH_OVERLOAD = 27;

const EnrollForm = ({
	selectedSubjects,
	studentId,
	semester,
	academicYear,
	onLockSubjects,
	addToast // ✅ new prop
}) => {
	const [message, setMessage] = useState('');
	const [showPopup, setShowPopup] = useState(false);
	const [isError, setIsError] = useState(false);
	const [enrollmentStatus, setEnrollmentStatus] = useState(null);
	const navigate = useNavigate();

	// 🔹 Fetch enrollment status on mount
	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const res = await API.get(`/enrollments/status/${studentId}`);
				const status = res.data?.step ?? null;
				setEnrollmentStatus(status);

				// 🔒 Lock subject selection if not status 1
				if (status !== 1 && onLockSubjects) {
					onLockSubjects(true);
				} else if (onLockSubjects) {
					onLockSubjects(false);
				}
			} catch (err) {
				console.error('[EnrollForm] Failed to fetch enrollment status:', err);
				setEnrollmentStatus(null);
			}
		};
		if (studentId) fetchStatus();
	}, [studentId, onLockSubjects]);

	// 🔢 Calculate total selected units
	const totalUnits = useMemo(() => {
		return selectedSubjects.reduce((sum, subject) => {
			const units = Number(subject.units || subject.unit || 0);
			return sum + units;
		}, 0);
	}, [selectedSubjects]);

	// ⚠️ Check status of unit load
	const overloadStatus = useMemo(() => {
		if (totalUnits > MAX_WITH_OVERLOAD) return 'exceeded';
		if (totalUnits > MAX_UNIT_LOAD) return 'overload';
		return 'normal';
	}, [totalUnits]);

	const handleEnroll = async () => {
		setMessage('');
		setShowPopup(false);
		setIsError(false);

		if (overloadStatus === 'exceeded') {
			const msg = '❌ Unit load exceeds maximum allowed (27 units). Please remove some subjects.';
			setMessage(msg);
			setIsError(true);
			setShowPopup(true);
			addToast?.(msg, 'error'); // ✅ toast for exceeded
			setTimeout(() => setShowPopup(false), 3000);
			return;
		}

		try {
			const res = await API.post('/enrollments', {
				student_id: studentId,
				semester,
				academic_year: academicYear,
				subject_sections: selectedSubjects.map(s => s.subject_section)
			});

			let responseMessage = res.data?.message || 'Enrollment successful! 🎓';
			if (res.data?.duplicates?.length > 0) {
				responseMessage += ` (Skipped already enrolled: ${res.data.duplicates.join(', ')})`;
			}

			setMessage(responseMessage);
			setShowPopup(true);
			addToast?.(responseMessage, 'success'); // ✅ toast for success

			setTimeout(() => {
				setShowPopup(false);
				navigate('/home');
			}, 3000);
		} catch (error) {
			setIsError(true);

			let errorMsg = '';
			if (error.response?.status === 409 && error.response.data?.error === 'Form already submitted') {
				errorMsg = 'Form already submitted, wait for confirmation';
			} else if (error.response?.data?.error) {
				errorMsg = error.response.data.error;
			} else {
				errorMsg = error.message || 'Unknown error';
			}

			setMessage(errorMsg);
			setShowPopup(true);
			addToast?.(errorMsg, 'error'); // ✅ toast for error
			setTimeout(() => setShowPopup(false), 3000);
		}
	};

	// 📝 UI message based on enrollment status
	const renderStatusMessage = () => {
		switch (enrollmentStatus) {
			case 2:
				return <span style={{ color: 'orange', fontWeight: 'bold' }}>Your enrollment has already been submitted</span>;
			case 3:
				return <span style={{ color: 'blue', fontWeight: 'bold' }}>Enrollment in process</span>;
			case 4:
				return <span style={{ color: 'green', fontWeight: 'bold' }}>You are now enrolled</span>;
			default:
				return <span style={{ color: 'red', fontWeight: 'bold' }}>Go to CTU for Clearance</span>;
		}
	};

	return (
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			<div style={{ flexBasis: '70%' }}>
				{enrollmentStatus === 1 ? (
					<button
						className="btn btn-primary"
						onClick={handleEnroll}
						disabled={selectedSubjects.length === 0 || overloadStatus === 'exceeded'}
						style={{ width: '100%' }}
					>
						Enroll
					</button>
				) : (
					renderStatusMessage()
				)}
			</div>

			<div style={{ flexBasis: '23%', marginLeft: '2%' }}>
				<span
					style={{
						fontSize: '1rem',
						color:
							overloadStatus === 'exceeded'
								? 'red'
								: overloadStatus === 'overload'
								? 'orange'
								: 'green',
						fontWeight: 500,
					}}
				>
					Total Units: {totalUnits}
					{overloadStatus === 'overload' ? ' ⚠️ Overload (Needs Approval)' : ''}
					{overloadStatus === 'exceeded' ? ' ❌ Overload Limit Exceeded' : ''}
				</span>
			</div>

			{/* Popup message */}
			{showPopup && (
				<div className={`popup ${isError ? 'error' : 'success'}`}>
					{message}
				</div>
			)}
		</div>
	);
};

export default EnrollForm;
