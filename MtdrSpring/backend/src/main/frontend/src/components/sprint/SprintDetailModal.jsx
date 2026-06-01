/**
 * SprintDetailPanel
 *
 * Displays sprint metadata, a progress bar, and the list of associated tasks.
 * Tasks are fetched from GET /api/tareas/sprint/{id} when the panel opens.
 *
 * Props:
 *   sprint   {Object}   — the sprint object being viewed
 *   onClose  {Function} — called when the user dismisses the panel
 */

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { updateSprint } from "../../api/sprints";
import { deriveSprintStatus } from "../../hooks/useSprints";
import Skeleton from "../shared/Skeleton";
import { StatusBadge, PriorityBadge } from "../tasks/TaskBadge";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

function SkeletonTaskRows() {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <tr key={i}>
          <td style={{ padding: "9px 12px" }}>
            <Skeleton width="72px" height="12px" />
          </td>
          <td style={{ padding: "9px 12px" }}>
            <Skeleton width="180px" height="12px" />
          </td>
          <td style={{ padding: "9px 12px" }}>
            <Skeleton width="80px" height="12px" />
          </td>
          <td style={{ padding: "9px 12px" }}>
            <Skeleton width="60px" height="12px" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["ACTIVO", "FUTURO", "PASADO"];

const STATUS_CFG = {
  ACTIVO: { bg: "var(--accent-soft)", border: "rgba(6,111,204,0.25)", color: "var(--accent)", dot: "var(--accent)" },
  FUTURO: { bg: "#f1efe8", border: "rgba(141,141,141,0.3)", color: "#5f5e5a", dot: "#888780" },
  PASADO: { bg: "#f5c4b3", border: "rgba(153,60,29,0.35)", color: "#712b13", dot: "#993c1d" },
};

export default function SprintDetailPanel({ sprint, onClose, onStatusChange }) {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localEstado, setLocalEstado] = useState(
    sprint.estado ?? deriveSprintStatus(sprint),
  );
  const [showPicker, setShowPicker] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const status = localEstado;

  async function handlePickStatus(newEstado) {
    if (newEstado === localEstado || savingStatus) return;
    setSavingStatus(true);
    try {
      await updateSprint(sprint.idSprint, { ...sprint, estado: newEstado });
      setLocalEstado(newEstado);
      onStatusChange?.(newEstado);
    } finally {
      setSavingStatus(false);
      setShowPicker(false);
    }
  }

  useEffect(() => {
    if (!sprint?.idSprint) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/tareas/sprint/${sprint.idSprint}`)
      .then((data) => {
        if (!cancelled) setTareas(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sprint.idSprint]);

  // Close modal on Escape; close picker on Escape (before closing modal)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        if (showPicker) { setShowPicker(false); }
        else { onClose(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, showPicker]);

  const total = tareas.length;
  const done = tareas.filter((t) => {
    const name = (t.estatus?.nombre ?? "").toLowerCase().trim();
    return name === "completed" || name === "completada" || name === "done";
  }).length;
  const outstanding = tareas.filter((t) => {
    const name = (t.estatus?.nombre ?? "").toLowerCase().trim();
    return (
      name === "in progress" ||
      name === "en progreso" ||
      name === "pending" ||
      name === "pendiente" ||
      name === "not started"
    );
  }).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // ── Styles ──────────────────────────────────────────────────────────────────

  const S = {
    panel: {
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "20px 22px",
      boxShadow: "var(--shadow-md)",
      animation: "scaleIn 150ms ease-out both",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    sub: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-muted)",
      marginBottom: 3,
    },
    title: {
      fontFamily: "var(--font-heading)",
      fontWeight: 600,
      fontSize: "1.0625rem",
      color: "var(--text-primary)",
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: "var(--radius-md)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      color: "var(--text-muted)",
      fontSize: 18,
      flexShrink: 0,
      transition: "color 100ms, background-color 100ms",
    },
    metaGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 16,
    },
    metaLabel: {
      fontSize: 11,
      color: "var(--text-tertiary, var(--text-muted))",
      marginBottom: 2,
    },
    metaValue: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
    progressWrap: { marginBottom: 16 },
    progressHeader: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      color: "var(--text-secondary)",
      marginBottom: 5,
    },
    progressBg: {
      height: 6,
      background: "var(--bg-hover)",
      borderRadius: 9999,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 9999,
      background: "var(--accent)",
      width: `${pct}%`,
      transition: "width 600ms ease",
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-secondary)",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      margin: "16px 0 8px",
    },
    tableWrap: {
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
    },
    table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
    th: {
      padding: "7px 12px",
      textAlign: "left",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--text-muted)",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      borderBottom: "1px solid var(--border)",
      background: "#f7f8f9",
    },
    td: {
      padding: "8px 12px",
      fontSize: 12,
      color: "var(--text-primary)",
      borderBottom: "1px solid var(--border)",
      verticalAlign: "middle",
      overflow: "hidden",
    },
    tdMono: {
      padding: "8px 12px",
      fontSize: 11,
      fontFamily: "var(--font-mono)",
      color: "var(--text-muted)",
      borderBottom: "1px solid var(--border)",
      verticalAlign: "middle",
    },
    taskTitle: {
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    apiNote: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: "var(--text-muted)",
      marginTop: 10,
    },
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
      style={{ ...S.panel, width: "100%", maxWidth: 580, maxHeight: "85vh", overflowY: "auto" }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.sub}>idSprint: {sprint.idSprint}</div>
          <div style={S.title}>{sprint.nombre}</div>
        </div>
        <button
          style={S.closeBtn}
          onClick={onClose}
          aria-label="Close detail panel"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.backgroundColor = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          ×
        </button>
      </div>

      {/* Metadata grid */}
      <div style={S.metaGrid}>
        <div>
          <div style={S.metaLabel}>Status</div>
          <div style={{ ...S.metaValue, position: "relative" }}>
            <button
              onClick={() => setShowPicker((v) => !v)}
              disabled={savingStatus}
              style={{
                all: "unset",
                cursor: savingStatus ? "not-allowed" : "pointer",
                opacity: savingStatus ? 0.6 : 1,
              }}
              title="Change status"
            >
              <StatusPill status={status} />
            </button>
            {showPicker && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 100,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-md)",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 120,
                }}
              >
                {STATUS_OPTIONS.map((opt) => {
                  const cfg = STATUS_CFG[opt];
                  const isActive = opt === localEstado;
                  return (
                    <button
                      key={opt}
                      onClick={() => handlePickStatus(opt)}
                      style={{
                        all: "unset",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 9px",
                        borderRadius: 8,
                        background: isActive ? cfg.bg : "transparent",
                        border: isActive ? `1px solid ${cfg.border}` : "1px solid transparent",
                        color: isActive ? cfg.color : "var(--text-secondary)",
                        cursor: "pointer",
                        transition: "background 80ms",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "var(--bg-hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
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
                      {opt.charAt(0) + opt.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={S.metaLabel}>Dates</div>
          <div style={{ ...S.metaValue, fontSize: 12, fontWeight: 400 }}>
            {formatDate(sprint.fechaInicio)} → {formatDate(sprint.fechaFin)}
          </div>
        </div>
        <div>
          <div style={S.metaLabel}>Total tasks</div>
          <div style={S.metaValue}>{loading ? "—" : total}</div>
        </div>
        <div>
          <div style={S.metaLabel}>Done</div>
          <div style={S.metaValue}>{loading ? "—" : done}</div>
        </div>
        <div>
          <div style={S.metaLabel}>Outstanding</div>
          <div style={S.metaValue}>{loading ? "—" : outstanding}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={S.progressWrap}>
        <div style={S.progressHeader}>
          <span>Progress</span>
          <span>{loading ? "—" : `${pct}%`}</span>
        </div>
        <div style={S.progressBg}>
          {!loading && <div style={S.progressFill} />}
        </div>
      </div>

      {/* Task table */}
      <div style={S.sectionTitle}>Tasks</div>

      {error && (
        <p style={{ fontSize: 12, color: "var(--danger)", padding: "8px 0" }}>
          Could not load tasks. Verify the endpoint exists on the backend.
        </p>
      )}

      {!error && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <colgroup>
              <col style={{ width: "72px" }} />
              <col />
              <col style={{ width: "110px" }} />
              <col style={{ width: "90px" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={S.th}>ID</th>
                <th style={S.th}>Title</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Priority</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTaskRows />
              ) : tareas.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      ...S.td,
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: "20px 12px",
                      borderBottom: "none",
                    }}
                  >
                    No tasks associated with this sprint yet.
                  </td>
                </tr>
              ) : (
                tareas.map((t) => (
                  <tr
                    key={t.idTarea}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    style={{ transition: "background-color 100ms" }}
                  >
                    <td style={S.tdMono}>YD-{t.idTarea}</td>
                    <td style={S.td}>
                      <span style={S.taskTitle} title={t.titulo}>
                        {t.titulo}
                      </span>
                    </td>
                    <td style={S.td}>
                      <StatusBadge estatus={t.estatus} />
                    </td>
                    <td style={S.td}>
                      <PriorityBadge prioridad={t.prioridad} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
    </div>
  );
}
