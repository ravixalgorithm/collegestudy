-- Fix infinite recursion in RLS policies for users table
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- Step 2: Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS with simple, non-recursive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple policies that don't cause recursion
-- Allow authenticated users to read all user records
CREATE POLICY "Allow authenticated users to read users"
ON users FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert their own record
CREATE POLICY "Allow users to insert own record"
ON users FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Allow authenticated users to update their own record
CREATE POLICY "Allow users to update own record"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users';
