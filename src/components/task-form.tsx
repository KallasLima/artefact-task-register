"use client";

import { TRPCClientError } from "@trpc/client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Task } from "@/server/store";
import { trpc } from "@/lib/trpc";
import { Icon } from "@/components/icon";

export function TaskForm({ task }: { task?: Task }) {
  const activeForm = useRef(false);
  const allowLeave = useRef(false);
  const leaveAttempted = useRef(false);
  const requestVersion = useRef(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [descricao, setDescricao] = useState(task?.descricao ?? "");
  const [touched, setTouched] = useState({ title: false, description: false });
  const [error, setError] = useState("");
  const [missingTask, setMissingTask] = useState(false);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState("");
  const dirty =
    titulo !== (task?.titulo ?? "") || descricao !== (task?.descricao ?? "");
  const titleLength = titulo.trim().length;
  const descriptionLength = descricao.trim().length;

  useEffect(() => {
    activeForm.current = true;
    const leave = () => {
      activeForm.current = false;
      requestVersion.current += 1;
    };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      activeForm.current = true;
      setPending(false);
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", restore);
    return () => {
      activeForm.current = false;
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", restore);
    };
  }, []);

  useEffect(() => {
    if (!dirty && !pending) return;
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (allowLeave.current) return;
      leaveAttempted.current = true;
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    // Document navigation lets the browser protect links, Back, reload and close.
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty, pending]);

  const titleError = !titulo.trim()
    ? "Enter a title. Spaces alone are not a title."
    : titleLength > 120
      ? "Title must be at most 120 characters."
      : "";
  const descriptionError =
    descriptionLength > 2000
      ? "Description must be at most 2,000 characters."
      : "";
  const showTitleError =
    (touched.title || titleLength > 120) && Boolean(titleError);
  const showDescriptionError =
    (touched.description || descriptionLength > 2000) &&
    Boolean(descriptionError);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || completed) return;
    leaveAttempted.current = false;
    setError("");
    setTouched({ title: true, description: true });
    if (titleError || descriptionError) {
      (titleError ? titleRef.current : descriptionRef.current)?.focus();
      return;
    }

    // Network work stays outside transitions so leaving the form is immediate.
    setPending(true);
    const version = ++requestVersion.current;
    let replacingDocument = false;
    function finish(message: string, marker: string) {
      // A slow departure must not be replaced by this response. If the user
      // chose Stay, show the confirmed result without allowing a duplicate save.
      allowLeave.current = true;
      if (leaveAttempted.current) {
        setCompleted(`${message} Return to tasks to view it.`);
      } else {
        window.location.replace(`/?${marker}=1`);
        replacingDocument = true;
      }
    }
    try {
      const input = { titulo, descricao };
      if (task && !missingTask) {
        await trpc.update.mutate({ ...input, id: task.id });
        if (!activeForm.current || version !== requestVersion.current) return;
        finish("Task updated.", "updated");
      } else {
        await trpc.create.mutate(input);
        if (activeForm.current && version === requestVersion.current) {
          finish("Task created.", "created");
        }
      }
    } catch (cause) {
      if (!activeForm.current || version !== requestVersion.current) return;
      if (
        cause instanceof TRPCClientError &&
        cause.data?.code === "NOT_FOUND"
      ) {
        setMissingTask(true);
        setError(
          "This task is no longer available. Your changes are still here. Create a new task to keep them, or return to the list.",
        );
      } else if (
        cause instanceof TRPCClientError &&
        cause.data?.code === "BAD_REQUEST"
      ) {
        setError(cause.message);
      } else {
        setError(
          "Could not save the task. Your changes are still here. Please try again.",
        );
      }
    } finally {
      if (
        activeForm.current &&
        version === requestVersion.current &&
        !replacingDocument
      )
        setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="task-form"
      aria-busy={pending}
      noValidate
    >
      <div>
        <label htmlFor="title">
          Title <span>Required</span>
        </label>
        <input
          ref={titleRef}
          id="title"
          name="title"
          value={titulo}
          onChange={(event) => {
            setTitulo(event.target.value);
          }}
          onBlur={() => setTouched((value) => ({ ...value, title: true }))}
          required
          disabled={pending || Boolean(completed)}
          aria-invalid={showTitleError}
          aria-describedby={
            showTitleError ? "title-help title-error" : "title-help"
          }
        />
        <p className="help field-meta" id="title-help">
          <span>1–120 characters.</span>
          <span>{titleLength}/120</span>
        </p>
        {showTitleError && (
          <p className="field-error" id="title-error" role="alert">
            {titleError}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="description">
          Description <span>Optional</span>
        </label>
        <textarea
          ref={descriptionRef}
          id="description"
          name="description"
          rows={4}
          value={descricao}
          disabled={pending || Boolean(completed)}
          onChange={(event) => {
            setDescricao(event.target.value);
          }}
          onBlur={() =>
            setTouched((value) => ({ ...value, description: true }))
          }
          aria-invalid={showDescriptionError}
          aria-describedby={
            showDescriptionError
              ? "description-help description-error"
              : "description-help"
          }
        />
        <p className="help field-meta" id="description-help">
          <span>Up to 2,000 characters.</span>
          <span>{descriptionLength}/2,000</span>
        </p>
        {showDescriptionError && (
          <p className="field-error" id="description-error" role="alert">
            {descriptionError}
          </p>
        )}
      </div>
      {error && (
        <p className="notice error" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
        </p>
      )}
      {completed && (
        <p className="notice" role="status">
          <Icon name="check" />
          <span>{completed}</span>
        </p>
      )}
      <div className="form-actions">
        <button
          className="button"
          type="submit"
          disabled={pending || Boolean(completed)}
        >
          {pending && <Icon name="spinner" />}
          {completed
            ? "Saved"
            : pending
              ? "Saving..."
              : missingTask
                ? "Create as new task"
                : task
                  ? "Save changes"
                  : "Create task"}
        </button>
        <a className="back-link" href="/">
          <Icon name="back" />
          Back to tasks
        </a>
      </div>
    </form>
  );
}
