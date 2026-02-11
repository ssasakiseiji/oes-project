-- Migration: Add unique constraint and composite index to prices table
-- Prevents duplicate price submissions and optimizes dashboard queries

-- Step 1: Remove duplicate records (keep the most recent by highest id)
DELETE FROM prices p1
USING prices p2
WHERE p1.id < p2.id
  AND p1.user_id = p2.user_id
  AND p1.product_id = p2.product_id
  AND p1.commerce_id = p2.commerce_id
  AND p1.period_id = p2.period_id;

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE prices
ADD CONSTRAINT prices_unique_submission
UNIQUE (user_id, product_id, commerce_id, period_id);

-- Step 3: Add composite index for dashboard query performance
CREATE INDEX IF NOT EXISTS idx_prices_user_period_commerce
ON prices(user_id, period_id, commerce_id);
