"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  createStation,
  deleteStation,
  updateStation,
  ApiException,
} from "@/lib/api";
import type { Station } from "@/lib/types";

export type StationsManagerState =
  { mode: "closed" } | { mode: "create" } | { mode: "edit"; entity: Station };

export interface StationsManagerLabels {
  stationName: string;
  stationCreateHeading: string;
  stationCreate: string;
  stationCreating: string;
  stationCancel: string;
  stationSave: string;
  stationDelete: string;
  stationEdit: string;
  drawerClose: string;
  errorGeneric: string;
  errorNotFound: string;
  rowActionsLabel: string;
}

interface StationsManagerProps {
  state: StationsManagerState;
  onStateChange: (next: StationsManagerState) => void;
  labels: StationsManagerLabels;
}

interface CreateForm {
  name: string;
}

/**
 * Drawer-only CRUD for stations, backed 1:1 by the backend
 * (`GET|POST /api/v1/stations`, `PATCH|DELETE /api/v1/stations/:id`).
 *
 * The backend row is `{ id, name }` — no location scoping and no archive
 * flag, so removal is a hard DELETE surfaced with `STATION_NOT_FOUND`
 * when the row is already gone.
 */
export function StationsManager({
  state,
  onStateChange,
  labels,
}: StationsManagerProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [createForm, setCreateForm] = useState<CreateForm>({ name: "" });

  function refresh(): void {
    router.refresh();
  }

  function closeDrawer(): void {
    setCreateError(null);
    setEditError(null);
    setEditName("");
    onStateChange({ mode: "closed" });
  }

  function onCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCreateError(null);
    if (!createForm.name.trim()) return;
    startTransition(async () => {
      try {
        await createStation({ name: createForm.name.trim() });
        setCreateForm({ name: "" });
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          setCreateError(err.message);
        } else {
          setCreateError(labels.errorGeneric);
        }
      }
    });
  }

  function saveEdit(station: Station): void {
    if (!editName.trim()) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateStation(station.id, { name: editName.trim() });
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === "STATION_NOT_FOUND")
            setEditError(labels.errorNotFound);
          else setEditError(err.message);
        } else {
          setEditError(labels.errorGeneric);
        }
      }
    });
  }

  function onDelete(station: Station): void {
    setEditError(null);
    startTransition(async () => {
      try {
        await deleteStation(station.id);
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === "STATION_NOT_FOUND")
            setEditError(labels.errorNotFound);
          else setEditError(err.message);
        } else {
          setEditError(labels.errorGeneric);
        }
      }
    });
  }

  React.useEffect(() => {
    if (state.mode === "edit") {
      setEditName(state.entity.name);
      setEditError(null);
    }
  }, [state]);

  const editingStation = state.mode === "edit" ? state.entity : null;
  const isCreateOpen = state.mode === "create";
  const isEditOpen = editingStation !== null;

  return (
    <>
      {/* Create Station Modal */}
      <Modal open={isCreateOpen} onClose={closeDrawer} size="sm">
        <ModalHeader
          title={labels.stationCreateHeading}
          onClose={closeDrawer}
          closeLabel={labels.drawerClose}
        />
        <form onSubmit={onCreate} noValidate>
          <ModalBody className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="newStationName">{labels.stationName}</Label>
              <Input
                id="newStationName"
                required
                maxLength={120}
                value={createForm.name}
                onChange={(e) => setCreateForm({ name: e.target.value })}
                disabled={isPending}
                autoFocus
              />
            </div>
            {createError ? (
              <p role="alert" className="text-sm text-[var(--color-bad)]">
                {createError}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={closeDrawer}
              disabled={isPending}
            >
              {labels.stationCancel}
            </Button>
            <Button
              type="submit"
              disabled={isPending || !createForm.name.trim()}
            >
              {isPending ? labels.stationCreating : labels.stationCreate}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Station Modal */}
      <Modal open={isEditOpen} onClose={closeDrawer} size="sm">
        <ModalHeader
          title={editingStation?.name ?? labels.stationEdit}
          onClose={closeDrawer}
          closeLabel={labels.drawerClose}
        />
        {editingStation ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editName.trim()) saveEdit(editingStation);
            }}
          >
            <ModalBody className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="editStationName">{labels.stationName}</Label>
                <Input
                  id="editStationName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={120}
                  disabled={isPending}
                  autoFocus
                />
              </div>
              {editError ? (
                <p role="alert" className="text-sm text-[var(--color-bad)]">
                  {editError}
                </p>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <div className="mr-auto">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => onDelete(editingStation)}
                  className="text-xs text-[var(--color-ink-3)] hover:text-[var(--color-bad)]"
                >
                  {labels.stationDelete}
                </Button>
              </div>
              <Button
                type="button"
                variant="neutral"
                onClick={closeDrawer}
                disabled={isPending}
              >
                {labels.stationCancel}
              </Button>
              <Button type="submit" disabled={isPending || !editName.trim()}>
                {labels.stationSave}
              </Button>
            </ModalFooter>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
