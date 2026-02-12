-- Demo Users (passwords will be hashed by initDB)
-- admin/admin123, hr/admin123, manager/admin123, employees/admin123
INSERT INTO users (id, email, password, first_name, last_name, role) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@hrm.com',   'HASH_PLACEHOLDER', 'Admin',   'User',     'admin'),
('a0000000-0000-0000-0000-000000000002', 'hr@hrm.com',      'HASH_PLACEHOLDER', 'Sarah',   'Johnson',  'hr'),
('a0000000-0000-0000-0000-000000000006', 'manager@hrm.com', 'HASH_PLACEHOLDER', 'Robert',  'Chen',     'manager'),
('a0000000-0000-0000-0000-000000000003', 'john@hrm.com',    'HASH_PLACEHOLDER', 'John',    'Smith',    'employee'),
('a0000000-0000-0000-0000-000000000004', 'jane@hrm.com',    'HASH_PLACEHOLDER', 'Jane',    'Doe',      'employee'),
('a0000000-0000-0000-0000-000000000005', 'mike@hrm.com',    'HASH_PLACEHOLDER', 'Mike',    'Wilson',   'employee')
ON CONFLICT (id) DO NOTHING;

-- Departments
INSERT INTO departments (id, name, description, manager_id) VALUES
('d0000000-0000-0000-0000-000000000001', 'Engineering',      'Software development and architecture',    'a0000000-0000-0000-0000-000000000006'),
('d0000000-0000-0000-0000-000000000002', 'Human Resources',  'People operations and talent management',  NULL),
('d0000000-0000-0000-0000-000000000003', 'Marketing',        'Brand management and growth',              NULL),
('d0000000-0000-0000-0000-000000000004', 'Finance',          'Financial planning and accounting',         NULL),
('d0000000-0000-0000-0000-000000000005', 'Operations',       'Business operations and logistics',         NULL)
ON CONFLICT (id) DO NOTHING;

-- Employees
INSERT INTO employees (id, user_id, employee_id, department_id, designation, phone, salary, date_of_joining) VALUES
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'EMP001', 'd0000000-0000-0000-0000-000000000001', 'CTO',                '+1-555-0101', 150000, '2020-01-15'),
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'EMP002', 'd0000000-0000-0000-0000-000000000002', 'HR Manager',         '+1-555-0102', 95000,  '2020-03-10'),
('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'EMP006', 'd0000000-0000-0000-0000-000000000001', 'Engineering Manager', '+1-555-0106', 130000, '2020-06-01'),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'EMP003', 'd0000000-0000-0000-0000-000000000001', 'Senior Developer',   '+1-555-0103', 120000, '2021-06-01'),
('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'EMP004', 'd0000000-0000-0000-0000-000000000003', 'Marketing Lead',     '+1-555-0104', 85000,  '2022-01-20'),
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'EMP005', 'd0000000-0000-0000-0000-000000000004', 'Financial Analyst',  '+1-555-0105', 80000,  '2023-04-12')
ON CONFLICT (id) DO NOTHING;

-- Leave Balances (current year)
INSERT INTO leave_balances (employee_id, user_id, year) VALUES
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 2026),
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 2026),
('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 2026),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 2026),
('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 2026),
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 2026)
ON CONFLICT (employee_id, year) DO NOTHING;

-- Sample leave request (pending manager approval)
INSERT INTO leaves (user_id, employee_id, leave_type, start_date, end_date, reason, status, manager_status, hr_status) VALUES
('a0000000-0000-0000-0000-000000000003',
 'e0000000-0000-0000-0000-000000000003',
 'casual', CURRENT_DATE + 3, CURRENT_DATE + 5,
 'Family event', 'pending', 'pending', 'pending')
ON CONFLICT DO NOTHING;
