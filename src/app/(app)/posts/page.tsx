"use client";

import Link from "next/link";
import type { AccountWithStyles, Post } from "@/lib/types";
import { useFetchJson } from "@/lib/useFetchJson";
import { card } from "@/components/ui";
import PostCard from "@/components/PostCard";
import UploadVideo from "@/components/UploadVideo";

export default function PostsPage() {
  const { data: posts, setData: setPosts, reload } = useFetchJson<Post[]>("/api/posts", 5000);
  const { data: accounts } = useFetchJson<AccountWithStyles[]>("/api/accounts");
  const hasAccount = (accounts ?? []).some((a) => a.openId);

  function replacePost(updated: Post) {
    setPosts((prev) => (prev ? prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)) : prev));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Post to TikTok</h1>
        <p className="mt-1 max-w-2xl text-sm text-black/60 dark:text-white/60">
          Upload a video, then post it to one of your connected TikTok accounts right now, or schedule it for later. You choose who can
          watch it and which interactions are allowed, and nothing is posted until you confirm.
        </p>
      </div>

      {accounts && !hasAccount && (
        <p className={`${card} p-5 text-sm`}>
          You haven&apos;t connected a TikTok account yet.{" "}
          <Link href="/accounts" className="underline">
            Connect one on the Accounts page
          </Link>{" "}
          to post.
        </p>
      )}

      <UploadVideo onUploaded={(post) => setPosts((prev) => [post, ...(prev ?? [])])} />

      <section className="space-y-4">
        <h2 className="font-medium">2. Post it or schedule it</h2>
        {posts === null ? (
          <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
        ) : posts.length === 0 ? (
          <p className={`${card} p-5 text-sm text-black/50 dark:text-white/50`}>No videos yet — upload one above.</p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              accounts={accounts ?? []}
              onChanged={replacePost}
              onRefresh={reload}
              onDeleted={() => setPosts((prev) => (prev ? prev.filter((p) => p.id !== post.id) : prev))}
            />
          ))
        )}
      </section>
    </div>
  );
}
