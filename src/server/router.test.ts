import { test } from "node:test";
import assert from "node:assert/strict";
import { appRouter } from "./router";
import { TaskStore } from "./store";

function setup() {
  return appRouter.createCaller({ store: new TaskStore() });
}

test("CRUD preserves identity and creation time, trims fields, and clears description", async () => {
  const api = setup();
  assert.deepEqual(await api.list(), []);
  const task = await api.create({
    titulo: "  Prepare demo  ",
    descricao: "  Fictional example  ",
  });
  assert.equal(task.titulo, "Prepare demo");
  assert.equal(task.descricao, "Fictional example");
  assert.match(task.id, /^[0-9a-f-]{36}$/);
  assert.equal(new Date(task.dataCriacao).toISOString(), task.dataCriacao);
  assert.deepEqual(await api.list(), [task]);
  assert.deepEqual(await api.get({ id: task.id }), task);
  const edited = await api.update({
    id: task.id,
    titulo: "Revised demo",
    descricao: "",
  });
  assert.equal(edited.id, task.id);
  assert.equal(edited.dataCriacao, task.dataCriacao);
  assert.equal(edited.titulo, "Revised demo");
  assert.equal(edited.descricao, undefined);
  assert.deepEqual(await api.remove({ id: task.id }), { id: task.id });
  assert.deepEqual(await api.list(), []);
});

test("optional description, unique IDs, duplicate titles, and insertion order", async () => {
  const api = setup();
  const first = await api.create({ titulo: "Same title" });
  const second = await api.create({ titulo: "Same title" });
  assert.equal(first.descricao, undefined);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(
    (await api.list()).map((t) => t.id),
    [first.id, second.id],
  );
});

test("empty, whitespace-only, oversized titles and descriptions are rejected without mutation", async () => {
  const api = setup();
  for (const titulo of ["", "   ", "a".repeat(121)]) {
    await assert.rejects(api.create({ titulo }), { code: "BAD_REQUEST" });
  }
  await assert.rejects(
    api.create({ titulo: "Valid", descricao: "a".repeat(2001) }),
    { code: "BAD_REQUEST" },
  );
  assert.deepEqual(await api.list(), []);
  const task = await api.create({
    titulo: "a".repeat(120),
    descricao: "a".repeat(2000),
  });
  await assert.rejects(api.update({ id: task.id, titulo: " " }), {
    code: "BAD_REQUEST",
  });
  assert.deepEqual(await api.get({ id: task.id }), task);
});

test("missing tasks and invalid IDs produce meaningful errors", async () => {
  const api = setup();
  const id = "00000000-0000-4000-8000-000000000001";
  for (const operation of [
    () => api.get({ id }),
    () => api.update({ id, titulo: "Missing" }),
    () => api.remove({ id }),
  ])
    await assert.rejects(operation(), {
      code: "NOT_FOUND",
      message: /Task not found/,
    });
  await assert.rejects(api.get({ id: "invalid" }), { code: "BAD_REQUEST" });
});

test("returned snapshots cannot mutate the store; text is preserved as data", async () => {
  const api = setup();
  const task = await api.create({
    titulo: "<script>alert(1)</script>",
    descricao: "Line 1\nLine 2 • ação",
  });
  task.titulo = "Tampered";
  const list = await api.list();
  assert.equal(list[0].titulo, "<script>alert(1)</script>");
  list[0].titulo = "Tampered again";
  assert.equal(
    (await api.get({ id: task.id })).titulo,
    "<script>alert(1)</script>",
  );
  assert.equal(
    (await api.get({ id: task.id })).descricao,
    "Line 1\nLine 2 • ação",
  );
});
