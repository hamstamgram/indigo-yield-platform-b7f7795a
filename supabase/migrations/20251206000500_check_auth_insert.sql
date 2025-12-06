
DO $$
BEGIN
  INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test_auth_insert@test.com');
  RAISE NOTICE 'Auth Insert Worked';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Auth Insert Failed: %', SQLERRM;
END $$;
