"use client";

import type { PostTag } from "@global-trade/core";
import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

interface PostTagSelectProps {
  tags: PostTag[];
  selectedIds: string[];
}

export function PostTagSelect({ tags, selectedIds }: PostTagSelectProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(selectedIds));
  const [created, setCreated] = useState<string[]>([]);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () => tags.filter((tag) => !normalizedQuery || tag.title.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery, tags]
  );
  const canCreate = Boolean(
    normalizedQuery &&
      !tags.some((tag) => tag.title.toLowerCase() === normalizedQuery) &&
      !created.some((tag) => tag.toLowerCase() === normalizedQuery)
  );

  function toggleTag(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function createTag() {
    const value = query.trim();
    if (!value || !canCreate) return;
    setCreated((current) => [...current, value]);
    setQuery("");
  }

  return (
    <div className="post-tag-select">
      {Array.from(selected).map((id) => (
        <input key={id} name="tagIds" type="hidden" value={id} />
      ))}
      <input name="newTagNames" type="hidden" value={JSON.stringify(created)} />

      <div className="post-tag-select__search">
        <Search aria-hidden="true" size={15} />
        <input
          aria-label="Search post tags"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canCreate) {
              event.preventDefault();
              createTag();
            }
          }}
          placeholder="Search or create a tag"
          value={query}
        />
      </div>

      {(selected.size > 0 || created.length > 0) && (
        <div className="post-tag-select__selected" aria-label="Selected tags">
          {tags
            .filter((tag) => selected.has(tag.id))
            .map((tag) => (
              <button key={tag.id} onClick={() => toggleTag(tag.id)} type="button">
                {tag.title}
                <X aria-hidden="true" size={12} />
              </button>
            ))}
          {created.map((tag) => (
            <button key={tag} onClick={() => setCreated((current) => current.filter((item) => item !== tag))} type="button">
              {tag}
              <X aria-hidden="true" size={12} />
            </button>
          ))}
        </div>
      )}

      <div className="post-tag-select__options">
        {filtered.map((tag) => (
          <label key={tag.id}>
            <input checked={selected.has(tag.id)} onChange={() => toggleTag(tag.id)} type="checkbox" />
            <span>{tag.title}</span>
          </label>
        ))}
        {canCreate && (
          <button className="post-tag-select__create" onClick={createTag} type="button">
            <Plus aria-hidden="true" size={14} />
            Create “{query.trim()}”
          </button>
        )}
        {filtered.length === 0 && !canCreate && <p>No matching tags.</p>}
      </div>
    </div>
  );
}
