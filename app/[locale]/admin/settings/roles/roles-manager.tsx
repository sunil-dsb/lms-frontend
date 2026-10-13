'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import {
  createRole,
  deleteRole,
  updateRole,
  ApiException,
} from '@/lib/api';
import type { Role } from '@/lib/types';

export type RolesManagerState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; entity: Role };

export interface RolesManagerLabels {
  roleCreateHeading: string;
  roleCreate: string;
  roleCreating: string;
  roleCancel: string;
  roleSave: string;
  roleName: string;
  roleStations: string;
  roleStationsHint: string;
  roleStationsEmpty: string;
  roleDelete: string;
  roleEdit: string;
  roleErrorInUse: string;
  drawerClose: string;
  errorGeneric: string;
  errorNotFound: string;
}

interface RolesManagerProps {
  state: RolesManagerState;
  onStateChange: (next: RolesManagerState) => void;
  stations: Array<{ id: string; name: string }>;
  labels: RolesManagerLabels;
}

interface CreateForm {
  name: string;
  stationIds: string[];
}

/**
 * Drawer-only CRUD for roles, backed 1:1 by the backend jobs API
 * (`GET|POST /api/v1/jobs`, `PATCH|DELETE /api/v1/jobs/:id`).
 *
 * Payload is `{ name, stationIds }` — the backend links a role to stations
 * via `stationIds: uuid[]` (empty = works any station). There is no
 * clearance tier server-side, so none is sent. Deleting a role still
 * referenced by employees surfaces `ROLE_IN_USE`.
 */
export function RolesManager({
  state,
  onStateChange,
  stations,
  labels,
}: RolesManagerProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStationIds, setEditStationIds] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState<CreateForm>({ name: '', stationIds: [] });

  function refresh(): void {
    router.refresh();
  }

  function closeDrawer(): void {
    setCreateError(null);
    setEditError(null);
    setEditName('');
    setEditStationIds([]);
    onStateChange({ mode: 'closed' });
  }

  function toggleCreateStation(stationId: string): void {
    setCreateForm((prev) => ({
      ...prev,
      stationIds: prev.stationIds.includes(stationId)
        ? prev.stationIds.filter((id) => id !== stationId)
        : [...prev.stationIds, stationId],
    }));
  }

  function toggleEditStation(stationId: string): void {
    setEditStationIds((prev) =>
      prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId],
    );
  }

  function onCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCreateError(null);
    if (!createForm.name.trim()) return;
    startTransition(async () => {
      try {
        await createRole({
          name: createForm.name.trim(),
          stationIds: createForm.stationIds,
        });
        setCreateForm({ name: '', stationIds: [] });
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

  function saveEdit(role: Role): void {
    if (!editName.trim()) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateRole(role.id, {
          name: editName.trim(),
          stationIds: editStationIds,
        });
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'ROLE_NOT_FOUND') setEditError(labels.errorNotFound);
          else setEditError(err.message);
        } else {
          setEditError(labels.errorGeneric);
        }
      }
    });
  }

  function onDelete(role: Role): void {
    setEditError(null);
    startTransition(async () => {
      try {
        await deleteRole(role.id);
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'ROLE_IN_USE') setEditError(labels.roleErrorInUse);
          else setEditError(err.message);
        } else {
          setEditError(labels.errorGeneric);
        }
      }
    });
  }

  React.useEffect(() => {
    if (state.mode === 'edit') {
      setEditName(state.entity.name);
      setEditStationIds(state.entity.stationIds ?? []);
      setEditError(null);
    }
  }, [state]);

  const editingRole = state.mode === 'edit' ? state.entity : null;
  const isCreateOpen = state.mode === 'create';
  const isEditOpen = editingRole !== null;

  function stationPicker(
    selected: string[],
    onToggle: (stationId: string) => void,
    idPrefix: string,
  ): React.ReactElement {
    if (stations.length === 0) {
      return <p className="text-sm text-[var(--color-ink-3)]">{labels.roleStationsEmpty}</p>;
    }
    return (
      <div className="grid gap-1 rounded-[var(--radius-md)] border border-[var(--color-line-2)] p-2 max-h-48 overflow-y-auto">
        {stations.map((s) => {
          const checked = selected.includes(s.id);
          return (
            <label
              key={s.id}
              htmlFor={`${idPrefix}-${s.id}`}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-panel)]"
            >
              <input
                id={`${idPrefix}-${s.id}`}
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(s.id)}
                disabled={isPending}
                className="rounded border-[var(--color-line-2)] text-[var(--color-brand)] focus:ring-[var(--color-ring)]"
              />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* Create Role Modal */}
      <Modal open={isCreateOpen} onClose={closeDrawer} size="sm">
        <ModalHeader
          title={labels.roleCreateHeading}
          onClose={closeDrawer}
          closeLabel={labels.drawerClose}
        />
        <form onSubmit={onCreate} noValidate>
          <ModalBody className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="newRoleName">{labels.roleName}</Label>
              <Input
                id="newRoleName"
                required
                maxLength={120}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>{labels.roleStations}</Label>
              <p className="text-xs text-[var(--color-ink-3)]">{labels.roleStationsHint}</p>
              {stationPicker(createForm.stationIds, toggleCreateStation, 'newRoleStation')}
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
              {labels.roleCancel}
            </Button>
            <Button
              type="submit"
              disabled={isPending || !createForm.name.trim()}
            >
              {isPending ? labels.roleCreating : labels.roleCreate}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal open={isEditOpen} onClose={closeDrawer} size="sm">
        <ModalHeader
          title={editingRole?.name ?? labels.roleEdit}
          onClose={closeDrawer}
          closeLabel={labels.drawerClose}
        />
        {editingRole ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editName.trim()) saveEdit(editingRole);
            }}
          >
            <ModalBody className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="editRoleName">{labels.roleName}</Label>
                <Input
                  id="editRoleName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={120}
                  disabled={isPending}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>{labels.roleStations}</Label>
                <p className="text-xs text-[var(--color-ink-3)]">{labels.roleStationsHint}</p>
                {stationPicker(editStationIds, toggleEditStation, 'editRoleStation')}
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
                  onClick={() => onDelete(editingRole)}
                  className="text-xs text-[var(--color-ink-3)] hover:text-[var(--color-bad)]"
                >
                  {labels.roleDelete}
                </Button>
              </div>
              <Button
                type="button"
                variant="neutral"
                onClick={closeDrawer}
                disabled={isPending}
              >
                {labels.roleCancel}
              </Button>
              <Button
                type="submit"
                disabled={isPending || !editName.trim()}
              >
                {labels.roleSave}
              </Button>
            </ModalFooter>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
