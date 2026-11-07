"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ctaPillClass, outlinePillClass } from "@/components/pills";
import { forgetCreatedStory, listCreatedStories } from "@/lib/admin-created";
import { describeAdminError } from "@/lib/admin-errors";
import { formatRelativeTime } from "@/lib/format";
import {
  deleteArticle,
  fetchAdminArticles,
  setPublished,
  type ArticleRow,
} from "@/lib/remote-articles";
import { publishPagesLabel, resolvePublishPages } from "@/lib/publish-pages";
import { loadSupabase } from "@/lib/supabase";

type StatusFilter = "all" | "draft" | "published";

const LAYOUT_ROWS: ArticleRow[] = [
  {
    id: "preview-draft",
    slug: "night-run-on-the-causeway",
    title: "Night run on the causeway",
    excerpt: "",
    content: "",
    category: "Leaks & News",
    section: "wire",
    author_name: "Desk",
    author_role: "Desk",
    author_handle: "",
    tags: [],
    cover_accent: "cyan",
    cover_scene: "coast",
    cover_image_url: null,
    publish_pages: ["feed"],
    featured: false,
    hero_rank: null,
    breaking: false,
    related_slugs: [],
    published: false,
    published_at: "2026-09-22T16:00:00.000Z",
    updated_at: "2026-09-23T10:12:00.000Z",
  },
  {
    id: "preview-live",
    slug: "vice-tonight-hits-the-keys",
    title: "Vice Tonight Hits the Keys",
    excerpt: "",
    content: "",
    category: "Leaks & News",
    section: "wire",
    author_name: "Desk",
    author_role: "Desk",
    author_handle: "",
    tags: [],
    cover_accent: "magenta",
    cover_scene: "coast",
    cover_image_url: null,
    publish_pages: ["feed"],
    featured: false,
    hero_rank: null,
    breaking: false,
    related_slugs: [],
    published: true,
    published_at: "2026-09-21T18:00:00.000Z",
    updated_at: "2026-09-21T18:00:00.000Z",
  },
];

function matchesQuery(row: ArticleRow, query: string) {
  if (!query) return true;
  const pages = resolvePublishPages({
    publishPages: row.publish_pages,
    tags: row.tags,
    category: row.category,
    section: row.section,
  });
  const hay = `${row.title} ${row.slug} ${row.category} ${row.section} ${publishPagesLabel(pages)} ${row.excerpt}`.toLowerCase();
  return hay.includes(query);
}

function StatusChip({ published }: { published: boolean }) {
  return (
    <span
      data-admin-story-status={published ? "published" : "draft"}
      className={`inline-flex min-h-8 items-center rounded-full px-3 text-[11px] font-semibold tracking-[0.16em] uppercase ${
        published ? "bg-teal text-ink" : "bg-raised text-white"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

type AdminDeskProps = {
  preview?: boolean;
};

export function AdminDesk({ preview = false }: AdminDeskProps) {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [layoutOnly, setLayoutOnly] = useState(false);
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAdminArticles()
      .then((data) => {
        if (cancelled) return;
        if (data.length) {
          setRows(data);
          setLayoutOnly(false);
        } else if (preview) {
          setRows(LAYOUT_ROWS);
          setLayoutOnly(true);
        } else {
          setRows([]);
          setLayoutOnly(false);
        }
        setCreatedIds(listCreatedStories().map((item) => item.id));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (preview) {
          setRows(LAYOUT_ROWS);
          setLayoutOnly(true);
          setCreatedIds(listCreatedStories().map((item) => item.id));
          setLoading(false);
          return;
        }
        setError(describeAdminError(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const undoRowId = useMemo(() => {
    const match = rows.find((row) => createdIds.includes(row.id));
    if (match) return match.id;
    return layoutOnly ? rows[0]?.id : undefined;
  }, [rows, createdIds, layoutOnly]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status === "draft" && row.published) return false;
      if (status === "published" && !row.published) return false;
      return matchesQuery(row, needle);
    });
  }, [rows, query, status]);

  const layoutLocked = layoutOnly;

  async function onUnpublish(row: ArticleRow) {
    if (layoutLocked) return;
    setPendingId(row.id);
    setError(null);
    try {
      await setPublished(row.id, false);
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, published: false } : item,
        ),
      );
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setPendingId(null);
    }
  }

  async function onUndoAdd(row: ArticleRow) {
    setPendingId(row.id);
    setError(null);
    try {
      if (!layoutLocked) {
        await deleteArticle(row.id);
      }
      forgetCreatedStory(row.id);
      forgetCreatedStory("preview-new");
      setCreatedIds(listCreatedStories().map((item) => item.id));
      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setPendingId(null);
    }
  }

  async function onConfirmDelete(row: ArticleRow) {
    if (layoutLocked) return;
    setPendingId(row.id);
    setError(null);
    try {
      await deleteArticle(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
      setConfirmId(null);
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setPendingId(null);
    }
  }

  async function onSignOut() {
    await (await loadSupabase())?.auth.signOut();
  }

  return (
    <div data-admin-desk className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/write/" className={ctaPillClass("white")}>
          New story
        </Link>
        <button type="button" className={outlinePillClass("px-5")} onClick={() => void onSignOut()}>
          Sign out
        </button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold tracking-[0.16em] text-white uppercase">
            Search
          </span>
          <input
            data-admin-story-search
            className="w-full rounded-xl bg-raised px-4 py-3 text-white placeholder:text-white/40"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, slug, or desk"
            type="search"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
          {(
            [
              ["all", "All"],
              ["draft", "Drafts"],
              ["published", "Published"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-admin-status-filter={id}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-xs font-bold ${
                status === id ? "bg-teal text-ink" : "bg-raised text-white hover:bg-teal hover:text-ink"
              }`}
              onClick={() => setStatus(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-white" data-admin-desk-loading>
          Loading desk…
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-magenta" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div data-admin-story-empty className="rounded-2xl bg-surface px-5 py-8">
          <p className="font-display text-2xl font-extrabold tracking-tight text-white">
            No stories yet
          </p>
          <p className="mt-2 text-sm text-white">Start one from the desk.</p>
          <Link href="/admin/write/" className={`${ctaPillClass("white")} mt-5`}>
            New story
          </Link>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <section data-admin-story-list data-admin-layout-only={layoutOnly ? "true" : "false"}>
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">
              Stories
            </h2>
            <p className="text-sm text-white">
              {visible.length} {visible.length === 1 ? "story" : "stories"}
            </p>
          </div>
          {visible.length === 0 ? (
            <p className="text-sm font-semibold text-white">No stories match.</p>
          ) : (
            <ul className="space-y-3">
              {visible.map((row) => (
                <li key={row.id} className="rounded-2xl bg-surface p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip published={row.published} />
                        <p className="text-xs font-medium text-white/70">
                          <time dateTime={row.updated_at}>
                            {formatRelativeTime(row.updated_at)}
                          </time>
                        </p>
                      </div>
                      <p className="font-display text-lg font-extrabold tracking-tight text-white">
                        {row.title || "Untitled"}
                      </p>
                      <p className="text-xs font-medium text-white">
                        {publishPagesLabel(
                          resolvePublishPages({
                            publishPages: row.publish_pages,
                            tags: row.tags,
                            category: row.category,
                            section: row.section,
                          }),
                        )}{" "}
                        · /posts/{row.slug}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.id === undoRowId ? (
                        <button
                          type="button"
                          data-admin-undo-add
                          className={ctaPillClass("white")}
                          disabled={pendingId === row.id}
                          onClick={() => void onUndoAdd(row)}
                        >
                          {pendingId === row.id ? "Undoing…" : "Undo"}
                        </button>
                      ) : null}
                      <Link
                        href={`/admin/write/?slug=${encodeURIComponent(row.slug)}`}
                        className={outlinePillClass("px-4")}
                      >
                        Edit
                      </Link>
                      {row.published && !layoutLocked ? (
                        <>
                          <Link
                            href={`/posts/${row.slug}/`}
                            className={outlinePillClass("px-4")}
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            className={outlinePillClass("px-4")}
                            disabled={pendingId === row.id}
                            onClick={() => void onUnpublish(row)}
                          >
                            {pendingId === row.id ? "Working…" : "Unpublish"}
                          </button>
                        </>
                      ) : null}
                      {!layoutLocked ? (
                        <button
                          type="button"
                          className={outlinePillClass("px-4")}
                          onClick={() => setConfirmId(row.id)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {confirmId === row.id ? (
                    <div className="mt-4 rounded-xl bg-raised px-4 py-3">
                      <p className="text-sm font-semibold text-white">
                        Delete “{row.title || row.slug}”? This cannot be undone.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={ctaPillClass("white")}
                          disabled={pendingId === row.id}
                          onClick={() => void onConfirmDelete(row)}
                        >
                          {pendingId === row.id ? "Deleting…" : "Delete"}
                        </button>
                        <button
                          type="button"
                          className={outlinePillClass("px-4")}
                          onClick={() => setConfirmId(null)}
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
