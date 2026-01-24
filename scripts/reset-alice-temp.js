require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.log("List error:", listErr);
    return;
  }

  const alice = users.users.find((u) => u.email === "alice@test.indigo.com");
  if (!alice) {
    console.log("Alice not found");
    return;
  }

  console.log("Found Alice:", alice.id);

  const { data, error } = await supabase.auth.admin.updateUserById(alice.id, {
    password: "AliceTest123!",
  });

  if (error) {
    console.log("Update error:", error);
  } else {
    console.log("Password updated for:", data.user.email);
  }
}

main();
