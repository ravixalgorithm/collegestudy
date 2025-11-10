const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

async function fixExpiresAtColumn() {
  console.log("🔧 Fixing expires_at column in events table...");

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing environment variables. Please check your .env file:");
    console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  // Create Supabase client with service role key
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("🚀 Executing SQL migration...");

    // Complete SQL migration in one go
    const migrationSQL = `
      -- Step 1: Add expires_at column if it doesn't exist
      ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

      -- Step 2: Update existing events with expiration dates (7 days after event_date)
      UPDATE events
      SET expires_at = event_date + INTERVAL '7 days'
      WHERE expires_at IS NULL;

      -- Step 3: Create index for performance
      CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);

      -- Step 4: Create or replace cleanup function
      CREATE OR REPLACE FUNCTION cleanup_expired_events()
      RETURNS TABLE(deleted_count INTEGER) AS $$
      DECLARE
          result_count INTEGER;
      BEGIN
          -- Delete expired events (past their expiration date and event date)
          DELETE FROM events
          WHERE expires_at IS NOT NULL
          AND expires_at < NOW()
          AND event_date < CURRENT_DATE;

          -- Get count of deleted rows
          GET DIAGNOSTICS result_count = ROW_COUNT;

          -- Return the count
          deleted_count := result_count;
          RETURN NEXT;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Step 5: Grant execute permission
      GRANT EXECUTE ON FUNCTION cleanup_expired_events() TO service_role;

      -- Step 6: Create trigger function for auto-setting expires_at
      CREATE OR REPLACE FUNCTION set_event_expiration()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Set expiration date to 7 days after event date if not manually set
          IF NEW.expires_at IS NULL THEN
              NEW.expires_at := (NEW.event_date + INTERVAL '7 days')::TIMESTAMP WITH TIME ZONE;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Step 7: Create trigger (drop first if exists)
      DROP TRIGGER IF EXISTS trigger_set_event_expiration ON events;
      CREATE TRIGGER trigger_set_event_expiration
          BEFORE INSERT OR UPDATE ON events
          FOR EACH ROW
          EXECUTE FUNCTION set_event_expiration();
    `;

    // Execute the migration using RPC
    const { data: migrationResult, error: migrationError } = await supabase.rpc("exec_sql", {
      query: migrationSQL,
    });

    if (migrationError) {
      console.log("⚠️ RPC exec_sql not available, trying direct table operations...");

      // Alternative approach - try updating records directly
      console.log("📅 Attempting direct table update...");

      // First, check if expires_at column exists by querying the table
      const { data: testData, error: testError } = await supabase
        .from("events")
        .select("id, event_date, expires_at")
        .limit(1);

      if (testError && testError.message.includes("expires_at does not exist")) {
        console.error("❌ expires_at column still missing. Please run this SQL manually in Supabase dashboard:");
        console.log("\n📋 COPY AND PASTE THIS SQL INTO SUPABASE SQL EDITOR:");
        console.log("=".repeat(60));
        console.log(migrationSQL);
        console.log("=".repeat(60));
        return;
      }

      if (testData) {
        console.log("✅ expires_at column already exists!");

        // Update events that don't have expires_at set
        const { data: events } = await supabase.from("events").select("id, event_date").is("expires_at", null);

        if (events && events.length > 0) {
          console.log(`📅 Updating ${events.length} events with expiration dates...`);

          for (const event of events) {
            const expirationDate = new Date(event.event_date);
            expirationDate.setDate(expirationDate.getDate() + 7);

            await supabase.from("events").update({ expires_at: expirationDate.toISOString() }).eq("id", event.id);
          }

          console.log("✅ Updated all events with expiration dates");
        }
      }
    } else {
      console.log("✅ Migration executed successfully via RPC");
    }

    // Verify the fix
    console.log("🔍 Verifying the fix...");
    const { data: events, error: verifyError } = await supabase
      .from("events")
      .select("id, title, event_date, expires_at")
      .limit(3);

    if (verifyError) {
      console.error("❌ Verification failed:", verifyError.message);

      if (verifyError.message.includes("expires_at does not exist")) {
        console.log("\n🚨 URGENT: Please run this SQL in your Supabase dashboard:");
        console.log("=".repeat(50));
        console.log("ALTER TABLE events ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;");
        console.log("UPDATE events SET expires_at = event_date + INTERVAL '7 days' WHERE expires_at IS NULL;");
        console.log("CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);");
        console.log("=".repeat(50));
      }
      return;
    }

    console.log("\n🎉 SUCCESS! expires_at column is working");
    console.log(`📊 Found ${events.length} events with expiration dates`);

    if (events.length > 0) {
      console.log("\n📋 Sample events:");
      events.forEach((event) => {
        console.log(`  - ${event.title || "Untitled"}: expires ${event.expires_at || "Not set"}`);
      });
    }

    // Test cleanup function
    console.log("\n🧹 Testing cleanup function...");
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc("cleanup_expired_events");

    if (cleanupError) {
      console.log("⚠️ Cleanup function needs to be created manually");
    } else {
      console.log("✅ Cleanup function is working");
    }

    console.log('\n🎊 All done! The "expires_at does not exist" error should be fixed.');
    console.log("💡 If you still get errors, restart your application servers.");
  } catch (error) {
    console.error("💥 Unexpected error:", error.message);

    console.log("\n📋 MANUAL FIX - Run this in Supabase SQL Editor:");
    console.log("=".repeat(60));
    console.log("-- Fix expires_at column");
    console.log("ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;");
    console.log("UPDATE events SET expires_at = event_date + INTERVAL '7 days' WHERE expires_at IS NULL;");
    console.log("CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);");
    console.log("=".repeat(60));
  }
}

// Run the fix
if (require.main === module) {
  console.log("🏥 HBTU College Study - Fixing expires_at Error\n");
  fixExpiresAtColumn();
}

module.exports = { fixExpiresAtColumn };
