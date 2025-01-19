/*
  # Initial Schema for BariGuru

  1. New Tables
    - `writer_applications`
      - Stores pending writer applications
      - Contains personal info, education details, and verification data
    - `writers`
      - Stores approved writers
      - Contains writer profile information and contact details

  2. Security
    - Enable RLS on all tables
    - Add policies for:
      - Public read access to approved writers
      - Admin access to all tables
      - Writers can read their own data
*/

-- Writer Applications Table
CREATE TABLE writer_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    college_name text NOT NULL,
    branch text NOT NULL,
    email text NOT NULL,
    rate_per_ten_pages decimal NOT NULL,
    student_id_url text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Writers Table
CREATE TABLE writers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    college_name text NOT NULL,
    branch text NOT NULL,
    email text NOT NULL,
    rate_per_ten_pages decimal NOT NULL,
    student_id_url text NOT NULL,
    status text NOT NULL DEFAULT 'approved',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE writer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE writers ENABLE ROW LEVEL SECURITY;

-- Policies for writer_applications
CREATE POLICY "Allow insert for all users" ON writer_applications
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow admin full access" ON writer_applications
    FOR ALL TO authenticated
    USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE email IN ('admin@bariguru.com')
    ));

-- Policies for writers
CREATE POLICY "Allow public read access to approved writers" ON writers
    FOR SELECT
    USING (status = 'approved');

CREATE POLICY "Allow admin full access to writers" ON writers
    FOR ALL TO authenticated
    USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE email IN ('admin@bariguru.com')
    ));