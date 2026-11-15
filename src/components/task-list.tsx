"use client";

import { TRPCClientError } from "@trpc/client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/server/store";
import { trpc } from "@/lib/trpc";
import { Icon } from "@/components/icon";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

export function TaskList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
    taskId?: string;
  } | null>(null);

  useEffect(() => {
    function refreshRestoredList(event: PageTransitionEvent) {
      // A restored document may contain rows from before a later create/edit.
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", refreshRestoredList);
    return () => window.removeEventListener("pageshow", refreshRestoredList);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const created = url.searchParams.get("created") === "1";
    const updated = url.searchParams.get("updated") === "1";
    if (!created && !updated) return;
    // Consume the edit confirmation so a reload does not repeat it.
    url.searchParams.delete("updated");
    url.searchParams.delete("created");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    setMessage({
      text: created ? "Task created." : "Task updated.",
      error: false,
    });
  }, []);

  function cancelDelete() {
    setConfirmId(null);
    deleteTrigger.current?.focus();
  }

  function remove(id: string) {
    if (pending) return;
    setDeletingId(id);
    setMessage(null);
    startTransition(async () => {
      try {
        await trpc.remove.mutate({ id });
        setMessage({ text: "Task deleted.", error: false });
        setConfirmId(null);
        document.getElementById("new-task")?.focus();
        router.refresh();
      } catch (cause) {
        if (
          cause instanceof TRPCClientError &&
          cause.data?.code === "NOT_FOUND"
        ) {
          setMessage({
            text: "This task was already removed. The list has been refreshed.",
            error: false,
          });
          setConfirmId(null);
          document.getElementById("new-task")?.focus();
          router.refresh();
        } else {
          setMessage({
            text: "Could not delete the task. Please try again.",
            error: true,
            taskId: id,
          });
        }
      }
    });
  }

  return (
    <section aria-label="Task list" aria-busy={pending}>
      {message && !message.error && (
        <p className="notice" role="status">
          <Icon name="check" />
          <span>{message.text}</span>
        </p>
      )}
      {tasks.length === 0 ? (
        <div className="empty">
          <Icon name="register" />
          <h2>No tasks yet</h2>
          <p>Create a task to get started.</p>
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task, index) => (
            <li key={task.id}>
              <span className="row-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="task-content">
                <h2>{task.titulo}</h2>
                {task.descricao && (
                  <p className="description">{task.descricao}</p>
                )}
              </div>
              <time
                dateTime={task.dataCriacao}
                className="task-date"
                aria-label={`Created ${dateFormat.format(new Date(task.dataCriacao))} at ${timeFormat.format(new Date(task.dataCriacao))} UTC`}
              >
                <span>{dateFormat.format(new Date(task.dataCriacao))}</span>
                <span>{timeFormat.format(new Date(task.dataCriacao))} UTC</span>
              </time>
              <div className="task-controls">
                <div className="row-actions">
                  <a
                    className="icon-button row-action"
                    href={`/tasks/${task.id}/edit`}
                    aria-label={`Edit ${task.titulo}`}
                    title="Edit task"
                  >
                    <Icon name="edit" />
                    <span className="action-label">Edit</span>
                  </a>
                  <button
                    className="icon-button row-action delete-button"
                    disabled={pending}
                    onClick={(event) => {
                      deleteTrigger.current = event.currentTarget;
                      setConfirmId(task.id);
                      setMessage(null);
                    }}
                    aria-expanded={confirmId === task.id}
                    aria-label={`Delete ${task.titulo}`}
                    title={
                      pending && deletingId === task.id
                        ? "Deleting..."
                        : "Delete task"
                    }
                    aria-describedby={
                      message?.error && message.taskId === task.id
                        ? `delete-error-${task.id}`
                        : undefined
                    }
                  >
                    <Icon
                      name={
                        pending && deletingId === task.id ? "spinner" : "trash"
                      }
                    />
                    <span className="action-label">Delete</span>
                  </button>
                </div>
              </div>
              {confirmId === task.id && (
                <div
                  className="delete-confirmation"
                  role="group"
                  aria-label={`Delete ${task.titulo}?`}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && !pending) {
                      event.preventDefault();
                      cancelDelete();
                    }
                  }}
                >
                  <p>Delete “{task.titulo}”? This cannot be undone.</p>
                  <div className="confirmation-actions">
                    <button
                      className="button danger-button"
                      disabled={pending}
                      onClick={() => remove(task.id)}
                    >
                      {pending ? "Deleting..." : "Delete task"}
                    </button>
                    <button
                      className="button secondary-button"
                      disabled={pending}
                      onClick={cancelDelete}
                      autoFocus
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {message?.error && message.taskId === task.id && (
                <p
                  className="field-error delete-error"
                  id={`delete-error-${task.id}`}
                  role="alert"
                >
                  <Icon name="alert" />
                  <span>{message.text}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
