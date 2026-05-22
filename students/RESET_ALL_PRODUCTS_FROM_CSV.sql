-- ===============================================
-- WACTC Products - Complete Reset from CSV
-- ===============================================
-- This SQL deletes ALL products and re-adds them from the CSV file
-- Includes both Staff products and Student products

-- Step 1: Delete ALL existing products
TRUNCATE TABLE products CASCADE;

-- Step 2: Ensure schema is correct
-- Drop program_id column if it exists (using class instead)
ALTER TABLE products DROP COLUMN IF EXISTS program_id;

-- Add is_active column if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Remove unique constraint on product_id to allow same product in multiple classes
ALTER TABLE products DROP CONSTRAINT IF EXISTS staff_products_product_id_key;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_id_key;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_id_unique;

-- ===============================================
-- Step 3: Insert STAFF PRODUCTS from CSV
-- ===============================================

INSERT INTO products (product_id, name, colors, pricing, class, is_active) VALUES 
('ST253', 'Men''s 1/4 Zip Sweatshirt', 'Athletic Heather, Black, Forest Green, Graphite Heather, Maroon, True Navy, True Red, True Royal, Vintage Heather, White', '{"S-XL": 44.99, "2X": 46.00, "3X": 47.00}', 'Staff', true),
('LST253', 'Ladies 1/4 Zip Sweatshirt', 'Athletic Heather, Black, Forest Green, Graphite Heather, Maroon, True Navy, True Red, True Royal, Vintage Heather, White', '{"S-XL": 44.99, "2X": 46.00, "3X": 47.00}', 'Staff', true),
('F217', 'Men''s Fleece Jacket', 'Black, Deep Smoke, Forest Green, Insignia Blue, Iron Grey, Maroon, True Navy, True Red, True Royal', '{"S-XL": 44.99, "2X": 46.99, "3X": 47.99}', 'Staff', true),
('L217', 'Ladies Fleece Jacket', 'Black, Deep Smoke, Forest Green, Insignia Blue, Iron Grey, Maroon, True Navy, True Red, True Royal, Winter White', '{"S-XL": 38.99, "2X": 40.99, "3X": 41.99}', 'Staff', true),
('W808', 'Men''s Long Sleeve Twill Shirt', 'Burgundy, Cloud Blue, Dark Green, Deep Black, Gusty Grey, Purple, Regatta Blue, Rich Red, Storm Grey, True Navy, True Royal, Ultramarine Blue, Wheat, White', '{"S-XL": 31.99, "2X": 33.99, "3X": 34.99}', 'Staff', true),
('LW808', 'Ladies Long Sleeve Twill Shirt', 'Burgundy, Cloud Blue, Dark Green, Deep Black, Gusty Grey, Purple, Regatta Blue, Rich Red, Storm Grey, True Navy, True Royal, Ultramarine Blue, Wheat, White', '{"S-XL": 31.99, "2X": 33.99, "3X": 34.99}', 'Staff', true),
('W809', 'Men''s Short Sleeve Twill', 'Burgundy, Cloud Blue, Dark Green, Deep Black, Gusty Grey, Purple, Regatta Blue, Rich Red, Storm Grey, True Navy, True Royal, Ultramarine Blue, Wheat, White', '{"S-XL": 29.99, "2X": 31.99, "3X": 32.99}', 'Staff', true),
('LW809', 'Ladies Short Sleeve Twill', 'Burgundy, Cloud Blue, Dark Green, Deep Black, Gusty Grey, Purple, Regatta Blue, Rich Red, Storm Grey, True Navy, True Royal, Ultramarine Blue, Wheat, White', '{"S-XL": 29.99, "2X": 31.99, "3X": 32.99}', 'Staff', true),
('CS418', 'Men''s Lightweight Polo', 'Black, Blue Lake, Charcoal, Dark Green, Dark Navy, Light Grey, Maroon, Red, Royal, Tan, White', '{"S-XL": 28.99, "2X": 30.99, "3X": 31.99}', 'Staff', true),
('CS419', 'Ladies Lightweight Polo', 'Black, Blue Lake, Charcoal, Dark Green, Dark Navy, Light Grey, Maroon, Red, Royal, Tan', '{"S-XL": 28.99, "2X": 30.99, "3X": 31.99}', 'Staff', true);

-- ===============================================
-- Step 4: Insert STUDENT PRODUCTS from CSV
-- ===============================================

INSERT INTO products (product_id, name, colors, pricing, class, is_active) VALUES 
('8300', 'HVAC Pocket Tee', 'Sport Grey', '{"S-XL": 13.00, "2X": 15.00, "3X": 16.00}', 'HVAC', true),
('8000', 'Auto Mechanics Short Sleeve Tee', 'Black', '{"S-XL": 13.00, "2X": 15.00, "3X": 16.00}', 'Auto', true),
('8800', 'Carpentry Polo', 'Maroon', '{"S-XL": 15.00, "2X": 17.00, "3X": 18.00}', 'Carpentry', true),
('436MP', 'Carpentry Pocket Polo', 'Maroon', '{"S-XL": 17.00, "2X": 19.00, "3X": 20.00}', 'Carpentry', true),
('8000', 'SM Short Sleeve Tee', 'Black, Sport Grey', '{"S-XL": 13.00, "2X": 15.00, "3X": 16.00}', 'Sports Medicine', true),
('A4N3142', 'SM Poly Shirt', 'Black, Silver', '{"S-XL": 15.00, "2X": 17.00, "3X": 18.00}', 'Sports Medicine', true),
('18000', 'SM Crewsweatshirt', 'Black, Sport Grey', '{"S-XL": 20.00, "2X": 22.00, "3X": 23.00}', 'Sports Medicine', true),
('F110', 'SM Men''s Fleece Jacket', 'Gusty Grey', '{"S-XL": 50.00, "2X": 52.00, "3X": 53.00}', 'Sports Medicine', true),
('L110', 'SM Ladies Fleece Jacket', 'Gusty Grey', '{"S-XL": 50.00, "2X": 52.00, "3X": 53.00}', 'Sports Medicine', true),
('S508', 'Collision Repair Buttondown', 'Steel Grey/Light Stone', '{"S-XL": 25.00, "2X": 27.00, "3X": 28.00}', 'Collision Repair', true),
('8800', 'Electrical Polo', 'Sport Grey', '{"S-XL": 15.00, "2X": 17.00, "3X": 18.00}', 'Electrical Occupations', true),
('436MP', 'Electrical Pocket Polo', 'Oxford', '{"S-XL": 17.00, "2X": 19.00, "3X": 20.00}', 'Electrical Occupations', true),
('S508', 'EPS Buttondown', 'Royal/ Classic Navy', '{"S-XL": 25.00, "2X": 27.00, "3X": 28.00}', 'EPS', true),
('SP24', 'Machine Shop Buttondown', 'Charcoal', '{"S-XL": 27.00, "2X": 29.00, "3X": 30.00}', 'Machine Shop', true),
('8800', 'Masonry Polo', 'Maroon', '{"S-XL": 15.00, "2X": 17.00, "3X": 18.00}', 'Masonry', true),
('436MP', 'Masonry Pocket Polo', 'Maroon', '{"S-XL": 17.00, "2X": 19.00, "3X": 20.00}', 'Masonry', true),
('8800', 'Networking Polo', 'Sport Grey', '{"S-XL": 15.00, "2X": 17.00, "3X": 18.00}', 'Networking', true),
('436MP', 'Networking Pocket Polo', 'Oxford', '{"S-XL": 17.00, "2X": 19.00, "3X": 20.00}', 'Networking', true),
('5000', 'Welding Short Sleeve Tee', 'Navy', '{"S-XL": 13.00, "2X": 15.00, "3X": 16.00}', 'Welding', true),
('5400', 'Welding Long Sleeve Tee', 'Navy', '{"S-XL": 15.00, "2X": 17.00, "3X": 18.00}', 'Welding', true),
('29MP', 'ARET Pocket Tee', 'Maroon', '{"S-XL": 13.00, "2X": 15.00, "3X": 16.00}', 'ARET', true);

-- ===============================================
-- Summary
-- ===============================================
-- Total Staff Products: 10
-- Total Student Products: 21
-- Total Products: 31
-- 
-- Note: Some product_ids appear multiple times (e.g., 8000, 8800, 436MP, S508)
-- This is intentional - same product appears in multiple student program galleries
-- ===============================================

