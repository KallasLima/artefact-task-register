import { initTRPC } from "@trpc/server";
import { z, ZodError } from "zod";
import { taskStore, type TaskStore } from "./store";

const t = initTRPC.context<{ store: TaskStore }>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message:
        error.cause instanceof ZodError
          ? error.cause.issues.map((issue) => issue.message).join(" ")
          : shape.message,
    };
  },
});

const taskInput = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(120, "Title must be at most 120 characters."),
    descricao: z
      .string()
      .trim()
      .max(2000, "Description must be at most 2000 characters.")
      .optional(),
  })
  .strict();
const taskId = z.object({ id: z.string().uuid("Invalid task ID.") }).strict();

function normalized(input: z.infer<typeof taskInput>) {
  return { titulo: input.titulo, descricao: input.descricao || undefined };
}

export const appRouter = t.router({
  list: t.procedure.query(({ ctx }) => ctx.store.list()),
  get: t.procedure
    .input(taskId)
    .query(({ ctx, input }) => ctx.store.get(input.id)),
  create: t.procedure
    .input(taskInput)
    .mutation(({ ctx, input }) => ctx.store.create(normalized(input))),
  update: t.procedure
    .input(taskInput.extend({ id: taskId.shape.id }))
    .mutation(({ ctx, input }) =>
      ctx.store.update(input.id, normalized(input)),
    ),
  remove: t.procedure
    .input(taskId)
    .mutation(({ ctx, input }) => ctx.store.remove(input.id)),
});

export type AppRouter = typeof appRouter;
export const createContext = () => ({ store: taskStore });
