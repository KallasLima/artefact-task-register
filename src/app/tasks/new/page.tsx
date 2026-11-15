import { TaskForm } from "@/components/task-form";
export default function NewTask() {
  return (
    <div className="form-page">
      <div className="page-heading">
        <div>
          <h1>New task</h1>
          <p>Add a title and an optional description.</p>
        </div>
      </div>
      <TaskForm />
    </div>
  );
}
