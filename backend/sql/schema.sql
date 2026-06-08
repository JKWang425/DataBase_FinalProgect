-- Schema for small clinic appointment system
CREATE DATABASE IF NOT EXISTS clinic_db;
USE clinic_db;

CREATE TABLE IF NOT EXISTS Users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Patient','Doctor','Staff') NOT NULL
);

CREATE TABLE IF NOT EXISTS Patients (
  patient_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  id_number VARCHAR(50),
  name VARCHAR(200),
  birthday DATE,
  phone_number VARCHAR(50),
  address VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Department (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS Doctors (
  doctor_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  department_id INT,
  doctor_name VARCHAR(200),
  specialty VARCHAR(200),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (department_id) REFERENCES Department(department_id)
);

CREATE TABLE IF NOT EXISTS Staffs (
  staff_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  staff_name VARCHAR(200),
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Schedules (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT,
  staff_id INT,
  work_date DATE NOT NULL,
  time_slot VARCHAR(50) NOT NULL,
  room_no VARCHAR(50),
  max_limit INT DEFAULT 0,
  current_count INT DEFAULT 0,
  FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id),
  FOREIGN KEY (staff_id) REFERENCES Staffs(staff_id)
);

CREATE TABLE IF NOT EXISTS Appointments (
  appt_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  schedule_id INT NOT NULL,
  appt_no INT NOT NULL,
  is_first_visit TINYINT(1) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Booked',
  created_at DATETIME,
  FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
  FOREIGN KEY (schedule_id) REFERENCES Schedules(schedule_id)
);

CREATE TABLE IF NOT EXISTS MedicalRecord (
  appt_id INT PRIMARY KEY,
  diagnosis TEXT,
  treatment TEXT,
  updated_at DATETIME,
  FOREIGN KEY (appt_id) REFERENCES Appointments(appt_id)
);
