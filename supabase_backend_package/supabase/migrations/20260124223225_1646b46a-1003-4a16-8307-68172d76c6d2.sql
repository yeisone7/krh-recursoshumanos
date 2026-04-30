-- Add 'en_retiro' value to employee_status enum
ALTER TYPE employee_status ADD VALUE IF NOT EXISTS 'en_retiro';