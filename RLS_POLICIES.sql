-- ============================================================================
-- RLS POLICIES FOR PAWNSHOP SYSTEM
-- ============================================================================
-- This script sets up Row Level Security policies for role-based access control
-- Run this in your Supabase SQL editor (Database > SQL Editor)

-- ============================================================================
-- 1. PAWNSHOPS TABLE - Allow Super Admin to see all, Branch Admin to see their own
-- ============================================================================

-- DROP existing policies if they exist
DROP POLICY IF EXISTS "super_admin_select_all_pawnshops" ON pawnshops;
DROP POLICY IF EXISTS "branch_admin_select_own_pawnshop" ON pawnshops;
DROP POLICY IF EXISTS "authenticated_can_select_pawnshops" ON pawnshops;

-- Policy: Super Admin can select all pawnshops
CREATE POLICY "super_admin_select_all_pawnshops"
ON pawnshops
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- Policy: Branch Admin can select their assigned pawnshop
CREATE POLICY "branch_admin_select_own_pawnshop"
ON pawnshops
FOR SELECT
TO authenticated
USING (
  id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- ============================================================================
-- 2. PROFILES TABLE - Allow users to see all profiles (for staff management)
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_can_select_profiles" ON profiles;
DROP POLICY IF EXISTS "super_admin_full_profiles_access" ON profiles;
DROP POLICY IF EXISTS "branch_admin_select_own_profiles" ON profiles;

-- Policy: Super Admin has full access to profiles
CREATE POLICY "super_admin_full_profiles_access"
ON profiles
FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- Policy: Branch Admin can see profiles in their pawnshop
CREATE POLICY "branch_admin_select_own_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- ============================================================================
-- 3. CUSTOMER TABLE - Isolate by pawnshop_id
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_select_all_customers" ON customer;
DROP POLICY IF EXISTS "branch_admin_select_own_customers" ON customer;

-- Policy: Super Admin can select all customers
CREATE POLICY "super_admin_select_all_customers"
ON customer
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- Policy: Branch Admin can select customers in their pawnshop
CREATE POLICY "branch_admin_select_own_customers"
ON customer
FOR SELECT
TO authenticated
USING (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- Policy: Insert new customers (with pawnshop_id isolation)
DROP POLICY IF EXISTS "authenticated_insert_customer" ON customer;
CREATE POLICY "authenticated_insert_customer"
ON customer
FOR INSERT
TO authenticated
WITH CHECK (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- Policy: Update customers in own pawnshop
DROP POLICY IF EXISTS "authenticated_update_customer" ON customer;
CREATE POLICY "authenticated_update_customer"
ON customer
FOR UPDATE
TO authenticated
USING (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- Policy: Delete customers in own pawnshop
DROP POLICY IF EXISTS "authenticated_delete_customer" ON customer;
CREATE POLICY "authenticated_delete_customer"
ON customer
FOR DELETE
TO authenticated
USING (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- 4. TICKET TABLE - Isolate by pawnshop_id
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_select_all_tickets" ON ticket;
DROP POLICY IF EXISTS "branch_admin_select_own_tickets" ON ticket;

-- Policy: Super Admin can select all tickets
CREATE POLICY "super_admin_select_all_tickets"
ON ticket
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- Policy: Branch Admin can select tickets in their pawnshop
CREATE POLICY "branch_admin_select_own_tickets"
ON ticket
FOR SELECT
TO authenticated
USING (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- Policy: Insert new tickets
DROP POLICY IF EXISTS "authenticated_insert_ticket" ON ticket;
CREATE POLICY "authenticated_insert_ticket"
ON ticket
FOR INSERT
TO authenticated
WITH CHECK (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- Policy: Update tickets in own pawnshop
DROP POLICY IF EXISTS "authenticated_update_ticket" ON ticket;
CREATE POLICY "authenticated_update_ticket"
ON ticket
FOR UPDATE
TO authenticated
USING (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- Policy: Delete tickets in own pawnshop
DROP POLICY IF EXISTS "authenticated_delete_ticket" ON ticket;
CREATE POLICY "authenticated_delete_ticket"
ON ticket
FOR DELETE
TO authenticated
USING (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- 5. LOAN TABLE - Isolate by pawnshop_id
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_select_all_loans" ON loan;
DROP POLICY IF EXISTS "branch_admin_select_own_loans" ON loan;

-- Policy: Super Admin can select all loans
CREATE POLICY "super_admin_select_all_loans"
ON loan
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- Policy: Branch Admin can select loans in their pawnshop
CREATE POLICY "branch_admin_select_own_loans"
ON loan
FOR SELECT
TO authenticated
USING (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- Policy: Insert new loans
DROP POLICY IF EXISTS "authenticated_insert_loan" ON loan;
CREATE POLICY "authenticated_insert_loan"
ON loan
FOR INSERT
TO authenticated
WITH CHECK (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- 6. INVENTORY TABLE - Isolate by pawnshop_id
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_select_all_inventory" ON inventory;
DROP POLICY IF EXISTS "branch_admin_select_own_inventory" ON inventory;

-- Policy: Super Admin can select all inventory
CREATE POLICY "super_admin_select_all_inventory"
ON inventory
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- Policy: Branch Admin can select inventory in their pawnshop
CREATE POLICY "branch_admin_select_own_inventory"
ON inventory
FOR SELECT
TO authenticated
USING (
  pawnshop_id = (SELECT pawnshop_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- 7. TRANSACTION TABLE - Allow authenticated users to access
-- NOTE: This table doesn't have pawnshop_id, so we allow all authenticated users
-- ============================================================================

DROP POLICY IF EXISTS "super_admin_select_all_transactions" ON "transaction";
DROP POLICY IF EXISTS "branch_admin_select_own_transactions" ON "transaction";
DROP POLICY IF EXISTS "authenticated_select_transactions" ON "transaction";

-- Policy: All authenticated users can select transactions
CREATE POLICY "authenticated_select_transactions"
ON "transaction"
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- FINAL: Verify RLS is enabled on all tables
-- ============================================================================

-- These commands check RLS status (for informational purposes)
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- ============================================================================
-- NOTE: Make sure your profiles table has the right data:
-- - Set role = 'SUPER_ADMIN' for superadmin@pawngold.com user (pawnshop_id = NULL)
-- - Set role = 'BRANCH_ADMIN' for branch admins (pawnshop_id = their assigned pawnshop UUID)
-- ============================================================================
