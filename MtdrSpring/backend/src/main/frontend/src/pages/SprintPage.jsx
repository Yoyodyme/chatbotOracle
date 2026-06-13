import React, { useState, useMemo, useCallback, useEffect } from "react";
import useSprints, { deriveSprintStatus } from "../hooks/useSprints";
import {
  createSprint,
  updateSprint,
  deleteSprint,
  getTareasBySprint,
  activateSprint,
} from "../api/sprints";
import SprintDetailPanel from "../components/sprint/SprintDetailModal";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import Skeleton from "../components/shared/Skeleton";
import EmptyState from "../components/shared/EmptyState";
import useAppStore from "../store/index";
import "../styles/animations.css";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const STATUS_ORDER = { ACTIVO: 0, FUTURO: 1, PASADO: 2 };

const STATUS_CONFIG = {
  ACTIVO: {
    label: "Active",
    bg: "#FEE2E2",
    color: "#DC2626",
    border: "#FECACA",
    dot: "#DC2626",
  },
  FUTURO: {
    label: "Future",
    bg: "#EFF6FF",
    color: "#1E40AF",
    border: "#BFDBFE",
    dot: "#2563EB",
  },
  PASADO: {
    label: "Past",
    bg: "#F9FAFB",
    color: "#475569",
    border: "#E5E7EB",
    dot: "#9CA3AF",
  },
};

const STATUS_FILTERS = [
  {
    label: "All statuses",
    value: "",
    bg: "#F9FAFB",
    color: "#6B7280",
    border: "#E5E7EB",
    dot: "#9CA3AF",
  },
  {
    label: "Active",
    value: "ACTIVO",
    bg: "#FEE2E2",
    color: "#DC2626",
    border: "#FECACA",
    dot: "#DC2626",
  },
  {
    label: "Future",
    value: "FUTURO",
    bg: "#EFF6FF",
    color: "#1E40AF",
    border: "#BFDBFE",
    dot: "#2563EB",
  },
  {
    label: "Past",
    value: "PASADO",
    bg: "#F9FAFB",
    color: "#475569",
    border: "#E5E7EB",
    dot: "#9CA3AF",
  },
];

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PASADO;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 20,
        backgroundColor: cfg.bg,
        border: `0.5px solid ${cfg.border}`,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

function ProgressCell({ total, done, status }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const fill =
    status === "ACTIVO"
      ? "#DC2626"
      : status === "FUTURO"
      ? "#2563EB"
      : "#22C55E";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={styles.progressText}>
        {done} / {total || 0}
      </span>

      <div style={styles.progressTrack}>
        <div
          style={{
            ...styles.progressFill,
            width: `${pct}%`,
            backgroundColor: fill,
          }}
        />
      </div>
    </div>
  );
}

function SkeletonRows({ n = 5 }) {
  return [...Array(n)].map((_, i) => (
    <tr key={i}>
      {[24, 160, 80, 160, 70, 70].map((w, j) => (
        <td key={j} style={styles.td}>
          <Skeleton width={`${w}px`} height="12px" />
        </td>
      ))}
    </tr>
  ));
}

function CreateSprintModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.nombre.trim()) {
      setError("Sprint name is required.");
      return;
    }

    if (!form.fechaInicio || !form.fechaFin) {
      setError("Start and end dates are required.");
      return;
    }

    if (form.fechaFin <= form.fechaInicio) {
      setError("End date must be after start date.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await onSubmit({
        nombre: form.nombre.trim(),
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        activo: false,
      });
    } catch {
      setError("Failed to create sprint. Try again.");
      setSaving(false);
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 style={styles.modalTitle}>New sprint</h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) =>
                setForm((p) => ({ ...p, nombre: e.target.value }))
              }
              placeholder="Sprint 5"
              autoFocus
              style={styles.input}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#DC2626";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
              }}
            />
          </div>

          <div style={styles.dateGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start date</label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fechaInicio: e.target.value }))
                }
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>End date</label>
              <input
                type="date"
                value={form.fechaFin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fechaFin: e.target.value }))
                }
                style={styles.input}
              />
            </div>
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.ghostButton}>
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.primaryButton,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Creating…" : "Create sprint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangeStatusModal({ count, onClose, onApply }) {
  const [picked, setPicked] = useState(null);

  const OPTIONS = [
    { status: "ACTIVO", label: "Active" },
    { status: "FUTURO", label: "Future" },
    { status: "PASADO", label: "Past" },
  ];

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        style={styles.modalSmall}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 style={styles.modalTitle}>Change sprint status</h2>
        <p style={styles.modalSubtitle}>
          Applies to {count} sprint{count !== 1 ? "s" : ""}.
        </p>

        <div style={styles.statusOptions}>
          {OPTIONS.map((opt) => {
            const cfg = STATUS_CONFIG[opt.status];
            const selected = picked?.status === opt.status;
            const disabled = opt.status === "ACTIVO" && count !== 1;

            return (
              <button
                key={opt.status}
                onClick={() => !disabled && setPicked(opt)}
                disabled={disabled}
                title={
                  disabled
                    ? "Select exactly one sprint to mark it as active."
                    : undefined
                }
                style={{
                  ...styles.statusOption,
                  backgroundColor: cfg.bg,
                  color: cfg.color,
                  borderColor: selected ? cfg.dot : cfg.border,
                  boxShadow: selected ? `0 0 0 3px ${cfg.bg}` : "none",
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor: cfg.dot,
                  }}
                />
                {opt.label}
              </button>
            );
          })}
        </div>

        <div style={styles.modalActions}>
          <button onClick={onClose} style={styles.ghostButton}>
            Cancel
          </button>

          <button
            disabled={!picked}
            onClick={() => picked && onApply(picked.status)}
            style={{
              ...styles.primaryButton,
              opacity: picked ? 1 : 0.5,
              cursor: picked ? "pointer" : "not-allowed",
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SprintPage() {
  const { sprints, loading, error, refetch, setSprints } = useSprints();
  const addToast = useAppStore((s) => s.addToast);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date-desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [activeSprint, setActiveSprint] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [taskCounts, setTaskCounts] = useState({});

  useEffect(() => {
    if (!sprints.length) return;

    let cancelled = false;

    Promise.all(
      sprints.map((s) =>
        getTareasBySprint(s.idSprint)
          .then((tareas) => {
            const total = tareas.length;
            const done = tareas.filter((t) => {
              const name = (t.estatus?.nombre ?? "").toLowerCase().trim();
              return (
                name === "completed" ||
                name === "completada" ||
                name === "done"
              );
            }).length;

            return [s.idSprint, { total, done }];
          })
          .catch(() => [s.idSprint, { total: 0, done: 0 }])
      )
    ).then((entries) => {
      if (!cancelled) setTaskCounts(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [sprints]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    let list = q
      ? sprints.filter((s) => s.nombre.toLowerCase().includes(q))
      : [...sprints];

    if (statusFilter) {
      list = list.filter((s) => deriveSprintStatus(s) === statusFilter);
    }

    list.sort((a, b) => {
      if (sort === "date-desc") {
        return (b.fechaInicio ?? "").localeCompare(a.fechaInicio ?? "");
      }

      if (sort === "date-asc") {
        return (a.fechaInicio ?? "").localeCompare(b.fechaInicio ?? "");
      }

      if (sort === "name-asc") return a.nombre.localeCompare(b.nombre);
      if (sort === "name-desc") return b.nombre.localeCompare(a.nombre);

      if (sort === "status-asc") {
        return (
          (STATUS_ORDER[deriveSprintStatus(a)] ?? 9) -
          (STATUS_ORDER[deriveSprintStatus(b)] ?? 9)
        );
      }

      if (sort === "status-desc") {
        return (
          (STATUS_ORDER[deriveSprintStatus(b)] ?? 9) -
          (STATUS_ORDER[deriveSprintStatus(a)] ?? 9)
        );
      }

      return 0;
    });

    return list;
  }, [sprints, search, sort, statusFilter]);

  const allChecked =
    filtered.length > 0 && filtered.every((s) => selected.has(s.idSprint));

  const toggleOne = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked) => {
      setSelected(
        checked ? new Set(filtered.map((s) => s.idSprint)) : new Set()
      );
    },
    [filtered]
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  function handleRowClick(sprint) {
    setActiveSprint((prev) =>
      prev?.idSprint === sprint.idSprint ? null : sprint
    );
    setShowCreate(false);
    setShowStatus(false);
  }

  async function handleCreate(data) {
    try {
      const nuevo = await createSprint(data);
      setSprints((prev) => [nuevo, ...prev]);

      addToast({
        id: `cre-${Date.now()}`,
        message: `Sprint "${nuevo.nombre}" created.`,
        type: "success",
      });

      setShowCreate(false);
    } catch {
      addToast({
        id: `err-${Date.now()}`,
        message: "Error creating sprint.",
        type: "error",
      });

      throw new Error("create failed");
    }
  }

  async function handleApplyStatus(estado) {
    const ids = [...selected];

    setShowStatus(false);
    clearSelection();

    // "Active" must enforce a single active sprint, so it goes through the
    // dedicated activation endpoint and only makes sense for one sprint at a time.
    if (estado === "ACTIVO") {
      if (ids.length !== 1) {
        addToast({
          id: `err-${Date.now()}`,
          message: "Select exactly one sprint to mark as active.",
          type: "error",
        });
        return;
      }

      const id = ids[0];

      try {
        const activado = await activateSprint(id);

        // The backend may also demote a previously active sprint, so refetch
        // the full list rather than patching local state piecemeal.
        await refetch();

        addToast({
          id: `st-${Date.now()}`,
          message: `"${activado.nombre}" is now the active sprint.`,
          type: "success",
        });
      } catch {
        addToast({
          id: `err-${Date.now()}`,
          message: "Error activating sprint.",
          type: "error",
        });
      }
      return;
    }

    try {
      await Promise.all(
        ids.map((id) => {
          const sprint = sprints.find((s) => s.idSprint === id);
          if (!sprint) return Promise.resolve();
          return updateSprint(id, { ...sprint, estado });
        })
      );

      setSprints((prev) =>
        prev.map((s) => (ids.includes(s.idSprint) ? { ...s, estado } : s))
      );

      addToast({
        id: `st-${Date.now()}`,
        message: `Status updated for ${ids.length} sprint${
          ids.length !== 1 ? "s" : ""
        }.`,
        type: "success",
      });
    } catch {
      addToast({
        id: `err-${Date.now()}`,
        message: "Error updating status.",
        type: "error",
      });
    }
  }

  async function handleDeleteConfirmed() {
    const ids = [...selected];

    setConfirmDelete(false);
    clearSelection();

    try {
      await Promise.all(ids.map((id) => deleteSprint(id)));

      setSprints((prev) => prev.filter((s) => !ids.includes(s.idSprint)));

      addToast({
        id: `del-${Date.now()}`,
        message: `${ids.length} sprint${ids.length !== 1 ? "s" : ""} deleted.`,
        type: "success",
      });
    } catch {
      addToast({
        id: `err-${Date.now()}`,
        message: "Error deleting sprint(s). Try again.",
        type: "error",
      });
    }
  }

  const hasFilters = search || statusFilter;

  if (error) {
    return (
      <div style={styles.page}>
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.title}>Sprints</h1>
            <p style={styles.subtitle}>Could not load sprints.</p>
          </div>

          <button onClick={refetch} style={styles.ghostButton}>
            Retry
          </button>
        </header>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div>
          <h1 style={styles.title}>Sprints</h1>
          <p style={styles.subtitle}>
            {filtered.length} sprints · plan, track and manage sprint cycles
          </p>
        </div>

        {selected.size === 0 && (
          <button
            onClick={() => {
              setActiveSprint(null);
              setShowCreate(true);
              setShowStatus(false);
            }}
            style={styles.primaryButton}
          >
            + New sprint
          </button>
        )}
      </header>

      <section style={styles.content}>
        <div style={styles.filterCard}>
          <div style={styles.filterGroup}>
            <div style={styles.filterLabel}>Status</div>
            <div style={styles.chipRow}>
              {STATUS_FILTERS.map((status) => {
                const active = statusFilter === status.value;

                return (
                  <button
                    key={status.label}
                    onClick={() => setStatusFilter(status.value)}
                    style={{
                      ...styles.filterChip,
                      backgroundColor: active ? status.bg : "#FFFFFF",
                      color: active ? status.color : "#6B7280",
                      borderColor: active ? status.border : "#E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        ...styles.statusDot,
                        backgroundColor: status.dot,
                      }}
                    />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.filterDivider} />

          <div style={styles.filterRow}>
            <input
              type="text"
              placeholder="Search by sprint name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.input}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#DC2626";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
              }}
            />

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={styles.select}
            >
              <option value="date-desc">Date: most recent</option>
              <option value="date-asc">Date: oldest</option>
              <option value="status-asc">Status: Active → Past</option>
              <option value="status-desc">Status: Past → Active</option>
              <option value="name-asc">Name: A → Z</option>
              <option value="name-desc">Name: Z → A</option>
            </select>

            {hasFilters && (
              <button
                style={styles.clearButton}
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div style={styles.actionBar}>
            <span style={styles.selectedText}>{selected.size} selected</span>

            <button
              onClick={() => setConfirmDelete(true)}
              style={styles.dangerButton}
            >
              Delete
            </button>

            <button
              onClick={() => {
                setShowStatus(true);
                setShowCreate(false);
                setActiveSprint(null);
              }}
              style={styles.ghostButton}
            >
              Change status
            </button>

            <button
              onClick={clearSelection}
              style={{ ...styles.ghostButton, marginLeft: "auto" }}
            >
              Cancel
            </button>
          </div>
        )}

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <colgroup>
              <col style={{ width: 42 }} />
              <col />
              <col style={{ width: 120 }} />
              <col style={{ width: 190 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 100 }} />
            </colgroup>

            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    style={styles.checkbox}
                  />
                </th>
                <th style={styles.th}>Sprint name</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Dates</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Total</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Done</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <SkeletonRows n={5} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon="⚡"
                      title={hasFilters ? "No sprints match" : "No sprints yet"}
                      message={
                        hasFilters
                          ? "Try a different search term or status filter."
                          : "Create the first sprint to get started."
                      }
                      action={
                        !hasFilters
                          ? {
                              label: "+ New sprint",
                              onClick: () => setShowCreate(true),
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((sprint) => {
                  const status = deriveSprintStatus(sprint);
                  const isActive = activeSprint?.idSprint === sprint.idSprint;
                  const isSelected = selected.has(sprint.idSprint);
                  const counts = taskCounts[sprint.idSprint] ?? {
                    total: 0,
                    done: 0,
                  };

                  return (
                    <tr
                      key={sprint.idSprint}
                      onClick={() => handleRowClick(sprint)}
                      style={{
                        ...styles.tr,
                        borderLeft:
                          status === "ACTIVO"
                            ? "2px solid #DC2626"
                            : "2px solid transparent",
                        backgroundColor: isSelected
                          ? "#FEE2E2"
                          : isActive
                          ? "#FAFAFA"
                          : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isActive) {
                          e.currentTarget.style.backgroundColor = "#FAFAFA";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <td
                        style={{ ...styles.td, textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(sprint.idSprint)}
                          style={styles.checkbox}
                        />
                      </td>

                      <td style={styles.td}>
                        <div style={styles.sprintNameCell}>
                          <span
                            style={{
                              ...styles.sprintIcon,
                              color: status === "ACTIVO" ? "#DC2626" : "#9CA3AF",
                            }}
                          >
                            ↯
                          </span>
                          <div style={styles.sprintTextGroup}>
                            <span style={styles.sprintTitle}>
                              {sprint.nombre}
                            </span>
                            <span style={styles.sprintId}>
                              SP-{sprint.idSprint}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <StatusPill status={status} />
                      </td>

                      <td style={styles.td}>
                        <span style={styles.dateText}>
                          {fmtDate(sprint.fechaInicio)} →{" "}
                          {fmtDate(sprint.fechaFin)}
                        </span>
                      </td>

                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <span style={styles.bodyBold}>{counts.total}</span>
                      </td>

                      <td style={styles.td}>
                        <ProgressCell
                          total={counts.total}
                          done={counts.done}
                          status={status}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {activeSprint && !showCreate && !showStatus && (
          <SprintDetailPanel
            sprint={activeSprint}
            onStatusChange={(newEstado) => {
              setSprints((prev) =>
                prev.map((s) =>
                  s.idSprint === activeSprint.idSprint
                    ? { ...s, estado: newEstado }
                    : s
                )
              );

              setActiveSprint((prev) =>
                prev ? { ...prev, estado: newEstado } : prev
              );
            }}
            onClose={() => {
              setActiveSprint(null);
              clearSelection();
            }}
          />
        )}
      </section>

      {showCreate && (
        <CreateSprintModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {showStatus && (
        <ChangeStatusModal
          count={selected.size}
          onClose={() => setShowStatus(false)}
          onApply={handleApplyStatus}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete sprint(s)?"
        message={`You are about to delete ${selected.size} sprint${
          selected.size !== 1 ? "s" : ""
        }. This action cannot be undone.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

const styles = {
  page: {
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column",
    minHeight: "100%",
    backgroundColor: "#F8F9FB",
  },

  topbar: {
    backgroundColor: "#FFFFFF",
    borderBottom: "0.5px solid #E5E7EB",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#111827",
  },

  subtitle: {
    margin: "4px 0 0",
    fontSize: 11,
    fontWeight: 400,
    color: "#9CA3AF",
  },

  content: {
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  primaryButton: {
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 500,
    padding: "6px 13px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(220,38,38,0.3)",
    whiteSpace: "nowrap",
  },

  ghostButton: {
    backgroundColor: "#FFFFFF",
    border: "0.5px solid #E5E7EB",
    color: "#6B7280",
    fontSize: 12,
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },

  dangerButton: {
    backgroundColor: "#FEE2E2",
    border: "0.5px solid #FECACA",
    color: "#991B1B",
    fontSize: 12,
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },

  filterCard: {
    backgroundColor: "#FFFFFF",
    border: "0.5px solid #E5E7EB",
    borderRadius: 10,
    padding: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  filterLabel: {
    fontSize: 11,
    fontWeight: 400,
    color: "#9CA3AF",
  },

  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "0.5px solid #E5E7EB",
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 10,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },

  filterDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    width: "100%",
  },

  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  input: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 400,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    border: "0.5px solid #E5E7EB",
    borderRadius: 6,
    padding: "7px 10px",
    outline: "none",
    width: 240,
  },

  select: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 500,
    color: "#6B7280",
    backgroundColor: "#FFFFFF",
    border: "0.5px solid #E5E7EB",
    borderRadius: 6,
    padding: "7px 30px 7px 10px",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
  },

  clearButton: {
    backgroundColor: "#FFFFFF",
    border: "0.5px solid #E5E7EB",
    color: "#6B7280",
    fontSize: 12,
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },

  actionBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    backgroundColor: "#FFFFFF",
    border: "0.5px solid #E5E7EB",
    borderRadius: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    animation: "fadeInUp 120ms ease-out both",
  },

  selectedText: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 4,
  },

  tableWrapper: {
    backgroundColor: "#FFFFFF",
    border: "0.5px solid #E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
    overflowX: "auto",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },

  th: {
    padding: "9px 12px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 500,
    color: "#9CA3AF",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    borderBottom: "0.5px solid #E5E7EB",
    backgroundColor: "#F9FAFB",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "9px 12px",
    borderBottom: "0.5px solid #F3F4F6",
    verticalAlign: "middle",
    fontSize: 12,
    color: "#374151",
  },

  tr: {
    transition: "background-color 100ms",
    cursor: "pointer",
  },

  checkbox: {
    width: 14,
    height: 14,
    accentColor: "#DC2626",
    cursor: "pointer",
  },

  sprintNameCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },

  sprintIcon: {
    fontSize: 13,
    flexShrink: 0,
  },

  sprintTextGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },

  sprintTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  sprintId: {
    fontSize: 10,
    color: "#9CA3AF",
  },

  dateText: {
    fontSize: 11,
    color: "#9CA3AF",
    whiteSpace: "nowrap",
  },

  bodyBold: {
    fontSize: 12,
    fontWeight: 600,
    color: "#111827",
  },

  progressText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },

  progressTrack: {
    height: 5,
    width: 64,
    margin: "0 auto",
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.5s ease",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(17,24,39,0.45)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  modal: {
    fontFamily: FONT,
    backgroundColor: "#FFFFFF",
    border: "0.5px solid #E5E7EB",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 24px 48px rgba(15,23,42,0.18)",
    animation: "scaleIn 150ms ease-out both",
  },

  modalSmall: {
    fontFamily: FONT,
    backgroundColor: "#FFFFFF",
    border: "0.5px solid #E5E7EB",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 24px 48px rgba(15,23,42,0.18)",
    animation: "scaleIn 150ms ease-out both",
  },

  modalTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 16px",
  },

  modalSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    margin: "0 0 16px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
  },

  label: {
    fontSize: 11,
    fontWeight: 400,
    color: "#9CA3AF",
  },

  dateGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  errorText: {
    fontSize: 11,
    color: "#DC2626",
    margin: "4px 0 0",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },

  statusOptions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  statusOption: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "0.5px solid #E5E7EB",
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 10,
    fontWeight: 500,
    cursor: "pointer",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },
};