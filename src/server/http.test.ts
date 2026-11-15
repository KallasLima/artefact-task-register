import { test } from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/trpc/[trpc]/route";

async function request(procedure: string, input?: unknown) {
  const req = new Request(`http://localhost/api/trpc/${procedure}`, {
    method: input === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: input === undefined ? undefined : JSON.stringify(input),
  });
  const response = await (input === undefined ? GET(req) : POST(req));
  return { response, body: await response.json() };
}

test("HTTP adapter exposes CRUD, validates untyped JSON, and returns readable errors without caching", async () => {
  const invalid = await request("create", { titulo: "   " });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.error.data.code, "BAD_REQUEST");
  assert.match(invalid.body.error.message, /Title is required/);

  const created = await request("create", {
    titulo: "  HTTP boundary  ",
    descricao: "  ",
  });
  assert.equal(created.response.status, 200);
  assert.equal(created.response.headers.get("cache-control"), "no-store");
  const task = created.body.result.data;
  assert.equal(task.titulo, "HTTP boundary");
  assert.equal(task.descricao, undefined);

  const listed = await request("list");
  assert.ok(
    listed.body.result.data.some((item: { id: string }) => item.id === task.id),
  );
  const edited = await request("update", {
    id: task.id,
    titulo: "Edited over HTTP",
  });
  assert.equal(edited.response.status, 200);
  assert.equal(edited.body.result.data.dataCriacao, task.dataCriacao);
  assert.equal(edited.body.result.data.id, task.id);

  assert.equal((await request("remove", { id: task.id })).response.status, 200);
  const stale = await request("remove", { id: task.id });
  assert.equal(stale.response.status, 404);
  assert.equal(stale.body.error.data.code, "NOT_FOUND");
  assert.match(stale.body.error.message, /Task not found/);
});
