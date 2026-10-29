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
  createLocation,
  deleteLocation,
  updateLocation,
  ApiException,
} from "@/lib/api";
import type { Location } from "@/lib/types";

export type LocationsManagerState =
  { mode: "closed" } | { mode: "create" } | { mode: "edit"; entity: Location };

export interface LocationsManagerLabels {
  locationCreateHeading: string;
  locationCreate: string;
  locationCreating: string;
  locationCancel: string;
  locationSave: string;
  locationName: string;
  locationDelete: string;
  locationEdit: string;
  locationErrorInUse: string;
  drawerClose: string;
  errorGeneric: string;
  errorNotFound: string;
}

interface LocationsManagerProps {
  state: LocationsManagerState;
  onStateChange: (next: LocationsManagerState) => void;
  labels: LocationsManagerLabels;
}

interface CreateForm {
  name: string;
}

/**
 * Drawer-only CRUD for locations. The page-level panel renders the chips;
 * this component owns the create + edit drawers and the mutation calls.
 * Locations have no `isArchived` — they are deleted outright, with a
 * `LOCATION_IN_USE` error surfaced if employees still reference the
 * location.
 */
export function LocationsManager({
  state,
  onStateChange,
  labels,
}: LocationsManagerProps): React.ReactElement {
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

  function startEdit(location: Location): void {
    setEditName(location.name);
    setEditError(null);
    onStateChange({ mode: "edit", entity: location });
  }

  function onCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCreateError(null);
    if (!createForm.name) return;
    startTransition(async () => {
      try {
        await createLocation({ name: createForm.name.trim() });
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

  function saveEdit(location: Location): void {
    setEditError(null);
    startTransition(async () => {
      try {
        await updateLocation(location.id, { name: editName.trim() });
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === "LOCATION_NOT_FOUND")
            setEditError(labels.errorNotFound);
          else setEditError(err.message);
        } else {
          setEditError(labels.errorGeneric);
        }
      }
    });
  }

  function onDelete(location: Location): void {
    setEditError(null);
    startTransition(async () => {
      try {
        await deleteLocation(location.id);
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === "LOCATION_IN_USE")
            setEditError(labels.locationErrorInUse);
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

  const editingLocation = state.mode === "edit" ? state.entity : null;
  const isCreateOpen = state.mode === "create";
  const isEditOpen = editingLocation !== null;

  return (
    <>
      {/* Create Location Modal */}
      <Modal open={isCreateOpen} onClose={closeDrawer} size="sm">
        <ModalHeader
          title={labels.locationCreateHeading}
          onClose={closeDrawer}
          closeLabel={labels.drawerClose}
        />
        <form onSubmit={onCreate} noValidate>
          <ModalBody className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="newLocationName">{labels.locationName}</Label>
              <Input
                id="newLocationName"
                required
                maxLength={120}
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
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
              {labels.locationCancel}
            </Button>
            <Button
              type="submit"
              disabled={isPending || !createForm.name.trim()}
            >
              {isPending ? labels.locationCreating : labels.locationCreate}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Location Modal */}
      <Modal open={isEditOpen} onClose={closeDrawer} size="sm">
        <ModalHeader
          title={editingLocation?.name ?? labels.locationEdit}
          onClose={closeDrawer}
          closeLabel={labels.drawerClose}
        />
        {editingLocation ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editName.trim()) saveEdit(editingLocation);
            }}
          >
            <ModalBody className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="editLocationName">{labels.locationName}</Label>
                <Input
                  id="editLocationName"
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
                  onClick={() => editingLocation && onDelete(editingLocation)}
                  className="text-xs text-[var(--color-ink-3)] hover:text-[var(--color-bad)]"
                >
                  {labels.locationDelete}
                </Button>
              </div>
              <Button
                type="button"
                variant="neutral"
                onClick={closeDrawer}
                disabled={isPending}
              >
                {labels.locationCancel}
              </Button>
              <Button type="submit" disabled={isPending || !editName.trim()}>
                {labels.locationSave}
              </Button>
            </ModalFooter>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
