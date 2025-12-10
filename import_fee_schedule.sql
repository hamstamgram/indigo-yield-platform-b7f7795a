
    CREATE TABLE IF NOT EXISTS public.investor_fee_schedule (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        investor_id uuid REFERENCES public.investors(id) ON DELETE CASCADE,
        fund_id uuid REFERENCES public.funds(id) ON DELETE CASCADE,
        perf_fee_bps integer DEFAULT 2000,
        mgmt_fee_bps integer DEFAULT 200,
        effective_date date DEFAULT '2024-01-01',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE(investor_id, fund_id)
    );
    
    -- Add RLS policies if needed (omitted for migration script)
    

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Jose Molla'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1500, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Kyle Gulamerian'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Matthias Reiser'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Thomas Puech'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Danielle Richetta'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Kabbaj'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Victoria Pariente-Cohen'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Nathanaël Cohen'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Vivie-Ann Bakos'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Oliver Loisel'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1350, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Paul Johnson'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Alex Jacobs'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Sam Johnson'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Ryan Van Der Wall'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Thomas Puech'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Vivie & Liana'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Jose Molla'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1500, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Kyle Gulamerian'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Matthias Reiser'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Thomas Puech'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Danielle Richetta'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Kabbaj Fam'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Victoria'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Nathanael Cohen'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Vivie-Ann Bakos'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'oliver loisel'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1350, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Paul Johnson'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Alex Jacobs'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Sam Johnson'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Ryan Van Der Wall'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Thomas Puech'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Vivie & Liana'
          AND f.code = 'BTCYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Babak Eftekhari'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Lars Ahlgreen'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'INDIGO DIGITAL ASSET FUND LP'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Nathanaël Cohen'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Jose Molla'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Vivie-Ann Bakos'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Advantage Blockchain'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Alec Beckman'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1350, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Paul Johnson'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Alex Jacobs'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Tomer Zur'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Sam Johnson'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Ryan Van Der Wall'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Brandon Hood'
          AND f.code = 'ETHYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1500, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Kyle Gulamerian'
          AND f.code = 'BTCBST'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Matthias Reiser'
          AND f.code = 'BTCBST'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Danielle Richetta'
          AND f.code = 'BTCBST'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Victoria'
          AND f.code = 'BTCTAC'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Nathanael Cohen'
          AND f.code = 'BTCTAC'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Thomas Puech'
          AND f.code = 'BTCTAC'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Vivie-Ann Bakos'
          AND f.code = 'BTCTAC'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Jose Molla'
          AND f.code = 'ETHTAC'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Nathanael Cohen'
          AND f.code = 'ETHTAC'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Vivie-Ann Bakos'
          AND f.code = 'ETHTAC'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Babak Eftekhari'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Julien Grunebaum'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Daniele Francilia'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Pierre Bezençon'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Matthew Beatty'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Bo De kriek'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Dario Deiana'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Alain Bensimon'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Anne Cecile Noique'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Terance Chen'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'INDIGO Ventures'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'INDIGO DIGITAL ASSET FUND LP'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Lars Ahlgreen'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1500, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Sacha Oshry'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'HALLEY86'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Jose Molla'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Monica Levy Chicheportiche'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Thomas Puech'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Sam Johnson'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Ryan Van Der Wall'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Valeria Cruz'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Rabih Mokbel'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Joel Barbeau'
          AND f.code = 'USDTYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 0, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'INDIGO DIGITAL ASSET FUND LP'
          AND f.code = 'SOLYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1350, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Paul Johnson'
          AND f.code = 'SOLYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Alex Jacobs'
          AND f.code = 'SOLYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Jose Molla'
          AND f.code = 'SOLYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Sam Johnson'
          AND f.code = 'SOLYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Ryan Van Der Wall'
          AND f.code = 'SOLYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 1800, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Sam Johnson'
          AND f.code = 'XRPYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        

        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, 2000, 200
        FROM public.investors i, public.funds f
        WHERE i.name = 'Ryan Van Der Wall'
          AND f.code = 'XRPYF'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        