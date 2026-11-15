import { appRouter, createContext } from "@/server/router";
import { TaskList } from "@/components/task-list";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  // A direct tRPC caller shares validation and behavior without a loopback HTTP request.
  const tasks = await appRouter.createCaller(createContext()).list();
  return (
    <>
      <div className="page-heading">
        <div className="heading-title">
          <h1>Tasks</h1>
          <span className="list-count">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>
        <a className="button" href="/tasks/new" id="new-task">
          <Icon name="plus" />
          New task
        </a>
      </div>
      <TaskList tasks={tasks} />
    </>
  );
}
