import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../css/ProfilePage.css";
import defaultUser from "../img/default-user.png";

const ProfilePage = () => {
  const { user: student, updateUser } = useAuth(); // destructure updateUser
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [, setUploading] = useState(false);

  useEffect(() => {
    if (!student) {
      navigate("/");
      return;
    }

    API.get(`/students/${student.student_id}`)
      .then((res) => setData(res.data))
      .catch(() => setData(student)) // fallback
      .finally(() => setLoading(false));
  }, [student, navigate]);

  if (loading) return <div>Loading profile information...</div>;
  if (!data) return <div>No student data available.</div>;

  const onChange = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  /** Save edited profile */
  const handleSaveClick = async () => {
    setLoading(true);

    const allowedFields = [
      "first_name",
      "middle_name",
      "last_name",
      "email",
      "contact_number",
      "permanent_address",
      "congressional_district",
      "region",
      "gender",
      "birth_date",
      "birthplace",
      "citizenship",
      "religion",
      "civil_status",
      "father_name",
      "father_occupation",
      "father_contact",
      "mother_name",
      "mother_occupation",
      "mother_contact",
      "guardian_name",
      "guardian_relationship",
      "guardian_contact",
      "guardian_email",
    ];

    const filteredData = Object.keys(data)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    try {
      await API.put(`/students/${data.student_id}`, filteredData);
      setData((prev) => ({ ...prev, ...filteredData }));
      updateUser({ ...student, ...filteredData }); // update auth context
      alert("Profile updated successfully");
      setEditing(false);
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  /** Upload profile picture */
  const handlePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("profile_picture", file);

      const res = await API.post(
        `/students/${data.student_id}/upload-picture`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setData((prev) => ({ ...prev, profile_picture: res.data.filePath }));
      updateUser({ ...student, profile_picture: res.data.filePath }); // update auth context
      alert("Profile picture updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload picture.");
    } finally {
      setUploading(false);
    }
  };

  const serverURL = process.env.REACT_APP_API.replace("/api", "");
  const profilePicture = data.profile_picture
    ? `${serverURL}${data.profile_picture}`
    : defaultUser;

  return (
    <div className="profile-wrapper">
      <div className="profile-card">
        <h2 className="profile-header">Student Profile</h2>

        <div className="profile-grid-advanced">
          {/* Profile Picture */}
          <div className="profile-picture">
            <div className={`profile-pic-wrapper ${editing ? "editable" : ""}`}>
              <img
                src={profilePicture}
                alt="Profile"
                className="profile-img"
                onError={(e) => (e.target.src = defaultUser)}
              />
              {editing && (
                <div className="overlay">
                  <span>Change Profile?</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Editable Fields */}
          <ProfileField label="First Name" name="first_name" value={data.first_name} editable={editing} onChange={onChange} />
          <ProfileField label="Middle Name" name="middle_name" value={data.middle_name} editable={editing} onChange={onChange} />
          <ProfileField label="Last Name" name="last_name" value={data.last_name} editable={editing} onChange={onChange} />
          <ProfileField label="Contact Number" name="contact_number" value={data.contact_number} editable={editing} onChange={onChange} />
          <ProfileField label="Student ID" name="student_id" value={data.student_id} editable={false} onChange={onChange} />
          <ProfileField label="Permanent Address" name="permanent_address" value={data.permanent_address} editable={editing} onChange={onChange} />
          <ProfileField label="District" name="congressional_district" value={data.congressional_district} editable={editing} onChange={onChange} />
          <ProfileField label="Gender" name="gender" value={data.gender} editable={editing} onChange={onChange} />
          <ProfileField label="Region" name="region" value={data.region} editable={editing} onChange={onChange} />
          <ProfileField label="Email Address" name="email" value={data.email} editable={editing} onChange={onChange} />
          <ProfileField label="Course" name="program_code" value={data.program_code + " - " + data.program_name} editable={false} onChange={onChange} />
          <ProfileField label="Civil Status" name="civil_status" value={data.civil_status} editable={editing} onChange={onChange} />
          <ProfileField label="Year and Section" name="year_section" value={data.year_level + " - " + data.section} editable={false} onChange={onChange} />
          <ProfileField label="Citizenship" name="citizenship" value={data.citizenship} editable={editing} onChange={onChange} />
          <ProfileField label="Birthday" name="birth_date" type="date" value={data.birth_date} editable={editing} onChange={onChange} />
          <ProfileField label="Birth Place" name="birthplace" value={data.birthplace} editable={editing} onChange={onChange} />
          <ProfileField label="Religion" name="religion" value={data.religion} editable={editing} onChange={onChange} />
          <ProfileField label="Status" name="status" value={data.student_status} editable={false} onChange={onChange} />
          <ProfileField label="Father's Name" name="father_name" value={data.father_name} editable={editing} onChange={onChange} />
          <ProfileField label="Mother's Name" name="mother_name" value={data.mother_name} editable={editing} onChange={onChange} />
          <ProfileField label="Father's Occupation" name="father_occupation" value={data.father_occupation} editable={editing} onChange={onChange} />
          <ProfileField label="Mother's Occupation" name="mother_occupation" value={data.mother_occupation} editable={editing} onChange={onChange} />
          <ProfileField label="Guardian's Name" name="guardian_name" value={data.guardian_name} editable={editing} onChange={onChange} />
          <ProfileField label="Guardian's Relation" name="guardian_relationship" value={data.guardian_relationship} editable={editing} onChange={onChange} />
          <ProfileField label="Guardian's Contact Number" name="guardian_contact" value={data.guardian_contact} editable={editing} onChange={onChange} />
          <ProfileField label="Enrollment Status" name="enrollment_status" value={data.is_enrolled === 1 ? "Enrolled" : "Not Enrolled"} editable={false} onChange={onChange} />
        </div>

        {/* Actions */}
        <div className="profile-actions">
          {editing ? (
            <>
              <button className="btn-save" onClick={handleSaveClick} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditing(false);
                  API.get(`/students/${data.student_id}`).then((res) => setData(res.data));
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button className="btn-edit" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ProfileField component */
const ProfileField = ({ label, value, name, onChange, editable, type = "text" }) => {
  const formatValue = () => {
    if (!value) return "";
    if (type === "date") return value.split("T")[0];
    return value;
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {editable ? (
        <input
          className="form-input"
          type={type}
          name={name}
          value={formatValue()}
          onChange={(e) => onChange(name, e.target.value)}
        />
      ) : (
        <div className="form-static">{formatValue() || "-"}</div>
      )}
    </div>
  );
};

export default ProfilePage;
