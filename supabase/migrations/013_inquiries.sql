CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiry_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL DEFAULT 'staff',
  staff_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_inquiries" ON inquiries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_inquiries" ON inquiries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_select_own_replies" ON inquiry_replies FOR SELECT USING (
  EXISTS (SELECT 1 FROM inquiries WHERE id = inquiry_id AND user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS inquiries_user_id_idx ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries(status);
CREATE INDEX IF NOT EXISTS inquiry_replies_inquiry_id_idx ON inquiry_replies(inquiry_id);
