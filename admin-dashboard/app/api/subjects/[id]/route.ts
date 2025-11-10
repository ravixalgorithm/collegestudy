import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subjectId = params.id;

    if (!subjectId) {
      return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
    }

    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization token is required" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Initialize admin Supabase client
    const supabase = getSupabaseAdmin();

    // Verify the user's JWT token and get user info
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json({ error: "Invalid or expired token", details: authError?.message }, { status: 401 });
    }

    console.log("Authenticated user:", user.id, user.email);

    // Check if the user is an admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.error("Error checking admin status:", userError);
      return NextResponse.json(
        { error: "Error verifying admin permissions", details: userError.message },
        { status: 500 },
      );
    }

    if (!userData?.is_admin) {
      console.log("User is not admin:", user.id, userData);
      return NextResponse.json({ error: "Admin permissions required" }, { status: 403 });
    }

    console.log("Admin user verified:", user.id);

    // Check all related data that might prevent deletion
    const [notesRes, timetableRes, examRes, forumRes, cgpaRes, subjectBranchesRes] = await Promise.all([
      supabase.from("notes").select("id, title").eq("subject_id", subjectId),
      supabase.from("timetable").select("id, day_of_week, start_time").eq("subject_id", subjectId),
      supabase.from("exam_schedule").select("id, exam_type, exam_date").eq("subject_id", subjectId),
      supabase.from("forum_posts").select("id, title").eq("subject_id", subjectId),
      supabase.from("cgpa_records").select("id, semester, grade").eq("subject_id", subjectId),
      supabase.from("subject_branches").select("id, branch_id").eq("subject_id", subjectId),
    ]);

    // Check for errors in any of the queries
    const errors = [
      { name: "notes", error: notesRes.error },
      { name: "timetable", error: timetableRes.error },
      { name: "exam_schedule", error: examRes.error },
      { name: "forum_posts", error: forumRes.error },
      { name: "cgpa_records", error: cgpaRes.error },
      { name: "subject_branches", error: subjectBranchesRes.error },
    ].filter((item) => item.error);

    if (errors.length > 0) {
      console.error("Errors checking related data:", errors);
      return NextResponse.json(
        {
          error: "Error checking related data",
          details: errors.map((e) => `${e.name}: ${e.error?.message}`).join(", "),
        },
        { status: 500 },
      );
    }

    const relatedData = {
      notes: notesRes.data || [],
      timetable: timetableRes.data || [],
      exam_schedule: examRes.data || [],
      forum_posts: forumRes.data || [],
      cgpa_records: cgpaRes.data || [],
      subject_branches: subjectBranchesRes.data || [],
    };

    console.log("Related data found:", {
      notes: relatedData.notes.length,
      timetable: relatedData.timetable.length,
      exam_schedule: relatedData.exam_schedule.length,
      forum_posts: relatedData.forum_posts.length,
      cgpa_records: relatedData.cgpa_records.length,
      subject_branches: relatedData.subject_branches.length,
    });

    // Handle non-cascading relationships by setting subject_id to NULL
    // instead of blocking deletion (forum_posts and cgpa_records should remain but be unlinked)
    console.log("Handling non-cascading relationships...");

    const relatedNotes = relatedData.notes;

    // Check if subject exists
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("id", subjectId)
      .single();

    if (subjectError && subjectError.code === "PGRST116") {
      console.log("Subject not found:", subjectId);
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    if (subjectError) {
      console.error("Error fetching subject:", subjectError);
      return NextResponse.json({ error: "Error fetching subject", details: subjectError.message }, { status: 500 });
    }

    console.log("Subject found:", subject.name, "ID:", subjectId);

    // Handle related data before deletion
    const cleanupPromises = [];

    // 1. Delete subject_branches associations if they exist
    if (relatedData.subject_branches.length > 0) {
      console.log("Deleting subject_branches associations...");
      cleanupPromises.push(supabase.from("subject_branches").delete().eq("subject_id", subjectId));
    }

    // 2. Unlink forum_posts by setting subject_id to NULL
    if (relatedData.forum_posts.length > 0) {
      console.log("Unlinking forum_posts from subject...");
      cleanupPromises.push(supabase.from("forum_posts").update({ subject_id: null }).eq("subject_id", subjectId));
    }

    // 3. Unlink cgpa_records by setting subject_id to NULL
    if (relatedData.cgpa_records.length > 0) {
      console.log("Unlinking cgpa_records from subject...");
      cleanupPromises.push(supabase.from("cgpa_records").update({ subject_id: null }).eq("subject_id", subjectId));
    }

    // Execute all cleanup operations
    if (cleanupPromises.length > 0) {
      const cleanupResults = await Promise.all(cleanupPromises);

      // Check for errors in cleanup operations
      const cleanupErrors = cleanupResults.filter((result) => result.error);
      if (cleanupErrors.length > 0) {
        console.error("Cleanup errors:", cleanupErrors);
        return NextResponse.json(
          {
            error: "Failed to cleanup related data before deletion",
            details: cleanupErrors.map((err) => err.error?.message).join(", "),
          },
          { status: 500 },
        );
      }
      console.log("All related data cleanup completed successfully");
    }

    // Perform the deletion using admin privileges (bypasses RLS)
    console.log("Attempting to delete subject:", subjectId);
    const { data: deleteData, error: deleteError } = await supabase.from("subjects").delete().eq("id", subjectId);

    console.log("Delete operation result:", { deleteData, deleteError });

    if (deleteError) {
      console.error("Error deleting subject:", {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
      });

      // Provide more specific error messages
      let errorMessage = "Failed to delete subject";

      if (deleteError.code === "23503") {
        errorMessage = "Cannot delete subject as it has related data that must be removed first";
      } else if (deleteError.code === "42501") {
        errorMessage = "Insufficient permissions to delete subject";
      } else if (deleteError.message) {
        errorMessage = deleteError.message;
      }

      return NextResponse.json(
        {
          error: errorMessage,
          code: deleteError.code,
          details: deleteError.details,
        },
        { status: 500 },
      );
    }

    console.log("Subject deleted successfully:", subjectId);

    // Log the successful deletion
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      activity_type: "subject_delete",
      resource_type: "subject",
      resource_id: subjectId,
      metadata: {
        subject_name: subject.name,
        deleted_notes_count: relatedData.notes.length,
        deleted_timetable_count: relatedData.timetable.length,
        deleted_exam_schedule_count: relatedData.exam_schedule.length,
        deleted_subject_branches_count: relatedData.subject_branches.length,
        unlinked_forum_posts_count: relatedData.forum_posts.length,
        unlinked_cgpa_records_count: relatedData.cgpa_records.length,
      },
    });

    return NextResponse.json(
      {
        message: "Subject deleted successfully",
        deleted_notes_count: relatedData.notes.length,
        deleted_timetable_count: relatedData.timetable.length,
        deleted_exam_schedule_count: relatedData.exam_schedule.length,
        deleted_subject_branches_count: relatedData.subject_branches.length,
        unlinked_forum_posts_count: relatedData.forum_posts.length,
        unlinked_cgpa_records_count: relatedData.cgpa_records.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected error in subject deletion:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
