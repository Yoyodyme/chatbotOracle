/**
 * SprintPage — /sprints route
 *
 * Table-style sprint management page.
 *
 * Features:
 *   - List all sprints with derived status (ACTIVO / FUTURO / PASADO)
 *   - Search by name, sort by date / status / name
 *   - Row selection with action bar (Delete · Change status · Cancel)
 *   - Click row (not checkbox) → SprintDetailPanel with tasks
 *   - Create sprint modal (POST /api/sprints)
 *   - Change status modal (PUT /api/sprints/{id}, toggling activo)
 *   - Delete via ConfirmDialog (no backend DELETE endpoint yet — shows warning)
 *
 * Status derivation (frontend-only):
 *   activo === true                       → ACTIVO
 *   fechaInicio > today && !activo        → FUTURO
 *   fechaFin <= today && !activo          → PASADO
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import useSprints, { deriveSprintStatus } from "../hooks/useSprints";
import { createSprint, updateSprint, deleteSprint, getTareasBySprint } from "../api/sprints";
import SprintDetailPanel from "../components/sprint/SprintDetailModal";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import Skeleton from "../components/shared/Skeleton";
import EmptyState from "../components/shared/EmptyState";
import useAppStore from "../store/index";
import "../styles/animations.css";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}

const STATUS_ORDER = { ACTIVO: 0, FUTURO: 1, PASADO: 2 };

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const CONFIG = {
    ACTIVO: {
      bg: "var(--accent-soft)",
      border: "rgba(6,111,204,0.25)",
      color: "var(--accent)",
      dot: "var(--accent)",
    },
    FUTURO: {
      bg: "#f1efe8",
      border: "rgba(141,141,141,0.3)",
      color: "#5f5e5a",
      dot: "#888780",
    },
    PASADO: {
      bg: "#f5c4b3",
      border: "rgba(153,60,29,0.35)",
      color: "#712b13",
      dot: "#993c1d",
    },
  };
  const cfg = CONFIG[status] ?? CONFIG.PASADO;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 9px",
        borderRadius: 10,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function ProgressCell({ total, done }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div
        style={{
          textAlign: "center",
          marginBottom: 3,
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        {done}
      </div>
      {total > 0 && (
        <div
          style={{
            height: 3,
            width: 52,
            margin: "0 auto",
            background: "var(--bg-hover)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "var(--accent)",
              borderRadius: 2,
            }}
          />
        </div>
      )}
    </div>
  );
}

function SkeletonRows({ n = 5 }) {
  return [...Array(n)].map((_, i) => (
    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "10px 10px" }}>
        <Skeleton width="14px" height="14px" borderRadius="3px" />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <Skeleton width="160px" height="13px" />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <Skeleton width="70px" height="18px" borderRadius="9999px" />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <Skeleton width="120px" height="13px" />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <Skeleton width="28px" height="13px" />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <Skeleton width="28px" height="13px" />
      </td>
    </tr>
  ));
}

// ── Create Sprint Modal ───────────────────────────────────────────────────────

function CreateSprintModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Close on Escape
  React.useEffect(() => {
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

  const inputStyle = {
    fontFamily: "var(--font-body)",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "8px 12px",
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 28,
          width: "100%",
          maxWidth: 440,
          boxShadow: "var(--shadow-md)",
          animation: "scaleIn 150ms ease-out both",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "1.125rem",
            color: "var(--text-primary)",
            marginBottom: 20,
          }}
        >
          New sprint
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 5,
              }}
            >
              Name *
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) =>
                setForm((p) => ({ ...p, nombre: e.target.value }))
              }
              placeholder="Sprint 5"
              autoFocus
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(6,111,204,0.18)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: 5,
                }}
              >
                Start date{" "}
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  (fechaInicio)
                </span>
              </label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fechaInicio: e.target.value }))
                }
                style={{ ...inputStyle, colorScheme: "light" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: 5,
                }}
              >
                End date{" "}
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  (fechaFin)
                </span>
              </label>
              <input
                type="date"
                value={form.fechaFin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fechaFin: e.target.value }))
                }
                style={{ ...inputStyle, colorScheme: "light" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              />
            </div>
          </div>
          {error && (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--danger)",
                marginBottom: 12,
              }}
            >
              {error}
            </p>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                background: "transparent",
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "9px 20px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#fff",
                background: "var(--accent)",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                if (!saving) e.currentTarget.style.opacity = "1";
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

// ── Change Status Modal ───────────────────────────────────────────────────────

function ChangeStatusModal({ count, onClose, onApply }) {
  const [picked, setPicked] = useState(null);

  const OPTIONS = [
    { status: "ACTIVO", label: "Activo" },
    { status: "FUTURO", label: "Futuro" },
    { status: "PASADO", label: "Pasado" },
  ];

  const CFG = {
    ACTIVO: {
      bg: "var(--accent-soft)",
      border: "rgba(6,111,204,0.25)",
      color: "var(--accent)",
      dot: "var(--accent)",
    },
    FUTURO: {
      bg: "#f1efe8",
      border: "rgba(141,141,141,0.3)",
      color: "#5f5e5a",
      dot: "#888780",
    },
    PASADO: {
      bg: "#f5c4b3",
      border: "rgba(153,60,29,0.35)",
      color: "#712b13",
      dot: "#993c1d",
    },
  };

  React.useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 28,
          width: "100%",
          maxWidth: 400,
          boxShadow: "var(--shadow-md)",
          animation: "scaleIn 150ms ease-out both",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "1.125rem",
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Change sprint status
        </h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            marginBottom: 16,
          }}
        >
          Applies to {count} sprint{count !== 1 ? "s" : ""}.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {OPTIONS.map((opt) => {
            const cfg = CFG[opt.status];
            const isSelected = picked?.status === opt.status;
            return (
              <span
                key={opt.status}
                onClick={() => setPicked(opt)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "5px 13px",
                  borderRadius: 999,
                  cursor: "pointer",
                  background: cfg.bg,
                  color: cfg.color,
                  border: isSelected
                    ? `2px solid ${cfg.dot}`
                    : `1px solid ${cfg.border}`,
                  boxShadow: isSelected ? `0 0 0 3px ${cfg.bg}` : "none",
                  transition: "border 100ms, box-shadow 100ms",
                  userSelect: "none",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: cfg.dot,
                    flexShrink: 0,
                  }}
                />
                {opt.label}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "transparent",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Cancel
          </button>
          <button
            disabled={!picked}
            onClick={() => picked && onApply(picked.status)}
            style={{
              padding: "9px 20px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
              background: "var(--accent)",
              border: "none",
              cursor: picked ? "pointer" : "not-allowed",
              opacity: picked ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (picked) e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              if (picked) e.currentTarget.style.opacity = "1";
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SprintPage() {
  const { sprints, loading, error, refetch, setSprints } = useSprints();
  const addToast = useAppStore((s) => s.addToast);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date-desc");
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
              return name === "completed" || name === "completada" || name === "done";
            }).length;
            return [s.idSprint, { total, done }];
          })
          .catch(() => [s.idSprint, { total: 0, done: 0 }])
      )
    ).then((entries) => {
      if (!cancelled) setTaskCounts(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [sprints]);

  // ── Filtering & sorting ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = q
      ? sprints.filter((s) => s.nombre.toLowerCase().includes(q))
      : [...sprints];

    list.sort((a, b) => {
      if (sort === "date-desc")
        return (b.fechaInicio ?? "").localeCompare(a.fechaInicio ?? "");
      if (sort === "date-asc")
        return (a.fechaInicio ?? "").localeCompare(b.fechaInicio ?? "");
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
  }, [sprints, search, sort]);

  // ── Selection helpers ─────────────────────────────────────────────────────

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
        checked ? new Set(filtered.map((s) => s.idSprint)) : new Set(),
      );
    },
    [filtered],
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ── Row click (detail panel) ──────────────────────────────────────────────

  const handleRowClick = useCallback(
    (sprint) => {
      setActiveSprint((prev) =>
        prev?.idSprint === sprint.idSprint ? null : sprint,
      );
      setShowCreate(false);
      setShowStatus(false);
    },
    [],
  );

  // ── CRUD handlers ─────────────────────────────────────────────────────────

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
    try {
      await Promise.all(
        ids.map((id) => {
          const sprint = sprints.find((s) => s.idSprint === id);
          if (!sprint) return Promise.resolve();
          return updateSprint(id, { ...sprint, estado });
        }),
      );
      // Optimistic update
      setSprints((prev) =>
        prev.map((s) => (ids.includes(s.idSprint) ? { ...s, estado } : s)),
      );
      addToast({
        id: `st-${Date.now()}`,
        message: `Status updated for ${ids.length} sprint${ids.length !== 1 ? "s" : ""}.`,
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

  // ── Shared input style ────────────────────────────────────────────────────

  const inputStyle = {
    fontFamily: "var(--font-body)",
    fontSize: "0.8125rem",
    color: "var(--text-primary)",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "6px 10px",
    outline: "none",
    transition: "border-color 150ms",
  };

  const thStyle = {
    padding: "12px 16px",
    textAlign: "left",
    fontFamily: "var(--font-body)",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: "1px solid var(--border)",
    backgroundColor: "#f7f8f9",
    whiteSpace: "nowrap",
    userSelect: "none",
  };

  const tdStyle = {
    padding: "12px 16px",
    fontSize: 13,
    color: "var(--text-primary)",
    verticalAlign: "middle",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "1.375rem",
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Sprints
        </h1>
        <p style={{ color: "var(--danger)", fontSize: "0.875rem" }}>
          Could not load sprints.{" "}
          <button
            onClick={refetch}
            style={{
              color: "var(--accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
            }}
          >
            Retry
          </button>
        </p>
      </div>
    );
  }

  const allChecked =
    filtered.length > 0 && filtered.every((s) => selected.has(s.idSprint));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 24 }}>
      {/* ── Page header ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Sprints
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "nowrap",
          }}
        >
          {/* Search */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                left: 8,
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              style={{ ...inputStyle, paddingLeft: 28, width: 180 }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              ...inputStyle,
              width: "auto",
              paddingRight: 28,
              cursor: "pointer",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238d8d8d' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            <option value="date-desc">Date: most recent</option>
            <option value="date-asc">Date: oldest</option>
            <option value="status-asc">Status: Activo → Pasado</option>
            <option value="status-desc">Status: Pasado → Activo</option>
            <option value="name-asc">Name: A → Z</option>
            <option value="name-desc">Name: Z → A</option>
          </select>

          {/* New sprint button — hidden when rows are selected */}
          {selected.size === 0 && (
            <button
              onClick={() => {
                setActiveSprint(null);
                setShowCreate(true);
                setShowStatus(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#fff",
                background: "var(--accent)",
                border: "none",
                cursor: "pointer",
                transition: "opacity 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New sprint
            </button>
          )}
        </div>
      </div>

      {/* ── Action bar (visible only when rows are selected) ── */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "var(--bg-hover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            animation: "fadeInUp 120ms ease-out both",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginRight: 4,
            }}
          >
            {selected.size} selected
          </span>

          {/* Delete */}
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              cursor: "pointer",
              background: "#FCEBEB",
              color: "#A32D2D",
              border: "1px solid #F09595",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#F7C1C1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#FCEBEB";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
            Delete
          </button>

          {/* Change status */}
          <button
            onClick={() => {
              setShowStatus(true);
              setShowCreate(false);
              setActiveSprint(null);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              cursor: "pointer",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-surface)";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Change status
          </button>

          {/* Cancel */}
          <button
            onClick={clearSelection}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              cursor: "pointer",
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid transparent",
              marginLeft: "auto",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-surface)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Cancel
          </button>
        </div>
      )}

      {/* ── Sprint table ── */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: "35%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: "var(--accent)",
                    cursor: "pointer",
                  }}
                />
              </th>
              <th style={thStyle}>
                Sprint name
              </th>
              <th style={thStyle}>
                Status
              </th>
              <th style={thStyle}>
                Dates
              </th>
              <th style={{ ...thStyle, textAlign: "center" }}>
                Total
              </th>
              <th style={{ ...thStyle, textAlign: "center" }}>
                Done
              </th>
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
                    title={search ? "No sprints match" : "No sprints yet"}
                    message={
                      search
                        ? "Try a different search term."
                        : "Create the first sprint to get started."
                    }
                    action={
                      !search
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
              <>
                {filtered.map((sprint) => {
                  const status = deriveSprintStatus(sprint);
                  const isActive = activeSprint?.idSprint === sprint.idSprint;
                  const isSel = selected.has(sprint.idSprint);

                  return (
                    <tr
                      key={sprint.idSprint}
                      onClick={() => handleRowClick(sprint)}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        background: isSel
                          ? "#e8f2fd"
                          : isActive
                            ? "var(--bg-hover)"
                            : "transparent",
                        transition: "background-color 100ms",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSel && !isActive)
                          e.currentTarget.style.backgroundColor =
                            "var(--bg-hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSel && !isActive)
                          e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td
                        style={{ ...tdStyle, textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(sprint.idSprint)}
                          style={{
                            width: 14,
                            height: 14,
                            accentColor: "var(--accent)",
                            cursor: "pointer",
                          }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              color: "var(--text-muted)",
                              flexShrink: 0,
                            }}
                            aria-hidden="true"
                          >
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                          </svg>
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {sprint.nombre}
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <StatusPill status={status} />
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              color: "var(--text-muted)",
                              flexShrink: 0,
                            }}
                            aria-hidden="true"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {fmtDate(sprint.fechaInicio)} →{" "}
                          {fmtDate(sprint.fechaFin)}
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {taskCounts[sprint.idSprint]?.total ?? "—"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {taskCounts[sprint.idSprint]?.done ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Detail panel ── */}
      {activeSprint && !showCreate && !showStatus && (
        <SprintDetailPanel
          sprint={activeSprint}
          onStatusChange={(newEstado) => {
            setSprints((prev) =>
              prev.map((s) =>
                s.idSprint === activeSprint.idSprint ? { ...s, estado: newEstado } : s,
              ),
            );
            setActiveSprint((prev) => (prev ? { ...prev, estado: newEstado } : prev));
          }}
          onClose={() => {
            setActiveSprint(null);
            clearSelection();
          }}
        />
      )}

      {/* ── Modals ── */}
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
        message={`You are about to delete ${selected.size} sprint${selected.size !== 1 ? "s" : ""}. This action cannot be undone.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
