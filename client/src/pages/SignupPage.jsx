    import React, { useState } from 'react';
    import API from '../api/api';
    import ctuLogo from '../img/ctu_logo.png';
    import { useNavigate } from 'react-router-dom';

    const SignupPage = () => {
    const [step, setStep] = useState(1); // 1=ID, 2=Code, 3=Password
    const [student_id, setStudentId] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // STEP 1: Verify Student ID
    const handleCheckStudent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
        const res = await API.post('/auth/check-student', { student_id });
        setSuccess(res.data.message);
        setStep(2); // move to next step
        } catch (err) {
        if (err.response?.data?.error) setError(err.response.data.error);
        else setError('Failed to check student ID.');
        } finally {
        setLoading(false);
        }
    };

    // STEP 2: Verify Code and Move to Password Step
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
        // Here we just check if code format seems OK; backend fully verifies on password set
        if (!/^\d{6}$/.test(code)) {
            setError('Please enter a valid 6-digit code.');
            setLoading(false);
            return;
        }
        setSuccess('Code accepted. Please set your new password.');
        setStep(3);
        } catch (err) {
        setError('Verification failed.');
        } finally {
        setLoading(false);
        }
    };

    // STEP 3: Set Password
    const handleSetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
        }

        try {
        const res = await API.post('/auth/verify-code', {
            student_id,
            code,
            password,
            confirmPassword,
        });
        setSuccess(res.data.message);
        setTimeout(() => navigate('/'), 3000);
        } catch (err) {
        if (err.response?.data?.error) setError(err.response.data.error);
        else setError('Failed to set password.');
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="t-body">
        <form
            className="t-container"
            onSubmit={
            step === 1
                ? handleCheckStudent
                : step === 2
                ? handleVerifyCode
                : handleSetPassword
            }
        >
            <img src={ctuLogo} alt="CTU Logo"  className="ctu-logo"/>
            <h3>
            {step === 1
                ? 'Verify Student ID'
                : step === 2
                ? 'Enter Verification Code'
                : 'Set Your Password'}
            </h3>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>{success}</p>}

            {/* Step 1: Student ID */}
            {step === 1 && (
            <>
                <input
                type="text"
                placeholder="Enter Student ID"
                value={student_id}
                onChange={(e) => setStudentId(e.target.value)}
                required
                />
                <button className="btn t-btn" type="submit" disabled={loading}>
                {loading ? 'Checking...' : 'Verify Student ID'}
                </button>
            </>
            )}

            {/* Step 2: Verification Code */}
            {step === 2 && (
            <>
                <input
                type="text"
                placeholder="Enter 6-digit Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                />
                <button className="btn t-btn" type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
                </button>
            </>
            )}

            {/* Step 3: Password Creation */}
            {step === 3 && (
            <>
                <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />
                <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                />
                <button className="btn t-btn" type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Set Password'}
                </button>
            </>
            )}

            <p style={{ fontSize: 12, marginTop: 10 }}>
            Already have an account? <a href="/">Login here</a>
            </p>
        </form>
        </div>
    );
    };

    export default SignupPage;
