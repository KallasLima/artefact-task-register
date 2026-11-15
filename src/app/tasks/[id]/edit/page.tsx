import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { appRouter, createContext } from "@/server/router";
import { TaskForm } from "@/components/task-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditTask({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let task;
  try {
    task = await appRouter.createCaller(createContext()).get({ id });
  } catch (error) {
    if (
      error instanceof TRPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    )
      notFound();
    throw error;
  }
  return (
    <div className="form-page">
      <div className="page-heading">
        <div>
          <h1>Edit task</h1>
          <p>Update the details, then save your changes.</p>
        </div>
      </div>
      <TaskForm key={id} task={task} />
    </div>
  );
}
