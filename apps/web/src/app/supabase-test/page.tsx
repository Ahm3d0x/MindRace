import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Query profiles table which actually exists in the database schema
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, rank");

  if (error) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Supabase Connection Error</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Supabase Connection Test</h1>
      <p>Successfully queried profiles:</p>
      <ul>
        {profiles?.map((profile) => (
          <li key={profile.id}>
            <strong>{profile.username}</strong> ({profile.rank})
          </li>
        ))}
      </ul>
    </div>
  );
}
