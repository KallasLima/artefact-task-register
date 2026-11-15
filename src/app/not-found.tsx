import Link from "next/link";
export default function NotFound() {
  return (
    <>
      <h1>Task not found</h1>
      <p>It may have been deleted or the server restarted.</p>
      <Link href="/">Back to tasks</Link>
    </>
  );
}
