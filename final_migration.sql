-- 1. Funds Configuration

        INSERT INTO public.funds (id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps, min_investment, fund_class)
        VALUES ('f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 'BTCYF', 'BTC Yield Fund', 'BTC', '2024-01-01', 'active', 200, 2000, 1000, 'BTC')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.funds (id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps, min_investment, fund_class)
        VALUES ('0c1743f4-74f9-5749-9c41-9d2c30b3089e', 'ETHYF', 'ETH Yield Fund', 'ETH', '2024-01-01', 'active', 200, 2000, 1000, 'ETH')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.funds (id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps, min_investment, fund_class)
        VALUES ('7368d551-debf-59e7-8755-b24877e0b8b0', 'BTCBST', 'BTC Boosted Program', 'BTC', '2024-01-01', 'active', 200, 2000, 1000, 'BTC')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.funds (id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps, min_investment, fund_class)
        VALUES ('cad26c2f-fc36-5f22-9ba6-b62032a48161', 'ETHTAC', 'ETH TAC Program', 'ETH', '2024-01-01', 'active', 200, 2000, 1000, 'ETH')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.funds (id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps, min_investment, fund_class)
        VALUES ('ce21954c-a7c0-5945-bc9e-1dadbb06d487', 'USDTYF', 'USDT Yield Fund', 'USDT', '2024-01-01', 'active', 200, 2000, 1000, 'USDT')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.funds (id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps, min_investment, fund_class)
        VALUES ('916cd303-fdb2-50cc-b27d-5cc440215c88', 'SOLYF', 'SOL Yield Fund', 'SOL', '2024-01-01', 'active', 200, 2000, 1000, 'SOL')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.funds (id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps, min_investment, fund_class)
        VALUES ('79690b17-0d5d-539e-b576-b3b3f5ea09b9', 'XRPYF', 'XRP Yield Fund', 'XRP', '2024-01-01', 'active', 200, 2000, 1000, 'XRP')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

-- 2. Investors Configuration

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('c2d5ccce-1bd6-50a0-9997-65350585ae31', 'Jose Molla', 'jose.molla@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'Kyle Gulamerian', 'Out of BTC Fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('be698742-dd53-55ae-a404-b280eb607451', 'Matthias Reiser', 'matthias@xventures.de', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('3e7956c9-2dbd-54c1-9ede-83011437ad91', 'Thomas Puech', 'thomas.puech@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('f8159d04-322d-5b5e-bff9-f4dad1c21299', 'Danielle Richetta', 'danielle.richetta@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'Nathanaël Cohen', 'nathanaël.cohen@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('05cce195-6716-551b-ad91-3a5d0c4d5248', 'Vivie-Ann Bakos', 'vivie-ann.bakos@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('b473d298-68f8-5225-b46d-a8a04d971f73', 'Victoria', 'TAC Program', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('1461129c-eef7-553b-8f37-330c42414760', 'Babak Eftekhari', 'babak.eftekhari@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('4397e202-b0a2-5e02-8a74-43101bf0fc78', 'INDIGO DIGITAL ASSET FUND LP', 'indigo.digital.asset.fund.lp@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('84a8a4a6-16db-523f-b65f-897cd0c3406b', 'danielle Richetta', 'danielle.richetta@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('13a4ed57-f416-59ec-925e-3403ad41a758', 'Kabbaj', 'kabbaj@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('4e768824-8692-52ec-8104-c629981d60a8', 'Julien Grunebaum', 'julien.grunebaum@icloud.com', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'Daniele Francilia', 'danielefrancilia@gmail.com', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('17b8122e-76c8-534d-90cc-ba31f0e4c34f', 'Pierre Bezencon', 'pib@bruellan.ch', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'Matthew Beatty', 'matthew.beatty@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('7d3a0c1b-94bb-5cca-9853-183ef4f7bbcb', 'Bo Kriek', 'bokriek@hotmail.com', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'Dario Deiana', 'dario.deiana@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('7e8de33b-2b79-5888-a29e-0fb06e36b118', 'Alain Bensimon', 'alain.bensimon@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'Anne Cecile Noique', 'anne.cecile.noique@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('1541a158-4e91-5f77-b8fc-6b8375d185ba', 'Terance Chen', 'terance.chen@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'Oliver Loisel', 'oliver.loisel@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('0d2aad95-3131-52fa-b5cb-4532baf483be', 'Advantage Blockchain', 'advantage.blockchain@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('46691d12-2945-5f80-8a86-325dec420021', 'INDIGO Ventures', 'indigo.ventures@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('179e05fe-b763-557f-ac0e-f6750bfc1b35', 'Paul Johnson', 'paul.johnson@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', 'Tomer Zur', 'tomer.zur@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('4272ddbb-229b-50e0-95a0-7c8997f73340', 'Sacha Oshry', 'sacha.oshry@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('7a88863a-9749-5612-b936-0eadd799e6a3', 'HALLEY86', 'halley86@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('918141e8-504b-534b-9686-c04d018da769', 'Indigo Fees', 'indigo.fees@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('2745929b-5ff3-5e08-ade2-b605254d29cd', 'Monica Levy Chicheportiche', 'monica.levy.chicheportiche@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('e5aefeb7-095c-59fc-8392-e4538d8daeaa', 'Nath & Thomas', 'nath.&.thomas@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('85e40050-cf85-5c53-91e3-b149a1d11c64', 'Sam Johnson', 'sam.johnson@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('23788484-2a19-5495-a829-098bff0da61a', 'Valeria Cruz', 'valeria.cruz@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('a5a304e5-c8a1-55cd-8c26-147cf9363d8d', 'Rabih Mokbel', 'rabih.mokbel@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('28f90d52-d2a4-55e7-9d8c-cf29ab698750', 'Vivie & Liana', 'vivie.&.liana@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('69c51f1e-4eb5-5633-9198-a0754e304af1', 'Brandon Hood', 'brandon.hood@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'Victoria Pariente-Cohen', 'victoria.pariente-cohen@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'Alex Jacobs', 'alex jacobs@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('174d213f-9455-5d16-aa36-2e3557272ae5', 'Ryan Van Der Wall', 'ryan.van.der.wall@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('2103b664-4646-5cec-8530-f464d4f7dc05', 'Kabbaj Fam', 'kabbaj.fam@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('35b7b16f-0994-557e-8845-437f89a479d1', 'Nathanael Cohen', 'nathanael.cohen@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('a4f2de17-af8e-53fb-ba85-17216bc40116', 'oliver loisel', 'oliver.loisel@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('30c6f9c1-eba1-50df-b88d-6d209efcb978', 'Lars Ahlgreen', 'lars.ahlgreen@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('959a3971-0864-5feb-bfa5-960d56809e5e', 'Alec Beckman', 'alec.beckman@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('e9523e10-efc0-5540-90d3-c304f7ad0ef6', 'Alex Jacobs', 'alex.jacobs@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'Pierre Bezençon', 'pierre.bezençon@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('feb2478f-db70-56be-9362-36cc8f22a910', 'Bo De kriek', 'bo.de.kriek@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('aca75818-8abd-5d7f-a7dd-e107b94cf65b', 'Joel Barbeau', 'joel barbeau@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'julien grunebaum', 'julien.grunebaum@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'daniele francilia', 'daniele.francilia@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'pierre bezencon', 'pierre.bezencon@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('ab7879dd-8a38-598d-9a24-afefd504eaa8', 'matthew beatty', 'matthew.beatty@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('a38de986-9bb7-54c3-9352-82ba2f47714e', 'bo kriek', 'bo.kriek@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'alain bensimon', 'alain.bensimon@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'anne cecile noique', 'anne.cecile.noique@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'terance chen', 'terance.chen@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('05b16a01-46c6-56dd-bd6e-c6dfb4a1427a', 'x', 'x@placeholder.indigo.fund', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        

-- 3. Transactions (Deposits from Investments Sheet)

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('2eb21fbb-0a4f-5af8-9013-438084cec2d4', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-06-12T00:00:00', '2024-06-12T00:00:00', 'BTC', 2.723, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('f6cfb309-116f-54fe-808d-1a8afa95c4e6', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2024-06-12T00:00:00', '2024-06-12T00:00:00', 'ETH', 52.4, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('836b4873-1aa9-55d9-9fee-b51e9e832d1b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-07-08T00:00:00', '2024-07-08T00:00:00', 'BTC', 0.745, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('ccd6f1dc-8d37-5b0e-951d-ba1746fa0d8a', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2024-07-08T00:00:00', '2024-07-08T00:00:00', 'ETH', 9.1, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('f38a939e-e6ff-5bb7-a629-59387c56d838', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-08-21T00:00:00', '2024-08-21T00:00:00', 'BTC', 0.01, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('5837b6b6-d42c-5ead-8ddc-d49817afb9bc', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-08-21T00:00:00', '2024-08-21T00:00:00', 'BTC', 1.99, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('ccedf463-4d26-5b22-b1c7-4d177fd7320e', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01T00:00:00', '2024-10-01T00:00:00', 'BTC', 4.62, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('c363df23-7682-5fa9-a67d-e90bb3370ec0', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01T00:00:00', '2024-10-01T00:00:00', 'BTC', 6.5193, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('b221d854-accf-5f63-bac5-88c0cdb97456', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01T00:00:00', '2024-10-01T00:00:00', 'BTC', 5.2, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('9330acbb-3760-5ad5-a849-90205ff789fa', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2024-10-01T00:00:00', '2024-10-01T00:00:00', 'ETH', 17.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('8a64c320-581e-5097-82d9-b164233dc64c', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2024-10-24T00:00:00', '2024-10-24T00:00:00', 'ETH', 120.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('39eedfe6-f61a-5739-93d6-4abff2febbaa', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09T00:00:00', '2024-11-09T00:00:00', 'BTC', -0.27, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('52de6cf0-6991-5c20-8c72-7eba831335b2', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14T00:00:00', '2024-12-14T00:00:00', 'BTC', -0.124, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('b057b89c-636a-5502-9995-f1dc483f2a63', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-03-01T00:00:00', '2025-03-01T00:00:00', 'ETH', 4.608, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('254014c7-0691-5362-a468-446a6f10e09e', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-03-31T00:00:00', '2025-03-31T00:00:00', 'ETH', 5.226, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('e71ed485-49f6-5212-b456-54bd18b59141', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-01T00:00:00', '2025-04-01T00:00:00', 'BTC', 0.1492, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('fe83c836-6aaf-5f1b-908e-75555903e7d3', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-01T00:00:00', '2025-04-01T00:00:00', 'BTC', 0.4483, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('70e6da7d-0a0b-5653-98cf-c7f297bf7424', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-01T00:00:00', '2025-04-01T00:00:00', 'BTC', 4.121, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('7da4d199-0c0a-54ef-8d41-d669642f1995', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-13T00:00:00', '2025-05-13T00:00:00', 'BTC', -2.1101, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('9294bcb1-ca8c-5420-b1e7-1af62b66cce5', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-05-26T00:00:00', '2025-05-26T00:00:00', 'ETH', 27.01, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('aed53b66-dc01-5e10-8943-9b4e8d7301f0', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-05-26T00:00:00', '2025-05-26T00:00:00', 'ETH', 175.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('13dae0ec-17d8-5bad-8a2e-06ec7541e14f', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-05-30T00:00:00', '2025-05-30T00:00:00', 'ETH', 3.0466, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('2e337d2d-a6c3-5d09-be1b-ddd398701698', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-05-30T00:00:00', '2025-05-30T00:00:00', 'ETH', 32.25, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('612fc138-587a-5937-8278-fb2e2ba396c6', '84a8a4a6-16db-523f-b65f-897cd0c3406b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-30T00:00:00', '2025-05-30T00:00:00', 'BTC', -0.13, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('548efdb4-85fa-56ac-98f0-20a37b710a17', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-11T00:00:00', '2025-06-11T00:00:00', 'BTC', 2.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('eea04ceb-84d5-5920-a766-f93ba621eb30', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-06-16T00:00:00', '2025-06-16T00:00:00', 'USDT', 135726.75, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('4257c69f-c9d0-5c7f-90cd-3d821f1a3ed9', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-06-30T00:00:00', '2025-06-30T00:00:00', 'ETH', 2.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('c7af5fc0-c766-52c6-b9f8-242d3d5ea32f', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11T00:00:00', '2025-07-11T00:00:00', 'BTC', 0.9914, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('68e5e763-a0b8-5d18-8e24-4b839c307fd6', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14T00:00:00', '2025-07-14T00:00:00', 'USDT', 109392.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('ab9bbce7-9956-5d2f-8de7-4d8948225d18', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14T00:00:00', '2025-07-14T00:00:00', 'USDT', 109776.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('be3c090a-cfa1-519d-99b2-a83d351ace59', '17b8122e-76c8-534d-90cc-ba31f0e4c34f', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14T00:00:00', '2025-07-14T00:00:00', 'USDT', 109333.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('08538392-e144-53e5-baf9-b9a0b750a684', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14T00:00:00', '2025-07-14T00:00:00', 'USDT', 255504.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('de669c38-2dc8-553a-857a-feb9ccb34ce4', '7d3a0c1b-94bb-5cca-9853-183ef4f7bbcb', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14T00:00:00', '2025-07-14T00:00:00', 'USDT', 273807.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('c1fca5ce-bf16-53fc-a117-2ca5d850656c', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-17T00:00:00', '2025-07-17T00:00:00', 'USDT', 199659.72, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('3365fb3c-fe94-5af4-9c41-fa7cdd63bc88', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-17T00:00:00', '2025-07-17T00:00:00', 'USDT', 46955.28, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('62a15f8f-f0c1-53ea-95eb-b0e48693b809', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23T00:00:00', '2025-07-23T00:00:00', 'USDT', 136737.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('d2b03a06-4ce6-5cd9-9015-a2143279e9fe', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23T00:00:00', '2025-07-23T00:00:00', 'USDT', 222687.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('6322b679-a8b0-542b-a6a8-30df369f5a74', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23T00:00:00', '2025-07-23T00:00:00', 'USDT', 219747.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('dda4eec7-eefc-591f-a4ce-cb10e72ead31', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24T00:00:00', '2025-07-24T00:00:00', 'BTC', 2.115364, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('54fd9ab0-63a2-59b2-9ad7-d90d19f2a761', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25T00:00:00', '2025-07-25T00:00:00', 'BTC', -0.26, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('c701f859-b333-5008-9762-ea7124eb3e3d', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30T00:00:00', '2025-07-30T00:00:00', 'ETH', 32.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('c68a01c2-194a-55a2-93dc-cd5356514ec9', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30T00:00:00', '2025-07-30T00:00:00', 'ETH', -178.37, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('df77f6c3-f10a-59bb-a1a5-9225e9fb1df9', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31T00:00:00', '2025-07-31T00:00:00', 'BTC', 0.6, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('6fb12ec9-f420-5032-a04b-c6fb26867b8b', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04T00:00:00', '2025-08-04T00:00:00', 'USDT', 130000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('56eff23c-8450-517c-89ee-ac5daec25780', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04T00:00:00', '2025-08-04T00:00:00', 'USDT', 10000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('223587b1-939d-5baa-88db-db7c781fe0df', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14T00:00:00', '2025-08-14T00:00:00', 'USDT', 25900.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('5c03956f-b387-59b9-a860-30b1fa3cecca', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19T00:00:00', '2025-08-19T00:00:00', 'USDT', 111370.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('752f1721-16ae-5663-aad6-26121b82bd19', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20T00:00:00', '2025-08-20T00:00:00', 'BTC', -0.11, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('2f124307-7a4c-56b2-8974-21e5ac840e3a', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25T00:00:00', '2025-08-25T00:00:00', 'BTC', 0.9102, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('c0819ea7-be94-5705-bb23-709ce2705338', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04T00:00:00', '2025-09-04T00:00:00', 'ETH', 10.44, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('3c125597-4a0a-5b6c-bcf3-2096534fcfbc', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10T00:00:00', '2025-09-10T00:00:00', 'ETH', 4.6327, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('af68f9e6-695f-5dc3-aa5c-425f124ffeda', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12T00:00:00', '2025-09-12T00:00:00', 'ETH', 8.96, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('a0d36ba5-ab8f-5276-8375-d6eaca005c88', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12T00:00:00', '2025-09-12T00:00:00', 'ETH', 3.35, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('98b44e3f-917f-586b-a8dd-99e816658865', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24T00:00:00', '2025-09-24T00:00:00', 'USDT', 10000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('87384e2f-7757-5a28-8441-3782eccc8365', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27T00:00:00', '2025-09-27T00:00:00', 'ETH', 63.1, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('c6aa28da-81ac-50a3-bd9f-2d22004c08ef', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03T00:00:00', '2025-10-03T00:00:00', 'BTC', 0.4395, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('923ecb1e-a3f4-5f41-b94e-2803c11ca6e8', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03T00:00:00', '2025-10-03T00:00:00', 'ETH', -12.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('83e3d181-7ceb-5f81-929d-7169751c0ab9', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06T00:00:00', '2025-10-06T00:00:00', 'USDT', -100000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('383d6b4b-adff-5ae6-a121-0d0cb54cae9c', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06T00:00:00', '2025-10-06T00:00:00', 'USDT', 100000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('3dd8359f-9f85-5db7-a68a-17618c098704', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08T00:00:00', '2025-10-08T00:00:00', 'ETH', 10.051, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('4ba1f9bc-d49c-50ce-a7a3-899784ccef2b', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09T00:00:00', '2025-10-09T00:00:00', 'USDT', 20000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('f1f2ac70-534f-5a75-8eb2-eb8331f50a4e', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13T00:00:00', '2025-10-13T00:00:00', 'USDT', -27594.55, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('5fd93835-2b13-5e9c-9c03-c036f502f05c', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14T00:00:00', '2025-10-14T00:00:00', 'ETH', 64.27, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('5073d404-9084-5c1b-83be-7f99c2e34638', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14T00:00:00', '2025-10-14T00:00:00', 'ETH', 3.75, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('097aa92d-6f15-5fec-a92e-95406e0d807f', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15T00:00:00', '2025-10-15T00:00:00', 'USDT', 99990.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('f60e4b60-b427-59cf-8850-812d601df648', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17T00:00:00', '2025-10-17T00:00:00', 'ETH', 3.1, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('f8357310-7eab-51da-a18c-5ff2f449611a', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20T00:00:00', '2025-10-20T00:00:00', 'ETH', 6.5417, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('b0c30243-3765-5b1e-a6f8-c2ec836c6686', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23T00:00:00', '2025-10-23T00:00:00', 'ETH', 1.2, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('bf43fd28-e456-5031-ad88-ff85d64c42a2', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23T00:00:00', '2025-10-23T00:00:00', 'ETH', 6.4, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('e092d739-cbbd-5eab-8e9a-19b6eb018be5', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23T00:00:00', '2025-10-23T00:00:00', 'BTC', 0.062, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('4dd40755-28e2-508a-b490-ae9ef0467882', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23T00:00:00', '2025-10-23T00:00:00', 'USDT', 97695.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('a791a2cc-1174-520d-a5f8-beb49bf0f643', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23T00:00:00', '2025-10-23T00:00:00', 'USDT', 10450.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('41db9609-0616-50a7-b1f0-40f0c5bd39ab', '918141e8-504b-534b-9686-c04d018da769', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03T00:00:00', '2025-11-03T00:00:00', 'ETH', 0.03593745021234585, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('ae89842f-6729-58a5-8409-9e54e9640300', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03T00:00:00', '2025-11-03T00:00:00', 'ETH', 2.5063577386065177, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('349eeb05-83b9-514c-a4d5-d4f2f533914a', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03T00:00:00', '2025-11-03T00:00:00', 'ETH', 1.067745459138733, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('a03bdedc-e3bc-5bc7-b559-c7bc0f4b1101', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03T00:00:00', '2025-11-03T00:00:00', 'ETH', 4.793959352042402, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('4287bc8b-11c0-5649-9620-49133c32688d', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03T00:00:00', '2025-11-03T00:00:00', 'USDT', -113841.65, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('2046c145-2207-58e4-86c0-2431f173d9b8', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04T00:00:00', '2025-11-04T00:00:00', 'ETH', 6.9519, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('025fac42-b7f6-5239-b399-55f653959e83', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04T00:00:00', '2025-11-04T00:00:00', 'USDT', 35300.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('b47297d1-4856-55d0-8702-99b5c935cf38', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05T00:00:00', '2025-11-05T00:00:00', 'ETH', 7.6215, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('d87e20de-d229-54e9-b34b-f3a21a92fde9', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05T00:00:00', '2025-11-05T00:00:00', 'BTC', -0.283, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('df2c12a3-c4d8-5843-a2ce-35b1827173bc', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05T00:00:00', '2025-11-05T00:00:00', 'BTC', -0.4408, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('b208e2a1-69d2-51e5-bcfd-8c8caa4f2ac7', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05T00:00:00', '2025-11-05T00:00:00', 'ETH', -12.22, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('50737d1d-e368-5256-b629-59f69c9c713b', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07T00:00:00', '2025-11-07T00:00:00', 'USDT', 840168.03, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('9c86c2f3-34d3-5ea3-b463-9a7fc4bf12e9', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07T00:00:00', '2025-11-07T00:00:00', 'ETH', 10.224, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('5ef9f81d-5a48-583a-8dc6-599297dd1377', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08T00:00:00', '2025-11-08T00:00:00', 'USDT', -50000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('39033c55-4158-5ebc-9d3a-8356477f9b4c', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-08T00:00:00', '2025-11-08T00:00:00', 'BTC', 0.4867, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('e0787601-cc27-57de-96e2-463061aa690f', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13T00:00:00', '2025-11-13T00:00:00', 'USDT', 299915.77, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('53e164ec-4c04-5c0d-a593-c4c128a737d5', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17T00:00:00', '2025-11-17T00:00:00', 'BTC', 3.3, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('4456cf56-e9e8-5daa-9909-ace1c9f390a0', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17T00:00:00', '2025-11-17T00:00:00', 'ETH', 78.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('8ab80efa-95e7-5e82-8c13-2c6bdd14a94a', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17T00:00:00', '2025-11-17T00:00:00', 'ETH', 6.234, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('72377929-6e25-5e26-a406-544ec814c26b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21T00:00:00', '2025-11-21T00:00:00', 'USDT', -47908.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('31aa4ac7-4e26-529d-bb0b-86c4c1cca58d', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25T00:00:00', '2025-11-25T00:00:00', 'BTC', 1.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('d9145a92-0e05-521d-9f31-88c1211edd9d', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25T00:00:00', '2025-11-25T00:00:00', 'ETH', 35.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('d17370ae-134e-507d-a47d-9f277a2ea51b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25T00:00:00', '2025-11-25T00:00:00', 'BTC', 0.548, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('2afea74a-3202-5da6-a1a2-2fc820297364', '23788484-2a19-5495-a829-098bff0da61a', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25T00:00:00', '2025-11-25T00:00:00', 'USDT', 50000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('7db3da25-28d1-5c27-a9e2-2ddc8791c422', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26T00:00:00', '2025-11-26T00:00:00', 'USDT', 18000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('114c5d2d-0e24-5e8b-a869-e13b9d1d6199', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26T00:00:00', '2025-11-26T00:00:00', 'USDT', -87937.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('4d40a551-1806-5217-a53b-8dad0bfe769e', 'a5a304e5-c8a1-55cd-8c26-147cf9363d8d', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27T00:00:00', '2025-11-27T00:00:00', 'USDT', 100000.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'USDT')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('93dead61-9adb-5d17-ba02-e27c49130d56', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27T00:00:00', '2025-11-27T00:00:00', 'BTC', 1.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('5fdf59cf-c1b9-513e-88aa-867480172db0', '28f90d52-d2a4-55e7-9d8c-cf29ab698750', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27T00:00:00', '2025-11-27T00:00:00', 'BTC', 3.411, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('43e2b25d-b1b8-5af6-af00-c0fc4fad3937', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30T00:00:00', '2025-11-30T00:00:00', 'BTC', 1.2, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'BTC')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('8025efc9-3886-5254-bc07-f5565bfe1c33', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30T00:00:00', '2025-11-30T00:00:00', 'ETH', 33.0, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('1359dc45-1f53-5127-bd0a-242891a9ea52', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02T00:00:00', '2025-12-02T00:00:00', 'ETH', 9.143, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('a0121341-9394-56fa-8f4c-cd1f9401585d', '69c51f1e-4eb5-5633-9198-a0754e304af1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04T00:00:00', '2025-12-04T00:00:00', 'ETH', 31.37, 'deposit', 'approved', 0, 'Initial Investment from Excel', 'ETH')
            ON CONFLICT (id) DO NOTHING;
            

-- 4. Transactions (Monthly Reconciliation)

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5f62ff52-c648-4d7b-b172-70936a5e81e5', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-08-01', '2024-08-01', 'BTC', 3.4856, 'deposit', 'approved', 3.4856, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e4637f69-618d-419b-853c-fb84087a3dbd', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-08-22', '2024-08-22', 'BTC', 0.007989914000000375, 'yield', 'approved', 3.493589914, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('81cdd11e-523b-4c9c-9e79-d17881a850e5', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-09-01', '2024-09-01', 'BTC', 0.0050815849999996665, 'yield', 'approved', 3.498671499, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6a1811c5-cdea-4f53-9271-c9f97e954d6a', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 0.015239223000000024, 'yield', 'approved', 3.513910722, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fa6c7d86-307b-4d06-9a26-7ccb960a5b68', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-01', '2024-11-01', 'BTC', 0.014223121000000116, 'yield', 'approved', 3.528133843, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9b76de4c-a9cb-4af6-805b-c68cd072a6ac', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.0038506240000000247, 'yield', 'approved', 3.531984467, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7bc2d68c-971c-4473-bcdf-26b2b12edd62', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-01', '2024-12-01', 'BTC', 0.011692086000000046, 'yield', 'approved', 3.543676553, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6f0635e6-b162-41f8-bdce-2cbe5e10347a', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.005192199999999758, 'yield', 'approved', 3.548868753, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cc31d691-ab7c-4e37-8de9-5ecdf2eba633', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-01-01', '2025-01-01', 'BTC', 0.014518875000000264, 'yield', 'approved', 3.563387628, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f4fa623b-1eea-4373-8a1e-20b977a21e66', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-02-01', '2025-02-01', 'BTC', 0.016703380000000045, 'yield', 'approved', 3.580091008, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3a1f3e93-de29-4108-8717-4dca6a4ff1ff', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-03-01', '2025-03-01', 'BTC', 0.011122612999999948, 'yield', 'approved', 3.591213621, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c5e2a78e-be9a-4fd2-bf60-ba003b6bdfc2', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-01', '2025-04-01', 'BTC', 0.01111400699999976, 'yield', 'approved', 3.602327628, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ab9fc612-3107-41a3-9ec6-29c0667dbee9', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-16', '2025-04-16', 'BTC', 0.019632395000000358, 'yield', 'approved', 3.621960023, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7f3fc337-df65-4e08-b540-e54f52c36ac2', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-01', '2025-05-01', 'BTC', 0.011073507999999954, 'yield', 'approved', 3.633033531, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('10f85b0f-2937-4f9e-9bcc-af05eb326c79', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-13', '2025-05-13', 'BTC', 0.0036883589999998634, 'yield', 'approved', 3.63672189, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4dd38212-b1e6-4795-9a5e-05ab5cfd32eb', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-01', '2025-06-01', 'BTC', 0.013642158000000126, 'yield', 'approved', 3.650364048, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('66b235ae-ef1e-46ea-bebd-f99eb1640bca', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-11', '2025-06-11', 'BTC', 0.00871536500000003, 'yield', 'approved', 3.659079413, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('49391006-30e2-4f05-9604-bdbadfacd8db', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-01', '2025-07-01', 'BTC', 0.0024511430000000445, 'yield', 'approved', 3.661530556, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c92b4de3-4edd-4e1d-8a58-a9a4b7c8ec8b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.011224729999999905, 'yield', 'approved', 3.672755286, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0d1a471b-f2c6-4286-9f71-12b5953e1e12', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.0007948700000000031, 'yield', 'approved', 3.673550156, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ec3e6ad6-f873-4548-b7fb-c144d2a33128', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.00015911900000009638, 'yield', 'approved', 3.673709275, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('57bb1d8d-8170-45fe-a696-1a1d4a4a01a9', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0019620779999995897, 'yield', 'approved', 3.675671353, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f798237b-4847-4463-8aa1-4f31c34872d3', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.00791446699999998, 'yield', 'approved', 3.68358582, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('33be3327-502d-4cb0-9b40-3296fd3fb344', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.0014469080000001355, 'yield', 'approved', 3.685032728, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2ea376fa-978b-4f6a-997d-463b3bf73a26', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 0.0013861950000002565, 'yield', 'approved', 3.686418923, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1076f71c-320c-403e-a7bf-b9a3a43e1f81', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 0.01030183799999973, 'yield', 'approved', 3.696720761, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f74353d7-bbfa-4748-83a7-a22f49511664', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.001871756999999974, 'yield', 'approved', 3.698592518, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8d26efdd-8fc2-4196-94d6-e15b5f3a55fe', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.06942960300000012, 'yield', 'approved', 3.768022121, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bfd6a216-e90a-4ad3-9d7f-962df8682950', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 0.0007488780000000084, 'yield', 'approved', 3.768770999, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('603168e8-2eda-4fad-8ad5-d1640ebb5358', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0018720989999998494, 'yield', 'approved', 3.770643098, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('97b3c2c6-bf27-4217-8633-9c8844dd1608', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.49089356700000053, 'yield', 'approved', 4.261536665, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a5a0df98-36cd-46ba-8f03-45b87904d778', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.0024795009999998285, 'yield', 'approved', 4.264016166, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('26c88d0c-8584-490d-adf1-3ebba4e144c5', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.548, 'yield', 'approved', 4.812016166, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7a4cf0d3-8060-4199-8481-a497dab848e0', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0012516350000000287, 'yield', 'approved', 4.813267801, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b6217dc1-04e4-4dcd-bcc9-57ab50e1162f', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-08-22', '2024-08-22', 'BTC', 2, 'deposit', 'approved', 2, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ec418dec-90a6-41d8-bb90-6d82034868fb', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-09-01', '2024-09-01', 'BTC', 0.003090908999999975, 'yield', 'approved', 2.003090909, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('873e386b-7776-43fc-b8e8-afc94f8e7e83', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 0.00927020299999981, 'yield', 'approved', 2.012361112, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7d559ea7-9a40-41a2-a8db-56a2e50303e3', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-01', '2024-11-01', 'BTC', 0.008654441000000013, 'yield', 'approved', 2.021015553, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('76acbcfe-b938-4bd6-bbeb-360785c4e65a', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.0023436060000001646, 'yield', 'approved', 2.023359159, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('01422320-1c58-4ccf-add2-ccdbcabc9ed7', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-01', '2024-12-01', 'BTC', 0.007116643000000256, 'yield', 'approved', 2.030475802, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('78511c84-052d-407f-aea5-a6bc2978e316', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.003160996999999721, 'yield', 'approved', 2.033636799, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('857570b5-5920-4342-80b1-4622e1ebc3e5', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 2.033636799, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f3926cad-9599-47cb-b7c6-49e3766c354b', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-16', '2025-04-16', 'BTC', 2.101, 'deposit', 'approved', 2.101, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e3af4608-6458-4eb7-8b9d-e5cc3099303a', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-01', '2025-05-01', 'BTC', 0.0068249040000001315, 'yield', 'approved', 2.107824904, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e6ef1f3b-015a-4ce9-9fb9-690a8f0c43a4', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-13', '2025-05-13', 'BTC', 2.107824904, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fc1f4295-0d31-48f4-a0ba-69f6d4b23ec3', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 4.62, 'deposit', 'approved', 4.62, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2024-10-01T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d74fc8b8-0aac-4011-b3ad-cd3cfe850e41', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-01', '2024-11-01', 'BTC', 0.021037720999999898, 'yield', 'approved', 4.641037721, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b36442be-2d5e-4cd3-8473-b7e9fdd6c433', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.005698408999999849, 'yield', 'approved', 4.64673613, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4b1b1383-841b-42d1-8eb1-5f1af384d500', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-01', '2024-12-01', 'BTC', 0.017305086000000358, 'yield', 'approved', 4.664041216, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('73b608dd-6652-49b9-b74f-e9dfae276c6a', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.007687980000000039, 'yield', 'approved', 4.671729196, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cdd64604-d11f-4148-a413-1049b2971937', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 4.671729196, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('911c0951-a4af-4371-a62a-77884ab42577', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-16', '2025-04-16', 'BTC', 4.8357, 'deposit', 'approved', 4.8357, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('12d67767-385a-4dbd-9b42-0500b70085b3', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-01', '2025-05-01', 'BTC', 0.016632343999999577, 'yield', 'approved', 4.852332344, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('13a6b2cd-4b34-435e-ba39-8bb33552deb7', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-13', '2025-05-13', 'BTC', 0.005542004000000489, 'yield', 'approved', 4.857874348, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5037086c-5222-4c1d-81a3-11d6f003c257', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-01', '2025-06-01', 'BTC', 0.020500844999999934, 'yield', 'approved', 4.878375193, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('487185b5-24d1-4072-863e-32d5b98c4910', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-11', '2025-06-11', 'BTC', 0.013103193000000068, 'yield', 'approved', 4.891478386, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('15888cb5-a6e9-4a2c-b56f-cb931257cfd7', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-01', '2025-07-01', 'BTC', 0.0036862890000000093, 'yield', 'approved', 4.895164675, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5c67671c-a2a1-4cea-9c9e-069e14704812', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.016882358000000153, 'yield', 'approved', 4.912047033, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('12a1eb5f-0416-4f6a-8a0f-87cba1298e5c', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.0011959660000000483, 'yield', 'approved', 4.913242999, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d0a5ec20-3c68-42d1-9883-93c70d0b959d', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.00023941799999960267, 'yield', 'approved', 4.913482417, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f80cc837-df89-49af-93b6-af7e8a3ba15c', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.002952252000000044, 'yield', 'approved', 4.916434669, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d576ee3d-afb6-43e8-bd62-b2e6e67fd984', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.011909343000000128, 'yield', 'approved', 4.928344012, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5844234c-3b7e-44ec-a763-ce05f0b866d9', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.0021778279999997707, 'yield', 'approved', 4.93052184, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a3be3f5d-9d0c-44e5-9753-ff1b55956192', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 0.0020865490000003817, 'yield', 'approved', 4.932608389, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e253301f-3c96-4eef-bee0-9e1bc1920ff8', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 0.015507406999999418, 'yield', 'approved', 4.948115796, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('84bbdebe-0afb-4fba-856c-975a0fbd9a12', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.002818547000000393, 'yield', 'approved', 4.950934343, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3fc91182-b06d-41a0-8302-01f328d7684e', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.011188420999999948, 'yield', 'approved', 4.962122764, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6bb08fa1-242b-4865-9f6e-5c5aaeff2dc6', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 0.0011094739999997216, 'yield', 'approved', 4.963232238, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('29e455a8-fc9a-4851-a369-072f6818c1b4', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0027736159999998122, 'yield', 'approved', 4.966005854, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1f103763-085a-46cf-866b-13e649f6fde4', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.006213379000000074, 'yield', 'approved', 4.972219233, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('66416050-e8de-4ba2-9fc7-a12837190a36', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.0032546250000002885, 'yield', 'approved', 4.975473858, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0a203b82-3260-4664-9114-b75647e0a37e', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0014559199999997219, 'yield', 'approved', 4.976929778, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5bd2a558-00a9-4559-b6c9-e835891bcbe3', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 6.5193, 'deposit', 'approved', 6.5193, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2024-10-01T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('068a15dd-8ab3-4ec6-9396-b0fc5abc0811', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-01', '2024-11-01', 'BTC', 0.03298489899999968, 'yield', 'approved', 6.552284899, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8c522018-b571-4b5f-96f0-8ae400c6b5ec', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.008938997999999643, 'yield', 'approved', 6.561223897, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('93759005-5f23-4f03-8c49-6deed96063d8', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-01', '2024-12-01', 'BTC', 0.02714989200000062, 'yield', 'approved', 6.588373789, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a32cc211-7a49-42d4-84c2-1c760d2b2c93', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.01206661799999953, 'yield', 'approved', 6.600440407, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('351a41d0-9944-4934-bcbc-a894b2f296dc', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-01-01', '2025-01-01', 'BTC', 0.033754056000000254, 'yield', 'approved', 6.634194463, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b3f75d6c-6e42-4230-8014-3104784e5c08', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-02-01', '2025-02-01', 'BTC', 0.0388722330000002, 'yield', 'approved', 6.673066696, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('24ac205a-0dc3-4f23-a4b1-0267b62afdb6', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-03-01', '2025-03-01', 'BTC', 0.025914821999999837, 'yield', 'approved', 6.698981518, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f6e94537-4576-48c3-82ff-38169dfb26d6', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-01', '2025-04-01', 'BTC', 6.698981518, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dfae224d-1bdf-4ca3-ab0b-494c62569bbc', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 6.69, 'deposit', 'approved', 6.69, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a52072fc-9f14-4b82-9840-440047f73d3a', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.0018098389999998687, 'yield', 'approved', 6.691809839, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ae000f64-1316-4544-b4a5-27d5b1801a83', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.00036231799999963954, 'yield', 'approved', 6.692172157, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f8555fd-609f-406b-955a-ec88d55c68f8', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0044677470000005215, 'yield', 'approved', 6.696639904, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('00c7d66a-2887-4466-aff5-f13fc040bb5a', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.018024032999999662, 'yield', 'approved', 6.714663937, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('679a7c4a-db2a-41fb-8dc8-95845e84ad2f', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.003296888999999581, 'yield', 'approved', 6.717960826, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b9c29d4b-1c82-4fbe-aba7-7822c23edb69', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 0.003158862000000262, 'yield', 'approved', 6.721119688, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('857a2f89-1372-4fd6-94c8-d3ff2364cde4', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 0.023478029999999706, 'yield', 'approved', 6.744597718, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7f8ee5c2-7c28-4284-ba44-11f550776514', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.004268732999999969, 'yield', 'approved', 6.748866451, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8c33c0f4-8f60-4670-a4c8-d2d5abfc0cf9', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.01694610799999996, 'yield', 'approved', 6.765812559, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3de0716f-7c07-49a4-8a14-e05a682df5a0', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 0.00168084300000082, 'yield', 'approved', 6.767493402, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('66b267b3-2a8e-4025-8555-c460e8e84e91', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.004202106999999344, 'yield', 'approved', 6.771695509, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c2700abe-7c3d-402f-9dff-00f4ee693d33', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.00941402800000013, 'yield', 'approved', 6.781109537, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7b25ed2a-279c-4c4a-8464-fc895bd043e8', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.00493183900000016, 'yield', 'approved', 6.786041376, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c9f0dae8-e36a-48ff-8ccc-edc9108ab100', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0022063650000001545, 'yield', 'approved', 6.788247741, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('01313322-80cd-4091-a951-bb9d6ddb9659', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 5.2, 'deposit', 'approved', 5.2, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2024-10-01T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('37d204da-235a-4071-91dc-2ae16921605a', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-01', '2024-11-01', 'BTC', 0.023678819999999767, 'yield', 'approved', 5.22367882, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5554079d-a029-4c59-bea5-23e1171d8925', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.26358620600000027, 'withdrawal', 'approved', 4.960092614, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bd7807c0-82ae-4978-8a14-bcf1dfcfcb02', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-01', '2024-12-01', 'BTC', 0.018472069000000424, 'yield', 'approved', 4.978564683, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e74b3f42-35a6-4296-8cfd-15b5e09fbc08', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.11579357500000054, 'withdrawal', 'approved', 4.862771108, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8d376537-6dcc-4e9f-b82a-f38be1f6eb1e', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 4.862771108, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('68c6586b-eeab-452e-801d-5af2875aaad8', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-16', '2025-04-16', 'BTC', 5.0335, 'deposit', 'approved', 5.0335, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('78b86852-a130-4ae7-8d89-66733338259a', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-01', '2025-05-01', 'BTC', 0.017312675000000333, 'yield', 'approved', 5.050812675, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('23f5fee2-e3c4-4ee2-a303-e54013286c2e', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-13', '2025-05-13', 'BTC', 0.005768694999999546, 'yield', 'approved', 5.05658137, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('82e355ab-4f0e-49c2-bde8-cd364c0eb297', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-01', '2025-06-01', 'BTC', 0.10866058600000006, 'withdrawal', 'approved', 4.947920784, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bd8d98f1-57d1-44ad-ba1b-dbda0e8d2361', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-11', '2025-06-11', 'BTC', 0.013289990000000529, 'yield', 'approved', 4.961210774, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6a2479c0-9012-485b-98be-c039624469d7', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-01', '2025-07-01', 'BTC', 0.0037388409999996597, 'yield', 'approved', 4.964949615, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('50a4e652-c377-4d06-b697-d592ddbfd148', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.017123030999999678, 'yield', 'approved', 4.982072646, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('21ac4b10-ba52-4ae6-884c-c8224b796684', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.0012130160000003443, 'yield', 'approved', 4.983285662, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5cf0a64e-c9e1-4df0-9b19-660ed89e8b8a', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.25975716900000023, 'withdrawal', 'approved', 4.723528493, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5de91dff-5be9-4610-8120-2ba6b18d8ed6', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0028381189999997503, 'yield', 'approved', 4.726366612, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e3790e97-d566-4f76-b75c-8ae52bbaf642', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.09855107000000007, 'withdrawal', 'approved', 4.627815542, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0016780d-a991-41ae-8c02-30913cb0e6f4', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.0020450250000001446, 'yield', 'approved', 4.629860567, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('afa0a721-1012-457a-965f-44dcc16cf9c6', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 0.0019593130000004066, 'yield', 'approved', 4.63181988, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bf5ac8f3-4f32-4d24-9caa-2d082aa52bf7', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 0.014561770000000251, 'yield', 'approved', 4.64638165, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5be15fa4-a1cf-430c-958d-a16d4e9676a9', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.002646673999999294, 'yield', 'approved', 4.649028324, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('18d614e7-0f70-4444-9734-115cceb8c7d3', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.010506155000000739, 'yield', 'approved', 4.659534479, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b336504b-4996-4e5c-a68e-3c44075c0a38', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 0.0010418189999992222, 'yield', 'approved', 4.660576298, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cee31af1-2d6b-44d8-8ded-75d6582f891d', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.28039551799999973, 'withdrawal', 'approved', 4.38018078, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('73dbda70-560d-43cf-a62c-c7b9a4f74b05', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.0054804050000001325, 'yield', 'approved', 4.385661185, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c77b4bf5-594e-46c5-b65e-77e78f937162', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.0028706859999996226, 'yield', 'approved', 4.388531871, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('345d7fcc-0892-4ac6-9da3-4204e7287afc', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0012841699999999179, 'yield', 'approved', 4.389816041, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a9efe77f-b615-4d29-b2b8-4f4dc52b6681', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-11', '2025-06-11', 'BTC', 2, 'deposit', 'approved', 2, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2025-06-11T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f2368ae7-453e-4e8e-a004-c68bdc650827', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-01', '2025-07-01', 'BTC', 0.0013397589999999404, 'yield', 'approved', 2.001339759, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3c3858e6-5c60-4f92-89b8-5c25196dae8a', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.9975352760000002, 'deposit', 'approved', 2.998875035, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4168a3bd-6f6f-470c-a362-56ccb1d7db2c', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.0006490269999996912, 'yield', 'approved', 2.999524062, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0e5622cb-32d9-461a-8a76-5ab9adf7118a', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.0001299230000002538, 'yield', 'approved', 2.999653985, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1d24fb0f-752c-4643-9feb-e850c25e0326', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.6016020739999997, 'deposit', 'approved', 3.601256059, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0b254100-d607-4eeb-a9e9-0278fe27c8fb', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.0077542360000002475, 'yield', 'approved', 3.609010295, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8f0e1c48-6e5a-44ed-bd88-69b19f986b1e', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.9116176149999999, 'deposit', 'approved', 4.52062791, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('aff8aa39-e535-443b-8bed-720d99e45761', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 0.001700521000000066, 'yield', 'approved', 4.522328431, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e20a6e98-766a-4b02-8f80-39826b6aa923', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 0.012637817999999967, 'yield', 'approved', 4.534966249, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e4cefcf1-fd5b-4963-a810-f45b5c9aacd7', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.0022961859999997003, 'yield', 'approved', 4.537262435, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('00394f7d-7b22-480d-ba52-a2bb1563585b', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.00911429300000055, 'yield', 'approved', 4.546376728, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('57428f7d-b43e-4810-9847-c9f201031495', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 0.000903571999999464, 'yield', 'approved', 4.5472803, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2b7caeb7-913a-4127-8499-e9f07eeefcf3', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0022588170000004126, 'yield', 'approved', 4.549539117, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b8080722-b43c-4d2f-ba96-c93af452604a', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.005059823999999935, 'yield', 'approved', 4.554598941, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2d158660-9bb8-495f-b6a5-fab37c85cbd9', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.002650014999999506, 'yield', 'approved', 4.557248956, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a054e954-ab69-4c9d-9e34-8e100807621c', '13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0011853690000007688, 'yield', 'approved', 4.558434325, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fc0827a6-9d8f-454c-af65-b4b514a94090', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.1484, 'deposit', 'approved', 0.1484, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ced2fb20-8bcf-4443-8e4a-2e4a72b88e38', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 4.0146500000004526e-05, 'yield', 'approved', 0.1484401465, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f59fd59-89fb-42c9-9b46-a695a95af7e9', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 8.0370999999968e-06, 'yield', 'approved', 0.1484481836, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2a4c32fd-e1dc-4e48-96fd-b7626a1c4b48', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 9.910520000000478e-05, 'yield', 'approved', 0.1485472888, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('675187a7-d33b-47a0-a726-f65c9fe6642a', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.00039981559999999194, 'yield', 'approved', 0.1489471044, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c6a03d81-0b44-41e0-9ebe-44b3b5407d02', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 7.313279999998645e-05, 'yield', 'approved', 0.1490202372, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('affc4f1d-375d-4a3b-be9c-9fefc14b0e25', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 7.007100000000488e-05, 'yield', 'approved', 0.1490903082, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2dea0450-641c-407f-878d-5d28ff50fec9', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 0.0005207980999999973, 'yield', 'approved', 0.1496111063, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('00613b09-b607-4e06-bf69-8d8d498e9695', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 9.469060000000251e-05, 'yield', 'approved', 0.1497057969, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('35aa156c-41af-4d1e-addb-aa8f7f081033', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.00037590470000001264, 'yield', 'approved', 0.1500817016, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('35fa4a46-c606-495a-bdc5-ba5048c71a6f', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 3.728510000000629e-05, 'yield', 'approved', 0.1501189867, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('20ce18f1-0880-48ed-b7e1-e5b450a480f7', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 9.321259999997555e-05, 'yield', 'approved', 0.1502121993, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0bd09997-0e4f-4083-9f68-d0f7d02c0d86', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.00020882540000000116, 'yield', 'approved', 0.1504210247, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7de5d114-1da8-4493-a44d-87725b24e6a0', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.00010939990000000122, 'yield', 'approved', 0.1505304246, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('83ee6849-698b-4a07-801d-36ebdbed1342', '4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 4.894230000002109e-05, 'yield', 'approved', 0.1505793669, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('43fc11e1-9af7-45d1-a2d7-ccbbbf4fdf8f', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.446, 'deposit', 'approved', 0.446, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('678106f0-2dca-49e0-919e-c56c217a7fbf', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.00012065599999999677, 'yield', 'approved', 0.446120656, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b3969f79-c171-4aaf-a173-2ddde4c20db1', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 2.415439999997604e-05, 'yield', 'approved', 0.4461448104, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a1d5833c-3fdb-4065-845c-ba7a691ce356', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.00029784990000003564, 'yield', 'approved', 0.4464426603, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('80e6c24a-b836-49c0-a598-cc647a2e24ed', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.0012016021999999849, 'yield', 'approved', 0.4476442625, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('77a743ce-4d06-4af5-864f-59bf60258628', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.00021979259999999057, 'yield', 'approved', 0.4478640551, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('04e22f25-bd14-434d-be31-a53d53c4cd91', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 0.00021059080000002117, 'yield', 'approved', 0.4480746459, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d01e89d0-d370-4735-b80b-8983f9c09876', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 0.0015652019999999878, 'yield', 'approved', 0.4496398479, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('721106fa-32fe-45da-b0da-e32ce995aacc', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.00028458219999999423, 'yield', 'approved', 0.4499244301, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('00b0657b-8d4a-45fb-91d2-c838d0538cd0', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.0011297405000000316, 'yield', 'approved', 0.4510541706, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('192bd536-d3b6-4538-81b4-c79a06e12128', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 0.00011205619999998806, 'yield', 'approved', 0.4511662268, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ab541b64-8106-47f4-a925-9e0b15fc30ff', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.00028014049999997015, 'yield', 'approved', 0.4514463673, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2ecc64a3-cacf-448a-9dd8-3cd76a5584cb', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.0006276018999999966, 'yield', 'approved', 0.4520739692, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5995b1c5-1f7f-41bd-9990-667bdf9ee2d3', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.00032878920000001255, 'yield', 'approved', 0.4524027584, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('48ff5311-379a-45a8-9acd-7ba911e70752', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0001470909999999881, 'yield', 'approved', 0.4525498494, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('07c6ea27-2445-4b6d-a743-664575d19825', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 4.0996, 'deposit', 'approved', 4.0996, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('54991c83-5df5-4186-ad39-8a3da7ec3b13', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.0011090610000001888, 'yield', 'approved', 4.100709061, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7de622f6-f358-4e16-8270-b1c5c9a66bc0', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.00022202600000031936, 'yield', 'approved', 4.100931087, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fd04ed0b-1cab-46ae-969f-46b89c40bb83', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0027378149999996992, 'yield', 'approved', 4.103668902, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('eebd6f4d-872f-4d6f-b972-581499f34b3e', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.011045041000000033, 'yield', 'approved', 4.114713943, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('02855136-eb1f-416c-bc38-3282d821f628', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.0020203170000003823, 'yield', 'approved', 4.11673426, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6079aa4b-8431-4e3a-acc8-4ae222969d24', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 0.0019357360000000767, 'yield', 'approved', 4.118669996, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b2c7a56a-c3b0-45ec-8c9a-52c85ec54caf', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 0.014387224999999226, 'yield', 'approved', 4.133057221, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0d3637e7-fc2b-4a5d-9365-b750042e9abb', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.0026158590000004978, 'yield', 'approved', 4.13567308, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('818360ab-e7c0-4ef3-9f0f-90eafeda13c6', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.010384494000000188, 'yield', 'approved', 4.146057574, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('170a92f4-ef17-491f-8163-d40f85ac7348', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 0.001030011999999303, 'yield', 'approved', 4.147087586, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1a9b75c2-97be-44f1-ac69-d6724648323d', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0025750310000001164, 'yield', 'approved', 4.149662617, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1a604875-7839-47ee-a222-05b40fb9b3f4', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.0057688719999999805, 'yield', 'approved', 4.155431489, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b5e35bf0-82f3-45f1-9e8d-b414b9594144', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.003022206999999888, 'yield', 'approved', 4.158453696, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5bdabe9e-d55b-410b-b8f6-a5ee7aa94ed4', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0013520500000003821, 'yield', 'approved', 4.159805746, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0396560f-c880-4f9b-bcad-c200d7a73584', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 2.115364, 'deposit', 'approved', 2.115364, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2025-07-24T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a4789071-b83d-45e7-ba66-3f43c4b65fd7', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.00010308000000014417, 'yield', 'approved', 2.11546708, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f63419d-8098-486d-8c7d-f7100f60be32', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0012710719999997622, 'yield', 'approved', 2.116738152, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('377544f4-93da-4071-8d73-20e840ae3be1', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.005127488000000291, 'yield', 'approved', 2.12186564, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('88f26bd6-545f-4793-897f-aa6e9aa6b6ed', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.000937649999999568, 'yield', 'approved', 2.12280329, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('db282df6-2a48-4cda-a2e6-416851fc71c3', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 0.000898349000000298, 'yield', 'approved', 2.123701639, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dc80a1ae-9545-4f14-b4a9-d5dfb8014194', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 0.0066766110000000545, 'yield', 'approved', 2.13037825, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9a84dfce-4903-4f6c-a6a1-2acea37cd5fb', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.0012135060000000308, 'yield', 'approved', 2.131591756, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a6f1e881-b478-4b1e-a6ab-fcf29e71b1db', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.00481710099999999, 'yield', 'approved', 2.136408857, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0dbe89c4-6cae-4f6a-a54c-62804238b16a', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 0.00047767600000003796, 'yield', 'approved', 2.136886533, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('64674774-f5a1-450f-91c7-37403e03ad94', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0011941619999999986, 'yield', 'approved', 2.138080695, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4df10de6-828c-46d8-876a-7d5fdad2b17d', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.0026751289999999983, 'yield', 'approved', 2.140755824, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('930fb3a6-8dc7-41b4-bee2-351f51c12d51', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.0014012569999999336, 'yield', 'approved', 2.142157081, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('328e80ea-0c23-4c6b-a762-7c9ad79ebf8e', 'bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0006268369999999912, 'yield', 'approved', 2.142783918, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2d371c8f-3bd7-429c-9aa8-07a4c044bacb', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.4395, 'deposit', 'approved', 0.4395, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2025-10-03T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7ea7c93e-b713-471c-a1f4-9a036a4130d6', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.00093803050000002, 'yield', 'approved', 0.4404380305, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('68698efc-b930-4bdd-a83c-4873b6144489', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 9.300589999999831e-05, 'yield', 'approved', 0.4405310364, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('32874300-fdbb-431b-ac76-a6573d470f4d', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.4405310364, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e4746e70-6953-40aa-9acf-5116a5bbe058', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 1.655347869e-05, 'deposit', 'approved', 1.655347869e-05, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2d7ed581-ef9b-42f3-b243-66525abb1239', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 1.6445719499999987e-06, 'yield', 'approved', 1.819805064e-05, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c0901424-a3e0-442b-87e9-10276564bc7a', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 4.112091890000001e-06, 'deposit', 'approved', 2.231014253e-05, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3183142f-bcf6-4619-95b7-1144c2c223cf', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 2.481248999999783e-08, 'yield', 'approved', 2.233495502e-05, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d7f63b33-b48c-4603-8532-89f526f9dcc6', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 1.2995210000000753e-08, 'yield', 'approved', 2.234795023e-05, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9eaba7a9-e66c-4954-9820-e152f303c666', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 3.3, 'deposit', 'approved', 3.3, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2025-11-17T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ebb509aa-bc69-407c-87de-2673b9563070', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 1.0, 'deposit', 'approved', 4.3, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2025-11-25T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c5bed1c9-4e1d-42a1-baf4-cfddc339fa2e', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.00114641800000026, 'yield', 'approved', 4.301146418, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0159c5f3-58f5-4a65-9180-8c11aa3c6403', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 1.2000000000000002, 'deposit', 'approved', 5.501146418, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2025-11-30T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('db7f35f7-338b-43a6-a012-60598c5a7e80', '174d213f-9455-5d16-aa36-2e3557272ae5', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 2.097106318e-05, 'deposit', 'approved', 2.097106318e-05, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b91625be-8532-48db-bb08-d58099e1a359', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 1, 'deposit', 'approved', 1, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2025-11-27T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cc973a24-2483-4aec-99a4-f42c46215e3c', '28f90d52-d2a4-55e7-9d8c-cf29ab698750', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 3.411, 'deposit', 'approved', 3.411, 'Reconciled from BTC Yield Fund (Matched Investment Date: 2025-11-27T00:00:00)', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bbd440d9-0d88-4d03-b81d-162525716ded', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-08-01', '2024-08-01', 'BTC', 0.998739255, 'deposit', 'approved', 0.998739255, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7b694b5b-ba5e-4fcc-9b12-745df1dbf0b0', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-08-22', '2024-08-22', 'BTC', 0.3635410888, 'withdrawal', 'approved', 0.6351981662, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3768e2c0-7a65-41f6-9e31-0c246e3be4b4', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-09-01', '2024-09-01', 'BTC', 0.00023056200000004523, 'withdrawal', 'approved', 0.6349676042, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b14e4087-8887-47c4-ba56-2391bff8a0d5', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 0.4743632557, 'withdrawal', 'approved', 0.1606043485, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b1ed4b5c-861c-4a08-b1c1-45a408ba354b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-01', '2024-11-01', 'BTC', 0.00016169990000000634, 'withdrawal', 'approved', 0.1604426486, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8348d90f-e8b2-4484-a302-6bfdf79e4c6b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.0019474418000000049, 'yield', 'approved', 0.1623900904, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('338e531f-20ad-4f77-95c8-7a5445f5d937', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-01', '2024-12-01', 'BTC', 0.00013383799999999724, 'withdrawal', 'approved', 0.1622562524, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cb13a1fb-d426-483e-8726-8a5e2be13e51', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.0008651281000000011, 'yield', 'approved', 0.1631213805, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8b76725e-4979-440b-9129-8b2cdf665346', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.1852214259, 'deposit', 'approved', 0.3483428064, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ea8a5b85-0c5a-4cab-8411-433cc06db0b5', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-01-01', '2025-01-01', 'BTC', 0.00035446599999999773, 'withdrawal', 'approved', 0.3479883404, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0573877e-7021-4da0-ac4e-799881211a34', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-02-01', '2025-02-01', 'BTC', 0.00040542329999998516, 'withdrawal', 'approved', 0.3475829171, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a0b99513-fb50-4ebb-8e5d-641394ac484e', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-03-01', '2025-03-01', 'BTC', 0.0002689229000000237, 'withdrawal', 'approved', 0.3473139942, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('15f576f2-cd26-459e-8542-e22f48eda848', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-01', '2025-04-01', 'BTC', 0.6382572018, 'deposit', 'approved', 0.985571196, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('333bdb8f-1a64-4a58-98ac-b6879aa3e693', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-16', '2025-04-16', 'BTC', 0.7548726002, 'withdrawal', 'approved', 0.2306985958, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('730fad63-55fb-47e3-bda9-c5e1a74bac0f', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-01', '2025-05-01', 'BTC', 0.0001756588999999864, 'withdrawal', 'approved', 0.2305229369, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d23a3966-6d31-47c3-8f2a-f2190eb1f765', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-13', '2025-05-13', 'BTC', 0.03551636859999999, 'yield', 'approved', 0.2660393055, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8bfaeb9c-976f-4f22-b5c4-1657794fdbaa', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-01', '2025-06-01', 'BTC', 0.0022915796999999904, 'yield', 'approved', 0.2683308852, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('003938c8-37df-4e3a-a743-dd1cf524dc19', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-11', '2025-06-11', 'BTC', 0.03444267099999998, 'withdrawal', 'approved', 0.2338882142, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6f3262b6-6532-4d3e-9cc8-a12240531f5a', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-01', '2025-07-01', 'BTC', 3.913650000000879e-05, 'withdrawal', 'approved', 0.2338490777, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('98f59707-e41d-4216-b10c-163abe7da20b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.10311377759999998, 'withdrawal', 'approved', 0.1307353001, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9c1023e3-8c2c-4f42-a34c-b3f6d4b1a2ba', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.009159094500000006, 'withdrawal', 'approved', 0.1215762056, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4508e289-5e92-403f-bc2b-fc1372b3e50e', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.0010538216000000045, 'yield', 'approved', 0.1226300272, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('27468992-1c8d-4c23-a779-f2985ae6861c', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0024223084000000034, 'withdrawal', 'approved', 0.1202077188, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ee019f61-6fc8-485a-a097-3ac1cf77c623', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.00036806039999999485, 'yield', 'approved', 0.1205757792, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b041a647-8d0e-4c95-84a2-e801bd7bc49a', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.0034983073999999975, 'withdrawal', 'approved', 0.1170774718, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('692bcdac-7b04-4fe1-b283-52a6017a316c', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 1.1005100000002765e-05, 'withdrawal', 'approved', 0.1170664667, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('845548a3-7ce2-48e8-bb52-87489fbb7cea', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 8.150190000000279e-05, 'withdrawal', 'approved', 0.1169849648, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8ea301ec-8e85-4432-9f37-65f7d13f1e25', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.0016183311999999894, 'withdrawal', 'approved', 0.1153666336, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bf2ddcf6-30c5-4bdc-a989-35c4b512cdf8', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.0016455476999999996, 'yield', 'approved', 0.1170121813, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a5de8a11-78b8-4863-b6a6-46e7604cc173', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 5.812500000007548e-06, 'withdrawal', 'approved', 0.1170063688, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('993a9735-e009-40e8-ae76-5353f369b887', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0026730268000000057, 'yield', 'approved', 0.1196793956, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('483212b3-bb8c-40f1-9a73-503b71e4fba5', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.013341063, 'yield', 'approved', 0.1330204586, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('52fc56da-e196-4073-b624-61e43494b721', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.012431769699999998, 'withdrawal', 'approved', 0.1205886889, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d02690cf-b87b-4f93-9231-a508d8b1c693', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.009789983200000005, 'yield', 'approved', 0.1303786721, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b3535ef0-a287-48ca-8442-ccb58d4348d0', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.013922132500000003, 'withdrawal', 'approved', 0.1164565396, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d0732f4e-f6a4-42e4-b1db-64cb95737d46', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.00328578630000001, 'withdrawal', 'approved', 0.1131707533, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('75ee512a-121b-4c46-b33a-fbf970ca52e6', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-08-22', '2024-08-22', 'BTC', 0.3636363636, 'deposit', 'approved', 0.3636363636, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a70c8f7b-8c52-4636-9225-d595e053e27f', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-09-01', '2024-09-01', 'BTC', 9.899350000003304e-05, 'withdrawal', 'approved', 0.3635373701, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6548da62-0d26-4575-9029-7c7936542962', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 0.27156179903, 'withdrawal', 'approved', 0.09197557107, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('83bf76f8-49d4-4bd4-8531-5085bc645f0b', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-01', '2024-11-01', 'BTC', 6.945223000000278e-05, 'withdrawal', 'approved', 0.09190611884, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('87f0be7b-2f6b-4d5f-a386-93beb96b1c7b', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.0011218884900000003, 'yield', 'approved', 0.09302800733, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4db4a301-715a-47da-a416-85dea992b9c4', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-01', '2024-12-01', 'BTC', 5.750357999999289e-05, 'withdrawal', 'approved', 0.09297050375, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7b9b7ac3-cdcd-4c8b-b37d-52ad37002831', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.0005042525999999908, 'yield', 'approved', 0.09347475635, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('88eb26ee-784e-469e-9c70-a720666906e5', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.09347475635, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7f5ce629-4db9-4e5d-bfca-167405a5673d', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-16', '2025-04-16', 'BTC', 0.1338219491, 'deposit', 'approved', 0.1338219491, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('db37cbf4-80b5-4501-a332-130790f90af3', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-01', '2025-05-01', 'BTC', 7.642120000000974e-05, 'withdrawal', 'approved', 0.1337455279, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('465237d0-69fd-4fbf-bdd8-502ddb3eca1f', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-13', '2025-05-13', 'BTC', 0.1337455279, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ff354bf-d5a0-4981-a080-7469dc7b11bb', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 0.2111584923, 'deposit', 'approved', 0.2111584923, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0faf1178-ecf2-4020-8c8b-0b3de07d1e70', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-01', '2024-11-01', 'BTC', 0.00010629949999999, 'withdrawal', 'approved', 0.2110521928, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d0730d6a-ac03-48af-9e5b-049e6af2efe2', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.002590847699999982, 'yield', 'approved', 0.2136430405, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('47549dbb-67dd-4ad1-99bc-9d57432d7708', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-01', '2024-12-01', 'BTC', 8.80397999999949e-05, 'withdrawal', 'approved', 0.2135550007, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8404999d-014d-4ac1-b585-e3e5e0527df0', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.0011779095999999989, 'yield', 'approved', 0.2147329103, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('469e33e4-e7af-4288-871d-4847e635f9f6', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.2147329103, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ec895abf-0e78-47aa-8b45-49f444b0b854', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-16', '2025-04-16', 'BTC', 0.3080070438, 'deposit', 'approved', 0.3080070438, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a9dcff10-3a22-40e3-8001-92268d15336e', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-01', '2025-05-01', 'BTC', 0.00011726149999996549, 'withdrawal', 'approved', 0.3078897823, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('73962ff0-09cd-40db-bf59-e0cd1e3c5855', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-13', '2025-05-13', 'BTC', 0.04748122399999999, 'yield', 'approved', 0.3553710063, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2fded9fa-9e5a-417a-975d-b93afe3b7239', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-01', '2025-06-01', 'BTC', 0.0032284968999999886, 'yield', 'approved', 0.3585995032, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0a860567-7e39-411a-b63a-e9ace53cae7f', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-11', '2025-06-11', 'BTC', 0.045936394400000025, 'withdrawal', 'approved', 0.3126631088, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4b10889b-7222-4e42-91f6-4e43b4a4e3a6', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-01', '2025-07-01', 'BTC', 2.6158999999970067e-05, 'withdrawal', 'approved', 0.3126369498, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7b720287-2add-46be-bd57-77166720746d', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.13778785340000002, 'withdrawal', 'approved', 0.1748490964, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a0997a8a-1062-42fa-82be-41b67012c0cf', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.012245234799999977, 'withdrawal', 'approved', 0.1626038616, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bbb36a51-08da-424a-9a29-593cfd09291c', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.0014103369999999837, 'yield', 'approved', 0.1640141986, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2400ea1c-5f91-4fb3-9cbb-6079844ca184', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0032290415000000017, 'withdrawal', 'approved', 0.1607851571, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ed9ee01c-e7c0-4448-b715-c24781c93f44', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.0005356179000000072, 'yield', 'approved', 0.161320775, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9fd74219-802c-4b88-8b25-c3069ffc664a', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.00467276820000001, 'withdrawal', 'approved', 0.1566480068, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ce3a0d95-a1df-466e-a7f5-5a380488f396', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 7.36229999998006e-06, 'withdrawal', 'approved', 0.1566406445, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('915dc41e-99a8-4b86-a950-47ced49bd0aa', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 5.452680000000987e-05, 'withdrawal', 'approved', 0.1565861177, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8f3d2d55-fd23-4916-850b-159c5e06b257', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.002156392000000007, 'withdrawal', 'approved', 0.1544297257, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3a67dadd-b9ce-4387-9e31-acf2054ebb0d', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.00033593599999998114, 'withdrawal', 'approved', 0.1540937897, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('17593b4b-ddcb-4da6-ad28-cb98668c88bb', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 3.827200000000586e-06, 'withdrawal', 'approved', 0.1540899625, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('932eab49-8d76-451d-8ea7-322aacb68bb6', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.003529988099999992, 'yield', 'approved', 0.1576199506, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2d12284c-7dcc-457d-8d0e-270597d360d6', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.0024161041000000105, 'withdrawal', 'approved', 0.1552038465, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('93c1b540-3faf-471b-af76-fc4e7f73e778', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.01449474839999998, 'withdrawal', 'approved', 0.1407090981, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b6633c0c-caef-4e7f-9682-015014b5bc7e', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.005901638600000009, 'withdrawal', 'approved', 0.1348074595, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bbd96378-0ea2-40e7-a6e8-c76ddfbe3943', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.014391134600000008, 'withdrawal', 'approved', 0.1204163249, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('65f10850-d9a2-4528-9760-92cf1abdbdf2', 'be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.003397510399999998, 'withdrawal', 'approved', 0.1170188145, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('16deb5d1-39b4-44ba-a23f-91310e18d56a', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 0.2979665711, 'deposit', 'approved', 0.2979665711, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ec1b3b3e-0df1-4112-bc03-ca8fe68cfd82', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.0036988953999999574, 'yield', 'approved', 0.3016654665, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0d5cc61b-154f-4de4-8b4a-5077d45ad0b1', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.0017193656000000224, 'yield', 'approved', 0.3033848321, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4798ef4d-c3f5-4a31-b011-cabd4b76d913', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.3444880804, 'deposit', 'approved', 0.6478729125, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a4de5970-1d1b-4d46-bc56-1b04f538db6b', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-01', '2025-04-01', 'BTC', 0.6478729125, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('616d8233-6b6f-4685-a12a-8458b1bc0549', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.2381370632, 'deposit', 'approved', 0.2381370632, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f675be74-afc2-4009-b671-35b065ed8397', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.01667150140000001, 'withdrawal', 'approved', 0.2214655618, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8f13eb91-41ef-4d0c-956c-1db3f6ffaf43', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.0019220805000000063, 'yield', 'approved', 0.2233876423, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b557a4df-c5e4-4e16-bc6c-10906416fa5e', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.004383349199999997, 'withdrawal', 'approved', 0.2190042931, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0e1d1cfd-a5ea-4829-8942-b52e4ddbcd1c', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.0007885596999999966, 'yield', 'approved', 0.2197928528, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1d2e72a3-cc34-4c6e-a568-640d6aedb457', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.006355977999999984, 'withdrawal', 'approved', 0.2134368748, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('55a27bef-90cd-4be2-819b-14aa8ccc5279', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.0029259848000000033, 'withdrawal', 'approved', 0.21051089, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bf6cec27-44ae-4c8c-84b2-69e3c855fafe', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.00040530680000000485, 'withdrawal', 'approved', 0.2101055832, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('91699687-0806-4fbf-80e3-4fbb660967e0', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.004826566100000013, 'yield', 'approved', 0.2149321493, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5cb59daa-bea1-4764-8698-3b413c584fdb', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.003265238700000006, 'withdrawal', 'approved', 0.2116669106, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('33f0dcbe-07ca-4eef-be18-99605fafbae9', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.019753981500000017, 'withdrawal', 'approved', 0.1919129291, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d6e2aa61-35da-4b63-a571-ffa718b389cb', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.008049236099999996, 'withdrawal', 'approved', 0.183863693, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('62b0c885-d201-480b-a69d-ad6b6c5ac6c5', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.01962270869999999, 'withdrawal', 'approved', 0.1642409843, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('86a22d9b-506f-479c-ada6-8b35edf6590e', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.004634009999999994, 'withdrawal', 'approved', 0.1596069743, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8f516df9-e7e1-4dee-990b-6447c3b41c5b', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-10-01', '2024-10-01', 'BTC', 0.2376675671, 'deposit', 'approved', 0.2376675671, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b615e02b-d1b1-4811-a975-241ba1f12f03', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-01', '2024-11-01', 'BTC', 0.00011964440000000742, 'withdrawal', 'approved', 0.2375479227, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b37eb463-a91b-4304-bdd3-61821baa5254', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-11-09', '2024-11-09', 'BTC', 0.009497687599999999, 'withdrawal', 'approved', 0.2280502351, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5eae4738-20d6-432d-8624-ea1f59c777cb', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-01', '2024-12-01', 'BTC', 9.397669999999803e-05, 'withdrawal', 'approved', 0.2279562584, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('68e4365d-68af-4c02-bdd6-b350ddd158e6', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.004442234299999986, 'withdrawal', 'approved', 0.2235140241, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2e82e018-6f81-4a63-abb2-fc9061d78e7e', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2024-12-14', '2024-12-14', 'BTC', 0.2235140241, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a6d3f045-2899-4c80-97dc-3540625df08e', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-04-16', '2025-04-16', 'BTC', 0.3206057975, 'deposit', 'approved', 0.3206057975, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c4fb7b1e-7252-48f5-abed-3a307b4ab8fa', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-01', '2025-05-01', 'BTC', 0.00012205800000003597, 'withdrawal', 'approved', 0.3204837395, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('588ad555-e792-4aa5-9c25-6547677769cb', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-05-13', '2025-05-13', 'BTC', 0.04942340120000005, 'yield', 'approved', 0.3699071407, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1cb6f34e-9920-47e9-8e67-4ba8ea808be7', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-01', '2025-06-01', 'BTC', 0.006195481700000005, 'withdrawal', 'approved', 0.363711659, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('384d503b-aba8-441d-9189-16f8724dc9a8', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-11', '2025-06-11', 'BTC', 0.04659125870000003, 'withdrawal', 'approved', 0.3171204003, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('32314d88-85b4-4179-972d-072340d67b0b', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-01', '2025-07-01', 'BTC', 2.653180000000699e-05, 'withdrawal', 'approved', 0.3170938685, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c5155561-b8e3-4f28-8d93-c988d8fe2bc1', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.1397521423, 'withdrawal', 'approved', 0.1773417262, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8d1519ea-4513-4f8a-aa22-68211e598cf3', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.012419801499999994, 'withdrawal', 'approved', 0.1649219247, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0fbb58ce-a331-4ff1-9251-92ef5650e7c7', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.007248471499999992, 'withdrawal', 'approved', 0.1576734532, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2c67fc29-7829-4e2c-842b-a7c80816be88', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0031042075000000113, 'withdrawal', 'approved', 0.1545692457, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4d9c05e8-655e-4e5b-82a2-dafa9a1131d0', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.0030857477999999827, 'withdrawal', 'approved', 0.1514834979, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c79dd61b-2cdb-4467-8d0c-0858e056d255', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.004387824700000015, 'withdrawal', 'approved', 0.1470956732, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ebdbc34c-845d-4a1e-9cc1-aad048b7de54', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 6.913299999994349e-06, 'withdrawal', 'approved', 0.1470887599, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('243cd71f-17fa-4360-a258-8820a6086c9e', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 5.12018000000114e-05, 'withdrawal', 'approved', 0.1470375581, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('75eb9691-3b85-4b1f-8df2-15e387485515', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.0020248959999999983, 'withdrawal', 'approved', 0.1450126621, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('958e181a-3728-4a29-936e-e139c4e1a72c', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.0003154508000000056, 'withdrawal', 'approved', 0.1446972113, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fd1bdf18-8979-46d7-9380-ad3f9e14af70', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 3.593899999987382e-06, 'withdrawal', 'approved', 0.1446936174, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c62e1c8e-5ee8-49bf-85d8-4b5228b8336d', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.005667627799999991, 'withdrawal', 'approved', 0.1390259896, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7abeb173-dbfe-4acf-b1ac-41fab4b684cc', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.002131083400000011, 'withdrawal', 'approved', 0.1368949062, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('52ea9fd3-9eb1-49f2-9dc7-7677d986b4dc', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.012784845700000005, 'withdrawal', 'approved', 0.1241100605, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6987c39e-df6d-4563-a98d-f13b94027eba', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.005205439699999995, 'withdrawal', 'approved', 0.1189046208, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ad9c337d-5c72-4422-88e0-1819e877c9b5', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.012693454800000004, 'withdrawal', 'approved', 0.106211166, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ef6873a7-fdc7-4489-8874-0d21592e51b1', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.002996716099999991, 'withdrawal', 'approved', 0.1032144499, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6ee8b652-86f7-4e5a-b9bd-9060697ab01b', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-06-11', '2025-06-11', 'BTC', 0.1278399225, 'deposit', 'approved', 0.1278399225, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5f986d9b-56d1-4db5-9a94-d9d6269b8dae', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-01', '2025-07-01', 'BTC', 2.1391499999995345e-05, 'withdrawal', 'approved', 0.127818531, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5a1f3411-e3a4-41b9-a143-47b788740aa1', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.021070654500000008, 'withdrawal', 'approved', 0.1067478765, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4b6ac742-16fe-4f64-91f0-ca73aa799b9b', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.007478576080000007, 'withdrawal', 'approved', 0.09926930042, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a68730f7-5c4c-4372-84c8-b02f5c948f2e', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.0008604654800000028, 'yield', 'approved', 0.1001297659, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d446e8af-b6db-4b8f-baeb-46c0a284b090', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.017644304200000002, 'yield', 'approved', 0.1177740701, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('22471921-c6b7-40d0-9a56-0b05b91096f0', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.00036060890000000345, 'yield', 'approved', 0.118134679, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('87a530ec-013f-471e-ad60-d893fcb34075', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.025490554699999987, 'deposit', 'approved', 0.1436252337, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('90fee501-bd0f-461a-a500-bc7a4efeb72a', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 1.3500499999985482e-05, 'withdrawal', 'approved', 0.1436117332, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('93be369b-207b-4bb4-87e8-006278eb33c9', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 9.998290000001742e-05, 'withdrawal', 'approved', 0.1435117503, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('741ced59-d4e2-46e4-a82d-c3a9697a1930', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.0019852938999999903, 'withdrawal', 'approved', 0.1415264564, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9df669e6-4d42-4233-97c4-b52099e4d3e2', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.0003432466000000134, 'withdrawal', 'approved', 0.1411832098, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1ade395d-8745-4c4c-90bc-fb6ed0843b72', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 7.0130999999806765e-06, 'withdrawal', 'approved', 0.1411761967, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('90606881-c2ee-4661-8ec9-95e0390b88d0', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0032251898, 'yield', 'approved', 0.1444013865, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('115fe14f-e660-4e76-a1ec-ed7b3d578d8a', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.0022332234000000117, 'withdrawal', 'approved', 0.1421681631, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('335ea916-06c5-4441-bcc7-a9cef62544b3', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.013286691900000008, 'withdrawal', 'approved', 0.1288814712, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d0b4f73b-115b-48e5-b4a5-5189a71dbb42', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.005405562799999986, 'withdrawal', 'approved', 0.1234759084, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4776a98a-7604-4e99-853d-c2b05f617414', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.013185039699999998, 'withdrawal', 'approved', 0.1102908687, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c22e4b18-a0d2-4cad-9582-0afc911d27fc', '2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.003111823700000002, 'withdrawal', 'approved', 0.107179045, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('50072fee-1995-477a-aec7-1c41036c5530', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.005282442478, 'deposit', 'approved', 0.005282442478, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d0199b95-8769-4745-ac05-728539282e45', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.0003698132750000003, 'withdrawal', 'approved', 0.004912629203, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('63cbfdba-00fa-47cc-9a62-b41bb06e152d', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 4.2636286000000134e-05, 'yield', 'approved', 0.004955265489, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('77ff5c1c-913a-4e5f-bd19-b9a73bb22d40', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 9.72330389999998e-05, 'withdrawal', 'approved', 0.00485803245, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9c009419-894b-45fe-933b-9e04adea6570', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 1.7492118000000424e-05, 'yield', 'approved', 0.004875524568, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('47b059fe-154d-4dd5-98a8-789a298a391c', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.00014099060300000032, 'withdrawal', 'approved', 0.004734533965, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('120303d1-e336-49ba-af63-e7991a20b187', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 6.490525299999994e-05, 'withdrawal', 'approved', 0.004669628712, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b1ee1fba-de6e-422e-ac2e-42ee6e244fe9', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 8.990662000000343e-06, 'withdrawal', 'approved', 0.00466063805, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b7d2e005-2264-4976-af45-e5d6ce6ad106', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0001070646350000001, 'yield', 'approved', 0.004767702685, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fe34cc7b-d4db-4830-9ba2-13acb4711bbc', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 7.243070699999941e-05, 'withdrawal', 'approved', 0.004695271978, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8c36f983-4db3-4ffe-8448-e2a7517ce121', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.0004381899620000008, 'withdrawal', 'approved', 0.004257082016, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3dec46f5-2ab5-4c12-a4e7-c3e76a7e108f', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.00017855106700000005, 'withdrawal', 'approved', 0.004078530949, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8d16898f-234d-42b3-805a-5c86f42a883d', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0004352780229999998, 'withdrawal', 'approved', 0.003643252926, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8af6ab0e-cb2c-4aac-a297-2293288ea73c', 'b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.00010279328599999962, 'withdrawal', 'approved', 0.00354045964, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fecce086-8c6c-4b42-b9fb-ad5e0ac45869', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.01587580421, 'deposit', 'approved', 0.01587580421, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b25eed92-c80f-4928-b224-d1f0dc04b08a', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.001111433430000001, 'withdrawal', 'approved', 0.01476437078, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('efe0c04b-0f84-473c-9e3f-4b69f12227a8', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.00012813871000000136, 'yield', 'approved', 0.01489250949, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('87880b3e-de4a-4ebc-ad31-8dcc6f159ce0', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.00029222328000000006, 'withdrawal', 'approved', 0.01460028621, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('52872b6d-c0b8-4f1c-9076-a7571166317f', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 5.2570639999999225e-05, 'yield', 'approved', 0.01465285685, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('308295a4-0082-4b2f-a0c0-2a7ef912ce6a', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.00042373186000000014, 'withdrawal', 'approved', 0.01422912499, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('83ed0dd7-41e2-4e04-8eea-002ffb4c1800', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.00019506564999999948, 'withdrawal', 'approved', 0.01403405934, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9ea226c8-9a05-4481-9d5a-c09ac14bf276', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 2.702046000000076e-05, 'withdrawal', 'approved', 0.01400703888, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('710cedec-3884-4201-80fd-26f4a8c3b1e6', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0003217710700000008, 'yield', 'approved', 0.01432880995, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('24ebf22c-c4d6-4fd9-9c43-e370c5b1f0c1', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.0002176825799999997, 'withdrawal', 'approved', 0.01411112737, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a224828e-6b3e-4f84-8be0-7200ea746e78', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.0013169320900000003, 'withdrawal', 'approved', 0.01279419528, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dcfbe037-9bb5-49a9-bd79-41734d0ef0cc', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.0005366157399999995, 'withdrawal', 'approved', 0.01225757954, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7b79c38e-80fa-4dde-b8d1-5e8a3cfd3dc1', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.0013081805800000002, 'withdrawal', 'approved', 0.01094939896, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('adbdcf3f-d107-4cd3-b416-61e88f78c19d', '35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.0003089340000000003, 'withdrawal', 'approved', 0.01064046496, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('209969c5-8da5-44e0-b524-4d49336a6a43', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-11', '2025-07-11', 'BTC', 0.1459292533, 'deposit', 'approved', 0.1459292533, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('45f76138-9a93-4d39-8bfd-5ad6281f9b7f', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.010216216400000006, 'withdrawal', 'approved', 0.1357130369, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ec6bc24f-7770-49d0-88a1-de7dee45d126', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.0011778417999999957, 'yield', 'approved', 0.1368908787, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('800f8ec5-e5bf-401e-a995-786320b86ed8', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0026860954999999853, 'withdrawal', 'approved', 0.1342047832, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('14d65312-121a-4f6f-b250-11e1a1b08565', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.00048322569999997844, 'yield', 'approved', 0.1346880089, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b4d792eb-ebeb-41c8-9ae8-594f4d10ef2f', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.0038949128999999916, 'withdrawal', 'approved', 0.130793096, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dd284063-192a-43d5-b948-14512babd52a', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.0017930294999999874, 'withdrawal', 'approved', 0.1290000665, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c300b4ba-86e4-4c74-9824-c69d959810fb', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.00024837010000000603, 'withdrawal', 'approved', 0.1287516964, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ddbfe07-3838-4473-9df2-b871d4a3c90e', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.002957696600000004, 'yield', 'approved', 0.131709393, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f25c114b-0a19-4c43-9b73-7b8d1f74f69c', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.00200092260000001, 'withdrawal', 'approved', 0.1297084704, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('41f6a78e-0a50-470e-a123-ec52a5ad97f8', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.012105145400000003, 'withdrawal', 'approved', 0.117603325, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1533ac69-dde7-4d90-8634-c0397c6af20c', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.004932533399999994, 'withdrawal', 'approved', 0.1126707916, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2194c76c-4ddf-424e-9c16-d70a1f4aa7e5', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.012024701999999998, 'withdrawal', 'approved', 0.1006460896, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('69642135-070d-4cd4-a9a9-c2f78bf6d0fe', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.0028396991700000013, 'withdrawal', 'approved', 0.09780639043, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1ddcf2dd-49b7-44aa-8c55-40c2873376d7', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-24', '2025-07-24', 'BTC', 0.07000800798, 'deposit', 'approved', 0.07000800798, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a4a2cb71-d9c4-4d64-a117-8d9b65825ee7', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-25', '2025-07-25', 'BTC', 0.0006072111600000096, 'yield', 'approved', 0.07061521914, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7d3d029c-53dd-4cb4-b0f8-90c069851cec', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-07-31', '2025-07-31', 'BTC', 0.0013902422500000067, 'withdrawal', 'approved', 0.06922497689, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ff358421-a316-4def-ad24-8bb7fdd8baa2', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-20', '2025-08-20', 'BTC', 0.00023060669999999672, 'yield', 'approved', 0.06945558359, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d7e78fec-de85-4c3a-8abd-d21f7b6e8c2b', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-08-25', '2025-08-25', 'BTC', 0.0020118291899999946, 'withdrawal', 'approved', 0.0674437544, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b3bca166-5774-47ec-a655-9ab92082e254', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-01', '2025-09-01', 'BTC', 3.169789999993289e-06, 'withdrawal', 'approved', 0.06744058461, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f5bd33b0-22ad-4314-a06e-8749abdaeb14', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-09-30', '2025-09-30', 'BTC', 2.3476150000006912e-05, 'withdrawal', 'approved', 0.06741710846, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b7b4be90-d2ea-4c91-bccc-13aadeb45a50', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.0009284201599999986, 'withdrawal', 'approved', 0.0664886883, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fd84ca83-78ac-4625-a764-740f899e7944', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 0.00014463503000000655, 'withdrawal', 'approved', 0.06634405327, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1996d4cf-e7ef-463b-a1db-a7a25e87350a', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 1.6477799999886633e-06, 'withdrawal', 'approved', 0.06634240549, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a986fca1-5603-42c7-8e2a-1220f6e05034', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.0015198128599999972, 'yield', 'approved', 0.06786221835, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7a257564-4426-4aa5-bb33-7f76e6c786aa', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 0.00104023751, 'withdrawal', 'approved', 0.06682198084, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5a503e65-a599-4894-b248-dc1d36615f2a', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.006240617230000002, 'withdrawal', 'approved', 0.06058136361, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5360ac9d-685e-4c4d-bbd9-2fd57e75ffca', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.0025409111400000045, 'withdrawal', 'approved', 0.05804045247, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('26925fbb-e9bd-472d-b7ca-3f999c2fc4e9', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.006196006989999996, 'withdrawal', 'approved', 0.05184444548, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2870f32e-4404-4667-8e6c-201c427d6263', 'a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.001462775450000002, 'withdrawal', 'approved', 0.05038167003, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4aa5701d-1816-48b2-8eaa-fb4b4f2df3be', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-03', '2025-10-03', 'BTC', 0.01370890013, 'deposit', 'approved', 0.01370890013, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a250a56a-0a31-4088-aceb-c9e02f7a9809', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 3.153493000000035e-05, 'withdrawal', 'approved', 0.0136773652, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d7a1e05e-e396-445b-ae85-06099990be5a', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 5.095499999996367e-07, 'withdrawal', 'approved', 0.01367685565, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b435ec89-5a16-46c1-86c5-c6ac4a83cc12', '179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 0.01367685565, 'withdrawal', 'approved', 0, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('08aee146-01cd-4193-9e1e-53f190961c0f', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-23', '2025-10-23', 'BTC', 5.140518251e-07, 'deposit', 'approved', 5.140518251e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c44d6b23-bd76-42df-9867-ef01f38ed182', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-10-31', '2025-10-31', 'BTC', 5.0930187599999954e-08, 'yield', 'approved', 5.649820127e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0667929f-cc5d-433c-ad34-9b86c1bdfc96', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-05', '2025-11-05', 'BTC', 1.4313708080000006e-07, 'deposit', 'approved', 7.081190935e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5934099e-fcdb-4cf8-ae8a-fccfcb318c7f', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-10', '2025-11-10', 'BTC', 1.0951336299999963e-08, 'withdrawal', 'approved', 6.971677572e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f4010d25-cc23-4e6a-b1b7-d33457d6a806', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 6.515560890000007e-08, 'withdrawal', 'approved', 6.320121483e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6c225be1-1b5e-4b54-b266-aeb4e2d1b1da', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 2.6507932699999945e-08, 'withdrawal', 'approved', 6.055042156e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dd9a6cb1-0383-4583-88f8-01e623b96887', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 6.465712369999998e-08, 'withdrawal', 'approved', 5.408470919e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('691764fe-f116-4353-a3fe-094d093b53ad', 'ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 1.525983810000006e-08, 'withdrawal', 'approved', 5.255872538e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('146a5d52-caf0-46e0-b44f-79a62fc9a0bc', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-17', '2025-11-17', 'BTC', 0.09332578908, 'deposit', 'approved', 0.09332578908, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('482bba9c-618e-4d65-8d37-d5a0013a76ec', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-25', '2025-11-25', 'BTC', 0.023180114220000006, 'deposit', 'approved', 0.1165059033, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e42ebd0a-72b0-4e71-8482-0fd3f10bc836', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.01244009010000001, 'withdrawal', 'approved', 0.1040658132, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7bc744bc-53b6-4d45-ae3c-b58e70946f7c', '85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.025278513700000005, 'deposit', 'approved', 0.1293443269, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f8b79842-8408-4735-9c75-0ffdb1698e73', '174d213f-9455-5d16-aa36-2e3557272ae5', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 5.073928047e-07, 'deposit', 'approved', 5.073928047e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c5ea43d9-14e0-4ad9-911a-c239669da383', '174d213f-9455-5d16-aa36-2e3557272ae5', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 1.4315935500000064e-08, 'withdrawal', 'approved', 4.930768692e-07, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9baf251b-ef9c-4645-b4f0-d05c8810cf9a', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.02419490134, 'deposit', 'approved', 0.02419490134, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cb75424b-131a-41e5-b29a-80d6705dba6c', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.000682651870000002, 'withdrawal', 'approved', 0.02351224947, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3a6bfd22-230d-4d2a-a9dd-283e62bc3580', '28f90d52-d2a4-55e7-9d8c-cf29ab698750', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-27', '2025-11-27', 'BTC', 0.08252880846, 'deposit', 'approved', 0.08252880846, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d7919fb0-8993-41d7-b0dc-4e91b63d3713', '28f90d52-d2a4-55e7-9d8c-cf29ab698750', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', '2025-11-30', '2025-11-30', 'BTC', 0.0023285255199999993, 'withdrawal', 'approved', 0.08020028294, 'Reconciled from BTC Yield Fund', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b5bf9f5e-d8b8-495c-8a6e-d576ca6d1222', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-05-26', '2025-05-26', 'ETH', 27.01, 'deposit', 'approved', 27.01, 'Reconciled from ETH Yield Fund (Matched Investment Date: 2025-05-26T00:00:00)', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0793dcf5-8304-400e-91ca-643c22f32c69', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-06-01', '2025-06-01', 'ETH', 32.27353230038116, 'deposit', 'approved', 59.28353230038117, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('28154c42-7db2-44b0-a1ba-c0d76f17b93a', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-01', '2025-07-01', 'ETH', 0.38204768881817586, 'yield', 'approved', 59.665579989199344, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ea8ee7a0-ff90-49df-84ef-a50504e03601', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-11', '2025-07-11', 'ETH', 0.2570087938567198, 'yield', 'approved', 59.922588783056064, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bcbd8a2f-f0ae-405e-9466-838a1659ad4a', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.2213031353019872, 'yield', 'approved', 60.14389191835805, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6ed711fc-8b12-4728-972a-4572a87da41d', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 0.4121887716419508, 'yield', 'approved', 60.55608069, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('16f36569-2437-42fc-8117-4ff77bc78744', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.07786309999999474, 'yield', 'approved', 60.63394379, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b54e67c3-fe68-4aa6-ac5d-c0d1238b7353', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.06326431000000099, 'yield', 'approved', 60.6972081, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9960b0e4-d77c-48ab-a23e-45b3e42e1af7', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.00702202000000085, 'yield', 'approved', 60.70423012, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('032be4b6-a45a-4aa5-a4a1-43efb0f80db0', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.12590082999999908, 'yield', 'approved', 60.83013095, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ff3a0145-baff-476f-86c7-140de0df435d', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.07599620000000584, 'yield', 'approved', 60.90612715, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b1e90da6-2500-44aa-a0a8-f9153e4b40b8', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.02411824999999368, 'yield', 'approved', 60.9302454, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9aa7039d-0d29-4736-b634-fa0d39497fe1', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.08077433000000411, 'yield', 'approved', 61.01101973, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1b3ef4f5-facd-4f19-960a-1b74d3f60e1e', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 3.804386649999998, 'yield', 'approved', 64.81540638, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e182b9a2-a668-4a0c-a192-cf3cca0156db', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 3.1109991800000074, 'yield', 'approved', 67.92640556, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1225fc6b-3f0e-429c-af0b-f46313c009a7', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.0822522699999979, 'yield', 'approved', 68.00865783, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e27512d9-21b8-4590-a4b6-1a0bac0723ec', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.135603279999998, 'yield', 'approved', 68.14426111, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('35490162-1a16-4313-a4ee-01a4cb0fdef7', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.002221899999995003, 'yield', 'approved', 68.14648301, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3f42bdc6-5bf3-4475-ae75-c3797a190905', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.017694220000009864, 'yield', 'approved', 68.16417723, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ee7c488d-6841-486a-99ca-a6f5bb53ec6d', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.017460869999993633, 'yield', 'approved', 68.1816381, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d926b7a3-c23e-4f5c-87f7-b88a3d4c7fe2', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.03244599999999309, 'yield', 'approved', 68.2140841, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('135ae52e-4152-48db-84ff-aa320afa5b90', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.06028750000000116, 'yield', 'approved', 68.2743716, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('60cbc08f-99a5-4666-bc80-92d9a19505ba', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.06823617999999954, 'yield', 'approved', 68.34260778, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2245872d-0d26-4caf-856e-1a1a91ed9fd2', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.11403393000000506, 'yield', 'approved', 68.45664171, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7fd5591a-c121-46be-ab60-44c2c484e079', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.029549630000005322, 'yield', 'approved', 68.48619134, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a90fc4ad-e548-4efa-a8b4-bece6ca7bc05', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.01999825000000044, 'yield', 'approved', 68.50618959, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9cede0da-3ce9-4850-886a-636548572fc7', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 0.01030471929, 'deposit', 'approved', 0.01030471929, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4cf44f45-3ea4-4c23-a1fd-747ff522e0db', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.0019598273599999994, 'yield', 'approved', 0.01226454665, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d7b8ea28-56eb-4345-ad85-cb1bbc974889', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.0015944043000000012, 'yield', 'approved', 0.01385895095, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('70d8d38b-5d91-459c-8d8b-24f717c44ae6', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.00017715391000000004, 'yield', 'approved', 0.01403610486, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('64b1c635-cf7d-40c9-8271-f5f88332097c', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.0031766317100000007, 'deposit', 'approved', 0.01721273657, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('001dd5c2-baf7-4b57-9c69-cdc7cf776fa8', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.0019214091299999993, 'yield', 'approved', 0.0191341457, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fb3f1539-dc15-4949-9053-d779a41c72b3', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.0006105332799999988, 'yield', 'approved', 0.01974467898, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('07d38de6-d248-4984-9d2c-a8bc71a6d720', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.0020455332599999994, 'yield', 'approved', 0.02179021224, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7234fe23-e395-46ec-859b-aecd4b27f3e2', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.0013790907700000007, 'yield', 'approved', 0.02316930301, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c7520007-9e70-44b1-8f58-71c9078d2dbd', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.0002789112800000021, 'yield', 'approved', 0.02344821429, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ef661f77-bcd1-448c-be3a-4748ef425b95', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.0020847001999999976, 'yield', 'approved', 0.02553291449, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6cdf8d47-372a-4759-8132-2594f4c5f29b', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.0034409924099999996, 'yield', 'approved', 0.0289739069, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b89c91e3-ceb8-4ce0-a0a8-c36274ec7954', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 5.6492200000000936e-05, 'yield', 'approved', 0.0290303991, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c99b55d0-5f02-4d77-afd9-c7272a5c79cb', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.00044989310000000116, 'yield', 'approved', 0.0294802922, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e9438d9c-fdc9-4752-85f3-9c1f1c8a5904', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.00044407347999999777, 'yield', 'approved', 0.02992436568, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c2e7f9cc-71b3-4e7f-a34a-07b9eb0dc6d9', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.0008253902500000021, 'yield', 'approved', 0.03074975593, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('15b53157-d415-410b-8b00-d45f3177f0f1', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.0015343641499999984, 'yield', 'approved', 0.03228412008, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6a2a43be-038b-4e76-bf9f-aa181e88c08b', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.0017381706400000016, 'yield', 'approved', 0.03402229072, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b81080b1-abe2-4a33-a10c-e2ff56d8e82e', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.002907616580000001, 'yield', 'approved', 0.0369299073, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4e7876a3-1530-4ccd-b427-54552acb812f', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.0007546817099999964, 'yield', 'approved', 0.03768458901, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6a32f1b6-193a-4d79-a385-ca0c87da6965', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.0005109601400000024, 'yield', 'approved', 0.03819554915, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2c8e3075-357a-4e23-93c8-fd85efa2922a', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-05-26', '2025-05-26', 'ETH', 175.0, 'deposit', 'approved', 175, 'Reconciled from ETH Yield Fund (Matched Investment Date: 2025-05-26T00:00:00)', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2f1beba5-e61a-4ffe-b67b-961f77791e33', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-06-01', '2025-06-01', 'ETH', 0.190584599999994, 'yield', 'approved', 175.1905846, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c2c28294-2b47-4a76-9d3d-50b646450c0c', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-01', '2025-07-01', 'ETH', 1.4112511000000154, 'yield', 'approved', 176.6018357, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fa3de2a8-c87e-4ab6-a1a1-8e8a5f78144f', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-11', '2025-07-11', 'ETH', 0.9508878999999979, 'yield', 'approved', 177.5527236, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('52e9e568-f4ed-455b-95bf-87b53715c38b', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.8196611999999845, 'yield', 'approved', 178.3723848, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6e19a0ad-b7de-4cfd-8d02-d21ed0e80f03', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-31', '2025-07-31', 'ETH', 178.3723848, 'withdrawal', 'approved', 0, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2464dd92-1103-495d-b6fc-a7469b216454', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-05-30', '2025-05-30', 'ETH', 3.0466, 'deposit', 'approved', 3.0466, 'Reconciled from ETH Yield Fund (Matched Investment Date: 2025-05-30T00:00:00)', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a8463304-4465-441b-a53c-32fd39faa34c', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-01', '2025-07-01', 'ETH', 2.0245419439999996, 'deposit', 'approved', 5.071141944, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cb01089d-a25c-41e0-be53-45afb9dee25c', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-11', '2025-07-11', 'ETH', 26.707004855999998, 'deposit', 'approved', 31.7781468, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0cfea963-d849-4bc3-8d4a-99411ded1073', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.14670185000000302, 'yield', 'approved', 31.92484865, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('85aa2b14-d824-4b98-ac07-ca9eda95fec3', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 0.2734912800000018, 'yield', 'approved', 32.19833993, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4b683cd9-6dc7-4a14-bf6e-385cdf9314c4', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.051750839999996856, 'yield', 'approved', 32.25009077, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cc71aac6-e572-4e77-856f-87827276f7a0', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.042061420000003125, 'yield', 'approved', 32.29215219, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('60e59123-db1d-43eb-ba06-628e8aa64175', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 3.354669819999998, 'yield', 'approved', 35.64682201, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ef358978-53cd-4162-8fb8-61117792e6c1', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.09241457999999625, 'yield', 'approved', 35.73923659, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('832a85b5-d2c2-400a-92e7-0ff5fa0bd592', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.05581210000000425, 'yield', 'approved', 35.79504869, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f0527b5a-e558-4374-b26e-d8d1988e8d34', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.017718129999998666, 'yield', 'approved', 35.81276682, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f99a5f6b-f0cf-473d-b5ee-f2e742de6363', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.05934556999999785, 'yield', 'approved', 35.87211239, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6a53dccb-ba5a-4df5-8dbb-37020f8ef32b', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.039971550000004186, 'yield', 'approved', 35.91208394, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7526fbaf-744e-494c-b8b4-35e0dec37c74', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.007617859999996313, 'yield', 'approved', 35.9197018, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e0c9baa8-b820-4f4d-b85f-551369325cc8', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.054369080000000736, 'yield', 'approved', 35.97407088, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('567e3c13-359b-4a52-a201-08543b21605f', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.08966140999999794, 'yield', 'approved', 36.06373229, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('35b4a64b-0d15-4149-b24c-b2160dc3c932', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 1.0691698600000024, 'yield', 'approved', 37.13290215, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a708b5c0-0d8a-4c54-b402-06bec5c559c3', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.012051939999999206, 'yield', 'approved', 37.14495409, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('02d014b7-878b-4cff-adc0-d8cf753d6397', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.011893770000000359, 'yield', 'approved', 37.15684786, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('17645b22-eae7-4632-be0b-5985fceda07d', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.022102560000000437, 'yield', 'approved', 37.17895042, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9086bd30-c21b-424a-9caf-9512f181f313', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.04107336999999944, 'yield', 'approved', 37.22002379, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('aad3daf3-bb95-4b8f-b7c9-7009bad637aa', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.04649900999999801, 'yield', 'approved', 37.2665228, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('682391f6-9ac7-42cb-8281-7fca5d47287c', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.07772692000000347, 'yield', 'approved', 37.34424972, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('17934856-bcee-4977-8423-11085e4fef1e', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.02014976999999618, 'yield', 'approved', 37.36439949, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c2f6b663-c6bb-4777-93f7-84a0684a61db', '4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.01363819000000177, 'yield', 'approved', 37.37803768, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('35f86c9a-c021-43c4-9a25-d4d1d12e1ed2', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-11', '2025-07-11', 'ETH', 62.6261, 'deposit', 'approved', 62.6261, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6ac08b5d-7324-49b6-92e0-d0635889e57d', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.23128761000000253, 'yield', 'approved', 62.85738761, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d87dd2cd-78a7-4d31-b782-a89b96f63982', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 0.4307853799999961, 'yield', 'approved', 63.28817299, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f9f6dbb6-5389-4f09-961e-8604da555bec', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.08137603000000126, 'yield', 'approved', 63.36954902, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4d53b7d1-133b-4c18-bd0d-096a960e3579', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.06611859000000209, 'yield', 'approved', 63.43566761, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('57fae7d9-5c9b-4f58-aa94-e30f940f96de', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.0073388299999948, 'yield', 'approved', 63.44300644, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d8954f6c-779a-4770-bf3b-875c54b76854', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.13158106000000203, 'yield', 'approved', 63.5745875, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('42b06523-6b27-4ea2-9ae3-d7574c65173d', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.07942489999999935, 'yield', 'approved', 63.6540124, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('74d8203d-5822-4f35-a57d-a0797b6674e4', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.025206390000001022, 'yield', 'approved', 63.67921879, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ca7179d5-14ec-4474-b13f-c833497695c6', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.08441859999999934, 'yield', 'approved', 63.76363739, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6e4db156-860a-4390-b381-cfc7770e55e8', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.05684039999999868, 'yield', 'approved', 63.82047779, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('58014240-d3a0-459e-ba3b-e477cdd4882a', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.010830339999998273, 'yield', 'approved', 63.83130813, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2c54665d-2189-4ef7-bcca-a4f1e1563e3c', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 1.277293510000007, 'yield', 'approved', 65.10860164, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a675568e-feac-4fc0-b2f5-0a3e2cd03c0b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.12982081999999195, 'yield', 'approved', 65.23842246, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b42ac641-7d37-4d16-b019-a1efa8957e9a', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 2.508527150000006, 'yield', 'approved', 67.74694961, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f0d1127-416e-419a-aea0-ee18bd628ddd', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.017590479999995523, 'yield', 'approved', 67.76454009, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8c4ac980-954e-4ca1-8458-520fbee72699', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.017358500000000276, 'yield', 'approved', 67.78189859, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('99157c65-da5e-41ea-a8c8-e52f4a5545b9', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.03225577000000612, 'yield', 'approved', 67.81415436, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6550dc07-77aa-45a0-9b10-e129f104187b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.05993404999999541, 'yield', 'approved', 67.87408841, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8a3c9a74-d825-4a5f-accf-ee17a0a1e459', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.0678361199999955, 'yield', 'approved', 67.94192453, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0d674ee2-a29d-4d95-9562-ba71a91877d9', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.11336537000001101, 'yield', 'approved', 68.0552899, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('22399299-dbf0-46dd-b67a-ce381f52f6af', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.02937637999998799, 'yield', 'approved', 68.08466628, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cfa842fd-ed26-4c9a-ad7c-1bca02646094', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.01988100000001225, 'yield', 'approved', 68.10454728, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('acd2b379-645d-46b2-8d1e-f5f1170c7337', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-11', '2025-07-11', 'ETH', 119.7862, 'deposit', 'approved', 119.7862, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5637023b-5d8e-49b1-9415-c3eb952fee34', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.5529855999999995, 'yield', 'approved', 120.3391856, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e44cea66-a9d8-4a59-a508-69137692ff88', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 1.030912200000003, 'yield', 'approved', 121.3700978, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('23e2df8c-86d7-4222-8b3c-9db5cb56919a', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.1950724000000008, 'yield', 'approved', 121.5651702, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f789bd42-2d82-4e83-a938-241ef05596e7', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.15854850000000908, 'yield', 'approved', 121.7237187, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('77aeb535-c08d-477f-ab4a-dfb89a55ea40', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.017602599999989366, 'yield', 'approved', 121.7413213, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ddc3a7f6-3e1e-46b7-9c57-910696922c1c', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.31561510000000226, 'yield', 'approved', 122.0569364, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0dff9e47-0f49-4ac6-a31b-15cc7ee7dbe4', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.19060989999999833, 'yield', 'approved', 122.2475463, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9da79c0f-d93f-414f-9c71-432cc7be8643', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.060511099999999374, 'yield', 'approved', 122.3080574, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('875b8a2f-5fbf-460c-84e7-72bcb9d70f7d', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.20267750000000717, 'yield', 'approved', 122.5107349, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('256bb8df-9d8a-4317-8f40-3af799c6505d', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.13651120000000105, 'yield', 'approved', 122.6472461, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8ba6a3b0-443b-4745-9fbb-7669bb537908', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.026016499999997222, 'yield', 'approved', 122.6732626, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('407d1f5c-c782-4fbe-8a67-59490d7218c8', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.18568179999999757, 'yield', 'approved', 122.8589444, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('305cb6d8-ca6a-4421-894d-bbef1b6d0308', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.3062124000000068, 'yield', 'approved', 123.1651568, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('baf4e6ae-2a6c-4069-8d5f-764ec91c1564', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 4.799019799999996, 'yield', 'approved', 127.9641766, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dfb4b9e4-a50a-465f-b83b-b95a37405c43', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.04153239999999414, 'yield', 'approved', 128.005709, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('143ebda4-4afb-462b-abd3-20b6fb52a9b8', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.04098730000001183, 'yield', 'approved', 128.0466963, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6e0278d3-941a-4336-8fb7-7c5e214b5664', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.07616790000000151, 'yield', 'approved', 128.1228642, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7fc1e438-aea0-4c74-a9a7-b0043630acec', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.14154349999998317, 'yield', 'approved', 128.2644077, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f0ddf330-fa77-4de7-b93a-01d229089411', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.16024079999999685, 'yield', 'approved', 128.4246485, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4504eb33-783c-45bc-9be6-722f9e34e7bd', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.2678557000000126, 'yield', 'approved', 128.6925042, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('054ab47c-546f-4188-bd91-e7daa05b6999', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.06943839999999568, 'yield', 'approved', 128.7619426, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cb2b1c06-9ba5-4b2e-aca7-e499a7bead0c', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.04699880000001144, 'yield', 'approved', 128.8089414, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a092e856-9d91-426a-9646-bf862b5ce4b6', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 32, 'deposit', 'approved', 32, 'Reconciled from ETH Yield Fund (Matched Investment Date: 2025-07-30T00:00:00)', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f3824501-a9bc-408a-b1e7-0915b77b8811', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 0.21930806999999675, 'yield', 'approved', 32.21930807, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a988b8df-8925-41fa-9d0c-ab48ad40a778', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.04142763000000116, 'yield', 'approved', 32.2607357, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('03f5d54f-238f-4c5c-a3b8-cd478dc943c8', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.03366024000000323, 'yield', 'approved', 32.29439594, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e0b35323-14e9-4b3a-9f18-d7d7852d3ffd', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.0037361199999992323, 'yield', 'approved', 32.29813206, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('38736350-8061-4925-ad76-e40fe77528c1', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.06698646999999625, 'yield', 'approved', 32.36511853, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9647bf27-7974-4d06-8e72-9ddc5a57fd13', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.04043433000000363, 'yield', 'approved', 32.40555286, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b8096e8f-c444-419f-ba71-b2110fbe8d67', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.012832299999999464, 'yield', 'approved', 32.41838516, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('db404381-9973-4918-8bbe-ef529e2cf4e2', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.042976570000000436, 'yield', 'approved', 32.46136173, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2905a8a1-b693-407b-8894-9c6516be0606', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.02893681999999842, 'yield', 'approved', 32.49029855, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('32a37350-c6d2-43cb-af7e-dbad44e79f38', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.0055136000000004515, 'yield', 'approved', 32.49581215, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6ad76707-7dc9-4aaa-b02c-2c6cb7f1d159', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.039349270000002434, 'yield', 'approved', 32.53516142, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('857826a2-d660-49da-9310-48caf2f05199', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.06487225000000052, 'yield', 'approved', 32.60003367, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c0b983f2-4868-434e-a82d-d0c0161df585', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.0010629499999978975, 'yield', 'approved', 32.60109662, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f076582c-dfd0-48f8-bf38-ecdbfb425606', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.008464869999997404, 'yield', 'approved', 32.60956149, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d16a242a-b53d-4924-806f-2607f7cc22ac', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.00835323000000443, 'yield', 'approved', 32.61791472, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ec2c250e-ff37-4ed3-b617-168754965b69', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.015522079999996663, 'yield', 'approved', 32.6334368, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cc023d5f-1e48-4fac-800c-76d2a28a8b32', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.028841380000002914, 'yield', 'approved', 32.66227818, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9289dc22-937e-420a-a9b1-d8ad392086fa', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.0326440099999985, 'yield', 'approved', 32.69492219, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6f594814-9e2c-4e67-a93b-db726128b7a8', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.05455352999999974, 'yield', 'approved', 32.74947572, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dc26f878-9a5b-4360-a792-008579640c4e', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.014136470000003953, 'yield', 'approved', 32.76361219, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('66ef44bd-9078-4431-86f9-b5d7578f92dd', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.009567099999998163, 'yield', 'approved', 32.77317929, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f60611b0-7079-4101-924f-681a742377b7', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 0.005482701678, 'deposit', 'approved', 0.005482701678, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('224b12e9-d2cd-477b-9f43-d5b2291fd085', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.0010427405619999998, 'yield', 'approved', 0.00652544224, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('19a890da-975a-4a51-bb4f-258df605b4ee', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.0008483145310000002, 'yield', 'approved', 0.007373756771, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('90e96905-20e3-4723-9b2c-9267a424d2e8', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 9.425604399999985e-05, 'yield', 'approved', 0.007468012815, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('85386fd2-73cc-4d49-abaa-09fdbb1c92e9', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.001690150262999999, 'deposit', 'approved', 0.009158163078, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('11212ef0-533e-4bd8-a091-4483c41cc221', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.0010222998520000009, 'yield', 'approved', 0.01018046293, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('724ed94a-8f74-4a48-9af1-2652e128de47', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.0003248387300000006, 'yield', 'approved', 0.01050530166, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c545b00b-d96e-4330-b68b-73e8cb64eb6a', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.0010883410099999987, 'yield', 'approved', 0.01159364267, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('32e0a97e-96ba-4251-99fa-6c207cca77d5', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.0007337553800000011, 'yield', 'approved', 0.01232739805, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a5b729ab-58fb-4d10-8b03-be1130c28953', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.0001399321000000002, 'yield', 'approved', 0.01246733015, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2933c41d-96fc-46b3-b84a-43a00af1d9a0', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.0009988283899999995, 'yield', 'approved', 0.01346615854, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('20f89d59-a384-4ab3-ba7b-927443bc3a4a', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.0016486565799999995, 'yield', 'approved', 0.01511481512, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6eb67eb9-5841-4b4b-9143-000725749eb8', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 2.7066600000000274e-05, 'yield', 'approved', 0.01514188172, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e0676ff2-3cbb-49d7-a6da-2a3888f67867', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.0002155532199999994, 'yield', 'approved', 0.01535743494, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f7858d2f-22a7-463c-ae11-dfbe99e23adc', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.00021276483, 'yield', 'approved', 0.01557019977, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ef756c86-7952-4133-841c-9875821baf06', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.0003954614700000022, 'yield', 'approved', 0.01596566124, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b87fccb0-513b-4a85-8466-1fa91fe3c7db', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.0007351449599999997, 'yield', 'approved', 0.0167008062, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5b53fb5a-28ed-4a0b-9f43-09adfd8d0187', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.0008327916899999975, 'yield', 'approved', 0.01753359789, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4c721560-cc18-4582-9c90-1210a01cdf4e', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.0013930941499999995, 'yield', 'approved', 0.01892669204, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7282e32f-016a-46fd-a04f-bdc24a45eb55', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.0003615814000000016, 'yield', 'approved', 0.01928827344, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1f79c6a9-f693-4afb-a0d0-f5ef12b598d1', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.0002448099200000019, 'yield', 'approved', 0.01953308336, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('76bd2a3a-6398-4052-8abd-cafb31fed203', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 10.44, 'deposit', 'approved', 10.44, 'Reconciled from ETH Yield Fund (Matched Investment Date: 2025-09-04T00:00:00)', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f584a1e9-1bf7-4fa2-9d89-688f9f950326', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 4.644273700000001, 'deposit', 'approved', 15.0842737, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('41d04fbc-9710-43ba-8c0e-6cb85653ffd0', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 8.961854159999998, 'deposit', 'approved', 24.04612786, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('65e7774f-c401-4713-9b99-d3533ee4ae4b', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.05298876000000163, 'yield', 'approved', 24.09911662, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('28268b5b-029f-458f-be20-92ff4837735a', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.03198918000000006, 'yield', 'approved', 24.1311058, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('46808ef5-bb9f-43a7-af61-a86435f03932', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 11.98984707, 'withdrawal', 'approved', 12.14125873, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3e7143a6-eaba-487f-ad12-844a50325e34', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.017101450000000185, 'yield', 'approved', 12.15836018, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5bc959e4-da0e-457e-88a8-f9052e9676b8', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.011515639999998939, 'yield', 'approved', 12.16987582, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4518ff4a-e13d-43f1-b788-c2f77ef4a4c9', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.0021943000000010926, 'yield', 'approved', 12.17207012, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fcc6c1f9-f631-418b-ada6-c4dfed71ba98', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.015660399999999797, 'yield', 'approved', 12.18773052, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dd7f98a4-cbe3-4529-bab7-97ef7d2a9f13', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.02582008999999985, 'yield', 'approved', 12.21355061, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('635469c3-034c-4d3c-b933-f1ba0f0961e7', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.00042311999999888883, 'yield', 'approved', 12.21397373, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0ad2e46e-2dcc-4768-910e-e84e21c1a468', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.003369570000000266, 'yield', 'approved', 12.2173433, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c635ae7b-4f4b-4569-ab43-a9cba8f8be5a', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 12.2173433, 'withdrawal', 'approved', 0, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('98020acc-3b53-435a-ad88-59a3f002b6c9', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.0002042418408, 'deposit', 'approved', 0.0002042418408, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('add019de-3271-4bf6-92d9-bce5b019505e', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 3.274407580000001e-05, 'yield', 'approved', 0.0002369859166, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2ef85048-2ee4-4c24-9d44-2b4d7e686381', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.0009355872194, 'deposit', 'approved', 0.001172573136, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a7d59c98-b693-4494-a9ef-57edc5245f2d', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.000565979944, 'deposit', 'approved', 0.00173855308, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6aa4d4c5-d098-433d-93d8-a281e3daa5b5', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.00017985765600000004, 'yield', 'approved', 0.001918410736, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('984b2d91-265f-4d8e-bf59-9fd531e3264c', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.000304333579, 'yield', 'approved', 0.002222744315, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7531eb22-ef77-4fdd-8bc4-d0afa87a236a', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.0002051985610000001, 'yield', 'approved', 0.002427942876, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a7bc78ff-aa2d-4a96-a244-9f1685989433', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 3.9135057999999806e-05, 'yield', 'approved', 0.002467077934, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7baf86b2-adec-4711-9603-937b87c3a58a', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.00027934725199999996, 'yield', 'approved', 0.002746425186, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f5e122a-74d1-48dd-9fda-210aa3beaf15', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.0004611248020000001, 'yield', 'approved', 0.003207549988, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('12e7a1b5-45bf-4618-94b2-5b7789275673', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 7.57144999999999e-06, 'yield', 'approved', 0.003215121438, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('347336f3-0e83-448c-902c-288998fed00c', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 6.0297707000000166e-05, 'yield', 'approved', 0.003275419145, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('24281c93-2898-4a4f-b988-be55082b9ba1', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 5.951871899999989e-05, 'yield', 'approved', 0.003334937864, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8daaf68f-666d-441f-ab75-f435763a8d57', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 1.5870169999998747e-06, 'yield', 'approved', 0.003336524881, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bf52eddc-18a6-44c4-a0c2-bb93b644a378', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 2.948815000000226e-06, 'yield', 'approved', 0.003339473696, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5f734ab4-79de-4e16-84b5-cf3e62c925ba', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 3.337605999999705e-06, 'yield', 'approved', 0.003342811302, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ad72cdcf-3a05-49ee-bcda-a5f991daa0b9', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 5.577689999999944e-06, 'yield', 'approved', 0.003348388992, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7f9aec9c-ffcc-4aa4-adf7-e88d6ef94045', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 1.4453480000000025e-06, 'yield', 'approved', 0.00334983434, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('db5d0903-10bf-4da5-b366-1f10a8a94259', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 9.781650000002112e-07, 'yield', 'approved', 0.003350812505, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fbe9523f-692b-4c5e-a74f-619987ff4fa7', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 63.1, 'deposit', 'approved', 63.1, 'Reconciled from ETH Yield Fund (Matched Investment Date: 2025-09-27T00:00:00)', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5d526bd1-fe76-4b56-bdd0-ea01708d46e5', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 0.07883198999999763, 'yield', 'approved', 63.17883199, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('068f1b18-4462-4581-aaf4-1ca36e95dc81', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.025018219999999758, 'yield', 'approved', 63.20385021, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6c401062-26a6-48b6-9325-3711da5bee5e', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 10.134788409999999, 'yield', 'approved', 73.33863862, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('72820afe-fabf-4874-9984-55a3eb16147b', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 64.33537578, 'deposit', 'approved', 137.6740144, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c861a46b-7b8e-4be4-bf55-8b6da9be5aa4', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.023363299999999754, 'yield', 'approved', 137.6973777, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f9f4af26-4c88-4e7e-9e16-a5038370a03b', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 6.541699999999992, 'yield', 'approved', 144.2390777, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('334dbc05-f36d-4076-b305-67844e669a16', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 6.574659499999996, 'yield', 'approved', 150.8137372, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('76e814df-22b0-45cf-a503-462ff7d299c9', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.3007093000000225, 'yield', 'approved', 151.1144465, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d3fc05e3-ec49-4fd2-a3fb-6c3a680a520e', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.004927199999997356, 'yield', 'approved', 151.1193737, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1d90014b-f687-4eb5-9718-8a612beda599', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 6.991138100000001, 'yield', 'approved', 158.1105118, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('57d4dcbb-62aa-4430-9e00-7e96471e3bb0', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 7.662001500000002, 'yield', 'approved', 165.7725133, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('70492710-701d-4161-a402-54e23a6629e8', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 10.302887099999992, 'yield', 'approved', 176.0754004, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fabdbbbb-8a75-433c-85d0-1899310a9c24', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 6.38961519999998, 'yield', 'approved', 182.4650156, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('208350ec-daa0-43f2-96b5-a92c0d9119d6', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.18236290000001532, 'yield', 'approved', 182.6473785, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9483080e-286e-4e0d-916e-e749325be381', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.30475859999998534, 'yield', 'approved', 182.9521371, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c35d5d13-480f-4cee-b5d2-7aaa21b39e12', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 9.22197220000001, 'yield', 'approved', 192.1741093, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('55e96377-1d63-4f49-ae89-068baf29d9e8', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.05611559999999827, 'yield', 'approved', 192.2302249, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8027ba8f-f5a9-4929-94b2-89c48a91b4c5', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 78, 'deposit', 'approved', 78, 'Reconciled from ETH Yield Fund (Matched Investment Date: 2025-11-17T00:00:00)', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a059b6e8-80da-4386-b6bd-b1085dfdbbf9', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 35.077956400000005, 'deposit', 'approved', 113.0779564, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9c1b0452-e686-4c41-9692-9abcdf001838', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 33.188677600000005, 'deposit', 'approved', 146.266634, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c320bb9b-a7b9-4e4e-b35b-74841f4c129e', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.06313670000000116, 'yield', 'approved', 146.3297707, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a2c1bb92-b2d1-430b-b4b1-05af7457f585', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.04272889999998597, 'yield', 'approved', 146.3724996, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8e2bf46e-bd44-4122-9a1b-4b990083e28d', '174d213f-9455-5d16-aa36-2e3557272ae5', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.00194890929, 'deposit', 'approved', 0.00194890929, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7709a11c-0d41-420d-8d90-f09e365a9e85', '174d213f-9455-5d16-aa36-2e3557272ae5', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.004720193554, 'deposit', 'approved', 0.006669102844, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('723b4adb-7855-4d34-ac33-678b786d4852', '174d213f-9455-5d16-aa36-2e3557272ae5', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.0015812956640000007, 'deposit', 'approved', 0.008250398508, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('65378aeb-c2b4-4459-acf4-ff5f6f12a12f', '174d213f-9455-5d16-aa36-2e3557272ae5', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.0010706312010000003, 'yield', 'approved', 0.009321029709, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8edd8493-f427-42be-b4c4-2c8d754bfebc', '69c51f1e-4eb5-5633-9198-a0754e304af1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 31.37, 'deposit', 'approved', 31.37, 'Reconciled from ETH Yield Fund (Matched Investment Date: 2025-12-04T00:00:00)', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ce62c03-6144-4af0-9b0e-e5453aab5b08', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-05-26', '2025-05-26', 'ETH', 0.1337062522, 'deposit', 'approved', 0.1337062522, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4c1b0713-2ed8-45d6-9bf7-cfdc8fc6fb82', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-06-01', '2025-06-01', 'ETH', 0.11588066690000001, 'deposit', 'approved', 0.2495869191, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('72403966-2168-4383-9e9b-4b8209a68ef6', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-01', '2025-07-01', 'ETH', 0.0024630788999999986, 'withdrawal', 'approved', 0.2471238402, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('51eb5be4-b43a-40e9-8288-99f07ca79f7d', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-11', '2025-07-11', 'ETH', 0.11476550569999999, 'withdrawal', 'approved', 0.1323583345, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6f830706-fe29-47b2-ba55-622a3ddfb5ae', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.008813919900000008, 'withdrawal', 'approved', 0.1235444146, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a8744de7-f02c-4387-9466-e73d6d04500f', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-31', '2025-07-31', 'ETH', 0.07144458499999999, 'deposit', 'approved', 0.1949889996, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7b1706fe-cdf5-4d99-8485-d45866250c07', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 0.0003312456000000019, 'withdrawal', 'approved', 0.194657754, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('14253e8e-b38e-41d6-9607-c1bb427d623c', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.0063711229999999786, 'withdrawal', 'approved', 0.188286631, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('895b63af-0b9d-4f54-8f1c-1cd96c9da79c', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.002715189600000001, 'withdrawal', 'approved', 0.1855714414, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('858c1d00-3969-4b9d-8f3e-3bc674213dd8', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.006735034000000001, 'withdrawal', 'approved', 0.1788364074, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('74899c19-e335-49f3-99a7-7fae00f4ff3d', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.028050301200000016, 'withdrawal', 'approved', 0.1507861062, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d2dff720-9685-4665-b4cd-ad4a2145b9c1', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 4.702160000000233e-05, 'withdrawal', 'approved', 0.1507390846, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('eaa39b88-ae1f-4be7-8832-ccb573175e52', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.004596149100000002, 'yield', 'approved', 0.1553352337, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('af85ac9b-b686-47a4-81ce-f53dc5e8b6db', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.003924715499999981, 'withdrawal', 'approved', 0.1514105182, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2892e9a6-3363-4a82-a58a-c70149a85e8f', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.013920792700000018, 'withdrawal', 'approved', 0.1374897255, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('73780fcf-efa2-48e4-9671-80f29a2ef038', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.005627727500000013, 'yield', 'approved', 0.143117453, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a21d41ad-1845-49b7-9921-27d0cd6a1a82', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 0.0019457730000000117, 'withdrawal', 'approved', 0.14117168, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fa7053b4-46d9-41f0-aceb-78430f36aa3d', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.0022338919999999873, 'withdrawal', 'approved', 0.138937788, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('27acc614-5c2d-4c25-974f-48778229ba03', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 6.908529999999358e-05, 'withdrawal', 'approved', 0.1388687027, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('97ee17fb-c26f-4ebf-8403-17e3b48a9da4', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.0023392677000000084, 'withdrawal', 'approved', 0.136529435, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9aea60c0-9302-4d92-88e8-d74eb1d9ed1b', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.0018835880999999999, 'withdrawal', 'approved', 0.1346458469, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('36b414c2-1e12-40d6-bd9e-2e9454960281', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.0012251685999999928, 'yield', 'approved', 0.1358710155, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('16db4768-ff09-45c6-929b-9c59ecc6d3a0', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.002727237999999993, 'withdrawal', 'approved', 0.1331437775, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9ae6dbc3-2e17-4099-93ae-8d1afc8e0c30', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.0188070095, 'withdrawal', 'approved', 0.114336768, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a47bc9c3-8104-4b9a-87a1-e4cda9c5dbe3', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.00635009160000001, 'withdrawal', 'approved', 0.1079866764, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('61acf409-40cf-4796-9a49-246536344f2a', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.005383796099999991, 'withdrawal', 'approved', 0.1026028803, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3eed8612-34b6-419e-8e3e-d39c466f65a2', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.0013971943000000014, 'withdrawal', 'approved', 0.101205686, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9594ee0b-154c-4e0f-87ae-78be3bd2a8ed', '1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.004489244860000005, 'withdrawal', 'approved', 0.09671644114, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8bcd8a10-8423-459f-8a4a-253bbcb03eca', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 3.312455973e-05, 'deposit', 'approved', 3.312455973e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d45869a0-339e-4982-8e5f-ac1ddd959337', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 4.960546159999997e-06, 'yield', 'approved', 3.808510589e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f76022d7-7d56-40bb-b0fe-72ed44b8fb9b', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 4.286291149999996e-06, 'yield', 'approved', 4.237139704e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('95b8a7ae-81f2-414e-b2d5-27b9499df73d', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 1.0206285299999991e-06, 'withdrawal', 'approved', 4.135076851e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b7b6a790-34ec-4fdc-a52a-88ed1558146f', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 1.3162697500000053e-06, 'yield', 'approved', 4.266703826e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a9812153-50d4-4774-a71d-13fd30f0ce7e', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 4.688847639999999e-06, 'yield', 'approved', 4.73558859e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('706ca050-9390-4fbf-9214-d56c8cf166c6', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 2.981090469999999e-06, 'yield', 'approved', 5.033697637e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3e231ab1-f8ca-4422-8799-6d9700870b31', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 3.739604269999997e-06, 'yield', 'approved', 5.407658064e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ab40ce8d-8651-48d9-b535-f5e54a863902', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 4.928680669999996e-06, 'withdrawal', 'approved', 4.914789997e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1e3699a4-27c7-4d32-ba43-05e6f8ad4d74', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 2.562850399999978e-07, 'yield', 'approved', 4.940418501e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('da0e3937-43bd-4280-bc3f-d31bb8acdb05', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 6.716813900000003e-07, 'withdrawal', 'approved', 4.873250362e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8aa6dc01-49e8-474c-903d-b38cdd2194b2', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 3.4297764799999983e-06, 'yield', 'approved', 5.21622801e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d5d58dc2-bedc-4aaf-8a6b-0b32dc0abe00', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 6.882587330000003e-06, 'yield', 'approved', 5.904486743e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1bd623dc-5986-4734-a6ad-ca539e027f80', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 8.833334600000012e-07, 'withdrawal', 'approved', 5.816153397e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a70abe79-bc95-4a5b-8667-968c51fb998a', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 7.138353999999817e-08, 'yield', 'approved', 5.823291751e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c80e2382-301a-42d2-b151-0a63fc0c6000', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 1.39976465e-06, 'yield', 'approved', 5.963268216e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c36c5ad1-8423-416e-86d0-92da00ef9af2', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 3.862818900000027e-07, 'yield', 'approved', 6.001896405e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a97269b0-d312-422d-a9d3-d915df2fd16b', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 5.953846210000003e-06, 'withdrawal', 'approved', 5.406511784e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4718b8e3-6acf-42ab-8f78-5eac0772e09f', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 3.0723211999999475e-07, 'withdrawal', 'approved', 5.375788572e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e39e20c1-4cca-4422-bd2d-b6fb1576cc1e', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 1.592694769999996e-06, 'yield', 'approved', 5.535058049e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('efd27ebc-34d7-40fd-9c9b-c6e629b8bcfc', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 3.379401899999984e-07, 'yield', 'approved', 5.568852068e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7228b4b0-4470-4832-8f7c-3ea66789f888', '30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 1.7643774299999992e-06, 'withdrawal', 'approved', 5.392414325e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('74824c8e-5a35-4c1c-b290-d882467424ad', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-06-01', '2025-06-01', 'ETH', 0.01282635292, 'deposit', 'approved', 0.01282635292, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dc38bc02-4157-4cb3-a747-2456c7dbeb0b', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-01', '2025-07-01', 'ETH', 0.008177382759999999, 'deposit', 'approved', 0.02100373568, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('da977381-bd0a-446a-b3f2-8e7971b01e0a', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-11', '2025-07-11', 'ETH', 0.04918853521000001, 'deposit', 'approved', 0.07019227089, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('16111cb3-9706-4ba1-a09e-6833d6ee2fff', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.004613928490000002, 'withdrawal', 'approved', 0.0655783424, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('79cdff16-273c-4498-accb-8ad1946e682e', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-31', '2025-07-31', 'ETH', 0.037923345, 'deposit', 'approved', 0.1035016874, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f9198dd0-c9f3-490a-bfda-c6ffdbd31b92', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.003355456399999998, 'withdrawal', 'approved', 0.100146231, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9a724305-8d9a-43e6-a85c-132ad71c0992', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.001418440780000002, 'withdrawal', 'approved', 0.09872779022, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('904779d8-29bf-4839-b479-a4eab4cc2ce9', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.006288772380000002, 'yield', 'approved', 0.1050165626, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6609ca70-5597-4c45-b511-263dae15f91c', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.016425921110000005, 'withdrawal', 'approved', 0.08859064149, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f506ec9-126c-463a-bff9-26b17b0fb739', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.0027102299500000038, 'yield', 'approved', 0.09130087144, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9365d546-4355-420e-bbca-3a9f1cc0bf51', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.002277361409999998, 'withdrawal', 'approved', 0.08902351003, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('92503cbf-e621-4e7f-acdd-236717ea562d', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.012844977199999996, 'withdrawal', 'approved', 0.07617853283, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d3c52ff4-b43a-45c9-a948-18ff7a61dc7a', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.0004975632200000107, 'withdrawal', 'approved', 0.07568096961, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a068423e-ae79-4378-81cd-493fc9b3e597', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 0.0010289310199999985, 'withdrawal', 'approved', 0.07465203859, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5878f668-b076-460f-b88e-c4c75b43d419', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.001159074730000001, 'withdrawal', 'approved', 0.07349296386, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9123db50-a24a-4e91-8e14-c61f027a9aa8', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.0009016919900000087, 'yield', 'approved', 0.07439465585, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b52904ae-f1de-4d01-8583-cd21cf6eb1ec', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.0010216026700000103, 'withdrawal', 'approved', 0.07337305318, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c02a951e-1664-4564-936c-07ea352649c1', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.000672375950000012, 'yield', 'approved', 0.07404542913, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e8d1e827-94cf-461d-afc4-6ac4cdb6a126', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.0014776307400000133, 'withdrawal', 'approved', 0.07256779839, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3302bd5b-08cb-4c24-b61b-e2326330c9e8', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.01023669047999999, 'withdrawal', 'approved', 0.06233110791, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('026a6f81-d8a8-4b5d-97c6-88858520a226', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.0034470812400000037, 'withdrawal', 'approved', 0.05888402667, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('794d21b4-5a33-4b7d-95e5-1b949e8d3919', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.002912429379999998, 'withdrawal', 'approved', 0.05597159729, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b5ace9a3-4657-4e1d-af90-49bb84b283ee', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.0007562376900000015, 'withdrawal', 'approved', 0.0552153596, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('57377723-281b-49b6-ad7a-e6ac48bd54e2', '35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.0024453719100000007, 'withdrawal', 'approved', 0.05276998769, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('37874679-5013-4f6c-bbdd-bb95775d2fe4', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-11', '2025-07-11', 'ETH', 0.1383299097, 'deposit', 'approved', 0.1383299097, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('be680689-afae-4939-a168-187fb5021596', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.009211575200000016, 'withdrawal', 'approved', 0.1291183345, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b67782dd-49b3-4f69-a4b4-a89d04157bfd', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-31', '2025-07-31', 'ETH', 0.07466793100000002, 'deposit', 'approved', 0.2037862655, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('747fc0e4-511c-440a-84c1-50a73540fa38', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 0.00034619030000002105, 'withdrawal', 'approved', 0.2034400752, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a3e93179-6ae0-4b56-a338-3babdc2bdd9f', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.006658567199999993, 'withdrawal', 'approved', 0.196781508, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9bdbb11b-2ff7-4418-a07a-be241a96faeb', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.0028376900999999843, 'withdrawal', 'approved', 0.1939438179, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bac7cc61-ad3c-4767-82ff-8d307e1c9c9e', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.007038896700000019, 'withdrawal', 'approved', 0.1869049212, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('80ab3c7c-c273-48db-b48b-b696213601bb', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.02931583909999999, 'withdrawal', 'approved', 0.1575890821, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a45e270c-9d5b-424b-9bb3-5e04f1f33c24', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 4.914300000000149e-05, 'withdrawal', 'approved', 0.1575399391, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4a1d3adb-fd7b-4d9f-8dcf-62d225a91d6b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.004803512300000007, 'yield', 'approved', 0.1623434514, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0865a45f-a053-41ad-ae99-2e7cccfa6d69', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.004101785800000007, 'withdrawal', 'approved', 0.1582416656, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('afce74f5-ef47-4812-85ec-c24d0e3a78da', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.022862433099999996, 'withdrawal', 'approved', 0.1353792325, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f0bc16e8-0510-4617-8738-2e0a496b90f1', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.0008899397000000087, 'withdrawal', 'approved', 0.1344892928, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a0e923c2-7498-42c4-a84e-bc2d35edd1ea', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 0.0018284677000000027, 'withdrawal', 'approved', 0.1326608251, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('35955f9f-04ac-4835-98a6-74be4435b8ca', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.0003523143999999978, 'yield', 'approved', 0.1330131395, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7cac8a99-1d84-4640-bb71-fd1bf0e779ee', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 6.613929999998991e-05, 'withdrawal', 'approved', 0.1329470002, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ac01047d-e01b-4dbd-9c90-8d0c80313293', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.002781981600000011, 'yield', 'approved', 0.1357289818, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('01602954-d509-4e13-9f7f-70cf3b3e9be5', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.0018725449000000227, 'withdrawal', 'approved', 0.1338564369, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bc1333e3-e0d6-44b1-84cc-31cf3659bf5b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.0012179856000000266, 'yield', 'approved', 0.1350744225, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e7692c4b-914a-455c-bf7b-7c7668ed0be0', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.0027112486000000213, 'withdrawal', 'approved', 0.1323631739, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2f40011b-ed0c-43f9-8d9a-a05476fc505d', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.018696746599999994, 'withdrawal', 'approved', 0.1136664273, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('39488522-33eb-4398-a249-d3095ee6d4b8', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.0063128618, 'withdrawal', 'approved', 0.1073535655, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('16584c9d-928d-44d1-b8e8-71eec28ed079', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.005352231700000001, 'withdrawal', 'approved', 0.1020013338, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('747b18a2-2161-4c04-89ee-f5a1c7d1d54c', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.0013890027000000027, 'withdrawal', 'approved', 0.1006123311, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('06510905-d334-402d-a6fb-6c890ceb550d', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.004462925069999998, 'withdrawal', 'approved', 0.09614940603, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0bcd5215-248e-45d4-91ec-555f118f874e', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-11', '2025-07-11', 'ETH', 0.2645863981, 'deposit', 'approved', 0.2645863981, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('94d6b379-9431-41d6-bf3e-7ede6e212695', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.017391982200000017, 'withdrawal', 'approved', 0.2471944159, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6816fd48-4d4d-4ee8-827b-af3945e72317', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-31', '2025-07-31', 'ETH', 0.14295022980000002, 'deposit', 'approved', 0.3901446457, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8de437ed-bf05-46c2-ad8f-70cbd0817857', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.01264823180000002, 'withdrawal', 'approved', 0.3774964139, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('986291e6-b05d-4e2c-b4d8-55d8c2bdb8c8', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.0053467445, 'withdrawal', 'approved', 0.3721496694, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c5202bd1-c3cf-4656-b91a-2cca1df81112', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.01349623630000002, 'withdrawal', 'approved', 0.3586534331, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1574e71f-8ea0-4b4c-8fc5-af316b938d6a', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.05609794159999998, 'withdrawal', 'approved', 0.3025554915, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('455428e1-15ff-4253-be6e-81971df74d80', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.009255999700000017, 'yield', 'approved', 0.3118114912, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('86e8da70-5b9f-4eea-9975-1793de175e3d', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.007777663500000032, 'withdrawal', 'approved', 0.3040338277, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('13c58e44-21cb-43d4-adfd-06e414ef64fe', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.043868272399999964, 'withdrawal', 'approved', 0.2601655553, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3d55eb9e-1c99-4e73-aba4-5bd310c3f8be', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.0016992820000000242, 'withdrawal', 'approved', 0.2584662733, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8b4dea96-5d5d-4475-834b-9c305b126369', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 0.003514013699999985, 'withdrawal', 'approved', 0.2549522596, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1aa08ef4-9eba-44eb-a650-156633e7fb69', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.003958481700000016, 'withdrawal', 'approved', 0.2509937779, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a5b100cb-da2e-422a-a502-df3826d85ffd', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.005378612399999982, 'yield', 'approved', 0.2563723903, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1811cf74-9302-40c4-84c8-a3aa1192831e', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.0035205582999999763, 'withdrawal', 'approved', 0.252851832, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('379d67fd-718b-42fc-8d82-477867283435', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.0023170834999999834, 'yield', 'approved', 0.2551689155, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b0d77aa2-d2ae-4039-8946-995a37f5406f', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.005092082499999984, 'withdrawal', 'approved', 0.250076833, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7a41b1ba-7b5e-4479-bc13-515176f6e8a5', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.035276792, 'withdrawal', 'approved', 0.214800041, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bf40fbce-c191-4033-993f-300e4792389b', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.011879031499999998, 'withdrawal', 'approved', 0.2029210095, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5184824e-c5ac-403f-8a49-cf88ef2d1d08', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.010036560700000002, 'withdrawal', 'approved', 0.1928844488, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c28ed8e7-ba13-4882-b0f7-24c1259d5cda', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.0026060804999999965, 'withdrawal', 'approved', 0.1902783683, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8f98f251-dc28-4e18-880c-e5876e86e038', '05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.008427028000000003, 'withdrawal', 'approved', 0.1818513403, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('914dae48-dcc6-4129-9b53-b77e4d5c000a', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-30', '2025-07-30', 'ETH', 0.06573271435, 'deposit', 'approved', 0.06573271435, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3b5c5763-973d-46d0-a442-a2550dcc1f73', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-07-31', '2025-07-31', 'ETH', 0.03801261685, 'deposit', 'approved', 0.1037453312, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dce1578d-a291-4fab-aaed-41265092ab93', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 0.00017624169999999606, 'withdrawal', 'approved', 0.1035690895, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a22ea40d-e319-497f-ba1d-06089bf5faec', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.003389802800000008, 'withdrawal', 'approved', 0.1001792867, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('643cbf69-05e9-4396-8e3b-12915fb0012e', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.0014446365799999916, 'withdrawal', 'approved', 0.09873465012, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('228fb57d-34fd-4476-ab54-7b85ec1f5a8d', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.0035834243900000062, 'withdrawal', 'approved', 0.09515122573, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bdfb5bff-80f8-4a11-814d-7b1344636c36', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.014924369039999996, 'withdrawal', 'approved', 0.08022685669, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4d9c0804-4c5a-40ba-95b8-aa292eb3d09f', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 2.5018150000000183e-05, 'withdrawal', 'approved', 0.08020183854, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4de2a16d-dae2-479f-a306-14ff5140aeb5', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.0024454148799999964, 'yield', 'approved', 0.08264725342, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6a4498b9-1583-4898-be16-139b1cef8fe5', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.002088173710000002, 'withdrawal', 'approved', 0.08055907971, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9947ea7e-82f3-44db-af99-1dff20705df2', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.011639011509999991, 'withdrawal', 'approved', 0.0689200682, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bcfb395a-38fc-472f-82c6-69f8351c257c', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.00045305848000000426, 'withdrawal', 'approved', 0.06846700972, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3acc7f8e-d79a-46ee-b852-9880f4aa3ea5', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 0.0009308526399999933, 'withdrawal', 'approved', 0.06753615708, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8c0f2a20-d7a6-419c-80a3-63990cbd8d62', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.0010686880400000015, 'withdrawal', 'approved', 0.06646746904, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a24e1687-3d15-46fc-9a91-551d4f1ae49d', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 3.3050200000009355e-05, 'withdrawal', 'approved', 0.06643441884, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('095c6f3f-567f-44e3-af88-f23ec462aca0', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.0011190994599999948, 'withdrawal', 'approved', 0.06531531938, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d1159c42-0835-4c84-becf-bf03747adedc', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.0009011035700000058, 'withdrawal', 'approved', 0.06441421581, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c48499dc-5552-4fdc-a7eb-cd0c8272bb05', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.0005861174300000049, 'yield', 'approved', 0.06500033324, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3a7170c2-8b7a-41c1-b837-e80375436fb5', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.0013047034299999982, 'withdrawal', 'approved', 0.06369562981, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('606dae06-7d8e-4a61-aa64-6814df9e4983', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.008997223450000001, 'withdrawal', 'approved', 0.05469840636, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9124732a-3d62-4268-803b-9b93f9aec8fb', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.003037866930000001, 'withdrawal', 'approved', 0.05166053943, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('20b5eca5-42d8-4fc0-a035-ca99cd33ab26', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.002575593799999998, 'withdrawal', 'approved', 0.04908494563, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('15b6f1f6-ecb6-40f1-8668-d63693162c6b', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.0006684140300000016, 'withdrawal', 'approved', 0.0484165316, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('25055f37-0bbc-4d15-9bfe-e9c5c4170fae', '0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.0021476428299999975, 'withdrawal', 'approved', 0.04626888877, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cda13ac9-be0e-4db8-8dbb-76415219dd4e', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-01', '2025-09-01', 'ETH', 1.76241656e-05, 'deposit', 'approved', 1.76241656e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b121596c-6df2-4789-961a-0df1749c9fce', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 2.6392950699999987e-06, 'yield', 'approved', 2.026346067e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('29c39723-265c-4364-a832-adfbd8d63da9', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 2.2805527300000026e-06, 'yield', 'approved', 2.25440134e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('35711fd0-7e03-409e-93be-587d8f753e44', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 5.430329200000031e-07, 'withdrawal', 'approved', 2.200098048e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('92a06171-123a-4da2-9523-ed107b9450e6', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 7.003310000000022e-07, 'yield', 'approved', 2.270131148e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3a839d7e-9dbe-48ff-8e84-1fb0b4427ee7', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 2.494735869999999e-06, 'yield', 'approved', 2.519604735e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f142aea6-69cf-4121-b099-1e4250129ca0', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 1.5861111099999998e-06, 'yield', 'approved', 2.678215846e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9ccc9186-30dd-4fa3-bca5-9ddb9054b2a4', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 1.9896839499999994e-06, 'yield', 'approved', 2.877184241e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f6237732-da0d-41de-8407-7e32365a85b0', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 2.6223407899999994e-06, 'withdrawal', 'approved', 2.614950162e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('458a50b5-e488-4356-a802-069a33a8a953', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 1.1852364000000085e-07, 'yield', 'approved', 2.626802526e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8ea91fb8-5d56-4f53-a297-7ce37e338d24', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 3.5713053999999976e-07, 'withdrawal', 'approved', 2.591089472e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fa9c36b2-81d3-4ef9-9fca-8ed76399124c', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 1.599694949999998e-06, 'yield', 'approved', 2.751058967e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('39891303-2630-41f3-9e04-509bcdfeacec', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 3.291340430000002e-06, 'yield', 'approved', 3.08019301e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a0fa74da-6817-4d2d-8363-08ba20c46fe9', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 4.656241800000003e-07, 'withdrawal', 'approved', 3.033630592e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2fcd944a-4c17-4c70-bf66-5d8311b45155', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 6.921853600000027e-07, 'yield', 'approved', 3.102798515e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('377e41b3-487b-4b21-9914-970a7abe6b00', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 1.3461823999999539e-07, 'yield', 'approved', 3.116260339e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('83d2fdab-946e-4a20-aa7f-e0e3433383f3', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 3.1943312799999975e-06, 'withdrawal', 'approved', 2.796827211e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d3038902-616d-4509-b69a-ce78e99ae44a', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 2.638133099999993e-07, 'withdrawal', 'approved', 2.77044588e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('32843743-51de-488d-92c8-81dffa93d446', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 6.628853799999991e-07, 'yield', 'approved', 2.836734418e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('179bc64a-e8a5-4653-8395-3c9a6aa8c53b', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 1.3596293999999987e-07, 'yield', 'approved', 2.850330712e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ee66be15-3fa0-4d62-9fcc-8a0aae36496e', '959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 9.266703499999976e-07, 'withdrawal', 'approved', 2.757663677e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ca353911-9a1d-43d2-b703-1f8d37c94f1b', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-04', '2025-09-04', 'ETH', 0.03241933981, 'deposit', 'approved', 0.03241933981, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('132f89e6-4755-4244-b7b4-a73d8ee809e5', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 0.013698274189999998, 'deposit', 'approved', 0.046117614, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('acc2609a-64b9-41e6-b643-5ae89fca4563', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 0.024722970090000004, 'deposit', 'approved', 0.07084058409, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e1536500-9d82-42a7-9241-003771b07b16', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.011103544230000005, 'withdrawal', 'approved', 0.05973703986, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2849c28d-1339-41e5-abe8-bcc6dadc7195', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 1.3971420000001566e-05, 'withdrawal', 'approved', 0.05972306844, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d234c668-ebdc-495f-bed5-1feb30b3d78c', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.02877020999, 'withdrawal', 'approved', 0.03095285845, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1f1fd9b6-e78d-47ee-9b20-c90c7bcebeab', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.0007795614999999978, 'withdrawal', 'approved', 0.03017329695, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('98683ad2-c03d-4562-b177-b8dc8d94f359', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.00435793948, 'withdrawal', 'approved', 0.02581535747, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('91412302-7885-480b-83a9-1cf48cfa484c', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.00016942994000000017, 'withdrawal', 'approved', 0.02564592753, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c7e86817-7d9e-4d41-a338-1309fce803da', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 0.0003486727300000027, 'withdrawal', 'approved', 0.0252972548, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a8daa8e2-c3f9-4a27-afa8-3b180d2ca285', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.00039842025999999725, 'withdrawal', 'approved', 0.02489883454, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cf9f3079-fcd3-4613-872e-b36f8db58d8b', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 9.285500000000974e-06, 'withdrawal', 'approved', 0.02488954904, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4e8e0e80-7f4b-4e14-bfed-5c7d8a496879', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.00041921896999999944, 'withdrawal', 'approved', 0.02447033007, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fe447170-a7ab-491a-aaf1-08ddcb7e4a1c', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.0003372061699999998, 'withdrawal', 'approved', 0.0241331239, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('766955e3-066f-4888-8c41-e26d1d0a5a1d', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.0241331239, 'withdrawal', 'approved', 0, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('aefde419-8fca-4967-95c5-4e214d4e6b3f', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-10', '2025-09-10', 'ETH', 6.244348626e-07, 'deposit', 'approved', 6.244348626e-07, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('faa9defa-e04d-408e-ab24-09a869973936', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-12', '2025-09-12', 'ETH', 7.373246170000004e-08, 'yield', 'approved', 6.981673243e-07, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f7695673-beae-489b-9c59-c72c3bbee671', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 2.2084142437e-06, 'deposit', 'approved', 2.906581568e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bef56396-7e8a-497d-8aa1-9607f944b8aa', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 1.3962351130000005e-06, 'deposit', 'approved', 4.302816681e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('53416210-625e-41f8-990f-c608a0dace63', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 5.879691339999993e-07, 'yield', 'approved', 4.890785815e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e5907a5e-8d01-4f6c-a342-53ba576483ff', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 6.253794620000002e-07, 'yield', 'approved', 5.516165277e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('91c37e91-1754-40fb-8935-00e356cdc057', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 3.6588977699999983e-07, 'withdrawal', 'approved', 5.1502755e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('60921dfb-98ee-4d91-b487-da0528aeed3c', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 4.7731187999999616e-08, 'yield', 'approved', 5.198006688e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('484c149b-eeaf-4898-b8f3-5e4bf466737a', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 7.067021399999975e-08, 'withdrawal', 'approved', 5.127336474e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5854e9e9-4a41-415d-96fa-9da98ff54a13', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 4.834526860000002e-07, 'yield', 'approved', 5.61078916e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ec5cd340-023b-4ad8-acb7-29b0b06c35d8', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 9.257598979999997e-07, 'yield', 'approved', 6.536549058e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('37abc67e-243d-4cd3-8c70-5226cc9c842b', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 9.514967899999963e-08, 'withdrawal', 'approved', 6.441399379e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3973829a-c0c5-45ac-881c-d3ba4dbfd02e', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 2.8591202999999566e-08, 'yield', 'approved', 6.469990582e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cee05aa8-871a-44e1-bb3d-85d1bcc69a18', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 1.758074200000003e-07, 'yield', 'approved', 6.645798002e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9b26ae20-9f49-4f27-a549-66b4801f1bf7', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 1.3339616900000025e-07, 'withdrawal', 'approved', 6.512401833e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('af3bbfd9-112a-4068-a247-80dd30b65edb', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 9.198988169999997e-07, 'withdrawal', 'approved', 5.592503016e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1f3d37e7-0886-4c5d-8a2f-83c421cf4663', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 3.1059917600000044e-07, 'withdrawal', 'approved', 5.28190384e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2bc9f2a1-9658-4ecb-b66b-b26b4d1ed3d0', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 2.633352059999997e-07, 'withdrawal', 'approved', 5.018568634e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('383fb41f-5873-4c4f-9c83-cc73e0640e08', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 6.834033600000047e-08, 'withdrawal', 'approved', 4.950228298e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7385b0f1-4407-462d-8627-590cdb2528c3', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 2.1958041899999978e-07, 'withdrawal', 'approved', 4.730647879e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('328a7a1e-665f-4945-8647-5e5a0429e8d4', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-27', '2025-09-27', 'ETH', 0.1564126717, 'deposit', 'approved', 0.1564126717, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('703c82de-000e-495f-b36c-cb1f884d8051', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-09-30', '2025-09-30', 'ETH', 4.877620000001692e-05, 'withdrawal', 'approved', 0.1563638955, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f7fbb955-bb3e-4e31-ba5b-b5941488e337', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-03', '2025-10-03', 'ETH', 0.004767653800000021, 'yield', 'approved', 0.1611315493, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('324f4ab9-b418-4c0a-a085-c619c684fd18', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-08', '2025-10-08', 'ETH', 0.020872313699999978, 'yield', 'approved', 0.182003863, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7d653d26-ac15-4630-881f-b39d4b59b91f', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-14', '2025-10-14', 'ETH', 0.11003723500000001, 'deposit', 'approved', 0.292041098, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('46541997-28dc-495c-b0bb-927d12c96054', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-17', '2025-10-17', 'ETH', 0.0019197847999999906, 'withdrawal', 'approved', 0.2901213132, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('953af7fa-ec13-4ace-b0ae-3eefee6d37a1', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-20', '2025-10-20', 'ETH', 0.009651253299999996, 'yield', 'approved', 0.2997725665, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d41346e9-446b-4352-b87a-bcf0978b24ea', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-23', '2025-10-23', 'ETH', 0.00833125010000002, 'yield', 'approved', 0.3081038166, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c96bd0fd-91d7-4a53-8cc3-1e5e87b3ddd2', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-10-31', '2025-10-31', 'ETH', 0.00015320120000000825, 'withdrawal', 'approved', 0.3079506154, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('36b4b9aa-381b-4af6-8eee-399f3c4fe63b', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-03', '2025-11-03', 'ETH', 0.005187482200000038, 'withdrawal', 'approved', 0.3027631332, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('11579f93-58d0-43eb-9b80-a98a12e4f1f2', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-04', '2025-11-04', 'ETH', 0.009555222700000032, 'yield', 'approved', 0.3123183559, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3997ed0c-c761-45a4-a4b9-f67041498b43', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-05', '2025-11-05', 'ETH', 0.018029819199999964, 'yield', 'approved', 0.3303481751, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('51e610df-dca4-49af-a928-66b4151d6ea7', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-07', '2025-11-07', 'ETH', 0.013324898299999999, 'yield', 'approved', 0.3436730734, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('66c997b8-8052-4676-977b-9562561281c8', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.03810511779999998, 'withdrawal', 'approved', 0.3055679556, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('382526cd-9117-4ba4-81f6-c9fa937f29cf', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.016970783099999998, 'withdrawal', 'approved', 0.2885971725, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c1621906-5c92-42bd-97ac-1e5de04959c0', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.014388333899999994, 'withdrawal', 'approved', 0.2742088386, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('344e6905-2be9-40fb-9958-12f2bcfe3de1', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.009777059599999971, 'yield', 'approved', 0.2839858982, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('70a4e265-6940-4035-a7fb-382c90b61306', 'a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.012596942799999955, 'withdrawal', 'approved', 0.2713889554, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f658d647-8bd8-4b1a-af79-94a8b35f5524', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-17', '2025-11-17', 'ETH', 0.1306239471, 'deposit', 'approved', 0.1306239471, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('99cf7fbf-07bc-46ca-89b6-948da3c7c987', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 0.0480480861, 'deposit', 'approved', 0.1786720332, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('90c15cc2-ee92-41ff-bb7f-d48ff63c7572', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 0.040552538200000016, 'deposit', 'approved', 0.2192245714, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('00fbc0cb-fee4-482e-96b3-5225702c3010', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 0.002985289600000024, 'withdrawal', 'approved', 0.2162392818, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a8c1c0fe-666f-43ca-88af-fed16837d89f', '85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.009591863099999987, 'withdrawal', 'approved', 0.2066474187, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5a36e775-3fda-44e5-847f-b18acfa38240', '174d213f-9455-5d16-aa36-2e3557272ae5', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-25', '2025-11-25', 'ETH', 3.079429418e-06, 'deposit', 'approved', 3.079429418e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('090d0194-2873-4e09-b67b-4cd56320a47e', '174d213f-9455-5d16-aa36-2e3557272ae5', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-11-30', '2025-11-30', 'ETH', 6.916228322e-06, 'deposit', 'approved', 9.99565774e-06, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a0c126ee-7509-4f06-b4b4-91dfe1a662a3', '174d213f-9455-5d16-aa36-2e3557272ae5', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-02', '2025-12-02', 'ETH', 2.19639477e-06, 'deposit', 'approved', 1.219205251e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e56305a6-a892-44e7-a724-c5be28ac4075', '174d213f-9455-5d16-aa36-2e3557272ae5', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 9.672959599999998e-07, 'yield', 'approved', 1.315934847e-05, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('10d79556-25e0-44a4-8b85-6c8bb83e4c0d', '69c51f1e-4eb5-5633-9198-a0754e304af1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', '2025-12-04', '2025-12-04', 'ETH', 0.04428789248, 'deposit', 'approved', 0.04428789248, 'Reconciled from ETH Yield Fund', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0c5dae28-5dde-4e5b-ac74-1d7b2c1f55f7', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2024-12-14', '2024-12-14', 'BTC', 2.0336, 'deposit', 'approved', 2.0336, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('843eeba5-4ddf-4045-99d6-68f9052243a0', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-01-01', '2025-01-01', 'BTC', 0.006260895000000044, 'yield', 'approved', 2.039860895, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('806b3911-85d5-4639-aec4-0c113c36f554', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-02-01', '2025-02-01', 'BTC', 0.017921258999999967, 'yield', 'approved', 2.057782154, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a72fedb8-32c6-4004-aa76-1c1d79b0d4f5', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-03-01', '2025-03-01', 'BTC', 0.016402611000000178, 'yield', 'approved', 2.074184765, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('69c54c3f-6bc5-424c-9ba2-4863f435d57d', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-01', '2025-04-01', 'BTC', 0.01637975299999983, 'yield', 'approved', 2.090564518, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3996afc0-5158-4cab-aa17-49bef3d759f0', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-16', '2025-04-16', 'BTC', 0.010409087000000206, 'yield', 'approved', 2.100973605, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('67c44fda-dae4-429e-a492-9deb1dec1d21', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2024-12-14', '2024-12-14', 'BTC', 4.6717, 'deposit', 'approved', 4.6717, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4863c6c5-2d09-46a5-ba2d-bb7b429eb33a', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-01-01', '2025-01-01', 'BTC', 0.015228931999999418, 'yield', 'approved', 4.686928932, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('48544f7a-a669-4f9d-8c2c-d7d15ce54f39', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-02-01', '2025-02-01', 'BTC', 0.043599339000000015, 'yield', 'approved', 4.730528271, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('86298c4b-3825-4d0e-a819-b0567865d073', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-03-01', '2025-03-01', 'BTC', 0.039925174000000396, 'yield', 'approved', 4.770453445, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f51e37cf-d733-46de-8a5e-edd1f72f8246', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-01', '2025-04-01', 'BTC', 0.03988808200000005, 'yield', 'approved', 4.810341527, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('897698b4-1ee6-4b82-9c0f-c7b21833066c', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-16', '2025-04-16', 'BTC', 0.025359959999999404, 'yield', 'approved', 4.835701487, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('baa19a6f-64cb-434c-a44e-c737e1266269', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2024-12-14', '2024-12-14', 'BTC', 4.8628, 'deposit', 'approved', 4.8628, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f09d6c0b-1a66-440c-9ffd-bfaa23be814e', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-01-01', '2025-01-01', 'BTC', 0.01585188500000001, 'yield', 'approved', 4.878651885, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9a4d68c6-bb8e-498a-b338-23cfb393268b', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-02-01', '2025-02-01', 'BTC', 0.045382808000000274, 'yield', 'approved', 4.924034693, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('02d6ac3a-a0e3-4e7a-a161-bd27d896394d', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-03-01', '2025-03-01', 'BTC', 0.04155834899999977, 'yield', 'approved', 4.965593042, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c6393455-2bee-4d36-9234-0f5c1da38fde', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-01', '2025-04-01', 'BTC', 0.041519738999999944, 'yield', 'approved', 5.007112781, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cd167f30-6f94-47e5-adb8-56cd08207099', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-16', '2025-04-16', 'BTC', 0.02639733100000008, 'yield', 'approved', 5.033510112, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b2d54281-5d5e-4926-8453-c8d041e310ff', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2024-12-14', '2024-12-14', 'BTC', 0.1757937777, 'deposit', 'approved', 0.1757937777, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bb4ef4cf-d6ce-4905-94d2-c51b56cd4e57', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-01-01', '2025-01-01', 'BTC', 9.516479999999161e-05, 'withdrawal', 'approved', 0.1756986129, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1d3708e8-4cfc-45f3-9a23-563affb15cae', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-02-01', '2025-02-01', 'BTC', 0.0002696142999999984, 'withdrawal', 'approved', 0.1754289986, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b8f955ba-a00c-45f9-9aa1-3f7587b4fd1c', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-03-01', '2025-03-01', 'BTC', 0.00024447450000000814, 'withdrawal', 'approved', 0.1751845241, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f7f2b28c-f5c7-4c1a-add2-b9c914e840da', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-01', '2025-04-01', 'BTC', 0.00024188659999999085, 'withdrawal', 'approved', 0.1749426375, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fde8d12a-4703-409a-98d1-c466211ba78c', '2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-16', '2025-04-16', 'BTC', 0.00015282010000000623, 'withdrawal', 'approved', 0.1747898174, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9eae3a3f-ad0f-4efd-ab5f-2de9ce1f0874', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2024-12-14', '2024-12-14', 'BTC', 0.4038433278, 'deposit', 'approved', 0.4038433278, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d5b82bc9-c8ca-430a-9415-654b427256da', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-01-01', '2025-01-01', 'BTC', 0.00014574540000000802, 'withdrawal', 'approved', 0.4036975824, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0b59e3bc-18a4-47ad-bad4-7bc9f7ccc5e5', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-02-01', '2025-02-01', 'BTC', 0.0004129897999999854, 'withdrawal', 'approved', 0.4032845926, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ad9a588c-90de-4093-bfe0-59d373537de4', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-03-01', '2025-03-01', 'BTC', 0.0003746732000000086, 'withdrawal', 'approved', 0.4029099194, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e57f40b2-3267-49ec-a431-e4938fa798a1', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-01', '2025-04-01', 'BTC', 0.0003708793999999682, 'withdrawal', 'approved', 0.40253904, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a9f22137-3998-4f36-9ce1-8311c4808b99', 'be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-16', '2025-04-16', 'BTC', 0.0002344237999999943, 'withdrawal', 'approved', 0.4023046162, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('39b17eb1-e547-4b8c-9176-5ad89c6529d6', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2024-12-14', '2024-12-14', 'BTC', 0.4203628945, 'deposit', 'approved', 0.4203628945, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3e3189e2-406b-4227-81e8-fc184042c9fa', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-01-01', '2025-01-01', 'BTC', 0.00015170719999996196, 'withdrawal', 'approved', 0.4202111873, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('77e6948f-3db7-458b-a2bd-fa4cd0292f65', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-02-01', '2025-02-01', 'BTC', 0.0004298836000000139, 'withdrawal', 'approved', 0.4197813037, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1583be49-cbf3-4a2b-ae9b-004b59fa110b', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-03-01', '2025-03-01', 'BTC', 0.0003899995000000156, 'withdrawal', 'approved', 0.4193913042, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3af5864d-0c0a-4172-a03f-92ae2950547f', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-01', '2025-04-01', 'BTC', 0.000386050499999957, 'withdrawal', 'approved', 0.4190052537, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('50b6ea68-6f92-4e5c-b5f8-80db33a8e74a', 'f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', '2025-04-16', '2025-04-16', 'BTC', 0.00024401310000005116, 'withdrawal', 'approved', 0.4187612406, 'Reconciled from DONE - BTC Boosted Program', 'BTC')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('256ae725-a00f-4bb8-b5eb-db8b118c5986', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-08-01', '2024-08-01', 'ETH', 62.116, 'deposit', 'approved', 62.116, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d6ba5e12-65db-477c-8bf4-b88020f0f075', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-09-01', '2024-09-01', 'ETH', 0.43891184000000294, 'yield', 'approved', 62.55491184, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9d82e868-1479-4a75-9ef7-79f7d7f27f07', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-01', '2024-10-01', 'ETH', 0.4062783199999984, 'yield', 'approved', 62.96119016, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1b425e78-1c71-461f-af74-cd6721f86fa3', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-24', '2024-10-24', 'ETH', 0.2445399100000003, 'yield', 'approved', 63.20573007, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a5521b1a-e775-4aad-9df4-f6a2a34e65e9', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-02-01', '2025-02-01', 'ETH', 0.28390935999999556, 'yield', 'approved', 63.48963943, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e29c390d-49b2-401f-980a-3809fd301fd9', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-03-01', '2025-03-01', 'ETH', 0.6298416799999984, 'yield', 'approved', 64.11948111, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f4dc55c3-3a77-443d-b818-c1a3ba8ef15b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-04-01', '2025-04-01', 'ETH', 0.14606224000000623, 'yield', 'approved', 64.26554335, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('425f8a16-ea92-4d8e-8569-410a327f6feb', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-05-01', '2025-05-01', 'ETH', 0.614831229999993, 'yield', 'approved', 64.88037458, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('12e708d4-83d6-401d-bd8a-d65b12a61802', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-06-01', '2025-06-01', 'ETH', 0.12296219000000974, 'yield', 'approved', 65.00333677, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c3030062-433e-43eb-85e6-91d866d6183d', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-07-01', '2025-07-01', 'ETH', 0.11779598999999052, 'yield', 'approved', 65.12113276, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('48ef2679-70d2-42e2-a057-940eecd79d8d', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-07-11', '2025-07-11', 'ETH', 2.4949950199999975, 'withdrawal', 'approved', 62.62613774, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9d9204c1-c54a-4f68-8b64-f54fdb7b6e0f', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-01', '2024-10-01', 'ETH', 17, 'deposit', 'approved', 17, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('aa7754e2-da3f-4686-ba5d-227fc875ec40', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-24', '2024-10-24', 'ETH', 0.08253454999999832, 'yield', 'approved', 17.08253455, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4e59e5f5-e5a3-4a76-8ce8-82512c45113a', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-02-01', '2025-02-01', 'ETH', 0.09591478000000109, 'yield', 'approved', 17.17844933, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b8d7a141-ee14-47bc-abd1-6c5c36866bd9', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-03-01', '2025-03-01', 'ETH', 4.821021050000002, 'deposit', 'approved', 21.99947038, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3b566149-d2d8-48a1-abb9-ace7d12afcd7', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-04-01', '2025-04-01', 'ETH', 5.288642659999997, 'deposit', 'approved', 27.28811304, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5b897f86-8b1f-4156-ba89-ed8fe8994e19', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-05-01', '2025-05-01', 'ETH', 0.32633320000000055, 'yield', 'approved', 27.61444624, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a4a0f4f2-4d73-4a47-9522-386518d29ff6', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-06-01', '2025-06-01', 'ETH', 0.06541909999999973, 'yield', 'approved', 27.67986534, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4429e3a2-7b75-4939-9da8-3f6f7e19b959', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-07-01', '2025-07-01', 'ETH', 0.06270019000000104, 'yield', 'approved', 27.74256553, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8bd27e1e-61e9-4b41-9967-60f159de4610', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-07-11', '2025-07-11', 'ETH', 1.0629047800000002, 'withdrawal', 'approved', 26.67966075, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ab43ffac-f75a-46de-8885-04715e76c124', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-24', '2024-10-24', 'ETH', 120, 'deposit', 'approved', 120, 'Reconciled from Done - ETH TAC Program (Matched Investment Date: 2024-10-24T00:00:00)', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5838f98d-ee7d-4476-aeee-0e2a69553d58', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-02-01', '2025-02-01', 'ETH', 0.6737743999999992, 'yield', 'approved', 120.6737744, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8258ec6f-d529-4c4a-adc3-294b3fca55fd', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-03-01', '2025-03-01', 'ETH', 1.4964128999999957, 'yield', 'approved', 122.1701873, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9312aa6d-a81f-435b-bd57-119323eaeb91', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-04-01', '2025-04-01', 'ETH', 0.34787500000000193, 'yield', 'approved', 122.5180623, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0512da9d-e735-4327-8c20-359f202f147a', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-05-01', '2025-05-01', 'ETH', 1.4651695000000018, 'yield', 'approved', 123.9832318, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('eb0436b9-9cf4-4f08-956f-329bf7a64016', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-06-01', '2025-06-01', 'ETH', 0.2937184999999971, 'yield', 'approved', 124.2769503, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9e5fd65e-677d-4a17-9817-e21587920c38', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-07-01', '2025-07-01', 'ETH', 0.28151100000000895, 'yield', 'approved', 124.5584613, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d57d2925-8278-4d3c-b12f-0d74e9a1c273', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-07-11', '2025-07-11', 'ETH', 4.772225700000007, 'withdrawal', 'approved', 119.7862356, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('adc92336-14a1-4f92-b304-7d5a819ae25b', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-08-01', '2024-08-01', 'ETH', 0.997526899, 'deposit', 'approved', 0.997526899, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2158ec38-8241-4a48-8f13-b44452b4df2c', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-09-01', '2024-09-01', 'ETH', 0.0017467042000000044, 'withdrawal', 'approved', 0.9957801948, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8f7c7155-9763-4fee-ae58-275e554cb54c', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-01', '2024-10-01', 'ETH', 0.21199841770000005, 'withdrawal', 'approved', 0.7837817771, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('75e62560-24cf-4e60-bdde-5810953dce05', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-24', '2024-10-24', 'ETH', 0.4688867489, 'withdrawal', 'approved', 0.3148950282, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3b16115c-351b-417e-9684-8818c59b6aff', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-02-01', '2025-02-01', 'ETH', 0.000351639299999984, 'withdrawal', 'approved', 0.3145433889, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('419f4c54-f0cd-483a-b670-1c530c7d73ad', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-03-01', '2025-03-01', 'ETH', 0.007689948900000021, 'withdrawal', 'approved', 0.30685344, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f296a6de-e411-49dd-980c-41c6013d9f12', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-04-01', '2025-04-01', 'ETH', 0.007636368699999951, 'withdrawal', 'approved', 0.2992170713, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b9b347bd-e500-4bd7-b54e-592b6061d49f', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-05-01', '2025-05-01', 'ETH', 0.0007071985000000058, 'withdrawal', 'approved', 0.2985098728, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('54ff5b70-e963-4755-8d34-2ed7ad7e6cbc', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-06-01', '2025-06-01', 'ETH', 0.00014110070000000752, 'withdrawal', 'approved', 0.2983687721, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6840da77-9034-464c-9b3c-004f62fd0660', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-07-01', '2025-07-01', 'ETH', 0.00013486700000003848, 'withdrawal', 'approved', 0.2982339051, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8baf0629-1d19-416a-8abe-23b4b2713587', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-01', '2024-10-01', 'ETH', 0.2116270385, 'deposit', 'approved', 0.2116270385, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cec92678-f057-4caf-8ebb-6616b2f918db', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-24', '2024-10-24', 'ETH', 0.12652074842, 'withdrawal', 'approved', 0.08510629008, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f9915922-9b54-4199-9a50-2f14cf887cec', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-03-01', '2025-03-01', 'ETH', 0.020175490820000003, 'deposit', 'approved', 0.1052817809, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('856ab4fc-0758-4fd9-9c62-75bebcce5520', '35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-04-01', '2025-04-01', 'ETH', 0.021770272800000004, 'deposit', 'approved', 0.1270520537, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('166d0557-7d33-46e6-bec7-329f69508e11', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2024-10-24', '2024-10-24', 'ETH', 0.5978477481, 'deposit', 'approved', 0.5978477481, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('edf2eca7-c6a8-4c73-b9a4-bbbb765308fa', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-03-01', '2025-03-01', 'ETH', 0.013183904999999996, 'withdrawal', 'approved', 0.5846638431, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d8a9857d-0266-4a69-a1ee-15e09b12c98f', '05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', '2025-04-01', '2025-04-01', 'ETH', 0.014226033499999957, 'withdrawal', 'approved', 0.5704378096, 'Reconciled from Done - ETH TAC Program', 'ETH')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6540f612-8190-427b-a627-80e436fb59cd', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-06-16', '2025-06-16', 'USDT', 135726.75, 'deposit', 'approved', 135726.75, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-06-16T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ef42cec8-597c-4ae0-8fb6-798a72eacfa2', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-01', '2025-07-01', 'USDT', 448.652299999987, 'yield', 'approved', 136175.4023, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a9d14899-5a90-4f3e-a45d-217f0e7be049', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 167.59820000000764, 'yield', 'approved', 136343.0005, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9d896206-5be6-495a-8cd3-a0cb29a6c240', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 47117.92550000001, 'deposit', 'approved', 183460.926, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5d419edd-a514-4690-ba45-999645ed5ecd', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 185.32079999998678, 'yield', 'approved', 183646.2468, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9821e9be-babe-4c90-ae89-615a111182f8', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 334.84840000001714, 'yield', 'approved', 183981.0952, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c1f4cdb4-7af3-4fc1-a49f-a0f12d0ebdf4', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 10081.116500000004, 'yield', 'approved', 194062.2117, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ea351157-a68b-487e-a58c-83f084f147a4', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 593.0928999999887, 'yield', 'approved', 194655.3046, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8c483680-9e1b-4a2c-8326-2370e3c5b052', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 254.79269999999087, 'yield', 'approved', 194910.0973, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a6d923f5-3a2b-40eb-a211-26907ea2a082', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 613.2467000000179, 'yield', 'approved', 195523.344, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d51a4d4c-ef99-453d-b679-21b77d3e2ee1', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 11036.762399999978, 'yield', 'approved', 206560.1064, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('03f96323-55ae-426e-b922-872509129e5e', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 350.2358999999997, 'yield', 'approved', 206910.3423, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4bb3ca2d-8b24-49ea-a5fe-f0bd40dee019', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 152.90400000000955, 'yield', 'approved', 207063.2463, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0c594549-b3ad-4ef4-a96e-3b80ebf68fab', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 20301.13990000001, 'yield', 'approved', 227364.3862, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ef2a2d5-aa7f-42e8-8384-5a6eb751b90d', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 219.27549999998882, 'yield', 'approved', 227583.6617, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('733b344f-d1cf-4f59-a7f4-6cbbe13adfa4', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 205.93429999999353, 'yield', 'approved', 227789.596, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b78db5a7-a903-478f-a209-89631f8bffc8', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 10723.680500000017, 'yield', 'approved', 238513.2765, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b66c7ae3-a944-4913-8ed0-6448d2013119', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 520.9157999999879, 'yield', 'approved', 239034.1923, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('df8c1c14-1112-4331-b280-5ff6bd9aef90', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 43.889300000009825, 'yield', 'approved', 239078.0816, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1ac248fb-09e5-418f-a591-83cec53afa56', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 52.32619999998133, 'yield', 'approved', 239130.4078, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('795edc79-9fb2-4014-bfb6-88c0ff068def', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 262.8221000000194, 'yield', 'approved', 239393.2299, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('69da58fe-614e-4c83-b0aa-5ee02c9603a9', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 34.39179999998305, 'yield', 'approved', 239427.6217, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('20f12897-9cc0-4550-a334-b181f40f019d', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 306.9165000000212, 'yield', 'approved', 239734.5382, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dfbd4cd9-a740-41d3-a16f-e97c038e0b75', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 351.1756999999925, 'yield', 'approved', 240085.7139, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e626757b-9809-4847-b1bf-5acb336c95f5', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 161.0749000000069, 'yield', 'approved', 240246.7888, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e8caae4c-6f0a-431b-a95f-668a9bb123ad', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 41.180099999997765, 'yield', 'approved', 240287.9689, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d0f62c75-6deb-406e-b401-8752ac05c8c4', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 374.68899999998393, 'yield', 'approved', 240662.6579, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ca863d17-8732-4033-a0db-e9225bce9dfd', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 109392, 'deposit', 'approved', 109392, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-07-14T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b300c241-0d50-4991-9191-0c43baf34d8e', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 146.80719999999565, 'yield', 'approved', 109538.8072, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('78aa9f2b-49c8-4381-8513-80235a4f4aa7', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 124.48040000000037, 'yield', 'approved', 109663.2876, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('167df37a-8b92-4c33-ae85-2e233a966292', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 224.94690000000992, 'yield', 'approved', 109888.2345, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ebd2efa6-d48c-4d63-91c9-05d5e25202cc', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 54.5054999999993, 'yield', 'approved', 109942.74, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b6ffbfe9-4e9c-4ee3-9a5f-ff6f07a36652', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 378.00779999999213, 'yield', 'approved', 110320.7478, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fcea1e49-73f7-43d2-bf66-999f9d964f66', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 162.4539999999979, 'yield', 'approved', 110483.2018, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5966dba5-5e42-4e1c-8aba-e20af1952aae', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 391.0656000000017, 'yield', 'approved', 110874.2674, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('abef57bd-e91d-4236-9476-cfc315e5a5d7', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 661.3996000000043, 'yield', 'approved', 111535.667, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('279869ea-302d-4f9c-87cd-bd8395f6d7dd', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 212.75539999999455, 'yield', 'approved', 111748.4224, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2575909e-b945-4b8e-9beb-4ad75585851b', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 92.90320000000065, 'yield', 'approved', 111841.3256, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a5531d2b-2ade-435a-be30-8e86e013758a', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 182.98690000000352, 'yield', 'approved', 112024.3125, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f20af812-bb07-42ea-bb3e-c0364ad697b1', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 121.54369999999471, 'yield', 'approved', 112145.8562, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0457c0de-143b-41fe-b652-97a4b40e3a12', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 114.16250000000582, 'yield', 'approved', 112260.0187, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5119a495-6742-45ec-b9b8-f09da4e495c9', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 151.73559999999998, 'yield', 'approved', 112411.7543, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('eae39f58-0018-4c6a-8d8a-4b29f94dab01', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 276.19719999999506, 'yield', 'approved', 112687.9515, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f1666557-6319-4965-8877-03dba1165d21', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 23.277100000006612, 'yield', 'approved', 112711.2286, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3b13612e-4b0c-4d75-a6dc-ebf0ff0ee501', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 27.75229999999283, 'yield', 'approved', 112738.9809, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d788da1f-36db-4c56-9b62-3972b69e4957', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 139.39710000000196, 'yield', 'approved', 112878.378, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('be43b5cb-214e-4202-a0e4-0212c15c8cef', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 18.24340000000666, 'yield', 'approved', 112896.6214, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b9cf1ec4-6dcb-49eb-a484-7ab81c743a1b', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 162.80939999999828, 'yield', 'approved', 113059.4308, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6f82d6a8-d858-4beb-96fd-3408d84d46e4', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 186.31729999999516, 'yield', 'approved', 113245.7481, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4a5dd53d-5132-40fb-9ffd-5a9e7737aa4a', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 85.47440000000643, 'yield', 'approved', 113331.2225, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d298a15d-c47a-441c-8022-ccefbe603c6a', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 21.853999999992084, 'yield', 'approved', 113353.0765, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1271ac56-b528-40d8-a6c3-e09e4d1a0d1d', '4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 198.84970000000612, 'yield', 'approved', 113551.9262, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9c2c7f88-6c13-4601-8489-f9affde2a0de', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 109776, 'deposit', 'approved', 109776, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-07-14T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('83467303-3af3-4618-9b5f-274eabd86c60', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 147.3225999999995, 'yield', 'approved', 109923.3226, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2732a25b-954c-47ee-b337-ea209f136cda', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 124.91730000000098, 'yield', 'approved', 110048.2399, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8eb01e48-219b-4a84-bb51-a60f5f77919c', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 225.73660000000382, 'yield', 'approved', 110273.9765, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c5a36c5b-07fd-4bc9-b5fd-b955a2a76e3f', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 54.69670000000042, 'yield', 'approved', 110328.6732, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9804422a-1958-4d84-bbad-64e4c81434a6', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 379.3347999999969, 'yield', 'approved', 110708.008, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('09f6e634-ac44-4b20-91ad-04e016271cd0', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 163.0243000000046, 'yield', 'approved', 110871.0323, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b2c00d63-8332-4008-af02-1cbcec75a1e8', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 392.4383999999991, 'yield', 'approved', 111263.4707, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('43c1cc00-7494-4880-bc12-bc199065848e', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 663.7212, 'yield', 'approved', 111927.1919, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('74441549-1895-4277-b05b-dc350f8256bf', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 213.50229999999283, 'yield', 'approved', 112140.6942, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d1167ae6-8607-4f55-9bb7-a606ebc49d36', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 93.22930000000633, 'yield', 'approved', 112233.9235, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0ceabc4f-db12-4806-a93f-c8e8ef9527f8', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 183.62919999999576, 'yield', 'approved', 112417.5527, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bba7c868-ebc3-4ec0-8d4c-d9b4ad847768', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 121.97040000000561, 'yield', 'approved', 112539.5231, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f20cedcc-d3fe-4a0d-b8fb-cf1a304307f6', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 114.56319999998959, 'yield', 'approved', 112654.0863, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c8d708cb-968f-41c3-ab6e-6fe2f64276c2', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 152.26830000001064, 'yield', 'approved', 112806.3546, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('de5ae006-9792-4dc7-970f-ccfcb2e2a0b5', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 277.16669999998703, 'yield', 'approved', 113083.5213, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('99756485-3c19-4e97-b94a-5bf54dc710c0', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 23.358800000001793, 'yield', 'approved', 113106.8801, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ea91c82e-bd3b-478a-b50d-eb9cac6e56f8', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 27.849700000006123, 'yield', 'approved', 113134.7298, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2022f5db-dba3-46d5-b9be-ff5ed44a160d', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 139.88640000000305, 'yield', 'approved', 113274.6162, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7ddd75e0-8bf1-400a-be42-9f69d10f2d4e', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 18.307499999995343, 'yield', 'approved', 113292.9237, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('981ac133-e70e-41b5-b0d8-fe67cc799d6d', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 163.38090000000375, 'yield', 'approved', 113456.3046, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b36f2996-7178-496b-a75a-b2d7ac477e6d', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 186.9713999999949, 'yield', 'approved', 113643.276, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('51a0737e-6f34-418e-99bf-445b6c220ca5', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 85.77439999999478, 'yield', 'approved', 113729.0504, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e17834a5-ce83-4148-97fe-117d0a3ea136', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 21.93070000001171, 'yield', 'approved', 113750.9811, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9cb66398-6f47-4ad7-b910-342aa5dc8b40', 'b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 199.54769999999553, 'yield', 'approved', 113950.5288, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8f921319-972b-448b-b80b-95ff1d554523', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 109333, 'deposit', 'approved', 109333, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('10c57547-1680-48bb-bdfe-b67b2a070b6a', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 146.7280000000028, 'yield', 'approved', 109479.728, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('27b577ee-adba-4cf7-98e7-080ec73d05e8', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 124.41330000000016, 'yield', 'approved', 109604.1413, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9ae2c864-32e9-4cd1-9d5b-32a7736e0693', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 224.82559999999648, 'yield', 'approved', 109828.9669, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('eca1c9f9-dccc-4d03-8bc2-ebb221aaa224', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 54.47599999999511, 'yield', 'approved', 109883.4429, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('76586391-18ab-4740-8af5-904116727b6a', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 377.8040000000037, 'yield', 'approved', 110261.2469, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5d7bf3d8-f30c-4533-a0e9-1605736b976b', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 162.36639999999898, 'yield', 'approved', 110423.6133, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('51a178b9-31fb-49f0-b06f-3fac8b72e847', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 390.8546999999962, 'yield', 'approved', 110814.468, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c8aa5fc3-935b-42f1-a51c-c1e73c1c5d4d', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 661.0428000000102, 'yield', 'approved', 111475.5108, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('962bc3bc-2fec-421d-b4b4-dcf5813692f2', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 212.64070000000356, 'yield', 'approved', 111688.1515, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('30475476-85a6-48bb-8b8c-56462c8bc953', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 92.85299999998824, 'yield', 'approved', 111781.0045, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d5e9bb41-de6f-4271-902b-dff052be07aa', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 182.88830000000598, 'yield', 'approved', 111963.8928, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5d25db52-a08f-4946-adca-3de5c86c3934', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 121.47809999999299, 'yield', 'approved', 112085.3709, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('71aed195-bc5d-4060-9289-cb51938b72d1', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 114.10100000000966, 'yield', 'approved', 112199.4719, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e130a1ab-0a0c-4029-b55d-f87749a41bcd', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 151.6536999999953, 'yield', 'approved', 112351.1256, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('34144a46-b870-4281-bc3e-7466abd6a2ed', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 276.0482000000047, 'yield', 'approved', 112627.1738, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('16cf45d9-91a1-42a0-9c8a-082d0b37659e', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 23.26459999999497, 'yield', 'approved', 112650.4384, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8bc20fcb-5cfa-4167-bcad-eeca9e450ee0', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 27.737300000007963, 'yield', 'approved', 112678.1757, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b67355f7-53b7-4822-bf03-c9918add295e', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 139.32189999999537, 'yield', 'approved', 112817.4976, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ba9bb4df-2129-4a68-9cfa-58b4a23cee99', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 18.233599999992293, 'yield', 'approved', 112835.7312, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5a599c92-cb48-42b8-8b91-9af5b0df76b3', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 162.7216000000044, 'yield', 'approved', 112998.4528, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('493e0e8a-0c4e-409f-aa95-270908be9cbf', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 186.2167999999947, 'yield', 'approved', 113184.6696, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7186ae36-948f-4268-bb17-f2193771a336', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 85.42829999999958, 'yield', 'approved', 113270.0979, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('01477ea4-772d-4802-a65c-53228196e6a2', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 21.84220000001369, 'yield', 'approved', 113291.9401, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c2b7860e-48ce-45f8-bcaf-1654ccb1bf22', '2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 198.74239999998827, 'yield', 'approved', 113490.6825, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('053083f2-4842-4243-8b23-d68e5150fec3', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 255504, 'deposit', 'approved', 255504, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-07-14T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('98c3d9de-a3d3-4185-a610-1cd4e708f3db', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 342.89379999999073, 'yield', 'approved', 255846.8938, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0d8d88d7-af46-4de1-bafb-07f7ee524957', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 290.7455000000191, 'yield', 'approved', 256137.6393, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('06e1e777-7bc9-48a0-8c7c-7e40177eb3fa', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 525.4026000000013, 'yield', 'approved', 256663.0419, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8482ed9e-4b62-45d2-9a9a-9fa57d7a13bd', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 127.3067999999912, 'yield', 'approved', 256790.3487, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3d43c757-4860-49e1-8e6b-394c46dd5b30', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 26782.90300000002, 'yield', 'approved', 283573.2517, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('eb0901c2-f1d0-4c18-9415-e10011acb916', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 417.5787999999593, 'yield', 'approved', 283990.8305, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f17438df-17d3-49ce-98a0-c62a0a9bd0a4', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 1005.2121000000043, 'yield', 'approved', 284996.0426, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('81807bb9-dfe5-4c1d-84ae-d723638951b9', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 1700.0903000000399, 'yield', 'approved', 286696.1329, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('de1abe52-6aa0-477d-8d3b-6aa51308d0e0', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 546.875699999975, 'yield', 'approved', 287243.0086, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('91482534-726f-410e-9295-693eb12155e0', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 238.8022999999812, 'yield', 'approved', 287481.8109, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('548f189c-4f5f-4954-a494-b31e85e7fde1', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 470.35760000004666, 'yield', 'approved', 287952.1685, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c8f6c797-95f4-4847-9282-4db5c656d754', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 312.42129999998724, 'yield', 'approved', 288264.5898, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a1119afe-718c-438b-a01e-387c7c711c53', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 293.44819999998435, 'yield', 'approved', 288558.038, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a4404c35-bad7-49e7-9705-cb848f9127cc', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 390.02779999998165, 'yield', 'approved', 288948.0658, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c6a0813f-4847-4e03-9910-25eb4c01f350', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 709.9492000000319, 'yield', 'approved', 289658.015, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('85f25cd9-fc58-4c4f-a89e-c292ca77c114', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 59.83249999996042, 'yield', 'approved', 289717.8475, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('da2e133e-4836-4616-a0e5-9819ec59b27a', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 35371.335700000054, 'yield', 'approved', 325089.1832, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c1e28b96-d58b-43b9-b9cc-e483f78f2cde', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 401.9592999999877, 'yield', 'approved', 325491.1425, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('054aff46-5db0-4760-95bb-1ecb9e922c66', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 52.60599999997066, 'yield', 'approved', 325543.7485, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('083eb3ee-2b3a-4bd9-bcec-7030b8cba35b', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 469.470100000035, 'yield', 'approved', 326013.2186, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1783a12d-4808-49c3-916b-c3c5606cbbf2', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 537.2563999999547, 'yield', 'approved', 326550.475, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c5e30b57-a684-411d-b102-d677b2b075dc', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 246.47010000003502, 'yield', 'approved', 326796.9451, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('90bf9eea-9908-4de6-907e-623bd1e1aaba', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 18063.017300000007, 'yield', 'approved', 344859.9624, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8d9e8c84-d026-428b-94c4-7a2b96307dbe', '76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 604.9707000000053, 'yield', 'approved', 345464.9331, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d8d5d8af-8086-4a5c-a836-753b922f448c', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 273807, 'deposit', 'approved', 273807, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0d8bb6cc-78dd-4ad0-b817-d5e51685b281', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 367.4568999999901, 'yield', 'approved', 274174.4569, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('51d8edad-3cff-452f-abca-31eb533830b1', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 311.5731000000378, 'yield', 'approved', 274486.03, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('91ba44b4-daa0-43ff-b707-375f8e2d2b8a', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 563.0396999999648, 'yield', 'approved', 275049.0697, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d84cc83b-0cf9-4f46-b45a-bd2d770573a3', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 136.4265000000014, 'yield', 'approved', 275185.4962, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2580fa2d-8ec7-4984-b568-e4cb9e9be07a', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 946.1496000000043, 'yield', 'approved', 276131.6458, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f4438ff0-5a0e-4ffb-a8f3-ef09f3d20efa', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 406.62060000002384, 'yield', 'approved', 276538.2664, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('13a1ff79-4500-47ac-a30d-3b7c4588d577', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 978.8330999999889, 'yield', 'approved', 277517.0995, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('59848902-24f0-47bd-8cfd-df5599bb0a98', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 1655.475999999966, 'yield', 'approved', 279172.5755, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d3d4d25c-01ae-4a48-9793-54260e8840c7', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 532.5244999999995, 'yield', 'approved', 279705.1, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a38fe8f9-4ad5-4203-872c-c279f465bdda', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 232.5356000000029, 'yield', 'approved', 279937.6356, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('34716c59-3439-461a-8707-80d70d0e0abe', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 458.01430000003893, 'yield', 'approved', 280395.6499, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('216a8453-2459-4ed3-8fee-20455c4d7cab', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 304.22259999997914, 'yield', 'approved', 280699.8725, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('75f5caa7-7c31-4734-8a91-e1972f1a3909', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 285.7474999999977, 'yield', 'approved', 280985.62, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ca6367b-27a8-422d-b7b8-019ff97d9460', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 379.7925999999861, 'yield', 'approved', 281365.4126, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5259a084-71bd-4a34-8761-de56f484dd28', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 691.318499999994, 'yield', 'approved', 282056.7311, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5bdcf5c7-afc5-4655-9072-d4487199a8c6', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 58.26240000000689, 'yield', 'approved', 282114.9935, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('db5c9f2a-a538-425f-a1d3-8c470c7162cb', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 69.46370000002207, 'yield', 'approved', 282184.4572, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('45aeeb65-4a52-4d5d-99fe-96c2703ef36e', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 348.9094000000041, 'yield', 'approved', 282533.3666, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8aad1dd7-fd45-44a0-9302-56ff9554e9f9', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 45.663100000005215, 'yield', 'approved', 282579.0297, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('81ef83bf-e086-46b9-8f3b-a32368e0d1ad', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 407.5101999999606, 'yield', 'approved', 282986.5399, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a35ace27-3dfd-4de3-8874-53af93a73ea7', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 466.3502000000444, 'yield', 'approved', 283452.8901, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('136545a5-c69e-463b-933c-27c933d55659', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 213.9413999999524, 'yield', 'approved', 283666.8315, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7ba91ee0-712e-479a-a76f-25c5b6efc8b0', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 54.70040000003064, 'yield', 'approved', 283721.5319, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3cde86ad-9493-4b7a-b40a-88bb1cdee0e5', 'feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 497.718600000022, 'yield', 'approved', 284219.2505, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b77e8a8f-b95c-4308-bbdb-8647df7ffbcb', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-17', '2025-07-17', 'USDT', 199659.72, 'deposit', 'approved', 199659.72, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-07-17T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9235d10b-8596-4821-a761-ce8de4a8b555', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 201.68369999999413, 'yield', 'approved', 199861.4037, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1f5bde43-8fe7-4c0e-8e86-63b6273e9020', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 364.41419999999925, 'yield', 'approved', 200225.8179, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('233fc8a3-46be-4db4-8583-46a730fc91e9', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 88.2786999999953, 'yield', 'approved', 200314.0966, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('be578e54-41ff-4274-81eb-aaa6f6fe2662', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 612.1999000000069, 'yield', 'approved', 200926.2965, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ba2f4983-0bea-4b77-a84c-dc7a1ba96ee5', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 263.0009999999893, 'yield', 'approved', 201189.2975, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cd6a6b32-38b0-4118-a495-03aee41e5ece', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 633.0030000000261, 'yield', 'approved', 201822.3005, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e38e977d-c30d-42b4-a43d-4c71137b219d', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 1070.1625999999815, 'yield', 'approved', 202892.4631, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c0344a56-bb49-4358-ac55-73736aaf18b2', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 344.0173000000068, 'yield', 'approved', 203236.4804, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5b5a2915-2efd-45ef-a2f0-937391f0b67a', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 150.18900000001304, 'yield', 'approved', 203386.6694, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e8a02606-42bb-4d35-a68c-b6e59cd6243f', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 295.7929000000004, 'yield', 'approved', 203682.4623, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fc0865d1-8279-471a-8fc1-e776232441c5', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 196.4360999999917, 'yield', 'approved', 203878.8984, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('926fa77d-e835-4057-a162-942e0d423e02', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 184.48449999999139, 'yield', 'approved', 204063.3829, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2b559f32-3103-4089-a882-90ce42d880af', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 245.17430000001332, 'yield', 'approved', 204308.5572, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('90d426a7-c896-4f53-90f7-66eb534d6a1a', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 446.2122999999847, 'yield', 'approved', 204754.7695, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7b0b6c97-dd6e-4e9f-a8d2-53ef1001b681', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 37.59530000001541, 'yield', 'approved', 204792.3648, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fc3de317-795d-45a4-bb3a-d92f894e93ff', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 44.822199999995064, 'yield', 'approved', 204837.187, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5c9c296d-6443-4b11-82aa-bbd7fd089d4f', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 225.13120000000345, 'yield', 'approved', 205062.3182, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c52ff642-f2e0-4c61-952c-4ba2c422f631', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 29.45979999998235, 'yield', 'approved', 205091.778, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('40a186d8-b1f0-4dc3-930d-07ce8da307ae', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 262.9023000000161, 'yield', 'approved', 205354.6803, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('daf77c16-0daa-4dec-9e24-1ec54c4f176c', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 300.81419999999343, 'yield', 'approved', 205655.4945, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('49606581-0fc1-4547-97ec-115484320c3b', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 137.97539999999572, 'yield', 'approved', 205793.4699, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('655fbe86-e357-4849-9c1a-0a2e441941cb', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 35.274600000004284, 'yield', 'approved', 205828.7445, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dd605bfd-9d77-41c1-9e41-9e78d50af3e1', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 320.9555999999866, 'yield', 'approved', 206149.7001, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('19ee9881-196b-489f-8b28-06df082e30a9', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 136737, 'deposit', 'approved', 136737, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-07-23T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2330c489-c41f-4d72-b8d2-849eef9f8bb3', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 280.4819000000134, 'yield', 'approved', 137017.4819, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('47d24007-00cc-4ba8-8e16-a12e6e792094', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 67.96169999998529, 'yield', 'approved', 137085.4436, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4747832a-8205-409d-ac82-bd45ec3c0019', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 471.3306000000157, 'yield', 'approved', 137556.7742, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bfedfd42-034d-4bc5-95e6-241972489862', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 202.5606999999727, 'yield', 'approved', 137759.3349, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ab0dd7a4-aac8-45e0-8fdf-25e0d9fac955', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 487.6120000000228, 'yield', 'approved', 138246.9469, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8a3e4fb4-4c5e-434f-b675-da3b655c4dc8', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 824.6861999999965, 'yield', 'approved', 139071.6331, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cf924d88-80d2-462d-8d26-e1fa1beb6a44', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 265.2804999999935, 'yield', 'approved', 139336.9136, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8cf82110-9a78-4e48-ab00-fb4cff57a460', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 115.83910000001197, 'yield', 'approved', 139452.7527, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('81d83d7b-2540-4b88-9905-7304e0919b74', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 228.16279999999097, 'yield', 'approved', 139680.9155, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3fc2f428-9f87-4546-bb86-34548ffd0059', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 151.550499999983, 'yield', 'approved', 139832.466, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ca201ae7-3e22-4171-9ff2-2d6b476e7838', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 142.34700000000885, 'yield', 'approved', 139974.813, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c877ab33-3aec-4efd-8acf-d8500ecd66e1', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 189.19610000000102, 'yield', 'approved', 140164.0091, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1735bae0-2368-41ab-898b-6c412625ca06', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 344.38490000000456, 'yield', 'approved', 140508.394, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8dba2fc9-e11a-4da0-853a-e1d134eb526e', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 29.02369999999064, 'yield', 'approved', 140537.4177, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0390b95d-b100-4d60-aff1-f24886a65999', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 34.60380000001169, 'yield', 'approved', 140572.0215, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3de7e955-7460-4c07-94aa-f0102d65bd0a', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 173.8115000000107, 'yield', 'approved', 140745.833, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('46ce2fe3-aa9f-4811-ac2b-2819ddd62d7d', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 22.747399999992922, 'yield', 'approved', 140768.5804, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('59aa9a74-a7c1-403e-948d-09ccc3ab0f42', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 203.0038999999815, 'yield', 'approved', 140971.5843, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('59038cfd-d2d8-41f9-bcae-571ac20956e9', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 232.31530000001658, 'yield', 'approved', 141203.8996, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f0e22b6c-ae4a-4f5b-b2ff-baa75b549543', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 106.57629999998608, 'yield', 'approved', 141310.4759, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3b885ae2-6029-43ed-800e-f652aa0e8b1f', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 27.249400000000605, 'yield', 'approved', 141337.7253, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e2baea53-9e34-4b4e-bc58-a390032ab66c', '7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 247.94169999999576, 'yield', 'approved', 141585.667, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('579a14c5-65cc-4a0e-8b41-1570b06aa36b', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 222687, 'deposit', 'approved', 222687, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-07-23T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3bbdde25-5bbd-47a9-867d-dd3a7cab2f38', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 456.7869000000064, 'yield', 'approved', 223143.7869, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('85fa8e3f-6336-414f-8f34-7b0b829636a0', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 110.68109999998705, 'yield', 'approved', 223254.468, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f615131c-5b20-494f-8a47-506b9e7b43e0', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 767.5990000000165, 'yield', 'approved', 224022.067, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('18bf12a4-6116-4342-958f-90dd4341f43b', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 329.88610000000335, 'yield', 'approved', 224351.9531, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('43d06600-ef74-4b08-96db-bae2a78c4b0d', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 794.1146999999764, 'yield', 'approved', 225146.0678, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('179c1dfb-94a9-488e-bb30-c3c135a0f10b', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 1343.0665000000154, 'yield', 'approved', 226489.1343, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5ea53faf-c413-4167-b6d9-8a1c734c6a9c', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 432.030299999984, 'yield', 'approved', 226921.1646, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('eceb533b-3153-4f95-ab32-9afd996c1d0e', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 188.65320000000065, 'yield', 'approved', 227109.8178, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6a0a2faf-d733-4a7c-bb2c-babf2681e9ae', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 371.58110000001034, 'yield', 'approved', 227481.3989, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2accbe26-b4da-47cc-bbe1-2dc3f83af4fe', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 246.8119000000006, 'yield', 'approved', 227728.2108, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fe11ae92-0556-4dc5-9f60-847adc76070d', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 231.8232999999891, 'yield', 'approved', 227960.0341, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ed872b21-0cd6-4317-98f6-c48fd5b3b233', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 308.12080000000424, 'yield', 'approved', 228268.1549, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('90225c90-b95e-455f-8be4-42ea134e1493', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 560.8579000000027, 'yield', 'approved', 228829.0128, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1e0863dc-6622-4b88-b366-6b0cd8517646', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 47.2675000000163, 'yield', 'approved', 228876.2803, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f0b9b5e-7ed2-4a9e-989d-9ea79df4a083', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 56.35499999998137, 'yield', 'approved', 228932.6353, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2bbbc948-2aa8-4d9e-8ea4-0cc05518569d', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 283.0658000000112, 'yield', 'approved', 229215.7011, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ba0374a8-52db-4207-83c6-df66c5a42444', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 37.045799999992596, 'yield', 'approved', 229252.7469, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1ad9938a-41ad-4c6f-8d22-fe98bd6893bf', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 330.6079000000027, 'yield', 'approved', 229583.3548, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('761932d0-3d37-4903-9bea-8b2e0a2f9ab5', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 378.3439000000071, 'yield', 'approved', 229961.6987, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a2bc0500-1945-4917-b4e6-130dc16a381b', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 173.56789999999455, 'yield', 'approved', 230135.2666, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c556037f-7fe3-4f99-b1fc-31b1e2f05e0b', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 44.377799999987474, 'yield', 'approved', 230179.6444, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ba11f9d9-8ad9-4f8d-aeff-ed789511ec7b', 'fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 403.79270000002, 'yield', 'approved', 230583.4371, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e5fa5a13-7396-43be-8602-16a771e9967f', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 219747, 'deposit', 'approved', 219747, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-07-23T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2f161ea1-60ed-49c2-8d6b-5f575636ac74', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 450.75620000000345, 'yield', 'approved', 220197.7562, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1b561412-6688-4a03-a240-d0f6aa1fd998', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 109.21979999999166, 'yield', 'approved', 220306.976, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0ef27a24-3d02-4b61-8dd7-29cba9a9fd0b', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 757.4648999999918, 'yield', 'approved', 221064.4409, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a7344324-d971-4f36-88b6-94f0450ad088', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 325.53080000000773, 'yield', 'approved', 221389.9717, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8c605048-6bc4-4660-9469-29f60562b008', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 783.6304999999993, 'yield', 'approved', 222173.6022, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a02677fa-8af0-4ab8-a05f-2304925f7358', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 1325.3348000000115, 'yield', 'approved', 223498.937, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c9895c7b-f10d-4eb6-961f-715215bee6c6', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 426.3264999999956, 'yield', 'approved', 223925.2635, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('31f593c2-2655-4ba5-a282-0fa98b33e6b3', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 186.16250000000582, 'yield', 'approved', 224111.426, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fc4ef937-d1a1-44c7-84f2-683fdc338976', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 366.67540000000736, 'yield', 'approved', 224478.1014, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5b3f076c-82cd-4c4f-95fb-957a72f9047a', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 243.55339999997523, 'yield', 'approved', 224721.6548, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f06b6851-7552-417d-8149-ea5d03a07c9c', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 228.7626000000164, 'yield', 'approved', 224950.4174, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('65bbbf6d-15ea-4104-9fef-2dd9ac4e6158', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 304.05299999998533, 'yield', 'approved', 225254.4704, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3cf5a610-26f4-4103-ad4a-2b7c56ebbd0b', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 553.4532000000181, 'yield', 'approved', 225807.9236, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('34a3e68d-85e4-4bb5-9d6e-075f8f71c7cf', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 46.643499999976484, 'yield', 'approved', 225854.5671, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bb414809-db18-4499-9fae-3aba663a66bb', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 55.61090000002878, 'yield', 'approved', 225910.178, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f376507e-b777-45f0-ac57-f3db35f80d8c', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 279.3285999999789, 'yield', 'approved', 226189.5066, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('812c2e34-d7cd-4231-b586-4e8913476808', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 36.5568000000203, 'yield', 'approved', 226226.0634, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ef35e61-dcdc-4cb8-a71a-c5f84a0f96fb', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 326.2430999999924, 'yield', 'approved', 226552.3065, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('60aa72b5-bdf7-4d0c-86f8-7e255109b580', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 373.34880000000703, 'yield', 'approved', 226925.6553, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('743f5dd9-05dc-419f-91af-d46364d3e121', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 171.27639999997336, 'yield', 'approved', 227096.9317, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c50270c7-72c6-4f67-a640-1d47c1ddf6d4', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 43.79190000001108, 'yield', 'approved', 227140.7236, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d78d3280-1a40-4482-8c59-c02c2087125c', '1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 398.46160000000964, 'yield', 'approved', 227539.1852, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4a898345-9445-47ea-a9fa-6779546e3e97', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 130000, 'deposit', 'approved', 130000, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-08-04T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e8cbb2d8-6c1b-4a83-b1e1-17a08d76136d', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 496.63240000000224, 'yield', 'approved', 130496.6324, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('59e741c9-aeb4-42a6-aa2c-545fc4712b63', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 213.5158999999985, 'yield', 'approved', 130710.1483, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('89e6bb98-4b85-4b61-9f47-0d8b301cb442', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 514.0675000000047, 'yield', 'approved', 131224.2158, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('56488de1-cd0f-4290-a865-e85577528881', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 869.7704000000085, 'yield', 'approved', 132093.9862, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1cb41b4b-7116-40d5-bc95-4412ffee7711', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 279.96729999998934, 'yield', 'approved', 132373.9535, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('08c3aa21-1a99-4d66-90c5-4c7bdd73106a', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 99877.72173, 'withdrawal', 'approved', 32496.23177, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3d747c51-6516-4341-a13c-e85957328b6a', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 59.07560999999987, 'yield', 'approved', 32555.30738, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ce8b6574-7687-4260-b538-5d4a7e032e98', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 27555.303626999998, 'withdrawal', 'approved', 5000.003753, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('545f2fd8-2567-4dae-82d9-58af372c0fba', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 5.655461000000287, 'yield', 'approved', 5005.659214, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('311f11ba-4921-4f7a-9b5b-81a0bc7073e8', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 7.517632999999478, 'yield', 'approved', 5013.176847, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fd324f4f-8bf9-430f-b09e-d24603ecce6c', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 13.686048000000483, 'yield', 'approved', 5026.862895, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('911ced74-0ef9-4fa4-ae10-761566d76bd1', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 1.153733999999531, 'yield', 'approved', 5028.016629, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b938efda-f3c2-45d6-9f03-d9a9a183fe4b', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 1.3755810000002384, 'yield', 'approved', 5029.39221, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ad781dbe-df93-43e1-9009-c77b59efe3ac', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 6.909593999999743, 'yield', 'approved', 5036.301804, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d8b8806b-13bf-4fb5-a3b6-f38cadc7d2ed', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.904409000000669, 'yield', 'approved', 5037.206213, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('18f4073e-ee17-4fe0-afe5-460043a85398', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 8.071343999999954, 'yield', 'approved', 5045.277557, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ad6692ba-a978-417d-9855-0b720ffb3d19', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 9.238233000000037, 'yield', 'approved', 5054.51579, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f916efc0-96bb-46a9-8698-47756dfd7d12', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 4.238877999999204, 'yield', 'approved', 5058.754668, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('98f3271c-36cf-4c7b-aaa3-0ed39e478e6f', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 1.0838850000000093, 'yield', 'approved', 5059.838553, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b8b617e8-8353-4121-b400-19c62fc67fe6', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 9.86247000000003, 'yield', 'approved', 5069.701023, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a0d5ed6f-025f-4b16-9061-dbfd2c563ebb', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 111370, 'deposit', 'approved', 111370, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-08-19T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('446366d8-77c5-49d4-920c-62d4d1cb267a', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 438.00500000000466, 'yield', 'approved', 111808.005, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6dc6a748-470b-41dc-9d83-37c552377bbf', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 741.0773999999947, 'yield', 'approved', 112549.0824, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3e42e14b-0083-4bbf-a507-aa14fe454e11', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 238.54270000000542, 'yield', 'approved', 112787.6251, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d9f55b6f-5173-4c56-8b23-49083d0d2c32', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 104.18570000000182, 'yield', 'approved', 112891.8108, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ca7f7df2-e2f4-44f3-9170-fd18345c00d7', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 205.22849999999744, 'yield', 'approved', 113097.0393, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1beb5ced-3348-4376-b0ff-4427e131f40c', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 136.3417999999947, 'yield', 'approved', 113233.3811, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c7e48012-8b2e-4350-9810-b5d4e0b512cf', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 128.07730000000447, 'yield', 'approved', 113361.4584, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('44933c05-e56c-47ec-8426-998c29eb31ca', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 170.24929999999586, 'yield', 'approved', 113531.7077, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6fe3f648-0d02-42c9-8948-69e574058b06', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 309.94319999999425, 'yield', 'approved', 113841.6509, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('88e28f68-6855-415e-8af7-17886161500f', '4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 113841.6509, 'withdrawal', 'approved', 0, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1eb70bc2-84d7-4338-b040-5627949dc9e5', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 2.027912415, 'deposit', 'approved', 2.027912415, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e0d86e84-c55a-46f6-ae10-f9c3dafdb5b3', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 14.833519475, 'deposit', 'approved', 16.86143189, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('68f26c51-3074-432f-a3b5-b51a385e3a9a', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 6.391888250000001, 'deposit', 'approved', 23.25332014, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1bc32fc2-4f9a-42b0-b73e-63f3556b81d6', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 15.404328720000002, 'deposit', 'approved', 38.65764886, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('89d15bb8-65ca-4056-9bfa-d3e2bd0e15ed', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 26.124042319999994, 'deposit', 'approved', 64.78169118, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('eb570110-e9ae-48b8-9c0f-b981fd6b6055', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 8.865740889999998, 'yield', 'approved', 73.64743207, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('09b9c780-782c-47ab-befa-8defbcf7b260', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 3.8770237500000064, 'yield', 'approved', 77.52445582, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8642f732-4f3d-4c10-9ab9-1ed87570c3d9', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 7.641243279999998, 'yield', 'approved', 85.1656991, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e4cbb0b4-217e-442c-8c3c-cac6e5f7c23a', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 5.56402387, 'yield', 'approved', 90.72972297, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ac07d6c8-379e-4327-be74-cbd08c49d0ed', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 5.230457130000005, 'yield', 'approved', 95.9601801, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('71770f7b-72f8-4d86-8788-779782102cfc', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 6.957303199999998, 'yield', 'approved', 102.9174833, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('164b80bc-2eb8-41ea-a37c-e169ce2e2189', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 13.247668700000006, 'yield', 'approved', 116.165152, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c40873ea-2012-44f1-8a34-8c199592c143', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 1.118562499999996, 'yield', 'approved', 117.2837145, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2612d49e-2b5b-457a-ada2-8de309c5bd7a', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 1.3338238999999987, 'yield', 'approved', 118.6175384, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1fbfddc7-9492-4a1f-8d49-95bb5b8afdad', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 6.700921499999993, 'yield', 'approved', 125.3184599, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4a6625e4-1d61-4f9a-b6f2-714401324b65', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.8777985000000115, 'yield', 'approved', 126.1962584, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('397f2bd5-91c5-4a57-83b7-b5f108be5eae', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 7.834682600000008, 'yield', 'approved', 134.030941, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a44811be-30c1-4373-963f-1f72127f0546', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 8.975727999999975, 'yield', 'approved', 143.006669, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('17798622-cf1e-433b-8786-81cec8829a75', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 4.122814200000022, 'yield', 'approved', 147.1294832, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b9e6107e-80f0-438f-a241-4ee459ced411', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 1.0547214999999994, 'yield', 'approved', 148.1842047, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c08a790c-f2d7-4ea7-89c1-d45ed1e528e1', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 9.598295699999994, 'yield', 'approved', 157.7825004, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b9198ab8-1c9f-4608-b223-0d3a437256f0', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 100000, 'deposit', 'approved', 100000, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-10-06T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('60976f42-709a-4d89-8a0e-f2c714f2a1d7', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 154.5234000000055, 'yield', 'approved', 100154.5234, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('39bcce71-3687-400d-9106-9f89bc76ecf0', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 102.62829999999667, 'yield', 'approved', 100257.1517, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('11a4f209-8cab-4308-8169-4db3d0636008', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 96.38999999999942, 'yield', 'approved', 100353.5417, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a6870a86-0f61-433a-aa82-353666261a71', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 128.10659999999916, 'yield', 'approved', 100481.6483, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8da733a7-339a-49e2-9735-af9578bd10e8', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 233.16890000000421, 'yield', 'approved', 100714.8172, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6cdf168d-070d-4874-9b08-4e91c34f66d3', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 19.648199999995995, 'yield', 'approved', 100734.4654, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('33165257-cdc7-4c57-aa53-cfc04bcf29c0', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 23.425300000002608, 'yield', 'approved', 100757.8907, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cf7d5330-8f92-4640-be09-d4e7393c65a5', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 117.66169999999693, 'yield', 'approved', 100875.5524, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2c4b9718-7f1d-415c-9a26-cc43192f66e7', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 15.3978000000061, 'yield', 'approved', 100890.9502, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1ec7e105-1c03-46b4-b263-260acfb711a5', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 137.41279999999097, 'yield', 'approved', 101028.363, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6e59d266-af48-4dc7-959c-d9cc1c89cdac', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 157.24109999999928, 'yield', 'approved', 101185.6041, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e372d8fc-db7d-4b26-af81-6d7aba59ddea', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 72.12880000000587, 'yield', 'approved', 101257.7329, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('659ace08-9373-42dc-b487-521aad9e8fa8', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 18.441099999996368, 'yield', 'approved', 101276.174, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('afc1bf5f-46a6-41ed-9e36-e718a4e3e706', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 167.79360000000452, 'yield', 'approved', 101443.9676, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('36d54787-b9c5-49d7-b542-441518aef1fd', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 99990, 'deposit', 'approved', 99990, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-10-15T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b5d79a44-a7c1-4a25-abc0-9c4412ad7ee4', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 120.13409999999567, 'yield', 'approved', 100110.1341, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('09a89fb7-4608-4c7f-8423-05352ad56c9c', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 218.6417999999976, 'yield', 'approved', 100328.7759, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d9778473-f92f-40e0-b0a9-07d34c4a35e6', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 18.421400000006543, 'yield', 'approved', 100347.1973, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2ebf0a8c-3b33-4e53-8604-e790b9497574', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 21.96270000000368, 'yield', 'approved', 100369.16, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f5fffafe-e031-4d5b-a038-a556e6363408', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 110.3130999999994, 'yield', 'approved', 100479.4731, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a6750816-28eb-4f78-8918-918ba0391bc3', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 14.43519999999262, 'yield', 'approved', 100493.9083, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b290b413-82a4-4195-988c-7ecbbc80e878', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 128.82070000001113, 'yield', 'approved', 100622.729, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('94644019-5547-4d6c-8693-dbe11ccaeea9', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 147.3973999999871, 'yield', 'approved', 100770.1264, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('637b1c3f-a3a0-46c3-a3d6-7baca9d13644', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 67.6073000000033, 'yield', 'approved', 100837.7337, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fb42cc54-dbbd-4697-b0fb-bf02b1d4ecc5', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 17.284299999999348, 'yield', 'approved', 100855.018, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('10e10ce3-a5cb-4058-96e5-6d5fab543ae3', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 157.26660000000265, 'yield', 'approved', 101012.2846, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a0845790-daec-48a8-8123-d72e85b6110d', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 97695, 'deposit', 'approved', 97695, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-10-23T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c6867628-14e4-40a3-8754-1785770733d5', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 213.36703999999736, 'yield', 'approved', 97908.36704, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('079d237f-b994-4cbe-9db9-5b5d1530342a', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 17.977060000004712, 'yield', 'approved', 97926.3441, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9fa8607c-4217-4e98-8c67-fb035e6a5c2f', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 21.43279999999504, 'yield', 'approved', 97947.7769, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ce382dee-749d-4c69-8194-6415bce9b4a0', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 107.6518800000049, 'yield', 'approved', 98055.42878, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a3fed946-b383-4f4c-b6d1-ca74a19d4fb9', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 49985.91313, 'withdrawal', 'approved', 48069.51565, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('563d966b-6228-4d23-8688-c7626c98a9c6', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 61.61916999999812, 'yield', 'approved', 48131.13482, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5bb29617-7c0a-4006-a43f-7cec748c6049', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 47837.4949899, 'withdrawal', 'approved', 293.6398301, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0ec8bcda-66c7-4545-b7ba-11d86a536d1d', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.19700460000001385, 'yield', 'approved', 293.8368347, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('49cfa820-c107-49a6-9b64-408eb3df5f83', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.050365800000008676, 'yield', 'approved', 293.8872005, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b8a7f5ed-47e5-4714-b878-f56f76fee7ad', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 0.45826820000002044, 'yield', 'approved', 294.3454687, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b0cc127b-2399-45f2-853b-429493ee9fe0', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 840168.03, 'deposit', 'approved', 840168.03, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-11-07T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('448df045-a581-4ff3-aac3-108965246db8', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 120.70049999991897, 'yield', 'approved', 840288.7305, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d38f50d3-5021-45a8-b10a-24b9040239cf', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 1077.1462000000756, 'yield', 'approved', 841365.8767, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('39b10406-e3cd-4232-9f25-5a13c75d3020', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 1232.4767999999458, 'yield', 'approved', 842598.3535, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4729ac63-b077-4593-be69-4fdcb28ee285', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 565.3037999999942, 'yield', 'approved', 843163.6573, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('85a05826-9069-4e76-b235-40346bc16aaa', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 144.52450000005774, 'yield', 'approved', 843308.1818, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b66e381c-7c94-4e28-9055-c0a12d5d5baa', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 1314.998799999943, 'yield', 'approved', 844623.1806, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c6376f87-ef82-47eb-869b-eb9d656cdcc9', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 299915.77, 'deposit', 'approved', 299915.77, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-11-13T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('65482c42-3f4e-41a7-a61c-38da6303674d', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 549.165399999998, 'yield', 'approved', 300464.9354, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('daa15630-b1a7-41b1-bd90-326dd0a508d0', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 251.97940000001108, 'yield', 'approved', 300716.9148, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f40c0270-5c5d-4e0f-85dd-e6392bc8662f', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 87872.56850000002, 'withdrawal', 'approved', 212844.3463, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('24e5a152-20ba-49b3-b796-8dfaf20e41b6', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 414.8690999999817, 'yield', 'approved', 213259.2154, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('59abc8fb-3719-4593-aa12-8a1bc078f5f4', '23788484-2a19-5495-a829-098bff0da61a', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 50000, 'deposit', 'approved', 50000, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-11-25T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e1836262-3923-4fde-904b-8b81c5176238', '23788484-2a19-5495-a829-098bff0da61a', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 8.570370000001276, 'yield', 'approved', 50008.57037, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('26d47591-72ed-46e1-871c-4cb8afdc10ca', '23788484-2a19-5495-a829-098bff0da61a', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 77.98004000000219, 'yield', 'approved', 50086.55041, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3db79bfb-ab09-4782-942c-f16ffb078ddf', 'a5a304e5-c8a1-55cd-8c26-147cf9363d8d', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 100000, 'deposit', 'approved', 100000, 'Reconciled from USDT Yield Fund (Matched Investment Date: 2025-11-27T00:00:00)', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1dd5d4f4-3d6c-4fc9-bfa1-731ac004197d', 'a5a304e5-c8a1-55cd-8c26-147cf9363d8d', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 155.93339999999444, 'yield', 'approved', 100155.9334, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('be852bfc-d3c0-417e-b4e9-fecba9c33f0f', 'aca75818-8abd-5d7f-a7dd-e107b94cf65b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 3.898333827, 'deposit', 'approved', 3.898333827, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('78afca6f-65ef-4c3e-b18b-6fd73ca00e96', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-06-16', '2025-06-16', 'USDT', 1.0, 'deposit', 'approved', 1, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3eb54dee-827f-4f7f-bf21-20bb3454d35d', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 0.8628611692, 'withdrawal', 'approved', 0.1371388308, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('11563fac-b3ac-4852-bf20-12a41d760530', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 0.010540276099999996, 'yield', 'approved', 0.1476791069, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('63224c38-1dad-4f34-86d0-ce33168b3ceb', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.0469425069, 'withdrawal', 'approved', 0.1007366, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3bbc81ba-13c5-4edb-8ee0-a6572eca8822', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 4.581469999999366e-05, 'withdrawal', 'approved', 0.1006907853, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('daf2d961-e27c-45ed-9e49-7ec5ca31c27b', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.002091757710000003, 'withdrawal', 'approved', 0.09859902759, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e29b91cb-764d-45b4-865c-59abff6bdaf1', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.0013499039699999965, 'withdrawal', 'approved', 0.09724912362, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ea00a022-9ef6-42d9-ad66-b8c748ce6667', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.005147918060000006, 'withdrawal', 'approved', 0.09210120556, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2ca025ff-0762-4032-9a7b-9a3899df15f5', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 7.216082000000013e-05, 'withdrawal', 'approved', 0.09202904474, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f0045b9f-ed1d-4be0-9474-d92accf62601', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.004105115940000001, 'yield', 'approved', 0.09613416068, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bc5a2be4-8cf7-454a-95cf-ea90e5dc267f', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 4.066423000000097e-05, 'withdrawal', 'approved', 0.09609349645, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d3754d54-1b9e-4221-9f5d-8eda21059236', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 1.7736569999995955e-05, 'withdrawal', 'approved', 0.09607575988, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fe5daf22-7bb5-402e-ace6-7b036e8a3559', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.008261660820000002, 'yield', 'approved', 0.1043374207, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e8f4532c-30f4-42df-8dcb-8110c086896c', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0013111037999999908, 'yield', 'approved', 0.1056485245, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d687400a-0457-452e-b7bf-aa47db282411', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.004704134599999993, 'withdrawal', 'approved', 0.1009443899, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e477418a-0680-4a80-8c07-d9df77fef564', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.0002259393000000054, 'withdrawal', 'approved', 0.1007184506, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('358bcc3c-42c5-40ba-bc3e-d4d5b0cd3f6b', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 5.484289999999059e-05, 'withdrawal', 'approved', 0.1006636077, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cebbc2d5-22a7-4866-a32d-a49637799742', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.005062929699999996, 'yield', 'approved', 0.1057265374, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3e7ee97d-9f99-494b-8117-ae7b5a82172f', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0016303406999999964, 'withdrawal', 'approved', 0.1040961967, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ae6c91c4-66e5-4a86-9d2b-21d27f1b9598', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.027869181670000007, 'withdrawal', 'approved', 0.07622701503, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1302f2f7-1e57-48c8-89fb-5e0d534148ca', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.001230228780000009, 'yield', 'approved', 0.07745724381, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0ac28509-acec-43c3-9908-fdcfd77c8a41', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.006863260770000004, 'withdrawal', 'approved', 0.07059398304, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('34f56e9c-de3e-4d9e-8a03-c0893777f960', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0009820973500000024, 'yield', 'approved', 0.07157608039, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4fee60c0-c6b3-436b-a4da-daebf9661e19', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.001062219370000006, 'withdrawal', 'approved', 0.07051386102, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('16c1c558-0d87-4e7e-be04-35e38912eff0', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0014743592800000038, 'yield', 'approved', 0.0719882203, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('423f1174-9fd4-4a2c-9070-08ffea0204f0', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.002093971900000005, 'withdrawal', 'approved', 0.0698942484, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1fae8346-0615-4cc0-a934-fab84dd0857b', '1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 2.719411000000338e-05, 'withdrawal', 'approved', 0.06986705429, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cbdc8d55-9fa2-48f1-a6f9-f0effeb3d0e1', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 0.1100305181, 'deposit', 'approved', 0.1100305181, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('64aa07e9-dc29-45e4-a4e8-b3d0339ccd0a', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 0.021855921070000006, 'withdrawal', 'approved', 0.08817459703, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a20e77c6-94ee-4819-ba5f-73d56cedfc71', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.028020322549999997, 'withdrawal', 'approved', 0.06015427448, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b53a40a2-d82e-409a-a4f1-76f0a1cf2a28', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 1.3678990000001723e-05, 'withdrawal', 'approved', 0.06014059549, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9a2df153-0674-4879-b063-1edfe2c50a19', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.0042809453499999955, 'withdrawal', 'approved', 0.05585965014, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('aa550f1e-2179-4cd0-b539-fc9cf709b913', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.0007437823000000024, 'withdrawal', 'approved', 0.05511586784, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a547bade-a969-4b84-85fc-986c9e8e87d7', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.00290904929, 'withdrawal', 'approved', 0.05220681855, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2393278d-28d8-4f38-92b7-d930519b9503', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 2.045189000000197e-05, 'withdrawal', 'approved', 0.05218636666, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c14858d2-f475-415b-8035-bc1f10e00e8d', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.0002770801899999939, 'withdrawal', 'approved', 0.05190928647, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('abb38907-d839-4594-a6c6-0fb713fce6c1', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 1.0978680000002516e-05, 'withdrawal', 'approved', 0.05189830779, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e766012d-208e-45ad-8c9e-ddd11e5357a7', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 4.789589999998345e-06, 'withdrawal', 'approved', 0.0518935182, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e56b77d7-c0c3-4a4d-a8cb-dbce8cf3e189', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.0004856085600000032, 'withdrawal', 'approved', 0.05140790964, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c1e87812-1011-434a-81b6-9e2d394d8349', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0006522608700000043, 'yield', 'approved', 0.05206017051, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('00bffb49-b038-4db3-b978-594ec2f20a6d', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.0023124239400000024, 'withdrawal', 'approved', 0.04974774657, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3a3cec7b-0421-4f64-b7b7-3cecbdc6b830', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.0022789520100000016, 'withdrawal', 'approved', 0.04746879456, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e1711cbc-f573-4d67-ad3a-b6ef32c2cd37', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 1.292376999999928e-05, 'withdrawal', 'approved', 0.04745587079, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e7eeb16d-152c-4b23-89b6-a08ec8939235', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.0023879619899999996, 'yield', 'approved', 0.04984383278, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0351c13b-5243-4b35-abd5-cc307b60f28e', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0007672672300000002, 'withdrawal', 'approved', 0.04907656555, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f5a55602-f02b-48c3-ab5a-3f0c884b1775', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.013134104610000003, 'withdrawal', 'approved', 0.03594246094, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('31019723-ff79-473c-b2a1-f4bc26fb201e', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0005807316100000029, 'yield', 'approved', 0.03652319255, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9b999d5c-ab09-41e3-ab71-e8c941f9d75a', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.0032308868200000007, 'withdrawal', 'approved', 0.03329230573, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4698c9ca-3204-4a63-af13-3eaa58ddf34d', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.00046933147000000064, 'yield', 'approved', 0.0337616372, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a6568044-51a3-403e-8ee1-8460e0c41002', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0004982495400000023, 'withdrawal', 'approved', 0.03326338766, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f4fd0c3d-153b-4e1d-a52e-9fc28aaad3e4', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.00069622456, 'yield', 'approved', 0.03395961222, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('718fe104-5ef2-4eea-af67-b64f710fae82', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.00098780708, 'withdrawal', 'approved', 0.03297180514, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('89243ba9-4e99-415b-9c84-36244040cfe8', '9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 6.414259999996952e-06, 'withdrawal', 'approved', 0.03296539088, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('edcd62fd-ad86-48bf-b8ee-9df1c2ef200c', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 0.1104167595, 'deposit', 'approved', 0.1104167595, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8959f9bf-c21d-41c5-a78d-a315546bc16b', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 0.021932642170000002, 'withdrawal', 'approved', 0.08848411733, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2456bda8-20d9-4b44-b251-5c6ef8705503', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.0281186826, 'withdrawal', 'approved', 0.06036543473, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f7e5f973-4dcf-400d-aecd-42323c517744', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 1.372700999999893e-05, 'withdrawal', 'approved', 0.06035170772, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dc78a359-a1fd-4da1-a9c1-287f9c0302e6', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.00429597281, 'withdrawal', 'approved', 0.05605573491, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('421047cf-b505-4ddb-aeb6-d071a9718f43', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.0007463932100000015, 'withdrawal', 'approved', 0.0553093417, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cfb9c9ec-293a-45b2-b5bb-25c86f098016', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.002919260960000003, 'withdrawal', 'approved', 0.05239008074, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('598d8c94-ab22-46b6-8fff-ed59b5e3a155', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 2.052367999999527e-05, 'withdrawal', 'approved', 0.05236955706, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('929786e5-98b3-46f3-83f3-95d9d9044269', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.00027805283000000014, 'withdrawal', 'approved', 0.05209150423, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e8ac063f-31fd-4518-b085-f3aea01fdbe1', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 1.1017209999998612e-05, 'withdrawal', 'approved', 0.05208048702, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b69f1b9f-5173-4ddd-8ad3-9136b14b1794', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 4.806410000002259e-06, 'withdrawal', 'approved', 0.05207568061, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ac45591-bff5-492a-a30d-a78abc65f457', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.00048731319999999884, 'withdrawal', 'approved', 0.05158836741, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d31148b5-ea07-4e15-a25a-312eec1ddbd2', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0006545505199999982, 'yield', 'approved', 0.05224291793, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f850bb74-0bfd-471e-ace1-641513db0b86', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.002320541270000004, 'withdrawal', 'approved', 0.04992237666, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5660a99b-f191-4889-b334-b436c897c466', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.0022869518399999955, 'withdrawal', 'approved', 0.04763542482, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fd9104aa-47b4-4b40-96e7-e588569b989e', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 1.2969139999999268e-05, 'withdrawal', 'approved', 0.04762245568, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('21e1cf02-c7d8-4bc5-9366-26a1c067b291', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.0023963444799999997, 'yield', 'approved', 0.05001880016, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8dcf4b4e-86b5-4bf4-985f-15a7524685fa', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0007699605699999987, 'withdrawal', 'approved', 0.04924883959, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d11f734e-1c65-4c66-a20d-4594cc9c33f2', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.013180209410000004, 'withdrawal', 'approved', 0.03606863018, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('86700569-aa21-4906-b6d7-91739b38c2c3', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0005827701600000026, 'yield', 'approved', 0.03665140034, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('39f67f2b-4e09-4301-ae0f-11ab8f3a2844', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.003242228239999999, 'withdrawal', 'approved', 0.0334091721, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f58cc868-94ee-4b48-bb44-082dcdf25536', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.00047097896, 'yield', 'approved', 0.03388015106, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d1cb9346-fdfc-4836-b360-a7ed0369f63c', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0004999985400000045, 'withdrawal', 'approved', 0.03338015252, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('88024999-7b5a-42e1-a9d3-04036898a3e2', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0006986685200000009, 'yield', 'approved', 0.03407882104, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e5a30c1a-01b0-4667-a0c0-6e83e44e093a', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0009912746000000014, 'withdrawal', 'approved', 0.03308754644, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ca3032c8-ab4a-4740-93f2-37678823557e', 'ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 6.436759999998987e-06, 'withdrawal', 'approved', 0.03308110968, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0043a0bb-6952-4707-8d99-05cd6821a464', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 0.1099711737, 'deposit', 'approved', 0.1099711737, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dc53e968-b5ce-4e6c-b888-0069e2e99061', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 0.02184413317999999, 'withdrawal', 'approved', 0.08812704052, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5744c5d0-33ea-4bc0-b673-eabed799a6ce', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.028005209930000004, 'withdrawal', 'approved', 0.06012183059, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f6956b7b-60fc-461b-ad62-0aa1d736c3ac', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 1.3671610000001722e-05, 'withdrawal', 'approved', 0.06010815898, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('215ef6ec-f8fc-4875-88a8-d5c398098f42', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.004278636449999998, 'withdrawal', 'approved', 0.05582952253, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3885acb3-3fe6-4025-8a41-b2a7c8a4b387', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.0007433811499999998, 'withdrawal', 'approved', 0.05508614138, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('12481620-9a39-4705-b1a4-196966c7b095', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.002907480310000002, 'withdrawal', 'approved', 0.05217866107, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('40be9e6d-ee5c-4572-b34c-99b6d7e7bb68', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 2.0440849999997512e-05, 'withdrawal', 'approved', 0.05215822022, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bbcb7d31-08e8-4a17-8dec-e1ddc1cbc4ed', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.0002769307500000012, 'withdrawal', 'approved', 0.05188128947, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('076ab28b-5044-484e-800d-953c0a95931f', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 1.0972759999998416e-05, 'withdrawal', 'approved', 0.05187031671, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('561d067d-3963-4823-95ba-a3a0a4e27328', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 4.7870099999999804e-06, 'withdrawal', 'approved', 0.0518655297, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c3625fa2-885d-4349-a6f9-4e2990539ecf', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.0004853466500000028, 'withdrawal', 'approved', 0.05138018305, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9f62dd00-11cf-42d2-9217-29678aa7865b', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0006519090799999988, 'yield', 'approved', 0.05203209213, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('df91c73d-d64a-4df6-b72a-29bb93d825d2', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.002311176739999997, 'withdrawal', 'approved', 0.04972091539, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('af2f9416-afcd-4c7e-84cd-e597ceb699d9', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.0022777228799999993, 'withdrawal', 'approved', 0.04744319251, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5fef1d5a-0fca-4981-898c-6bd1a341e1c5', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 1.2916790000004619e-05, 'withdrawal', 'approved', 0.04743027572, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7d6a9a5a-8fda-48f9-b5d1-dc2f16f29e9b', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.0023866740500000025, 'yield', 'approved', 0.04981694977, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dcb49430-74e9-4c6f-b058-ab8910a29dc0', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0007668534000000032, 'withdrawal', 'approved', 0.04905009637, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5b8a1c4a-1844-4a03-8bab-45720747d7d5', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.013127020809999994, 'withdrawal', 'approved', 0.03592307556, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ecdbc74-3c5e-4c0f-a627-94e9ed45c3ba', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0005804183999999976, 'yield', 'approved', 0.03650349396, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3931cb36-e097-4291-8d75-e30bf32f4717', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.003229144260000004, 'withdrawal', 'approved', 0.0332743497, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b934616e-cedf-4856-bcd1-faf753f11193', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0004690783400000051, 'yield', 'approved', 0.03374342804, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('34c382a7-1dab-4f46-bd33-3a43ee37335c', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0004979808099999997, 'withdrawal', 'approved', 0.03324544723, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('50d38079-496d-4c43-9c6d-c96954335b47', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0006958490499999956, 'yield', 'approved', 0.03394129628, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1665c06f-d457-479f-84ea-53bc0cf1bbcc', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0009872743100000012, 'withdrawal', 'approved', 0.03295402197, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bdf08615-9e62-4144-b092-a9679db1109b', '52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 6.410799999995165e-06, 'withdrawal', 'approved', 0.03294761117, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7f8f22f9-1547-48c3-a605-b465e35c06cf', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 0.2569953698, 'deposit', 'approved', 0.2569953698, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ea34bdb7-5d26-4ae3-ad57-0d514925afe6', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 0.05104829649999998, 'withdrawal', 'approved', 0.2059470733, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b63994e6-1d16-4524-8647-c46802746199', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.065446326, 'withdrawal', 'approved', 0.1405007473, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('853fa6ed-7503-4a1f-9895-48da5775e4a2', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 3.194970000000574e-05, 'withdrawal', 'approved', 0.1404687976, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9e161cb8-989b-45de-921a-0e298c5c8d7c', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.009998890799999993, 'withdrawal', 'approved', 0.1304699068, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b1e62d77-7a95-4aba-8ed9-bd06625be45a', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.011202318699999991, 'yield', 'approved', 0.1416722255, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('629ec39a-597d-400b-a6ce-fdefae72cdf7', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.007477546899999993, 'withdrawal', 'approved', 0.1341946786, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b6253e5a-378f-4b90-9477-c54b2151a658', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 5.257040000000712e-05, 'withdrawal', 'approved', 0.1341421082, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6298c39a-4b7c-4101-ae19-64bb03a5eac2', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.0007122189999999862, 'withdrawal', 'approved', 0.1334298892, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('36ea5394-e3f9-4792-92df-ead122d93d60', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 2.8220100000003745e-05, 'withdrawal', 'approved', 0.1334016691, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c61a123f-2a88-4690-8844-7dc659e51d65', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 1.2311300000011904e-05, 'withdrawal', 'approved', 0.1333893578, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0520d6bb-47e2-46e8-af1c-a4e0294aff24', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.001248229399999995, 'withdrawal', 'approved', 0.1321411284, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('db65109e-e477-40b9-9f8e-c93f4ddd9338', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0016765997000000032, 'yield', 'approved', 0.1338177281, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a2b5cd89-5050-4c82-a6c6-3bd2d4bb09e5', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.005943955100000009, 'withdrawal', 'approved', 0.127873773, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('45f40fa7-2ebf-4347-8115-5c8ec71d72d6', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.00585791749999999, 'withdrawal', 'approved', 0.1220158555, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cf38b011-87ff-4803-9bdb-7e4240d142a6', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 3.321980000001168e-05, 'withdrawal', 'approved', 0.1219826357, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8231a562-815c-4c33-a120-bf1a943d4ede', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.006138121499999996, 'yield', 'approved', 0.1281207572, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c491cda2-9ea9-4b55-b9da-ee263bab18f6', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.013394275900000002, 'yield', 'approved', 0.1415150331, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('35ff5615-92b7-423c-a705-c495ce5424c3', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.0378729283, 'withdrawal', 'approved', 0.1036421048, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ec130da3-b120-404b-90ba-8aac97deb7b5', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0016745722000000018, 'yield', 'approved', 0.105316677, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e4749b08-9e31-45df-a3c9-5524aa204094', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.009316443600000002, 'withdrawal', 'approved', 0.0960002334, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1cbdc968-ba9e-41df-a869-2c886a4f01c4', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0013533436400000043, 'yield', 'approved', 0.09735357704, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7834716d-6394-4bdf-bed9-873f78cc1a6a', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0014367305099999977, 'withdrawal', 'approved', 0.09591684653, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('721f2514-9247-4eca-9593-03595b5632bc', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.007400248669999998, 'yield', 'approved', 0.1033170952, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7c36f2b4-4e21-4dfb-a7d7-fd5b5c4d3105', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.003005256900000003, 'withdrawal', 'approved', 0.1003118383, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8fcbb85c-7243-4421-9f9d-5521d8037e61', 'ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 1.9514400000003596e-05, 'withdrawal', 'approved', 0.1002923239, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2154dc73-cf00-4554-8891-c284b1593771', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-14', '2025-07-14', 'USDT', 0.2754052039, 'deposit', 'approved', 0.2754052039, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c4ee7541-8a07-40f3-8bd3-ca61c60d06b1', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 0.05470513539999999, 'withdrawal', 'approved', 0.2207000685, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('386d1ce6-fc2c-42c3-8728-b74027e1f503', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.07013456610000002, 'withdrawal', 'approved', 0.1505655024, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a61b3e3e-6a97-4a69-8598-2f674573a44c', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 3.423839999999734e-05, 'withdrawal', 'approved', 0.150531264, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d2f8262f-9f23-4f92-8b0a-c2f9a3f2382a', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.01071516019999999, 'withdrawal', 'approved', 0.1398161038, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('44a5bff1-2bc2-4271-99a7-567d16466424', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.0018616791000000132, 'withdrawal', 'approved', 0.1379544247, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bc648590-8930-416d-abb1-6c86c2ab6012', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.007281319099999989, 'withdrawal', 'approved', 0.1306731056, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fe435f9e-2763-49cd-8f1d-434a5dc5a217', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 5.119089999999771e-05, 'withdrawal', 'approved', 0.1306219147, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ed516550-f604-479a-8399-717a3bc9085a', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.0006935287000000012, 'withdrawal', 'approved', 0.129928386, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('15c4b411-aeea-4552-844e-0fc3b96e9fd5', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 2.7479500000010537e-05, 'withdrawal', 'approved', 0.1299009065, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8a9dcf64-e031-44ea-ac1c-ac07335dd36e', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 1.1988299999987628e-05, 'withdrawal', 'approved', 0.1298889182, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a1c056e0-45ac-4b2a-b673-4b9c8af109b9', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.0012154730000000225, 'withdrawal', 'approved', 0.1286734452, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('849d1be4-5450-496e-bcb6-d1df1704a692', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0016326019000000025, 'yield', 'approved', 0.1303060471, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e83f6bc9-697b-4fec-b37e-791da593693d', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.005787972199999991, 'withdrawal', 'approved', 0.1245180749, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('758f59f4-3122-49d6-bf1e-9207ef7dbe30', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.005704192400000002, 'withdrawal', 'approved', 0.1188138825, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dcbd7e8e-c59b-43ef-b24b-4bc235747428', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 3.234809999999588e-05, 'withdrawal', 'approved', 0.1187815344, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1469a233-f900-4c46-9182-c12a2a85a3c0', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.005977043200000004, 'yield', 'approved', 0.1247585776, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('178f7311-af78-4601-ab1e-b1cd9270cbaa', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0019204616000000063, 'withdrawal', 'approved', 0.122838116, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6559e017-a9bc-4c03-907b-5d6bba1a6724', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.03287452266, 'withdrawal', 'approved', 0.08996359334, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7fea8d08-47c7-4220-a475-0d6764f6ad7b', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0014535649800000022, 'yield', 'approved', 0.09141715832, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('772c20fa-d0f6-4973-8284-b11e0df80afa', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.008086874969999991, 'withdrawal', 'approved', 0.08333028335, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('176e438a-a55b-42c0-a946-03041b8e188a', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0011747316099999933, 'yield', 'approved', 0.08450501496, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a9eaccf0-9476-4906-b83d-8b73226c507a', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0012471132299999993, 'withdrawal', 'approved', 0.08325790173, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('685f63bf-c309-4916-bc6e-082afd5bb14e', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0017426425699999942, 'yield', 'approved', 0.0850005443, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6fe7205c-e4a3-4917-8350-9ae0ade4c2d2', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0024724704999999902, 'withdrawal', 'approved', 0.0825280738, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9dc7d7f0-8488-462a-903b-d11db5faaddb', 'a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 1.6054809999999087e-05, 'withdrawal', 'approved', 0.08251201899, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('66b9318a-7b41-42a3-98ae-1db72926bd0a', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-19', '2025-07-19', 'USDT', 0.1607185234, 'deposit', 'approved', 0.1607185234, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('126cb351-1154-41a0-a19b-dea3c10c53f8', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.05108732410000001, 'withdrawal', 'approved', 0.1096311993, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('999bdfeb-ece7-4a53-9021-7613ed882539', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 4.9859999999998794e-05, 'withdrawal', 'approved', 0.1095813393, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b5f0f8e8-5ac4-4dd5-95f1-3251ec187fcc', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.0078058572999999964, 'withdrawal', 'approved', 0.101775482, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2130638f-e511-4664-9e94-b50aba45cbbb', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.0013933923000000042, 'withdrawal', 'approved', 0.1003820897, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3d1f1424-eab1-449f-8273-04bb350443c4', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.005313762779999995, 'withdrawal', 'approved', 0.09506832692, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b27713ba-3925-4436-acd7-16e12eb4fadc', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 7.448555000000301e-05, 'withdrawal', 'approved', 0.09499384137, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('17fe6837-debe-4f35-8d48-57506eb2288c', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.0005666211700000034, 'withdrawal', 'approved', 0.0944272202, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ea84452e-33c3-42de-b8de-48995d9684c5', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 3.9942199999989936e-05, 'withdrawal', 'approved', 0.094387278, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6442c758-25d7-4ece-8450-bc75ac45e68d', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 1.7421640000001015e-05, 'withdrawal', 'approved', 0.09436985636, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2824e2b7-f76c-4b5d-8baf-8e25fa4c63a5', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.0009000605499999981, 'withdrawal', 'approved', 0.09346979581, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a787637a-8199-4d0a-b380-8d6c8e725ea0', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0011745412299999924, 'yield', 'approved', 0.09464433704, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2cecc347-df93-45e1-9fdb-ba9b0c8c9fee', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.004214159179999996, 'withdrawal', 'approved', 0.09043017786, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('21ed5f07-1e20-4d1c-b009-8f628d5b1f4d', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.004155561929999996, 'withdrawal', 'approved', 0.08627461593, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1cfecf5a-fce7-4872-bd97-3cd66cf7309b', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 4.6977940000011986e-05, 'withdrawal', 'approved', 0.08622763799, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fb1af924-e1d6-4bfd-8f68-49eba98c5c53', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.004336864879999999, 'yield', 'approved', 0.09056450287, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('db6eea00-f240-4f57-8492-398130b14111', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0013965366999999923, 'withdrawal', 'approved', 0.08916796617, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('380f9871-6755-463e-a785-9974947cde4c', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.023872517240000002, 'withdrawal', 'approved', 0.06529544893, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f20173f-4dda-424a-b5ac-21fdb9c61c6f', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.001053804089999999, 'yield', 'approved', 0.06634925302, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6601de5f-0b3b-4819-9bf4-660db5da991b', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.00587901406, 'withdrawal', 'approved', 0.06047023896, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a5fc0ced-55ef-4fec-ae32-fe36d414d335', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.000841256700000001, 'yield', 'approved', 0.06131149566, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('04002bb8-b5b9-4e66-93ed-dd01c90403e4', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0009098885700000031, 'withdrawal', 'approved', 0.06040160709, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('629eb368-007e-4817-902e-f99c0851c139', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0012629243200000043, 'yield', 'approved', 0.06166453141, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('95c6c6d5-10a3-4de2-987e-5ff3be81bb31', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0017936795200000008, 'withdrawal', 'approved', 0.05987085189, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('da6dd7a6-e130-47d8-b40a-6f508d545ce0', 'ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 2.329424999999996e-05, 'withdrawal', 'approved', 0.05984755764, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c800a868-3dbe-4470-9059-b52a07d4e37d', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.07500518367, 'deposit', 'approved', 0.07500518367, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c40af724-2d77-442d-b979-37346d429b5f', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 1.7056070000007195e-05, 'withdrawal', 'approved', 0.0749881276, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7afbd037-adbd-4e66-b93d-5d501d614b20', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.005337826699999992, 'withdrawal', 'approved', 0.0696503009, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f8447b3d-97be-4aab-b97d-4fb27db02911', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.000927407550000009, 'withdrawal', 'approved', 0.06872289335, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ebd2b4ac-3162-40fb-8d6b-fabf74e7bf15', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.00362723643, 'withdrawal', 'approved', 0.06509565692, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8255595b-4ad8-441d-95c2-4ada22556983', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 2.5501059999988307e-05, 'withdrawal', 'approved', 0.06507015586, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b8ccb4af-0e11-44ae-8e80-daf6c567d242', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.0003454858500000074, 'withdrawal', 'approved', 0.06472467001, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('57cc28fc-cc9f-4401-83b8-9b207489a80f', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 1.368910000000556e-05, 'withdrawal', 'approved', 0.06471098091, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('23d4aa06-e29c-4e4d-a88b-9bdd7712f8fe', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 5.97204999999712e-06, 'withdrawal', 'approved', 0.06470500886, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2e19bfaf-c14b-4cd5-bea5-c729fdd1d6b7', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.0006054957799999927, 'withdrawal', 'approved', 0.06409951308, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f2121791-e8e1-4f72-9a6a-263b47e5515c', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0008132912800000031, 'yield', 'approved', 0.06491280436, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3cd4dcdb-71eb-4d56-93c6-5b29957e5843', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.002883316000000004, 'withdrawal', 'approved', 0.06202948836, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('42154d8f-f2b1-42cc-b063-603877bacb51', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.0028415805200000047, 'withdrawal', 'approved', 0.05918790784, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c1390467-c08e-42ac-b1ae-947846fb6fa1', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 1.6114389999995204e-05, 'withdrawal', 'approved', 0.05917179345, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2be48234-053e-4d44-810f-12220c06bad3', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.0029775029199999997, 'yield', 'approved', 0.06214929637, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bde93f20-3a73-466e-97d4-2db6721d5103', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0009566904500000056, 'withdrawal', 'approved', 0.06119260592, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c5e11e79-adb8-45a4-9b87-fe61e04eb7a5', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.016376657139999994, 'withdrawal', 'approved', 0.04481594878, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('744dc358-cfc3-4a50-a77f-a3798b194c31', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0007241028499999982, 'yield', 'approved', 0.04554005163, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9a760634-f6dd-4689-84e2-66217c9b4a7f', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.004028529340000003, 'withdrawal', 'approved', 0.04151152229, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2fdee444-49d1-4ed9-a43c-f899457197d2', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0005852001900000028, 'yield', 'approved', 0.04209672248, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9f46a651-5ccd-458b-88f8-4705aaa11cf8', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0006212575599999978, 'withdrawal', 'approved', 0.04147546492, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('669d34fe-99fc-4df5-876f-866d9b43e7da', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0008681087299999973, 'yield', 'approved', 0.04234357365, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f3a194b0-0047-4cd0-b68c-408f74fa7968', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0012316772600000012, 'withdrawal', 'approved', 0.04111189639, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6c5af95b-0f0f-43b8-9857-c857217d3c7f', '665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 7.997799999999444e-06, 'withdrawal', 'approved', 0.04110389859, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('70910ce3-4263-472b-b5a8-22c06874f526', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.1221518633, 'deposit', 'approved', 0.1221518633, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5ab08fd7-53b0-406c-b7e2-3aa93f1ff882', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 2.7777100000000998e-05, 'withdrawal', 'approved', 0.1221240862, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1cc64196-890e-49d8-9e28-efc2f37b7b96', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.008693072199999999, 'withdrawal', 'approved', 0.113431014, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2291ef97-f4b2-4377-897e-f38f5e8cbd8b', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.0015103563999999958, 'withdrawal', 'approved', 0.1119206576, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('45ccfe09-045d-4952-8685-853ad7723667', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.0059072410000000075, 'withdrawal', 'approved', 0.1060134166, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ac64fec3-f538-4690-ac65-41ed81c3b589', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 4.153039999998942e-05, 'withdrawal', 'approved', 0.1059718862, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4341a20e-e09a-443b-b732-8cb4624b627d', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.0005626509999999973, 'withdrawal', 'approved', 0.1054092352, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fef8d9ee-78a0-4759-ab0f-5e13a7ecb3fd', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 2.229380000000336e-05, 'withdrawal', 'approved', 0.1053869414, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('47547f35-5d68-4069-a724-fcdb8aa53c04', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 9.726000000001567e-06, 'withdrawal', 'approved', 0.1053772154, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('72b8a1d7-348f-4736-a675-c9e28f5c50a6', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.0009860975999999994, 'withdrawal', 'approved', 0.1043911178, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ee22d77d-4a06-439b-aebd-d316542b358f', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0013245090000000015, 'yield', 'approved', 0.1057156268, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cde9fe99-42c2-4a25-b555-7e71eedbbffa', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.00469570770000001, 'withdrawal', 'approved', 0.1010199191, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8647a4fc-c18e-4d5f-9f21-8148d8440c8d', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.004627738249999999, 'withdrawal', 'approved', 0.09639218085, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('29983c4f-63d3-49b8-90ad-d77c131bbc3b', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 2.6243559999999944e-05, 'withdrawal', 'approved', 0.09636593729, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2d1832d6-a997-4206-bdd0-e2d8459cd490', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.004849098610000005, 'yield', 'approved', 0.1012150359, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('de037370-f6ae-4485-b615-b420c9becd3c', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0015580459500000032, 'withdrawal', 'approved', 0.09965698995, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('12dc8b71-55d1-4799-bf82-56f3681e6721', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.026670679099999997, 'withdrawal', 'approved', 0.07298631085, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('763ce48b-9602-4986-9d32-f9a402d3def1', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0011792586500000007, 'yield', 'approved', 0.0741655695, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9d9fd3cc-8f4b-495a-8102-c3ac3c24921d', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.006560778079999996, 'withdrawal', 'approved', 0.06760479142, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c701aa91-2de0-4794-af9d-0189e5f08cf9', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0009530447099999895, 'yield', 'approved', 0.06855783613, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('899d94b7-cbae-432b-ae51-d66a9efd9eeb', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.001011766979999995, 'withdrawal', 'approved', 0.06754606915, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c44579ec-8ec2-47b2-aa45-d308c343fcab', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.001413783589999995, 'yield', 'approved', 0.06895985274, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5d4915d8-cc82-43f7-945a-07400ef20d36', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0020058836499999982, 'withdrawal', 'approved', 0.06695396909, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c29bc9c3-b1aa-4e8a-909b-c3dbbd8c76ed', '8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 1.3025059999990929e-05, 'withdrawal', 'approved', 0.06694094403, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0e3842e9-49f0-4a86-aa0c-1667cc578fee', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-23', '2025-07-23', 'USDT', 0.1205391671, 'deposit', 'approved', 0.1205391671, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('11ffc62a-fc06-46e3-83a4-31165125500d', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-07-31', '2025-07-31', 'USDT', 2.741039999999695e-05, 'withdrawal', 'approved', 0.1205117567, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('340f24c0-0969-44b2-82f4-4b323ba6cf90', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.008578302900000001, 'withdrawal', 'approved', 0.1119334538, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7225db67-df0f-47ce-9bd2-add60a28750a', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.0014904161000000027, 'withdrawal', 'approved', 0.1104430377, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6ba6e039-40a9-4062-9570-30b0f9cbb3c2', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.005829251199999996, 'withdrawal', 'approved', 0.1046137865, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8e483fee-1d97-42be-937b-2dacccaa091b', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 4.098219999999764e-05, 'withdrawal', 'approved', 0.1045728043, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ad646740-bf18-416e-a036-29f4e5608884', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.0005552226999999965, 'withdrawal', 'approved', 0.1040175816, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('32d7810a-8bd2-43b8-a6ec-6cdb3a1e635d', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 2.1999400000000113e-05, 'withdrawal', 'approved', 0.1039955822, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8f1f0ab5-d9f7-4df5-ac15-a28ff2d95076', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 9.597600000008089e-06, 'withdrawal', 'approved', 0.1039859846, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7280e01a-933d-40ca-86ba-730b4b7e7461', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.000973078799999999, 'withdrawal', 'approved', 0.1030129058, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b87f9728-2232-4803-9bb0-3a95a4c2ae5d', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.0013070223999999964, 'yield', 'approved', 0.1043199282, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4950cb09-e405-4648-a83b-62d60e26b817', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.004633713219999988, 'withdrawal', 'approved', 0.09968621498, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f50575fb-517f-47e0-a346-63ca49da0c75', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.004566641020000012, 'withdrawal', 'approved', 0.09511957396, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8730ad33-f335-445b-8e4c-4a77a2ef1805', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 2.589708999999052e-05, 'withdrawal', 'approved', 0.09509367687, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('426188b1-a696-4100-bcf3-dda758ba20df', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.00478507890999999, 'yield', 'approved', 0.09987875578, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('293ce8db-5203-481f-b8b1-a14946e172c5', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.001537475999999996, 'withdrawal', 'approved', 0.09834127978, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0d4e5feb-a99b-4ccb-8390-3e37fb3d5d42', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.02631856247, 'withdrawal', 'approved', 0.07202271731, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('472673ab-9d8f-4dec-806a-418850abb1e8', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0011636896200000052, 'yield', 'approved', 0.07318640693, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('30e42250-cbfe-423a-9d4d-9e5df9b7a45f', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.006474160140000004, 'withdrawal', 'approved', 0.06671224679, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6686b2f9-974f-48c7-8506-f90e6044a3db', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0009404622399999951, 'yield', 'approved', 0.06765270903, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5055e3ce-7171-4c3d-8c5c-74a9204367ce', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0009984092399999978, 'withdrawal', 'approved', 0.06665429979, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c442f153-a1d6-4463-9910-394c18f07a84', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0013951182700000092, 'yield', 'approved', 0.06804941806, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ff3d73fc-a561-4a19-9fcd-e8d91a86ec1c', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0019794011900000075, 'withdrawal', 'approved', 0.06607001687, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('53aabfa8-aa4c-401d-bc40-a10ddd9fdf97', 'e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 1.2853100000001505e-05, 'withdrawal', 'approved', 0.06605716377, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c4c702ed-3b28-4463-89d9-40d237c3b4f7', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 0.06605033239, 'deposit', 'approved', 0.06605033239, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c25feefa-0b0a-4716-a143-29ce11e8d901', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 0.0008546616699999926, 'withdrawal', 'approved', 0.06519567072, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('330dde94-6a03-42b7-94c2-103a77ed5a43', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 0.0034309781600000006, 'withdrawal', 'approved', 0.06176469256, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8983be7d-79a7-4652-b1be-2dba342de7f3', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 0.00028745613000000225, 'withdrawal', 'approved', 0.06147723643, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c21b7396-9fec-4d03-bdc5-7eef0ed5484e', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 0.04639923386, 'withdrawal', 'approved', 0.01507800257, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('37254f09-d4bb-498f-8b1e-4fcfcaa10126', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.0001383857799999999, 'withdrawal', 'approved', 0.01493961679, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2080da92-b370-4056-afd9-43cfe220c683', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.012618523022, 'withdrawal', 'approved', 0.002321093768, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('56ac402c-c936-4a79-9773-0c06ec3bcc11', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.00010284840400000012, 'withdrawal', 'approved', 0.002218245364, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('63cb17b1-fee8-4808-b959-96687d4e3807', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.0001013007140000001, 'withdrawal', 'approved', 0.00211694465, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c2fe5e2d-ee36-420c-b36c-0069fa1fcf64', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.00010657489900000022, 'yield', 'approved', 0.002223519549, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d135f258-4782-4963-a777-45d01ccb7e98', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 3.4167698000000125e-05, 'withdrawal', 'approved', 0.002189351851, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('29651c03-2ff9-4fb5-9e2b-5eceafdf001a', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.000585704774, 'withdrawal', 'approved', 0.001603647077, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e3c3ed01-6c32-4fd0-8787-31b92f175a74', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 2.5939797999999844e-05, 'yield', 'approved', 0.001629586875, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a372cf69-f09f-4cf5-8ddc-4e55a6aeb741', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.00014391759699999992, 'withdrawal', 'approved', 0.001485669278, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8f174472-0793-48b2-be71-ebdd38776047', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 2.1219335000000018e-05, 'yield', 'approved', 0.001506888613, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('52d6c7d0-72b2-4da8-a62c-c6b97fb88d88', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 2.211403800000001e-05, 'withdrawal', 'approved', 0.001484774575, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8dce2615-0a62-4987-a3ee-2c4c0a035765', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 3.110977900000001e-05, 'yield', 'approved', 0.001515884354, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1aa8b1f3-f755-4604-8936-41f47c9a0380', '46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 4.409359200000006e-05, 'withdrawal', 'approved', 0.001471790762, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('745e8ee5-1897-4570-a38e-25eb50181901', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-04', '2025-08-04', 'USDT', 1.030340685e-06, 'deposit', 'approved', 1.030340685e-06, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e1ecf761-b89d-4fea-9b00-cdd59b4afbae', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-14', '2025-08-14', 'USDT', 7.39357295e-06, 'deposit', 'approved', 8.423913635e-06, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ef71b177-e5b1-4914-b4c6-ddf33f4f05c0', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-08-19', '2025-08-19', 'USDT', 2.564017974999999e-06, 'deposit', 'approved', 1.098793161e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('97ab0e28-b7e5-4380-97fc-6d777fdfa2bb', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-01', '2025-09-01', 'USDT', 7.20747373e-06, 'deposit', 'approved', 1.819540534e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('df853ea9-fcd9-4a20-a9e7-9051f50f7686', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-24', '2025-09-24', 'USDT', 1.19543347e-05, 'deposit', 'approved', 3.014974004e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ceb947b2-2b33-44e9-a450-bce3a31ff948', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-09-30', '2025-09-30', 'USDT', 4.053669860000002e-06, 'yield', 'approved', 3.42034099e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('961c3ea8-bd5d-405d-954f-e89d7da131ff', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 1.7673436500000023e-06, 'yield', 'approved', 3.597075355e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7e71d45a-dfb9-4be5-b146-990d6e2c385e', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 3.1117497599999935e-06, 'yield', 'approved', 3.908250331e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2f21f9c2-4c83-4746-baf3-8dfce5e91359', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 3.0359039800000005e-06, 'yield', 'approved', 4.211840729e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e9f5cd13-df60-4674-bd16-f8597072341c', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 4.0610657000000606e-07, 'yield', 'approved', 4.252451386e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('71072b12-d775-4a5c-b1cd-3a27364bde46', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 9.350771899999943e-07, 'yield', 'approved', 4.345959105e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ace6bf4-fe5d-475e-800e-f907088bdd94', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 5.46062065e-06, 'yield', 'approved', 4.89202117e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('936378bb-f451-4aeb-b975-739abd92d075', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 2.94569312e-06, 'yield', 'approved', 5.186590482e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f450dffc-88ba-4d41-a769-2bb84ae1b723', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 2.3033604999999772e-07, 'withdrawal', 'approved', 5.163556877e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ea4ff4a5-2907-4fb4-93ba-c8dd7a3b15d4', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 1.1731966950000003e-05, 'withdrawal', 'approved', 3.990360182e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f846d6eb-a486-4d02-9cc5-8e257b0c4401', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 9.221570700000006e-07, 'yield', 'approved', 4.082575889e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8abf5c43-7279-4a40-a51d-f3e5754c80b8', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 1.3580291200000001e-06, 'withdrawal', 'approved', 3.946772977e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a35477e4-6ebb-4b17-8e51-604ab6e9e073', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 3.1664472700000047e-06, 'yield', 'approved', 4.263417704e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3b99fd98-cc10-4699-9ddc-e4dbad8813a2', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 5.492011199999987e-07, 'yield', 'approved', 4.318337816e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2fa2fffc-8c8c-4f35-aa1b-65a3f58330b7', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 1.211342150000002e-06, 'yield', 'approved', 4.439472031e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b37b9d0e-dc3c-483c-8f8e-6d11ea0c253a', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 1.2913404000000015e-06, 'withdrawal', 'approved', 4.310337991e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8874bf3f-2439-40b5-b417-1bd053fe676d', '30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 2.702640099999998e-06, 'yield', 'approved', 4.580602001e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('18e8c1fa-f463-4162-90cd-a35a87a7aee7', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-06', '2025-10-06', 'USDT', 0.04639923386, 'deposit', 'approved', 0.04639923386, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7f09a688-4871-473c-abc0-3ff741caa17b', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-09', '2025-10-09', 'USDT', 0.000438365429999997, 'withdrawal', 'approved', 0.04596086843, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('191c1078-a13c-442c-8f69-a16ffdd0de51', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-13', '2025-10-13', 'USDT', 0.000580346629999999, 'yield', 'approved', 0.04654121506, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0684434b-9680-474c-8db8-adfa8ed9b9fb', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.002069794, 'withdrawal', 'approved', 0.04447142106, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cd49fe22-1145-42fc-95b5-56589bc289d2', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.002040424860000001, 'withdrawal', 'approved', 0.0424309962, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a8991e87-576a-48dd-baf2-fb851d681804', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 1.7328279999999363e-05, 'withdrawal', 'approved', 0.04241366792, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4ffdffb3-f322-4867-a50a-f17468b2f9cf', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.0021337290800000006, 'yield', 'approved', 0.044547397, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ab092d59-bcbd-4398-824c-cf99d89ea9cd', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0006863367900000056, 'withdrawal', 'approved', 0.04386106021, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6a9c656f-e0c7-400f-b7e4-b2b49866f241', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.01174051005, 'withdrawal', 'approved', 0.03212055016, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('68aec024-76ad-4743-98d7-4b8410b1d219', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0005186870000000038, 'yield', 'approved', 0.03263923716, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('aa758dbf-2732-4386-9773-56225f58deb4', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.0028896875300000006, 'withdrawal', 'approved', 0.02974954963, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('214cfb18-fd45-4949-a54a-269219fbaf74', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.00041663066000000026, 'yield', 'approved', 0.03016618029, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1ca28be1-00d3-4677-ba7c-9545ece5fa5c', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0004464335899999998, 'withdrawal', 'approved', 0.0297197467, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('86d2e109-38cf-4bc3-ac1f-c9528df9cd2f', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0006217288399999986, 'yield', 'approved', 0.03034147554, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a6b4a137-1ec8-45c3-b8ab-2dedb0cecf53', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0008825637999999997, 'withdrawal', 'approved', 0.02945891174, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b4c50386-33b6-4a80-9e08-a9489541e054', '4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 8.59630000000014e-06, 'withdrawal', 'approved', 0.02945031544, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f099f553-b45a-49c3-82d7-d8c84266195c', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-15', '2025-10-15', 'USDT', 0.04431031847, 'deposit', 'approved', 0.04431031847, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cc9be172-ada4-477b-90d2-87ba9839537f', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.002036203809999998, 'withdrawal', 'approved', 0.04227411466, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ad128b1b-48cb-42b1-bc96-cc6f103df074', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 2.3018950000001925e-05, 'withdrawal', 'approved', 0.04225109571, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('21e8a5b3-a143-42c2-8732-d907fb2d2c1c', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.00212504132, 'yield', 'approved', 0.04437613703, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9a01e7da-4cdb-497e-8ab6-06e34984e389', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.000684295750000001, 'withdrawal', 'approved', 0.04369184128, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d7f34473-cef7-40c3-9e7f-b073700d4919', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.011697409719999996, 'withdrawal', 'approved', 0.03199443156, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ddacab1d-a172-4690-9465-41c04a1ee1bf', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0005163585399999976, 'yield', 'approved', 0.0325107901, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b089d9f0-4485-497e-af6e-3b557180a734', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.0028806864200000004, 'withdrawal', 'approved', 0.02963010368, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('fd2dbf4c-9ffb-4242-88b3-47bdd285a95a', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.00041221143, 'yield', 'approved', 0.03004231511, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1dcbb87c-8a77-40c5-895f-5bbe554377c9', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.00044584068999999754, 'withdrawal', 'approved', 0.02959647442, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5835c67e-9867-4ceb-88ef-6923edf0df41', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0006188263699999988, 'yield', 'approved', 0.03021530079, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('745b70fa-bbaf-4977-9407-1c1ce64eda9f', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0008788936699999986, 'withdrawal', 'approved', 0.02933640712, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e96af428-a727-4207-9dc2-1c8f1a211ae4', '7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 1.1414060000002751e-05, 'withdrawal', 'approved', 0.02932499306, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('41fe8ae3-4d15-4630-8f0e-d906744cf98e', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-23', '2025-10-23', 'USDT', 0.04125426129, 'deposit', 'approved', 0.04125426129, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c857265f-fd60-4a55-bae4-740507265f6e', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-10-31', '2025-10-31', 'USDT', 2.246361999999613e-05, 'withdrawal', 'approved', 0.04123179767, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b4cc58e4-0a24-408a-a51f-fa1d111573c8', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-03', '2025-11-03', 'USDT', 0.002073775180000001, 'yield', 'approved', 0.04330557285, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('33ab95f0-149f-4c23-9cf7-ce3ec04093a0', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-04', '2025-11-04', 'USDT', 0.0006677872700000045, 'withdrawal', 'approved', 0.04263778558, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a3750136-411f-4341-95ec-40efc370ebeb', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.011415212379999998, 'withdrawal', 'approved', 0.0312225732, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dfd6649d-b283-4b8c-b27e-ec6e7ce3c050', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.015671601389999998, 'withdrawal', 'approved', 0.01555097181, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b3361a9d-87b9-4d38-9412-7e04c1082181', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.0013779263200000003, 'withdrawal', 'approved', 0.01417304549, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('eb01fbb4-c159-4425-973d-68bcc1ff81e1', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0140855034712, 'withdrawal', 'approved', 8.75420188e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0eb2911a-1020-435a-81c2-2e5c806f7980', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 1.2991606500000055e-06, 'withdrawal', 'approved', 8.624285815e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c708651b-c149-4924-9499-211b1a5b9c8d', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 1.8032335200000047e-06, 'yield', 'approved', 8.804609167e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('87e96f5c-ef83-4dcc-9ce8-bb0c75f6c520', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 2.5610584800000086e-06, 'withdrawal', 'approved', 8.548503319e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7343c9ac-1269-48d7-93bd-078dde937425', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 3.326008999999749e-08, 'withdrawal', 'approved', 8.54517731e-05, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7f26f9b8-7344-49c4-80fb-3ba124e3ca2d', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-07', '2025-11-07', 'USDT', 0.2675242783, 'deposit', 'approved', 0.2675242783, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f587a10c-29d3-4344-adea-9d453cbe2456', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-08', '2025-11-08', 'USDT', 0.0043175778000000276, 'yield', 'approved', 0.2718418561, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('60bf0f06-4690-4c09-b224-8891a6c00a06', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.0240871151, 'withdrawal', 'approved', 0.247754741, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('78a47d6c-9cd3-47f0-9819-73b3f35c33d0', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0034467423999999802, 'yield', 'approved', 0.2512014834, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('73efa9e0-f390-4ed8-a49f-27eb46f57789', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.003727936499999973, 'withdrawal', 'approved', 0.2474735469, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ff8e6db1-5727-40a4-8bed-6ea919aac009', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.005174371600000005, 'yield', 'approved', 0.2526479185, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0ef66e92-4481-4d21-9649-c8d2ceb1bfe0', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.007348947300000019, 'withdrawal', 'approved', 0.2452989712, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('726a966e-05cf-4f87-8b37-81094cb5292b', '2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 9.543970000000512e-05, 'withdrawal', 'approved', 0.2452035315, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9f6f2876-321c-4b5e-997f-6ac67d43e97f', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-13', '2025-11-13', 'USDT', 0.08831538808, 'deposit', 'approved', 0.08831538808, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e74e9f68-50ee-4c39-b2b4-ad4048b1fecf', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-21', '2025-11-21', 'USDT', 0.0012613802199999968, 'yield', 'approved', 0.0895767683, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0f0c9122-d00a-436b-b887-967dbb600b3f', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.001314565709999993, 'withdrawal', 'approved', 0.08826220259, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ddf6a123-908b-4ff0-884f-60040b7f3e26', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0244958569, 'withdrawal', 'approved', 0.06376634569, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d033e99c-d72f-4f01-9a69-0376f2b913f8', '3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.0018548164600000056, 'withdrawal', 'approved', 0.06191152923, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0002c9a7-06e8-4950-959b-143aec98e115', '23788484-2a19-5495-a829-098bff0da61a', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-25', '2025-11-25', 'USDT', 0.0146752973, 'deposit', 'approved', 0.0146752973, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e8954174-74f3-4b5f-b98e-395eda3d9620', '23788484-2a19-5495-a829-098bff0da61a', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-26', '2025-11-26', 'USDT', 0.0003068426600000007, 'yield', 'approved', 0.01498213996, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('64937916-a49c-4e68-b80f-0191c6b527a8', '23788484-2a19-5495-a829-098bff0da61a', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.00043579602000000037, 'withdrawal', 'approved', 0.01454634394, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9827d746-736d-46bd-902b-b8c0887b5b56', '23788484-2a19-5495-a829-098bff0da61a', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 5.65961999999913e-06, 'withdrawal', 'approved', 0.01454068432, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5b0e32db-b6eb-462c-b3ad-25b22bbbc14d', 'a5a304e5-c8a1-55cd-8c26-147cf9363d8d', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-27', '2025-11-27', 'USDT', 0.02908770203, 'deposit', 'approved', 0.02908770203, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('32bc3db8-4eaf-45f1-9a32-e704d10d4d47', 'a5a304e5-c8a1-55cd-8c26-147cf9363d8d', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 1.1317299999997338e-05, 'withdrawal', 'approved', 0.02907638473, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d7b8f337-2829-4589-b66f-b1ea9c66f8e0', 'aca75818-8abd-5d7f-a7dd-e107b94cf65b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', '2025-11-30', '2025-11-30', 'USDT', 1.131729798e-06, 'deposit', 'approved', 1.131729798e-06, 'Reconciled from USDT Yield Fund', 'USDT')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a9b8fda6-a473-41e3-adbf-77ab0c5c990f', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-02', '2025-09-02', 'SOL', 1250.0, 'deposit', 'approved', 1250, 'Reconciled from SOL Yield Fund (Matched Investment Date: 2025-09-02T00:00:00)', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('dafa2bc3-ef9b-41af-bd36-4499e83aee5f', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-04', '2025-09-04', 'SOL', 2, 'yield', 'approved', 1252, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a7b5aded-91e6-4844-a74d-ee17483e2072', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-30', '2025-09-30', 'SOL', 11.650861000000077, 'yield', 'approved', 1263.650861, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('93e3b624-a269-4d94-8329-036b6c92472f', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-23', '2025-10-23', 'SOL', 10.017390999999861, 'yield', 'approved', 1273.668252, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('6c6106c5-e7b3-48d2-9974-fe2b3f300668', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-31', '2025-10-31', 'SOL', 2.824180999999953, 'yield', 'approved', 1276.492433, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('7f54f547-36c3-4286-9862-ff7308b7f04d', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-17', '2025-11-17', 'SOL', 3.740637000000106, 'yield', 'approved', 1280.23307, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cb53ac72-bba7-4143-8e28-e2e7975889fa', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 2.8076619999999366, 'yield', 'approved', 1283.040732, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4937ab83-8fd8-4d87-a38f-d65cf65082aa', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 2.6144480000000385, 'yield', 'approved', 1285.65518, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d327b9e3-f8f4-4f5c-a1bc-63d2ae68412a', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 1285.65518, 'withdrawal', 'approved', 0, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ef934251-97d8-45a0-bdd4-025806c6c43c', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-04', '2025-09-04', 'SOL', 234.17, 'deposit', 'approved', 234.17, 'Reconciled from SOL Yield Fund (Matched Investment Date: 2025-09-04T00:00:00)', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('718bde8a-c5b3-4656-b284-cb756a0e6ab3', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-30', '2025-09-30', 'SOL', 1.852268200000026, 'yield', 'approved', 236.0222682, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('08db6857-c36f-4159-b0b9-f1117178e9c8', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-03', '2025-10-03', 'SOL', 236.0222682, 'withdrawal', 'approved', 0, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9f7b1303-0ec4-4d68-8046-fe290016314b', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-30', '2025-09-30', 'SOL', 0.03268708593, 'deposit', 'approved', 0.03268708593, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4555da6f-fbac-422b-bb10-17a53e1ff4d1', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-23', '2025-10-23', 'SOL', 0.00020729733000000167, 'yield', 'approved', 0.03289438326, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a02d2c00-04ad-4e60-a022-57b543526f8f', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-31', '2025-10-31', 'SOL', 5.8350960000001784e-05, 'yield', 'approved', 0.03295273422, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2b4037cb-4cd9-46f6-a063-d64b863feace', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-17', '2025-11-17', 'SOL', 7.725182999999969e-05, 'yield', 'approved', 0.03302998605, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('368f4ff5-cf41-4904-84c1-84bd30b5251a', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 5.7950080000000737e-05, 'yield', 'approved', 0.03308793613, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('a1ad94cf-9fe8-45a6-ad1c-d5139d848d81', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 5.3938560000001134e-05, 'yield', 'approved', 0.03314187469, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0495dd5d-9c70-4036-8a48-d23529551da3', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 3.3962639999995936e-05, 'yield', 'approved', 0.03317583733, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('351aacd4-c498-484b-8549-501d31a82502', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-23', '2025-10-23', 'SOL', 87.98, 'deposit', 'approved', 87.98, 'Reconciled from SOL Yield Fund (Matched Investment Date: 2025-10-23T00:00:00)', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('53c93e8a-dbfe-4cf3-ae46-1a6c22279454', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-31', '2025-10-31', 'SOL', 0.1560666700000013, 'yield', 'approved', 88.13606667, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c3c8f7ba-c2c4-4432-a4bd-ad064b8b2c56', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-17', '2025-11-17', 'SOL', 0.20661934999999687, 'yield', 'approved', 88.34268602, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('9df0a0d0-2899-4632-adaf-4854df3b3c27', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 0.1549945000000008, 'yield', 'approved', 88.49768052, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('03b93f34-032e-419c-8b69-ce3765ad7e42', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 0.14426519999999243, 'yield', 'approved', 88.64194572, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('1ef25e20-8e0e-4e38-8a0c-efd13bfd6acb', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 0.09083717000000036, 'yield', 'approved', 88.73278289, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f874550b-f00a-4e99-993c-9745d87a4253', '85e40050-cf85-5c53-91e3-b149a1d11c64', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-17', '2025-11-17', 'SOL', 1800.05, 'deposit', 'approved', 1800.05, 'Reconciled from SOL Yield Fund (Matched Investment Date: 2025-11-17T00:00:00)', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('c1c3b29a-3434-41e7-9632-48ba78fa91bd', '85e40050-cf85-5c53-91e3-b149a1d11c64', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 753.1581320000003, 'deposit', 'approved', 2553.208132, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('313cf290-ea3a-4d3f-83ba-97155a01fb1e', '85e40050-cf85-5c53-91e3-b149a1d11c64', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 754.1621319999999, 'deposit', 'approved', 3307.370264, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('ccefc9eb-17f7-474c-a140-6d08c65b752a', '85e40050-cf85-5c53-91e3-b149a1d11c64', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 3.389277999999649, 'yield', 'approved', 3310.759542, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bd78fa37-549b-46d5-b6be-841752258a2d', '174d213f-9455-5d16-aa36-2e3557272ae5', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 0.07895329831, 'deposit', 'approved', 0.07895329831, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d14e1d25-b153-45b6-9fc2-d32c674f6f23', '174d213f-9455-5d16-aa36-2e3557272ae5', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 0.10418201789, 'deposit', 'approved', 0.1831353162, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('3ba679ae-1b55-4596-8b99-ce1842a2e9ab', '174d213f-9455-5d16-aa36-2e3557272ae5', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 0.08491961599999998, 'deposit', 'approved', 0.2680549322, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5a14bb04-d9d5-48b1-bf1a-b764e14f5a49', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-02', '2025-09-02', 'SOL', 1.0, 'deposit', 'approved', 1, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4dab978a-fcf0-4c85-958c-8a39d5d937fb', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-04', '2025-09-04', 'SOL', 0.1575660927, 'withdrawal', 'approved', 0.8424339073, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('192661f0-d3a1-4d0d-9a36-8c5db88a8e09', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-03', '2025-10-03', 'SOL', 0.15730748780000003, 'yield', 'approved', 0.9997413951, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f075edb6-83bf-46e2-90e7-a70364a15a20', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-23', '2025-10-23', 'SOL', 0.06458053390000007, 'withdrawal', 'approved', 0.9351608612, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f56b259a-aa6b-4637-994d-1133b34454dc', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-17', '2025-11-17', 'SOL', 0.5311804891, 'withdrawal', 'approved', 0.4039803721, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('27195a17-534e-40ea-a2c5-82cc0f9dc835', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 0.07717408469999998, 'withdrawal', 'approved', 0.3268062874, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('28eef7e6-1f73-4764-8d8b-dad67fe3b121', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 0.05232810339999999, 'withdrawal', 'approved', 0.274478184, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5d64829a-e201-4a74-9a37-849f3d7b7444', '4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 0.274478184, 'withdrawal', 'approved', 0, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('92ddd1ec-6368-43e5-b23f-4f78053bf69d', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-04', '2025-09-04', 'SOL', 0.1575660927, 'deposit', 'approved', 0.1575660927, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('969c5845-12d0-4f39-a7b1-151a3bdfabc2', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-30', '2025-09-30', 'SOL', 0.0002179139000000052, 'withdrawal', 'approved', 0.1573481788, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d83d7cab-ecc2-46f5-8491-0b4a8e59a943', '179e05fe-b763-557f-ac0e-f6750bfc1b35', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-03', '2025-10-03', 'SOL', 0.1573481788, 'withdrawal', 'approved', 0, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bbaaa33a-6ccc-4fa5-ae7e-27965571cbbc', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-09-30', '2025-09-30', 'SOL', 2.179139062e-05, 'deposit', 'approved', 2.179139062e-05, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('78acfa40-77c8-485d-baf3-47566258d0ad', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-03', '2025-10-03', 'SOL', 4.069101309999999e-06, 'yield', 'approved', 2.586049193e-05, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('350f1667-8003-4489-92ee-1c7db04000d2', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-23', '2025-10-23', 'SOL', 1.7085671699999993e-06, 'withdrawal', 'approved', 2.415192476e-05, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('e7f916e4-b28d-435a-81ec-a4397b378782', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-31', '2025-10-31', 'SOL', 1.0687010000000693e-08, 'withdrawal', 'approved', 2.414123775e-05, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('57bd5980-781b-4d0c-8e12-1028ea8b386d', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-17', '2025-11-17', 'SOL', 1.371855272e-05, 'withdrawal', 'approved', 1.042268503e-05, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('164d5f49-479b-49e4-937a-1b1f7867ec98', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 1.994779899e-06, 'withdrawal', 'approved', 8.427905131e-06, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('337f4e39-797d-4545-b598-16216f2180f6', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 1.3523519659999996e-06, 'withdrawal', 'approved', 7.075553165e-06, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('d429095c-bbe4-4686-8237-0851d68f03b4', 'e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 2.6696132549999993e-06, 'deposit', 'approved', 9.74516642e-06, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('87608061-73fd-49b2-9edf-0752d3ea67fe', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-23', '2025-10-23', 'SOL', 0.06459723908, 'deposit', 'approved', 0.06459723908, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4372a2c9-03ba-48ce-9268-ac9a9fc87707', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-10-31', '2025-10-31', 'SOL', 2.8583690000000272e-05, 'withdrawal', 'approved', 0.06456865539, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5dd74deb-82ed-4354-b865-407ba8165755', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-17', '2025-11-17', 'SOL', 0.03669192574999999, 'withdrawal', 'approved', 0.02787672964, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5fb082f3-0759-4cd2-8de9-d0a49069e3f2', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 0.0053352797100000016, 'withdrawal', 'approved', 0.02254144993, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f9a2d8c9-d231-464a-9da7-9153cc9803cb', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 0.003617028629999998, 'withdrawal', 'approved', 0.0189244213, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('8dff6449-b242-4690-8e8e-9d2c97647f8c', 'c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 0.007140203009999999, 'deposit', 'approved', 0.02606462431, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('276387d4-4906-4b1a-a01a-e55619fb0597', '85e40050-cf85-5c53-91e3-b149a1d11c64', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-17', '2025-11-17', 'SOL', 0.5680097522, 'deposit', 'approved', 0.5680097522, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('0ba6495b-644b-420b-a8e1-d512bd7aac98', '85e40050-cf85-5c53-91e3-b149a1d11c64', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 0.08232382639999991, 'yield', 'approved', 0.6503335786, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('5e3a97d2-1ae4-4f74-bb80-82b200f51219', '85e40050-cf85-5c53-91e3-b149a1d11c64', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 0.05576631330000004, 'yield', 'approved', 0.7060998919, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f01d8d3-34b7-4848-a4cd-9749b92cf407', '85e40050-cf85-5c53-91e3-b149a1d11c64', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 0.26641219250000003, 'deposit', 'approved', 0.9725120844, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('db119cf5-60e0-4363-8a8b-4eff900a049c', '174d213f-9455-5d16-aa36-2e3557272ae5', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-25', '2025-11-25', 'SOL', 2.011037815e-05, 'deposit', 'approved', 2.011037815e-05, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('daed8482-5cf2-4cac-90a9-60713e4e3ccb', '174d213f-9455-5d16-aa36-2e3557272ae5', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-11-30', '2025-11-30', 'SOL', 1.8987701789999997e-05, 'deposit', 'approved', 3.909807994e-05, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('b68d23eb-843a-4611-a612-0980f2b59553', '174d213f-9455-5d16-aa36-2e3557272ae5', '916cd303-fdb2-50cc-b27d-5cc440215c88', '2025-12-04', '2025-12-04', 'SOL', 3.964115119000001e-05, 'deposit', 'approved', 7.873923113e-05, 'Reconciled from SOL Yield Fund', 'SOL')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('bb43fda7-b17e-4bdb-8de9-35445b7327b8', '85e40050-cf85-5c53-91e3-b149a1d11c64', '79690b17-0d5d-539e-b576-b3b3f5ea09b9', '2025-11-17', '2025-11-17', 'XRP', 135003.0, 'deposit', 'approved', 135003, 'Reconciled from XRP Yield Fund (Matched Investment Date: 2025-11-17T00:00:00)', 'XRP')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('4f259acf-5db6-40d3-9bf8-2e88c4856326', '85e40050-cf85-5c53-91e3-b149a1d11c64', '79690b17-0d5d-539e-b576-b3b3f5ea09b9', '2025-11-25', '2025-11-25', 'XRP', 49000, 'deposit', 'approved', 184003, 'Reconciled from XRP Yield Fund (Matched Investment Date: 2025-11-25T00:00:00)', 'XRP')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('091b61bd-a86f-44bc-8d56-e426a3c2ad90', '85e40050-cf85-5c53-91e3-b149a1d11c64', '79690b17-0d5d-539e-b576-b3b3f5ea09b9', '2025-11-30', '2025-11-30', 'XRP', 45284, 'deposit', 'approved', 229287, 'Reconciled from XRP Yield Fund', 'XRP')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('78baf8d6-da79-43fa-90b2-31735f49e557', '174d213f-9455-5d16-aa36-2e3557272ae5', '79690b17-0d5d-539e-b576-b3b3f5ea09b9', '2025-11-30', '2025-11-30', 'XRP', 7.1, 'deposit', 'approved', 7.1, 'Reconciled from XRP Yield Fund', 'XRP')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('cdb80505-d95a-4535-be56-560bb29bc84c', '85e40050-cf85-5c53-91e3-b149a1d11c64', '79690b17-0d5d-539e-b576-b3b3f5ea09b9', '2025-11-25', '2025-11-25', 'XRP', 1.0, 'deposit', 'approved', 1, 'Reconciled from XRP Yield Fund (Matched Investment Date: 2025-11-25T00:00:00)', 'XRP')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('f1875acc-9ee6-4b91-893d-ddd96c35104b', '85e40050-cf85-5c53-91e3-b149a1d11c64', '79690b17-0d5d-539e-b576-b3b3f5ea09b9', '2025-11-30', '2025-11-30', 'XRP', 0.0003095597000000172, 'withdrawal', 'approved', 0.9996904403, 'Reconciled from XRP Yield Fund', 'XRP')
        ON CONFLICT (id) DO NOTHING;
        

        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('2a05d22a-a649-48f2-bd9c-03fca3c9756e', '174d213f-9455-5d16-aa36-2e3557272ae5', '79690b17-0d5d-539e-b576-b3b3f5ea09b9', '2025-11-30', '2025-11-30', 'XRP', 3.095597276e-05, 'deposit', 'approved', 3.095597276e-05, 'Reconciled from XRP Yield Fund', 'XRP')
        ON CONFLICT (id) DO NOTHING;
        

-- 5. Update Investor Positions (Current State)

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('c2d5ccce-1bd6-50a0-9997-65350585ae31', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.1131707533, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('be698742-dd53-55ae-a404-b280eb607451', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.1170188145, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('3e7956c9-2dbd-54c1-9ede-83011437ad91', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.1596069743, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('f8159d04-322d-5b5e-bff9-f4dad1c21299', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.1032144499, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('13a4ed57-f416-59ec-925e-3403ad41a758', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 4.558434325, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('4ec51328-eea6-5e39-a178-c9c7b4d805e6', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.1505793669, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.4525498494, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('05cce195-6716-551b-ad91-3a5d0c4d5248', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.09780639043, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('bf54a1ce-0acd-56f0-a172-46bbc55ce3f0', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 2.142783918, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('179e05fe-b763-557f-ac0e-f6750bfc1b35', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('ab100e7e-0298-5c0d-8bc9-eb610f5d16cb', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 5.255872538e-07, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('85e40050-cf85-5c53-91e3-b149a1d11c64', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 5.501146418, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('174d213f-9455-5d16-aa36-2e3557272ae5', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 4.930768692e-07, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('28f90d52-d2a4-55e7-9d8c-cf29ab698750', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.08020028294, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('2103b664-4646-5cec-8530-f464d4f7dc05', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.107179045, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('b473d298-68f8-5225-b46d-a8a04d971f73', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.00354045964, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('35b7b16f-0994-557e-8845-437f89a479d1', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.01064046496, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('a4f2de17-af8e-53fb-ba85-17216bc40116', 'f4b45bd8-30c7-570f-9b9b-b725c3c601fc', 0.05038167003, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('1461129c-eef7-553b-8f37-330c42414760', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 68.50618959, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('30c6f9c1-eba1-50df-b88d-6d209efcb978', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 0.03819554915, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('4397e202-b0a2-5e02-8a74-43101bf0fc78', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 0, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('4a2dc8b1-6e2d-51b8-893a-bc8ddd1d2e36', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 37.37803768, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('c2d5ccce-1bd6-50a0-9997-65350585ae31', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 68.10454728, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('05cce195-6716-551b-ad91-3a5d0c4d5248', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 128.8089414, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('0d2aad95-3131-52fa-b5cb-4532baf483be', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 32.77317929, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('959a3971-0864-5feb-bfa5-960d56809e5e', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 0.01953308336, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('179e05fe-b763-557f-ac0e-f6750bfc1b35', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 0, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('e9523e10-efc0-5540-90d3-c304f7ad0ef6', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 0.003350812505, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('a1aecfcf-4772-5bf5-ad6d-8a47188b87e2', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 192.2302249, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('85e40050-cf85-5c53-91e3-b149a1d11c64', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 146.3724996, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('174d213f-9455-5d16-aa36-2e3557272ae5', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 0.009321029709, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('69c51f1e-4eb5-5633-9198-a0754e304af1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 31.37, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('35b7b16f-0994-557e-8845-437f89a479d1', '0c1743f4-74f9-5749-9c41-9d2c30b3089e', 0.05276998769, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('2fbd7a2d-91fa-52f0-9cee-0c1189a3226b', '7368d551-debf-59e7-8755-b24877e0b8b0', 2.100973605, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('be698742-dd53-55ae-a404-b280eb607451', '7368d551-debf-59e7-8755-b24877e0b8b0', 4.835701487, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('f8159d04-322d-5b5e-bff9-f4dad1c21299', '7368d551-debf-59e7-8755-b24877e0b8b0', 5.033510112, 0, NOW(), 'BTC')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('c2d5ccce-1bd6-50a0-9997-65350585ae31', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', 62.62613774, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('35b7b16f-0994-557e-8845-437f89a479d1', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', 26.67966075, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('05cce195-6716-551b-ad91-3a5d0c4d5248', 'cad26c2f-fc36-5f22-9ba6-b62032a48161', 119.7862356, 0, NOW(), 'ETH')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('1461129c-eef7-553b-8f37-330c42414760', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 240662.6579, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('4e768824-8692-52ec-8104-c629981d60a8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 113551.9262, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('b9a0ed03-5251-5437-8f66-9d01c4f5d7d0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 113950.5288, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('2b5e0c8f-1b5c-532b-93ef-a01a4a9724be', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 113490.6825, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('76f06441-aeee-5b52-822d-9ffa17b4eb6e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 345464.9331, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('feb2478f-db70-56be-9362-36cc8f22a910', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 284219.2505, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('ed2b12f9-1cfc-518d-87b5-6bef1fee33e0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 206149.7001, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('7e8de33b-2b79-5888-a29e-0fb06e36b118', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 141585.667, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('fffe25db-e153-5fc1-9eb9-6ecf61764aed', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 230583.4371, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('1541a158-4e91-5f77-b8fc-6b8375d185ba', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 227539.1852, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('46691d12-2945-5f80-8a86-325dec420021', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 5069.701023, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('4397e202-b0a2-5e02-8a74-43101bf0fc78', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 0, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('30c6f9c1-eba1-50df-b88d-6d209efcb978', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 157.7825004, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('4272ddbb-229b-50e0-95a0-7c8997f73340', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 101443.9676, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('7a88863a-9749-5612-b936-0eadd799e6a3', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 101012.2846, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('c2d5ccce-1bd6-50a0-9997-65350585ae31', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 294.3454687, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('2745929b-5ff3-5e08-ade2-b605254d29cd', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 844623.1806, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('3e7956c9-2dbd-54c1-9ede-83011437ad91', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 213259.2154, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('23788484-2a19-5495-a829-098bff0da61a', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 50086.55041, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('a5a304e5-c8a1-55cd-8c26-147cf9363d8d', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 100155.9334, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('aca75818-8abd-5d7f-a7dd-e107b94cf65b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 3.898333827, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('9c2a3ec0-0624-5e71-b1c0-288e635757ac', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 0.03296539088, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('ca3b0985-f9a3-55a1-a6df-6ed8c15ec91b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 0.03308110968, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('52bd1286-ed9e-5e7e-93ec-e1c0fac4c6b0', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 0.03294761117, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('ab7879dd-8a38-598d-9a24-afefd504eaa8', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 0.1002923239, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('a38de986-9bb7-54c3-9352-82ba2f47714e', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 0.08251201899, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('665ebcd2-24c8-51ce-babc-ba09e6f0de8b', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 0.04110389859, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('8d2a1fda-e0c8-508f-9d8c-99f0428407ee', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 0.06694094403, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('e8b05f75-ec0e-5856-a4b4-290eb1c627d4', 'ce21954c-a7c0-5945-bc9e-1dadbb06d487', 0.06605716377, 0, NOW(), 'USDT')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('4397e202-b0a2-5e02-8a74-43101bf0fc78', '916cd303-fdb2-50cc-b27d-5cc440215c88', 0, 0, NOW(), 'SOL')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('179e05fe-b763-557f-ac0e-f6750bfc1b35', '916cd303-fdb2-50cc-b27d-5cc440215c88', 0, 0, NOW(), 'SOL')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('e9523e10-efc0-5540-90d3-c304f7ad0ef6', '916cd303-fdb2-50cc-b27d-5cc440215c88', 0.03317583733, 0, NOW(), 'SOL')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('c2d5ccce-1bd6-50a0-9997-65350585ae31', '916cd303-fdb2-50cc-b27d-5cc440215c88', 88.73278289, 0, NOW(), 'SOL')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('85e40050-cf85-5c53-91e3-b149a1d11c64', '916cd303-fdb2-50cc-b27d-5cc440215c88', 3310.759542, 0, NOW(), 'SOL')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('174d213f-9455-5d16-aa36-2e3557272ae5', '916cd303-fdb2-50cc-b27d-5cc440215c88', 0.2680549322, 0, NOW(), 'SOL')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('85e40050-cf85-5c53-91e3-b149a1d11c64', '79690b17-0d5d-539e-b576-b3b3f5ea09b9', 229287, 0, NOW(), 'XRP')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        

        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('174d213f-9455-5d16-aa36-2e3557272ae5', '79690b17-0d5d-539e-b576-b3b3f5ea09b9', 7.1, 0, NOW(), 'XRP')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        