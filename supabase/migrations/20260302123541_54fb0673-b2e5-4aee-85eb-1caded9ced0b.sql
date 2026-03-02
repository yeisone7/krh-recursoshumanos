
-- Add image_url column to dotation_item_types
ALTER TABLE public.dotation_item_types ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for dotation images
INSERT INTO storage.buckets (id, name, public) VALUES ('dotation-images', 'dotation-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload dotation images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dotation-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update dotation images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'dotation-images');

-- Allow public read access
CREATE POLICY "Public can view dotation images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'dotation-images');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete dotation images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dotation-images');
