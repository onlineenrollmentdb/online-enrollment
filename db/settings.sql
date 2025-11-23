-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 08, 2025 at 10:04 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `online_enrollment`
--

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `setting_id` int(11) NOT NULL,
  `first_sem_enrollment_start` date NOT NULL,
  `first_sem_enrollment_end` date NOT NULL,
  `first_sem_start` date NOT NULL,
  `first_sem_end` date NOT NULL,
  `second_sem_enrollment_start` date NOT NULL,
  `second_sem_enrollment_end` date NOT NULL,
  `second_sem_start` date NOT NULL,
  `second_sem_end` date NOT NULL,
  `summer_start` date NOT NULL,
  `summer_end` date NOT NULL,
  `current_semester` varchar(10) NOT NULL,
  `current_academic_year` varchar(20) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`setting_id`, `first_sem_enrollment_start`, `first_sem_enrollment_end`, `first_sem_start`, `first_sem_end`, `second_sem_enrollment_start`, `second_sem_enrollment_end`, `second_sem_start`, `second_sem_end`, `summer_start`, `summer_end`, `current_semester`, `current_academic_year`, `updated_at`) VALUES
(2, '2025-07-14', '2025-07-29', '2025-07-31', '2025-12-14', '2025-12-09', '2025-12-24', '2026-01-09', '2026-05-24', '2026-05-31', '2026-07-14', '1st', '2025-2026', '2025-10-08 19:44:16');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`setting_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `setting_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
