-- Add business_type column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS business_type TEXT;

-- Update handle_new_user trigger to capture business_type from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, business_type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'business_type'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
