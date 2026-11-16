import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { isValidElement, type ReactElement } from "react";
import ts from "typescript";
import { editableOf } from "../src/lib/projects/generated/edit";
import { tidewaterSwimDraft } from "../src/lib/projects/tidewater-swim";

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  readFileSync(new URL("../src/components/teach/ProjectEditor.tsx", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } },
).outputText;
type Element = ReactElement<Record<string, unknown>>;

// Execute the actual component with controlled hooks, router and network.
// This checks its event handlers and rendered controls without adding a DOM dependency.
function editor(request: typeof fetch) {
  const states: unknown[] = [];
  let cursor = 0;
  let refreshes = 0;
  const exports: Record<string, unknown> = {};
  const initial = editableOf(tidewaterSwimDraft);
  runInNewContext(compiled, {
    exports, structuredClone, fetch: request,
    require: (name: string) => {
      if (name === "react") return {
        useState<T>(initialValue: T): [T, (value: T | ((previous: T) => T)) => void] {
          const index = cursor++;
          if (!(index in states)) states[index] = initialValue;
          return [states[index] as T, (value) => {
            states[index] = typeof value === "function" ? (value as (previous: T) => T)(states[index] as T) : value;
          }];
        },
      };
      if (name === "next/navigation") return { useRouter: () => ({ refresh: () => { refreshes++; } }) };
      if (name === "react/jsx-runtime") return require(name);
      throw new Error(`Unexpected component dependency: ${name}`);
    },
  });
  const component = exports.ProjectEditor as (props: { projectId: string; initial: typeof initial }) => Element;
  function render() {
    cursor = 0;
    const result: Element[] = [];
    function visit(value: unknown) {
      if (Array.isArray(value)) { value.forEach(visit); return; }
      if (!isValidElement<Record<string, unknown>>(value)) return;
      result.push(value);
      visit(value.props.children);
    }
    visit(component({ projectId: "gen-editor-test", initial }));
    return result;
  }
  return {
    render,
    buttons: () => render().filter((node) => node.type === "button"),
    changeTitle(value: string) {
      const onChange = render().find((node) => node.props.label === "Title")!.props.onChange;
      assert.equal(typeof onChange, "function");
      (onChange as (value: string) => void)(value);
    },
    save() {
      const onClick = this.buttons()[0].props.onClick as () => void;
      onClick();
    },
    get refreshes() { return refreshes; },
  };
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function hasText(view: ReturnType<typeof editor>, text: string) {
  return view.render().some((node) => typeof node.props.children === "string" && node.props.children.includes(text));
}

test("network failure restores both buttons, retains edits and allows a successful retry", async () => {
  let fail!: () => void;
  let attempts = 0;
  const bodies: string[] = [];
  const view = editor(async (input, init) => {
    assert.equal(input, "/api/teach/projects/gen-editor-test");
    assert.equal(init?.method, "PUT");
    bodies.push(String(init?.body));
    if (++attempts === 1) await new Promise<void>((_resolve, reject) => { fail = () => reject(new TypeError("Failed to fetch")); });
    return Response.json({ saved: true });
  });
  view.changeTitle("My unsaved project title");
  view.save();
  assert.ok(view.buttons().every((button) => button.props.disabled === true));
  fail();
  await settle();
  assert.ok(view.buttons().every((button) => button.props.disabled === false));
  assert.ok(hasText(view, "Your edits are still here"));
  assert.equal(view.render().find((node) => node.props.label === "Title")!.props.value, "My unsaved project title");
  assert.equal(view.refreshes, 0);
  view.save();
  await settle();
  assert.equal(attempts, 2);
  assert.equal(bodies[0], bodies[1]);
  assert.equal(JSON.parse(bodies[1]).title, "My unsaved project title");
  assert.ok(hasText(view, "Saved. Students see"));
  assert.equal(view.refreshes, 1);
  assert.ok(view.buttons().every((button) => button.props.disabled === false));
});

test("validation errors still display their message and individual problems", async () => {
  const view = editor(async () => Response.json({ error: "The project failed its checks.", problems: ["The opening gives away the answer."] }, { status: 422 }));
  view.save();
  await settle();
  assert.ok(hasText(view, "The project failed its checks."));
  assert.ok(hasText(view, "The opening gives away the answer."));
  assert.equal(view.refreshes, 0);
  assert.ok(view.buttons().every((button) => button.props.disabled === false));
});

test("malformed or unconfirmed responses never report success and permit retry", async () => {
  for (const response of [
    () => new Response("<html>Unavailable</html>", { status: 502 }),
    () => new Response("not JSON", { status: 200 }),
    () => Response.json({}),
    () => Response.json({ saved: false }),
  ]) {
    const view = editor(async () => response());
    view.save();
    await settle();
    assert.ok(hasText(view, "Could not confirm the save"));
    assert.ok(view.buttons().every((button) => button.props.disabled === false));
    assert.equal(view.refreshes, 0);
  }
});
