-- Merge duplicate investor profiles to the canonical @example.com account.
-- Assumes:
--   - Keep the canonical profile (dst), delete the duplicate (src)
--   - Update investor_positions and transactions_v2 to point to dst
-- Adjust pairs as needed before running.

-- Example pairs: {src -> dst}
-- Bo Kriek
--   src: 3a55299f-2914-4328-a18e-dad9e26ac727 (bokriek@hotmail.com)
--   dst: 5cf9484a-b9c3-47ce-87ac-ee0093d65a7f (bokriek@example.com)
-- Kabbaj
--   src: b7378b15-2675-4073-aa9b-ca61a2b8bac9 (H.kabbaj@sgtm-maroc.com)
--   dst: f22e694e-d5f4-4604-97ed-ebb19404d783 (h.kabbaj@example.com)
-- Terance Chen
--   src: b0d19f7a-9b2b-4eef-af0d-9661dfba3f8e (terance.chen@placeholder.indigo)
--   dst: a6537a5d-8dfb-487b-8889-c97d5133bc37 (terance.chen@example.com)
-- Tomer Zur
--   src: 420c4f70-2354-4379-896d-53d14f44e259 (tomer.zur@placeholder.indigo)
--   dst: 1b40d6a6-732c-4329-823e-f161a572712a (tomer.zur@example.com)

-- Placeholder -> example (convert, do not delete dst)
--   ryan.van.der.wall@placeholder.indigo -> ryan.van.der.wall@example.com
--   joel.barbeau@placeholder.indigo -> joel.barbeau@example.com
--   vivie.ann.bakos@placeholder.indigo -> vivie.ann.bakos@example.com
--   alec.beckman@placeholder.indigo -> alec.beckman@example.com
--   lars.ahlgreen@placeholder.indigo -> lars.ahlgreen@example.com
--   alex.jacobs@placeholder.indigo -> alex.jacobs@example.com

-- BEGIN;

-- Update references (positions)
-- Update references (positions)
UPDATE investor_positions SET investor_id = '5cf9484a-b9c3-47ce-87ac-ee0093d65a7f'
WHERE investor_id = '3a55299f-2914-4328-a18e-dad9e26ac727';

UPDATE investor_positions SET investor_id = 'f22e694e-d5f4-4604-97ed-ebb19404d783'
WHERE investor_id = 'b7378b15-2675-4073-aa9b-ca61a2b8bac9';

UPDATE investor_positions SET investor_id = 'a6537a5d-8dfb-487b-8889-c97d5133bc37'
WHERE investor_id = 'b0d19f7a-9b2b-4eef-af0d-9661dfba3f8e';

UPDATE investor_positions SET investor_id = '1b40d6a6-732c-4329-823e-f161a572712a'
WHERE investor_id = '420c4f70-2354-4379-896d-53d14f44e259';

-- Update references (transactions)
UPDATE transactions_v2 SET investor_id = '5cf9484a-b9c3-47ce-87ac-ee0093d65a7f'
WHERE investor_id = '3a55299f-2914-4328-a18e-dad9e26ac727';

UPDATE transactions_v2 SET investor_id = 'f22e694e-d5f4-4604-97ed-ebb19404d783'
WHERE investor_id = 'b7378b15-2675-4073-aa9b-ca61a2b8bac9';

UPDATE transactions_v2 SET investor_id = 'a6537a5d-8dfb-487b-8889-c97d5133bc37'
WHERE investor_id = 'b0d19f7a-9b2b-4eef-af0d-9661dfba3f8e';

UPDATE transactions_v2 SET investor_id = '1b40d6a6-732c-4329-823e-f161a572712a'
WHERE investor_id = '420c4f70-2354-4379-896d-53d14f44e259';

-- Delete duplicate profiles (src)
DELETE FROM profiles WHERE id IN (
  '3a55299f-2914-4328-a18e-dad9e26ac727',
  'b7378b15-2675-4073-aa9b-ca61a2b8bac9',
  'b0d19f7a-9b2b-4eef-af0d-9661dfba3f8e',
  '420c4f70-2354-4379-896d-53d14f44e259'
);

-- Convert placeholder emails to @example.com (without deleting)
UPDATE profiles SET email = 'ryan.van.der.wall@example.com'
WHERE email = 'ryan.van.der.wall@placeholder.indigo';

UPDATE profiles SET email = 'joel.barbeau@example.com'
WHERE email = 'joel.barbeau@placeholder.indigo';

UPDATE profiles SET email = 'vivie.ann.bakos@example.com'
WHERE email = 'vivie.ann.bakos@placeholder.indigo';

UPDATE profiles SET email = 'alec.beckman@example.com'
WHERE email = 'alec.beckman@placeholder.indigo';

UPDATE profiles SET email = 'lars.ahlgreen@example.com'
WHERE email = 'lars.ahlgreen@placeholder.indigo';

UPDATE profiles SET email = 'alex.jacobs@example.com'
WHERE email = 'alex.jacobs@placeholder.indigo';
