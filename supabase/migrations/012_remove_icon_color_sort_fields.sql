-- Migration: Remove icon, color, and sort_order fields from common resources
-- This migration removes the visual styling fields that are no longer needed
-- Created: 2024-12-19

-- Remove columns from common_categories table
ALTER TABLE common_categories
DROP COLUMN IF EXISTS icon,
DROP COLUMN IF EXISTS color,
DROP COLUMN IF EXISTS sort_order;

-- Remove columns from common_topics table
ALTER TABLE common_topics
DROP COLUMN IF EXISTS icon,
DROP COLUMN IF EXISTS color,
DROP COLUMN IF EXISTS sort_order;

-- Remove columns from ai_tool_categories table
ALTER TABLE ai_tool_categories
DROP COLUMN IF EXISTS icon,
DROP COLUMN IF EXISTS color,
DROP COLUMN IF EXISTS sort_order;

-- Remove columns from ai_tools table
ALTER TABLE ai_tools
DROP COLUMN IF EXISTS icon,
DROP COLUMN IF EXISTS color;

-- Drop the indexes that were created for these columns
DROP INDEX IF EXISTS idx_common_topics_icon_color;
DROP INDEX IF EXISTS idx_ai_tool_categories_icon_color;
DROP INDEX IF EXISTS idx_ai_tools_icon_color;
DROP INDEX IF EXISTS idx_common_topics_sort_order;
DROP INDEX IF EXISTS idx_common_categories_sort_order;

-- Update comments to reflect the changes
COMMENT ON TABLE common_categories IS 'Common categories - icon, color, and sort_order fields removed in Migration 012';
COMMENT ON TABLE common_topics IS 'Common learning topics - icon, color, and sort_order fields removed in Migration 012';
COMMENT ON TABLE ai_tool_categories IS 'AI tool categories - icon, color, and sort_order fields removed in Migration 012';
COMMENT ON TABLE ai_tools IS 'AI tools - icon and color fields removed in Migration 012';

-- Update updated_at timestamps to reflect these schema changes
UPDATE common_categories SET updated_at = NOW();
UPDATE common_topics SET updated_at = NOW();
UPDATE ai_tool_categories SET updated_at = NOW();
UPDATE ai_tools SET updated_at = NOW();
