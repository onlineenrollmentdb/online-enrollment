--   ======================
-- Departments
-- ======================
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_code VARCHAR(10) NOT NULL UNIQUE,
    department_name VARCHAR(100) NOT NULL UNIQUE
);

-- ======================
-- Programs
-- ======================
CREATE TABLE programs (
    program_id INT AUTO_INCREMENT PRIMARY KEY,
    program_code VARCHAR(10) NOT NULL UNIQUE,
    program_name VARCHAR(100) NOT NULL,
    department_id INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);

-- ======================
-- Faculties
-- ======================
CREATE TABLE faculties (
    faculty_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    department_id INT,
    designation VARCHAR(100),
    role ENUM('dean', 'advisor', 'grader') DEFAULT 'grader',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

-- ======================
-- Students
-- ======================
CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NULL,
    contact_number VARCHAR(20) UNIQUE,
    profile_picture VARCHAR(255) DEFAULT NULL,
    permanent_address TEXT,
    congressional_district VARCHAR(100),
    region VARCHAR(100),
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    birth_date DATE DEFAULT NULL,
    birthplace VARCHAR(255),
    citizenship VARCHAR(100),
    religion VARCHAR(100),
    civil_status ENUM('Single', 'Married', 'Widow/er', 'Other') DEFAULT 'Single',
    father_name VARCHAR(150),
    father_occupation VARCHAR(150),
    father_contact VARCHAR(20),
    mother_name VARCHAR(150),
    mother_occupation VARCHAR(150),
    mother_contact VARCHAR(20),
    guardian_name VARCHAR(150),
    guardian_relationship VARCHAR(100),
    guardian_contact VARCHAR(20),
    guardian_email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    program_id INT NOT NULL,
    year_level INT NOT NULL,
    section VARCHAR(50),
    student_status ENUM('Regular', 'Irregular') NOT NULL DEFAULT 'Regular',
    is_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE
);

-- ======================
-- Educational Background
-- ======================
CREATE TABLE educational_background (
    edu_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    level ENUM('Basic Education', 'Higher Education - Bacc', 'Higher Education - Pg') NOT NULL,
    school_name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20),
    honors_received VARCHAR(255),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- ======================
-- Admin
-- ======================
CREATE TABLE admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_user VARCHAR(100) NOT NULL UNIQUE,
    admin_pass VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    is_2fa_enabled TINYINT(1) DEFAULT 1,
    two_fa_code VARCHAR(10) NULL,
    two_fa_expires DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- Subjects
-- ======================
CREATE TABLE subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_section VARCHAR(20) NOT NULL UNIQUE,
    subject_code VARCHAR(20) NOT NULL UNIQUE,
    subject_desc TEXT,
    units DECIMAL(3,1) NOT NULL DEFAULT 0,
    lec_hours INT NOT NULL DEFAULT 0,
    lab_hours INT NOT NULL DEFAULT 0,
    year_level INT NOT NULL CHECK (year_level BETWEEN 1 AND 4),
    semester ENUM('1st', '2nd', 'Summer') NOT NULL,
    program_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE
);

-- ======================
-- Prerequisites
-- ======================
CREATE TABLE prerequisites (
    prerequisite_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(20) NOT NULL,
    prereq_subject_code VARCHAR(20) NOT NULL,
    type ENUM('Pre', 'Co') NOT NULL DEFAULT 'Pre',
    FOREIGN KEY (subject_code) REFERENCES subjects(subject_code) ON DELETE CASCADE,
    FOREIGN KEY (prereq_subject_code) REFERENCES subjects(subject_code) ON DELETE CASCADE,
    CONSTRAINT uq_subject_prereq UNIQUE (subject_code, prereq_subject_code, type)
);

-- ======================
-- Enrollments
-- ======================
CREATE TABLE enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    enrollment_status INT NOT NULL,
    faculty_id INT,
    academic_year VARCHAR(9) NOT NULL,
    semester ENUM('1st', '2nd') NOT NULL,
    total_units DECIMAL(4,1) DEFAULT 0.0,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON DELETE SET NULL
);

-- ======================
-- Enrollment Subjects
-- ======================
CREATE TABLE enrollment_subjects (
    enrollment_id INT NOT NULL,
    subject_section VARCHAR(20) NOT NULL,
    PRIMARY KEY (enrollment_id, subject_section),
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_section) REFERENCES subjects(subject_section) ON DELETE CASCADE
);

-- ======================
-- Schedules
-- ======================
CREATE TABLE schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(20) NOT NULL,
    faculty_id INT,
    day ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50),
    academic_year VARCHAR(9) NOT NULL,
    FOREIGN KEY (subject_code) REFERENCES subjects(subject_code) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON DELETE SET NULL
);

-- ======================
-- Academic History
-- ======================
CREATE TABLE academic_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_section VARCHAR(50) NOT NULL,
    semester ENUM('1st', '2nd') NOT NULL,
    academic_year VARCHAR(9) NOT NULL,
    grade DECIMAL(4,2),
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_section) REFERENCES subjects(subject_section) ON DELETE CASCADE
);

-- ======================
-- Authentication Logs
-- ======================
CREATE TABLE authentication_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_type ENUM('student', 'faculty', 'admin') NOT NULL,
    user_id INT NOT NULL,
    login_time DATETIME NOT NULL,
    logout_time DATETIME,
    status VARCHAR(50),
    ip_address VARCHAR(100)
);

-- ======================
-- Notifications
-- ======================
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_type ENUM('student', 'faculty', 'admin') NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) DEFAULT NULL,
    message TEXT NOT NULL,
    type ENUM('general', 'grade', 'enrollment', 'announcement', 'reminder') DEFAULT 'general',
    link VARCHAR(255) DEFAULT NULL,
    sender_id INT DEFAULT NULL,
    sender_type ENUM('student', 'faculty', 'admin') DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_seen BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_type, user_id),
    INDEX idx_read (is_read),
    INDEX idx_created_at (created_at)
);

-- ======================
-- Settings
-- ======================
CREATE TABLE settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    first_sem_enrollment_start DATE NOT NULL,
    first_sem_enrollment_end DATE NOT NULL,
    first_sem_start DATE NOT NULL,
    first_sem_end DATE NOT NULL,
    second_sem_enrollment_start DATE NOT NULL,
    second_sem_enrollment_end DATE NOT NULL,
    second_sem_start DATE NOT NULL,
    second_sem_end DATE NOT NULL,
    summer_start DATE NOT NULL,
    summer_end DATE NOT NULL,
    current_semester ENUM('1st','2nd','Summer') NOT NULL,
    current_academic_year VARCHAR(10) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ======================
-- INSERTS
-- ======================

-- SETTINGS
INSERT INTO settings (
    first_sem_enrollment_start, first_sem_enrollment_end,
    first_sem_start, first_sem_end,
    second_sem_enrollment_start, second_sem_enrollment_end,
    second_sem_start, second_sem_end,
    summer_start, summer_end,
    current_semester, current_academic_year
)
VALUES (
    '2025-07-15', '2025-07-30',
    '2025-08-01', '2025-12-15',
    '2025-12-10', '2025-12-25',
    '2026-01-10', '2026-05-25',
    '2026-06-01', '2026-07-15',
    '1st', '2025-2026'
);


-- DEPARTMENTS
INSERT INTO departments (department_code, department_name) VALUES
('COTE', 'College of Technology Engineering'),
('COED', 'College of Education Department');

-- PROGRAMS
INSERT INTO programs (program_code, program_name, department_id) VALUES
('BSIT', 'Bachelor of Science in Information Technology', 1),
('BSEd', 'Bachelor of Secondary Education', 2);

-- ======================
-- SUBJECTS
-- ======================
INSERT INTO subjects (subject_section, subject_code, subject_desc, units, lec_hours, lab_hours, year_level, semester, program_id) VALUES
-- 1st Year 1st sem
('CO191', 'GEC-RPH', 'READINGS IN PHILIPPINE HISTORY', 3, 2, 1, 1, '1st', 1),
('CO192', 'GEC-MMW', 'MATHEMATICS IN THE MODERN WORLD', 3, 3, 0, 1, '1st', 1),
('CO193', 'GEE-TEM', 'THE ENTREPRENEURIAL MIND', 3, 2, 1, 1, '1st', 1),
('CO194', 'CC 111', 'INTRODUCTION TO COMPUTING', 3, 2, 1, 1, '1st', 1),
('CO195', 'CC 112', 'COMPUTER PROGRAMMING 1 (LEC)', 2, 2, 0, 1, '1st', 1),
('CO196', 'CC 112L', 'COMPUTER PROGRAMMING 1 (LAB)', 3, 0, 3, 1, '1st', 1),
('CO197', 'AP 1', 'MULTIMEDIA', 3, 2, 1, 1, '1st', 1),
('CO198', 'PE 1', 'PHYSICAL EDUCATION', 2, 2, 0, 1, '1st', 1),
('CO199', 'NSTP 1', 'NATIONAL SERVICE TRAINING PROGRAM', 3, 2, 1, 1, '1st', 1),

-- 1st Year 2nd sem
('C032', 'GEC-PC', 'PURPOSIVE COMMUNICATION', 3, 3, 0, 1, '2nd', 1),
('C033', 'GEC-STS', 'SCIENCE, TECHNOLOGY AND SOCIETY', 3, 2, 1, 1, '2nd', 1),
('C034', 'GEC-US', 'UNDERSTANDING THE SELF', 3, 3, 0, 1, '2nd', 1),
('C035', 'GEE-GSPS', 'GENDER AND SOCIETY WITH PEACE STUDIES', 3, 2, 1, 1, '2nd', 1),
('C036', 'CC 123', 'COMPUTER PROGRAMMING 2 (LEC)', 2, 2, 0, 1, '2nd', 1),
('C037', 'CC 123L', 'COMPUTER PROGRAMMING 2 (LAB)', 3, 0, 3, 1, '2nd', 1),
('C038', 'PC 121/MATH-E', 'DISCRETE MATHEMATICS', 3, 3, 0, 1, '2nd', 1),
('C039', 'AP 2', 'DIGITAL LOGIC DESIGN', 3, 2, 1, 1, '2nd', 1),
('C040', 'PATHFIT 2', 'PHYSICAL ACTIVITIES TOWARDS HEALTH AND', 2, 2, 0, 1, '2nd', 1),
('C041', 'NSTP 2', 'NATIONAL SERVICE TRAINING PROGRAM 2', 3, 2, 1, 1, '2nd', 1),

-- 2nd Year 1st sem
('CO356', 'GEC-E', 'ETHICS', 3, 3, 0, 2, '1st', 1),
('CO357', 'GEE-ES', 'ENVIRONMENTAL SCIENCE', 3, 2, 1, 2, '1st', 1),
('CO358', 'GEC-LWR', 'LIFE AND WORKS OF RIZAL', 3, 3, 0, 2, '1st', 1),
('CO359', 'PC 212', 'QUANTITATIVE METHODS (MODELING & SIMULATION)', 3, 2, 1, 2, '1st', 1),
('CO360', 'CC 214', 'DATA STRUCTURES AND ALGORITHMS (LEC)', 2, 2, 0, 2, '1st', 1),
('CO361', 'CC 214L', 'DATA STRUCTURES AND ALGORITHMS (LAB)', 3, 0, 3, 2, '1st', 1),
('CO362', 'P Elec 1', 'OBJECT ORIENTED PROGRAMMING', 3, 2, 1, 2, '1st', 1),
('CO363', 'P Elec 2', 'WEB SYSTEMS AND TECHNOLOGIES', 3, 2, 1, 2, '1st', 1),
('CO364', 'PE 3', 'PHYSICAL EDUCATION 3', 2, 2, 0, 2, '1st', 1),

-- 2nd Year 2nd sem
('C070', 'GEC-TCW', 'THE CONTEMPORARY WORLD', 3, 3, 0, 2, '2nd', 1),
('C071', 'PC 223', 'INTEGRATIVE PROGRAMMING AND TECHNOLOGIES 1', 3, 2, 1, 2, '2nd', 1),
('C072', 'PC 224', 'NETWORKING 1', 3, 2, 1, 2, '2nd', 1),
('C073', 'CC 225', 'INFORMATION MANAGEMENT (LEC)', 2, 2, 0, 2, '2nd', 1),
('C074', 'CC 225L', 'INFORMATION MANAGEMENT (LAB)', 3, 0, 3, 2, '2nd', 1),
('C075', 'P Elec 3', 'PLATFORM TECHNOLOGIES', 3, 2, 1, 2, '2nd', 1),
('C076', 'AP 3', 'ASP.NET', 3, 2, 1, 2, '2nd', 1),
('C077', 'PATHFIT4', 'PHYSICAL ACTIVITIES TOWARDS HEALTH AND', 2, 2, 0, 2, '2nd', 1),

-- 3rd Year 1st sem
('CO152', 'GEE-FE', 'FUNCTIONAL ENGLISH', 3, 3, 0, 3, '1st', 1),
('CO153', 'PC 315', 'NETWORKING 2 (LEC)', 2, 2, 0, 3, '1st', 1),
('CO154', 'PC 315L', 'NETWORKING 2 (LAB)', 3, 0, 3, 3, '1st', 1),
('CO155', 'PC 316', 'SYSTEMS INTEGRATION AND ARCHITECTURE 1', 3, 2, 1, 3, '1st', 1),
('CO156', 'PC 317', 'INTRODUCTION TO HUMAN COMPUTER INTERACTION', 3, 2, 1, 3, '1st', 1),
('CO157', 'PC 3180', 'DATABASE MANAGEMENT SYSTEMS', 3, 2, 1, 3, '1st', 1),
('CO158', 'CC 316', 'APPLICATIONS DEVELOPMENT AND EMERGING TECHNOLOGIES', 3, 2, 1, 3, '1st', 1),

-- 3rd Year 2nd sem
('C078', 'GEC-AA', 'ART APPRECIATION', 3, 3, 0, 3, '2nd', 1),
('C079', 'GEE-PEE', 'PEOPLE AND THE EARTH''S ECOSYSTEMS', 3, 2, 1, 3, '2nd', 1),
('C080', 'PC 329', 'CAPSTONE PROJECT AND RESEARCH 1', 3, 2, 1, 3, '2nd', 1),
('C081', 'PC 3210', 'SOCIAL AND PROFESSIONAL ISSUES', 3, 3, 0, 3, '2nd', 1),
('C082', 'PC 3211', 'INFORMATION ASSURANCE AND SECURITY 1 (LEC)', 2, 2, 0, 3, '2nd', 1),
('C083', 'PC 3211L', 'INFORMATION ASSURANCE AND SECURITY 1 (LAB)', 3, 0, 3, 3, '2nd', 1),
('COB4', 'AP 4', 'IOS MOBILE APPLICATION DEVELOPMENT', 3, 2, 1, 3, '2nd', 1),
('C085', 'AP 5', 'TECHNOLOGY AND THE APPLICATION OF THE', 3, 2, 1, 3, '2nd', 1),

-- 4th Year 2nd sem
('C0110', 'PC 4215', 'ON-THE-JOB-TRAINING (OJT)', 9, 0, 9, 4, '2nd', 1);



-- ======================
-- ADMIN
-- ======================
INSERT INTO admin (admin_user, admin_pass, email, is_2fa_enabled)
VALUES (
    'admin',
    '$2b$10$lyUyszLfMtll1Wd8UYlndOlyPq5gZm7L4dmAM7k5JKMszMK7oO3rW',
    'martin.tuico@gmail.com',
    1
);


-- ======================
-- STUDENTS
-- ======================

INSERT INTO students (
    student_id, first_name, middle_name, last_name, email, contact_number, permanent_address, congressional_district, region, gender, birth_date, birthplace, citizenship, religion, civil_status,
    father_name, father_occupation, father_contact, mother_name, mother_occupation, mother_contact,
    guardian_name, guardian_relationship, guardian_contact, guardian_email,
    password, program_id, year_level, section, student_status, is_enrolled, is_approved
) VALUES
(8220826, 'Roland', 'L', 'Abellanosa', NULL, NULL, 'M Cabangcalan Dakit Bogo City Cebu', 'IV', 'VII', 'Male', NULL, 'Bogo City, Cebu', 'Filipino', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$x279Jjm2PXHksVoNCsXkuugo8FNtvLaFXz9unnkb8XCkFcOMbjBle', 1, 1, 'A', 'Regular', FALSE, FALSE),
(8220692, 'Chariss', 'G', 'Lumongsod', NULL, NULL, 'Sala Maya Daanbantayan, Cebu', 'IV', 'VII', 'Female', NULL, 'Daanbantayan, Cebu', 'Filipino', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$x279Jjm2PXHksVoNCsXkuugo8FNtvLaFXz9unnkb8XCkFcOMbjBle', 1, 2, 'A', 'Regular', FALSE, FALSE),
(8221380, 'Martin Luther', 'Valiente', 'Tuico', 'martin.tuico@gmail.com', '09123123123', 'Calape Daanbantayan Cebu', 'IV', 'VII', 'Male', '2003-09-23', 'Cebu City', 'Filipino', 'Catholic', 'Single','Romeo M. Tuico Jr.', 'N/A', NULL, 'Flordeliza V. Tuico', 'N/A', NULL,NULL, NULL, NULL, NULL,'$2b$10$x279Jjm2PXHksVoNCsXkuugo8FNtvLaFXz9unnkb8XCkFcOMbjBle', 1, 1, 'A', 'Regular', FALSE, FALSE),

