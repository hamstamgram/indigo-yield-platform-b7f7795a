-- Part 1: Add 'ib' role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ib' AFTER 'moderator';