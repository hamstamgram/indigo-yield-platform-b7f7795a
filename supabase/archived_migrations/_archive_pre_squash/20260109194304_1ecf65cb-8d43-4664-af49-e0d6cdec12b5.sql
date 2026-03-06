-- Fix profiles.status default value casing
-- Database was using 'Active' (capitalized) but app expects 'active' (lowercase)
ALTER TABLE profiles 
ALTER COLUMN status SET DEFAULT 'active'::text;

-- Update any legacy capitalized values to lowercase
UPDATE profiles SET status = 'active' WHERE status = 'Active';
UPDATE profiles SET status = 'pending' WHERE status = 'Pending';
UPDATE profiles SET status = 'suspended' WHERE status = 'Suspended';
UPDATE profiles SET status = 'archived' WHERE status = 'Archived';
UPDATE profiles SET status = 'inactive' WHERE status = 'Inactive';