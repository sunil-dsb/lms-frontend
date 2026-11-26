"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { LuSearch, LuCheck, LuUsers, LuX, LuLoader } from "react-icons/lu";

interface StaffItem {
  id: string;
  name: string;
  email?: string | null;
}

interface SearchableStaffPickerProps {
  id: string;
  label: string;
  hint: string;
  selectedIds: string[];
  items: StaffItem[];
  isLoading?: boolean;
  loadingText?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function SearchableStaffPicker({
  label,
  hint,
  selectedIds,
  items,
  isLoading = false,
  loadingText = "Loading...",
  emptyText = "No members available",
  searchPlaceholder = "Search by name or email...",
  onChange,
  disabled = false,
}: SearchableStaffPickerProps): React.ReactElement {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.email && item.email.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const toggleItem = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const filteredIds = filteredItems.map((item) => item.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onChange(selectedIds.filter((id) => !filteredIds.includes(id)));
    } else {
      onChange(Array.from(new Set([...selectedIds, ...filteredIds])));
    }
  };

  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item.id));

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-line-2)] bg-[var(--color-field)]/30 p-4">
      {/* Header with Title and Selected Count Badge */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <label className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-2">
            <span>{label}</span>
            {selectedIds.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-brand-600)] text-white">
                {selectedIds.length} selected
              </span>
            )}
          </label>
          <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">{hint}</p>
        </div>

        {filteredItems.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs font-medium text-[var(--color-brand-700)] hover:underline cursor-pointer select-none"
          >
            {allFilteredSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {/* Embedded Search Box */}
      <div className="relative flex items-center">
        <LuSearch
          className="pointer-events-none absolute left-3 text-[var(--color-ink-3)] size-4"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          disabled={disabled || (items.length === 0 && !isLoading)}
          className="w-full h-10 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] pl-10 pr-8 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand-600)] focus:ring-1 focus:ring-[var(--color-brand-600)] focus:outline-none transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 p-1 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
          >
            <LuX className="size-4" />
          </button>
        )}
      </div>

      {/* Scrollable list with checkboxes - fixed height container */}
      <div
        tabIndex={0}
        aria-label={label}
        className="h-60 max-h-60 overflow-y-auto overscroll-contain rounded-md border border-[var(--color-line)] bg-[var(--color-wash)] p-2 space-y-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-600)]"
        style={{
          maxHeight: "240px",
          height: "240px",
          overflowY: "auto",
        }}
      >
        {isLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-[var(--color-ink-3)]">
            <LuLoader className="size-4 animate-spin" />
            <span>{loadingText}</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--color-ink-3)]">
            {search.trim() ? "No matches found" : emptyText}
          </p>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`group flex items-center justify-between p-3 rounded-md border transition-all cursor-pointer select-none ${
                  isSelected
                    ? "border-[var(--color-brand-600)] bg-[var(--color-surface)] shadow-xs"
                    : "border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-line)]"
                } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`size-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      isSelected
                        ? "bg-[var(--color-brand-600)] border-[var(--color-brand-600)] text-white"
                        : "border-[var(--color-line-2)] bg-[var(--color-surface)] group-hover:border-[var(--color-brand-500)]"
                    }`}
                  >
                    {isSelected && <LuCheck className="size-3 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-ink)] truncate">
                      {item.name}
                    </p>
                    {item.email && (
                      <p className="text-xs text-[var(--color-ink-3)] truncate">
                        {item.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
