import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Data (Sanitized)
const users = [
  {
    id: "1b5bc810-c737-5406-8590-68f495bf50e5",
    email: "jose.molla@example.com",
    first: "Jose",
    last: "Molla",
  },
  {
    id: "0116835a-b1ef-52fe-bffc-a93a23859d15",
    email: "kyle.gulamerian@example.com",
    first: "Kyle",
    last: "Gulamerian",
  },
  {
    id: "5effb696-9d8e-56e2-bf10-05f1a9a2ccba",
    email: "matthias@example.com",
    first: "Matthias",
    last: "Reiser",
  },
  {
    id: "a839e2e2-32a6-50b3-8222-2e42a4477564",
    email: "thomas.puech@example.com",
    first: "Thomas",
    last: "Puech",
  },
  {
    id: "62de504b-ef46-55d0-8b53-2166ddb61883",
    email: "danielle@example.com",
    first: "Danielle",
    last: "Richetta",
  },
  {
    id: "faaa9b08-c545-5b67-9e4a-6f83f599423b",
    email: "nathanael.cohen@example.com",
    first: "Nathanaël",
    last: "Cohen",
  },
  {
    id: "0e8a1ee8-8276-5c5a-9a21-8a75846a0434",
    email: "blondish@example.com",
    first: "Blondish",
    last: "",
  },
  {
    id: "5836c530-b8f1-5e57-93e5-af65ab618593",
    email: "tac.program@example.com",
    first: "Victoria",
    last: "",
  },
  {
    id: "5e835847-27eb-58ff-ad59-995b958fe23d",
    email: "babak.eftekhari@example.com",
    first: "Babak",
    last: "Eftekhari",
  },
  {
    id: "35d59f82-9730-5010-ba48-c97f612fa3a5",
    email: "indigo.lp@example.com",
    first: "INDIGO",
    last: "DIGITAL ASSET FUND LP",
  },
  {
    id: "898b6c24-71d3-5a75-a29f-3ac8ec3bf2af",
    email: "h.kabbaj@example.com",
    first: "Kabbaj",
    last: "",
  },
  {
    id: "a3221ae4-df69-562a-8a1c-160d24c73f8a",
    email: "julien.grunebaum@example.com",
    first: "Julien",
    last: "Grunebaum",
  },
  {
    id: "39678d51-7ec4-5d38-bb27-8fdb51b05366",
    email: "daniele.francilia@example.com",
    first: "Daniele",
    last: "Francilia",
  },
  {
    id: "2c9c2933-801a-5ac8-97f7-f39c8eee8cdf",
    email: "pib@example.com",
    first: "Pierre",
    last: "Bezencon",
  },
  {
    id: "fba6a3f3-775d-5249-88e1-769ed2e38a0f",
    email: "matthew@example.com",
    first: "Matthew",
    last: "Beatty",
  },
  {
    id: "cbae1f0b-3497-5e1b-b60d-fd68d62ced4b",
    email: "bokriek@example.com",
    first: "Bo",
    last: "Kriek",
  },
  {
    id: "e2c558e9-7d21-5770-89a3-2f4c16a8f150",
    email: "dario.deiana@example.com",
    first: "Dario",
    last: "Deiana",
  },
  {
    id: "2270d947-2225-5227-a56d-d9c68d470781",
    email: "alain.bensimon@example.com",
    first: "Alain",
    last: "Bensimon",
  },
  {
    id: "0e70705b-c94b-5f08-be01-c1f0b7c8f276",
    email: "anne.cecile.noique@example.com",
    first: "Anne",
    last: "Cecile Noique",
  },
  {
    id: "5015794b-9db8-589d-a426-08e16d7d7038",
    email: "terance.chen@example.com",
    first: "Terance",
    last: "Chen",
  },
  {
    id: "b8681135-43f8-5432-832c-93848a66ef4d",
    email: "oliver.loisel@example.com",
    first: "Oliver",
    last: "Loisel",
  },
  {
    id: "2dd8daed-8ca6-5b36-90a9-d461d95c0ab2",
    email: "advantage.blockchain@example.com",
    first: "Advantage",
    last: "Blockchain",
  },
  {
    id: "aaefd32d-9886-51b6-ba23-1ba0f1a5ae2b",
    email: "indigo.ventures@example.com",
    first: "INDIGO",
    last: "Ventures",
  },
  {
    id: "464b743a-a1e7-5772-8ca6-bb4a87ebab17",
    email: "paul.johnson@example.com",
    first: "Paul",
    last: "Johnson",
  },
  {
    id: "812f13e6-4175-5a7e-bf2f-84cd19619805",
    email: "tomer.zur@example.com",
    first: "Tomer",
    last: "Zur",
  },
  {
    id: "c43810ab-af49-5b99-98e7-eb9e58087a6d",
    email: "sacha.oshry@example.com",
    first: "Sacha",
    last: "Oshry",
  },
  {
    id: "d80d08f7-c61e-5d78-b915-1b55851f11e3",
    email: "halley86@example.com",
    first: "HALLEY86",
    last: "",
  },
  {
    id: "e086ccaf-7a07-5ba9-b5b7-4359983ccfa2",
    email: "indigo.fees@example.com",
    first: "Indigo",
    last: "Fees",
  },
  {
    id: "a8db5b60-6cb2-5cf6-aa1f-d22fe6dd0887",
    email: "monica.levy.chicheportiche@example.com",
    first: "Monica",
    last: "Levy Chicheportiche",
  },
  {
    id: "2df91c31-573b-524f-a5ba-69b663e56a64",
    email: "nath.thomas@example.com",
    first: "Nath",
    last: "& Thomas",
  },
  {
    id: "048cb62d-f5ee-5157-82b6-c90115173517",
    email: "sam.johnson@example.com",
    first: "Sam",
    last: "Johnson",
  },
  {
    id: "997c46c9-775e-57bc-b081-0004e1731a30",
    email: "valeria.cruz@example.com",
    first: "Valeria",
    last: "Cruz",
  },
  {
    id: "a51c6009-de6c-500b-a3e9-e25cad07831b",
    email: "rabih.mokbel@example.com",
    first: "Rabih",
    last: "Mokbel",
  },
  {
    id: "4d0f7e52-89f7-5abd-bdc8-3547f1c0eb3e",
    email: "vivie.liana@example.com",
    first: "Vivie",
    last: "& Liana",
  },
  {
    id: "467c3ca9-c4ba-5129-91c2-dbed66f9171c",
    email: "brandon.hood@example.com",
    first: "Brandon",
    last: "Hood",
  },
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch all existing users to map Emails to IDs
    const {
      data: { users: existingUsers },
      error: listError,
    } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;

    const emailToId = {};
    existingUsers.forEach((u) => {
      if (u.email) emailToId[u.email.toLowerCase()] = u.id;
    });

    const results = [];

    for (const user of users) {
      const emailLower = user.email.toLowerCase();
      let uid = emailToId[emailLower];
      let status = "Found";

      // 2. Create if missing
      if (!uid) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: "TempPassword123!",
          email_confirm: true,
          user_metadata: { first_name: user.first, last_name: user.last },
        });

        if (authError) {
          results.push({ email: user.email, status: "Auth Error", error: authError.message });
          continue;
        }
        uid = authUser.user.id;
        status = "Created";
      }

      // 3. Upsert Profile & Investor
      try {
        await supabase.from("profiles").upsert({
          id: uid,
          email: user.email,
          first_name: user.first,
          last_name: user.last,
          status: "active",
        });

        await supabase.from("investors").upsert(
          {
            profile_id: uid,
            email: user.email,
            name: `${user.first} ${user.last}`,
            status: "active",
          },
          { onConflict: "profile_id" }
        );

        results.push({ email: user.email, status: `${status} & Upserted`, id: uid });
      } catch (dbError) {
        results.push({ email: user.email, status: "DB Error", error: dbError.message });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
