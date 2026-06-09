SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE Department;
INSERT INTO Department (department_id, department_name) VALUES 
(1, '內科'), 
(2, '外科'), 
(3, '兒科'), 
(4, '家醫科'), 
(5, '耳鼻喉科'), 
(6, '皮膚科'), 
(7, '眼科'), 
(8, '牙科'), 
(9, '骨科'), 
(10, '婦產科'), 
(11, '復健科'), 
(12, '泌尿科');
SET FOREIGN_KEY_CHECKS=1;