import { strict as assert } from "assert";
import { corsOptions, json } from "../../supabase/functions/_shared/cors.ts";

function request(origin?: string): Request {
  return new Request("http://localhost/functions/v1/test", {
    method: "OPTIONS",
    headers: origin ? { Origin: origin } : {},
  });
}

function assertNoAllowOrigin(res: Response) {
  assert.equal(res.headers.has("Access-Control-Allow-Origin"), false);
}

{
  const res = corsOptions(request("https://siradaki.app"));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://siradaki.app");
}

{
  const res = corsOptions(request());
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
}

{
  const res = corsOptions(request("https://evil.example"));
  assert.equal(res.status, 403);
  assertNoAllowOrigin(res);
}

{
  const res = json({ ok: true }, 200, request("https://evil.example"));
  assertNoAllowOrigin(res);
}

console.log("cors-tests-ok");
