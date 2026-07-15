import sys

with open("m:/Projects/sites/AI_Blogersite/app/api/cron/route.ts", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update persistAndPublishPost definition
code = code.replace(
"""async function persistAndPublishPost(args: {
  postsTable: PostsInsertQuery;
  candidateInsert: PostInsert;
  post: MiroPost;
  request: Request;
  traceId: string;
  topic: MiroTopic;
  attemptedTopics: AttemptedTopic[];
}): Promise<{""",
"""async function persistAndPublishPost(args: {
  supabase: any;
  postsTable: PostsInsertQuery;
  candidateInsert: PostInsert;
  post: MiroPost;
  request: Request;
  traceId: string;
  topic: MiroTopic;
  attemptedTopics: AttemptedTopic[];
  scheduledSlot?: MiroScheduleSlot;
}): Promise<{""")

# 2. Update insertCandidate
code = code.replace(
"""  const insertCandidate = async (candidate: PostInsert) =>
    args.postsTable
      .insert(candidate)
      .select("id, created_at")
      .single();""",
"""  const insertCandidate = async (candidate: PostInsert) => {
    if (!args.supabase) {
      return args.postsTable
        .insert(candidate)
        .select("id, created_at")
        .single();
    }

    const rpcArgs = {
      p_title: candidate.title,
      p_source: candidate.source ?? null,
      p_source_url: candidate.source_url ?? null,
      p_source_published_at: candidate.source_published_at ?? null,
      p_event_date: candidate.event_date ?? null,
      p_corroborating_sources: candidate.corroborating_sources ?? null,
      p_observed: candidate.observed,
      p_inferred: candidate.inferred,
      p_opinion: candidate.opinion,
      p_cross_signal: candidate.cross_signal,
      p_hypothesis: candidate.hypothesis,
      p_reasoning: candidate.reasoning,
      p_confidence: candidate.confidence,
      p_category: candidate.category,
      p_slot_date: args.scheduledSlot ? getMinskDayKey(new Date()) : null,
      p_slot_key: args.scheduledSlot ? getMiroScheduleSlotKey(args.scheduledSlot) : null,
      p_scheduled_topic: args.scheduledSlot ? args.scheduledSlot.topic : null,
      p_trace_id: args.traceId,
    };

    const response = await args.supabase.rpc("publish_post_atomically", rpcArgs);

    if (response.error || (response.data && response.data.error)) {
      return {
        data: null,
        error: response.error ?? new Error(response.data.error),
      };
    }

    return { data: response.data as Pick<PostRow, "id" | "created_at">, error: null };
  };""")

# 3. Update telegram publish status update
code = code.replace(
"""    telegram = {
      status: "failed",
      reason:
        error instanceof Error
          ? error.message
          : "Unexpected Telegram publish error.",
    };
  }

  console.log("[MiroCron] Generated post", {""",
"""    telegram = {
      status: "failed",
      reason:
        error instanceof Error
          ? error.message
          : "Unexpected Telegram publish error.",
    };
  }

  if (args.supabase) {
    try {
      await args.supabase
        .from("posts")
        .update({
          telegram_publish_status: telegram.status === "sent" ? "sent" : (telegram.status === "failed" ? "failed" : "skipped"),
          ...(telegram.status === "sent" && telegram.messageId ? { telegram_message_id: telegram.messageId } : {})
        })
        .eq("id", savedPost.id);
    } catch (e) {
      console.error("[MiroCron] Failed to update telegram_publish_status", e);
    }
  }

  console.log("[MiroCron] Generated post", {""")

# 4. Pass args in completeSuccessfulRun
code = code.replace(
"""  const { savedPost, telegram } = await persistAndPublishPost({
    postsTable: args.postsTable,
    candidateInsert: args.candidateInsert,
    post: args.post,
    request: args.request,
    traceId: args.traceId,
    topic: args.topic,
    attemptedTopics: args.attemptedTopics,
  });""",
"""  const { savedPost, telegram } = await persistAndPublishPost({
    supabase: args.supabase,
    postsTable: args.postsTable,
    candidateInsert: args.candidateInsert,
    post: args.post,
    request: args.request,
    traceId: args.traceId,
    topic: args.topic,
    attemptedTopics: args.attemptedTopics,
    scheduledSlot: args.scheduledSlot,
  });""")

# 5. Add Sweeper in GET route and getAdminSupabaseClient(request.signal)
code = code.replace(
"""    const simulatedDate = getSimulatedDate(request);
    effectiveNow = simulatedDate ?? new Date();
    supabase = getAdminSupabaseClient();""",
"""    const simulatedDate = getSimulatedDate(request);
    effectiveNow = simulatedDate ?? new Date();
    supabase = getAdminSupabaseClient(request.signal);

    // [Sweeper Pattern] Resolve orphaned Telegram posts before starting a new run
    try {
      const { data: orphanedPosts } = await supabase
        .from("posts")
        .select("*")
        .in("telegram_publish_status", ["pending", "failed"])
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (orphanedPosts && orphanedPosts.length > 0) {
        for (const orphan of orphanedPosts) {
          const publicUrlBlockReason = await getPublicPostUrlBlockReason(buildPublicPostUrl(request.url, orphan.id));
          if (!publicUrlBlockReason) {
            const telegramResult = await publishPostToTelegram({
              post: orphan,
              postId: orphan.id,
              requestUrl: request.url,
            });
            await supabase
              .from("posts")
              .update({
                telegram_publish_status: telegramResult.status === "sent" ? "sent" : (telegramResult.status === "failed" ? "failed" : "skipped"),
                ...(telegramResult.status === "sent" && telegramResult.messageId ? { telegram_message_id: telegramResult.messageId } : {})
              })
              .eq("id", orphan.id);
          }
        }
      }
    } catch (e) {
      console.error("[MiroCron] Telegram Sweeper failed", e);
    }""")

with open("m:/Projects/sites/AI_Blogersite/app/api/cron/route.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("route.ts patched successfully")
