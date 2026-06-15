-- =============================================================================
-- NACOS Achievers — Bulk vault course seed (fill once, run in Supabase SQL Editor)
-- =============================================================================
--
-- HOW TO USE
-- 1. Confirm DEPARTMENT_CODE and ADMIN_MATRIC in the cfg CTE below.
-- 2. Edit the courses(...) VALUES block — one row per course offering.
--    Columns: level, semester, course_code, course_name, units
--      level    = '100' | '200' | '300' | '400'
--      semester = '1' (first) | '2' (second)
--      units    = 1–6 (credit units) or NULL if unknown
-- 3. Run the whole script in Supabase → SQL Editor.
--
-- PREREQUISITE: vault_courses.units column (MANUAL_SETUP §2.9.1):
--   alter table vault_courses add column if not exists units integer
--     check (units is null or (units >= 1 and units <= 6));
-- =============================================================================

WITH cfg AS (
  SELECT
    (SELECT id FROM departments WHERE code = 'CS' LIMIT 1) AS department_id,
    (SELECT id FROM users WHERE matric_number = 'ADMIN001' LIMIT 1) AS created_by
),

courses(level, semester, course_code, course_name, units) AS (
  VALUES
    -- ═══ LEVEL 100 — SEMESTER 1 ═══
    ('100', '1', 'AU-APC101', 'Achievers Person Concept I', 1),
    ('100', '1', 'AU-CHM101', 'General Chemistry I', 2),
    ('100', '1', 'AU-CHM107', 'General Chemistry Practical I', 1),
    ('100', '1', 'AU-GST121', 'Use of Library and ICT', 2),
    ('100', '1', 'AU-GST123', 'Introduction to French', 2),
    ('100', '1', 'COS101', 'Introduction to Computing Science', 3),
    ('100', '1', 'GST111', 'Communication in English', 2),
    ('100', '1', 'MTH101', 'Elementary Mathematics I', 2),
    ('100', '1', 'PHY101', 'General Physics I', 2),
    ('100', '1', 'PHY107', 'General Practical Physics I', 1),
    ('100', '1', 'STA111', 'Descriptive Statistics', 3),

    -- ═══ LEVEL 100 — SEMESTER 2 ═══
    ('100', '2', 'AU-APC102', 'Achievers Persons Concept II', 1),
    ('100', '2', 'AU-COS104', 'MATLAB Mathematical Programming', 2),
    ('100', '2', 'AU-GST122', 'Communication in English II', 2),
    ('100', '2', 'AU-STA112', 'Probability I', 3),
    ('100', '2', 'COS102', 'Problem Solving', 2),
    ('100', '2', 'GST112', 'Nigeria People and Culture', 2),
    ('100', '2', 'MTH102', 'Elementary Mathematics II', 2),
    ('100', '2', 'PHY102', 'General Physics II', 2),
    ('100', '2', 'PHY108', 'Practical Physics II', 1),

    -- ═══ LEVEL 200 — SEMESTER 1 ═══
    ('200', '1', 'COS 201', 'Computer Programming I', 3),
    ('200', '1', 'CSC 203', 'Discrete Structures', 2),
    ('200', '1', 'ENT 211', 'Entrepreneurship and Innovation', 2),
    ('200', '1', 'IFT 211', 'Digital Logic Design', 2),
    ('200', '1', 'MTH 201', 'Mathematical Methods I', 2),
    ('200', '1', 'AU-MTH 203', 'Sets, Logics and Algebra', 2),
    ('200', '1', 'AU-MTH 209', 'Introduction to Numerical Analysis', 2),
    ('200', '1', 'SEN 201', 'Introduction to Software Engineering', 2),

    -- ═══ LEVEL 200 — SEMESTER 2 ═══
    ('200', '2', 'COS 202', 'Computer Programming II', 3),
    ('200', '2', 'AU-CSC 204', 'Application Packages', 2),
    ('200', '2', 'AU-CSC 206', 'Data Analytics', 2),
    ('200', '2', 'AU-CSC 208', 'Web Programming (Node.JS)', 2),
    ('200', '2', 'CSC 299', 'SIWES I', 3),
    ('200', '2', 'GST 212', 'Philosophy, Logic and Human Existence', 2),
    ('200', '2', 'IFT 212', 'Computer Architecture and Organisation', 2),
    ('200', '2', 'MTH 202', 'Elementary Differential Equations', 2),

    -- ═══ LEVEL 300 — SEMESTER 1 ═══
    ('300', '1', 'AU-CSC303', 'Introduction to C-Sharp', 3),
    ('300', '1', 'AU-CSC305', 'Computer Modelling and Simulation', 2),
    ('300', '1', 'AU-CSC307', 'Compiler Construction', 3),
    ('300', '1', 'CSC 301', 'Data Structures', 3),
    ('300', '1', 'CSC 309', 'Artificial Intelligence', 2),
    ('300', '1', 'CYB 201', 'Introduction to Cybersecurity and Strategy', 2),
    ('300', '1', 'ICT 305', 'Data Communication System & Network', 3),

    -- ═══ LEVEL 300 — SEMESTER 2 ═══
    ('300', '2', 'AU-CSC302', 'Operation Research and Linear Programming', 3),
    ('300', '2', 'CSC308', 'Operating Systems', 3),
    ('300', '2', 'CSC 310', 'Seminar', 2),
    ('300', '2', 'CSC 322', 'Computer Innovation and New Technologies', 2),
    ('300', '2', 'CSC 399', 'SIWES II', 3),
    ('300', '2', 'DTS 304', 'Data Management I', 3),
    ('300', '2', 'ENT 312', 'Venture Creation', 2),
    ('300', '2', 'GST 312', 'Peace and Conflict', 2),

    -- ═══ LEVEL 400 — SEMESTER 1 ═══
    ('400', '1', 'CSC401', 'Seminar', '1'),
    ('400', '1', 'CSC403', 'System Analysis and Design', '3'),
    ('400', '1', 'CSC405', 'Software Engineering', '3'),
    ('400', '1', 'CSC409', 'Structured Programming', '3'),
    ('400', '1', 'CSC413', 'Computer Graphics and Multimedia', '2'),
    ('400', '1', 'CSC415', 'Information Theory and Computer Communication Systems', '2'),
    ('400', '1', 'CSC497', 'Research Project I', '3'),

    -- ═══ LEVEL 400 — SEMESTER 2 ═══
    ('400', '2', 'CSC402', 'Systems Programming', 3),
    ('400', '2', 'CSC406', 'Information Systems Project Management', 3),
    ('400', '2', 'CSC408', 'Design and Analysis of Algorithm', 3),
    ('400', '2', 'CSC410', 'Computer Modelling and Simulation', 3),
    ('400', '2', 'CSC412', 'Computer Systems Performance Evaluation', 3),
    ('400', '2', 'CSC498', 'Research Project II', 3)
)

INSERT INTO vault_courses (department_id, level, semester, course_code, course_name, units, created_by)
SELECT
  cfg.department_id,
  c.level::user_level,
  c.semester::semester_type,
  trim(c.course_code),
  trim(c.course_name),
  c.units,
  cfg.created_by
FROM courses c
CROSS JOIN cfg
WHERE cfg.department_id IS NOT NULL
ON CONFLICT (department_id, course_code, level, semester)
DO UPDATE SET
  course_name = EXCLUDED.course_name,
  units = EXCLUDED.units,
  created_by = COALESCE(vault_courses.created_by, EXCLUDED.created_by);

-- ─── Verify ──────────────────────────────────────────────────────────────────
SELECT level, semester, count(*) AS course_count, sum(units) AS total_units
FROM vault_courses
WHERE department_id = (SELECT id FROM departments WHERE code = 'CS' LIMIT 1)
GROUP BY level, semester
ORDER BY level, semester;

SELECT level, semester, course_code, course_name, units
FROM vault_courses
WHERE department_id = (SELECT id FROM departments WHERE code = 'CS' LIMIT 1)
ORDER BY level, semester, course_code;
