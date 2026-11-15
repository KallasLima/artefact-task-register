import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

export type Task = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: string;
};

export class TaskStore {
  private tasks = new Map<string, Task>();

  list(): Task[] {
    return Array.from(this.tasks.values(), (task) => ({ ...task }));
  }

  get(id: string): Task {
    const task = this.tasks.get(id);
    if (!task)
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Task not found. It may have been deleted or the server restarted.",
      });
    return { ...task };
  }

  create(input: Pick<Task, "titulo" | "descricao">): Task {
    const task: Task = {
      ...input,
      id: randomUUID(),
      dataCriacao: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return { ...task };
  }

  update(id: string, input: Pick<Task, "titulo" | "descricao">): Task {
    const task = { ...this.get(id), ...input };
    this.tasks.set(id, task);
    return { ...task };
  }

  remove(id: string): { id: string } {
    this.get(id);
    this.tasks.delete(id);
    return { id };
  }
}

// Next bundles pages and API routes separately. Share the same store inside
// one Node process; data is intentionally lost when that process restarts.
const processState = globalThis as typeof globalThis & {
  taskCaseStore?: TaskStore;
};
export const taskStore = (processState.taskCaseStore ??= new TaskStore());
